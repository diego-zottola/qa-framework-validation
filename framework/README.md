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
| Settings | `qa env add NAME --secret\|--variable`, `qa sync`, `qa secrets` | Make CI receive what the app needs; regenerate workflows; upload secrets and variables |
| Upgrade | `qa upgrade`, `qa adopt` | See below |

## What `npm run init` does, and what stays with you

| Step | Automatic | Needs you or a permission |
|---|---|---|
| Questions and logins | Asks URL, QA accounts (validated with a real login), options; every answer can also come from an `INIT_*` variable | Test accounts, and a manual login window for Google-only apps |
| Scaffold | Config, auth profiles, fixtures, `.env`, workflows, generic login smoke (TC0001-TC0004), pinned dependencies | none |
| GitHub secrets and variables | Uploaded from `.env` with `gh` (never printed) | `gh` logged in with admin rights on the repository |
| GitHub Pages | Enabled with source "GitHub Actions" through the API | Repository admin; private repositories on a free plan cannot (reported as pending, the deploy job is then skipped with a notice) |
| Exploration, docs, page objects, tests, catalog, API discovery and tests | Claude Code runs the one prompt in `framework/lib/explore.js` (the same text `qa explore` uses); needs the `claude` CLI logged in on the machine running `init` | A person to review what it wrote; it cannot run in CI (no LLM API key is assumed) |
| Settings the app needs (API keys, backend URL) | Claude registers them with `qa env add` (the skill says so); that updates config, `.env.example`, workflows and GitHub | Values must exist in `.env` |
| First run and publication | `init` commits, pushes and requests the first Pages publication | Permission to push; Pages enabled |
| Optional integrations (Slack, Jira, LLM, visual, product deploy trigger) | Asked; "no" skips them; their secrets are uploaded when given | Product deploy trigger needs a token only you can create; everything not configured is listed in the final "Setup summary" as pending |

`init` never reports something as configured when it was not: a skipped or refused step goes to the setup summary with the reason.

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
next to the TCM page (`/tcm/`, definitions only). Reports live in folders per suite and run on the `qa-reports` branch.

What is published, exactly:

| Item | Policy |
|---|---|
| Allure report, per run and suite | Sanitized (below) |
| Attachments | Allowlist: `text/plain`, `application/json`, `text/csv`, redacted as text. Everything else is withheld: traces, videos, HTML, SVG, PDF, archives, ARIA snapshots (`heal-evidence`), Playwright `error-context` |
| Screenshots | Images cannot be scanned for secrets or personal data. `artifacts.screenshots` in `.qa-framework.json`: `auto` (default: only if the repository is private), `true`, `false` |
| Text | Values of secret-looking variables (`*PASSWORD*`, `*TOKEN*`, `*SECRET*`, `*KEY`, bypass, webhook) and their URL-encoded, JSON-escaped and base64 forms, QA account names, JWTs, bearer tokens and secret query values are replaced |
| Leak scan | After sanitizing, the whole folder is scanned for the same values and token shapes. A hit stops the publication of that run (fail closed) and names the file, not the value |
| TCM | Case definitions only: no results, no history |
| Raw artifacts (traces, full report) | `artifacts.includeTraces`: `auto` uploads them only for private repositories; a public repository's artifacts are readable by any GitHub user |

Limits that remain: redaction knows the secrets of the CI environment and common token shapes, not arbitrary personal data typed by a
test or shown by the application (use fake QA data); secrets shorter than 6 characters are not matched; Pages sites are public on most
plans even for private repositories. Text attachments published by a project's own tests are redacted, not reviewed.

Retention is 15 days (`retentionDays`): artifacts expire by `retention-days`; every publish and a daily job remove runs older than that from the
`qa-reports` branch and the site; the daily and manual cleanup also squashes the branch history to one commit so expired reports do not stay in old
commits. The catalog is rebuilt from the repository at each publish, so it is never lost with the reports. GitHub may keep unreachable
commits fetchable by their exact SHA until it garbage-collects them: that cannot be forced from here.

Who may write: the test workflows have `contents: read` only and never run on pull requests. The publishing workflow has two jobs: `store`
(`contents: write`, only for runs of the default branch that were not triggered by a pull request, holds no QA credentials) and `deploy`
(`pages: write`, `id-token: write`, reads the branch). Only `store` pushes, with retry when two runs publish together; `deploy` is queued, never cancelled.
Pull requests get the `Checks` workflow: no secrets, no application access, nothing to publish.

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

Suggestion mode only; live healing is out of scope. On a failed action the fixture captures an ARIA snapshot while the page is open and proposes
a replacement. The test keeps failing: nothing is retried, clicked or changed. `qa heal` maps the proposal to the one place the locator is
written (never inside `expect`) and writes `.qa-out/heal/proposals.json`, `heal-report.md` and `heal.patch`. Nothing is applied for you.

A candidate must be: the same role, unique in the snapshot, visible and enabled on the failing page, clearly better than the next one (no fixed
confidence is shown, only a similarity and the words that changed), and not a different action:

- names that mean something else are rejected even when they look alike: opposite verbs ("Archivar"/"Desarchivar", "Abrir"/"Cerrar"), negations,
  scope words ("Eliminar" vs "Eliminar para siempre", "todos"); rejected look-alikes are listed in the report;
- a candidate whose name another locator in the project already targets is marked `needs-review`: the diff stays in the report but not in `heal.patch`
  (a real project reuses one label for a button and its confirmation dialog, so this cannot be a rejection);
- assertions (`expect`), known defects, ambiguous locators and removed elements get no suggestion, with the reason.

`--verify` re-runs exactly one test (file, line, title) with the change applied, then restores the file: own output folder (the original failure
evidence stays), no retries, one worker, five-minute limit with a graceful stop so the test's teardown removes its data. A passing re-run only shows that
the locator found one element and the test passed once. It is **not proof that this is the right element**: every suggestion is marked `reviewRequired`
and a person confirms it.

Patches are tied to the revision they were made for. `proposals.json` records the git revision and a hash of each target file; `heal.patch` starts with
the revision. Before applying a downloaded patch run `npm run qa -- heal check` (needs `heal-proposals.json` and `heal.patch` in `.qa-out/heal/`): it
reports stale files and whether `git apply --check` passes, and exits 1 when the code has moved on.

Limits: only `getByRole/Text/Label/Placeholder/Title` with literal strings; no scoped, regex or CSS locators; a locator built dynamically is reported, not patched;
the opposite-action and scope lists are Spanish and English and not exhaustive. Optional tier 3 asks an LLM to pick from the page's own elements for failures
the rules cannot settle (element names are sent to the provider); its pick passes the same mechanical checks.

## Updating a project

Creating a repository from a template does not link it to the template. This is the minimal mechanism:

- `.qa-framework.json` records the framework version, the project's options and the hashes of the shared files it received.
- `npm run qa -- upgrade` fetches the template with `gh` (set `QA_TEMPLATE_REPO` for a fork; `--ref vX.Y.Z` for a version; `--from <dir>` for a local copy),
  replaces `framework/`, regenerates the workflows it generated (customized ones are kept, the new version goes to `.qa-out/upgrade/`),
  updates pinned dependencies, and prints the changelog. It stops if someone edited `framework/`.
- Changelog lines marked "Manual step" concern project-owned files and need a human (or `claude` with this repository's context).
- A project created before versioning: copy `framework/` from the template, `npm install yaml dotenv`, run `npm run qa -- adopt`, and follow what it prints.

Release rule for the template: bump `framework/VERSION`, add a changelog entry, and say when a project-owned file must change.
