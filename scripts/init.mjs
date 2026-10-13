#!/usr/bin/env node
// Guided onboarding: URL -> first look -> credentials -> options -> scaffold -> Claude explores and writes tests.
// Every question can be answered through an INIT_<KEY> environment variable (non-interactive runs, tests).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import readline from 'node:readline';
import { chromium } from '@playwright/test';
import { defaultConfig, rolePrefix } from '../framework/lib/config.js';
import { scaffold } from '../framework/lib/scaffold.js';
import { genericLogin } from '../framework/lib/login.js';
import { haveCommand, syncSecrets, syncVariables } from '../framework/lib/secrets.js';
import { PROVIDERS } from '../framework/lib/llm/index.js';
import { runExplore } from '../framework/lib/explore.js';
import { repoInfo, enablePages, pagesUrl, visibilityNotice } from '../framework/lib/github.js';

const ENV_FILE = '.env';
const say = (msg = '') => console.log(msg);

function ask(question, { key, hidden = false, fallback = '' } = {}) {
  const preset = key ? process.env[`INIT_${key}`] : undefined;
  if (preset !== undefined) return Promise.resolve(preset.trim());
  if (!process.stdin.isTTY) return Promise.resolve(fallback);
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let asked = false;
    if (hidden) {
      const write = rl._writeToOutput.bind(rl);
      rl._writeToOutput = (text) => {
        if (!asked) write(text);
      };
    }
    rl.question(`${question}${fallback ? ` [${fallback}]` : ''}: `, (answer) => {
      rl.close();
      if (hidden) say();
      resolve(answer.trim() || fallback);
    });
    asked = true;
  });
}

const yes = async (question, key, def = 'n') => /^y/i.test(await ask(`${question} (y/n)`, { key, fallback: def }));

function setEnv(values) {
  const lines = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8').split('\n') : [];
  for (const [key, value] of Object.entries(values)) {
    const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
    if (idx >= 0) lines[idx] = `${key}=${value}`;
    else lines.push(`${key}=${value}`);
  }
  writeFileSync(ENV_FILE, lines.filter((l, i, a) => l || i < a.length - 1).join('\n') + '\n');
}

function slugify(text) {
  return text.toLowerCase().replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function firstLook(url, extraHeaders) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ extraHTTPHeaders: extraHeaders });
  const page = await context.newPage();
  const result = { reachable: false, protected: false, login: 'none', userField: 'username' };
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    // SPAs hydrate late: wait until a login control shows up, otherwise assume no login.
    await page
      .locator('input[type="password"], button:has-text("Google"), a:has-text("Google")')
      .first()
      .waitFor({ state: 'visible', timeout: 12000 })
      .catch(() => {});
    result.reachable = Boolean(response);
    const status = response?.status() ?? 0;
    const body = (await page.content()).toLowerCase();
    result.protected = status === 401 || body.includes('vercel authentication') || body.includes('_vercel/sso');
    if (!result.protected) {
      const hasPassword = (await page.locator('input[type="password"]:visible').count()) > 0;
      const hasGoogle = await page.getByText(/google/i).first().isVisible().catch(() => false);
      const hasEmail = (await page.locator('input[type="email"]:visible').count()) > 0;
      result.userField = hasEmail ? 'email' : 'username';
      result.login = hasPassword && hasGoogle ? 'password+google' : hasPassword ? 'password' : hasGoogle ? 'google' : 'none';
    }
  } catch {
    result.reachable = false;
  } finally {
    await browser.close();
  }
  return result;
}

async function validateLogin(url, headers, user, pass) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ extraHTTPHeaders: headers });
  try {
    await genericLogin(await context.newPage(), url, user, pass);
    return true;
  } catch {
    return false;
  } finally {
    await browser.close();
  }
}

async function captureManualSession(url, headers, role) {
  say(`\nOpening a browser: log in manually as "${role}", then come back here and press Enter.`);
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ extraHTTPHeaders: headers });
  const page = await context.newPage();
  await page.goto(url);
  await ask('Press Enter once you are logged in', { key: 'MANUAL_LOGIN_DONE' });
  mkdirSync('auth', { recursive: true });
  await context.storageState({ path: `auth/${role}.storageState.json` });
  await browser.close();
}

