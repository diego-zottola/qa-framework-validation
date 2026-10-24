## Failure diagnosis

selector: 2 · flaky: 1

Categories are evidence-based guesses, not verdicts: "unknown" and low confidence mean a person must look.

| Test | Category | Confidence | Why |
|---|---|---|---|
| TC0012 - archiving a page asks for confirmation and moves it to the trash | selector | medium | the element for click never appeared (could also be: product) |
| TC0013 - cancelling the archive confirmation keeps the page | selector | medium | the element for click never appeared (could also be: product) |
| TC0015 - an archived page can be deleted permanently from the trash | flaky | high | passed on attempt 2; the failed attempts looked like unknown (first error: Error: expect(received).toEqual(expected) // deep equality) |
