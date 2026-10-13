# AI-Driven Automation Framework

A GitHub **template repository** for end-to-end test automation (Playwright + Claude Code). Give it the URL of an
application: `init` configures everything deterministically, then Claude Code explores the app and writes the first
tests. It works without any LLM API; an LLM is an optional extra.

## Quick start

1. **Use this template** (green button) and create your repository, then clone it.
2. `npm install && npm run init`
3. Answer the questions. At the end `init` prints what was configured and **what is still pending for you**.

Requirements: Node.js 20+, [Claude Code](https://docs.claude.com/claude-code) logged in, [GitHub CLI](https://cli.github.com/)
(`gh`) logged in for secrets, variables and Pages.

## What `init` asks and does

1. **URL**, then a first look: Vercel Deployment Protection (asks for the bypass secret) and the login type.
2. **Credentials** of a QA-dedicated account, validated by a real login; more roles (viewer, admin...) if you want permission tests.
   Saved in `.env` (git-ignored) and, if you accept, as GitHub secrets. Never through chat.
3. **Options**: API suite, visual comparison, Slack, Jira (issues are only reported unless you turn on auto-create), an optional LLM
   (provider, model, key; saved in `.env`, offered as a secret), push/PR triggers, a product repository that can start the tests after its deploys.
4. **Scaffold** (no AI involved): config, profiles, fixtures, `.env.example`, workflows, the generic login smoke suite, `.qa-framework.json`.
5. **GitHub**: secrets and variables for what you enabled, GitHub Pages with "GitHub Actions" as the source. If a permission or plan
   prevents something, it says exactly what is left to do.
6. **Claude Code** explores the app and writes docs, page objects, tests, test case definitions and API tests, runs them, and commits locally.
7. Optional push, which activates the CI.

## What you get

- Page Object Model, fixtures, multi-role login, Allure + Playwright reports, retries, traces on failure.
- **Test case catalog** (`test-cases/*.yml` checked against the real test list) and a static **TCM** page; Allure links to cases and back.
- **API** discovery and coverage report, tests in `tests/api`, a `seed` fixture that cleans up even on failure, a sweeper for interrupted runs.
- **Reports on GitHub Pages**: Allure per run and suite, diagnosis, healing suggestions, kept 15 days; traces and videos are never published.
- **Failure diagnosis** (product, selector, data, auth, infra, flaky) from Playwright's own results, with uncertainty.
- **Healer in suggestion mode**: proposes selector fixes with evidence and a re-run; never edits assertions or your code.
- Optional Slack/Jira (no duplicate tickets), visual comparison, risk-based selection, ticket-based drafts with a gate.
- `npm run doctor`, and `npm run qa -- upgrade` to receive template improvements later.

Everything is documented in [framework/README.md](framework/README.md): commands, triggers, what is public, limits, how projects get updates.

## Rules of the framework

- Credentials live only in `.env` and repository secrets. Reports never contain them.
- The framework does not restrict where tests run, including production; that decision belongs to the company.
- The healer may only propose selector changes, never assertion changes. Live healing is not part of this version.
- Claude runs onboarding without approvals in the middle and finishes with a summary. Full rules: [docs/business-rules.md](docs/business-rules.md).

## Developing the template

`npm run lint`, `npm run typecheck`, `npm run test:framework` (Template CI runs the same). The end-to-end test creates a project from this
tree, runs `init` non-interactively against a local fixture app and checks the generated suite, report and links.
Release: bump `framework/VERSION`, add a `framework/CHANGELOG.md` entry, say which project-owned files need manual changes.
