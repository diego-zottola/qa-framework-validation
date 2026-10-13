# Business rules: guided onboarding flow

This repository is the parent of every QA project in the company. These rules fix what the framework promises.

## Flow

1. Create the project with "Use this template", clone it, `npm install`.
2. `npm run init` asks the questions, validates the logins, scaffolds the project and configures GitHub (secrets, variables, Pages) as far as permissions allow.
3. Claude Code explores the application and writes docs, page objects, tests, case definitions and API tests, runs them and commits locally.
4. `init` ends with a summary that lists what is pending for the user. Nothing is promised that GitHub or the application cannot allow.

## Rules

- **No prior context:** the framework starts knowing only the URL and the credentials. Application knowledge lives in the generated project
  (`docs/app-map.md`, `docs/business-rules.md`, `docs/technical-context.md`), never in this template, and never includes secrets or real customer data.
- **Shared, evolving context:** those docs are versioned so anyone can use the project with Claude Code; Claude reads them before acting and appends findings after each run.
- **Credentials:** provided by the user, validated by logging in, stored only in `.env` (git-ignored) and GitHub secrets/variables. QA-dedicated accounts only.
- **Roles:** the user names extra roles; a role's permissions are checked in the application, never assumed from its name.
- **Environment:** the framework does not restrict where tests run, including production.
- **Without an LLM API everything works.** Claude Code during onboarding is not an API key for CI runs. An optional LLM provider (own key) only powers tier 3 of the healer.
- **Healer:** suggestion mode only. It may propose selector changes (locator text for an action that could not find its element); it never retries, clicks,
  changes assertions, expected values or business rules, and never edits the repository. A suggestion is not a confirmed repair.
- **Diagnosis:** categories are evidence-based guesses and may say "unknown".
- **Publishing:** Pages receives sanitized Allure reports, diagnosis and the test case catalog for 15 days. Traces, videos, page snapshots and credentials are never published. If the repository is
  public, workflow artifacts are readable by any GitHub user, so traces and full reports are only uploaded for private repositories (configurable).
- **Workflows with secrets never run on pull requests.** Pull requests get a structure check without secrets.
- **Test data:** names carry the `qa-auto-` prefix; tests create data through helpers that clean up even on failure; a sweeper removes only the QA account's own prefixed data older than 2 hours.
- **Catalog:** every test has a stable `TC####` ID and a definition with real steps and expected results; definitions are validated against what Playwright lists.
- **Ticket drafts** are drafts: the gate can say "not ready", never "validated".
- **Jira and Slack** are optional. Jira issues are created only if the user enabled auto-create; one open issue per case, never duplicates.
- **Updates:** `npm run qa -- upgrade` brings shared code and generated workflows to a newer template version and never overwrites project-owned files.
