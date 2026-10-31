# Palm — ASL learning and camera practice

Full-stack browser application with Learn, Practice, Explore, Partner and Progress flows, a Node 24 HTTP API, SQLite persistence, anonymous protected sessions, local hand tracking, progress export/deletion, responsive styling, and deployment/QA tooling.

**Release status:** engineering release candidate, not certified launch-ready. The included ASL curriculum is draft and the geometric pose model is not independently validated. Instructor demonstrations, human/device UAT, recognition evaluation, deployment smoke tests and a security/restore review must be completed. `npm run release:check` refuses an incomplete signoff. A working build or green unit suite cannot establish ASL teaching accuracy.

## Start

```
npm ci
npm run assets:prepare
npm run dev:api
# another terminal
npm run dev
```

For a single production-style local process, use `npm run build && npm start`, then http://localhost:3000. Camera access needs localhost or HTTPS. The build copies installed MediaPipe WASM and downloads a versioned model only after SHA-256 verification; inference uses same-origin assets and camera frames remain in-browser. The API stores only anonymous session metadata and practiced sign IDs. Progress is also cached locally for outage recovery. There is no account login or cross-device identity in this architecture.

## Quality and release

```
npm run check
npx playwright install --with-deps chromium
npm run test:e2e
npm audit --audit-level=high
npm run release:check
```

The patch includes real API/security isolation tests, recognition timing regressions, browser learner-flow tests, automated accessibility scans, and GitHub Actions. Human UAT and camera/recognition quality require the protocols in docs/UAT.md. See docs/QA-RESULTS.md for checks actually executed while preparing this patch. Do not mark pending tests passed.

- [API](docs/API.md): routes, sessions, schemas and errors.
- [Security](docs/SECURITY.md): controls, threat boundaries and reviews.
- [Deployment](docs/DEPLOYMENT.md): TLS, durable storage, backup/restore and rollback.
- [UAT](docs/UAT.md): device, accessibility, teaching and acceptance scenarios.
- [Release signoff](docs/release-signoff.json): human evidence references.

Catalog content lives in content/catalog.json. Put licensed demonstration videos and captions under public/lessons. Approved lessons render their video in Practice; drafts visibly state that review is pending. The existing classifier's SUPPORTED_SIGNS is the pose registry. It uses handcrafted geometry with ambiguity rejection and temporal hold/cooldown; it cannot translate arbitrary ASL sentences or assess full movement/facial grammar. Pair practice with fluent ASL instruction.

No changes are deployed by applying this patch. See the deployment guide and satisfy the release gate before public launch.
