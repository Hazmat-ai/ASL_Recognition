import type { SignPrediction } from '../types/sign';
import { NO_PREDICTION } from '../types/sign';

interface SmoothingOptions {
  holdDurationMs: number;   // how long the same sign must be held before acceptance
  cooldownMs: number;       // how long before the same sign can be accepted again
  windowSize: number;       // rolling window of predictions
}

const DEFAULT_OPTIONS: SmoothingOptions = {
  holdDurationMs: 800,
  cooldownMs: 1500,
  windowSize: 10,
};

interface PredictionEntry {
  sign: string;
  confidence: number;
  timestamp: number;
}

export class TemporalSmoother {
  private window: PredictionEntry[] = [];
  private holdStart: number | null = null;
  private currentHeldSign: string = 'NONE';
  private lastAcceptedSign: string = 'NONE';
  private lastAcceptedAt: number = 0;
  private opts: SmoothingOptions;

  constructor(opts: Partial<SmoothingOptions> = {}) {
    this.opts = { ...DEFAULT_OPTIONS, ...opts };
  }

  updateOptions(opts: Partial<SmoothingOptions>): void {
    this.opts = { ...this.opts, ...opts };
  }

  /**
   * Feed a new prediction from the classifier.
   * Returns a SignPrediction if a sign has been held long enough and passed cooldown,
   * otherwise returns null (no new word should be added).
   */
  feed(prediction: SignPrediction, now: number = Date.now()): SignPrediction | null {
    // Update rolling window
    this.window.push({ sign: prediction.sign, confidence: prediction.confidence, timestamp: now });
    const cutoff = now - this.opts.holdDurationMs * 2;
    this.window = this.window.filter((e) => e.timestamp > cutoff);

    if (prediction.sign === 'NONE') {
      this.holdStart = null;
      this.currentHeldSign = 'NONE';
      return null;
    }

    // Dominant sign in the window
    const dominant = this.getDominantSign();
    if (!dominant || dominant.sign === 'NONE') {
      this.holdStart = null;
      this.currentHeldSign = 'NONE';
      return null;
    }

    // Detect sign change
    if (dominant.sign !== this.currentHeldSign) {
      this.currentHeldSign = dominant.sign;
      this.holdStart = now;
    }

    // Check hold duration
    if (this.holdStart === null) {
      this.holdStart = now;
    }
    const heldMs = now - this.holdStart;
    if (heldMs < this.opts.holdDurationMs) {
      return null;  // still holding, not yet accepted
    }

    // Check cooldown (same sign)
    const sameCooldown =
      dominant.sign === this.lastAcceptedSign &&
      now - this.lastAcceptedAt < this.opts.cooldownMs;
    if (sameCooldown) {
      return null;
    }

    // Accept!
    this.lastAcceptedSign = dominant.sign;
    this.lastAcceptedAt = now;
    this.holdStart = now; // reset hold start after acceptance so it needs to be held again

    return {
      sign: dominant.sign,
      confidence: dominant.confidence,
      displayLabel: prediction.displayLabel,
    };
  }

  /** Current hold progress 0–1 for UI progress indicator */
  getHoldProgress(now: number = Date.now()): number {
    if (this.holdStart === null || this.currentHeldSign === 'NONE') return 0;
    return Math.min(1, (now - this.holdStart) / this.opts.holdDurationMs);
  }

  /** Best current prediction (for live display, not acceptance) */
  getCurrentPrediction(): SignPrediction {
    const dominant = this.getDominantSign();
    if (!dominant) return NO_PREDICTION;
    return {
      sign: dominant.sign,
      confidence: dominant.confidence,
      displayLabel: dominant.sign,
    };
  }

  reset(): void {
    this.window = [];
    this.holdStart = null;
    this.currentHeldSign = 'NONE';
    this.lastAcceptedSign = 'NONE';
    this.lastAcceptedAt = 0;
  }

  private getDominantSign(): { sign: string; confidence: number } | null {
    if (this.window.length === 0) return null;

    // Vote by count, weight by confidence
    const votes: Record<string, { count: number; totalConf: number }> = {};
    for (const entry of this.window) {
      if (!votes[entry.sign]) votes[entry.sign] = { count: 0, totalConf: 0 };
      votes[entry.sign].count += 1;
      votes[entry.sign].totalConf += entry.confidence;
    }

    let best: { sign: string; confidence: number } | null = null;
    for (const [sign, data] of Object.entries(votes)) {
      const avgConf = data.totalConf / data.count;
      if (!best || data.count > votes[best.sign]?.count || avgConf > best.confidence) {
        best = { sign, confidence: avgConf };
      }
    }
    return best;
  }
}
