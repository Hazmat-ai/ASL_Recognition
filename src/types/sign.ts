// ─── Core landmark types ─────────────────────────────────────────────────────

/** A single 3-D hand landmark as returned by MediaPipe Tasks Vision */
export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

/** Full result for one detected hand */
export interface HandResult {
  landmarks: HandLandmark[];
  /** 'Left' or 'Right' as seen from the camera (mirrored from user's perspective) */
  handedness: 'Left' | 'Right';
}

// ─── Classification types ────────────────────────────────────────────────────

/** Output of the sign classifier for a single frame */
export interface SignPrediction {
  sign: string;          // e.g. "HELLO", "A", "THANK_YOU", "NONE"
  confidence: number;    // 0.0 – 1.0
  displayLabel: string;  // human-readable, e.g. "Hello", "Thank You"
}

/** Nothing recognised */
export const NO_PREDICTION: SignPrediction = {
  sign: 'NONE',
  confidence: 0,
  displayLabel: '',
};

// ─── Detection / app state ───────────────────────────────────────────────────

export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'denied'
  | 'no-camera'
  | 'error';

export type HandStatus = 'none' | 'detected' | 'recognizing' | 'accepted';

export type ModelStatus = 'loading' | 'ready' | 'error';

export interface DetectionStatus {
  camera: CameraStatus;
  hand: HandStatus;
  model: ModelStatus;
}

// ─── Sentence / word types ────────────────────────────────────────────────────

export interface SentenceWord {
  id: string;
  text: string;       // raw sign label, e.g. "HELLO"
  display: string;    // display form, e.g. "Hello"
  timestamp: number;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface TtsSettings {
  voiceURI: string;
  rate: number;    // 0.1 – 2.0
  pitch: number;   // 0.0 – 2.0
  volume: number;  // 0.0 – 1.0
  autoSpeak: boolean;
}

export interface RecognitionSettings {
  confidenceThreshold: number;  // 0.0 – 1.0  (default 0.70)
  holdDurationMs: number;       // ms sign must be held (default 800)
  cooldownMs: number;           // ms between same-sign repeats (default 1500)
}

export interface AppSettings {
  tts: TtsSettings;
  recognition: RecognitionSettings;
  cameraDeviceId: string;
  showLandmarks: boolean;
  showConfidence: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  tts: {
    voiceURI: '',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    autoSpeak: false,
  },
  recognition: {
    confidenceThreshold: 0.70,
    holdDurationMs: 800,
    cooldownMs: 1500,
  },
  cameraDeviceId: '',
  showLandmarks: true,
  showConfidence: true,
};
