# Notion Knockoff Test Automation: Claude Context

## Project purpose

Automated UI and API regression for "Notion Knockoff" (a collaborative workspace app: pages, trash, sharing, members, groups).
Built on the AI-driven automation framework: shared code lives in `framework/` (never edit it; it is replaced on upgrade), project code in
`pages/`, `fixtures/`, `tests/`, `test-cases/`, `api/` and `docs/`. Read `docs/app-map.md`, `docs/business-rules.md` and
`docs/technical-context.md` before acting, and append findings after each run.

## Stack

Playwright (JavaScript, ESM), Allure reporter, page objects extending `pages/BasePage.js` registered in `fixtures/base.fixture.js`.
The app's backend is Supabase (PostgREST); API tests and data seeding use `api/api.config.js`.

## Conventions

- Test titles start with a case ID: `TC0005 - action and expected result`; IDs are unique and sequential; every test has a definition in
  `test-cases/<area>.yml` (`npm run catalog` must pass). Smoke in `tests/smoke-tests/`, regression in `tests/regression/`, API in `tests/api/`.
- Locators by role, label or test id, in page objects; assertions live in specs. Another role: `test.use(useEnvironment('guest'))`.
- Test data: created through `seed.create('page')` (names `qa-auto-...`, cleaned up even on failure). UI-created pages are registered with
  `seed.items.push`. The body/title autosave is awaited through `editorPage.savedRequest()`, not through the "Guardado" status.
- Known defects are annotated, never hidden by weaker assertions. Credentials only in `.env`; never print or commit them.

## App: Notion Knockoff

- URL: `BASE_URL` in `.env`.
- Auth: username/password form; profiles `default` (workspace owner) and `guest` (guest of the owner's default workspace). Google login not automated.
- Key pages: `/w/<id>` home, `/w/<id>/p/<page>` editor, `/w/<id>/trash`, `/w/<id>/settings/members`, `/w/<id>/settings/groups`, `/settings`, `/profile`.
- Gotchas: UI is in Spanish; two nested `main` elements; the sidebar shows all pages so parallel tests must locate by unique name; the table grants no
  direct DELETE/UPDATE of archive fields (use the RPCs `archive_page`, `delete_page_permanently`); `API_BASE_URL` and `SUPABASE_ANON_KEY` are needed in `.env`/CI.

## Test inventory

Last TC: TC0043 (43 tests total)
- `tests/smoke-tests/auth.spec.js`: TC0001-TC0004 login. `tests/smoke-tests/workspace.spec.js`: TC0005-TC0009 workspace, create, title, open, search.
- `tests/regression/pages.spec.js`: TC0010-TC0019 body, subpages, archive, trash, search. `sharing.spec.js`: TC0020-TC0023. `roles.spec.js`: TC0024-TC0028 (guest).
- `tests/regression/settings.spec.js`: TC0029-TC0035 preferences, profile, members, groups, switcher.
- `tests/api/pages.spec.js`: TC0036-TC0043 pages API, RPCs, guest permissions.
