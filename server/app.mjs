import { isIP } from 'node:net';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash, timingSafeEqual, randomUUID } from 'node:crypto';
import { realpath, stat } from 'node:fs/promises';
import { createReadStream, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const catalog = JSON.parse(readFileSync(new URL('../content/catalog.json', import.meta.url), 'utf8'));
const allowedSigns = new Set(catalog.map(item => item.sign));
const hash = value => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('hex');
const equal = (a, b) => typeof a === 'string' && /^[a-f0-9]{64}$/.test(a) && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const ttl = 30 * 86400_000;
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.wasm':'application/wasm', '.task':'application/octet-stream', '.mp4':'video/mp4', '.webm':'video/webm', '.vtt':'text/vtt' };

export function createApp({ dbPath = 'data/palm.sqlite', origin = 'http://localhost:3000', distDir = 'dist', production = false, rateLimit = 180, sessionCreationLimit = 30, proxyToken = '' } = {}) {
  if(proxyToken && !/^[a-f0-9]{64}$/.test(proxyToken))throw Error('PROXY_TOKEN must be 64 lowercase hexadecimal characters');
  const canonical = new URL(origin);
  if (canonical.origin !== origin || (production && canonical.protocol !== 'https:')) throw Error('APP_ORIGIN must be a canonical origin; production requires HTTPS');
  mkdirSync(dirname(resolve(dbPath)), { recursive: true });
  const db = new DatabaseSync(dbPath);
  if (db.prepare('PRAGMA user_version').get().user_version > 1) { db.close(); throw Error('Database schema is newer than this application'); }
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, csrf TEXT NOT NULL, expires INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS progress (session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE, sign TEXT NOT NULL, PRIMARY KEY(session_id,sign)); PRAGMA user_version=1;');
  const cookieName = production ? '__Host-palm' : 'palm';
  const limits = new Map();
  const cleanup = setInterval(() => { db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now()); for (const [key,value] of limits) if (value.until < Date.now()) limits.delete(key); }, 60_000);
  cleanup.unref();
  const root = resolve(distDir);
  const server = createServer(async (req, res) => {
    const requestId = randomUUID();
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Permissions-Policy','camera=(self), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Opener-Policy','same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy','require-corp');
    res.setHeader('Cross-Origin-Resource-Policy','same-origin');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'");
    if (production) res.setHeader('Strict-Transport-Security','max-age=31536000');
    const json = (status, body) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(body)); };
    const fail = (status, code) => json(status, { error:code, requestId });
    try {
      const url = new URL(req.url, origin);
      if (req.headers.host !== canonical.host) return fail(421,'INVALID_HOST');
      if (req.headers['sec-fetch-site'] === 'cross-site') return fail(403,'CROSS_SITE');
      if (!url.pathname.startsWith('/api/')) {
        if (!['GET','HEAD'].includes(req.method)) return fail(405,'METHOD_NOT_ALLOWED');
        let path;
        try { path = decodeURIComponent(url.pathname); } catch { return fail(400,'INVALID_PATH'); }
        if (path.includes('\0') || path.includes('\\') || path.split('/').includes('..')) return fail(400,'INVALID_PATH');
        let file = resolve(root, '.' + path);
        if (file !== root && !file.startsWith(root + sep)) return fail(403,'INVALID_PATH');
        try { if ((await stat(file)).isDirectory()) file = resolve(file,'index.html'); } catch { if (!extname(path)) file = resolve(root,'index.html'); }
        try {
          const actual = await realpath(file);
          if (!actual.startsWith(root + sep)) return fail(403,'INVALID_PATH');
          const info = await stat(actual);
          let start=0, end=info.size-1, status=200;
          if(req.headers.range){
            const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
            if(!match || (!match[1]&&!match[2]) || !info.size){res.setHeader('Content-Range',`bytes */${info.size}`);return fail(416,'INVALID_RANGE');}
            start=match[1]?Number(match[1]):Math.max(0,info.size-Number(match[2]));
            end=match[1]&&match[2]?Math.min(Number(match[2]),info.size-1):info.size-1;
            if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=info.size){res.setHeader('Content-Range',`bytes */${info.size}`);return fail(416,'INVALID_RANGE');}
            status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${info.size}`);
          }
          res.writeHead(status, {'Content-Type':types[extname(actual)] ?? 'application/octet-stream','Content-Length':info.size ? end-start+1 : 0,'Accept-Ranges':'bytes','Cache-Control':actual.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache'});
          if(req.method==='HEAD'||!info.size)return res.end();
          const stream=createReadStream(actual,{start,end});
          stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);return;

        } catch { return fail(404,'NOT_FOUND'); }
      }
      const forwarded = req.headers['x-real-ip'];
      const trusted = proxyToken && equal(req.headers['x-palm-proxy-token'], proxyToken);
      const ip = trusted && typeof forwarded === 'string' && isIP(forwarded) ? forwarded : (req.socket.remoteAddress ?? 'unknown');
      let bucket = limits.get(ip);
      if (!bucket || bucket.until < Date.now()) { if (limits.size >= 10_000 && !bucket) return fail(503,'BUSY'); bucket = { count:0, created:0, until:Date.now()+60_000 }; limits.set(ip,bucket); }
      if (++bucket.count > rateLimit) { res.setHeader('Retry-After','60'); return fail(429,'RATE_LIMIT'); }
      if (url.pathname === '/api/health' && req.method === 'GET') { db.prepare('SELECT 1').get(); return json(200,{ status:'ok' }); }
      if (req.headers.origin && req.headers.origin !== origin) return fail(403,'INVALID_ORIGIN');
      if (!['GET','PUT','DELETE'].includes(req.method)) return fail(405,'METHOD_NOT_ALLOWED');
      if (url.pathname === '/api/catalog' && req.method === 'GET') return json(200,{ lessons:catalog });
      const cookie = (req.headers.cookie ?? '').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1);
      const session = /^[a-f0-9]{64}$/.test(cookie ?? '') ? db.prepare('SELECT * FROM sessions WHERE id=? AND expires>?').get(hash(cookie),Date.now()) : undefined;
      if (url.pathname === '/api/session' && req.method === 'GET') {
        let current = session;
        if (!current) {
          if (++bucket.created > sessionCreationLimit) { res.setHeader('Retry-After','60'); return fail(429,'SESSION_RATE_LIMIT'); }
          const raw = token(); current = { id:hash(raw), csrf:token(), expires:Date.now()+ttl };
          db.prepare('INSERT INTO sessions(id,csrf,expires) VALUES(?,?,?)').run(current.id,current.csrf,current.expires);
          res.setHeader('Set-Cookie',`${cookieName}=${raw}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${production ? '; Secure' : ''}`);
        }
        return json(200,{ csrfToken:current.csrf, expiresAt:current.expires });
      }
      if (!session) return fail(401,'SESSION_REQUIRED');
      if (req.method !== 'GET' && (req.headers.origin !== origin || !equal(req.headers['x-csrf-token'],session.csrf))) return fail(403,'CSRF_INVALID');
      if (['/api/progress','/api/export'].includes(url.pathname) && req.method === 'GET') {
        const signs = db.prepare('SELECT sign FROM progress WHERE session_id=? ORDER BY sign').all(session.id).map(row=>row.sign);
        return json(200,{ signs });
      }
      if (url.pathname === '/api/progress' && req.method === 'PUT') {
        if (req.headers['content-type'] !== 'application/json') return fail(415,'JSON_REQUIRED');
        if (Number(req.headers['content-length'] ?? 0) > 4096) return fail(413,'BODY_TOO_LARGE');
        let body = ''; for await (const chunk of req) { body += chunk.toString(); if (Buffer.byteLength(body) > 4096) return fail(413,'BODY_TOO_LARGE'); }
        let input; try { input = JSON.parse(body); } catch { return fail(400,'INVALID_JSON'); }
        if (!input || Object.keys(input).length !== 1 || !Array.isArray(input.signs) || input.signs.length > allowedSigns.size || input.signs.some(sign=>typeof sign !== 'string' || !allowedSigns.has(sign))) return fail(400,'INVALID_PROGRESS');
        const signs = [...new Set(input.signs)];
        db.exec('BEGIN');
        try { db.prepare('DELETE FROM progress WHERE session_id=?').run(session.id); const insert = db.prepare('INSERT INTO progress(session_id,sign) VALUES(?,?)'); for (const sign of signs) insert.run(session.id,sign); db.exec('COMMIT'); } catch (error) { db.exec('ROLLBACK'); throw error; }
        return json(200,{ signs });
      }
      if (url.pathname === '/api/progress' && req.method === 'DELETE') { db.prepare('DELETE FROM progress WHERE session_id=?').run(session.id); return json(200,{ signs:[] }); }
      if (url.pathname === '/api/session' && req.method === 'DELETE') { db.prepare('DELETE FROM sessions WHERE id=?').run(session.id); res.setHeader('Set-Cookie',`${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${production ? '; Secure' : ''}`); return json(200,{ deleted:true }); }
      return fail(404,'NOT_FOUND');
    } catch (error) { console.error(JSON.stringify({ level:'error', requestId, message:'Request failed' })); if (!res.headersSent) fail(500,'INTERNAL_ERROR'); else res.end(); }
  });
  server.requestTimeout = 15_000; server.headersTimeout = 10_000; server.keepAliveTimeout = 5000;
  server.on('close',()=>{ clearInterval(cleanup); db.close(); });
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const production = process.env.NODE_ENV === 'production';
  if (production && !process.env.APP_ORIGIN) throw Error('APP_ORIGIN is required in production');
  const server = createApp({ dbPath:process.env.DB_PATH, origin:process.env.APP_ORIGIN ?? 'http://localhost:3000', proxyToken:process.env.PROXY_TOKEN ?? '', production });
  server.listen(Number(process.env.PORT ?? 3000),'0.0.0.0',()=>console.log('Palm API listening'));
  for (const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>{ server.close(()=>process.exit(0)); setTimeout(()=>process.exit(1),10_000).unref(); });
}
