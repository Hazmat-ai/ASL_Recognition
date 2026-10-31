import { useState, useEffect, useCallback, useRef } from 'react';
import { SpeechService } from '../services/speechService';
import type { TtsSettings } from '../types/sign';
import type { VoiceOption } from '../services/speechService';

const speechService = new SpeechService();

export function useSpeech(settings: TtsSettings) {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported] = useState(() => speechService.isSupported());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    const load = () => setVoices(speechService.getVoices());
    load(); // immediate load for Firefox
    const cleanup = speechService.onVoicesChanged(load); // Chrome async load
    return cleanup;
  }, []);

  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim()) return;
    if (pollRef.current !== null) clearInterval(pollRef.current);
    speechService.speak(text, {
      voiceURI: settingsRef.current.voiceURI,
      rate:     settingsRef.current.rate,
      pitch:    settingsRef.current.pitch,
      volume:   settingsRef.current.volume,
    });
    setIsSpeaking(true);
    // Poll speaking state
    pollRef.current = setInterval(() => {
      if (!speechService.isSpeaking()) {
        setIsSpeaking(false);
        if (pollRef.current !== null) clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 200);
  }, [isSupported]);

  const stop = useCallback(() => {
    speechService.stop();
    if (pollRef.current !== null) clearInterval(pollRef.current);
    pollRef.current = null;
    setIsSpeaking(false);
  }, []);

  useEffect(() => { const hidden = () => { if(document.hidden) stop(); }; document.addEventListener('visibilitychange',hidden); return () => document.removeEventListener('visibilitychange',hidden); }, [stop]);

  useEffect(() => () => { speechService.stop(); if (pollRef.current !== null) clearInterval(pollRef.current); }, []);

  return { voices, isSpeaking, isSupported, speak, stop };
}
