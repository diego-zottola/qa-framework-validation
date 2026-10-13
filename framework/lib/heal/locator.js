import { clean } from '../diagnosis.js';

const ACTION = /locator\.(\w+): (?:Error: )?Timeout \d+ms exceeded/;
const STRICT = /strict mode violation: ([\s\S]+?) resolved to \d+ elements?/;
const ASSERT = /expect\(.*?\)\.(?:not\.)?\w+\(.*?\) failed/;

/**
 * Reads what failed from Playwright's error text.
 * kind: 'action' (the step could not find or act on an element), 'assertion' (an expect failed: never healed),
 *       'strict' (the locator is ambiguous), 'unknown'.
 */
export function parseFailure(rawMessage) {
  const message = clean(rawMessage);
  const strict = STRICT.exec(message);
  if (strict) return { kind: 'strict', expression: strict[1].trim() };
  if (ASSERT.test(message)) {
    const loc = /^\s*Locator: (.+)$/m.exec(message);
    return { kind: 'assertion', expression: loc?.[1].trim() ?? null };
  }
  const action = ACTION.exec(message);
  if (action) {
    const waiting = /waiting for (.+)$/m.exec(message);
    return { kind: 'action', action: action[1], expression: waiting?.[1].trim() ?? null };
  }
  return { kind: 'unknown', expression: null };
}

const STRING = String.raw`(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")`;
const unescape = (s) => s.replace(/\\(.)/g, '$1');
const take = (m, a) => (m[a] ?? m[a + 1]) !== undefined ? unescape(m[a] ?? m[a + 1]) : undefined;

/**
 * Parses a simple locator expression: getByRole/getByText/getByLabel/getByPlaceholder/getByTitle/getByTestId,
 * optionally followed by .first()/.last()/.nth(n). Anything else (scoped, filtered, regex names, css) is reported
 * as unsupported with the reason, never guessed.
 */
export function parseExpression(expression) {
  if (!expression) return { supported: false, reason: 'no locator in the error message' };
  const chain = /((?:\.(?:first|last|nth)\(\d*\))*)$/.exec(expression)[1];
  const head = expression.slice(0, expression.length - chain.length);
  const role = new RegExp(String.raw`^getByRole\(${STRING}\s*(?:,\s*\{\s*(?:name:\s*${STRING})?\s*(?:,\s*exact:\s*(true|false))?\s*\}\s*)?\)$`).exec(head);
  if (role) {
    return { supported: true, method: 'getByRole', role: take(role, 1), text: take(role, 3), exact: role[5] === 'true', chain, exactGiven: role[5] !== undefined };
  }
  const simple = new RegExp(String.raw`^(getByText|getByLabel|getByPlaceholder|getByTitle|getByTestId|getByAltText)\(${STRING}\s*(?:,\s*\{\s*exact:\s*(true|false)\s*\}\s*)?\)$`).exec(head);
  if (simple) return { supported: true, method: simple[1], text: take(simple, 2), exact: simple[4] === 'true', chain, exactGiven: simple[4] !== undefined };
  if (/^getBy/.test(head)) return { supported: false, reason: 'locator uses options the healer does not read (regex names, extra filters)' };
  return { supported: false, reason: 'scoped, filtered or CSS locators are not healed' };
}

/** Nodes of an ARIA snapshot: [{ role, name, disabled }]. */
export function parseAriaSnapshot(text) {
  const nodes = [];
  for (const line of String(text ?? '').split('\n')) {
    const m = /^\s*-\s+([a-z][\w-]*)(?:\s+"((?:[^"\\]|\\.)*)")?(.*)$/.exec(line);
    if (!m) continue;
    nodes.push({ role: m[1], name: m[2] === undefined ? '' : unescape(m[2]), disabled: /\[disabled\]/.test(m[3]) });
  }
  return nodes;
}

const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

/**
 * 0..1 similarity of two accessible names: token overlap, one containing the other, or a close edit distance.
 * Edit distance only counts from 0.7: below that a long shared word ("página") makes unrelated names look alike
 * ("Archivar página" vs "Nueva página" scored 0.6 on a real project and produced a wrong suggestion).
 */
