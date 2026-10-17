## Selector healing (suggestion mode)

Suggestions only. Nothing in the repository was modified. A passing re-run means the new locator found one element and the test then passed once; it is not proof the test is right. Review every diff. Assertions and expected values are never changed.

### TC0005 - the owner lands on the default workspace with the full sidebar

- Status: **not-applicable**
- Diagnosis: unknown (low)
- Failing locator: `getByRole('button', { name: 'Crear página nueva' }).first()`
- Why: an assertion failed: assertions are never healed

### TC0006 - creating a page from the sidebar opens an untitled page in the editor

- Status: **ambiguous**
- Diagnosis: selector (medium)
- Failing locator: `getByRole('button', { name: 'Crear página nueva' }).first()`
- Why: 2 elements share the name "Nueva página"
- Other candidates: button "Nueva página" 0.67
