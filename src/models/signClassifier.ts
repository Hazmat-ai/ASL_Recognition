import type { HandLandmark, SignPrediction } from '../types/sign';
import { NO_PREDICTION } from '../types/sign';
import {
  normalizeLandmarks,
  getFingerExtensions,
  thumbPinch,
  thumbIndexAngle,
  LM,
} from '../utils/confidence';
import type { FingerState } from '../utils/confidence';

// ─── Public interface ─────────────────────────────────────────────────────────

export interface SignRecognitionModel {
  /**
   * Recognise a sign from 21 MediaPipe hand landmarks.
   * Returns {sign, confidence, displayLabel} or NO_PREDICTION when nothing matches.
   */
  recognize(landmarks: HandLandmark[]): SignPrediction;
}

// ─── Sign definitions ─────────────────────────────────────────────────────────

interface SignDef {
  sign: string;
  displayLabel: string;
  /** Matcher function — returns confidence 0–1, or 0 if not matching */
  match(f: FingerState, lms: HandLandmark[]): number;
}

/**
 * Helper: returns 1 if value is within [min, max], else scales down towards 0.
 */
function inRange(value: number, min: number, max: number): number {
  if (value >= min && value <= max) return 1;
  const margin = (max - min) * 0.3;
  if (value < min) return Math.max(0, 1 - (min - value) / margin);
  return Math.max(0, 1 - (value - max) / margin);
}

