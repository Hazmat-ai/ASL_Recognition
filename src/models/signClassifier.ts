import type { HandLandmark, SignPrediction } from '../types/sign';
import { NO_PREDICTION } from '../types/sign';
import {
  normalizeLandmarks,
  getFingerExtensions,
  thumbPinch,
  thumbIndexAngle,
  handFlatness,
  pointingUp,
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
 * We use a larger margin to make the classifier more forgiving.
 */
function inRange(value: number, min: number, max: number): number {
  if (value >= min && value <= max) return 1;
  const margin = Math.max((max - min) * 0.8, 0.15); // more forgiving falloff
  if (value < min) return Math.max(0, 1 - (min - value) / margin);
  return Math.max(0, 1 - (value - max) / margin);
}

/** Average confidence of multiple sub-scores */
function avg(...scores: number[]): number {
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/** Helpers for common finger states */
function isExtended(val: number): number {
  // New ratio: tip-to-wrist / pip-to-wrist
  // > 1.05 means tip is further away than PIP (finger is straight)
  return inRange(val, 1.05, 3.0); 
}

function isCurled(val: number): number {
  // < 0.95 means tip is tucked closer to wrist than PIP
  return inRange(val, 0.0, 0.95); 
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
    // Open hand, all 5 fingers extended
    match(f) {
      return avg(
        isExtended(f.index),
        isExtended(f.middle),
        isExtended(f.ring),
        isExtended(f.pinky),
        isExtended(f.thumb)
      );
    },
  },

  {
    sign: 'THANK_YOU',
    displayLabel: 'Thank You',
    // Flat hand, fingers together. Thumb can be slightly tucked.
    match(f) {
      return avg(
        isExtended(f.index),
        isExtended(f.middle),
        isExtended(f.ring),
        isExtended(f.pinky),
        inRange(f.thumb, 0.0, 0.85) // Thumb doesn't have to be fully out
      );
    },
  },

  {
    sign: 'YES',
    displayLabel: 'Yes',
    // Fist. Index, middle, ring, pinky curled.
    match(f) {
      return avg(
        isCurled(f.index),
        isCurled(f.middle),
        isCurled(f.ring),
        isCurled(f.pinky),
        inRange(f.thumb, 0.3, 0.8) // Thumb rests on outside
      );
    },
  },

  {
    sign: 'NO',
    displayLabel: 'No',
    // Index and middle fingers extended, others curled
    match(f) {
      return avg(
        isExtended(f.index),
        isExtended(f.middle),
        isCurled(f.ring),
        isCurled(f.pinky),
        inRange(f.thumb, 0.2, 0.8)
      );
    },
  },

  {
    sign: 'PLEASE',
    displayLabel: 'Please',
    // Flat hand on chest — 4 fingers extended, thumb tucked more than Thank You
    match(f, lms) {
      const pinch = thumbPinch(lms, LM.INDEX_MCP);
      return avg(
        isExtended(f.index),
        isExtended(f.middle),
        isExtended(f.ring),
        isExtended(f.pinky),
        isCurled(f.thumb),
        inRange(pinch, 0.0, 0.6) // Thumb close to hand
      );
    },
  },

  {
    sign: 'SORRY',
    displayLabel: 'Sorry',
    // Closed fist. Thumb on top. Rubs chest (usually points down/left, NOT straight up)
    match(f, lms) {
      return avg(
        isCurled(f.index),
        isCurled(f.middle),
        isCurled(f.ring),
        isCurled(f.pinky),
        inRange(f.thumb, 0.5, 0.9), // Thumb prominent over fist
        inRange(pointingUp(lms), 0.0, 0.4) // Hand is angled/downwards, not UP like 'A'
      );
    },
  },

  {
    sign: 'HELP',
    displayLabel: 'Help',
    // Thumbs up pose
    match(f) {
      return avg(
        isExtended(f.thumb),
        isCurled(f.index),
        isCurled(f.middle),
        isCurled(f.ring),
        isCurled(f.pinky)
      );
    },
  },

  {
    sign: 'I_LOVE_YOU',
    displayLabel: 'I Love You',
    // ILY: thumb, index, pinky extended; middle and ring curled
    match(f) {
      return avg(
        isExtended(f.thumb),
        isExtended(f.index),
        isCurled(f.middle),
        isCurled(f.ring),
        isExtended(f.pinky)
      );
    },
  },

  {
    sign: 'MY',
    displayLabel: 'My',
    // Flat hand, touching chest. Fingers slightly bent due to angle.
    match(f) {
      return avg(
        inRange(f.index, 0.5, 0.9),
        inRange(f.middle, 0.5, 0.9),
        inRange(f.ring, 0.5, 0.9),
        inRange(f.pinky, 0.5, 0.9),
        inRange(f.thumb, 0.4, 0.8)
      );
    },
  },

  {
    sign: 'GOOD',
    displayLabel: 'Good',
    // Fingers mostly extended, but less rigid than HELLO
    match(f) {
      return avg(
        inRange(f.thumb, 0.6, 1.2),
        inRange(f.index, 0.6, 1.2),
        inRange(f.middle, 0.6, 1.2),
        inRange(f.ring, 0.6, 1.2),
        inRange(f.pinky, 0.6, 1.2)
      );
    },
  },

  {
    sign: 'BAD',
    displayLabel: 'Bad',
    // All fingers bent at ~90 degrees inward
    match(f) {
      return avg(
        inRange(f.index, 0.4, 0.8),
        inRange(f.middle, 0.4, 0.8),
        inRange(f.ring, 0.4, 0.8),
        inRange(f.pinky, 0.4, 0.8),
        isCurled(f.thumb)
      );
    },
  },

  {
    sign: 'STOP',
    displayLabel: 'Stop',
    // Karate chop — flat hand, thumb close to index
    match(f, lms) {
      const tiAngle = thumbIndexAngle(lms);
      return avg(
        isExtended(f.index),
        isExtended(f.middle),
        isExtended(f.ring),
        isExtended(f.pinky),
        inRange(f.thumb, 0.4, 0.85),
        inRange(tiAngle, 10, 65) // Thumb relatively close to index
      );
    },
  },

  {
    sign: 'MORE',
    displayLabel: 'More',
    // All fingertips touching thumb
    match(f, lms) {
      const indexPinch  = thumbPinch(lms, LM.INDEX_TIP);
      const middlePinch = thumbPinch(lms, LM.MIDDLE_TIP);
      return avg(
        inRange(indexPinch, 0.0, 0.4),
        inRange(middlePinch, 0.0, 0.5),
        inRange(f.ring, 0.2, 0.8),
        inRange(f.pinky, 0.2, 0.8)
      );
    },
  },

  {
    sign: 'WANT',
    displayLabel: 'Want',
    // Curved open hand (like grabbing). Hand is relatively flat to camera.
    match(f, lms) {
      return avg(
        inRange(f.index, 0.5, 0.9),
        inRange(f.middle, 0.5, 0.9),
        inRange(f.ring, 0.5, 0.9),
        inRange(f.pinky, 0.5, 0.9),
        inRange(f.thumb, 0.5, 0.9),
        inRange(handFlatness(lms), 0.6, 1.0) // Distinguishes from 'C'
      );
    },
  },

  {
    sign: 'NEED',
    displayLabel: 'Need',
    // Index finger bent down (hook), others curled
    match(f, lms) {
      const indexPinch = thumbPinch(lms, LM.INDEX_TIP);
      return avg(
        inRange(f.index, 0.4, 0.75), // Index bent
        isCurled(f.middle),
        isCurled(f.ring),
        isCurled(f.pinky),
        inRange(indexPinch, 0.2, 0.7)
      );
    },
  },

  // ── Fingerspelling (Static ASL Letters) ─────────────────────────────────

  {
    sign: 'LETTER_A',
    displayLabel: 'A',
    // Fist, thumb alongside index, hand pointing UP
    match(f, lms) {
      const thumbSide = thumbPinch(lms, LM.INDEX_MCP);
      return avg(
        isCurled(f.index),
        isCurled(f.middle),
        isCurled(f.ring),
        isCurled(f.pinky),
        inRange(f.thumb, 0.5, 0.9),
        inRange(thumbSide, 0.0, 0.5), // Thumb close to side
        inRange(pointingUp(lms), 0.7, 1.0) // Must point UP
      );
    },
  },

  {
    sign: 'LETTER_B',
    displayLabel: 'B',
    // 4 fingers extended, thumb tucked
    match(f, lms) {
      const thumbTucked = thumbPinch(lms, LM.RING_MCP);
      return avg(
        isExtended(f.index),
        isExtended(f.middle),
        isExtended(f.ring),
        isExtended(f.pinky),
        isCurled(f.thumb),
        inRange(thumbTucked, 0.0, 0.55)
      );
    },
  },

  {
    sign: 'LETTER_C',
    displayLabel: 'C',
    // Curved C shape. Hand is held SIDEWAYS.
    match(f, lms) {
      return avg(
        inRange(f.index, 0.5, 0.9),
        inRange(f.middle, 0.5, 0.9),
        inRange(f.ring, 0.5, 0.9),
        inRange(f.pinky, 0.5, 0.9),
        inRange(f.thumb, 0.5, 0.9),
        inRange(handFlatness(lms), 0.0, 0.4) // Sideways hand distinguishes from 'WANT'
      );
    },
  },

  {
    sign: 'LETTER_D',
    displayLabel: 'D',
    // Index extended, others curled to thumb
    match(f, lms) {
      const middlePinch = thumbPinch(lms, LM.MIDDLE_TIP);
      return avg(
        isExtended(f.index),
        isCurled(f.middle),
        isCurled(f.ring),
        isCurled(f.pinky),
        inRange(middlePinch, 0.0, 0.5)
      );
    },
  },

  {
    sign: 'LETTER_L',
    displayLabel: 'L',
    // Index and thumb extended
    match(f) {
      return avg(
        isExtended(f.thumb),
        isExtended(f.index),
        isCurled(f.middle),
        isCurled(f.ring),
        isCurled(f.pinky)
      );
    },
  },

  {
    sign: 'LETTER_O',
    displayLabel: 'O',
    // All fingertips touching thumb
    match(f, lms) {
      const indexPinch  = thumbPinch(lms, LM.INDEX_TIP);
      const middlePinch = thumbPinch(lms, LM.MIDDLE_TIP);
      const ringPinch   = thumbPinch(lms, LM.RING_TIP);
      return avg(
        inRange(indexPinch, 0.0, 0.35),
        inRange(middlePinch, 0.0, 0.4),
        inRange(ringPinch, 0.0, 0.5),
        inRange(f.index, 0.4, 0.8),
        inRange(f.middle, 0.4, 0.8)
      );
    },
  },

  {
    sign: 'LETTER_V',
    displayLabel: 'V',
    // Index and middle extended
    match(f) {
      return avg(
        isExtended(f.index),
        isExtended(f.middle),
        isCurled(f.ring),
        isCurled(f.pinky),
        isCurled(f.thumb)
      );
    },
  },

  {
    sign: 'LETTER_W',
    displayLabel: 'W',
    // Index, middle, ring extended
    match(f) {
      return avg(
        isExtended(f.index),
        isExtended(f.middle),
        isExtended(f.ring),
        isCurled(f.pinky),
        isCurled(f.thumb)
      );
    },
  },

  {
    sign: 'LETTER_Y',
    displayLabel: 'Y',
    // Thumb and pinky extended
    match(f) {
      return avg(
        isExtended(f.thumb),
        isCurled(f.index),
        isCurled(f.middle),
        isCurled(f.ring),
        isExtended(f.pinky)
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
