import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CameraScanner } from './CameraScanner';
import * as cameraUtil from '../utils/camera';

describe('CameraScanner Component', () => {
  let mockTrack: { stop: ReturnType<typeof vi.fn> };
  let mockStream: {
    id: string;
    getTracks: () => Array<{ stop: ReturnType<typeof vi.fn> }>;
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockTrack = { stop: vi.fn() };
    mockStream = {
      id: 'mock-camera-stream',
      getTracks: () => [mockTrack],
    };
    HTMLCanvasElement.prototype.toBlob = vi.fn((cb: (blob: Blob | null) => void) => {
      cb(new Blob(['fake-camera-frame'], { type: 'image/png' }));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. requests camera stream on mount and renders live viewfinder', async () => {
    const getStreamSpy = vi
      .spyOn(cameraUtil, 'getCameraStream')
      .mockResolvedValue(mockStream as unknown as MediaStream);

    const onCapture = vi.fn();
    const onClose = vi.fn();

    const { container } = render(
      <CameraScanner onCapture={onCapture} onClose={onClose} />,
    );

    await waitFor(() => {
      expect(getStreamSpy).toHaveBeenCalledTimes(1);
    });

    const video = container.querySelector('video') as HTMLVideoElement;
    expect(video).toBeDefined();
    expect(video.srcObject).toBe(mockStream);

    await waitFor(() => {
      expect(screen.getByText('LIVE')).toBeDefined();
    });
    expect(screen.getByText('Center QR Code in Frame')).toBeDefined();
  });

  it('2. stops tracks and calls onClose when close/cancel button is clicked', async () => {
    vi.spyOn(cameraUtil, 'getCameraStream').mockResolvedValue(
      mockStream as unknown as MediaStream,
    );

    const onCapture = vi.fn();
    const onClose = vi.fn();

    render(<CameraScanner onCapture={onCapture} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('LIVE')).toBeDefined();
    });

    const closeBtn = screen.getByLabelText('Close Camera');
    fireEvent.click(closeBtn);

    expect(mockTrack.stop).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('3. stops tracks and calls onCapture when capture button is clicked', async () => {
    vi.spyOn(cameraUtil, 'getCameraStream').mockResolvedValue(
      mockStream as unknown as MediaStream,
    );

    const onCapture = vi.fn();
    const onClose = vi.fn();

    render(<CameraScanner onCapture={onCapture} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('LIVE')).toBeDefined();
    });

    const captureBtn = screen.getByText('Capture & Verify');
    fireEvent.click(captureBtn);

    await waitFor(() => {
      expect(onCapture).toHaveBeenCalledTimes(1);
    });

    const call = onCapture.mock.calls[0];
    expect(call).toBeDefined();
    const capturedFile = call![0] as File;
    expect(capturedFile).toBeInstanceOf(File);
    expect(capturedFile.name).toMatch(/^camera-scan-\d+\.png$/);
    expect(capturedFile.type).toBe('image/png');
    expect(mockTrack.stop).toHaveBeenCalled();
  });

  it('4. displays helpful error message with retry action when camera initialization fails', async () => {
    const permissionErr = new DOMException('Permission denied', 'NotAllowedError');
    const getStreamSpy = vi
      .spyOn(cameraUtil, 'getCameraStream')
      .mockRejectedValue(permissionErr);

    const onCapture = vi.fn();
    const onClose = vi.fn();

    render(<CameraScanner onCapture={onCapture} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('Camera Permission Denied')).toBeDefined();
    });

    expect(screen.getByText(/browser address bar/i)).toBeDefined();
    const retryBtn = screen.getByText('Retry');
    expect(retryBtn).toBeDefined();

    // Clicking retry attempts stream acquisition again
    getStreamSpy.mockResolvedValueOnce(mockStream as unknown as MediaStream);
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(getStreamSpy).toHaveBeenCalledTimes(2);
    });
  });

  it('5. stops all camera tracks on unmount to release camera hardware', async () => {
    vi.spyOn(cameraUtil, 'getCameraStream').mockResolvedValue(
      mockStream as unknown as MediaStream,
    );

    const onCapture = vi.fn();
    const onClose = vi.fn();

    const { unmount } = render(<CameraScanner onCapture={onCapture} onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('LIVE')).toBeDefined();
    });

    unmount();
    expect(mockTrack.stop).toHaveBeenCalled();
  });
});
