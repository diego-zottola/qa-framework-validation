# App map: Notion Knockoff (Workspace)

UI language: Spanish. Single-page app (React) on Vercel with a Supabase backend. Walked as the QA `default` (owner) and `guest` accounts.

## Routes

| Route | Screen | Notes |
|---|---|---|
| `/` | Login ("Bienvenido") | Fields `Usuario`, `Contraseña`, button `Ingresar`, `Continuar con Google`. Redirects to the default workspace when a session exists |
| `/w/<workspace-id>` | Workspace home | Empty state "Todavía no hay páginas" with `Nueva página`; guests see "Recientes" |
| `/w/<workspace-id>/p/<page-id>` | Page editor | Breadcrumb, Compartir, Mover, Archivar, title, rich text body, blocks |
| `/w/<workspace-id>/trash` | Papelera | Owner only; Restaurar / Eliminar definitivamente |
| `/w/<workspace-id>/settings/members` | Miembros | Add member form, role selectors, remove; guest sees an explanation |
| `/w/<workspace-id>/settings/groups` | Grupos | Create, rename, delete groups; add/remove members; guest has no access |
| `/settings` | Preferencias | Theme, compact view, rich editor, version |
| `/profile` | Perfil | Display name, username, workspaces with roles |

## Sidebar (all workspace screens)

- `Cambiar de espacio de trabajo` menu (workspaces + `Crear espacio de trabajo`), `Buscar ⌘K` (dialog `Buscar`, searchbox `Buscar páginas`),
  `Nueva página`, tree `Páginas` (per row: link, `Agregar subpágina en <title>`, `Acciones de <title>` with Subir, Bajar, Mover a…, Archivar).
- Footer links: Papelera (owner), Miembros, Grupos (non-guest), Preferencias, Perfil, `Cerrar sesión`.

## Editor controls

`Compartir` (dialog with email + permission, group + permission, access list), `Mover` (dialog "Mover página", listbox `Destinos`),
`Archivar` (alertdialog "¿Archivar esta página?"), textbox `Título de la página`, status `Estado de guardado`, body textbox (ProseMirror),
`Agregar bloque`, `Agregar tabla`, `Agregar imagen`, `Adjuntar archivo`, `Comentar en este bloque`. Read-only pages show `Solo lectura`
and who else is on the page.

## Gotchas

- Two nested `main` elements exist: scope with `getByRole('main').first()` or the sidebar/article roles.
- The sidebar shows every page of the workspace: tests running in parallel see each other's pages, so locate by unique name.
- Row action buttons are hidden until hover on desktop but remain reachable by role.
