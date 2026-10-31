# Security model and review

The app uses anonymous browser sessions, not user accounts. A 256-bit random opaque bearer cookie identifies one browser for 30 days. Only its SHA-256 hash is stored. There are no passwords, administrator endpoints, payments or camera upload endpoints. Losing the cookie loses access to that browser's server progress; there is no cross-device account recovery.

| Threat | Implemented control | Review boundary |
|---|---|---|
| Access to another visitor's progress | Every SQL operation scopes by server-resolved session ID; parameterized statements; raw IDs never accepted from JSON | Test isolation; cookie theft still grants bearer access |
| Cross-site changes | Strict SameSite HttpOnly cookie; Secure + __Host prefix in production; exact Origin plus per-session CSRF token for writes; no CORS allowance | Require HTTPS and trusted reverse proxy; no origin rewriting in production |
| Script injection | React escaping, no HTML injection; CSP; no third-party runtime scripts/fonts; local model/WASM; nosniff/frame denial | Inline styles permitted for existing React layout; browser/security review still needed |
| Floods and large bodies | Per-process socket-IP bucket, bounded map, JSON-only writes, 4KiB body limit, request/header timeout, short keepalive | The supplied proxy overwrites the client IP and authenticates it with a private shared token. Without a valid token the backend uses the socket IP; add edge connection limits and capacity-test before scaling |
| Arbitrary uploads | Exact progress schema and finite known sign IDs; unknown fields rejected | This is a self-reported practice log, not trusted exam scoring |
| Model/supply chain | Locked npm dependencies, verified SHA-256 of versioned model, assets served same-origin, npm audit CI gate | Review future updates; audit does not prove absence of vulnerabilities |
| Filesystem exposure | Serve only real paths inside dist; reject traversal/backslash/nulls; data outside public root; non-root runtime | Review container volume ownership and host permissions |
| Persistent data loss | SQLite WAL, foreign keys, transaction replacement, backup tool, deletion/export endpoints | Use a persistent volume, restricted backups, retention policy and restore drill |

Session expiration is absolute; expired rows and progress are removed by cascading cleanup every minute while the service runs. Logs include generated request IDs and generic failures, not cookies, CSRF tokens, sign histories or frames. Health checks do not expose data. The app does not trust X-Forwarded-For. It accepts X-Real-IP only with a constant-time-verified private PROXY_TOKEN. Caddy overwrites both headers; never expose this token or publish the app port. Rotate the token on both services together. Do not expose Vite in production. Terminate TLS at the trusted proxy and route a single public origin.

Review before release: dependency audit; authenticated/anonymous isolation; CSRF/origin tests; malformed/oversized input; session expiration; data deletion; proxy configuration; CSP/browser MediaPipe behavior; disk-full recovery; backup access; rate/concurrency load; camera/microphone network inspection. Commission a security review for the intended deployment and record evidence. No penetration-test certification is claimed.

References: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html and https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html .
