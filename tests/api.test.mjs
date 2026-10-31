import {request as httpRequest} from 'node:http';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server/app.mjs';
async function fixture(run, options={}) {
 const dir=await mkdtemp(join(tmpdir(),'palm-'));await writeFile(join(dir,'index.html'),'<h1>Palm</h1>');
 const origin='http://localhost:3000';const server=createApp({dbPath:join(dir,'test.sqlite'),distDir:dir,origin,...options});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 const api=(path,init={})=>new Promise((resolve,reject)=>{const req=httpRequest(base+path,{method:init.method??'GET',headers:{host:'localhost:3000',...init.headers}},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode,headers:res.headers})));});req.on('error',reject);req.end(init.body);});
 const session=async()=>{const r=await api('/api/session');assert.equal(r.status,200);return {cookie:r.headers.get('set-cookie').split(';')[0],csrf:(await r.json()).csrfToken};};
 try{await run({api,session});}finally{await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
}
test('progress is scoped to the cookie; validates input; export and deletion work',()=>fixture(async({api,session})=>{
 const a=await session(),b=await session();const headers={cookie:a.cookie,origin:'http://localhost:3000','x-csrf-token':a.csrf,'content-type':'application/json'};
 assert.equal((await api('/api/progress')).status,401);
 assert.equal((await api('/api/progress',{method:'PUT',headers,body:JSON.stringify({signs:['HELLO']})})).status,200);
 assert.deepEqual(await (await api('/api/progress',{headers:{cookie:b.cookie}})).json(),{signs:[]});
 assert.deepEqual(await (await api('/api/export',{headers:{cookie:a.cookie}})).json(),{signs:['HELLO']});
 for(const body of [{signs:['INVALID']},{signs:['HELLO'],video:'forbidden'},null,{signs:'HELLO'}])assert.equal((await api('/api/progress',{method:'PUT',headers,body:JSON.stringify(body)})).status,400);
 assert.equal((await api('/api/progress',{method:'PUT',headers,body:'{broken'})).status,400);
 assert.equal((await api('/api/progress',{method:'PUT',headers,body:'x'.repeat(5000)})).status,413);
 assert.equal((await api('/api/progress',{method:'DELETE',headers})).status,200);
 assert.deepEqual(await (await api('/api/progress',{headers:{cookie:a.cookie}})).json(),{signs:[]});
 assert.equal((await api('/api/session',{method:'DELETE',headers})).status,200);
 assert.equal((await api('/api/progress',{headers:{cookie:a.cookie}})).status,401);
}));
test('CSRF, origin, content type, host and method checks reject unsafe requests',()=>fixture(async({api,session})=>{
 const a=await session();const headers={cookie:a.cookie,origin:'http://localhost:3000','x-csrf-token':a.csrf,'content-type':'application/json'};
 assert.equal((await api('/api/progress',{method:'PUT',headers:{...headers,'x-csrf-token':'wrong'},body:'{"signs":[]}'})).status,403);
 assert.equal((await api('/api/progress',{method:'DELETE',headers:{...headers,origin:'https://evil.example'}})).status,403);
 const {origin,...noOrigin}=headers;assert.equal((await api('/api/progress',{method:'DELETE',headers:noOrigin})).status,403);
 assert.equal((await api('/api/progress',{method:'PUT',headers:{...headers,'content-type':'text/plain'},body:'{}'})).status,415);
 assert.equal((await api('/api/session',{headers:{host:'evil.example'}})).status,421);
 assert.equal((await api('/api/progress',{method:'POST',headers})).status,405);
 const response=await api('/api/health');assert.match(response.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.equal(response.headers.get('x-content-type-options'),'nosniff');
}));
test('rate limit is enforced',()=>fixture(async({api})=>{assert.equal((await api('/api/health')).status,200);assert.equal((await api('/api/health')).status,429);},{rateLimit:1}));
test('static files stay inside the public root and API unknown routes return JSON',()=>fixture(async({api})=>{
 assert.equal((await api('/')).status,200);
 assert.equal((await api('/missing.js')).status,404);
 const partial=await api('/',{headers:{range:'bytes=0-3'}});assert.equal(partial.status,206);assert.equal(await partial.text(),'<h1>');
 assert.equal((await api('/',{headers:{range:'bytes=999-1000'}})).status,416);
 assert.equal((await api('/%2e%2e%2fsecret')).status,400);
 assert.equal((await api('/%00')).status,400);
 const a=await (await api('/api/session')).json();assert.ok(a.csrfToken);
}));
test('production rejects missing HTTPS origin',()=>assert.throws(()=>createApp({production:true,origin:'http://example.com'}),/HTTPS/));
test('production cookies use secure host-bound attributes',()=>fixture(async({api})=>{const r=await api('/api/session');assert.equal(r.status,200);const cookie=r.headers.get('set-cookie');assert.match(cookie,/^__Host-palm=/);for(const attribute of ['HttpOnly','Secure','SameSite=Strict','Path=/'])assert.ok(cookie.includes(attribute));},{origin:'https://localhost:3000',production:true}));
test('proxy IPs get separate buckets only with the private proxy credential',()=>fixture(async({api})=>{
 const secret='a'.repeat(64);const headers={'x-real-ip':'192.0.2.1','x-palm-proxy-token':secret};
 assert.equal((await api('/api/health',{headers})).status,200);
 assert.equal((await api('/api/health',{headers:{...headers,'x-real-ip':'192.0.2.2'}})).status,200);
 assert.equal((await api('/api/health',{headers})).status,429);
 // Spoofed forwarded addresses still share the untrusted socket bucket.
 assert.equal((await api('/api/health',{headers:{'x-real-ip':'192.0.2.3'}})).status,200);
 assert.equal((await api('/api/health',{headers:{'x-real-ip':'192.0.2.4','x-palm-proxy-token':'b'.repeat(64)}})).status,429);
},{proxyToken:'a'.repeat(64),rateLimit:1}));
test('session creation limit preserves access for existing sessions',()=>fixture(async({api,session})=>{
 const a=await session();assert.equal((await api('/api/session')).status,429);assert.equal((await api('/api/session',{headers:{cookie:a.cookie}})).status,200);
},{sessionCreationLimit:1}));
