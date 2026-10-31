import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const lock=JSON.parse(await readFile('models.lock.json','utf8'));
await mkdir('public/models',{recursive:true});
await cp('node_modules/@mediapipe/tasks-vision/wasm','public/wasm',{recursive:true});
let bytes;try{bytes=await readFile('public/models/hand_landmarker.task');}catch{}
if(!bytes || createHash('sha256').update(bytes).digest('hex')!==lock.sha256){const r=await fetch(lock.url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error('Model download failed');bytes=Buffer.from(await r.arrayBuffer());}
if(createHash('sha256').update(bytes).digest('hex')!==lock.sha256)throw Error('Model integrity mismatch; refusing to publish');
await writeFile('public/models/hand_landmarker.task',bytes);
console.log('Local WASM and verified model ready');
