import { useEffect, useState, useSyncExternalStore } from 'react';
import { initializeSession, request } from '../services/api';
import { ProgressStore, type ProgressStorage } from '../services/progressStore';
function browserStorage():ProgressStorage|undefined { try{return window.localStorage;}catch{return undefined;} }
export function useProgress(){
 const [store]=useState(()=>new ProgressStore({
  init:initializeSession,
  read:async()=>(await request<{signs:string[]}>('/api/progress')).signs,
  save:async(signs)=>{await request('/api/progress','PUT',{signs});},
  delete:async()=>{await request('/api/session','DELETE');},
 },browserStorage()));
 const state=useSyncExternalStore(store.subscribe,store.snapshot);
 useEffect(()=>{void store.connect();},[store]);
 const exportProgress=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({signs:state.signs},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='palm-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return {learned:state.signs,setLearned:store.update,status:state.status,retry:store.connect,reset:store.reset,deleteSession:store.deleteSession,exportProgress};
}
