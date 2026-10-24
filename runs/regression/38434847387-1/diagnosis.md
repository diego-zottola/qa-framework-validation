## Failure diagnosis

selector: 2 · unknown: 1

Categories are evidence-based guesses, not verdicts: "unknown" and low confidence mean a person must look.

| Test | Category | Confidence | Why |
|---|---|---|---|
| TC0012 - archiving a page asks for confirmation and moves it to the trash | selector | medium | the element for click never appeared (could also be: product) |
| TC0013 - cancelling the archive confirmation keeps the page | selector | medium | the element for click never appeared (could also be: product) |
| TC0031 - the profile shows the name, the username and the workspaces with their role | unknown | low | an element was expected but not found: broken selector or removed behavior (could also be: selector, product) |
