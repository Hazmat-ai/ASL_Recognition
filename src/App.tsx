import React, { useState, useCallback, useRef } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { CameraView } from './components/CameraView';
import { SubtitleDisplay } from './components/SubtitleDisplay';
import { Controls } from './components/Controls';
import { StatusIndicator } from './components/StatusIndicator';
import { Settings } from './components/Settings';
import { useCamera } from './hooks/useCamera';
import { useHandTracking } from './hooks/useHandTracking';
import { useSignRecognition } from './hooks/useSignRecognition';
import { useSpeech } from './hooks/useSpeech';
import type { AppSettings, HandStatus } from './types/sign';
import { DEFAULT_SETTINGS } from './types/sign';

function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detectionEnabled, setDetectionEnabled] = useState(true);
  const [handResult, setHandResult] = useState<HandLandmarkerResult | null>(null);

  const handleSettingsChange = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  // ── Camera ────────────────────────────────────────────────────────────────
  const { status: cameraStatus, devices: cameras, videoRef, startCamera, stopCamera, enumerate } = useCamera();
  const cameraActive = cameraStatus === 'active';

  const handleStart = useCallback(async () => {
    await enumerate();
    await startCamera(settings.cameraDeviceId || undefined);
  }, [enumerate, startCamera, settings.cameraDeviceId]);

  const handleStop = useCallback(() => {
    stopCamera();
    setHandResult(null);
    setDetectionEnabled(true);
  }, [stopCamera]);

  // ── Sign Recognition ──────────────────────────────────────────────────────
  const {
    processResult,
    currentPrediction,
    holdProgress,
    words,
    handsDetected,
    undo,
    clear,
    getSpeechText,
    setManualText,
  } = useSignRecognition({
    settings: settings.recognition,
    enabled: cameraActive && detectionEnabled,
  });

  // Stable callback ref so useHandTracking's effect doesn't re-run on every render
  const processResultRef = useRef(processResult);
  processResultRef.current = processResult;

  const stableCallback = useCallback((result: HandLandmarkerResult) => {
    setHandResult(result);
    processResultRef.current(result);
  }, []);

  // ── Hand Tracking ─────────────────────────────────────────────────────────
  const { modelStatus } = useHandTracking(
    videoRef,
    cameraActive && detectionEnabled,
    stableCallback,
  );

  // ── Speech ────────────────────────────────────────────────────────────────
  const { voices, isSpeaking, isSupported: speechSupported, speak } = useSpeech(settings.tts);

  const handleSpeak = useCallback(() => {
    const text = getSpeechText();
    if (text) speak(text);
  }, [getSpeechText, speak]);

  // ── Derived hand status ────────────────────────────────────────────────────
  const handStatus: HandStatus = !handsDetected
    ? 'none'
    : currentPrediction.sign !== 'NONE' && holdProgress >= 1
    ? 'accepted'
    : currentPrediction.sign !== 'NONE'
    ? 'recognizing'
    : 'detected';

  return (
    <div className="app-root min-h-screen bg-gray-950 text-white flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="app-header flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div
            className="logo-icon w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30"
            aria-hidden="true"
          >
            <span className="text-lg">✋</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-tight tracking-tight">
              ASL Sign Translator
            </h1>
            <p className="text-xs text-gray-500 leading-none">American Sign Language · Real-time</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-xs text-violet-300 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" aria-hidden="true" />
            Demo Mode
          </span>
          <button
            id="btn-settings"
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Open settings"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col lg:flex-row gap-0 overflow-auto">
        {/* Camera panel */}
        <div className="flex flex-col gap-4 p-4 sm:p-6 lg:w-3/5 xl:w-2/3">
          <CameraView
            videoRef={videoRef}
            cameraStatus={cameraStatus}
            handResult={handResult}
            showLandmarks={settings.showLandmarks}
          />
          <StatusIndicator
            cameraStatus={cameraStatus}
            handStatus={handStatus}
            modelStatus={modelStatus}
          />
          {modelStatus === 'loading' && (
            <div
              className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2"
              role="status"
              aria-live="polite"
            >
              <div className="w-3 h-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" aria-hidden="true" />
              Loading sign recognition model… (first load downloads ~5 MB from Google CDN)
            </div>
          )}
          {modelStatus === 'error' && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2" role="alert">
              ⚠ Failed to load hand detection model. Check your internet connection and reload.
            </div>
          )}
          {!speechSupported && (
            <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2" role="alert">
              ⚠ Text-to-speech is not supported by this browser.
            </div>
          )}
        </div>

        {/* Translation panel */}
        <div className="flex flex-col gap-4 p-4 sm:p-6 lg:w-2/5 xl:w-1/3 lg:border-l lg:border-white/5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Translation</h2>
            <span className="text-xs text-gray-600">{words.length} word{words.length !== 1 ? 's' : ''}</span>
          </div>

          <SubtitleDisplay
            words={words}
            currentPrediction={currentPrediction}
            holdProgress={holdProgress}
            showConfidence={settings.showConfidence}
            onManualEdit={setManualText}
          />

          <Controls
            cameraActive={cameraActive}
            detectionEnabled={detectionEnabled}
            hasWords={words.length > 0}
            isSpeaking={isSpeaking}
            speechSupported={speechSupported}
            onStart={handleStart}
            onStop={handleStop}
            onToggleDetection={() => setDetectionEnabled((v) => !v)}
            onSpeak={handleSpeak}
            onUndo={undo}
            onClear={clear}
          />

          <div className="mt-auto pt-4 border-t border-white/5">
            <p className="text-xs text-gray-600 font-medium mb-2">Tips</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Hold a gesture steady for ~{settings.recognition.holdDurationMs}ms to register it</li>
              <li>• Only signs above {Math.round(settings.recognition.confidenceThreshold * 100)}% confidence are accepted</li>
              <li>• Click the subtitle box to edit manually</li>
              <li>• Ensure good lighting for best accuracy</li>
            </ul>
          </div>
        </div>
      </main>

      {/* ── Settings modal ──────────────────────────────────────────────── */}
      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        voices={voices}
        cameras={cameras}
      />
    </div>
  );
}

export default App;
