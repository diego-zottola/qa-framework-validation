---
name: reference-coverage-map
description: Feature-by-feature test coverage map for {{APP_NAME}} — what's covered, what isn't
metadata:
  type: reference
---

No coverage recorded yet — seeded empty at bootstrap. Populate per feature area as tests are written:

- [ ] {{Feature area 1}} — ❌ not covered
- [ ] {{Feature area 2}} — ❌ not covered

**Why:** `/automate-ticket` checks this file FIRST before writing any test, to avoid duplicating coverage.

**How to apply:** flip ❌ to ✅ (with the TC range) the moment a behavior gets covered — never let this file
drift behind the actual test suite.
