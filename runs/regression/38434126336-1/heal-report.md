## Selector healing (suggestion mode)

Suggestions only. Nothing in the repository was modified. A passing re-run means the new locator found one element and the test then passed once; it is not proof that this is the same element or the same action as before. A person must confirm that every candidate is the intended element before applying a diff. Assertions and expected values are never changed. A patch fits only the revision it was generated for: run `npm run qa -- heal check` before applying it.

### TC0012 - archiving a page asks for confirmation and moves it to the trash

- Status: **rejected**
- Diagnosis: selector (medium)
- Original failure (kept): TimeoutError: locator.click: Timeout 10000ms exceeded.
- Failing locator: `getByRole('button', { name: 'Archivar página', exact: true })`
- Why: the candidate name "Archivar" is already used by other locators (pages/EditorPage.js:66, pages/WorkspacePage.js:50): it is probably a different element, not the renamed one
- Candidate: button "Archivar" (similarity 0.75)

### TC0013 - cancelling the archive confirmation keeps the page

- Status: **rejected**
- Diagnosis: selector (medium)
- Original failure (kept): TimeoutError: locator.click: Timeout 10000ms exceeded.
- Failing locator: `getByRole('button', { name: 'Archivar página', exact: true })`
- Why: the candidate name "Archivar" is already used by other locators (pages/EditorPage.js:66, pages/WorkspacePage.js:50): it is probably a different element, not the renamed one
- Candidate: button "Archivar" (similarity 0.75)
