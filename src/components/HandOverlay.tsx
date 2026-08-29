import React, { useEffect, useRef } from 'react';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';

interface HandOverlayProps {
  result: HandLandmarkerResult | null;
  videoWidth: number;
  videoHeight: number;
  visible: boolean;
}

// MediaPipe hand connections (pairs of landmark indices)
const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // index
  [0, 9], [9, 10], [10, 11], [11, 12],  // middle
  [0, 13], [13, 14], [14, 15], [15, 16], // ring
  [0, 17], [17, 18], [18, 19], [19, 20], // pinky
  [5, 9], [9, 13], [13, 17],            // palm knuckles
];

const FINGERTIP_INDICES = [4, 8, 12, 16, 20];

export const HandOverlay: React.FC<HandOverlayProps> = ({ result, videoWidth, videoHeight, visible }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width  = videoWidth  || canvas.offsetWidth;
    canvas.height = videoHeight || canvas.offsetHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!visible || !result || !result.landmarks || result.landmarks.length === 0) return;

    const w = canvas.width;
    const h = canvas.height;

    result.landmarks.forEach((hand, handIndex) => {
      const handedness = result.handednesses?.[handIndex]?.[0]?.categoryName ?? 'Unknown';
      const isLeft = handedness === 'Left';

      // Color scheme: teal for left, violet for right
      const lineColor   = isLeft ? 'rgba(20, 184, 166, 0.85)'  : 'rgba(139, 92, 246, 0.85)';
      const dotColor    = isLeft ? 'rgba(94, 234, 212, 0.95)'  : 'rgba(196, 181, 253, 0.95)';
      const tipColor    = isLeft ? 'rgba(20, 184, 166, 1.0)'   : 'rgba(124, 58, 237, 1.0)';
      const wristColor  = 'rgba(251, 191, 36, 1.0)';

      // Draw connections
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = lineColor;
      ctx.lineCap = 'round';

      for (const [a, b] of HAND_CONNECTIONS) {
        const lmA = hand[a];
        const lmB = hand[b];
        if (!lmA || !lmB) continue;
        ctx.beginPath();
        ctx.moveTo(lmA.x * w, lmA.y * h);
        ctx.lineTo(lmB.x * w, lmB.y * h);
        ctx.stroke();
      }

      // Draw landmark dots
      hand.forEach((lm, idx) => {
        const x = lm.x * w;
        const y = lm.y * h;
        const isTip = FINGERTIP_INDICES.includes(idx);
        const isWrist = idx === 0;

        ctx.beginPath();
        ctx.arc(x, y, isTip ? 6 : isWrist ? 7 : 4, 0, Math.PI * 2);
        ctx.fillStyle = isWrist ? wristColor : isTip ? tipColor : dotColor;
        ctx.fill();

        if (isTip || isWrist) {
          ctx.strokeStyle = 'rgba(0,0,0,0.4)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });

      // Hand label
      const wrist = hand[0];
      if (wrist) {
        const labelX = wrist.x * w;
        const labelY = Math.max(wrist.y * h - 14, 20);
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillText(isLeft ? '← Left' : 'Right →', labelX + 1, labelY + 1);
        ctx.fillStyle = isLeft ? 'rgba(94, 234, 212, 1)' : 'rgba(196, 181, 253, 1)';
        ctx.fillText(isLeft ? '← Left' : 'Right →', labelX, labelY);
      }
    });
  }, [result, videoWidth, videoHeight, visible]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
};