export function similarity(a, b) {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const tx = new Set(x.split(' '));
  const ty = new Set(y.split(' '));
  const shared = [...tx].filter((t) => ty.has(t)).length;
  const jaccard = shared / new Set([...tx, ...ty]).size;
  const edit = 1 - levenshtein(x, y) / Math.max(x.length, y.length);
  const contains = (x.includes(y) || y.includes(x)) && Math.min(x.length, y.length) >= 3 ? 0.75 : 0;
  return Math.max(jaccard, edit >= 0.7 ? edit : 0, contains);
}

const TEXT_ROLES = ['button', 'link', 'heading', 'tab', 'menuitem', 'option', 'checkbox', 'radio', 'switch'];
const FIELD_ROLES = ['textbox', 'combobox', 'searchbox', 'checkbox', 'radio', 'switch', 'spinbutton', 'slider'];
const ROLES_FOR = { getByText: TEXT_ROLES, getByLabel: FIELD_ROLES, getByPlaceholder: ['textbox', 'searchbox', 'combobox'], getByTitle: TEXT_ROLES };
const NEEDS_ENABLED = new Set(['click', 'dblclick', 'tap', 'fill', 'check', 'uncheck', 'selectOption', 'press', 'type', 'setChecked', 'clear']);

export const THRESHOLD = 0.6;
const MARGIN = 0.1;

const quote = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/**
 * Proposes a replacement for one failing locator from an ARIA snapshot. Conservative on purpose:
 *  - the original name is searched first: if it is present, the problem is not the name (state, visibility, timing);
 *  - only elements of a compatible role are considered, and the best must be clearly better than the rest;
 *  - nothing is proposed when the element is simply gone (that may be a product change, not a selector problem).
 */
export function proposeReplacement({ parsed, snapshot, action }) {
  if (!parsed.supported) return { status: 'unsupported', reason: parsed.reason };
  if (parsed.method === 'getByTestId' || parsed.method === 'getByAltText') return { status: 'unsupported', reason: `${parsed.method} cannot be checked against an ARIA snapshot` };
  if (!parsed.text) return { status: 'unsupported', reason: 'the locator has no accessible name to compare' };
  const nodes = parseAriaSnapshot(snapshot);
  if (!nodes.length) return { status: 'none', reason: 'no ARIA snapshot was captured' };
  const roles = parsed.method === 'getByRole' ? [parsed.role] : ROLES_FOR[parsed.method];
  const pool = nodes.filter((n) => roles.includes(n.role) && n.name);
  if (pool.some((n) => normalize(n.name) === normalize(parsed.text) && (parsed.method !== 'getByRole' || n.role === parsed.role))) {
    return { status: 'none', reason: 'an element with the original name exists in the snapshot: the failure is about state, visibility or timing, not the name' };
  }
  const seen = new Map();
  for (const n of pool) {
    if (NEEDS_ENABLED.has(action) && n.disabled) continue;
    const key = `${n.role}\u0000${n.name}`;
    if (!seen.has(key)) seen.set(key, { role: n.role, name: n.name, score: similarity(parsed.text, n.name), copies: 0 });
    seen.get(key).copies++;
  }
  const ranked = [...seen.values()].sort((a, b) => b.score - a.score);
  const [best, second] = ranked;
  if (!best || best.score < THRESHOLD) return { status: 'none', reason: 'no element of the same kind has a similar name: the element may have been removed (possible product change)' };
  if (second && best.score - second.score < MARGIN) return { status: 'ambiguous', reason: 'several elements look equally close', alternatives: ranked.slice(0, 3).filter((r) => r.score >= 0.4).map(({ role, name, score }) => ({ role, name, score: round(score) })) };
  if (best.copies > 1) return { status: 'ambiguous', reason: `${best.copies} elements share the name "${best.name}"`, alternatives: [{ role: best.role, name: best.name, score: round(best.score) }] };
  const replacement = `getByRole(${quote(best.role)}, { name: ${quote(best.name)}, exact: true })${parsed.chain}`;
  return {
    status: 'suggested',
    candidate: { role: best.role, name: best.name, score: round(best.score) },
    replacement,
    alternatives: ranked.slice(1, 3).filter((r) => r.score >= 0.4).map(({ role, name, score }) => ({ role, name, score: round(score) })),
    checks: { uniqueInSnapshot: true, sameKind: true, threshold: THRESHOLD },
  };
}

const round = (n) => Math.round(n * 100) / 100;
