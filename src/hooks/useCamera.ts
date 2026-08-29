import { useState, useRef, useCallback } from 'react';
import { CameraService } from '../services/cameraService';
import type { CameraStatus } from '../types/sign';
import type { CameraDevice } from '../services/cameraService';

const cameraService = new CameraService();

export function useCamera() {
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const enumerate = useCallback(async () => {
    const cams = await cameraService.enumerateCameras();
    setDevices(cams);
    return cams;
  }, []);

  const startCamera = useCallback(async (deviceId?: string) => {
    setStatus('requesting');
    const { stream, status: s } = await cameraService.start({ deviceId });
    setStatus(s);

    if (s === 'active' && stream && videoRef.current) {
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
      // Re-enumerate after permission granted (labels become available)
      enumerate();
    }
    return s;
  }, [enumerate]);

  const stopCamera = useCallback(() => {
    cameraService.stop();
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('idle');
  }, []);

  return { status, devices, videoRef, streamRef, startCamera, stopCamera, enumerate };
}
