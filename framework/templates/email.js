import imaps from 'imap-simple';

/**
 * Generates a unique +alias email that delivers to GMAIL_USER inbox.
 * Each call produces a distinct address, so no collision between test runs.
 */
export function generateTestEmail() {
  const [local, domain] = process.env.GMAIL_USER.split('@');
  return `${local}+${Date.now()}@${domain}`;
}

// Decodes a quoted-printable + HTML email body into readable plain text so
// tests can assert template content with toContain('...') instead of fighting
// HTML markup and `=XX` byte escapes.
function decodeBody(raw) {
  if (!raw) return '';
  let s = raw.replace(/=\r?\n/g, '');
  s = s.replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s.replace(/&nbsp;/g, ' ')
       .replace(/&amp;/g, '&')
       .replace(/&lt;/g, '<')
       .replace(/&gt;/g, '>')
       .replace(/&#39;/g, "'")
       .replace(/&quot;/g, '"');
  return s.replace(/\s+/g, ' ').trim();
}

function parseMessage(msg) {
  const header = msg.parts.find(p => p.which.startsWith('HEADER'));
  const text   = msg.parts.find(p => p.which === 'TEXT');
  return {
    subject: header?.body?.subject?.[0] ?? '',
    from:    header?.body?.from?.[0]    ?? '',
    to:      header?.body?.to?.[0]      ?? '',
    body:    decodeBody(text?.body ?? ''),
  };
}

const imapConfig = () => ({
  imap: {
    user: process.env.GMAIL_USER,
    password: process.env.GMAIL_APP_PASSWORD,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: { servername: 'imap.gmail.com' },
    authTimeout: 30_000,
  },
});

/**
 * Polls the inbox for an email addressed to `toAddress`.
 * Reconnects on each poll cycle to avoid stale IMAP connections.
 * Returns { subject, from, to, body } (body is decoded + HTML-stripped) or throws after timeoutMs.
 */
export async function waitForEmail(toAddress, { timeoutMs = 90_000, pollIntervalMs = 5_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  while (Date.now() < deadline) {
    const connection = await imaps.connect(imapConfig());
    await connection.openBox('INBOX');

    const messages = await connection.search(
      [['SINCE', since], ['TO', toAddress]],
      { bodies: ['HEADER.FIELDS (FROM TO SUBJECT)', 'TEXT'], markSeen: false }
    );
    await connection.end();

    if (messages.length > 0) {
      return parseMessage(messages[0]);
    }

    await new Promise(r => setTimeout(r, pollIntervalMs));
  }

  throw new Error(`No email received at ${toAddress} within ${timeoutMs}ms`);
}

/**
 * Returns ALL emails delivered to `toAddress` since midnight today.
 * Used to assert the inbox contains only the expected email (e.g. no Auth0 fallback).
 */
export async function getAllEmails(toAddress) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const connection = await imaps.connect(imapConfig());
  await connection.openBox('INBOX');

  const messages = await connection.search(
    [['SINCE', since], ['TO', toAddress]],
    { bodies: ['HEADER.FIELDS (FROM TO SUBJECT)', 'TEXT'], markSeen: false }
  );
  await connection.end();

  return messages.map(parseMessage);
}
