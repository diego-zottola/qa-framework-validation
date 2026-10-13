import { parseRoute, routeFor, filterCases, distinct } from './model.js';

const $ = (selector) => document.querySelector(selector);
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  for (const child of children.flat()) node.append(child);
  return node;
};

let catalog = { cases: [], areas: [], stats: {} };
let site = null;
const state = { query: '', type: '', priority: '', automation: '' };

async function load() {
  const res = await fetch('catalog.json');
  if (!res.ok) throw new Error(`catalog.json: HTTP ${res.status}`);
  catalog = await res.json();
  // Optional: links to the latest Allure reports, written by the site build.
  site = await fetch('site.json').then((r) => (r.ok ? r.json() : null)).catch(() => null);
}

function fillSelect(select, values) {
  for (const value of values) select.append(el('option', { value, textContent: value }));
}

function renderTree(route) {
  const tree = $('#tree');
  tree.replaceChildren(el('a', { href: routeFor.all(), className: !route.area && route.view === 'list' ? 'active' : '', textContent: `All cases (${catalog.cases.length})` }));
  for (const area of catalog.areas) {
    const count = area.features.reduce((n, f) => n + f.cases.length, 0);
    tree.append(el('a', { href: routeFor.area(area.name), className: `area${route.area === area.name && !route.feature ? ' active' : ''}`, textContent: `${area.name} (${count})` }));
    for (const feature of area.features) {
      const active = route.area === area.name && route.feature === feature.name;
      tree.append(el('a', { href: routeFor.feature(area.name, feature.name), className: `feature${active ? ' active' : ''}`, textContent: `${feature.name} (${feature.cases.length})` }));
    }
  }
}

function badge(text, kind) {
  return el('span', { className: `badge ${kind}-${text}`, textContent: text });
}

function renderList(route) {
  const cases = filterCases(catalog.cases, { ...state, area: route.area ?? '', feature: route.feature ?? '' });
  const heading = route.feature ? `${route.area} / ${route.feature}` : (route.area ?? 'All cases');
  const table = el('table', {}, el('thead', {}, el('tr', {}, ['ID', 'Title', 'Type', 'Priority', 'Automation'].map((h) => el('th', { textContent: h })))));
  const body = el('tbody');
  for (const c of cases) {
    body.append(
      el('tr', {}, el('td', {}, el('a', { href: routeFor.case(c.id), textContent: c.id })), el('td', { textContent: c.title + (c.draft ? ' (draft)' : '') }), el('td', {}, badge(c.type, 'type')), el('td', {}, badge(c.priority, 'priority')), el('td', {}, badge(c.automation, 'automation'))),
    );
  }
  table.append(body);
  $('#content').replaceChildren(el('h2', { textContent: `${heading} · ${cases.length} case${cases.length === 1 ? '' : 's'}` }), cases.length ? table : el('p', { className: 'empty', textContent: 'No cases match.' }));
}

function section(title, items) {
  if (!items.length) return null;
  return el('section', { className: 'block' }, el('h3', { textContent: title }), el('ol', {}, items.map((text) => el('li', { textContent: text }))));
}

function reportLinks(c) {
  const suites = Object.keys(site?.latest ?? {});
  if (!suites.length) return null;
  const items = suites.map((suite) => {
    const direct = site.caseLinks?.[c.id]?.[suite];
    return el('li', {}, direct ? el('a', { href: direct, textContent: `Open in the latest ${suite} report` }) : el('a', { href: site.latest[suite], textContent: `Latest ${suite} report (search for ${c.id})` }));
  });
  return el('section', { className: 'block' }, el('h3', { textContent: 'Results' }), el('p', { textContent: 'Results live in Allure, not here.' }), el('ul', {}, items));
}

function renderCase(id) {
  const c = catalog.cases.find((x) => x.id === id);
  if (!c) {
    $('#content').replaceChildren(el('p', { className: 'empty', textContent: `Case ${id} not found.` }), el('a', { href: routeFor.all(), textContent: 'Back to all cases' }));
    return;
  }
  const source = c.spec ? `${c.spec.file}:${c.spec.line}${c.spec.tests > 1 ? ` (${c.spec.tests} tests)` : ''}` : 'Not automated';
  $('#content').replaceChildren(
    el('a', { href: routeFor.feature(c.area, c.feature), textContent: `← ${c.area} / ${c.feature}` }),
    el('h2', { textContent: `${c.id} · ${c.title}` }),
    el('p', { className: 'badges' }, badge(c.type, 'type'), badge(c.priority, 'priority'), badge(c.automation, 'automation'), c.draft ? badge('draft', 'automation') : '', c.defect ? el('span', { className: 'badge defect', textContent: `defect ${c.defect}` }) : ''),
    section('Preconditions', c.preconditions),
    section('Steps', c.steps),
    section('Expected results', c.expected),
    el('p', { className: 'source', textContent: `Source: ${source}` }),
    reportLinks(c),
  );
}

function render() {
  const route = parseRoute(location.hash);
  renderTree(route);
  if (route.view === 'case') renderCase(route.id);
  else renderList(route);
}

async function main() {
  try {
    await load();
  } catch (error) {
    $('#content').replaceChildren(el('p', { className: 'empty', textContent: `Could not load the catalog: ${error.message}` }));
    return;
  }
  document.title = `${site?.app ?? 'Test'} cases`;
  $('#title').textContent = `${site?.app ?? 'Test'} · Test cases`;
  $('#meta').textContent = `${catalog.stats.total} cases · updated ${catalog.generatedAt.slice(0, 10)}`;
  fillSelect($('#f-type'), distinct(catalog.cases, 'type'));
  fillSelect($('#f-priority'), distinct(catalog.cases, 'priority'));
  fillSelect($('#f-automation'), distinct(catalog.cases, 'automation'));
  for (const [id, key] of [['#search', 'query'], ['#f-type', 'type'], ['#f-priority', 'priority'], ['#f-automation', 'automation']]) {
    $(id).addEventListener('input', (event) => {
      state[key] = event.target.value;
      if (parseRoute(location.hash).view === 'case') location.hash = routeFor.all();
      else render();
    });
  }
  window.addEventListener('hashchange', render);
  render();
}

main();
