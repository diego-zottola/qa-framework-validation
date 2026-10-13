---
name: ai-driven-automation-framework
description: Finish onboarding a new application under test after `npm run init` has scaffolded the project: explore the app, write docs, page objects, specs, test case definitions and API tests. Use when the project has a .qa-framework.json and no app knowledge yet. Triggers: "new app under testing", "bootstrap ai-driven automation framework", "start automation for [app]".
---

# AI-Driven Automation Framework: exploration and test writing

`npm run init` is deterministic and has ALREADY created, from the answers it collected:
`.qa-framework.json`, `playwright.config.js`, `auth/` (profiles, global setup with a generic login), `fixtures/`,
`pages/BasePage.js`, `.env`/`.env.example`, `.github/workflows/*`, `api/` (when the API option is on), the generic
login smoke suite (TC0001-TC0004 in `tests/smoke-tests/auth.spec.js` and `test-cases/authentication.yml`) and
the shared code in `framework/`. Do NOT regenerate, rewrite or "fix" those: extend `pages/`, `fixtures/`, `tests/`,
`test-cases/`, `api/` and `docs/`. Never edit `framework/` (shared code replaced on upgrade); if it seems wrong, say so in the summary.
Reference for everything the framework does: [framework/README.md](../../../framework/README.md).

## 1. Read first
`.qa-framework.json` (roles, options), `docs/business-rules.md`, `framework/README.md`, existing `docs/*`, and the
login suite. Credentials and URLs are in `.env` (never print or commit them).

## 2. Explore the application (mandatory)
Use the Playwright MCP browser (user scope: `claude mcp list | grep playwright`; offer
`claude mcp add --scope user playwright -- npx @playwright/mcp@latest` if missing). Log in with `.env` credentials, walk the
main navigation WITHOUT mutating data unless the data is created with the test prefix and removed afterwards.
Snapshot for real accessible names; never assume them. Note gotchas (spinners, route guards, cold starts, WAF).
Write `docs/app-map.md`, `docs/business-rules.md` (rules of the app under test) and `docs/technical-context.md`
(login, data, cleanup, pitfalls). No secrets, no real customer data (the repository may be public).
If a profile needs a role that `init` could not create, say what is missing; do not invent credentials.

## 3. Page objects and specs
- One page object per screen in `pages/` extending `BasePage`; locators by role, label or test id; assertions live in specs.
- Register page objects as fixtures in `fixtures/base.fixture.js` (keep `...qaFixtures`, `...healFixtures`, `...apiFixtures`).
- Smoke = core happy paths (`tests/smoke-tests/`), regression = everything else (`tests/regression/`); never mix them in a file.
- Another role in a spec: `test.use(useEnvironment('<profile>'))`; do not assume a role's permissions, check them in the app.
- Test titles start with a case ID: `TC0005 - action and expected result`. IDs are `TC` + 4 digits, unique, sequential. A
  parametrized test keeps its ID and adds a variant: `TC0030 - paste [html]`. One ID lives in one spec file.
- Known defects: annotate `{ type: 'defect', description: 'DEF-01' }`; never weaken an assertion to get green.

## 4. Test case definitions (the catalog)
Every test has a definition in `test-cases/<area>.yml` (see `test-cases/authentication.yml`):
`id, title, priority (high|medium|low), type (ui|api), automation (automated|manual|planned), preconditions[], steps[],
expected[]`, optional `spec`, `tags`, `defect`, `draft`. Write real steps and expected results from what you observed;
never derive steps from the title. Manual cases (not automatable) get definitions with `automation: manual` and no test.
`npm run catalog` must pass (it compares the definitions with what Playwright lists). `npm run qa -- catalog --stub`
adds draft entries for tests lacking one; a draft must be completed before you finish.

## 5. API (only when `options.api` is true)
1. `npm run api:discover` records the endpoints the UI calls (paths and methods only) and reads an OpenAPI document when the
   app exposes one. Add read-only navigation to `api/discover.flows.js` to reach more screens; re-run.
2. Fill `api/api.config.js`: `auth` mode (cookies, bearer-localstorage or login-endpoint), and `resources` (create, remove, list)
   for the data tests create. Names get the `qa-auto-` prefix automatically.
3. UI tests that need data use the `seed` fixture (`await seed.create('<kind>')`): it cleans up even when the test fails.
   Never make a UI test depend on an API test.
4. API tests go in `tests/api/*.spec.js`, import `test` from `fixtures/api.fixture.js`, and have `type: api` definitions.
5. `npm run api:coverage` writes `docs/api-endpoints.md` (observed, documented, covered, limits). Say honestly what is not covered.
6. If the app has no creation/cleanup API, or the QA account lacks permission, say so and use the UI fixture approach.
`npm run sweep -- --dry-run` shows leftovers it would remove (prefix, age and the QA account only).

## 6. Run and fix
`npm run setup` is done by init; run `npx playwright test --project=chromium`, fix root causes, rerun. Do not report done
on a red test unless it is an annotated known defect. Then `npm run catalog` and `npm run doctor`. Commit locally; push only if the user asked.

## 7. Rules that never change
- The healer only suggests selector fixes (`npm run qa -- heal`); assertions, expected values and business rules are never changed to pass.
- Never publish or commit: credentials, tokens, `.env`, storage states, traces, videos.
- Language: code, comments, commit messages and project files in English.
- Update `CLAUDE.md` (project purpose, stack, app section, test inventory) from `framework/templates/CLAUDE.md.template`.

## 8. Exit checklist
- [ ] docs written, no secrets
- [ ] every test has a definition; `npm run catalog` and `npm run doctor` pass
- [ ] suites run green except annotated defects
- [ ] if API option: `docs/api-endpoints.md` generated, `seed` used by UI tests that create data
- [ ] `CLAUDE.md` filled in; local commit made
- [ ] summary lists what is pending for the user (see the setup summary printed by init)
