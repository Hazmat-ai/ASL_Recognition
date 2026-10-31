import { useState, useEffect, useRef } from 'react';
import { RecognitionService } from '../services/recognitionService';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import type { ModelStatus } from '../types/sign';
export function useHandTracking(videoRef:React.RefObject<HTMLVideoElement|null>, enabled:boolean, onResult:(result:HandLandmarkerResult)=>void) {
  const [modelStatus,setModelStatus]=useState<ModelStatus>('loading');
  const callback=useRef(onResult);callback.current=onResult;
  useEffect(()=>{
    if(!enabled || !videoRef.current)return;
    const service=new RecognitionService();let cancelled=false;
    setModelStatus('loading');
    service.initialize().then(()=>{
      if(cancelled){service.destroy();return;}
      setModelStatus('ready');
      if(videoRef.current) service.start(videoRef.current,result=>callback.current(result),()=>{service.destroy();if(!cancelled)setModelStatus('error');});
    }).catch(()=>{service.destroy();if(!cancelled)setModelStatus('error');});
    return ()=>{cancelled=true;service.destroy();};
  },[enabled,videoRef]);
  return {modelStatus};
}
