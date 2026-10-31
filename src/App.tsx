import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { CameraView } from './components/CameraView';
import { Settings } from './components/Settings';
import { StatusIndicator } from './components/StatusIndicator';
import { useCamera } from './hooks/useCamera';
import { useHandTracking } from './hooks/useHandTracking';
import { useSignRecognition } from './hooks/useSignRecognition';
import { useSpeech } from './hooks/useSpeech';
import { SUPPORTED_SIGNS } from './models/signClassifier';
import type { AppSettings, HandStatus } from './types/sign';
import { useProgress } from './hooks/useProgress';
import { request } from './services/api';
import type { LessonContent } from './types/lesson';
import { DEFAULT_SETTINGS } from './types/sign';

type Section = 'Learn' | 'Practice' | 'Explore' | 'Partner' | 'Progress';
type Lesson = (typeof SUPPORTED_SIGNS)[number];
const NAV: Section[] = ['Learn', 'Practice', 'Explore', 'Partner', 'Progress'];

function App() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [section, setSection] = useState<Section>('Learn');
  const [selectedSign, setSelectedSign] = useState('HELLO');
  const { learned, setLearned, status:syncStatus, retry:retrySync, exportProgress, reset, deleteSession } = useProgress();
  const [catalog, setCatalog] = useState<LessonContent[]>([]);
  const [notice, setNotice] = useState('');
  const [partnerTurn, setPartnerTurn] = useState(1);
  const [handResult, setHandResult] = useState<HandLandmarkerResult | null>(null);

  const { status: cameraStatus, devices: cameras, videoRef, startCamera, stopCamera, enumerate } = useCamera();
  const cameraActive = cameraStatus === 'active';
  const activeLesson = useMemo(
    () => SUPPORTED_SIGNS.find((lesson) => lesson.sign === selectedSign) ?? SUPPORTED_SIGNS[0],
    [selectedSign],
  );

  useEffect(() => { request<{lessons:LessonContent[]}>('/api/catalog').then(data=>setCatalog(data.lessons)).catch(()=>undefined); }, []);
  useEffect(() => { if(section !== 'Practice') { stopCamera(); setHandResult(null); } },[section,stopCamera]);

  const onWordAccepted = useCallback((word: { text: string; display: string }) => {
    if (word.text === activeLesson.sign) {
      setLearned((previous) => previous.includes(word.text) ? previous : [...previous, word.text]);
      setNotice(`Nice work — ${word.display} is in your practice collection.`);
    } else {
      setNotice(`The camera matched ${word.display}. Try the selected sign when you’re ready.`);
    }
  }, [activeLesson.sign]);

  const { processResult, currentPrediction, holdProgress, handsDetected } = useSignRecognition({
    settings: settings.recognition,
    enabled: cameraActive && section === 'Practice',
    resetKey: activeLesson.sign,
    onWordAccepted,
  });

  const processResultRef = useRef(processResult);
  processResultRef.current = processResult;
  const stableCallback = useCallback((result: HandLandmarkerResult) => {
    setHandResult(result);
    processResultRef.current(result);
  }, []);
  const { modelStatus } = useHandTracking(videoRef, cameraActive && section === 'Practice', stableCallback);
  const { voices, isSpeaking, isSupported: speechSupported, speak, stop: stopSpeech } = useSpeech(settings.tts);

  useEffect(() => {
    if (section !== 'Practice') stopSpeech();
    else if (settings.tts.autoSpeak) speak(activeLesson.label);
  }, [activeLesson.sign, section, settings.tts.autoSpeak, speak, stopSpeech]);

  const handStatus: HandStatus = !handsDetected
    ? 'none'
    : currentPrediction.sign !== 'NONE' && holdProgress >= 1
      ? 'accepted'
      : currentPrediction.sign !== 'NONE' ? 'recognizing' : 'detected';

  const startCameraForPractice = useCallback(async () => {
    await enumerate();
    await startCamera(settings.cameraDeviceId || undefined);
  }, [enumerate, startCamera, settings.cameraDeviceId]);

  const openPractice = (sign: string) => {
    setSelectedSign(sign);
    setNotice('');
    setSection('Practice');
  };
  const resetProgress = () => { if(window.confirm('Reset all saved practice progress?')) reset(); };

  return (
    <div className="learning-app min-h-screen text-slate-100">
      <header className="learning-header sticky top-0 z-40 border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button className="flex items-center gap-3 text-left" onClick={() => setSection('Learn')} aria-label="Palm home">
            <span className="brand-mark" aria-hidden="true">✋</span>
            <span>
              <span className="block text-base font-bold tracking-tight text-white">palm<span className="text-rose-300">.</span></span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">learn ASL together</span>
            </span>
          </button>
          <nav className="learning-nav" aria-label="Main navigation">
            {NAV.map((item) => (
              <button key={item} className={`nav-link ${section === item ? 'is-active' : ''}`} onClick={() => setSection(item)} aria-current={section === item ? 'page' : undefined}>
                {item}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs text-emerald-200 sm:inline-flex">Camera stays on this device</span>
            <button className="icon-button" onClick={() => setSettingsOpen(true)} aria-label="Open settings" title="Settings">⚙</button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400" role="status"><span>{syncStatus}</span><div className="flex gap-4"><button onClick={retrySync}>Retry sync</button><button onClick={exportProgress}>Export progress</button><button onClick={()=>{if(window.confirm('Delete this session and its saved progress?')) void deleteSession();}}>Delete session data</button></div></div>
        {section === 'Learn' && (
          <LearnHome learned={learned} onPractice={openPractice} onExplore={() => setSection('Explore')} onPartner={() => setSection('Partner')} />
        )}
        {section === 'Explore' && <ExplorePage learned={learned} onPractice={openPractice} />}
        {section === 'Practice' && (
          <PracticeRoom
            lesson={activeLesson}
            content={catalog.find(item=>item.sign === activeLesson.sign)}
            videoRef={videoRef}
            learned={learned.includes(activeLesson.sign)}
            cameraActive={cameraActive}
            cameraStatus={cameraStatus}
            modelStatus={modelStatus}
            handStatus={handStatus}
            handResult={handResult}
            showLandmarks={settings.showLandmarks}
            currentPrediction={currentPrediction}
            holdProgress={holdProgress}
            handsDetected={handsDetected}
            notice={notice}
            speechSupported={speechSupported}
            isSpeaking={isSpeaking}
            onSpeak={() => speak(activeLesson.label)}
            onStart={startCameraForPractice}
            onStop={() => { stopCamera(); setHandResult(null); }}
            onNext={() => {
              const next = SUPPORTED_SIGNS.find((item) => item.sign !== activeLesson.sign && !learned.includes(item.sign)) ?? SUPPORTED_SIGNS[0];
              openPractice(next.sign);
            }}
          />
        )}
        {section === 'Partner' && (
          <PartnerRoom
            lesson={activeLesson}
            turn={partnerTurn}
            onSwitchTurn={() => setPartnerTurn((turn) => turn === 1 ? 2 : 1)}
            onPick={(sign) => setSelectedSign(sign)}
            onPractice={() => openPractice(activeLesson.sign)}
          />
        )}
        {section === 'Progress' && (
          <ProgressPage learned={learned} onPractice={openPractice} onReset={resetProgress} />
        )}
      </main>

      <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-4 pb-8 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span>ASL is a complete language. Palm’s camera gives limited pose practice, not full translation.</span>
        <details><summary className="cursor-pointer">Privacy and stored data</summary><p className="mt-2 max-w-xl leading-5">Camera frames stay in your browser. The service stores an anonymous session and practised sign IDs for up to 30 days. Local progress remains until reset. Use the controls above to export or delete it. Optional spoken English labels use your device’s speech engine.</p></details>
      </footer>

      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={(patch) => setSettings((previous) => ({ ...previous, ...patch }))}
        voices={voices}
        cameras={cameras}
      />
    </div>
  );
}

function LearnHome({ learned, onPractice, onExplore, onPartner }: { learned: string[]; onPractice: (sign: string) => void; onExplore: () => void; onPartner: () => void }) {
  const nextLesson = SUPPORTED_SIGNS.find((lesson) => !learned.includes(lesson.sign)) ?? SUPPORTED_SIGNS[0];
  const recent = learned.slice(-4).reverse();
  return (
    <div className="space-y-8">
      <section className="hero-card overflow-hidden rounded-[2rem] border border-white/10 p-6 sm:p-10">
        <div className="hero-orbit hero-orbit-one" aria-hidden="true" /><div className="hero-orbit hero-orbit-two" aria-hidden="true" />
        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="eyebrow"><span className="eyebrow-dot" /> A good place to start</div>
            <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.07] tracking-tight text-white sm:text-6xl">Learn a little.<br /><span className="text-rose-200">Say a lot with your hands.</span></h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">Build your ASL practice one sign at a time. Explore a sign, try a camera pose check, and invite someone to learn alongside you.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button className="button-primary" onClick={() => onPractice(nextLesson.sign)}>Start a quick lesson <span aria-hidden="true">→</span></button>
              <button className="button-secondary" onClick={onExplore}>See your practice set</button>
            </div>
            <p className="mt-4 text-xs text-slate-400">Camera practice is optional. No account or video upload required.</p>
          </div>
          <div className="hero-art" aria-label="Illustration of two hands communicating">
            <div className="hero-art-label">LEARNING IS BETTER<br />WHEN WE LEARN TOGETHER</div>
            <span className="hero-hand hero-hand-a" aria-hidden="true">🤟</span>
            <span className="hero-hand hero-hand-b" aria-hidden="true">🫶</span>
            <div className="hero-sticker sticker-a">nice!</div><div className="hero-sticker sticker-b">your turn ↗</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Signs in this practice set" value={String(SUPPORTED_SIGNS.length)} detail="Camera-supported poses" icon="✳" />
        <StatCard label="Signs you’ve practised" value={String(learned.length)} detail="Saved on this device" icon="↗" />
        <StatCard label="Next up" value={nextLesson.label} detail="Pick up where you left off" icon="✋" />
      </section>

      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <SectionHeading eyebrow="Your first steps" title="Choose a sign to practise" action="Browse all" onAction={onExplore} />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SUPPORTED_SIGNS.slice(0, 6).map((lesson, index) => (
              <button className="lesson-card group" key={lesson.sign} onClick={() => onPractice(lesson.sign)}>
                <span className={`lesson-glyph glyph-${index % 4}`} aria-hidden="true">{lesson.sign.startsWith('LETTER_') ? lesson.label : '✋'}</span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="flex items-center gap-2"><strong className="truncate text-sm text-white">{lesson.label}</strong>{learned.includes(lesson.sign) && <span className="check-pill">Practised</span>}</span>
                  <span className="mt-1 block text-xs text-slate-400">{lesson.sign.startsWith('LETTER_') ? 'Fingerspelling · still pose' : 'Vocabulary · pose practice'}</span>
                </span>
                <span className="text-slate-400 transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </div>
        <aside className="soft-panel rounded-3xl p-6 sm:p-7">
          <SectionHeading eyebrow="Keep it social" title="Practise together" />
          <div className="partner-illustration mt-5"><span>🙌</span><span>🗯️</span><span>🙌</span></div>
          <p className="mt-5 text-sm leading-6 text-slate-300">Take turns signing and guessing. Keep the camera feedback as a helpful cue, then talk through what you noticed together.</p>
          <button className="button-secondary mt-5 w-full" onClick={onPartner}>Open partner practice <span aria-hidden="true">→</span></button>
          <div className="mt-5 rounded-2xl border border-white/8 bg-black/10 p-4 text-xs leading-5 text-slate-400"><strong className="text-slate-200">A note on learning:</strong> Sign movement, facial expression, and context can matter. A camera pose match is not a correctness check for full ASL.</div>
        </aside>
      </section>
      {recent.length > 0 && <section className="soft-panel rounded-3xl p-6"><SectionHeading eyebrow="A little progress adds up" title="Recently practised" /><div className="mt-4 flex flex-wrap gap-2">{recent.map((sign) => <span className="saved-chip" key={sign}>{SUPPORTED_SIGNS.find((item) => item.sign === sign)?.label ?? sign} <span aria-hidden="true">✓</span></span>)}</div></section>}
    </div>
  );
}

function PracticeRoom({ lesson, content, videoRef, learned, cameraActive, cameraStatus, modelStatus, handStatus, handResult, showLandmarks, currentPrediction, holdProgress, handsDetected, notice, speechSupported, isSpeaking, onSpeak, onStart, onStop, onNext }: {
  lesson: Lesson; content?: LessonContent; videoRef: React.RefObject<HTMLVideoElement | null>; learned: boolean; cameraActive: boolean; cameraStatus: 'idle' | 'requesting' | 'active' | 'denied' | 'no-camera' | 'error';
  modelStatus: 'loading' | 'ready' | 'error'; handStatus: HandStatus; handResult: HandLandmarkerResult | null; showLandmarks: boolean;
  currentPrediction: { sign: string; displayLabel: string; confidence: number }; holdProgress: number; handsDetected: boolean; notice: string; speechSupported: boolean; isSpeaking: boolean; onSpeak: () => void;
  onStart: () => Promise<void>; onStop: () => void; onNext: () => void;
}) {
  const isMatch = currentPrediction.sign === lesson.sign;
  const instruction = lesson.sign.startsWith('LETTER_')
    ? 'Use a trusted fingerspelling demonstration for this letter, then hold your hand clearly in the frame.'
    : 'Review a complete ASL demonstration of this sign, then try the camera pose exercise.';
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow-text">GUIDED PRACTICE · {lesson.sign.startsWith('LETTER_') ? 'FINGERSPELLING' : 'VOCABULARY'}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Let’s practise <span className="text-rose-200">{lesson.label}</span></h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">One sign at a time. Use the camera as a pose-practice cue, not as a full ASL translator.</p></div>
        <span className="saved-chip">{learned ? 'Practised before ✓' : 'New to your practice set'}</span>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-3">
          <div className="camera-shell"><CameraView videoRef={videoRef} cameraStatus={cameraStatus} handResult={handResult} showLandmarks={showLandmarks} /></div>
          <StatusIndicator cameraStatus={cameraStatus} handStatus={handStatus} modelStatus={modelStatus} />
          {!cameraActive ? <button className="button-primary w-full sm:w-auto" onClick={onStart}>Turn on camera for practice <span aria-hidden="true">→</span></button> : <button className="button-secondary" onClick={onStop}>Pause camera</button>}
          {modelStatus === 'loading' && <p className="notice notice-info" role="status">Preparing the hand tracking model. The first load may need an internet connection.</p>}
          {modelStatus === 'error' && <p className="notice notice-warn" role="alert">The hand tracking model could not load. Check your connection and try again.</p>}
          {cameraStatus === 'denied' && <p className="notice notice-warn" role="alert">Camera access is blocked. Allow camera access in your browser settings, or keep learning without camera practice.</p>}
          {cameraStatus === 'no-camera' && <p className="notice notice-warn" role="alert">No camera was found. You can still explore the practice set.</p>}
        </section>
        <section className="space-y-4">
          <div className="soft-panel rounded-3xl p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4"><div><p className="eyebrow-text">YOUR PRACTICE CUE</p><h2 className="mt-2 text-2xl font-semibold text-white">{lesson.label}</h2></div><div className="practice-target" aria-hidden="true">{lesson.sign.startsWith('LETTER_') ? lesson.label : '✋'}</div></div>
            <p className="mt-4 text-sm leading-6 text-slate-300">{content?.cue ?? instruction}</p>
            {content?.reviewStatus === 'approved' && content.demoPath && <video className="mt-4 w-full rounded-xl" src={content.demoPath} controls playsInline aria-label={`ASL demonstration: ${lesson.label}`}><track kind="captions" src={content.captionPath ?? undefined} default /></video>}
            {content?.reviewStatus !== 'approved' && <p className="mt-2 text-xs text-amber-200">Instructor demonstration awaiting review. Camera exercises are available as experimental pose practice.</p>}
            {speechSupported && <button className="mt-3 text-xs font-semibold text-rose-200 hover:text-white" onClick={onSpeak}>{isSpeaking ? 'Speaking the English label…' : `Hear the English label “${lesson.label}” ↗`}</button>}
            <div className="mt-5 rounded-2xl border border-amber-200/15 bg-amber-200/[0.06] p-4 text-xs leading-5 text-amber-100/80"><strong className="text-amber-100">What the camera checks:</strong> a still hand pose from the current geometric classifier. It does not assess movement, facial grammar, or whether the sign is being used in context.</div>
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs"><span className="font-medium text-slate-300">{!cameraActive ? 'Camera practice is off' : !handsDetected ? 'Show your hand in the frame' : isMatch ? 'That matches the practice target — hold steady' : currentPrediction.sign !== 'NONE' ? `Camera sees “${currentPrediction.displayLabel}”; target is “${lesson.label}”` : 'Hand found — try a supported pose'}</span><span className="text-slate-400">{cameraActive && isMatch ? `${Math.round(holdProgress * 100)}%` : ''}</span></div>
              <div className="progress-track mt-2"><span style={{ width: `${cameraActive && isMatch ? Math.round(holdProgress * 100) : 0}%` }} /></div>
            </div>
            {notice && <p className="notice notice-success mt-4" role="status" aria-live="polite">{notice}</p>}
            <div className="mt-5 flex flex-wrap gap-2"><button className="button-primary" onClick={onNext}>Try another sign <span aria-hidden="true">→</span></button></div>
          </div>
          <div className="soft-panel rounded-3xl p-5"><p className="eyebrow-text">A GOOD PRACTICE LOOP</p><ol className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-3"><li className="step-pill"><b>01</b> Watch a fluent signer</li><li className="step-pill"><b>02</b> Try the movement yourself</li><li className="step-pill"><b>03</b> Reflect and repeat</li></ol><p className="mt-3 text-xs leading-5 text-slate-400">Demonstration media and lesson notes should be reviewed by fluent ASL signers before this app is used as an instructional reference.</p></div>
        </section>
      </div>
    </div>
  );
}

function PartnerRoom({ lesson, turn, onSwitchTurn, onPick, onPractice }: { lesson: Lesson; turn: number; onSwitchTurn: () => void; onPick: (sign: string) => void; onPractice: () => void }) {
  const [phase, setPhase] = useState<'choose' | 'guess'>('choose');
  const [guess, setGuess] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const options = SUPPORTED_SIGNS.slice(0, 4);
  const switchTurn = () => {
    onSwitchTurn();
    setPhase('choose');
    setGuess(null);
    setRevealed(false);
  };
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><p className="eyebrow-text">PASS & GUESS · ONE DEVICE</p><h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Make room for a teammate.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Take turns choosing a sign, signing it, and guessing together. The signer picks first; the guesser sees the answer only after making a choice.</p></div>
      <div className="partner-card rounded-[2rem] border border-white/10 p-6 sm:p-9">
        <div className="flex flex-wrap items-center justify-between gap-3"><span className="turn-pill">Signer {turn}’s turn</span><button className="button-secondary" onClick={switchTurn}>Switch turns ↔</button></div>
        <div className="my-8 text-center"><span className="partner-big-icon" aria-hidden="true">{phase === 'choose' ? '✋' : revealed ? (lesson.sign.startsWith('LETTER_') ? lesson.label : '✋') : '？'}</span><h2 className="mt-4 text-2xl font-semibold text-white">{phase === 'choose' ? 'Signer: pick a card' : revealed ? lesson.label : 'Guesser: what did you see?'}</h2><p className="mt-2 text-sm text-slate-400">{phase === 'choose' ? 'Let your teammate look away, then choose the sign you’ll demonstrate.' : revealed ? (guess === lesson.sign ? 'You got it — switch roles and try another.' : `The answer was ${lesson.label}. Switch roles and try again.`) : 'Choose the sign you think your teammate demonstrated.'}</p></div>
        {phase === 'choose' ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{options.map((item) => <button key={item.sign} className="guess-card" onClick={() => { onPick(item.sign); setGuess(null); setPhase('guess'); }}>{item.label}</button>)}</div>
        ) : !revealed ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{options.map((item) => <button key={item.sign} className={`guess-card ${guess === item.sign ? 'guess-selected' : ''}`} onClick={() => setGuess(item.sign)}>{item.label}</button>)}</div>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-center gap-3">{phase === 'guess' && !revealed && <button className="button-primary" disabled={!guess} onClick={() => setRevealed(true)}>Reveal the answer</button>}{phase === 'guess' && revealed && <button className="button-primary" onClick={switchTurn}>Next round ↗</button>}<button className="button-secondary" onClick={onPractice}>Try this pose with the camera</button></div>
      </div>
      <p className="text-center text-xs leading-5 text-slate-400">This activity is a turn-taking prompt, not an ASL assessment. The current camera model recognizes a limited set of still poses.</p>
    </div>
  );
}

function ExplorePage({ learned, onPractice }: { learned: string[]; onPractice: (sign: string) => void }) {
  const [query, setQuery] = useState('');
  const filtered = SUPPORTED_SIGNS.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()));
  const words = filtered.filter((item) => !item.sign.startsWith('LETTER_'));
  const letters = filtered.filter((item) => item.sign.startsWith('LETTER_'));
  const grid = (items: typeof SUPPORTED_SIGNS) => <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((item, index) => (
    <button className="lesson-card group" key={item.sign} onClick={() => onPractice(item.sign)}>
      <span className={`lesson-glyph glyph-${index % 4}`} aria-hidden="true">{item.sign.startsWith('LETTER_') ? item.label : '✋'}</span>
      <span className="flex-1 text-left"><strong className="block text-sm text-white">{item.label}</strong><span className="mt-1 block text-xs text-slate-400">{item.sign.startsWith('LETTER_') ? 'Static fingerspelling pose' : 'Camera pose practice'}</span></span>
      {learned.includes(item.sign) && <span className="check-pill">Practised</span>}<span className="text-slate-400" aria-hidden="true">→</span>
    </button>
  ))}</div>;
  return <div className="space-y-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow-text">EXPLORE THE CURRENT MODEL</p><h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">A small set to start with.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Browse every pose the current classifier lists. This is not a complete ASL dictionary, and some signs require movement or context the camera does not assess.</p></div><label className="w-full sm:max-w-xs"><span className="sr-only">Search signs</span><input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-rose-200/50 focus:outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a sign or letter…" /></label></div>
    {words.length > 0 && <section><SectionHeading eyebrow="Vocabulary poses" title="Words to practise" />{grid(words)}</section>}
    {letters.length > 0 && <section><SectionHeading eyebrow="Static fingerspelling" title="Letters in the model" />{grid(letters)}</section>}
    {filtered.length === 0 && <p className="soft-panel rounded-2xl p-6 text-sm text-slate-400">No matching signs. Try a different search.</p>}
    <p className="text-xs leading-5 text-slate-400">The model’s labels are intended for experimenting with pose recognition. Ask fluent ASL signers to review learning materials before treating them as instruction.</p>
  </div>;
}

