# Applying the expanded patch

This patch replaces the earlier learner UI patch. Apply it to a clean checkout of the baseline commit, not on top of the old patch.

```
git switch -c feature/palm-fullstack
git apply --check ASL_Recognition-fullstack-launch.patch
git apply ASL_Recognition-fullstack-launch.patch
npm ci
npm run check
npx playwright install --with-deps chromium
npm run test:e2e
npm audit --audit-level=high
```

Then review and commit the source changes, open a pull request, and configure GitHub branch protection to require Quality gates. The Release readiness workflow enforces the documented human/content gates when triggered. No credentials, binaries, dependencies or database contents are embedded in the patch. Build-time asset preparation copies WASM and verifies a versioned model download against models.lock.json. The patch adds source code and deployment configuration; applying it does not deploy the app or make pending UAT pass.
