import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TemporalSmoother} from '../src/utils/smoothing';
import {GeometricSignClassifier} from '../src/models/signClassifier';
const a={sign:'HELLO',displayLabel:'Hello',confidence:0.9};
const b={sign:'YES',displayLabel:'Yes',confidence:0.99};
test('requires a stable hold and respects cooldown',()=>{const smoother=new TemporalSmoother({holdDurationMs:100,cooldownMs:500});assert.equal(smoother.feed(a,0),null);assert.equal(smoother.feed(a,50),null);assert.equal(smoother.feed(a,100)?.sign,'HELLO');assert.equal(smoother.feed(a,210),null);assert.equal(smoother.feed(a,610)?.sign,'HELLO');});
test('a different current prediction cannot inherit the old label or hold',()=>{const s=new TemporalSmoother({holdDurationMs:100});s.feed(a,0);s.feed(a,40);s.feed(a,80);assert.equal(s.feed(b,110),null);});
test('no-hand input clears progress and classifier abstains without hands',()=>{const s=new TemporalSmoother({holdDurationMs:100});s.feed(a,0);s.feed({sign:'NONE',displayLabel:'',confidence:0},50);assert.equal(s.getHoldProgress(100),0);assert.equal(new GeometricSignClassifier().recognize([]).sign,'NONE');});
test('cancelled camera permission releases a late stream',async()=>{
 const {CameraService}=await import('../src/services/cameraService');
 let resolveStream:(stream:MediaStream)=>void=()=>{};let stopped=false;
 const old=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:()=>new Promise<MediaStream>(resolve=>{resolveStream=resolve;})}}});
 try {const service=new CameraService();const pending=service.start();service.stop();resolveStream({getTracks:()=>[{stop:()=>{stopped=true;}}]} as unknown as MediaStream);assert.equal((await pending).status,'idle');assert.equal(stopped,true);}finally{if(old)Object.defineProperty(globalThis,'navigator',old);else Reflect.deleteProperty(globalThis,'navigator');}
});
