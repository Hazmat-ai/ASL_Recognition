import {
  HandLandmarker,
  FilesetResolver,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision';

export type RecognitionCallback = (result: HandLandmarkerResult) => void;

export class RecognitionService {
  private handLandmarker: HandLandmarker | null = null;
  private animationFrameId: number | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private callback: RecognitionCallback | null = null;
  private running = false;
  private onError: (() => void) | undefined;
  private lastVideoTime = -1;

  async initialize(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      '/wasm',
    );

    const options = {
      baseOptions: {
        modelAssetPath:
          '/models/hand_landmarker.task',
        delegate: 'GPU' as const,
      },
      runningMode: 'VIDEO' as const,
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };
    try { this.handLandmarker = await HandLandmarker.createFromOptions(vision, options); }
    catch { this.handLandmarker = await HandLandmarker.createFromOptions(vision, { ...options, baseOptions:{ ...options.baseOptions, delegate:'CPU' } }); }
  }

  isReady(): boolean {
    return this.handLandmarker !== null;
  }

  start(videoEl: HTMLVideoElement, callback: RecognitionCallback, onError?: () => void): void {
    if (!this.handLandmarker) {
      console.warn('[RecognitionService] HandLandmarker not initialised');
      return;
    }
    this.onError = onError;
    this.videoEl = videoEl;
    this.callback = callback;
    this.running = true;
    this.lastVideoTime = -1;
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  destroy(): void {
    this.stop();
    this.handLandmarker?.close();
    this.handLandmarker = null;
  }

  private loop = (): void => {
    if (!this.running || !this.videoEl || !this.handLandmarker || !this.callback) return;

    const video = this.videoEl;

    if (video.readyState >= 2 && video.currentTime !== this.lastVideoTime) {
      this.lastVideoTime = video.currentTime;

      try {
        const result = this.handLandmarker.detectForVideo(video, performance.now());
        this.callback(result);
      } catch (err) {
        this.stop();
        this.onError?.();
        return;
      }
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };
}
