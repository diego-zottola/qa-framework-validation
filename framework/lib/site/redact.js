const SECRET_NAME = /(PASSWORD|TOKEN|SECRET|API_KEY|_KEY$|BYPASS|WEBHOOK)/i;
const JWT = /eyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{8,}/g;
const BEARER = /Bearer\s+[\w.~+/=-]{12,}/gi;
const QUERY_SECRET = /\b(apikey|api_key|access_token|refresh_token|token|password|secret)=([^&\s"'<>]+)/gi;

/** Values of secret-looking environment variables (and QA account names) that must never appear in published text. */
export function collectSecrets(env = process.env) {
  const secrets = [];
  for (const [name, value] of Object.entries(env)) {
    if (!value || value.length < 6) continue;
    if (SECRET_NAME.test(name)) secrets.push({ value, label: '[redacted]' });
    else if (/_USERNAME$/.test(name)) secrets.push({ value, label: '[username]' });
  }
  return secrets.sort((a, b) => b.value.length - a.value.length);
}

export function redactText(text, secrets = []) {
  let out = String(text);
  for (const { value, label } of secrets) out = out.split(value).join(label);
  return out.replace(JWT, '[jwt]').replace(BEARER, 'Bearer [redacted]').replace(QUERY_SECRET, '$1=[redacted]');
}

export function redactDeep(value, secrets) {
  if (typeof value === 'string') return redactText(value, secrets);
  if (Array.isArray(value)) return value.map((v) => redactDeep(v, secrets));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactDeep(v, secrets)]));
  return value;
}
