import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ProgressStore,type ProgressStorage,type ProgressTransport} from '../src/services/progressStore';
function storage():ProgressStorage{const data=new Map<string,string>();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);},removeItem:key=>{data.delete(key);}};}
function deferred(){let resolve=()=>{};const promise=new Promise<void>(done=>{resolve=done;});return {promise,resolve};}
test('offline reset tombstone prevents server progress from returning on reconnect',async()=>{
 let offline=true;let remote=['HELLO'];const saved=storage();
 const transport:ProgressTransport={init:async()=>{},read:async()=>{if(offline)throw Error('offline');return remote;},save:async signs=>{remote=signs;},delete:async()=>{remote=[];}};
 const store=new ProgressStore(transport,saved);await store.connect();store.reset();await store.idle();
 // The reset marker also survives a page reload.
 offline=false;const reloaded=new ProgressStore(transport,saved);await reloaded.connect();assert.deepEqual(remote,[]);assert.deepEqual(reloaded.snapshot().signs,[]);
});
test('an older in-flight save cannot undo reset',async()=>{
 const gate=deferred();let block=false,remote:string[]=[];
 const store=new ProgressStore({init:async()=>{},read:async()=>remote,save:async signs=>{if(block){block=false;await gate.promise;}remote=[...signs];},delete:async()=>{}},storage());
 await store.connect();block=true;store.update(['HELLO']);await Promise.resolve();await Promise.resolve();store.reset();gate.resolve();await store.idle();assert.deepEqual(remote,[]);assert.deepEqual(store.snapshot().signs,[]);
});
test('session deletion invalidates pending initialization and blocks edits until completion',async()=>{
 const gate=deferred();let writes=0,deletes=0;
 const store=new ProgressStore({init:()=>gate.promise,read:async()=>['HELLO'],save:async()=>{writes++;},delete:async()=>{deletes++;}},storage());
 const connect=store.connect();const deletion=store.deleteSession();store.update(['YES']);gate.resolve();await connect;await deletion;assert.equal(deletes,1);assert.equal(writes,0);assert.deepEqual(store.snapshot().signs,[]);assert.match(store.snapshot().status,/Session data deleted/);
});
test('restricted browser storage does not crash sync, reset or deletion',async()=>{
 const blocked:ProgressStorage={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');},removeItem:()=>{throw Error('blocked');}};
 const store=new ProgressStore({init:async()=>{},read:async()=>[],save:async()=>{},delete:async()=>{}},blocked);
 await store.connect();store.update(['HELLO']);store.reset();await store.idle();await store.deleteSession();assert.deepEqual(store.snapshot().signs,[]);assert.match(store.snapshot().status,/storage is unavailable/);
});
test('concurrent session initialization uses one network request',async()=>{
 const {initializeSession}=await import('../src/services/api');const oldFetch=globalThis.fetch;const gate=deferred();let requests=0;
 globalThis.fetch=async()=>{requests++;await gate.promise;return new Response(JSON.stringify({csrfToken:'abc'}),{status:200});};
 try{const a=initializeSession(),b=initializeSession();gate.resolve();await Promise.all([a,b]);assert.equal(requests,1);}finally{globalThis.fetch=oldFetch;}
});
