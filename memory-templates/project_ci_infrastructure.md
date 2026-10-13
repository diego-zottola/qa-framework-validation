---
name: project-ci-infrastructure
description: CI setup for {{APP_NAME}} — workflows, schedule, secrets, Slack — only relevant if CI was scaffolded
metadata:
  type: project
---

- `smoke.yml` — {{SMOKE_SCHEDULE_LOCAL_TIME_AND_TZ}} (`{{SMOKE_CRON_UTC}}`) + manual dispatch with `test_grep`
- `regression.yml` — manual dispatch only, `test_grep` supported
- Secrets required: `BASE_URL`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`{{, SLACK_WEBHOOK_URL if Slack requested}}
- Slack: {{channel/webhook description, or "not configured"}}

**Why:** keeps the CI setup discoverable without re-reading the workflow YAML every session.

**How to apply:** update if the schedule changes, secrets are added/rotated, or a new workflow is introduced.