function ProgressPage({ learned, onPractice, onReset }: { learned: string[]; onPractice: (sign: string) => void; onReset: () => void }) {
  const learnedItems = SUPPORTED_SIGNS.filter((item) => learned.includes(item.sign));
  const remainingItems = SUPPORTED_SIGNS.filter((item) => !learned.includes(item.sign));
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow-text">YOUR PRACTICE COLLECTION</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Progress, one sign at a time.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">This list tracks signs you have held long enough for the current pose classifier to match. It is a practice log, not a measure of ASL fluency.</p></div><button className="button-secondary" onClick={onReset}>Reset saved progress</button></div>
      <div className="progress-summary rounded-3xl p-6 sm:p-8"><span className="text-sm text-slate-300">Practice matches saved on this device</span><div className="mt-2 flex items-end gap-2"><strong className="text-5xl font-semibold text-white">{learnedItems.length}</strong><span className="pb-1 text-slate-400">of {SUPPORTED_SIGNS.length} supported poses</span></div><div className="progress-track mt-5"><span style={{ width: `${SUPPORTED_SIGNS.length ? Math.min(100, learnedItems.length / SUPPORTED_SIGNS.length * 100) : 0}%` }} /></div></div>
      {learnedItems.length > 0 && <section><SectionHeading eyebrow="Nicely done" title="Recently practised" /><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{learnedItems.map((item) => <button className="lesson-card" key={item.sign} onClick={() => onPractice(item.sign)}><span className="lesson-glyph glyph-1">✓</span><span className="flex-1 text-left"><strong className="block text-sm text-white">{item.label}</strong><span className="mt-1 block text-xs text-slate-400">Camera pose match saved</span></span><span aria-hidden="true">→</span></button>)}</div></section>}
      <section><SectionHeading eyebrow="Keep exploring" title="Still in your practice set" /><div className="mt-4 flex flex-wrap gap-2">{remainingItems.map((item) => <button className="saved-chip saved-chip-button" key={item.sign} onClick={() => onPractice(item.sign)}>{item.label} <span aria-hidden="true">→</span></button>)}</div></section>
      <p className="text-xs text-slate-400">Your practice list is stored locally in this browser. Resetting it clears the saved sign names from this device.</p>
    </div>
  );
}

function SectionHeading({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action?: string; onAction?: () => void }) {
  return <div className="flex items-end justify-between gap-3"><div><p className="eyebrow-text">{eyebrow}</p><h2 className="mt-1 text-xl font-semibold tracking-tight text-white">{title}</h2></div>{action && <button className="text-sm font-medium text-rose-200 hover:text-white" onClick={onAction}>{action} →</button>}</div>;
}
function StatCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: string }) {
  return <div className="stat-card rounded-2xl p-4"><div className="flex items-start justify-between"><span className="text-xs font-medium text-slate-400">{label}</span><span className="stat-icon" aria-hidden="true">{icon}</span></div><p className="mt-4 truncate text-2xl font-semibold text-white">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>;
}

export default App;
