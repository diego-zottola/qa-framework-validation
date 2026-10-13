# Running the tests after a product deployment

The product repository{{PRODUCT_REPO}} can start this suite when it deploys. GitHub only allows that with a token, so this part is manual.

1. Create a fine-grained token (or a GitHub App) for this automation repository with **Actions: write** (needed for
   `repository_dispatch`) and **Contents: read**. Save it as the secret `QA_DISPATCH_TOKEN` in the PRODUCT repository.
2. Add a step at the end of the product deploy workflow:

```yaml
      - name: Run the QA suite
        env:
          GH_TOKEN: ${{ secrets.QA_DISPATCH_TOKEN }}
        run: |
          changed=$(git diff --name-only ${{ github.event.before }} ${{ github.sha }} | jq -R . | jq -sc .)
          gh api repos/<owner>/<this-automation-repo>/dispatches \
            --input - <<< "{\"event_type\":\"product-deployed\",\"client_payload\":{\"changed_paths\":$changed}}"
```

3. Fill `risk.map.json` here: which product paths affect which catalog **areas**. Paths the map does not cover, an
   empty change list or any doubt run the whole suite. Check what a change would run with:
   `QA_CHANGED_PATHS=src/pages/a.ts npm run qa -- select --suite tests/regression`.

The payload is data, never code: it is only matched against the globs in `risk.map.json`.
