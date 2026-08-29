import React from 'react';
import type { CameraStatus, HandStatus, ModelStatus } from '../types/sign';

interface StatusIndicatorProps {
  cameraStatus: CameraStatus;
  handStatus: HandStatus;
  modelStatus: ModelStatus;
}

type PillStatus = 'green' | 'yellow' | 'red' | 'gray';

interface Pill {
  label: string;
  status: PillStatus;
  detail?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  cameraStatus,
  handStatus,
  modelStatus,
}) => {
  const pills: Pill[] = [
    {
      label: 'Camera',
      status:
        cameraStatus === 'active' ? 'green'
        : cameraStatus === 'requesting' ? 'yellow'
        : cameraStatus === 'idle' ? 'gray'
        : 'red',
      detail:
        cameraStatus === 'active' ? 'Active'
        : cameraStatus === 'requesting' ? 'Starting…'
        : cameraStatus === 'denied' ? 'Denied'
        : cameraStatus === 'no-camera' ? 'Not Found'
        : cameraStatus === 'error' ? 'Error'
        : 'Off',
    },
    {
      label: 'Model',
      status:
        modelStatus === 'ready' ? 'green'
        : modelStatus === 'loading' ? 'yellow'
        : 'red',
      detail:
        modelStatus === 'ready' ? 'Ready'
        : modelStatus === 'loading' ? 'Loading…'
        : 'Error',
    },
    {
      label: 'Hand',
      status:
        handStatus === 'accepted' ? 'green'
        : handStatus === 'recognizing' ? 'yellow'
        : handStatus === 'detected' ? 'yellow'
        : 'gray',
      detail:
        handStatus === 'accepted' ? 'Accepted'
        : handStatus === 'recognizing' ? 'Recognizing…'
        : handStatus === 'detected' ? 'Detected'
        : 'None',
    },
  ];

  const dotColors: Record<PillStatus, string> = {
    green:  'bg-emerald-400',
    yellow: 'bg-amber-400 animate-pulse',
    red:    'bg-red-500',
    gray:   'bg-gray-600',
  };

  const textColors: Record<PillStatus, string> = {
    green:  'text-emerald-300',
    yellow: 'text-amber-300',
    red:    'text-red-400',
    gray:   'text-gray-500',
  };

  return (
    <div
      className="flex flex-wrap gap-2"
      role="status"
      aria-label="System status"
      aria-live="polite"
    >
      {pills.map((pill) => (
        <div
          key={pill.label}
          className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-medium backdrop-blur"
        >
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColors[pill.status]}`} aria-hidden />
          <span className="text-gray-400">{pill.label}:</span>
          <span className={textColors[pill.status]}>{pill.detail}</span>
        </div>
      ))}
    </div>
  );
};
