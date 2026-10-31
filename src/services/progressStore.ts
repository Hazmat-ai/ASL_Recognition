import { SUPPORTED_SIGNS } from '../models/signClassifier';
const KEY='asl-learning-progress-v1', RESET='palm-reset-pending';
const allowed=new Set(SUPPORTED_SIGNS.map(item=>item.sign));
const clean=(values:unknown):string[]=>Array.isArray(values)?[...new Set(values.filter((v):v is string=>typeof v==='string'&&allowed.has(v)))]:[];
export interface ProgressTransport { init():Promise<void>; read():Promise<string[]>; save(signs:string[]):Promise<void>; delete():Promise<void>; }
export interface ProgressStorage { getItem(key:string):string|null; setItem(key:string,value:string):void; removeItem(key:string):void; }
export interface ProgressSnapshot { signs:string[]; status:string; }
/** Serializes persistence, so reset/delete cannot be undone by an older save. */
export class ProgressStore {
 private state:ProgressSnapshot;
 private listeners=new Set<()=>void>();
 private queue:Promise<void>=Promise.resolve();
 private connecting:Promise<void>|null=null;
 private connected=false;
 private deleting=false;
 private resetPending=false;
 private generation=0;
 private revision=0;
 private storageAvailable=true;
 constructor(private transport:ProgressTransport,private storage?:ProgressStorage){
  this.storageAvailable=!!storage;
  let signs:string[]=[];
  try{signs=clean(JSON.parse(storage?.getItem(KEY)??'[]'));this.resetPending=storage?.getItem(RESET)==='1';}catch{this.storageAvailable=false;}
  this.state={signs,status:'Connecting to progress storage…'};
 }
 snapshot=()=>this.state;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return ()=>{this.listeners.delete(listener);};};
 private publish(signs:string[],status:string){this.state={signs,status:status+(this.storageAvailable?'':' Browser storage is unavailable; this tab retains your progress.')};for(const listener of this.listeners)listener();}
 private persist(){try{this.storage?.setItem(KEY,JSON.stringify(this.state.signs));if(this.resetPending)this.storage?.setItem(RESET,'1');else this.storage?.removeItem(RESET);}catch{this.storageAvailable=false;}}
 private enqueue(task:()=>Promise<void>){this.queue=this.queue.catch(()=>undefined).then(task);return this.queue;}
 private async saveCurrent(generation:number){
  if(!this.connected||this.deleting||generation!==this.generation)return;
  const revision=this.revision,signs=[...this.state.signs];
  try{await this.transport.save(signs);if(generation===this.generation&&revision===this.revision){this.resetPending=false;this.persist();this.publish(this.state.signs,'Progress saved');}}
  catch{if(generation===this.generation){this.connected=false;this.publish(this.state.signs,'Could not save to server. Retry sync.');}}
 }
 connect=():Promise<void>=>{
  if(this.deleting)return this.queue;
  if(this.connecting)return this.connecting;
  const generation=++this.generation;this.connected=false;
  const operation=this.enqueue(async()=>{
   try{await this.transport.init();const remote=await this.transport.read();if(generation!==this.generation)return;
    const signs=clean([...this.state.signs,...(this.resetPending?[]:remote)]);
    this.connected=true;this.publish(signs,'Progress connected to this browser session');this.persist();await this.saveCurrent(generation);
   }catch{if(generation===this.generation)this.publish(this.state.signs,'Server unavailable. Retry sync to save progress.');}
  });
  this.connecting=operation;
  void operation.finally(()=>{if(this.connecting===operation)this.connecting=null;});
  return operation;
 };
 update=(value:string[]|((current:string[])=>string[]))=>{
  if(this.deleting)return;
  const signs=clean(typeof value==='function'?value(this.state.signs):value);
  if(JSON.stringify(signs)===JSON.stringify(this.state.signs))return;
  this.revision++;this.publish(signs,'Practice updated');this.persist();
  const generation=this.generation;void this.enqueue(()=>this.saveCurrent(generation));
 };
 reset=()=>{
  if(this.deleting)return;
  this.resetPending=true;this.revision++;this.publish([],'Progress reset. Waiting to sync.');this.persist();
  const generation=this.generation;void this.enqueue(()=>this.saveCurrent(generation));
 };
 deleteSession=():Promise<void>=>{
  if(this.deleting)return this.queue;
  this.deleting=true;this.connected=false;const generation=++this.generation;
  this.publish(this.state.signs,'Deleting session data…');
  return this.enqueue(async()=>{
   try{await this.transport.init();await this.transport.delete();if(generation!==this.generation)return;
    this.revision++;this.resetPending=false;this.publish([],'Session data deleted. Retry sync to start a new session.');this.persist();
   }catch{this.publish(this.state.signs,'Could not delete session data. Retry when connected.');}
   finally{this.deleting=false;}
  });
 };
 idle=()=>this.queue;
}
