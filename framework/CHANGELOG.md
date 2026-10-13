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
