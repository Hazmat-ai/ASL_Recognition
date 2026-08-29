import { useState, useEffect, useCallback, useRef } from 'react';
import { SpeechService } from '../services/speechService';
import type { TtsSettings } from '../types/sign';
import type { VoiceOption } from '../services/speechService';

const speechService = new SpeechService();

export function useSpeech(settings: TtsSettings) {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported] = useState(() => speechService.isSupported());
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
    speechService.speak(text, {
      voiceURI: settingsRef.current.voiceURI,
      rate:     settingsRef.current.rate,
      pitch:    settingsRef.current.pitch,
      volume:   settingsRef.current.volume,
    });
    setIsSpeaking(true);
    // Poll speaking state
    const poll = setInterval(() => {
      if (!speechService.isSpeaking()) {
        setIsSpeaking(false);
        clearInterval(poll);
      }
    }, 200);
  }, [isSupported]);

  const stop = useCallback(() => {
    speechService.stop();
    setIsSpeaking(false);
  }, []);

  return { voices, isSpeaking, isSupported, speak, stop };
}
