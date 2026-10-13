import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// {{APP_NAME}} — API Performance Test Harness
//
// This file is a generic runner: authentication, scenario/threshold wiring, and
// the HTML report are all driven off the single ENDPOINTS array below. To point
// this at a new set of endpoints, edit ONLY the CONFIG block — nothing else
// needs to change.
//
// Scenarios:
//   smoke   → 1 VU, 1 min  — baseline: are endpoints alive and fast?
//   load    → ramp to 10 VU — normal expected concurrent users
//   stress  → ramp to 30 VU — find the breaking point
//
// Run smoke:  npm run perf:smoke
// Run load:   npm run perf:load
// Run stress: npm run perf:stress
//
// Override environment:
//   k6 run --env SCENARIO=smoke --env ENV=uat performance-tests/load-test.js
// ─────────────────────────────────────────────────────────────────────────────

// ═══════════════════════════════ CONFIG ════════════════════════════════════
// Edit this block to point the harness at a different app / set of endpoints.

const APP_NAME = __ENV.APP_NAME || '{{APP_NAME}}';
const LOGIN_PATH = __ENV.LOGIN_PATH || '/auth/login';

// Per-environment API base URLs — delete the ones the project doesn't have.
const API_BASES = {
  dev: __ENV.API_BASE_DEV || '{{DEV_API_BASE}}',
  qa: __ENV.API_BASE_QA || '{{QA_API_BASE}}',
  uat: __ENV.API_BASE_UAT || '{{UAT_API_BASE}}',
};

// One entry per endpoint under test. `key` doubles as the k6 metric tag and the
// report row label; `limit` is the p95 response-time threshold in ms.
const ENDPOINTS = [
  // { key: 'Dashboard', path: '/dashboard', limit: 3000 },
  // { key: 'Item list',  path: '/items?page=1&limit=20', limit: 3000 },
];

// ═══════════════════════════════ RUNNER (generic — no need to edit below) ══

const ENV = __ENV.ENV || 'dev';
const SCENARIO = __ENV.SCENARIO || 'smoke';
const EMAIL = __ENV.EMAIL || '';
const PASSWORD = __ENV.PASSWORD || '';
const MAX_VUS = parseInt(__ENV.VUS || '0', 10); // 0 = use scenario default
const API_BASE = __ENV.API_BASE || API_BASES[ENV] || API_BASES.dev;

const scenarios = {
  smoke: {
    executor: 'constant-vus',
    vus: MAX_VUS || 1,
    duration: '1m',
  },
  load: {
    executor: 'ramping-vus',
    startVUs: 1,
    stages: [
      { duration: '30s', target: Math.round((MAX_VUS || 10) * 0.5) },
      { duration: '1m', target: MAX_VUS || 10 },
      { duration: '30s', target: 0 },
    ],
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 1,
    stages: [
      { duration: '30s', target: Math.round((MAX_VUS || 30) * 0.33) },
      { duration: '1m', target: Math.round((MAX_VUS || 30) * 0.66) },
      { duration: '1m', target: MAX_VUS || 30 },
      { duration: '30s', target: 0 },
    ],
  },
};

// Thresholds are derived from ENDPOINTS — one `limit` edit in CONFIG updates
// both the pass/fail gate and the report, instead of two places to keep in sync.
const thresholds = { http_req_failed: ['rate<0.05'] };
ENDPOINTS.forEach((ep) => {
  thresholds[`http_req_duration{endpoint:${ep.key}}`] = [`p(95)<${ep.limit}`];
});

export const options = {
  scenarios: { [APP_NAME.toLowerCase().replace(/\s+/g, '-')]: scenarios[SCENARIO] },
  thresholds,
};

