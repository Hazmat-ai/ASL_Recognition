# Same-origin API contract

JSON responses use Cache-Control: no-store. Errors: `{ "error": "CODE", "requestId": "uuid" }`. Unknown routes use 404, unsupported methods 405, missing session 401, invalid origin/CSRF 403, invalid payload 400, wrong content type 415, oversized payload 413, rate limit 429 with Retry-After. Health and catalog do not require a session. No CORS or camera ingestion is supported.

| Method | Path | Input / response |
|---|---|---|
| GET | /api/health | `{status:"ok"}`; verifies database query |
| GET | /api/catalog | `{lessons:[{sign,label,reviewStatus,reviewedBy,reviewedAt,demoPath,captionPath?,cue}]}` |
| GET | /api/session | Creates/reuses HttpOnly session cookie; returns `{csrfToken,expiresAt}` |
| GET | /api/progress | Cookie required; `{signs:string[]}` |
| PUT | /api/progress | Cookie + exact Origin + X-CSRF-Token + Content-Type: application/json; `{signs:string[]}` replaces current browser progress; only configured IDs, no extra fields, 4KiB max |
| DELETE | /api/progress | Same mutation protections; `{signs:[]}` |
| GET | /api/export | Cookie required; `{signs:string[]}` |
| DELETE | /api/session | Same mutation protections; deletes session and cascades progress; expires cookie; `{deleted:true}` |

Progress is a practice log. Multiple tabs use last completed save wins. There are no authoritative grades, user passwords, or admin roles. Synchronization errors are visible and local data remains usable. Sessions expire after 30 days, then the browser gets a new identity. The client does not upload camera or landmark data.
