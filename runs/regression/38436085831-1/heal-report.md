## Selector healing (suggestion mode)

Suggestions only. Nothing in the repository was modified. A passing re-run means the new locator found one element and the test then passed once; it is not proof that this is the same element or the same action as before. A person must confirm that every candidate is the intended element before applying a diff. Assertions and expected values are never changed. A patch fits only the revision it was generated for: run `npm run qa -- heal check` before applying it.

### TC0035 - the workspace switcher lists the account workspaces and the create option

- Status: **suggested** (not a confirmed fix: review required) · re-run with the change: **passed**
- Diagnosis: selector (medium)
- Original failure (kept): TimeoutError: locator.waitFor: Timeout 10000ms exceeded.
- Name change: removed [actual] · added []: confirm it is the same action
- Re-run detail: passed once with the new locator
- Failing locator: `getByRole('button', { name: 'Cambiar de espacio de trabajo actual' })`
- Candidate: button "Cambiar de espacio de trabajo" (similarity 0.81)
- Source: `pages/WorkspacePage.js:7`

```diff
--- a/pages/WorkspacePage.js
+++ b/pages/WorkspacePage.js
@@ -4,7 +4,7 @@
 export class WorkspacePage extends BasePage {
   constructor(page) {
     super(page);
-    this.switcher = page.getByRole('button', { name: 'Cambiar de espacio de trabajo actual' });
+    this.switcher = page.getByRole('button', { name: 'Cambiar de espacio de trabajo', exact: true });
     this.searchButton = page.getByRole('button', { name: /^Buscar/ });
     this.newPageButton = page.getByRole('button', { name: 'Nueva página' });
     this.pageTree = page.getByRole('navigation', { name: 'Páginas' });
```