// Authenticate once for the whole test run.
// If TOKEN is set in the environment (via `export TOKEN=$(node performance-tests/get-token.js)`)
// the login call is skipped entirely.
export function setup() {
  if (__ENV.TOKEN) {
    console.log('Using pre-generated token from TOKEN env variable — skipping login call.');
    return { token: __ENV.TOKEN };
  }

  const res = http.post(`${API_BASE}${LOGIN_PATH}`, JSON.stringify({ email: EMAIL, password: PASSWORD }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const ok = check(res, {
    'login status 200': (r) => r.status === 200,
    'token present': (r) => !!r.json('accessToken'), // adjust to match the app's login response shape
  });

  if (!ok) {
    console.error(`Login failed: ${res.status} ${res.body?.slice(0, 200)}`);
  }

  return { token: res.json('accessToken') };
}

export default function (data) {
  const headers = {
    Authorization: `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  for (const ep of ENDPOINTS) {
    const res = http.get(`${API_BASE}${ep.path}`, {
      headers,
      tags: { endpoint: ep.key },
    });

    check(res, {
      [`${ep.key} — status 200`]: (r) => r.status === 200,
      [`${ep.key} — has response body`]: (r) => r.body?.length > 0,
    });

    sleep(0.5);
  }

  sleep(1);
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  const filename = `performance-tests/reports/report-${SCENARIO}-${ENV}-${timestamp}.html`;

  return {
    [filename]: buildReport(data, SCENARIO, ENV, timestamp),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom HTML report — detailed but human-readable. Generic: reads ENDPOINTS
// from CONFIG above, no per-project edits needed here.
// ─────────────────────────────────────────────────────────────────────────────

function fmt(ms) {
  if (ms == null || ms === 0) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`;
}

function fmtBytes(bytes) {
  if (bytes == null) return '—';
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${Math.round(bytes)} B`;
}

function fmtRate(ratePerSec) {
  if (ratePerSec == null) return '—';
  if (ratePerSec >= 1_000_000) return `${(ratePerSec / 1_000_000).toFixed(2)} MB/s`;
  if (ratePerSec >= 1_000) return `${(ratePerSec / 1_000).toFixed(1)} KB/s`;
  return `${Math.round(ratePerSec)} B/s`;
}

function buildReport(data, scenario, env, timestamp) {
  const HTTP_METRICS = [
    { key: 'http_req_blocked', label: 'Queue wait time', desc: 'Time waiting for a free network connection slot. Usually 0 on warm connections.' },
    { key: 'http_req_connecting', label: 'TCP connection setup', desc: 'Time to open a new TCP connection to the server. 0 when reusing an existing connection.' },
    { key: 'http_req_tls_handshaking', label: 'TLS security handshake', desc: 'Time spent on SSL/TLS encryption setup. 0 when the connection is already established.' },
    { key: 'http_req_sending', label: 'Request upload time', desc: 'Time to send the request data to the server.' },
    { key: 'http_req_waiting', label: 'Server processing time', desc: 'Time waiting for the server to start sending a response (Time To First Byte).' },
    { key: 'http_req_receiving', label: 'Response download time', desc: 'Time to receive the full response body from the server.' },
    { key: 'http_req_duration', label: 'Total response time', desc: 'Full round-trip from sending the request to receiving the complete response. Sum of sending + waiting + receiving.' },
  ];

  const SCENARIO_LABELS = {
    smoke: 'Smoke — 1 user, 1 minute (baseline check)',
    load: 'Load — up to 10 concurrent users, 2 minutes',
    stress: 'Stress — up to 30 concurrent users, 3 minutes',
  };

  const totalReqs = data.metrics.http_reqs?.values.count || 0;
  const failedReqs = data.metrics.http_req_failed?.values.passes || 0;
  const maxVUs = data.metrics.vus_max?.values.max || '?';
  const iterations = data.metrics.iterations?.values.count || 0;
  const iterRate = data.metrics.iterations?.values.rate || 0;
  const reqRate = data.metrics.http_reqs?.values.rate || 0;
  const dataRecv = data.metrics.data_received?.values.count || 0;
  const dataRecvRate = data.metrics.data_received?.values.rate || 0;
  const dataSent = data.metrics.data_sent?.values.count || 0;
  const dataSentRate = data.metrics.data_sent?.values.rate || 0;
  const runDate = timestamp.slice(0, 10);
  const runTime = timestamp.slice(11).replace(/-/g, ':');

  const epRows = ENDPOINTS.map((ep) => {
    const metric = data.metrics[`http_req_duration{endpoint:${ep.key}}`];
    if (!metric) return null;
    const v = metric.values;
    const p95 = v['p(95)'];
    const p90 = v['p(90)'];
    const passed = p95 < ep.limit;
    const pct = Math.min(100, (p95 / ep.limit) * 100);
    return { ...ep, min: v.min, avg: v.avg, med: v.med, max: v.max, p90, p95, passed, pct };
  }).filter(Boolean);

  const slowEndpoints = epRows.filter((r) => !r.passed);
  const overallPass = slowEndpoints.length === 0 && failedReqs === 0;

  const epTableRows = epRows.map((r) => {
    const barColor = r.passed ? '#22c55e' : '#ef4444';
    const badgeBg = r.passed ? '#dcfce7' : '#fee2e2';
    const badgeColor = r.passed ? '#15803d' : '#b91c1c';
    const badgeText = r.passed ? '✅ OK' : '⚠️ Slow';
    return `
      <tr>
        <td class="ep-name">${r.key}</td>
        <td><span class="badge" style="background:${badgeBg};color:${badgeColor}">${badgeText}</span></td>
        <td class="num">${fmt(r.min)}</td>
        <td class="num">${fmt(r.med)}</td>
        <td class="num">${fmt(r.avg)}</td>
        <td class="num">${fmt(r.p90)}</td>
        <td class="num ${r.passed ? '' : 'slow'}">${fmt(r.p95)}</td>
        <td class="num">${fmt(r.max)}</td>
        <td class="num limit">≤ ${fmt(r.limit)}</td>
        <td>
          <div class="bar-wrap">
            <div class="bar-bg"><div class="bar-fill" style="width:${r.pct.toFixed(1)}%;background:${barColor}"></div></div>
            <span class="bar-pct">${r.pct.toFixed(0)}%</span>
          </div>
        </td>
      </tr>`;
  }).join('');

  const httpMetricRows = HTTP_METRICS.map((m) => {
    const metric = data.metrics[m.key];
    if (!metric) return '';
    const v = metric.values;
    return `
      <tr>
        <td class="ep-name">${m.label}<div class="sub-desc">${m.desc}</div></td>
        <td class="num">${fmt(v.min)}</td>
        <td class="num">${fmt(v.med)}</td>
        <td class="num">${fmt(v.avg)}</td>
        <td class="num">${fmt(v['p(90)'])}</td>
        <td class="num">${fmt(v['p(95)'])}</td>
        <td class="num">${fmt(v.max)}</td>
      </tr>`;
  }).join('');

  const allChecks = [];
  const rootChecks = data.root_group?.checks || [];
  rootChecks.forEach((c) => allChecks.push({ group: 'Main test', ...c }));
  (data.root_group?.groups || []).forEach((g) => {
    (g.checks || []).forEach((c) => allChecks.push({ group: g.name === '' ? 'Setup' : g.name, ...c }));
  });

  const checkRows = allChecks.map((c) => {
    const pct = c.passes + c.fails > 0 ? ((c.passes / (c.passes + c.fails)) * 100).toFixed(1) : '—';
    const allOk = c.fails === 0;
    const color = allOk ? '#15803d' : '#b91c1c';
    const bg = allOk ? '#dcfce7' : '#fee2e2';
    return `
      <tr>
        <td class="ep-name">${c.name}</td>
        <td><span class="badge" style="background:${bg};color:${color}">${allOk ? '✅ Pass' : '❌ Fail'}</span></td>
        <td class="num green">${c.passes}</td>
        <td class="num ${allOk ? '' : 'slow'}">${c.fails}</td>
        <td class="num">${pct}%</td>
      </tr>`;
  }).join('');

  const bannerClass = overallPass ? 'pass' : 'warn';
  const bannerIcon = overallPass ? '✅' : '⚠️';
  const bannerTitle = overallPass
    ? 'All endpoints responded within the acceptable time limit.'
    : `${slowEndpoints.length} endpoint${slowEndpoints.length > 1 ? 's were' : ' was'} too slow under this load.`;
  const bannerDesc = overallPass
    ? `The API handled all ${totalReqs} requests successfully with zero errors across ${maxVUs} concurrent user${maxVUs > 1 ? 's' : ''}.`
    : `The server remained stable — 0 errors, all data returned correctly. However, ${slowEndpoints.map((e) => e.key).join(', ')} exceeded the response time limit. Real users on those pages would experience a noticeable wait.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${APP_NAME} Performance Report — ${runDate}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; color: #0f172a; line-height: 1.5; }

  .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #fff; padding: 36px 48px; }
  .header h1 { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; }
  .header .sub { margin-top: 6px; opacity: 0.8; font-size: 14px; }
  .header .sub strong { opacity: 1; }

  .main { max-width: 1280px; margin: 32px auto; padding: 0 32px 48px; }

  .banner { display: flex; gap: 18px; align-items: flex-start; padding: 22px 24px; border-radius: 12px; margin-bottom: 28px; }
  .banner.pass { background: #f0fdf4; border: 1.5px solid #86efac; }
  .banner.warn { background: #fffbeb; border: 1.5px solid #fcd34d; }
  .banner .icon { font-size: 36px; flex-shrink: 0; line-height: 1; }
  .banner h2 { font-size: 17px; font-weight: 700; margin-bottom: 4px; }
  .banner p  { font-size: 13px; color: #475569; }

  .kpi-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 28px; }
  .kpi { background: #fff; border-radius: 10px; border: 1px solid #e2e8f0; padding: 18px 16px; text-align: center; }
  .kpi .val { font-size: 30px; font-weight: 800; color: #4f46e5; line-height: 1.1; }
  .kpi .val.green  { color: #16a34a; }
  .kpi .val.red    { color: #dc2626; }
  .kpi .val.orange { color: #ea580c; }
  .kpi .lbl { margin-top: 5px; font-size: 12px; font-weight: 600; color: #374151; }
  .kpi .desc { margin-top: 4px; font-size: 11px; color: #9ca3af; line-height: 1.4; }

  .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; margin-top: 32px; }
  .section-title:first-of-type { margin-top: 0; }
  .section-desc { font-size: 13px; color: #64748b; margin-bottom: 12px; margin-top: -8px; }

  .card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; overflow-x: auto; margin-bottom: 8px; }
  .card-title { padding: 14px 20px; font-size: 14px; font-weight: 600; border-bottom: 1px solid #f1f5f9; color: #0f172a; display: flex; justify-content: space-between; align-items: center; }
  .card-title .hint { font-size: 11px; font-weight: 400; color: #94a3b8; }

  table { width: 100%; border-collapse: collapse; }
  thead th { padding: 9px 14px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; text-align: left; border-bottom: 1px solid #f1f5f9; white-space: nowrap; background: #fafafa; }
  tbody td { padding: 11px 14px; border-bottom: 1px solid #f8fafc; font-size: 13px; vertical-align: middle; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:hover { background: #fafafa; }
  .ep-name { font-weight: 500; min-width: 180px; }
  .sub-desc { font-size: 11px; color: #94a3b8; font-weight: 400; margin-top: 2px; max-width: 320px; }
  .num { font-variant-numeric: tabular-nums; font-size: 12px; text-align: right; }
  .num.slow  { color: #dc2626; font-weight: 700; }
  .num.green { color: #16a34a; }
  .num.limit { color: #94a3b8; font-size: 11px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
  .bar-wrap { display: flex; align-items: center; gap: 6px; min-width: 110px; }
  .bar-bg { flex: 1; background: #f1f5f9; border-radius: 99px; height: 7px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 99px; }
  .bar-pct { font-size: 11px; color: #94a3b8; white-space: nowrap; width: 30px; text-align: right; }

  .transfer-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 8px; }
  .transfer-card { background: #fff; border-radius: 10px; border: 1px solid #e2e8f0; padding: 18px 20px; }
  .transfer-card h4 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; margin-bottom: 8px; }
  .transfer-card .big { font-size: 24px; font-weight: 700; color: #4f46e5; }
  .transfer-card .rate-lbl { font-size: 12px; color: #64748b; margin-top: 4px; }

  .glossary { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 22px 24px; margin-top: 32px; }
  .glossary h3 { font-size: 14px; font-weight: 700; margin-bottom: 14px; }
  .glossary table { border: none; }
  .glossary thead th { background: none; }
  .glossary tbody td { font-size: 12px; }
  .glossary .term { font-weight: 600; color: #0f172a; white-space: nowrap; }
  .glossary .def  { color: #64748b; }

  .footer { text-align: center; font-size: 12px; color: #94a3b8; margin-top: 36px; }
</style>
</head>
<body>

<div class="header">
  <h1>${APP_NAME} API Performance Report</h1>
  <div class="sub">
    Environment: <strong>${env.toUpperCase()}</strong>
    &nbsp;&middot;&nbsp;
    Test type: <strong>${SCENARIO_LABELS[scenario] || scenario}</strong>
    &nbsp;&middot;&nbsp;
    Run on: <strong>${runDate} at ${runTime}</strong>
  </div>
</div>

<div class="main">

  <div class="banner ${bannerClass}">
    <div class="icon">${bannerIcon}</div>
    <div>
      <h2>${bannerTitle}</h2>
      <p>${bannerDesc}</p>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi">
      <div class="val">${totalReqs}</div>
      <div class="lbl">API Calls Made</div>
      <div class="desc">Total number of requests sent to the server during this test</div>
    </div>
    <div class="kpi">
      <div class="val ${failedReqs > 0 ? 'red' : 'green'}">${totalReqs > 0 ? (((totalReqs - failedReqs) / totalReqs) * 100).toFixed(1) : 100}%</div>
      <div class="lbl">Success Rate</div>
      <div class="desc">${totalReqs - failedReqs} of ${totalReqs} calls returned a correct response</div>
    </div>
    <div class="kpi">
      <div class="val ${failedReqs > 0 ? 'red' : 'green'}">${failedReqs}</div>
      <div class="lbl">Errors</div>
      <div class="desc">Requests that failed or returned an unexpected error from the server</div>
    </div>
    <div class="kpi">
      <div class="val ${slowEndpoints.length > 0 ? 'orange' : 'green'}">${slowEndpoints.length} / ${ENDPOINTS.length}</div>
      <div class="lbl">Pages Too Slow</div>
      <div class="desc">Pages where the slowest 5% of users waited longer than the defined limit</div>
    </div>
    <div class="kpi">
      <div class="val">${maxVUs}</div>
      <div class="lbl">Simultaneous Users</div>
      <div class="desc">Peak number of users hitting the app at exactly the same time during this test</div>
    </div>
  </div>

  <div class="section-title">① Response Times — Page by Page</div>
  <div class="section-desc">Each row is one feature of the app. The most important column is <strong>95th Percentile</strong> — it tells you what the slowest realistic users experienced. If it exceeds the Limit, it's flagged red.</div>
  <div class="card">
    <div class="card-title">
      Endpoint Response Times
      <span class="hint">All values in milliseconds (ms) or seconds (s)</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Page / Feature</th>
          <th>Result</th>
          <th style="text-align:right">Fastest</th>
          <th style="text-align:right">Typical</th>
          <th style="text-align:right">Average</th>
          <th style="text-align:right" title="90% of requests were faster than this">p90</th>
          <th style="text-align:right" title="95% of requests were faster than this — primary threshold">p95 ★</th>
          <th style="text-align:right">Slowest</th>
          <th style="text-align:right">Limit</th>
          <th>Limit used</th>
        </tr>
      </thead>
      <tbody>
        ${epTableRows}
      </tbody>
    </table>
  </div>

  <div class="section-title">② Network & Server Time Breakdown</div>
  <div class="section-desc">This breaks down where time is spent during each request. "Server processing time" is usually the largest — it's the time the backend spends computing the response.</div>
  <div class="card">
    <div class="card-title">
      Request Timing Internals
      <span class="hint">Aggregate across all ${totalReqs} requests</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>What it measures</th>
          <th style="text-align:right">Fastest</th>
          <th style="text-align:right">Typical (median)</th>
          <th style="text-align:right">Average</th>
          <th style="text-align:right">90th pct</th>
          <th style="text-align:right">95th pct</th>
          <th style="text-align:right">Slowest</th>
        </tr>
      </thead>
      <tbody>
        ${httpMetricRows}
      </tbody>
    </table>
  </div>

  <div class="section-title">③ Data Transferred</div>
  <div class="section-desc">How much data moved between the test runner and the API during the whole test.</div>
  <div class="transfer-row">
    <div class="transfer-card">
      <h4>Data Received (API → Test)</h4>
      <div class="big">${fmtBytes(dataRecv)}</div>
      <div class="rate-lbl">Average rate: ${fmtRate(dataRecvRate)}</div>
    </div>
    <div class="transfer-card">
      <h4>Data Sent (Test → API)</h4>
      <div class="big">${fmtBytes(dataSent)}</div>
      <div class="rate-lbl">Average rate: ${fmtRate(dataSentRate)}</div>
    </div>
  </div>

  <div class="section-title">④ Reliability Checks</div>
  <div class="section-desc">Every request was validated against these conditions. A "Fail" here means a response came back wrong — not just slow.</div>
  <div class="card">
    <div class="card-title">Check Results</div>
    <table>
      <thead>
        <tr>
          <th>Check</th>
          <th>Result</th>
          <th style="text-align:right">Passed</th>
          <th style="text-align:right">Failed</th>
          <th style="text-align:right">Pass rate</th>
        </tr>
      </thead>
      <tbody>
        ${checkRows}
      </tbody>
    </table>
  </div>

  <div class="section-title">⑤ Test Run Configuration</div>
  <div class="section-desc">What was configured and measured during this run.</div>
  <div class="card">
    <table>
      <tbody>
        <tr>
          <td class="ep-name">Test scenario</td>
          <td>${SCENARIO_LABELS[scenario] || scenario}</td>
        </tr>
        <tr>
          <td class="ep-name">Environment</td>
          <td>${env.toUpperCase()}</td>
        </tr>
        <tr>
          <td class="ep-name">Max concurrent users (Virtual Users)</td>
          <td>${maxVUs}</td>
        </tr>
        <tr>
          <td class="ep-name">Total complete iterations <span style="font-size:11px;color:#94a3b8">(one iteration = one full pass through all endpoints)</span></td>
          <td>${iterations} &nbsp;<span style="color:#94a3b8;font-size:12px">(${iterRate.toFixed(2)}/s avg)</span></td>
        </tr>
        <tr>
          <td class="ep-name">Total API requests</td>
          <td>${totalReqs} &nbsp;<span style="color:#94a3b8;font-size:12px">(${reqRate.toFixed(2)}/s avg)</span></td>
        </tr>
        <tr>
          <td class="ep-name">Failed requests</td>
          <td style="color:${failedReqs > 0 ? '#dc2626' : '#16a34a'};font-weight:600">${failedReqs} (${totalReqs > 0 ? ((failedReqs / totalReqs) * 100).toFixed(2) : 0}%)</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="glossary">
    <h3>Glossary — What every term means</h3>
    <table>
      <thead><tr><th style="text-align:left">Term</th><th style="text-align:left">Plain English meaning</th></tr></thead>
      <tbody>
        <tr><td class="term">Minimum (min)</td><td class="def">The single fastest response recorded during the entire test. Best-case scenario.</td></tr>
        <tr><td class="term">Median (med)</td><td class="def">The middle value — half of all responses were faster, half were slower. More representative than the average.</td></tr>
        <tr><td class="term">Average (avg)</td><td class="def">The sum of all response times divided by the count. Can be skewed by a few very slow outliers.</td></tr>
        <tr><td class="term">90th Percentile (p90)</td><td class="def">9 out of 10 requests were faster than this. A good indicator of what most users experience.</td></tr>
        <tr><td class="term">95th Percentile (p95) ★</td><td class="def">19 out of 20 requests were faster than this. The primary threshold metric — it represents your slowest-but-typical users. This is what we compare against the Limit.</td></tr>
        <tr><td class="term">Maximum (max)</td><td class="def">The single slowest response recorded. Often an outlier (e.g. a cold start) — don't over-index on this.</td></tr>
        <tr><td class="term">Virtual Users (VUs)</td><td class="def">Simulated concurrent users. 10 VUs = 10 users hitting the API at exactly the same time.</td></tr>
        <tr><td class="term">Iteration</td><td class="def">One complete loop through all endpoints by a single virtual user.</td></tr>
        <tr><td class="term">Cold start</td><td class="def">Serverless backends "freeze" functions that haven't been called recently. The first call after idle time takes extra time to "wake up" — this is a cold start. It shows as a spike in max/p95 values.</td></tr>
        <tr><td class="term">TTFB (Server processing time)</td><td class="def">Time To First Byte — how long the server takes before it starts sending any response data back. High TTFB usually means the database query or business logic is slow.</td></tr>
      </tbody>
    </table>
  </div>

</div>

<div class="footer">${APP_NAME} QA Automation &nbsp;&middot;&nbsp; Performance Suite &nbsp;&middot;&nbsp; ${runDate}</div>

</body>
</html>`;
}
