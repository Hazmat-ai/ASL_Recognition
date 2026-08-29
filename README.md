# ✋ ASL Sign Language Translator

A real-time **American Sign Language (ASL)** translator that runs entirely in your browser. Uses your webcam, MediaPipe for hand tracking, and a geometric sign classifier to recognize hand shapes and convert them into text subtitles with optional text-to-speech.

---

## Features

- 🎥 **Real-time webcam hand tracking** via MediaPipe Tasks Vision
- ✋ **Hand skeleton overlay** with landmark visualization
- 🧠 **Geometric sign classifier** — real computer-vision pipeline, not random/fake output
- ⏱ **Temporal smoothing** — signs must be held for ~800ms before acceptance
- 📝 **Sentence builder** — accumulates recognized signs into a subtitle
- ✏️ **Editable subtitles** — click to correct any word
- 🔊 **Text-to-speech** via Web Speech API with voice/rate/pitch/volume control
- ↩️ **Undo / Clear** controls
- ⚙️ **Settings panel** — confidence threshold, hold duration, camera, TTS
- 🔒 **100% client-side** — no camera frames are uploaded anywhere
- ♿ **Accessible** — ARIA labels, keyboard navigation, high-contrast dark theme

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 8 |
| Styling | Tailwind CSS v4 |
| Hand Tracking | `@mediapipe/tasks-vision` HandLandmarker |
| Sign Classifier | Custom geometric classifier (landmark angles + extension ratios) |
| Text-to-Speech | Web Speech API (`SpeechSynthesis`) |
| Camera | `MediaDevices.getUserMedia` |

---

## How Sign Recognition Works

```
Camera frame
    ↓
MediaPipe HandLandmarker (WASM, GPU delegate)
    ↓
21 3-D hand landmarks
    ↓
Normalize (translate wrist to origin, scale by palm length)
    ↓
Geometric classifier
  → Finger extension ratios (tip-to-wrist / finger length)
  → Thumb pinch distances
  → Thumb-index angle
  → Per-sign match function → confidence 0–1
    ↓
Temporal smoother (voting window, hold-duration gate, cooldown)
    ↓
Accepted prediction → Sentence builder
    ↓
Subtitle display → Text-to-Speech
```

The classifier is abstracted behind a `SignRecognitionModel` interface:

```ts
interface SignRecognitionModel {
  recognize(landmarks: HandLandmark[]): SignPrediction;
}
```

This means you can replace `GeometricSignClassifier` with a TensorFlow.js neural network or any other model without touching any other file.

---

## Supported Signs (v1 — 22 total)

### Vocabulary Signs
| Sign | Display |
|---|---|
| `HELLO` | Hello |
| `THANK_YOU` | Thank You |
| `YES` | Yes |
| `NO` | No |
| `PLEASE` | Please |
| `SORRY` | Sorry |
| `HELP` | Help |
| `I_LOVE_YOU` | I Love You |
| `MY` | My |
| `GOOD` | Good |
| `BAD` | Bad |
| `STOP` | Stop |
| `MORE` | More |
| `WANT` | Want |
| `NEED` | Need |

### Fingerspelling (Static Letters)
`A · B · C · D · L · O · V · W · Y`

> **Note:** Dynamic signs (involving hand motion) are not yet supported. The geometric classifier works on static hand shapes only.

---

## Installation

```bash
# Clone / open the project folder
cd "Sign Language"

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open **http://localhost:5173** in Chrome or Edge.

> ⚠️ Camera access requires HTTPS or localhost. The dev server serves over localhost automatically.

---

## Running Locally

```bash
npm run dev      # Start development server (localhost:5173)
npm run build    # Production build (dist/)
npm run preview  # Preview production build
```

---

## Model Information

**Model:** MediaPipe Hand Landmarker (`hand_landmarker.task`)
- Loaded from Google's CDN on first use (~5 MB)
- Runs via WebAssembly with GPU acceleration
- Detects up to 2 hands simultaneously
- Outputs 21 3-D landmarks per hand

**Classifier:** Custom `GeometricSignClassifier`
- No pre-trained weights — uses geometric heuristics
- Computes finger extension ratios and thumb angles
- Each sign has a hand-crafted match function
- Returns confidence score 0–1
- Configurable threshold (default 70%)

---

## Limitations

1. **Static signs only** — dynamic ASL signs involving motion (e.g., "PLEASE" wrist circles, "SORRY" chest circles) are detected at their peak static pose only
2. **Geometric accuracy** — similar hand shapes (e.g., ASL `A` vs `S`) may be confused; a trained MLP/CNN would be significantly more accurate
3. **Lighting dependent** — MediaPipe works best in good, even lighting with high contrast
4. **Single hand** — the classifier uses only the first detected hand
5. **Not a complete ASL dictionary** — only 22 signs are supported in v1

---

## Privacy

> **Camera frames are processed locally in your browser and are never uploaded to any server.**
>
> - MediaPipe runs via WebAssembly in your browser tab
> - The hand landmark model is loaded once from Google's public CDN
> - No video data, landmark data, or text leaves your device

---

## Future Improvements

- [ ] Train a neural network (MLP/CNN) on ASL landmark datasets for higher accuracy
- [ ] Support dynamic/motion-based signs using LSTM over landmark sequences
- [ ] Two-handed sign recognition
- [ ] Facial expression + body pose (MediaPipe Holistic)
- [ ] Full ASL alphabet (26 letters)
- [ ] More vocabulary (100+ signs)
- [ ] Sentence-level grammar correction (AI)
- [ ] Multiple sign languages (BSL, ISL, etc.)
- [ ] Mobile touch support
- [ ] Offline model bundling (no CDN dependency)
- [ ] Custom user-trainable signs
- [ ] Conversation mode (speaker + signer)
- [ ] Auto-speak mode

---

## Project Structure

```
src/
├── types/
│   └── sign.ts              ← All shared TypeScript types
├── models/
│   └── signClassifier.ts    ← SignRecognitionModel interface + GeometricSignClassifier
├── utils/
│   ├── confidence.ts        ← Landmark normalization, finger geometry
│   ├── smoothing.ts         ← TemporalSmoother (hold-duration + cooldown)
│   └── sentenceBuilder.ts   ← Word accumulation with undo/clear
├── services/
│   ├── cameraService.ts     ← getUserMedia wrapper
│   ├── speechService.ts     ← SpeechSynthesis wrapper
│   └── recognitionService.ts← MediaPipe HandLandmarker + rAF loop
├── hooks/
│   ├── useCamera.ts         ← Camera state management
│   ├── useHandTracking.ts   ← MediaPipe initialization + tracking
│   ├── useSignRecognition.ts← Pipeline: classify → smooth → build sentence
│   └── useSpeech.ts         ← TTS with voice enumeration
├── components/
│   ├── CameraView.tsx       ← Video element + overlay container
│   ├── HandOverlay.tsx      ← Canvas landmark drawing
│   ├── SubtitleDisplay.tsx  ← Editable sentence + detection badge
│   ├── Controls.tsx         ← Start/Stop/Speak/Undo/Clear toolbar
│   ├── StatusIndicator.tsx  ← Camera/Model/Hand status pills
│   └── Settings.tsx         ← Full settings modal
└── App.tsx                  ← Root component, global state
```
