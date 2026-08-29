export interface SpeechOptions {
  voiceURI?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export interface VoiceOption {
  name: string;
  voiceURI: string;
  lang: string;
  localService: boolean;
}

export class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private supported = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.supported = true;
    }
  }

  isSupported(): boolean {
    return this.supported;
  }

  getVoices(): VoiceOption[] {
    if (!this.synth) return [];
    return this.synth.getVoices().map((v) => ({
      name: v.name,
      voiceURI: v.voiceURI,
      lang: v.lang,
      localService: v.localService,
    }));
  }

  speak(text: string, opts: SpeechOptions = {}): void {
    if (!this.synth || !text.trim()) return;

    // Cancel any ongoing speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Set voice
    if (opts.voiceURI) {
      const voices = this.synth.getVoices();
      const voice = voices.find((v) => v.voiceURI === opts.voiceURI);
      if (voice) utterance.voice = voice;
    }

    utterance.rate   = opts.rate   ?? 1.0;
    utterance.pitch  = opts.pitch  ?? 1.0;
    utterance.volume = opts.volume ?? 1.0;

    this.synth.speak(utterance);
  }

  stop(): void {
    this.synth?.cancel();
  }

  isSpeaking(): boolean {
    return this.synth?.speaking ?? false;
  }

  /** Listen for voice list changes (needed in Chrome which loads voices async) */
  onVoicesChanged(callback: () => void): () => void {
    if (!this.synth) return () => {};
    this.synth.addEventListener('voiceschanged', callback);
    return () => this.synth?.removeEventListener('voiceschanged', callback);
  }
}
