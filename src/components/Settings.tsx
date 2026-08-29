import React from 'react';
import type { AppSettings } from '../types/sign';
import type { VoiceOption } from '../services/speechService';
import type { CameraDevice } from '../services/cameraService';
import { SUPPORTED_SIGNS } from '../models/signClassifier';

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (patch: Partial<AppSettings>) => void;
  voices: VoiceOption[];
  cameras: CameraDevice[];
}

export const Settings: React.FC<SettingsProps> = ({
  open,
  onClose,
  settings,
  onSettingsChange,
  voices,
  cameras,
}) => {
  if (!open) return null;

  const patch = (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => {
    onSettingsChange({ [key]: value });
  };

  const patchTts = (key: keyof AppSettings['tts'], value: AppSettings['tts'][keyof AppSettings['tts']]) => {
    onSettingsChange({ tts: { ...settings.tts, [key]: value } });
  };

  const patchRecognition = (key: keyof AppSettings['recognition'], value: number) => {
    onSettingsChange({ recognition: { ...settings.recognition, [key]: value } });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Settings panel"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="settings-panel relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-gray-900 border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-white/10 z-10">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label="Close settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* ── Sign Language ─────────────────────────── */}
          <section aria-labelledby="settings-language">
            <h3 id="settings-language" className="settings-section-label">Sign Language</h3>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 rounded-lg bg-white/5 border border-white/10 px-4 py-3 flex items-center gap-3">
                <span className="text-2xl" aria-hidden>🇺🇸</span>
                <div>
                  <p className="text-sm font-medium text-white">ASL — American Sign Language</p>
                  <p className="text-xs text-gray-500">Geometric classifier · {SUPPORTED_SIGNS.length} signs supported</p>
                </div>
              </div>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <p className="text-xs text-violet-300 leading-relaxed">
                <strong>Demo Recognition Mode:</strong> This uses a geometric hand-shape classifier.
                Recognition accuracy varies by lighting, camera angle, and hand size.
                A trained neural network can be plugged in by replacing <code className="font-mono bg-white/10 px-1 rounded">signClassifier.ts</code>.
              </p>
            </div>
          </section>

          {/* ── Recognition ─────────────────────────── */}
          <section aria-labelledby="settings-recognition">
            <h3 id="settings-recognition" className="settings-section-label">Recognition</h3>
            <div className="mt-3 space-y-4">
              <SliderField
                id="setting-confidence"
                label="Confidence Threshold"
                value={settings.recognition.confidenceThreshold}
                min={0.5} max={0.95} step={0.05}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => patchRecognition('confidenceThreshold', v)}
              />
              <SliderField
                id="setting-hold"
                label="Hold Duration"
                value={settings.recognition.holdDurationMs}
                min={300} max={2000} step={100}
                format={(v) => `${v}ms`}
                onChange={(v) => patchRecognition('holdDurationMs', v)}
              />
              <SliderField
                id="setting-cooldown"
                label="Repeat Cooldown"
                value={settings.recognition.cooldownMs}
                min={500} max={5000} step={250}
                format={(v) => `${v}ms`}
                onChange={(v) => patchRecognition('cooldownMs', v)}
              />
            </div>
          </section>

          {/* ── Display ─────────────────────────── */}
          <section aria-labelledby="settings-display">
            <h3 id="settings-display" className="settings-section-label">Display</h3>
            <div className="mt-3 space-y-3">
              <ToggleField
                id="setting-landmarks"
                label="Show Hand Landmarks"
                checked={settings.showLandmarks}
                onChange={(v) => patch('showLandmarks', v)}
              />
              <ToggleField
                id="setting-confidence-display"
                label="Show Confidence Score"
                checked={settings.showConfidence}
                onChange={(v) => patch('showConfidence', v)}
              />
            </div>
          </section>

          {/* ── Speech ─────────────────────────── */}
          <section aria-labelledby="settings-speech">
            <h3 id="settings-speech" className="settings-section-label">Speech</h3>
            <div className="mt-3 space-y-4">
              <ToggleField
                id="setting-auto-speak"
                label="Auto-speak on sentence completion"
                checked={settings.tts.autoSpeak}
                onChange={(v) => patchTts('autoSpeak', v)}
              />
              {voices.length > 0 && (
                <div>
                  <label htmlFor="setting-voice" className="settings-field-label">Voice</label>
                  <select
                    id="setting-voice"
                    value={settings.tts.voiceURI}
                    onChange={(e) => patchTts('voiceURI', e.target.value)}
                    className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">Default voice</option>
                    {voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <SliderField
                id="setting-rate"
                label="Speed"
                value={settings.tts.rate}
                min={0.5} max={2.0} step={0.1}
                format={(v) => `${v.toFixed(1)}x`}
                onChange={(v) => patchTts('rate', v)}
              />
              <SliderField
                id="setting-pitch"
                label="Pitch"
                value={settings.tts.pitch}
                min={0.5} max={2.0} step={0.1}
                format={(v) => v.toFixed(1)}
                onChange={(v) => patchTts('pitch', v)}
              />
              <SliderField
                id="setting-volume"
                label="Volume"
                value={settings.tts.volume}
                min={0.1} max={1.0} step={0.1}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={(v) => patchTts('volume', v)}
              />
            </div>
          </section>

          {/* ── Camera ─────────────────────────── */}
          {cameras.length > 0 && (
            <section aria-labelledby="settings-camera">
              <h3 id="settings-camera" className="settings-section-label">Camera</h3>
              <div className="mt-3">
                <label htmlFor="setting-camera-device" className="settings-field-label">Device</label>
                <select
                  id="setting-camera-device"
                  value={settings.cameraDeviceId}
                  onChange={(e) => patch('cameraDeviceId', e.target.value)}
                  className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Default camera</option>
                  {cameras.map((c) => (
                    <option key={c.deviceId} value={c.deviceId}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          )}

          {/* ── Privacy ─────────────────────────── */}
          <section aria-labelledby="settings-privacy">
            <h3 id="settings-privacy" className="settings-section-label">Privacy</h3>
            <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-xs text-emerald-300 leading-relaxed">
                🔒 Camera frames are processed <strong>locally in your browser</strong> and are never
                uploaded to any server. All inference runs client-side using WebAssembly.
              </p>
            </div>
          </section>

          {/* ── Supported Signs ─────────────────── */}
          <section aria-labelledby="settings-signs">
            <h3 id="settings-signs" className="settings-section-label">Supported Signs ({SUPPORTED_SIGNS.length})</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUPPORTED_SIGNS.map((s) => (
                <span
                  key={s.sign}
                  className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-gray-300"
                >
                  {s.label}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function SliderField({
  id, label, value, min, max, step, format, onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="settings-field-label">{label}</label>
        <span className="text-xs text-violet-300 font-mono">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="settings-slider w-full"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={format(value)}
      />
      <div className="flex justify-between text-xs text-gray-600 mt-0.5">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
}

function ToggleField({
  id, label, checked, onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-3 cursor-pointer group">
      <div className="relative">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
          role="switch"
          aria-checked={checked}
        />
        <div
          className={`toggle-track w-10 h-5 rounded-full transition-colors ${
            checked ? 'bg-violet-500' : 'bg-white/10'
          }`}
        >
          <div
            className={`toggle-thumb absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </div>
      </div>
      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{label}</span>
    </label>
  );
}
