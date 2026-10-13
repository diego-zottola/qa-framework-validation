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

---

# Application rules: Notion Knockoff (Workspace)

Observed in the application as the QA accounts (default = workspace owner, guest = "QA Viewer"), not assumed from role names. Append new
findings after each run.

## Workspaces and roles

- Signing in lands on the account's default workspace, named `Espacio de <username>`, at `/w/<workspace-id>`. A user can belong to several workspaces
  (switcher in the sidebar header; profile lists them with their role).
- Workspace roles (stored upper-case): `OWNER` ("Propietario"), `ADMIN` ("Administrador"), `MEMBER` ("Miembro"), `GUEST` ("Invitado").
- **Owner/admin/member** see the full sidebar: search, new page, page tree, Papelera, Miembros, Grupos, Preferencias, Perfil.
- **Guest** only sees pages shared with them. The sidebar has no "Nueva página", no Papelera and no Grupos. Pages shared with a guest open as
  "Solo lectura" when the permission is "Puede ver".
- Only the **owner** can see the trash (guests get "Solo el propietario del espacio puede ver la papelera") and delete pages permanently.
- Archiving a page requires owner, admin or member.
- The members page lets the owner add members by email with a role and change or remove roles. A guest sees an explanation instead of the directory
  and can only leave the workspace. Groups are managed by non-guests; a guest gets "Como invitado no tenés acceso al directorio de grupos."

## Pages

- A new page is created untitled ("Sin título") and opened in the editor. It saves automatically ("Estado de guardado": Guardado).
- Pages nest: "Agregar subpágina" creates a child; the tree collapses/expands. Pages can be moved ("Mover", "Mover a…") and reordered (Subir/Bajar).
- Title and body persist across reloads.
- **Archive** is a soft delete with a confirmation ("¿Archivar esta página?"); it also archives all subpages. Archived pages leave the sidebar and
  search and appear in the Papelera, where the owner can restore them or delete them permanently (confirmation "¿Eliminar definitivamente?", also
  deletes subpages, irreversible).
- Search (⌘K dialog "Buscar") looks at titles and body text; no match shows "Sin resultados". Archived pages are not returned.

## Sharing

- A page can be shared by email or with a group, with a permission: "Puede ver" (VIEWER), "Puede editar", "Acceso total" (FULL_ACCESS).
  Access is inherited by subpages and the highest permission wins. A non-member who is shared a page becomes a workspace guest.
- Shared people are listed in the dialog with a per-person permission selector and a "Quitar acceso" button.

## Preferences and profile

- Preferences (`/settings`): theme (Claro/Oscuro/Sistema), compact view, rich editor (device-local), app version.
- Profile (`/profile`): editable display name (save disabled until changed), read-only username, list of workspaces with role.

## Backend facts that shape the tests

- The backend is Supabase (PostgREST at `API_BASE_URL`), authenticated with the session JWT plus the public anon key.
- Row level security: an unshared page is invisible (empty result, not an error) to a guest. Anonymous requests are rejected (401).
- Pages cannot be deleted or archived with a direct table UPDATE/DELETE (403): the app uses the RPCs `archive_page` and
  `delete_page_permanently`. A title edit is a PATCH on `pages`.

## Open questions

- Whether admin and member differ visibly from the owner was not checked: no QA account has those roles.
- Comments ("Comentar en este bloque"), tables, image and file attachments, and the `/` command menu were seen but not covered.
