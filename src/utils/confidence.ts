import type { HandLandmark } from '../types/sign';

// ─── Landmark indices (MediaPipe 21-point hand model) ─────────────────────────
// 0  = WRIST
// 1-4  = THUMB  (CMC, MCP, IP, TIP)
// 5-8  = INDEX  (MCP, PIP, DIP, TIP)
// 9-12 = MIDDLE (MCP, PIP, DIP, TIP)
// 13-16= RING   (MCP, PIP, DIP, TIP)
// 17-20= PINKY  (MCP, PIP, DIP, TIP)

export const LM = {
  WRIST: 0,
  THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
  MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
  RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
  PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20,
} as const;

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Normalise landmarks so that:
 *  - WRIST is at origin (0,0,0)
 *  - Scale is normalised by the palm length (wrist → middle MCP)
 */
export function normalizeLandmarks(lms: HandLandmark[]): HandLandmark[] {
  const wrist = lms[LM.WRIST];
  const middleMcp = lms[LM.MIDDLE_MCP];

  const palmLen = Math.sqrt(
    (middleMcp.x - wrist.x) ** 2 +
    (middleMcp.y - wrist.y) ** 2 +
    (middleMcp.z - wrist.z) ** 2,
  ) || 1;

  return lms.map((lm) => ({
    x: (lm.x - wrist.x) / palmLen,
    y: (lm.y - wrist.y) / palmLen,
    z: (lm.z - wrist.z) / palmLen,
  }));
}

// ─── Geometric helpers ────────────────────────────────────────────────────────

function dist3(a: HandLandmark, b: HandLandmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function dot(a: HandLandmark, b: HandLandmark): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function sub(a: HandLandmark, b: HandLandmark): HandLandmark {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function angleBetween(v1: HandLandmark, v2: HandLandmark): number {
  const mag1 = Math.sqrt(dot(v1, v1));
  const mag2 = Math.sqrt(dot(v2, v2));
  if (mag1 === 0 || mag2 === 0) return 0;
  const cosA = Math.max(-1, Math.min(1, dot(v1, v2) / (mag1 * mag2)));
  return Math.acos(cosA) * (180 / Math.PI);
}

/**
 * How "extended" a finger is.
 * Computed as ratio of (tip-to-wrist distance) / (pip-to-wrist distance).
 * If > 1.0, the tip is further away than the PIP joint (finger is straight).
 * If < 1.0, the tip is curled inwards closer to the wrist than the PIP joint.
 */
export function fingerExtension(lms: HandLandmark[], tipIdx: number, pipIdx: number): number {
  const wrist = lms[LM.WRIST];
  const tip = lms[tipIdx];
  const pip = lms[pipIdx];

  const tipToWrist = dist3(tip, wrist);
  const pipToWrist = dist3(pip, wrist);

  if (pipToWrist === 0) return 0;
  return tipToWrist / pipToWrist;
}

/** Extension ratios for all 5 fingers: [thumb, index, middle, ring, pinky] */
export interface FingerState {
  thumb: number;
  index: number;
  middle: number;
  ring: number;
  pinky: number;
}

export function getFingerExtensions(lms: HandLandmark[]): FingerState {
  return {
    thumb:  fingerExtension(lms, LM.THUMB_TIP,  LM.THUMB_IP),
    index:  fingerExtension(lms, LM.INDEX_TIP,  LM.INDEX_PIP),
    middle: fingerExtension(lms, LM.MIDDLE_TIP, LM.MIDDLE_PIP),
    ring:   fingerExtension(lms, LM.RING_TIP,   LM.RING_PIP),
    pinky:  fingerExtension(lms, LM.PINKY_TIP,  LM.PINKY_PIP),
  };
}

/** Angle at the knuckle joint for a finger (MCP angle) */
export function knuckleAngle(lms: HandLandmark[], mcpIdx: number, pipIdx: number, tipIdx: number): number {
  const v1 = sub(lms[mcpIdx], lms[pipIdx]);
  const v2 = sub(lms[tipIdx], lms[pipIdx]);
  return angleBetween(v1, v2);
}

/** How close thumb tip is to a given fingertip (in normalised units) */
export function thumbPinch(lms: HandLandmark[], fingerTipIdx: number): number {
  return dist3(lms[LM.THUMB_TIP], lms[fingerTipIdx]);
}

/** Thumb opposition — angle between thumb and index finger vectors */
export function thumbIndexAngle(lms: HandLandmark[]): number {
  const thumbVec = sub(lms[LM.THUMB_TIP], lms[LM.THUMB_MCP]);
  const indexVec = sub(lms[LM.INDEX_TIP], lms[LM.INDEX_MCP]);
  return angleBetween(thumbVec, indexVec);
}
