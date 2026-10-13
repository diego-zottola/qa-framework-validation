# Framework core

Everything under `framework/` is shared code, identical in every project created from the template. Do not edit it in a
project: changes belong to the template, and `npm run qa -- upgrade` replaces this folder. Project-owned files
(config, fixtures, page objects, tests, `test-cases/`, `api/`, `docs/`) are never touched by an upgrade.

## Layout

| Path | What it is |
|---|---|
| `bin/qa.mjs` | One CLI: `npm run qa -- <command>` |
| `lib/` | The code: scaffold, catalog, api, heal, site, integrations, diagnosis, risk, tickets, upgrade |
| `playwright/` | Fixtures projects spread into `test.extend`: `qaFixtures`, `healFixtures`, `apiFixtures` |
| `tcm/` | The static test case catalog page |
| `templates/` | Files `init` copies into the project and then the project owns |
| `workflows/` | GitHub Actions templates rendered by `init` into `.github/workflows/` |
| `test/` | Tests of the core (`npm run test:framework`) |

## What runs without any LLM

All of it. An LLM is only used by the optional tier 3 of the healer, and only if `LLM_PROVIDER` is set.

| Piece | Command | Notes |
|---|---|---|
| Setup | `npm run init` | Questions, validated logins, scaffold, GitHub secrets/variables/Pages, then Claude Code explores and writes tests |
| Consistency | `npm run doctor` | Config, pinned versions, lockfile, workflows, secrets, scripts |
| Catalog | `npm run catalog` | `test-cases/*.yml` against `playwright --list`; writes `.qa-out/catalog.json` |
| Diagnosis | `qa diagnose` | Product / selector / data / auth / infra / flaky / known defect / unknown, from `results.json` |
| Healer | `qa heal [--verify]` | Selector suggestions only. Never edits the repo, never touches assertions |
| API | `qa api-discover`, `qa api-coverage`, `qa sweep` | Observed endpoints, coverage, stale data removal |
| Reports | `qa publish-prepare`, `qa site-publish` | Sanitized Allure report to GitHub Pages, 15 days |
| Notify | `qa notify` | Slack, Jira (optional) |
| Risk | `qa select` | Tests by product change; doubt means everything |
| Tickets | `qa ticket-draft`, `qa ticket-check` | Drafts from acceptance criteria and a structural gate |
| Upgrade | `qa upgrade`, `qa adopt` | See below |

## What each workflow does and when it runs

| Workflow | Triggers | Secrets | Output |
|---|---|---|---|
| Smoke Tests | push to main/master, daily schedule, manual, product deploy (opt-in) | yes | Allure + diagnosis to Pages |
| Regression Tests | manual, product deploy (opt-in) | yes | same |
| API Tests | manual | yes | same |
| Checks | pull requests, push | none | `doctor` + `catalog` |
| Publish reports | after the suites finish (also on failure), daily cleanup, manual | token only | `qa-reports` branch + Pages |
| Visual Tests | manual (opt-in) | yes | baselines on a branch for review |

No workflow with secrets runs on `pull_request`. The publishing workflow ignores runs that come from pull requests or
from branches other than the default one.

## Reports and what is public

Each run publishes a sanitized Allure report, the failure diagnosis and healing suggestions to `https://<owner>.github.io/<repo>/`,
next to the TCM page (`/tcm/`). Reports live in folders per suite and run on the `qa-reports` branch; runs older than 15
days are removed on every publish and by a daily job. History of that branch is squashed when it grows.

Never published: traces, videos, ARIA snapshots, Playwright error-context files. Secrets, JWTs, bearer tokens, secret query values and QA
account names are removed from every text. Screenshots ARE published (failures only in CI) and can show application data: use test
accounts with fake data. If the repository is public, the workflow artifacts are readable by any GitHub user, so traces and
full reports are uploaded only when the repository is private (`artifacts.includeTraces` in `.qa-framework.json`: `auto`, `true`, `false`).
GitHub Pages sites are public on most plans even for private repositories.

## Test cases, IDs and links

IDs are `TC####`. The test title starts with the ID; a parametrized test repeats it with a variant label. The catalog lists each
case once. Allure results carry a link to the case in the TCM, and the TCM links to the case's result in the latest report of
each suite (deep link into Allure's `#suites/<group>/<test>` view; if Allure changes that structure the link falls back to the report's front page).
The TCM shows definitions only; results belong to Allure.

## API tests, seed and cleanup

`fixtures/api.fixture.js` for `tests/api`; `seed` in the UI fixtures creates data through the API, names it `qa-auto-<time>-<random>`, and
removes it when the test ends, passed or failed. If the process is killed, `qa sweep` (it also runs at the start of every CI suite) removes what
is left: only the QA account's own data, only the prefix, only older than 2 hours, and never more than 200 items per run.
Limit: tokens that expire during a very long run need the `login-endpoint` auth mode.

## Healer (suggestion mode)

On a failed action the fixture captures an ARIA snapshot while the page is open, proposes a replacement (same role, similar name, unique,
visible, enabled), and attaches it. `qa heal` maps it to the one place the locator is written (never inside `expect`) and `--verify` re-runs the test
with the change applied and then restores the file. Output: `.qa-out/heal/heal-report.md`, `heal.patch`. Nothing is applied for you.
Limits: only `getByRole/Text/Label/Placeholder/Title` with literal strings; no scoped, regex or CSS locators; a locator built dynamically is reported, not patched;
a passing re-run proves the click worked, not that the test is right. Optional tier 3 asks an LLM to pick from the page's own elements for failures the rules
cannot settle (element names are sent to the provider).

## Updating a project

Creating a repository from a template does not link it to the template. This is the minimal mechanism:

- `.qa-framework.json` records the framework version, the project's options and the hashes of the shared files it received.
- `npm run qa -- upgrade` fetches the template with `gh` (set `QA_TEMPLATE_REPO` for a fork; `--ref vX.Y.Z` for a version; `--from <dir>` for a local copy),
  replaces `framework/`, regenerates the workflows it generated (customized ones are kept, the new version goes to `.qa-out/upgrade/`),
  updates pinned dependencies, and prints the changelog. It stops if someone edited `framework/`.
- Changelog lines marked "Manual step" concern project-owned files and need a human (or `claude` with this repository's context).
- A project created before versioning: copy `framework/` from the template, `npm install yaml dotenv`, run `npm run qa -- adopt`, and follow what it prints.

Release rule for the template: bump `framework/VERSION`, add a changelog entry, and say when a project-owned file must change.