/** Average confidence of multiple sub-scores */
function avg(...scores: number[]): number {
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Geometric ASL Sign Definitions
 *
 * Extension ratio guide (approximate):
 *   > 0.85 = extended/open
 *   0.5–0.85 = partially bent
 *   < 0.5  = curled/closed
 */
const SIGN_DEFINITIONS: SignDef[] = [
  // ── ASL Vocabulary Signs ──────────────────────────────────────────────────

  {
    sign: 'HELLO',
    displayLabel: 'Hello',
    // Open hand, all 5 fingers extended, thumb out
    match(f) {
      return avg(
        inRange(f.index,  0.85, 1.2),
        inRange(f.middle, 0.85, 1.2),
        inRange(f.ring,   0.85, 1.2),
        inRange(f.pinky,  0.85, 1.2),
        inRange(f.thumb,  0.75, 1.2),
      );
    },
  },

  {
    sign: 'THANK_YOU',
    displayLabel: 'Thank You',
    // Flat hand, fingers together, touches chin then moves forward
    // Static: 4 fingers extended, thumb slightly bent, touching lips area
    // We'll detect: index, middle, ring, pinky all extended, thumb mid-range
    match(f) {
      return avg(
        inRange(f.index,  0.82, 1.1),
        inRange(f.middle, 0.82, 1.1),
        inRange(f.ring,   0.80, 1.1),
        inRange(f.pinky,  0.75, 1.1),
        inRange(f.thumb,  0.4,  0.75),
      );
    },
  },

  {
    sign: 'YES',
    displayLabel: 'Yes',
    // Fist with wrist bob. Static: closed fist, thumb alongside index
    match(f) {
      return avg(
        inRange(f.index,  0.3, 0.60),
        inRange(f.middle, 0.3, 0.60),
        inRange(f.ring,   0.3, 0.60),
        inRange(f.pinky,  0.3, 0.65),
        inRange(f.thumb,  0.4, 0.75),
      );
    },
  },

  {
    sign: 'NO',
    displayLabel: 'No',
    // Index and middle fingers extended, tapping together (static: two fingers extended)
    match(f) {
      return avg(
        inRange(f.index,  0.82, 1.1),
        inRange(f.middle, 0.82, 1.1),
        inRange(f.ring,   0.3,  0.58),
        inRange(f.pinky,  0.3,  0.58),
        inRange(f.thumb,  0.3,  0.68),
      );
    },
  },

  {
    sign: 'PLEASE',
    displayLabel: 'Please',
    // Flat hand on chest — 4 fingers extended together, thumb tucked
    match(f, lms) {
      // Similar to THANK_YOU but thumb more tucked
      const pinch = thumbPinch(lms, LM.INDEX_MCP);
      return avg(
        inRange(f.index,  0.80, 1.1),
        inRange(f.middle, 0.80, 1.1),
        inRange(f.ring,   0.78, 1.1),
        inRange(f.pinky,  0.72, 1.1),
        inRange(f.thumb,  0.3,  0.55),
        inRange(pinch,    0.0,  0.5),
      );
    },
  },

  {
    sign: 'SORRY',
    displayLabel: 'Sorry',
    // Closed fist rubbed in circle on chest. Static: fist, thumb on top
    match(f) {
      return avg(
        inRange(f.index,  0.35, 0.65),
        inRange(f.middle, 0.35, 0.65),
        inRange(f.ring,   0.35, 0.65),
        inRange(f.pinky,  0.35, 0.68),
        inRange(f.thumb,  0.55, 0.85), // thumb slightly extended over fist
      );
    },
  },

  {
    sign: 'HELP',
    displayLabel: 'Help',
    // Closed fist with thumb up (thumbs up pose) lifting on flat palm
    // Static: thumb extended, rest curled
    match(f) {
      return avg(
        inRange(f.thumb,  0.85, 1.2),  // thumb up
        inRange(f.index,  0.3,  0.60),
        inRange(f.middle, 0.3,  0.60),
        inRange(f.ring,   0.3,  0.60),
        inRange(f.pinky,  0.3,  0.65),
      );
    },
  },

  {
    sign: 'I_LOVE_YOU',
    displayLabel: 'I Love You',
    // ILY: thumb, index, pinky extended; middle and ring curled
    match(f) {
      return avg(
        inRange(f.thumb,  0.75, 1.2),
        inRange(f.index,  0.82, 1.2),
        inRange(f.middle, 0.3,  0.60),
        inRange(f.ring,   0.3,  0.60),
        inRange(f.pinky,  0.82, 1.2),
      );
    },
  },

  {
    sign: 'MY',
    displayLabel: 'My',
    // Flat hand, fingers together but slightly bent (touching chest)
    // Distinguishing: all fingers moderately bent, together
    match(f) {
      return avg(
        inRange(f.index,  0.60, 0.82),
        inRange(f.middle, 0.60, 0.82),
        inRange(f.ring,   0.60, 0.82),
        inRange(f.pinky,  0.60, 0.82),
        inRange(f.thumb,  0.5,  0.75),
      );
    },
  },

  {
    sign: 'GOOD',
    displayLabel: 'Good',
    // Flat hand at chin level moving forward
    // Static: thumb up with all other fingers at mid range (looks like salute going to thumbs up)
    match(f) {
      return avg(
        inRange(f.thumb,  0.70, 1.0),
        inRange(f.index,  0.70, 1.0),
        inRange(f.middle, 0.70, 1.0),
        inRange(f.ring,   0.65, 1.0),
        inRange(f.pinky,  0.65, 0.95),
      );
    },
  },

  {
    sign: 'BAD',
    displayLabel: 'Bad',
    // All fingers bent at ~90 degrees inward (like half-curl)
    match(f) {
      return avg(
        inRange(f.index,  0.50, 0.75),
        inRange(f.middle, 0.50, 0.75),
        inRange(f.ring,   0.50, 0.75),
        inRange(f.pinky,  0.50, 0.78),
        inRange(f.thumb,  0.3,  0.60),
      );
    },
  },

  {
    sign: 'STOP',
    displayLabel: 'Stop',
    // Karate chop — flat hand, all fingers extended, hand vertical
    // Distinguished from HELLO by narrower thumb angle
    match(f, lms) {
      const tiAngle = thumbIndexAngle(lms);
      return avg(
        inRange(f.index,  0.85, 1.2),
        inRange(f.middle, 0.85, 1.2),
        inRange(f.ring,   0.85, 1.2),
        inRange(f.pinky,  0.82, 1.2),
        inRange(f.thumb,  0.5,  0.80),
        inRange(tiAngle,  20,   60),  // thumb relatively close to index
      );
    },
  },

  {
    sign: 'MORE',
    displayLabel: 'More',
    // All fingertips touching thumb (all pinched together)
    match(f, lms) {
      const indexPinch  = thumbPinch(lms, LM.INDEX_TIP);
      const middlePinch = thumbPinch(lms, LM.MIDDLE_TIP);
      return avg(
        inRange(indexPinch,  0.0, 0.35),
        inRange(middlePinch, 0.0, 0.45),
        inRange(f.ring,  0.3, 0.70),
        inRange(f.pinky, 0.3, 0.70),
      );
    },
  },

  {
    sign: 'WANT',
    displayLabel: 'Want',
    // Curved open hand (like grabbing), fingers spread and slightly bent
    match(f) {
      return avg(
        inRange(f.index,  0.62, 0.84),
        inRange(f.middle, 0.62, 0.84),
        inRange(f.ring,   0.60, 0.83),
        inRange(f.pinky,  0.60, 0.83),
        inRange(f.thumb,  0.60, 0.85),
      );
    },
  },

  {
    sign: 'NEED',
    displayLabel: 'Need',
    // Index finger bent down (like a hook/question mark finger bent)
    match(f, lms) {
      const indexPinch = thumbPinch(lms, LM.INDEX_TIP);
      return avg(
        inRange(f.index,  0.45, 0.70),  // index bent
        inRange(f.middle, 0.3,  0.60),  // others curled
        inRange(f.ring,   0.3,  0.60),
        inRange(f.pinky,  0.3,  0.62),
        inRange(f.thumb,  0.5,  0.80),
        inRange(indexPinch, 0.2, 0.65),
      );
    },
  },

  // ── Fingerspelling (Static ASL Letters) ─────────────────────────────────

  {
    sign: 'LETTER_A',
    displayLabel: 'A',
    // Fist with thumb alongside (not over fingers)
    match(f, lms) {
      const thumbSide = thumbPinch(lms, LM.INDEX_MCP);
      return avg(
        inRange(f.index,  0.30, 0.58),
        inRange(f.middle, 0.30, 0.58),
        inRange(f.ring,   0.30, 0.58),
        inRange(f.pinky,  0.30, 0.60),
        inRange(f.thumb,  0.55, 0.85),
        inRange(thumbSide, 0.1, 0.4),
      );
    },
  },

  {
    sign: 'LETTER_B',
    displayLabel: 'B',
    // 4 fingers extended and together, thumb tucked across palm
    match(f, lms) {
      const thumbTucked = thumbPinch(lms, LM.RING_MCP);
      return avg(
        inRange(f.index,  0.88, 1.2),
        inRange(f.middle, 0.88, 1.2),
        inRange(f.ring,   0.85, 1.2),
        inRange(f.pinky,  0.82, 1.1),
        inRange(f.thumb,  0.3,  0.55),
        inRange(thumbTucked, 0.0, 0.45),
      );
    },
  },

  {
    sign: 'LETTER_C',
    displayLabel: 'C',
    // Curved like letter C — all fingers and thumb curved
    match(f) {
      return avg(
        inRange(f.index,  0.65, 0.85),
        inRange(f.middle, 0.65, 0.85),
        inRange(f.ring,   0.62, 0.84),
        inRange(f.pinky,  0.60, 0.83),
        inRange(f.thumb,  0.60, 0.83),
      );
    },
  },

  {
    sign: 'LETTER_D',
    displayLabel: 'D',
    // Index extended, middle+ring+pinky curled to thumb
    match(f, lms) {
      const middlePinch = thumbPinch(lms, LM.MIDDLE_TIP);
      return avg(
        inRange(f.index,  0.85, 1.2),
        inRange(f.middle, 0.3,  0.60),
        inRange(f.ring,   0.3,  0.60),
        inRange(f.pinky,  0.3,  0.62),
        inRange(f.thumb,  0.4,  0.70),
        inRange(middlePinch, 0.0, 0.45),
      );
    },
  },

  {
    sign: 'LETTER_L',
    displayLabel: 'L',
    // Index and thumb extended (L-shape), others curled
    match(f) {
      return avg(
        inRange(f.thumb,  0.82, 1.2),
        inRange(f.index,  0.85, 1.2),
        inRange(f.middle, 0.3,  0.60),
        inRange(f.ring,   0.3,  0.60),
        inRange(f.pinky,  0.3,  0.62),
      );
    },
  },

  {
    sign: 'LETTER_O',
    displayLabel: 'O',
    // All fingertips touching thumb tip (round O shape)
    match(f, lms) {
      const indexPinch  = thumbPinch(lms, LM.INDEX_TIP);
      const middlePinch = thumbPinch(lms, LM.MIDDLE_TIP);
      const ringPinch   = thumbPinch(lms, LM.RING_TIP);
      return avg(
        inRange(indexPinch,  0.0, 0.28),
        inRange(middlePinch, 0.0, 0.35),
        inRange(ringPinch,   0.0, 0.45),
        inRange(f.index,  0.45, 0.78),
        inRange(f.middle, 0.45, 0.78),
      );
    },
  },

  {
    sign: 'LETTER_V',
    displayLabel: 'V',
    // Index and middle extended (V/peace sign), ring+pinky+thumb curled
    match(f) {
      return avg(
        inRange(f.index,  0.85, 1.2),
        inRange(f.middle, 0.85, 1.2),
        inRange(f.ring,   0.3,  0.60),
        inRange(f.pinky,  0.3,  0.62),
        inRange(f.thumb,  0.3,  0.65),
      );
    },
  },

  {
    sign: 'LETTER_W',
    displayLabel: 'W',
    // Index, middle, ring extended; thumb and pinky curled
    match(f) {
      return avg(
        inRange(f.index,  0.85, 1.2),
        inRange(f.middle, 0.85, 1.2),
        inRange(f.ring,   0.83, 1.2),
        inRange(f.pinky,  0.3,  0.60),
        inRange(f.thumb,  0.3,  0.65),
      );
    },
  },

  {
    sign: 'LETTER_Y',
    displayLabel: 'Y',
    // Thumb and pinky extended, others curled
    match(f) {
      return avg(
        inRange(f.thumb,  0.82, 1.2),
        inRange(f.index,  0.3,  0.62),
        inRange(f.middle, 0.3,  0.60),
        inRange(f.ring,   0.3,  0.60),
        inRange(f.pinky,  0.82, 1.2),
      );
    },
  },
];

// ─── Geometric Classifier ─────────────────────────────────────────────────────

export class GeometricSignClassifier implements SignRecognitionModel {
  private readonly confidenceThreshold: number;

  constructor(confidenceThreshold = 0.70) {
    this.confidenceThreshold = confidenceThreshold;
  }

  recognize(landmarks: HandLandmark[]): SignPrediction {
    if (!landmarks || landmarks.length < 21) return NO_PREDICTION;

    const normalized = normalizeLandmarks(landmarks);
    const fingerState = getFingerExtensions(normalized);

    let bestSign: SignDef | null = null;
    let bestScore = 0;

    for (const def of SIGN_DEFINITIONS) {
      const score = def.match(fingerState, normalized);
      if (score > bestScore) {
        bestScore = score;
        bestSign = def;
      }
    }

    if (!bestSign || bestScore < this.confidenceThreshold) {
      return NO_PREDICTION;
    }

    return {
      sign: bestSign.sign,
      confidence: bestScore,
      displayLabel: bestSign.displayLabel,
    };
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createSignClassifier(threshold = 0.70): SignRecognitionModel {
  return new GeometricSignClassifier(threshold);
}

/** All supported sign labels (for UI display) */
export const SUPPORTED_SIGNS = SIGN_DEFINITIONS.map((d) => ({
  sign: d.sign,
  label: d.displayLabel,
}));
