## Selector healing (suggestion mode)

Suggestions only. Nothing in the repository was modified. A passing re-run means the new locator found one element and the test then passed once; it is not proof that this is the same element or the same action as before. A person must confirm that every candidate is the intended element before applying a diff. Assertions and expected values are never changed. A patch fits only the revision it was generated for: run `npm run qa -- heal check` before applying it.

### TC0012 - archiving a page asks for confirmation and moves it to the trash

- Status: **needs-review** (not a confirmed fix: review required)
- Diagnosis: selector (medium)
- Original failure (kept): TimeoutError: locator.click: Timeout 10000ms exceeded.
- Name change: removed [pagina] · added []: confirm it is the same action
- Failing locator: `getByRole('button', { name: 'Archivar página', exact: true })`
- Why: the candidate name "Archivar" is already used by other locators (pages/EditorPage.js:66, pages/WorkspacePage.js:50): it may be a different element than the renamed one. Not included in heal.patch
- Candidate: button "Archivar" (similarity 0.75)
- Source: `pages/EditorPage.js:14`

```diff
--- a/pages/EditorPage.js
+++ b/pages/EditorPage.js
@@ -11,7 +11,7 @@
     this.breadcrumb = page.getByRole('navigation', { name: 'Ruta de la página' });
     this.shareButton = page.getByRole('button', { name: 'Compartir', exact: true });
     this.moveButton = page.getByRole('button', { name: 'Mover', exact: true });
-    this.archiveButton = page.getByRole('button', { name: 'Archivar página', exact: true });
+    this.archiveButton = page.getByRole('button', { name: 'Archivar', exact: true });
     this.readOnlyBadge = page.getByText('Solo lectura');
     this.emptyNotice = page.getByText('Esta página está vacía.');
     this.archiveConfirm = page.getByRole('alertdialog', { name: '¿Archivar esta página?' });
```

### TC0013 - cancelling the archive confirmation keeps the page

- Status: **needs-review** (not a confirmed fix: review required)
- Diagnosis: selector (medium)
- Original failure (kept): TimeoutError: locator.click: Timeout 10000ms exceeded.
- Name change: removed [pagina] · added []: confirm it is the same action
- Failing locator: `getByRole('button', { name: 'Archivar página', exact: true })`
- Why: the candidate name "Archivar" is already used by other locators (pages/EditorPage.js:66, pages/WorkspacePage.js:50): it may be a different element than the renamed one. Not included in heal.patch
- Candidate: button "Archivar" (similarity 0.75)
- Source: `pages/EditorPage.js:14`

```diff
--- a/pages/EditorPage.js
+++ b/pages/EditorPage.js
@@ -11,7 +11,7 @@
     this.breadcrumb = page.getByRole('navigation', { name: 'Ruta de la página' });
     this.shareButton = page.getByRole('button', { name: 'Compartir', exact: true });
     this.moveButton = page.getByRole('button', { name: 'Mover', exact: true });
-    this.archiveButton = page.getByRole('button', { name: 'Archivar página', exact: true });
+    this.archiveButton = page.getByRole('button', { name: 'Archivar', exact: true });
     this.readOnlyBadge = page.getByText('Solo lectura');
     this.emptyNotice = page.getByText('Esta página está vacía.');
     this.archiveConfirm = page.getByRole('alertdialog', { name: '¿Archivar esta página?' });
```

### TC0031 - the profile shows the name, the username and the workspaces with their role

- Status: **not-applicable**
- Diagnosis: unknown (low)
- Original failure (kept): Error: expect(locator).toBeDisabled() failed
- Failing locator: `getByRole('button', { name: 'Guardar nombre de usuario' })`
- Why: an assertion failed: assertions are never healed
