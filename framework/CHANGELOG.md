# Framework changelog

Versions follow semver. `npm run qa -- upgrade` shows the entries between your version and the new one.
"Manual step" lines are changes in project-owned files (config, fixtures, page objects) that upgrade never touches.

## 1.0.0

First versioned release of the shared core (everything under `framework/`).

- `init` scaffolds configuration, profiles, workflows and the first smoke suite; `doctor` checks their consistency.
- Test case catalog (`test-cases/*.yml` validated against `playwright --list`) and a static TCM page.
- API session, seed/cleanup fixtures, stale-data sweeper, endpoint discovery and coverage report.
- Failure diagnosis, selector healing in suggestion mode (optional LLM tier), reports on GitHub Pages with 15-day retention.
- Optional Slack/Jira notifications, visual comparison, risk-based selection and product deploy trigger, ticket drafts.

## 1.1.0

- `npm run qa -- env add NAME --secret|--variable`: register a setting the application needs (API key, backend URL). It is added
  to `.qa-framework.json`, `.env.example` and every generated workflow, and uploaded to GitHub when `gh` is available.
  Previously such settings reached `.env` but never CI.
- `npm run qa -- sync` regenerates the workflows from `.qa-framework.json`; `npm run qa -- secrets` also uploads variables.
- Diagnosis and healing reports are published as HTML pages and linked from the portal.
- No manual step: projects on 1.0.0 only need `npm run qa -- upgrade`.

## 1.1.1

- Flaky tests in the diagnosis show the first error of the failed attempts.
- No manual step.

## 1.1.2

- Healer: names are matched by shared words, containment or a close edit distance (0.7+). A long shared word no longer makes unrelated
  buttons look alike (found on a real project: a wrong suggestion, caught only by the verification re-run).
- No manual step.

## 1.1.3

- Healer: tests failing on the same locator share one verification and one hunk in `heal.patch`; the patch now applies with `git apply`
  (also for the first/last line and files without a final newline) and is published next to the healing report.
- No manual step.
