# Technical context

## Login and sessions

- Login form: `Usuario` / `Contraseña` / `Ingresar`; the generic login in `framework/lib/login.js` works. Profiles `default` (owner) and `guest`
  ("QA Viewer", guest of the default account's workspace) are in `auth/environment-profile.js`. Google login is not automated.
- The session is a Supabase auth entry in localStorage (`sb-<ref>-auth-token`); storage states are saved by global setup in `auth/`.
- Credentials and URL live in `.env` only. Extra `.env` keys added by exploration: `API_BASE_URL` (Supabase project URL) and `SUPABASE_ANON_KEY`
  (the public anon key, needed as `apikey` header). CI needs both as secrets/variables (`doctor` reports missing ones): pending for the user.

## Data and cleanup

- Tests create pages through the API (`seed.create('page')`, `api/api.config.js`) named `qa-auto-<time>-<random>`; pages created through the UI
  are registered with `seed.items.push` right after creation. Cleanup = RPC `archive_page` then `delete_page_permanently` (owner), which also
  removes subpages. Direct table DELETE/UPDATE of archive fields is not granted (403).
- The sweeper lists pages in the QA account's default workspace (`Espacio de <username>`), prefix only.
- The account also owns other workspaces (`Azumo`, `QA exploratorio ...`): tests never touch them.
- Sharing with the guest uses RPC `share_page` (`p_permission`: `VIEWER`); the share disappears with the page.

## API

- PostgREST at `API_BASE_URL`, `Authorization: Bearer <access_token>` from the storage state, `apikey` header. Roles are upper-case enums.
- RLS hides rows (200 with `[]`) instead of failing; missing privileges fail with 403 (authenticated) or 401 (anonymous).
- Tokens expire (about an hour); global setup renews them every run.

## Pitfalls

- Fresh-load spinners: wait for a visible control rather than `networkidle`. The title autosaves a moment after typing; wait for
  `Estado de guardado` to read `Guardado`.
- Keep roles apart: the guest cannot be used to create data. Add a QA account with the member/admin role to cover those roles.
