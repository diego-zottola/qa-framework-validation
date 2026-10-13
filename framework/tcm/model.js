// Pure helpers for the TCM page (no DOM): routing, filtering and tree counts. Unit-tested in Node.

export function parseRoute(hash) {
  const parts = (hash || '').replace(/^#\/?/, '').split('/').map(decodeURIComponent).filter(Boolean);
  if (parts[0] === 'case' && parts[1]) return { view: 'case', id: parts[1] };
  if (parts[0] === 'area' && parts[1]) return { view: 'list', area: parts[1] };
  if (parts[0] === 'feature' && parts[1] && parts[2]) return { view: 'list', area: parts[1], feature: parts[2] };
  return { view: 'list' };
}

export const routeFor = {
  all: () => '#/',
  area: (area) => `#/area/${encodeURIComponent(area)}`,
  feature: (area, feature) => `#/feature/${encodeURIComponent(area)}/${encodeURIComponent(feature)}`,
  case: (id) => `#/case/${encodeURIComponent(id)}`,
};

const haystack = (c) => [c.id, c.title, c.area, c.feature, ...c.tags, ...c.preconditions, ...c.steps, ...c.expected].join(' ').toLowerCase();

/** `filters` values of '' mean "any". All words of `query` must appear somewhere in the case. */
export function filterCases(cases, { query = '', area = '', feature = '', type = '', priority = '', automation = '' } = {}) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return cases.filter(
    (c) =>
      (!area || c.area === area) &&
      (!feature || c.feature === feature) &&
      (!type || c.type === type) &&
      (!priority || c.priority === priority) &&
      (!automation || c.automation === automation) &&
      words.every((w) => haystack(c).includes(w)),
  );
}

export function distinct(cases, key) {
  return [...new Set(cases.map((c) => c[key]))].sort();
}
