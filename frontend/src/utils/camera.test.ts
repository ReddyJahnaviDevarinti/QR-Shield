import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isCameraSupported, formatCameraErrorMessage, getCameraStream } from './camera';

describe('camera utilities', () => {
  const originalMediaDevices = navigator.mediaDevices;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: originalMediaDevices,
      configurable: true,
      writable: true,
    });
  });

  describe('isCameraSupported', () => {
    it('returns false when navigator.mediaDevices is undefined', () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        configurable: true,
        writable: true,
      });
      expect(isCameraSupported()).toBe(false);
    });

    it('returns false when getUserMedia is not a function', () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {},
        configurable: true,
        writable: true,
      });
      expect(isCameraSupported()).toBe(false);
    });

    it('returns true when navigator.mediaDevices.getUserMedia is a function', () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: vi.fn() },
        configurable: true,
        writable: true,
      });
      expect(isCameraSupported()).toBe(true);
    });
  });

  describe('formatCameraErrorMessage', () => {
    it('formats NotAllowedError (permission denied)', () => {
      const err = new DOMException('Permission denied', 'NotAllowedError');
      const formatted = formatCameraErrorMessage(err);
      expect(formatted.title).toBe('Camera Permission Denied');
      expect(formatted.code).toBe('E_CAMERA_PERMISSION_DENIED');
      expect(formatted.message).toContain('browser address bar');
    });

    it('formats NotFoundError (no device)', () => {
      const err = new DOMException('Device not found', 'NotFoundError');
      const formatted = formatCameraErrorMessage(err);
      expect(formatted.title).toBe('No Camera Detected');
      expect(formatted.code).toBe('E_CAMERA_NOT_FOUND');
      expect(formatted.message).toContain('webcam is connected');
    });

    it('formats NotReadableError (camera in use)', () => {
      const err = new DOMException('Could not start video source', 'NotReadableError');
      const formatted = formatCameraErrorMessage(err);
      expect(formatted.title).toBe('Camera In Use');
      expect(formatted.code).toBe('E_CAMERA_IN_USE');
      expect(formatted.message).toContain('in use by another application');
    });

    it('formats OverconstrainedError', () => {
      const err = new DOMException('Overconstrained', 'OverconstrainedError');
      const formatted = formatCameraErrorMessage(err);
      expect(formatted.title).toBe('Camera Constraint Error');
      expect(formatted.code).toBe('E_CAMERA_OVERCONSTRAINED');
    });

    it('formats SecurityError', () => {
      const err = new DOMException('Insecure context', 'SecurityError');
      const formatted = formatCameraErrorMessage(err);
      expect(formatted.title).toBe('Insecure Context');
      expect(formatted.code).toBe('E_CAMERA_SECURITY');
      expect(formatted.message).toContain('HTTPS');
    });

    it('formats UNSUPPORTED_BROWSER custom error', () => {
      const err = new Error('UNSUPPORTED_BROWSER');
      const formatted = formatCameraErrorMessage(err);
      expect(formatted.title).toBe('Camera Not Supported');
      expect(formatted.code).toBe('E_CAMERA_UNSUPPORTED');
    });

    it('formats unknown non-Error types', () => {
      const formatted = formatCameraErrorMessage('some-string-error');
      expect(formatted.title).toBe('Camera Error');
      expect(formatted.code).toBe('E_CAMERA_UNKNOWN');
    });
  });

  describe('getCameraStream', () => {
    it('throws UNSUPPORTED_BROWSER if mediaDevices is not available', async () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        configurable: true,
        writable: true,
      });

      await expect(getCameraStream()).rejects.toThrow('UNSUPPORTED_BROWSER');
    });

    it('succeeds on first attempt with ideal environment and HD constraints', async () => {
      const mockStream = {
        id: 'stream-1',
        getTracks: () => [],
      } as unknown as MediaStream;
      const getUserMedia = vi.fn().mockResolvedValue(mockStream);
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia },
        configurable: true,
        writable: true,
      });

      const stream = await getCameraStream();
      expect(stream).toBe(mockStream);
      expect(getUserMedia).toHaveBeenCalledTimes(1);
      expect(getUserMedia).toHaveBeenCalledWith({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    });

    it('falls back to unconstrained video: true when environment constraints fail (laptop fallback)', async () => {
      const mockStream = {
        id: 'stream-laptop-fallback',
        getTracks: () => [],
      } as unknown as MediaStream;
      const overconstrainedErr = new DOMException(
        'No environment camera',
        'OverconstrainedError',
      );

      const getUserMedia = vi
        .fn()
        .mockRejectedValueOnce(overconstrainedErr)
        .mockRejectedValueOnce(overconstrainedErr)
        .mockResolvedValueOnce(mockStream);

      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia },
        configurable: true,
        writable: true,
      });

      const stream = await getCameraStream();
      expect(stream).toBe(mockStream);
      expect(getUserMedia).toHaveBeenCalledTimes(3);
      expect(getUserMedia).toHaveBeenLastCalledWith({
        video: true,
        audio: false,
      });
    });

    it('does not retry alternative constraints when permission is explicitly denied', async () => {
      const notAllowedErr = new DOMException('Permission denied', 'NotAllowedError');
      const getUserMedia = vi.fn().mockRejectedValue(notAllowedErr);

      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia },
        configurable: true,
        writable: true,
      });

      await expect(getCameraStream()).rejects.toThrow('Permission denied');
      expect(getUserMedia).toHaveBeenCalledTimes(1);
    });
  });
});
