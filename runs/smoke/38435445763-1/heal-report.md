## Selector healing (suggestion mode)

Suggestions only. Nothing in the repository was modified. A passing re-run means the new locator found one element and the test then passed once; it is not proof that this is the same element or the same action as before. A person must confirm that every candidate is the intended element before applying a diff. Assertions and expected values are never changed. A patch fits only the revision it was generated for: run `npm run qa -- heal check` before applying it.

### TC0005 - the owner lands on the default workspace with the full sidebar

- Status: **unsupported**
- Diagnosis: selector (medium)
- Original failure (kept): TimeoutError: locator.waitFor: Timeout 10000ms exceeded.
- Failing locator: `getByRole('button', { name: 'Cambiar de espacio de trabajo actual' }) to be visible`
- Why: locator uses options the healer does not read (regex names, extra filters)

### TC0006 - creating a page from the sidebar opens an untitled page in the editor

- Status: **unsupported**
- Diagnosis: selector (medium)
- Original failure (kept): TimeoutError: locator.waitFor: Timeout 10000ms exceeded.
- Failing locator: `getByRole('button', { name: 'Cambiar de espacio de trabajo actual' }) to be visible`
- Why: locator uses options the healer does not read (regex names, extra filters)

### TC0008 - a page opens from the sidebar tree

- Status: **unsupported**
- Diagnosis: selector (medium)
- Original failure (kept): TimeoutError: locator.waitFor: Timeout 10000ms exceeded.
- Failing locator: `getByRole('button', { name: 'Cambiar de espacio de trabajo actual' }) to be visible`
- Why: locator uses options the healer does not read (regex names, extra filters)

### TC0009 - search finds a page by its title

- Status: **unsupported**
- Diagnosis: selector (medium)
- Original failure (kept): TimeoutError: locator.waitFor: Timeout 10000ms exceeded.
- Failing locator: `getByRole('button', { name: 'Cambiar de espacio de trabajo actual' }) to be visible`
- Why: locator uses options the healer does not read (regex names, extra filters)
