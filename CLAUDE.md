# AI-Driven Automation Framework (template)

This repository is the template itself, not an application under test. Projects are created from it with "Use this
template", then `npm run init` scaffolds and configures them. The generated project's own CLAUDE.md replaces this file.

## Layout

- `framework/`: the shared core (CLI, libraries, fixtures, TCM page, workflow and file templates, tests). Documented in `framework/README.md`.
- `scripts/init.mjs`: the guided onboarding. Deterministic scaffold first (`framework/lib/scaffold.js`), then `claude -p`.
- `.claude/skills/ai-driven-automation-framework/SKILL.md`: what Claude does after the scaffold (explore, write tests).
- `.claude/commands/`: portable commands copied into projects. `docs/business-rules.md`: the rules of the flow.

## Working on the template

- `npm run lint && npm run typecheck && npm run test:framework` must pass. `framework/test/init.e2e.test.js` builds a project from this tree and runs it.
- Every improvement belongs in the template and its `init`, not only in one project. A new capability needs: code in `framework/lib`, a test, scaffold/workflow wiring,
  `doctor` awareness if it adds secrets or scripts, docs in `framework/README.md`, a `framework/CHANGELOG.md` entry and a `framework/VERSION` bump.
- Do not add files that nothing calls. Healer stays in suggestion mode; assertions are never changed by tooling.
- Never print or commit credentials. Code, comments, commit messages and project files are in English.
