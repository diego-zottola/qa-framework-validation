import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { loginProfiles } from '../lib/login.js';
import { tempDir } from './helpers.js';

const PAGE = `<!doctype html><form id=f><input name=user><input type=password name=pw>
<button type=button id=google>Continue with Google</button><button type=submit>Sign in</button></form>
<script>f.onsubmit=e=>{e.preventDefault();
if(document.querySelector('[name=user]').value==='qa'&&document.querySelector('[name=pw]').value==='good'){
document.cookie='session=ok';document.body.innerHTML='<h1>home</h1>'}else{document.body.insertAdjacentHTML('beforeend','<p>bad</p>')}}</script>`;

async function withServer(fn) {
  const server = http.createServer((_, res) => res.end(PAGE));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(url);
  } finally {
    server.close();
  }
}

test('loginProfiles logs each profile in and saves its storage state', async () => {
  await withServer(async (url) => {
    const root = tempDir();
    const browser = await chromium.launch();
    try {
      const profiles = { default: { name: 'default', baseUrl: url, credentialsEnvPrefix: 'TEST_USER', storageStatePath: 'auth/default.storageState.json' } };
      await loginProfiles({ browser, profiles, root, env: { TEST_USER_USERNAME: 'qa', TEST_USER_PASSWORD: 'good' } });
      const state = JSON.parse(fs.readFileSync(path.join(root, 'auth/default.storageState.json'), 'utf8'));
      assert.ok(state.cookies.some((c) => c.name === 'session'));
    } finally {
      await browser.close();
    }
  });
});

test('a failed login names the profile and never leaks the password', async () => {
  await withServer(async (url) => {
    const browser = await chromium.launch();
    try {
      const profiles = { viewer: { name: 'viewer', baseUrl: url, credentialsEnvPrefix: 'VIEWER_USER', storageStatePath: 'auth/viewer.storageState.json' } };
      await assert.rejects(
        loginProfiles({ browser, profiles, root: tempDir(), env: { VIEWER_USER_USERNAME: 'qa', VIEWER_USER_PASSWORD: 'secret-pw-123' }, loginTimeout: 2000 }),
        (error) => /viewer/.test(error.message) && !error.message.includes('secret-pw-123'),
      );
    } finally {
      await browser.close();
    }
  });
});

test('missing credentials fail with the env var names, not the values', async () => {
  const browser = await chromium.launch();
  try {
    const profiles = { admin: { name: 'admin', baseUrl: 'http://x', credentialsEnvPrefix: 'ADMIN_USER', storageStatePath: 'auth/a.json' } };
    await assert.rejects(loginProfiles({ browser, profiles, root: tempDir(), env: {} }), /ADMIN_USER_USERNAME/);
  } finally {
    await browser.close();
  }
});
