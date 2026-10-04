import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VerifyPage } from './VerifyPage';
import * as apiModule from '../lib/api';
import type { VerifySuccessResponse, CanonicalCompositeStatus } from '../lib/api';

function createMockResponse(status: CanonicalCompositeStatus): VerifySuccessResponse {
  return {
    verification_status: status,
    decoded_payload: 'upi://pay?pa=merchant@icici&pn=Test%20Merchant&mc=5411',
    normalized_destination: 'merchant@icici',
    registered_destination:
      status === 'DESTINATION_MISMATCH' ? 'registered@icici' : 'merchant@icici',
    destination_match: status === 'VERIFIED',
    evidence: {
      normalized_scanned_destination: 'merchant@icici',
      active_trusted_destinations_checked: 1,
      exact_match: status === 'VERIFIED',
    },
    image_quality: {
      overall_quality: 'ACCEPTABLE',
      mean_brightness: 120,
      contrast_score: 50,
      sharpness_score: 220,
      dynamic_range: 190,
      brightness_classification: 'ACCEPTABLE',
      contrast_classification: 'ACCEPTABLE_CONTRAST',
      sharpness_classification: 'ACCEPTABLE_SHARPNESS',
      quality_flags: [],
    },
    composite_evidence: {
      destination: {
        scanned_destination: 'merchant@icici',
        destination_match: status === 'VERIFIED',
        active_trusted_destinations_checked: 1,
        exact_match: status === 'VERIFIED',
      },
      image_quality: {
        overall_quality: 'ACCEPTABLE',
        brightness_classification: 'ACCEPTABLE',
        contrast_classification: 'ACCEPTABLE_CONTRAST',
        sharpness_classification: 'ACCEPTABLE_SHARPNESS',
      },
      tamper: {
        available: false,
      },
    },
    risk_factors: status === 'DESTINATION_MISMATCH' ? ['DESTINATION_CONFLICT'] : [],
    recommendation:
      status === 'VERIFIED' ? 'REVIEW_NOT_REQUIRED' : 'DO_NOT_PROCEED_WITH_PAYMENT',
    explanation:
      status === 'VERIFIED'
        ? 'Scanned payment destination matches active trusted registration.'
        : 'The scanned payment destination conflicts with the active trusted destination.',
    explanation_metadata: {
      provider: 'deterministic_fallback',
      model: null,
    },
    processing_metadata: {
      verification_id: 'uuid-test-9999',
      timestamp: new Date().toISOString(),
      duration_ms: 45.2,
    },
  };
}

