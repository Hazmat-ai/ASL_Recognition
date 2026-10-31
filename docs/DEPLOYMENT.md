# Build, deploy, operate

Requires Node 24.13–24.x, npm, a persistent writable data volume, and an HTTPS domain. This first architecture is one Node process with SQLite on local durable disk. Do not use an ephemeral/serverless filesystem, mount the SQLite DB over NFS, or scale multiple replicas over the same DB. For larger traffic migrate persistence, sessions, and rate controls to shared infrastructure and load-test it.

## Local development

```
npm ci
npm run assets:prepare
npm run dev:api
# In another terminal:
npm run dev
```

Vite proxies /api to the local API and rewrites the origin only in development. Production runs frontend and API on the same origin:

```
npm run check
npx playwright install --with-deps chromium
npm run test:e2e
npm audit --audit-level=high
npm run release:check
```

The release check intentionally fails until all content and human signoffs are complete. Seed catalog entries are drafts. Add licensed reviewed videos and VTT captions under public/lessons, set valid demoPath/captionPath and review metadata in content/catalog.json. Build again. Catalog IDs must agree with SUPPORTED_SIGNS. The classifier currently has no evidence of pedagogical correctness; record recognition evaluation before publication.

## Docker and TLS

Set APP_DOMAIN and a random 64-character lowercase hexadecimal PROXY_TOKEN in a local .env (do not commit secrets). Generate the token with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`, point DNS at your host, open TCP 80/443, then:

```
docker compose build
docker compose up -d
docker compose logs --tail=100 app
```

Caddy provisions TLS. APP_ORIGIN is derived from APP_DOMAIN; requests with a different Host are rejected. Do not publish port 3000 directly. The supplied Caddy configuration overwrites the client IP and authenticates it to the app using PROXY_TOKEN, allowing per-client API buckets. Do not reuse this token in browser variables. Add edge connection limits and monitor service capacity. The included in-process bucket is a fallback, not a distributed DDoS service. Use restrictive volume permissions, encrypted host storage/backups, and resource limits appropriate to measured load. Review OS/container patches before every deployment.

Without Docker: npm run build, then NODE_ENV=production APP_ORIGIN=https://your-domain DB_PATH=/durable/palm.sqlite npm start behind a TLS proxy preserving Host and Origin. No API secret belongs in Vite variables.

## Backup, restore, rollback

On a host checkout with access to the live data directory: DB_PATH=/path/palm.sqlite BACKUP_PATH=/restricted/backup.sqlite npm run backup. The tool uses SQLite's online backup API. Schedule encrypted backups outside the application, use a retention policy, and restrict access because backups contain anonymous practice records. Backup restores are not automated by this patch.

Restore only with the service stopped: preserve the current database for rollback, replace it with the backup, remove stale -wal/-shm sidecars while no process holds the DB, set ownership for the runtime user, restart and validate health plus known practice data. Perform and record this drill on staging before launch. The current schema is version 1; future migrations require a migration and rollback plan. Deploy immutable tested images; retain previous image and a matching database backup. Never downgrade a schema without a tested path.

## Operational acceptance

Monitor /api/health with the canonical Host, error counts/request IDs, rate-limit responses, DB disk usage, backup age and latency. Test process restart, expired sessions, read-only/full disk, and upstream outages. Shut down via SIGTERM; active connections drain with a ten-second deadline. Browser camera quality and model accuracy need device-based UAT, not a server health check.