async function askCredentials({ url, headers, userField, role, key }) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const user = await ask(`Test user ${userField === 'email' ? 'email' : 'username'} for role "${role}"`, { key: `${key}_USERNAME` });
    const pass = await ask(`Password for "${role}"`, { key: `${key}_PASSWORD`, hidden: true });
    say('Validating credentials...');
    if (await validateLogin(url, headers, user, pass)) return { user, pass };
    say('Login failed.');
  }
  return null;
}

async function main() {
  say('\n=== AI-driven automation: guided setup ===\n');
  const skipClaude = Boolean(process.env.INIT_SKIP_CLAUDE);
  if (!skipClaude && !haveCommand('claude')) {
    say('Claude Code CLI not found. Install it first: https://docs.claude.com/claude-code');
    process.exit(1);
  }

  let url = await ask('Application URL (https://...)', { key: 'URL' });
  if (!/^https?:\/\//.test(url)) {
    say('The URL must start with http:// or https://');
    process.exit(1);
  }
  url = url.replace(/\/$/, '');
  const appName = await ask('Application name', { key: 'APP_NAME', fallback: slugify(url) });

  const skipInstall = Boolean(process.env.INIT_SKIP_INSTALL);
  if (!skipInstall) {
    say('\nInstalling the browser if needed...');
    spawnSync('npx', ['playwright', 'install', 'chromium'], { stdio: 'inherit' });
  }

  say('\nTaking a first look at the application...');
  let headers = {};
  let look = await firstLook(url, headers);
  let bypass = '';
  if (look.protected) {
    say('Vercel Deployment Protection detected.');
    bypass = await ask('Protection bypass secret (Vercel > Settings > Deployment Protection)', { key: 'BYPASS', hidden: true });
    headers = { 'x-vercel-protection-bypass': bypass, 'x-vercel-set-bypass-cookie': 'true' };
    look = await firstLook(url, headers);
  }
  if (!look.reachable) {
    say('Could not reach the application. Check the URL and try again.');
    process.exit(1);
  }
  say(`Login type detected: ${look.login}`);

  const config = defaultConfig({ app: { name: appName, slug: slugify(appName), loginType: look.login, vercelProtected: look.protected } });
  config.roles = [];
  const envValues = { BASE_URL: url, ...(bypass && { VERCEL_AUTOMATION_BYPASS_SECRET: bypass }) };

  if (look.login === 'password' || look.login === 'password+google') {
    say('\nUse accounts dedicated to QA, not real user accounts.');
    const main = await askCredentials({ url, headers, userField: look.userField, role: 'default', key: 'USER' });
    if (!main) process.exit(1);
    config.roles.push({ name: 'default', login: 'password' });
    Object.assign(envValues, { TEST_USER_USERNAME: main.user, TEST_USER_PASSWORD: main.pass });
    say('Credentials OK.');
    // Extra identities (for permission tests). INIT_ROLES = JSON [{name, username, password}] for non-interactive runs.
    const preset = process.env.INIT_ROLES ? JSON.parse(process.env.INIT_ROLES) : null;
    for (let i = 0; ; i++) {
      let name;
      let creds;
      if (preset) {
        if (i >= preset.length) break;
        name = preset[i].name;
        if (await validateLogin(url, headers, preset[i].username, preset[i].password)) creds = { user: preset[i].username, pass: preset[i].password };
      } else {
        name = (await ask('\nName of another role to test with (e.g. viewer, admin; blank to finish)', { key: `ROLE_${i}` })).toLowerCase();
        if (!name) break;
        creds = await askCredentials({ url, headers, userField: look.userField, role: name, key: `ROLE_${i}` });
      }
      if (!creds) {
        say(`Skipped role "${name}": login could not be validated.`);
        continue;
      }
      config.roles.push({ name, login: 'password' });
      Object.assign(envValues, { [`${rolePrefix(name)}_USERNAME`]: creds.user, [`${rolePrefix(name)}_PASSWORD`]: creds.pass });
    }
  } else if (look.login === 'google') {
    await captureManualSession(url, headers, 'default');
    config.roles.push({ name: 'default', login: 'manual' });
    say('Session saved to auth/default.storageState.json (not available in CI: Google login cannot be automated there).');
  } else {
    say('No login detected: the app will be explored without authentication.');
    config.roles.push({ name: 'default', login: 'manual' });
    mkdirSync('auth', { recursive: true });
    writeFileSync('auth/default.storageState.json', JSON.stringify({ cookies: [], origins: [] }));
  }

  config.options.api = await yes('\nExplore the API and create an API test suite?', 'API', 'y');
  config.options.visual = await yes('Enable visual comparison with Playwright screenshots (opt-in suite, baselines you approve)?', 'VISUAL', 'n');
  config.triggers.push = await yes('Run the smoke suite on every push to the default branch?', 'TRIGGER_PUSH', 'y');
  config.triggers.pullRequest = await yes('Run structure checks (no secrets) on pull requests?', 'TRIGGER_PR', 'y');
  config.productRepo = (await ask('Product repository that deploys the app, to run tests after its deployments (owner/name, blank = none)', { key: 'PRODUCT_REPO' })).trim();
  config.triggers.productDeploy = Boolean(config.productRepo);
  if (await yes('Enable Slack notifications?', 'SLACK', 'n')) {
    config.options.slack = true;
    envValues.SLACK_WEBHOOK_URL = await ask('Slack webhook URL', { key: 'SLACK_WEBHOOK_URL', hidden: true });
    envValues.SLACK_NOTIFY = (await ask('Notify on failures only, or always? (failures/always)', { key: 'SLACK_NOTIFY', fallback: 'failures' })) === 'always' ? 'always' : 'failures';
  }
  if (await yes('Enable Jira integration?', 'JIRA', 'n')) {
    config.options.jira = true;
    Object.assign(envValues, {
      JIRA_BASE_URL: await ask('Jira base URL', { key: 'JIRA_BASE_URL' }),
      JIRA_EMAIL: await ask('Jira email', { key: 'JIRA_EMAIL' }),
      JIRA_API_TOKEN: await ask('Jira API token', { key: 'JIRA_API_TOKEN', hidden: true }),
      JIRA_PROJECT_KEY: await ask('Jira project key', { key: 'JIRA_PROJECT_KEY' }),
      JIRA_ISSUE_TYPE: await ask('Jira issue type for failures', { key: 'JIRA_ISSUE_TYPE', fallback: 'Bug' }),
      JIRA_AUTO_CREATE: (await yes('Create Jira issues automatically for failures diagnosed as product defects? (otherwise they are only reported)', 'JIRA_AUTO_CREATE', 'n')) ? 'true' : 'false',
    });
  }
  say('\nOptional LLM (the framework works fully without it). Claude Code access used by this setup is not an API key for CI runs.');
  const provider = (await ask(`LLM provider for extra features such as selector suggestions (none / ${PROVIDERS.join(' / ')})`, { key: 'LLM_PROVIDER', fallback: 'none' })).toLowerCase();
  if (PROVIDERS.includes(provider)) {
    config.options.llm = { provider };
    envValues.LLM_PROVIDER = provider;
    envValues.LLM_MODEL = await ask('Model name', { key: 'LLM_MODEL' });
    if (provider === 'openai-compatible') envValues.LLM_BASE_URL = await ask('Base URL of the chat-completions API', { key: 'LLM_BASE_URL' });
    envValues.LLM_API_KEY = await ask('API key (saved in .env only, never committed)', { key: 'LLM_API_KEY', hidden: true });
    say('Note: the names of page elements are sent to this provider, only for failures the built-in rules cannot settle.');
  }
  const cronTime = await ask('Daily smoke run time in UTC (HH:MM)', { key: 'CRON', fallback: '10:00' });
  const [hh, mm] = cronTime.split(':').map((n) => Number.parseInt(n, 10));
  if (Number.isInteger(hh) && Number.isInteger(mm)) config.schedule.smokeCron = `${mm} ${hh} * * *`;

  setEnv({ ...envValues, ENV: 'local' });
  say('\nGenerating configuration, workflows and helpers...');
  scaffold({ config });
  if (!skipInstall) {
    say('Done. Installing dependencies...');
    spawnSync('npm', ['install'], { stdio: 'inherit' });
  }

  let secretsReport = null;
  if (await yes('\nStore the credentials as GitHub repository secrets for CI?', 'SECRETS', 'y')) {
    secretsReport = syncSecrets(config, { ...process.env, ...envValues });
    const varsReport = syncVariables(config, { ...process.env, ...envValues });
    if (!varsReport.skipped && (varsReport.failed.length || varsReport.missing.length)) say(`Variables not set: ${[...varsReport.failed, ...varsReport.missing].join(', ')}`);
    if (secretsReport.skipped) say(`Secrets not set: ${secretsReport.skipped}. Run \`npm run qa secrets\` after adding the remote.`);
    else {
      say(`Secrets set: ${secretsReport.set.join(', ') || 'none'}`);
      if (secretsReport.missing.length) say(`Missing in .env (not set): ${secretsReport.missing.join(', ')}`);
      if (secretsReport.failed.length) say(`Failed (check gh permissions): ${secretsReport.failed.join(', ')}`);
    }
  }

  // GitHub Pages: reports, evidence and the test case catalog are published there.
  const pending = [];
  let pagesResult = null;
  const info = haveCommand('gh') ? repoInfo() : null;
  if (info && (await yes(`\nPublish reports and the test case catalog on GitHub Pages (${info.repo})?`, 'PAGES', 'y'))) {
    pagesResult = enablePages({ repo: info.repo });
    say(pagesResult.status === 'pending' ? `Pages not enabled: ${pagesResult.reason}` : `Pages enabled: ${pagesUrl(info.repo)}`);
    say(visibilityNotice(info.visibility, config.retentionDays));
    if (pagesResult.status === 'pending') pending.push(`GitHub Pages: ${pagesResult.reason}`);
  } else if (!info) {
    pending.push('GitHub Pages: no GitHub repository detected; after adding the remote run `npm run qa -- pages`.');
  }
  if (secretsReport?.skipped) pending.push(`GitHub secrets: ${secretsReport.skipped}; run \`npm run qa -- secrets\` after adding the remote.`);
  if (secretsReport?.missing.length) pending.push(`GitHub secrets without a value in .env: ${secretsReport.missing.join(', ')}`);
  if (secretsReport?.failed.length) pending.push(`GitHub secrets that could not be set: ${secretsReport.failed.join(', ')}`);
  const pushAtEnd = await yes('Push to GitHub when finished (activates CI)?', 'PUSH', 'y');

  if (config.triggers.productDeploy) pending.push('Product deploy trigger: add the step from docs/product-deploy-trigger.md to the product repository (needs a token only you can create) and fill risk.map.json.');
  const summary = () => {
    say('\n=== Setup summary ===');
    say(pending.length ? `Pending (needs you):\n${pending.map((p) => `  - ${p}`).join('\n')}` : 'Nothing pending.');
  };
  let exploreStatus = 0;
  if (skipClaude) say('\nINIT_SKIP_CLAUDE set: skipping exploration and test generation (run `npm run qa -- explore` later).');
  else {
    say('\nHanding over to Claude: exploration, test generation and a first run. This takes a while...\n');
    exploreStatus = runExplore().status ?? 1;
  }
  const dirty = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).stdout.trim();
  if (dirty) {
    spawnSync('git', ['add', '-A'], { stdio: 'ignore' });
    spawnSync('git', ['commit', '-qm', 'Set up the QA framework'], { stdio: 'ignore' });
  }
  if (pushAtEnd && exploreStatus === 0) {
    const push = spawnSync('git', ['push', '-u', 'origin', 'HEAD'], { stdio: 'inherit' });
    say(push.status === 0 ? '\nPushed. CI is active.' : '\nPush failed; run `git push` manually.');
    if (push.status !== 0) pending.push('Push: run `git push -u origin HEAD`.');
    else if (pagesResult && pagesResult.status !== 'pending') {
      spawnSync('gh', ['workflow', 'run', 'pages.yml'], { stdio: 'ignore' });
      say('First Pages publication requested (workflow "Publish reports").');
    }
  } else if (!pushAtEnd) pending.push('Push: nothing runs in CI until you push.');
  else pending.push('Push skipped because the exploration step failed: check the output above, then `git push`.');
  summary();
  process.exit(exploreStatus);
}

main();