describe('VerifyPage Integration Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. triggers verification API when an image is selected', async () => {
    const mockResponse = createMockResponse('VERIFIED');
    const verifySpy = vi.spyOn(apiModule, 'verifyQr').mockResolvedValue(mockResponse);

    const { container } = render(<VerifyPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-image-bytes'], 'test-qr.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(verifySpy).toHaveBeenCalledTimes(1);
    });
    expect(verifySpy).toHaveBeenCalledWith(file, { merchantId: undefined });
  });

  it('2. renders successful VERIFIED response with status badge and parity details', async () => {
    const mockResponse = createMockResponse('VERIFIED');
    vi.spyOn(apiModule, 'verifyQr').mockResolvedValue(mockResponse);

    const { container } = render(<VerifyPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-image-bytes'], 'verified-qr.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('VERIFIED')).toBeDefined();
    });

    expect(
      screen.getByText(/Destination Parity Verified \(Exact Match\)/i),
    ).toBeDefined();
    expect(
      screen.getByText(
        'Scanned payment destination matches active trusted registration.',
      ),
    ).toBeDefined();
    expect(screen.getByText(/No adverse risk factors identified/i)).toBeDefined();
  });

  it('3. renders DESTINATION_MISMATCH status badge and active risk factors', async () => {
    const mockResponse = createMockResponse('DESTINATION_MISMATCH');
    vi.spyOn(apiModule, 'verifyQr').mockResolvedValue(mockResponse);

    const { container } = render(<VerifyPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-image-bytes'], 'mismatch-qr.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('DESTINATION MISMATCH')).toBeDefined();
    });

    expect(screen.getByText(/Destination Conflict Identified/i)).toBeDefined();
    expect(screen.getByText('DESTINATION_CONFLICT')).toBeDefined();
  });

  it('4. renders UNVERIFIED response correctly', async () => {
    const mockResponse = createMockResponse('UNVERIFIED');
    mockResponse.registered_destination = null;
    mockResponse.risk_factors = ['NO_TRUSTED_REGISTRATION'];
    mockResponse.recommendation = 'VERIFY_MERCHANT_BEFORE_PAYMENT';
    vi.spyOn(apiModule, 'verifyQr').mockResolvedValue(mockResponse);

    const { container } = render(<VerifyPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-image-bytes'], 'unverified-qr.png', {
      type: 'image/png',
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('UNVERIFIED')).toBeDefined();
    });

    expect(screen.getByText(/No Registered Destination for Comparison/i)).toBeDefined();
  });

  it('5. renders SUSPICIOUS response correctly', async () => {
    const mockResponse = createMockResponse('SUSPICIOUS');
    mockResponse.risk_factors = ['VISUAL_STRUCTURAL_DIFFERENCE'];
    mockResponse.recommendation = 'MANUAL_INSPECTION_RECOMMENDED';
    vi.spyOn(apiModule, 'verifyQr').mockResolvedValue(mockResponse);

    const { container } = render(<VerifyPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-image-bytes'], 'suspicious-qr.png', {
      type: 'image/png',
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('SUSPICIOUS')).toBeDefined();
    });

    expect(screen.getByText('VISUAL_STRUCTURAL_DIFFERENCE')).toBeDefined();
  });

  it('6. renders INSUFFICIENT_EVIDENCE response correctly', async () => {
    const mockResponse = createMockResponse('INSUFFICIENT_EVIDENCE');
    mockResponse.risk_factors = ['IMAGE_QUALITY_INSUFFICIENT'];
    mockResponse.recommendation = 'CAPTURE_CLEARER_IMAGE';
    vi.spyOn(apiModule, 'verifyQr').mockResolvedValue(mockResponse);

    const { container } = render(<VerifyPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-image-bytes'], 'blurry-qr.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('INSUFFICIENT EVIDENCE')).toBeDefined();
    });

    expect(screen.getByText('IMAGE_QUALITY_INSUFFICIENT')).toBeDefined();
  });

  it('7. renders API error alert with retry action when verification fails', async () => {
    const error = new apiModule.ApiClientError(
      'No readable QR code pattern was detected in the provided image.',
      422,
      'E_NO_QR_DETECTED',
      'Ensure the QR code is clearly visible and within the frame.',
    );
    vi.spyOn(apiModule, 'verifyQr').mockRejectedValue(error);

    const { container } = render(<VerifyPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['blank-bytes'], 'blank.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Verification Failed \(E_NO_QR_DETECTED\)/i)).toBeDefined();
    });

    expect(
      screen.getAllByText(
        'No readable QR code pattern was detected in the provided image.',
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Retry')).toBeDefined();
  });

  it('8. shows loading indicator and prevents duplicate submission while request is inflight', async () => {
    let resolvePromise: (value: VerifySuccessResponse) => void;
    const inflightPromise = new Promise<VerifySuccessResponse>((resolve) => {
      resolvePromise = resolve;
    });

    const verifySpy = vi.spyOn(apiModule, 'verifyQr').mockReturnValue(inflightPromise);

    const { container } = render(<VerifyPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-image-bytes'], 'qr.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText(/Analyzing QR code matrix/i)).toBeDefined();
    expect(verifySpy).toHaveBeenCalledTimes(1);

    // Attempt second drop while loading
    fireEvent.change(input, { target: { files: [file] } });
    expect(verifySpy).toHaveBeenCalledTimes(1);

    // Resolve inflight request
    resolvePromise!(createMockResponse('VERIFIED'));

    await waitFor(() => {
      expect(screen.getByText('VERIFIED')).toBeDefined();
    });
  });
});
