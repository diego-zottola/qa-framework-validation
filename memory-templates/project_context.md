---
name: project-context
description: Current state of the {{APP_NAME}} test automation project — test count, last TC, structure
metadata:
  type: project
---

**Test count:** {{N}} tests total. Last TC: **TC000{{N}}**.

**Folder structure:** standard AI-Driven Automation Framework layout — `pages/`, `fixtures/`, `auth/`, `utils/`,
`tests/smoke-tests/`, `tests/regression/`.

**Phase status:** bootstrap complete — first smoke test (login + navigation) passing. Per-screen Page Objects
are backlog (see the project's `CLAUDE.md` for the list).

**Why:** gives any new session an instant snapshot without re-reading the whole test suite.

**How to apply:** update after every session that changes test count, adds a Page Object, or completes a
backlog item — via `/save-session-context`.
