## Selector healing (suggestion mode)

Suggestions only. Nothing in the repository was modified. A passing re-run means the new locator found one element and the test then passed once; it is not proof the test is right. Review every diff. Assertions and expected values are never changed.

### TC0012 - archiving a page asks for confirmation and moves it to the trash

- Status: **suggested** · re-run with the change: **passed**
- Diagnosis: selector (medium)
- Failing locator: `getByRole('button', { name: 'Archivar página', exact: true })`
- Candidate: button "Archivar" (similarity 0.75)
- Other candidates: button "Nueva página" 0.6; button "Agregar tabla" 0.4
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

- Status: **suggested** · re-run with the change: **failed**
- Diagnosis: selector (medium)
- Failing locator: `getByRole('button', { name: 'Archivar página', exact: true })`
- Candidate: button "Nueva página" (similarity 0.6)
- Other candidates: button "Cerrar sesión" 0.33; button "Ir a la papelera" 0.31
- Source: `pages/EditorPage.js:14`

```diff
--- a/pages/EditorPage.js
+++ b/pages/EditorPage.js
@@ -11,7 +11,7 @@
     this.breadcrumb = page.getByRole('navigation', { name: 'Ruta de la página' });
     this.shareButton = page.getByRole('button', { name: 'Compartir', exact: true });
     this.moveButton = page.getByRole('button', { name: 'Mover', exact: true });
-    this.archiveButton = page.getByRole('button', { name: 'Archivar página', exact: true });
+    this.archiveButton = page.getByRole('button', { name: 'Nueva página', exact: true });
     this.readOnlyBadge = page.getByText('Solo lectura');
     this.emptyNotice = page.getByText('Esta página está vacía.');
     this.archiveConfirm = page.getByRole('alertdialog', { name: '¿Archivar esta página?' });
```
