import React, { useRef, useEffect, useState } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { HandOverlay } from './HandOverlay';
import type { CameraStatus } from '../types/sign';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraStatus: CameraStatus;
  handResult: HandLandmarkerResult | null;
  showLandmarks: boolean;
}

export const CameraView: React.FC<CameraViewProps> = ({
  videoRef,
  cameraStatus,
  handResult,
  showLandmarks,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 640, height: 360 });

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setDims({ width: rect.width, height: rect.height });
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const showCamera = cameraStatus === 'active';

  return (
    <div
      ref={containerRef}
      className="camera-container relative w-full overflow-hidden rounded-2xl bg-gray-950 border border-white/10"
      style={{ aspectRatio: '16/9' }}
      role="img"
      aria-label="Live camera feed with hand tracking overlay"
    >
      {/* Mirror the video feed */}
      <video
        ref={videoRef as React.RefObject<HTMLVideoElement>}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)', display: showCamera ? 'block' : 'none' }}
        playsInline
        muted
        autoPlay
        aria-hidden="true"
      />

      {/* Hand overlay canvas (also mirrored to match video) */}
      {showCamera && (
        <div style={{ transform: 'scaleX(-1)', position: 'absolute', inset: 0 }}>
          <HandOverlay
            result={handResult}
            videoWidth={dims.width}
            videoHeight={dims.height}
            visible={showLandmarks}
          />
        </div>
      )}

      {/* Placeholder / error states */}
      {!showCamera && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6">
          <CameraPlaceholder status={cameraStatus} />
        </div>
      )}

      {/* Corner badge */}
      {showCamera && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur rounded-full px-3 py-1 text-xs font-medium text-white select-none">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          LIVE
        </div>
      )}
    </div>
  );
};

function CameraPlaceholder({ status }: { status: CameraStatus }) {
  const icons: Record<CameraStatus, React.ReactNode> = {
    idle: (
      <svg className="w-16 h-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    requesting: (
      <div className="w-14 h-14 rounded-full border-4 border-violet-500/30 border-t-violet-500 animate-spin" />
    ),
    active: null,
    denied: (
      <svg className="w-14 h-14 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    'no-camera': (
      <svg className="w-14 h-14 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    error: (
      <svg className="w-14 h-14 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  };

  const messages: Record<CameraStatus, string> = {
    idle: 'Press Start to activate the camera',
    requesting: 'Requesting camera access…',
    active: '',
    denied: 'Camera access denied. Please allow camera permissions in your browser and try again.',
    'no-camera': 'No camera detected. Please connect a camera and try again.',
    error: 'An error occurred while accessing the camera. Please try again.',
  };

  return (
    <>
      {icons[status]}
      <p className="text-sm text-gray-400 max-w-xs leading-relaxed">{messages[status]}</p>
      <div className="camera-grid-bg absolute inset-0 -z-10 opacity-20" aria-hidden />
    </>
  );
}
