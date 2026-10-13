import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { diagnoseMessage, clean } from '../diagnosis.js';
import { parseFailure, parseExpression } from './locator.js';
import { findInSource, applyReplacement, unifiedDiff } from './source.js';
import { llmPick } from './llm-tier.js';

export const HEAL_DIR = '.qa-out/heal';

export const NOTICE = 'Suggestions only. Nothing in the repository was modified. A passing re-run means the new locator found one element and the test then passed once; it is not proof the test is right. Review every diff. Assertions and expected values are never changed.';

function* failedTests(suites) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) if (t.status === 'unexpected') yield { spec, test: t };
    }
    yield* failedTests(suite.suites);
  }
}

/** Reads the proposal attachment the fixture wrote for a failed test (inline body or file). */
function attachedProposal(test) {
  for (const result of [...(test.results ?? [])].reverse()) {
    const att = (result.attachments ?? []).find((a) => a.name === 'heal-proposal');
    if (!att) continue;
    try {
      const raw = att.body ? Buffer.from(att.body, 'base64').toString('utf8') : fs.readFileSync(att.path, 'utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

function attachedEvidence(test) {
  for (const result of [...(test.results ?? [])].reverse()) {
    const att = (result.attachments ?? []).find((a) => a.name === 'heal-evidence');
    if (!att) continue;
    try {
      return JSON.parse(att.body ? Buffer.from(att.body, 'base64').toString('utf8') : fs.readFileSync(att.path, 'utf8'));
    } catch {
      return [];
    }
  }
  return [];
}

/** Maps a suggested replacement to the one place in source where the failing locator is written. */
function locate({ entry, parsed, suggestion, root }) {
  const located = findInSource({ root, parsed });
  if (located.status !== 'found') return { ...entry, status: located.status, reason: located.reason, candidate: suggestion.candidate, replacement: suggestion.replacement, locations: located.locations, proposedBy: suggestion.proposedBy };
  const before = fs.readFileSync(path.join(root, located.file), 'utf8');
  const after = applyReplacement(before, located, suggestion.replacement);
  return {
    ...entry,
    status: 'suggested',
    proposedBy: suggestion.proposedBy ?? 'rules',
    candidate: suggestion.candidate,
    alternatives: suggestion.alternatives,
    live: suggestion.live,
    llmReason: suggestion.llmReason,
    replacement: suggestion.replacement,
    source: { file: located.file, line: located.line },
    diff: unifiedDiff(located.file, before, after),
    _patch: { located, replacement: suggestion.replacement },
  };
}

/**
 * Builds the healing report from a Playwright JSON report: for each failed test, the proposal captured at failure
 * time (with live checks), mapped to the one place in source where the locator is written.
 * Diagnosis gates it: only failures that look like selector problems (or are undecidable) get a suggestion.
 */
export function buildHealReport({ report, root = process.cwd() }) {
  root = fs.realpathSync(root);
  const testDir = report.config?.rootDir ?? path.join(root, 'tests');
  const proposals = [];
  for (const { spec, test } of failedTests(report.suites)) {
    const last = [...(test.results ?? [])].reverse().find((r) => r.error);
    const message = last?.error?.message ?? '';
    const diag = diagnoseMessage(message, { annotations: test.annotations });
    const entry = { title: spec.title, file: path.relative(root, path.resolve(testDir, spec.file)).split(path.sep).join('/'), project: test.projectName, line: spec.line, diagnosis: { category: diag.category, confidence: diag.confidence }, original: parseFailure(message).expression ?? null };
    const failure = parseFailure(message);
    if (test.annotations?.some((a) => a.type === 'defect')) {
      proposals.push({ ...entry, status: 'not-applicable', reason: 'known defect: not a selector problem' });
      continue;
    }
    if (failure.kind === 'assertion') {
      proposals.push({ ...entry, status: 'not-applicable', reason: 'an assertion failed: assertions are never healed' });
      continue;
    }
    if (failure.kind === 'strict') {
      proposals.push({ ...entry, status: 'not-applicable', reason: 'the locator is ambiguous: make it more specific by hand' });
      continue;
    }
    if (failure.kind !== 'action' || !['selector', 'unknown'].includes(diag.category)) {
      proposals.push({ ...entry, status: 'not-applicable', reason: `diagnosed as ${diag.category}: not a selector failure` });
      continue;
    }
    const captured = attachedProposal(test);
    if (!captured) {
      proposals.push({ ...entry, status: 'no-evidence', reason: 'no ARIA snapshot was attached to this failure (is the heal fixture enabled?)' });
      continue;
    }
    const parsed = parseExpression(failure.expression);
    if (captured.status !== 'suggested') {
      const retry = ['none', 'ambiguous'].includes(captured.status) && !/state, visibility or timing/.test(captured.reason ?? '');
      proposals.push({ ...entry, status: captured.status, reason: captured.reason, alternatives: captured.alternatives, ...(retry && { _context: { parsed, action: failure.action, snapshots: attachedEvidence(test) } }) });
      continue;
    }
    if (captured.live && (captured.live.count !== 1 || !captured.live.visible || captured.live.enabled === false)) {
      proposals.push({ ...entry, status: 'rejected', reason: `live check failed on the failing page: ${JSON.stringify(captured.live)}`, candidate: captured.candidate });
      continue;
    }
    proposals.push(locate({ entry, parsed, suggestion: captured, root }));
  }
  return { generatedAt: new Date().toISOString(), notice: NOTICE, proposals };
}

/**
 * Optional tier 3. Only for failures the rules could not settle, only when an LLM is configured, and only to pick
 * from the page's own elements. Suggestions from here are labeled `proposedBy: 'llm'`.
 */
export async function applyLlmTier({ report, llm, root = process.cwd() }) {
  root = fs.realpathSync(root);
  for (const [i, p] of report.proposals.entries()) {
    if (!p._context?.snapshots.length) continue;
    const pick = await llmPick({ llm, parsed: p._context.parsed, action: p._context.action, snapshots: p._context.snapshots });
    const { _context, ...entry } = p;
    if (pick.status === 'suggested') {
      const base = { ...entry };
      for (const key of ['status', 'reason', 'candidate', 'alternatives', 'locations']) delete base[key];
      report.proposals[i] = locate({ entry: base, parsed: _context.parsed, suggestion: pick, root });
    } else {
      report.proposals[i] = { ...entry, llmNote: pick.reason };
    }
  }
  return report;
}

/**
 * Re-runs the failed test with the proposal applied in the working tree, then restores the file.
 * Skips when the file has uncommitted changes. The result is recorded; it never turns a suggestion into a fix.
 */
export async function verifyProposal({ proposal, root = process.cwd(), run = defaultRun }) {
  const { located, replacement } = proposal._patch;
  const file = path.join(root, located.file);
  const dirty = spawnSync('git', ['diff', '--quiet', '--', located.file], { cwd: root });
  if (dirty.status === 1) return { status: 'skipped', reason: `${located.file} has uncommitted changes` };
  const original = fs.readFileSync(file, 'utf8');
  try {
    fs.writeFileSync(file, applyReplacement(original, located, replacement));
    const result = await run({ root, proposal });
    if (result.inconclusive) return { status: 'inconclusive', detail: result.detail };
    return { status: result.passed ? 'passed' : 'failed', detail: result.detail };
  } finally {
    fs.writeFileSync(file, original);
  }
}

async function defaultRun({ root, proposal }) {
  const grep = proposal.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const out = path.join(root, HEAL_DIR, 'verify.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.rmSync(out, { force: true });
  const args = ['playwright', 'test', proposal.file, '-g', grep, `--project=${proposal.project}`, '--retries=0', '--reporter=json'];
  const { status, output } = await new Promise((resolve) => {
    const child = spawn('npx', args, { cwd: root, env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: out } });
    let text = '';
    child.stdout.on('data', (d) => (text += d));
    child.stderr.on('data', (d) => (text += d));
    child.on('close', (code) => resolve({ status: code, output: text }));
  });
  let ran = 0;
  try {
    const stats = JSON.parse(fs.readFileSync(out, 'utf8')).stats ?? {};
    ran = (stats.expected ?? 0) + (stats.unexpected ?? 0) + (stats.flaky ?? 0);
  } catch {
    // no JSON written: Playwright failed before running anything
  }
  if (!ran) return { inconclusive: true, detail: `no test ran: ${clean(output).split('\n').find(Boolean)?.slice(0, 200) ?? ''}` };
  return { passed: status === 0, detail: status === 0 ? 'passed once with the new locator' : clean(output).slice(0, 300) };
}

export function renderHealMarkdown(report) {
  const lines = ['## Selector healing (suggestion mode)', '', report.notice, ''];
  if (!report.proposals.length) return lines.concat('No failed tests.', '').join('\n');
  for (const p of report.proposals) {
    lines.push(`### ${p.title}`, '', `- Status: **${p.status}**${p.verification ? ` · re-run with the change: **${p.verification.status}**` : ''}`, `- Diagnosis: ${p.diagnosis.category} (${p.diagnosis.confidence})`);
    if (p.original) lines.push(`- Failing locator: \`${p.original}\``);
    if (p.reason) lines.push(`- Why: ${p.reason}`);
    if (p.candidate) lines.push(`- Candidate: ${p.candidate.role} "${p.candidate.name}"${p.candidate.score === null || p.candidate.score === undefined ? '' : ` (similarity ${p.candidate.score})`}${p.proposedBy === 'llm' ? ` — picked by an LLM from the page's elements${p.llmReason ? `: ${p.llmReason}` : ''}` : ''}`);
    if (p.llmNote) lines.push(`- LLM: ${p.llmNote}`);
    if (p.alternatives?.length) lines.push(`- Other candidates: ${p.alternatives.map((a) => `${a.role} "${a.name}" ${a.score}`).join('; ')}`);
    if (p.source) lines.push(`- Source: \`${p.source.file}:${p.source.line}\``);
    if (p.diff) lines.push('', '```diff', p.diff.trimEnd(), '```');
    lines.push('');
  }
  return lines.join('\n');
}

/** Writes proposals.json (no internals), heal-report.md and one combined patch of the suggested changes. */
export function writeHealReport(report, root = process.cwd()) {
  const dir = path.join(root, HEAL_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const clean_ = { ...report, proposals: report.proposals.map(({ _patch, _context, ...rest }) => rest) };
  fs.writeFileSync(path.join(dir, 'proposals.json'), JSON.stringify(clean_, null, 2));
  fs.writeFileSync(path.join(dir, 'heal-report.md'), renderHealMarkdown(clean_));
  const patch = clean_.proposals.filter((p) => p.status === 'suggested' && p.diff && p.verification?.status !== 'failed').map((p) => p.diff).join('\n');
  fs.writeFileSync(path.join(dir, 'heal.patch'), patch);
  return clean_;
}
