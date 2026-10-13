#!/usr/bin/env node
// Fetches a fresh auth token from the app's API and prints it to stdout.
//
// Usage:
//   export TOKEN=$(node performance-tests/get-token.js)
//   npm run perf:smoke          # setup() will skip login and use $TOKEN
//
// ENV controls which environment to authenticate against (default: dev).
//   ENV=uat node performance-tests/get-token.js
//
// CONFIG — the only section to edit for a new project:
//   - API_BASES: per-environment API base URLs (delete the ones you don't have)
//   - LOGIN_PATH: the login endpoint, relative to the API base
//   - the response field read for the token (see `body.accessToken` below)

import { config } from 'dotenv';
import { existsSync } from 'fs';

const envFile = existsSync('.env.local') ? '.env.local' : '.env.ci';
config({ path: envFile });

const ENV = process.env.ENV || 'dev';
const LOGIN_PATH = process.env.LOGIN_PATH || '/auth/login';

const API_BASES = {
  dev: process.env.API_BASE_DEV || process.env.BASE_URL,
  qa: process.env.API_BASE_QA,
  uat: process.env.API_BASE_UAT,
};

const API_BASE = process.env.API_BASE || API_BASES[ENV] || API_BASES.dev;

if (!API_BASE) {
  console.error(`No API base configured for ENV=${ENV}. Set API_BASE, API_BASE_${ENV.toUpperCase()}, or BASE_URL.`);
  process.exit(1);
}

const emailKey = ENV === 'qa' ? 'QA_TEST_USER_EMAIL' : 'TEST_USER_EMAIL';
const passwordKey = ENV === 'qa' ? 'QA_TEST_USER_PASSWORD' : 'TEST_USER_PASSWORD';

const EMAIL = process.env[emailKey] || process.env.TEST_USER_EMAIL;
const PASSWORD = process.env[passwordKey] || process.env.TEST_USER_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error(`Missing credentials. Set ${emailKey} and ${passwordKey} in .env.local`);
  process.exit(1);
}

const res = await fetch(`${API_BASE}${LOGIN_PATH}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});

if (!res.ok) {
  console.error(`Login failed: HTTP ${res.status}`);
  process.exit(1);
}

const body = await res.json();
const token = body.accessToken; // adjust this field name to match the app's login response shape

if (!token) {
  console.error('No accessToken in response:', JSON.stringify(body).slice(0, 200));
  process.exit(1);
}

// Print only the token — no newline noise — so it can be captured cleanly:
//   export TOKEN=$(node performance-tests/get-token.js)
process.stdout.write(token + '\n');
