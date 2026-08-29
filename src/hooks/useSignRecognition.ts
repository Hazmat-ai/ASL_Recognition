import { useState, useRef, useCallback, useEffect } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { createSignClassifier } from '../models/signClassifier';
import { TemporalSmoother } from '../utils/smoothing';
import { SentenceBuilder } from '../utils/sentenceBuilder';
import type { SignPrediction, SentenceWord, RecognitionSettings } from '../types/sign';
import { NO_PREDICTION } from '../types/sign';

interface UseSignRecognitionOptions {
  settings: RecognitionSettings;
  enabled: boolean;
  onWordAccepted?: (word: SentenceWord) => void;
}

const classifier = createSignClassifier();
const smoother = new TemporalSmoother();
const sentenceBuilder = new SentenceBuilder();

export function useSignRecognition({ settings, enabled, onWordAccepted }: UseSignRecognitionOptions) {
  const [currentPrediction, setCurrentPrediction] = useState<SignPrediction>(NO_PREDICTION);
  const [holdProgress, setHoldProgress] = useState(0);
  const [words, setWords] = useState<SentenceWord[]>([]);
  const [handsDetected, setHandsDetected] = useState(false);

  const classifierRef = useRef(classifier);
  const smootherRef   = useRef(smoother);
  const builderRef    = useRef(sentenceBuilder);
  const settingsRef   = useRef(settings);
  settingsRef.current = settings;

  // Update smoother options when settings change
  useEffect(() => {
    smootherRef.current.updateOptions({
      holdDurationMs: settings.holdDurationMs,
      cooldownMs: settings.cooldownMs,
    });
  }, [settings.holdDurationMs, settings.cooldownMs]);

  const processResult = useCallback((result: HandLandmarkerResult) => {
    if (!enabled) return;

    const hasHands = result.landmarks && result.landmarks.length > 0;
    setHandsDetected(hasHands);

    if (!hasHands) {
      smootherRef.current.reset();
      setCurrentPrediction(NO_PREDICTION);
      setHoldProgress(0);
      return;
    }

    // Use the first detected hand's landmarks
    const landmarks = result.landmarks[0];
    const prediction = classifierRef.current.recognize(
      landmarks.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z })),
    );

    // Only pass predictions above the confidence threshold to the smoother
    const filteredPrediction =
      prediction.confidence >= settingsRef.current.confidenceThreshold
        ? prediction
        : NO_PREDICTION;

    // Update live display (before smoothing)
    if (prediction.sign !== 'NONE') {
      setCurrentPrediction(prediction);
    } else {
      setCurrentPrediction(NO_PREDICTION);
    }

    const now = Date.now();
    const accepted = smootherRef.current.feed(filteredPrediction, now);
    setHoldProgress(smootherRef.current.getHoldProgress(now));

    if (accepted) {
      const word = builderRef.current.addWord(accepted.sign, accepted.displayLabel);
      setWords(builderRef.current.getWords());
      onWordAccepted?.(word);
    }
  }, [enabled, onWordAccepted]);

  const undo = useCallback(() => {
    builderRef.current.undo();
    setWords(builderRef.current.getWords());
  }, []);

  const clear = useCallback(() => {
    builderRef.current.clear();
    smootherRef.current.reset();
    setWords([]);
    setCurrentPrediction(NO_PREDICTION);
    setHoldProgress(0);
  }, []);

  const getText = useCallback(() => builderRef.current.getText(), []);
  const getSpeechText = useCallback(() => builderRef.current.getSpeechText(), []);

  // Override words from manual edit
  const setManualText = useCallback((text: string) => {
    builderRef.current.clear();
    if (text.trim()) {
      text.trim().split(' ').filter(Boolean).forEach((w) => {
        builderRef.current.addWord(w.toUpperCase(), w);
      });
    }
    setWords(builderRef.current.getWords());
  }, []);

  return {
    processResult,
    currentPrediction,
    holdProgress,
    words,
    handsDetected,
    undo,
    clear,
    getText,
    getSpeechText,
    setManualText,
  };
}
