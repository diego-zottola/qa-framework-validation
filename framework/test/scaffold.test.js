import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { requiredSecrets } from '../lib/config.js';
import { scaffold, renderEnvExample } from '../lib/scaffold.js';
import { runDoctor } from '../lib/doctor.js';
import { sampleConfig, scaffoldedProject, tempDir } from './helpers.js';

test('scaffold writes config, profiles, workflows and a pinned package.json', () => {
  const { root } = scaffoldedProject();
  for (const file of ['playwright.config.js', 'auth/environment-profile.js', 'auth/global-setup.js', 'pages/BasePage.js', '.qa-framework.json', '.github/workflows/smoke.yml', '.github/workflows/regression.yml', '.github/workflows/api.yml']) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} should exist`);
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies['@playwright/test'], '1.64.0');
  assert.match(pkg.devDependencies['allure-playwright'], /^\d+\.\d+\.\d+$/);
  assert.equal(pkg.scripts['test:api'], 'npx playwright test --project=api');
});

test('profiles use the _USERNAME/_PASSWORD naming for every role', () => {
  const { root } = scaffoldedProject();
  const profiles = fs.readFileSync(path.join(root, 'auth/environment-profile.js'), 'utf8');
  assert.match(profiles, /credentialsEnvPrefix: 'TEST_USER'/);
  assert.match(profiles, /credentialsEnvPrefix: 'VIEWER_USER'/);
  assert.match(profiles, /storageStatePath: 'auth\/viewer.storageState.json'/);
});

test('generated workflows are valid YAML and read exactly the secrets init sets', () => {
  const { root, config } = scaffoldedProject();
  const dir = path.join(root, '.github/workflows');
  const expected = new Set(requiredSecrets(config));
  for (const file of ['smoke.yml', 'regression.yml', 'api.yml']) {
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    const doc = parse(text);
    assert.ok(doc.jobs.test, `${file} has a test job`);
    const used = new Set([...text.matchAll(/secrets\.([A-Z0-9_]+)/g)].map((m) => m[1]));
    assert.deepEqual([...used].sort(), [...expected].sort(), `${file} secrets`);
    assert.doesNotMatch(text, /\{\{[A-Z_]+\}\}/, `${file} has unresolved placeholders`);
  }
});

test('smoke runs on schedule and manually, regression only manually; no push or pull_request', () => {
  const { root } = scaffoldedProject();
  const read = (f) => parse(fs.readFileSync(path.join(root, '.github/workflows', f), 'utf8'));
  const smoke = read('smoke.yml').on;
  const regression = read('regression.yml').on;
  assert.ok(smoke.schedule && smoke.workflow_dispatch);
  assert.deepEqual(Object.keys(regression), ['workflow_dispatch']);
});

test('test steps keep the job red but still upload reports', () => {
  const { root } = scaffoldedProject();
  const doc = parse(fs.readFileSync(path.join(root, '.github/workflows/smoke.yml'), 'utf8'));
  const steps = doc.jobs.test.steps;
  const run = steps.find((s) => s.id === 'run');
  assert.equal(run['continue-on-error'], true);
  const uploads = steps.filter((s) => s.uses?.startsWith('actions/upload-artifact'));
  assert.equal(uploads.length, 2);
  assert.ok(uploads.every((s) => s.if.startsWith('always()') && s.with['retention-days'] === 15));
  assert.match(steps.at(-1).run, /exit 1/);
});

test('raw reports and traces are uploaded only for private repositories unless the project says otherwise', () => {
  const ifOf = (config) => {
    const { root } = scaffoldedProject(config);
    const steps = parse(fs.readFileSync(path.join(root, '.github/workflows/smoke.yml'), 'utf8')).jobs.test.steps;
    return steps.find((s) => s.name === 'Upload the full reports and traces').if;
  };
  assert.match(ifOf(sampleConfig()), /repository\.private == true/);
  const always = sampleConfig();
  always.artifacts = { includeTraces: true };
  assert.equal(ifOf(always), 'always() && true');
  const never = sampleConfig();
  never.artifacts = { includeTraces: false };
  assert.equal(ifOf(never), 'always() && false');
  const { root } = scaffoldedProject();
  const publishable = parse(fs.readFileSync(path.join(root, '.github/workflows/smoke.yml'), 'utf8')).jobs.test.steps.find((s) => s.name === 'Upload the publishable report');
  assert.equal(publishable.with.name, 'site-run-smoke');
  assert.equal(publishable.if, "always() && hashFiles('qa-publish/meta.json') != ''");
});

test('the pages workflow reacts to every test workflow, deploys with minimal permissions and never to pull requests', () => {
  const { root } = scaffoldedProject();
  const doc = parse(fs.readFileSync(path.join(root, '.github/workflows/pages.yml'), 'utf8'));
  assert.deepEqual(doc.on.workflow_run.workflows, ['Smoke Tests', 'Regression Tests', 'API Tests']);
  assert.deepEqual(doc.on.workflow_run.types, ['completed']);
  assert.match(doc.jobs.store.if, /workflow_run\.event != 'pull_request'/);
  assert.match(doc.jobs.store.if, /head_branch == github\.event\.repository\.default_branch/);
  assert.deepEqual(doc.jobs.store.permissions, { contents: 'write', actions: 'read' });
  assert.deepEqual(doc.jobs.deploy.permissions, { contents: 'read', pages: 'write', 'id-token': 'write' });
  assert.equal(doc.jobs.deploy.concurrency['cancel-in-progress'], false);
  assert.equal(doc.jobs.deploy.needs, 'store');
  const names = Object.values(parse(fs.readFileSync(path.join(root, '.github/workflows/smoke.yml'), 'utf8'))).length;
  assert.ok(names > 0);
});

test('optional integrations only appear when enabled', () => {
  const off = renderEnvExample(sampleConfig({ slack: false, jira: false, api: false }));
  assert.doesNotMatch(off, /SLACK|JIRA|LLM/);
  const { root } = scaffoldedProject(sampleConfig({ api: false, slack: false, jira: false }));
  assert.ok(!fs.existsSync(path.join(root, '.github/workflows/api.yml')));
});

test('scaffold is idempotent and does not overwrite an existing base fixture', () => {
  const root = tempDir();
  const config = sampleConfig();
  scaffold({ root, config });
  fs.writeFileSync(path.join(root, 'fixtures/base.fixture.js'), '// custom');
  scaffold({ root, config });
  assert.equal(fs.readFileSync(path.join(root, 'fixtures/base.fixture.js'), 'utf8'), '// custom');
});

test('the API option wires config, fixtures, scripts and a sweep step before the tests', () => {
  const { root } = scaffoldedProject();
  assert.ok(fs.existsSync(path.join(root, 'api/api.config.js')));
  const fixtures = fs.readFileSync(path.join(root, 'fixtures/base.fixture.js'), 'utf8');
  assert.match(fixtures, /apiFixtures\(apiConfig, PROFILES\)/);
  assert.doesNotMatch(fixtures, /\{\{/);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.sweep, 'node framework/bin/qa.mjs sweep');
  const steps = parse(fs.readFileSync(path.join(root, '.github/workflows/regression.yml'), 'utf8')).jobs.test.steps.map((s) => s.name ?? s.run ?? s.uses);
  assert.ok(steps.indexOf('Remove QA data left by interrupted runs') < steps.indexOf('Run tests'));
});

test('without the API option there is no api folder, fixture or sweep step', () => {
  const { root } = scaffoldedProject(sampleConfig({ api: false }));
  assert.ok(!fs.existsSync(path.join(root, 'api')));
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'fixtures/base.fixture.js'), 'utf8'), /api/i);
  assert.doesNotMatch(fs.readFileSync(path.join(root, '.github/workflows/regression.yml'), 'utf8'), /sweep/);
});

test('Slack, Jira and LLM settings reach the workflows as secrets and variables, and doctor agrees', () => {
  const { root, config } = scaffoldedProject(sampleConfig({ llm: { provider: 'openai-compatible' } }));
  const smoke = fs.readFileSync(path.join(root, '.github/workflows/smoke.yml'), 'utf8');
  for (const name of ['SLACK_WEBHOOK_URL', 'JIRA_API_TOKEN', 'LLM_API_KEY']) assert.match(smoke, new RegExp(`${name}: \\$\\{\\{ secrets\\.${name} \\}\\}`));
  for (const name of ['SLACK_NOTIFY', 'JIRA_AUTO_CREATE', 'JIRA_ISSUE_TYPE', 'LLM_PROVIDER', 'LLM_MODEL', 'LLM_BASE_URL']) assert.match(smoke, new RegExp(`${name}: \\$\\{\\{ vars\\.${name} \\}\\}`));
  const steps = parse(smoke).jobs.test.steps.map((s) => s.name ?? '');
  assert.ok(steps.indexOf('Notify') > steps.indexOf('Prepare the publishable report'));
  assert.equal(parse(smoke).jobs.test.steps.find((s) => s.name === 'Notify')['continue-on-error'], true);
  const example = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  assert.match(example, /^LLM_BASE_URL=$/m);
  assert.match(example, /^JIRA_AUTO_CREATE=false$/m);
  assert.deepEqual(runDoctor(root).filter((i) => i.level === 'error'), []);
  assert.ok(config.options.llm);
});

test('without Slack and Jira there is no notify step; without an LLM no LLM settings', () => {
  const { root } = scaffoldedProject(sampleConfig({ slack: false, jira: false, llm: null }));
  const smoke = fs.readFileSync(path.join(root, '.github/workflows/smoke.yml'), 'utf8');
  assert.doesNotMatch(smoke, /Notify|LLM_|SLACK|JIRA/);
});

test('triggers: smoke on push, structure checks on pull requests without secrets, no secrets ever on pull_request', () => {
  const { root } = scaffoldedProject();
  const read = (f) => fs.readFileSync(path.join(root, '.github/workflows', f), 'utf8');
  const smoke = parse(read('smoke.yml')).on;
  assert.deepEqual(smoke.push.branches, ['main', 'master']);
  assert.ok(smoke.schedule && smoke.workflow_dispatch);
  assert.ok(!('repository_dispatch' in smoke), 'product deploy trigger is opt-in');
  for (const file of ['smoke.yml', 'regression.yml', 'api.yml', 'pages.yml']) {
    assert.ok(!('pull_request' in parse(read(file)).on) && !('pull_request_target' in parse(read(file)).on), `${file} must not run on pull requests`);
  }
  const checks = read('checks.yml');
  assert.ok('pull_request' in parse(checks).on);
  assert.doesNotMatch(checks, /secrets\./);
  assert.match(checks, /npm run doctor/);
  assert.match(checks, /npm run catalog/);
});

test('triggers can be switched off', () => {
  const config = sampleConfig();
  config.triggers = { push: false, pullRequest: false, productDeploy: false };
  const { root } = scaffoldedProject(config);
  assert.ok(!fs.existsSync(path.join(root, '.github/workflows/checks.yml')));
  assert.ok(!('push' in parse(fs.readFileSync(path.join(root, '.github/workflows/smoke.yml'), 'utf8')).on));
});

test('the product deploy trigger adds repository_dispatch, risk selection, a risk map and instructions', () => {
  const config = sampleConfig();
  config.triggers = { push: true, pullRequest: true, productDeploy: true };
  config.productRepo = 'acme/product';
  const { root } = scaffoldedProject(config);
  for (const file of ['smoke.yml', 'regression.yml']) {
    const doc = parse(fs.readFileSync(path.join(root, '.github/workflows', file), 'utf8'));
    assert.deepEqual(doc.on.repository_dispatch.types, ['product-deployed']);
    assert.ok(doc.on.workflow_dispatch.inputs.changed_paths);
    const steps = doc.jobs.test.steps;
    const select = steps.find((s) => s.id === 'select');
    assert.match(select.run, /qa -- select --suite tests\/(smoke-tests|regression)/);
    assert.match(select.env.QA_CHANGED_PATHS, /client_payload\.changed_paths/);
    assert.ok(steps.indexOf(select) < steps.findIndex((s) => s.id === 'run'));
    assert.match(steps.find((s) => s.id === 'run').env.TEST_GREP, /steps\.select\.outputs\.grep/);
    assert.ok(!/run: .*client_payload/.test(JSON.stringify(steps.map((s) => s.run ?? ''))), 'the payload never reaches a shell command line');
  }
  const map = JSON.parse(fs.readFileSync(path.join(root, 'risk.map.json'), 'utf8'));
  assert.deepEqual(map.rules, []);
  assert.match(fs.readFileSync(path.join(root, 'docs/product-deploy-trigger.md'), 'utf8'), /acme\/product/);
});

test('the visual option adds tagged screenshot tests, a helper, a workflow and a config that loads', () => {
  const { root } = scaffoldedProject(sampleConfig({ visual: true }));
  const config = fs.readFileSync(path.join(root, 'playwright.config.js'), 'utf8');
  assert.match(config, /grepInvert: process\.env\.VISUAL/);
  assert.match(config, /maxDiffPixelRatio: 0\.001/);
  assert.ok(fs.existsSync(path.join(root, 'utils/visual.js')));
  const wf = parse(fs.readFileSync(path.join(root, '.github/workflows/visual.yml'), 'utf8'));
  assert.ok(wf.on.workflow_dispatch.inputs.update_baselines);
  assert.equal(wf.jobs.visual.steps.find((s) => s.name === 'Push the updated baselines').if, 'inputs.update_baselines');
  const off = fs.readFileSync(path.join(scaffoldedProject().root, 'playwright.config.js'), 'utf8');
  assert.doesNotMatch(off, /toHaveScreenshot|grepInvert/);
  assert.ok(!fs.existsSync(path.join(scaffoldedProject().root, '.github/workflows/visual.yml')));
});
