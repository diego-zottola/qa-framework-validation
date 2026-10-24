## Failure diagnosis

flaky: 1

Categories are evidence-based guesses, not verdicts: "unknown" and low confidence mean a person must look.

| Test | Category | Confidence | Why |
|---|---|---|---|
| TC0015 - an archived page can be deleted permanently from the trash | flaky | high | passed on attempt 2; the failed attempts looked like unknown (first error: Error: expect(received).toEqual(expected) // deep equality) |
