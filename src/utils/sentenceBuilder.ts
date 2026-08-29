import type { SentenceWord } from '../types/sign';

let wordIdCounter = 0;

export class SentenceBuilder {
  private words: SentenceWord[] = [];

  addWord(sign: string, display: string): SentenceWord {
    const word: SentenceWord = {
      id: `word-${++wordIdCounter}`,
      text: sign,
      display,
      timestamp: Date.now(),
    };
    this.words.push(word);
    return word;
  }

  undo(): SentenceWord | null {
    return this.words.pop() ?? null;
  }

  clear(): void {
    this.words = [];
  }

  getWords(): SentenceWord[] {
    return [...this.words];
  }

  getText(): string {
    return this.words.map((w) => w.display).join(' ');
  }

  /** Returns a grammatically-friendly version for TTS */
  getSpeechText(): string {
    const text = this.getText();
    if (!text) return '';
    // Capitalise first letter, add period
    return text.charAt(0).toUpperCase() + text.slice(1) + '.';
  }

  get length(): number {
    return this.words.length;
  }
}
