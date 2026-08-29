import type { CameraStatus } from '../types/sign';

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface CameraServiceOptions {
  deviceId?: string;
  width?: number;
  height?: number;
}

export class CameraService {
  private stream: MediaStream | null = null;

  async enumerateCameras(): Promise<CameraDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
        }));
    } catch {
      return [];
    }
  }

  async start(opts: CameraServiceOptions = {}): Promise<{ stream: MediaStream; status: CameraStatus }> {
    // Stop any existing stream
    this.stop();

    const constraints: MediaStreamConstraints = {
      video: {
        deviceId: opts.deviceId ? { ideal: opts.deviceId } : undefined,
        width:  { ideal: opts.width  ?? 1280 },
        height: { ideal: opts.height ?? 720 },
        facingMode: 'user',
      },
      audio: false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream = stream;
      return { stream, status: 'active' };
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          return { stream: null as unknown as MediaStream, status: 'denied' };
        }
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          return { stream: null as unknown as MediaStream, status: 'no-camera' };
        }
      }
      return { stream: null as unknown as MediaStream, status: 'error' };
    }
  }

  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }

  get currentStream(): MediaStream | null {
    return this.stream;
  }
}
