# API endpoints

Generated 2026-10-13 by `npm run qa -- api-coverage`. Do not edit by hand.

**Observed:** 6 · **covered by API tests:** 2 · **used only for seeding:** 0 · **documented but never observed:** 0

| Method | Path | Statuses | Seen | Documented | Covered |
|---|---|---|---|---|---|
| GET | `/rest/v1/groups` | 200 | 1 | no | no |
| GET | `/rest/v1/pages` | 200 | 4 | no | yes |
| GET | `/rest/v1/pending_invitations` | 200 | 1 | no | no |
| POST | `/rest/v1/rpc/claim_domain_workspaces` | 200 | 5 | no | no |
| POST | `/rest/v1/rpc/get_page_permissions` | 200 | 4 | no | no |
| GET | `/rest/v1/workspace_members` | 200 | 9 | no | yes |

## Limits

- Observed endpoints come from navigating the UI as the QA account and from the flows in `api/discover.flows.js`; flows nobody walked are not listed.
- Documented endpoints come from an OpenAPI/Swagger document when the application exposes one.
- Only method and path template are stored. No headers, query values or bodies are recorded.
- "Covered" means an API test (project `api`) called the endpoint; it does not say the response was asserted well.
