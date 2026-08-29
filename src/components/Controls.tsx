import React from 'react';

interface ControlsProps {
  cameraActive: boolean;
  detectionEnabled: boolean;
  hasWords: boolean;
  isSpeaking: boolean;
  speechSupported: boolean;
  onStart: () => void;
  onStop: () => void;
  onToggleDetection: () => void;
  onSpeak: () => void;
  onUndo: () => void;
  onClear: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  cameraActive,
  detectionEnabled,
  hasWords,
  isSpeaking,
  speechSupported,
  onStart,
  onStop,
  onToggleDetection,
  onSpeak,
  onUndo,
  onClear,
}) => {
  return (
    <div className="controls-bar flex flex-wrap items-center justify-center gap-3" role="toolbar" aria-label="Application controls">
      {/* Camera toggle */}
      {!cameraActive ? (
        <button
          id="btn-start-camera"
          onClick={onStart}
          className="btn btn-primary flex items-center gap-2"
          aria-label="Start camera and hand detection"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Start Camera
        </button>
      ) : (
        <>
          <button
            id="btn-toggle-detection"
            onClick={onToggleDetection}
            className={`btn ${detectionEnabled ? 'btn-secondary' : 'btn-outline'} flex items-center gap-2`}
            aria-label={detectionEnabled ? 'Pause sign detection' : 'Resume sign detection'}
            aria-pressed={detectionEnabled}
          >
            {detectionEnabled ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pause
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Resume
              </>
            )}
          </button>

          <button
            id="btn-stop-camera"
            onClick={onStop}
            className="btn btn-danger flex items-center gap-2"
            aria-label="Stop camera"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
            </svg>
            Stop
          </button>
        </>
      )}

      <div className="w-px h-8 bg-white/10 hidden sm:block" aria-hidden />

      {/* Speech */}
      <button
        id="btn-speak"
        onClick={onSpeak}
        disabled={!speechSupported || !hasWords || isSpeaking}
        className="btn btn-accent flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Speak the translated sentence"
        title={!speechSupported ? 'Text-to-speech not supported by this browser' : ''}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          {isSpeaking ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12M9 8.464a5 5 0 000 7.072" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          )}
        </svg>
        {isSpeaking ? 'Speaking…' : 'Speak'}
      </button>

      <div className="w-px h-8 bg-white/10 hidden sm:block" aria-hidden />

      {/* Undo */}
      <button
        id="btn-undo"
        onClick={onUndo}
        disabled={!hasWords}
        className="btn btn-ghost flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Undo last sign"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
        Undo
      </button>

      {/* Clear */}
      <button
        id="btn-clear"
        onClick={onClear}
        disabled={!hasWords}
        className="btn btn-ghost flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-red-400 hover:text-red-300"
        aria-label="Clear all translated words"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Clear
      </button>
    </div>
  );
};
