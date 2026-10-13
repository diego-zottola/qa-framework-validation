import fs from 'node:fs';
import path from 'node:path';
import { redactDeep, redactText } from './redact.js';

// Traces and videos carry request headers, tokens and page data; ARIA snapshots and Playwright's
// error-context hold page text. None of them is published. Screenshots are kept (see docs: limits).
const BLOCKED_TYPE = /^(video\/|application\/zip|text\/markdown)/;
const BLOCKED_NAME = /^(trace|video|heal-evidence|error-context)/i;

function blocked(attachment) {
  return BLOCKED_TYPE.test(attachment.type ?? '') || BLOCKED_NAME.test(attachment.name ?? '') || /\.(zip|webm|mp4)$/.test(attachment.source ?? '');
}

function filterAttachments(node, kept, dropped) {
  if (Array.isArray(node.attachments)) {
    node.attachments = node.attachments.filter((a) => {
      if (blocked(a)) {
        dropped.push(a.name);
        return false;
      }
      kept.add(a.source);
      return true;
    });
  }
  for (const key of ['steps', 'befores', 'afters']) for (const child of node[key] ?? []) filterAttachments(child, kept, dropped);
}

/**
 * Copies an allure-results folder without anything that must not be public: blocked attachments are dropped (and
 * their references removed), and every text is redacted. Returns { files, dropped } for the log.
 */
export function sanitizeAllureResults({ src, dest, secrets }) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  const kept = new Set();
  const dropped = [];
  const names = fs.existsSync(src) ? fs.readdirSync(src) : [];
  let files = 0;
  for (const name of names) {
    if (!/-(result|container)\.json$/.test(name)) continue;
    const doc = JSON.parse(fs.readFileSync(path.join(src, name), 'utf8'));
    filterAttachments(doc, kept, dropped);
    fs.writeFileSync(path.join(dest, name), JSON.stringify(redactDeep(doc, secrets)));
    files++;
  }
  for (const name of names) {
    if (/-(result|container)\.json$/.test(name)) continue;
    if (/-attachment/.test(name)) {
      if (!kept.has(name)) continue;
      if (/\.(json|txt|log|html|csv)$/.test(name)) fs.writeFileSync(path.join(dest, name), redactText(fs.readFileSync(path.join(src, name), 'utf8'), secrets));
      else fs.copyFileSync(path.join(src, name), path.join(dest, name));
    } else if (/\.(properties|json|xml)$/.test(name)) {
      fs.writeFileSync(path.join(dest, name), redactText(fs.readFileSync(path.join(src, name), 'utf8'), secrets));
    }
    files++;
  }
  return { files, dropped };
}
