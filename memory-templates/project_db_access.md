---
name: project-db-access
description: DB tables/columns/query patterns used by {{APP_NAME}}'s tests — only relevant if utils/db.js is in use
metadata:
  type: project
---

No DB-backed tests written yet — seeded empty at bootstrap. `utils/db.js`'s `createDbClient(envPrefix)` is
available; document each table/column touched here as tests start using it.

**Why:** avoids re-discovering the same schema details every session.

**How to apply:** one entry per table used — which TC(s) touch it, what it resets/sets, which env prefix
(`''`, `'QA_'`, ...).
