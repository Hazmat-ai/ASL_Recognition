# Verification record for this patch

Prepared against Hazmat-ai/ASL_Recognition main commit 92edc8facdcdbd458d233625f815a53e4ade81a7. This record covers the implementation patch, not a live deployment.

| Check | Observed result |
|---|---|
| API/security/backup integration suite | 9 passing tests: browser isolation, validation/size limits, CSRF/origin/content type, rate limits, filesystem boundaries/range serving, production configuration/cookie attributes, authenticated proxy IP isolation, session-creation quota, readable online backup |
| Recognition/camera/progress regression suite | 9 passing tests: stable hold/cooldown, label/hold mismatch rejection, no-hand abstention/reset, late permission-stream cancellation, offline reset recovery, in-flight save/reset ordering, deletion during initialization, unavailable browser storage, concurrent session initialization |
| TypeScript + production Vite build | Passed with Node 24.22.1 and Vite 8.3.5; local WASM and SHA-256 verified model included |
| npm dependency audit | 0 reported vulnerabilities after updates; original high-severity Vite and source-map-js findings resolved |
| Playwright test discovery | 3 browser tests discovered: learner/partner flow, axe scan, settings focus recovery |
| Browser assertions/accessibility scan | BLOCKED: Chromium download returned a corrupt archive; subsequent run failed to find browser executable before assertions. No browser or accessibility pass claimed |
| Release gate | BLOCKED as intended: draft ASL content, missing reviewed videos/captions, and missing human acceptance/security/deployment/restore/model-evaluation evidence |
| Human UAT / physical camera / ASL correctness | Pending; execute docs/UAT.md with appropriate testers and fluent ASL reviewers |
| Docker/TLS deployment/load/penetration tests | Pending; configuration supplied, not executed or certified here |

The online backup test proves the backup can be read with its expected sample row. It does not replace a staging deployment restore drill. The API tests exercise security controls but do not constitute an independent security audit. Dependency audit findings depend on the registry's available advisories.

Run the included CI workflow after applying. Resolve browser results and all release blockers before public launch. Do not set human signoffs to approved without actual evidence.

## Additional code review corrections

- Replaced the hook’s ad hoc synchronization with a serialized progress store. Reset tombstones survive reconnect/reload, in-flight saves cannot clear a newer reset, and deletion invalidates pending initialization.
- Coalesced concurrent session initialization requests to avoid cookie/CSRF races during React Strict Mode initialization.
- Removed module-global recognition state. New lessons and camera pauses reset hold state; UI confidence settings now feed a classifier that does not impose a second hidden threshold.
- Authenticated the proxy’s overwritten client-IP header with a server-only random token, avoiding a shared bucket for every visitor behind Caddy. Unauthenticated spoofed headers remain ignored.
- Added speech timer cleanup, bounded the recognition history, stopped camera processing outside Practice and when the page is hidden, and surfaced inference failures instead of repeating failed detection forever.
- Excluded all local .env variants from the Docker build context.
- Removed live announcements for frame-by-frame status chips; accepted results and actionable errors retain announcements.

These fixes do not change the pending browser, device UAT, content review or deployment signoffs above.
