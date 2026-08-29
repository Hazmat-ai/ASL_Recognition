import { useState, useEffect, useRef, useCallback } from 'react';
import { RecognitionService } from '../services/recognitionService';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import type { ModelStatus } from '../types/sign';

const recognitionService = new RecognitionService();

export function useHandTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean,
  onResult: (result: HandLandmarkerResult) => void,
) {
  const [modelStatus, setModelStatus] = useState<ModelStatus>('loading');
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    let cancelled = false;
    setModelStatus('loading');

    recognitionService.initialize().then(() => {
      if (!cancelled) setModelStatus('ready');
    }).catch((err) => {
      console.error('[useHandTracking] init error:', err);
      if (!cancelled) setModelStatus('error');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (modelStatus !== 'ready') return;
    if (!enabled) {
      recognitionService.stop();
      return;
    }
    if (!videoRef.current) return;

    recognitionService.start(videoRef.current, (result) => {
      onResultRef.current(result);
    });

    return () => {
      recognitionService.stop();
    };
  }, [modelStatus, enabled, videoRef]);

  const restartTracking = useCallback(() => {
    if (modelStatus !== 'ready' || !videoRef.current) return;
    recognitionService.stop();
    recognitionService.start(videoRef.current, (result) => {
      onResultRef.current(result);
    });
  }, [modelStatus, videoRef]);

  return { modelStatus, restartTracking };
}
