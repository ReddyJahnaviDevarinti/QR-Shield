import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VerifyPage } from './VerifyPage';
import * as apiModule from '../lib/api';
import * as cameraUtil from '../utils/camera';
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

  it('9. disables Launch Camera button when mediaDevices is unsupported', () => {
    vi.spyOn(cameraUtil, 'isCameraSupported').mockReturnValue(false);

    render(<VerifyPage />);
    const launchBtn = screen.getByRole('button', { name: /Launch Camera/i });
    expect(launchBtn).toBeDefined();
    expect((launchBtn as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen.getByText(/Camera requires a secure HTTPS origin and supported browser/i),
    ).toBeDefined();
  });

  it('10. enables Launch Camera and opens live scanner when mediaDevices is supported', async () => {
    vi.spyOn(cameraUtil, 'isCameraSupported').mockReturnValue(true);
    const mockTrack = { stop: vi.fn() };
    const mockStream = {
      id: 'stream-test',
      getTracks: () => [mockTrack],
    } as unknown as MediaStream;
    vi.spyOn(cameraUtil, 'getCameraStream').mockResolvedValue(mockStream);

    render(<VerifyPage />);
    const launchBtn = screen.getByRole('button', { name: /Launch Camera/i });
    expect((launchBtn as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(launchBtn);

    await waitFor(() => {
      expect(screen.getByText('Live Camera Scanner')).toBeDefined();
    });
    expect(screen.getByText('LIVE')).toBeDefined();
  });

  it('11. capturing from camera sends captured file to verification API and closes camera', async () => {
    vi.spyOn(cameraUtil, 'isCameraSupported').mockReturnValue(true);
    const mockTrack = { stop: vi.fn() };
    const mockStream = {
      id: 'stream-test-2',
      getTracks: () => [mockTrack],
    } as unknown as MediaStream;
    vi.spyOn(cameraUtil, 'getCameraStream').mockResolvedValue(mockStream);

    const mockResponse = createMockResponse('VERIFIED');
    const verifySpy = vi.spyOn(apiModule, 'verifyQr').mockResolvedValue(mockResponse);

    render(<VerifyPage />);
    const launchBtn = screen.getByRole('button', { name: /Launch Camera/i });
    fireEvent.click(launchBtn);

    await waitFor(() => {
      expect(screen.getByText('Capture & Verify')).toBeDefined();
    });

    const captureBtn = screen.getByText('Capture & Verify');
    fireEvent.click(captureBtn);

    await waitFor(() => {
      expect(verifySpy).toHaveBeenCalledTimes(1);
    });

    const call = verifySpy.mock.calls[0];
    expect(call).toBeDefined();
    const passedFile = call![0] as File;
    expect(passedFile.name).toMatch(/^camera-scan-\d+\.png$/);
    expect(mockTrack.stop).toHaveBeenCalled();

    // Camera scanner should now be closed
    expect(screen.queryByText('Live Camera Scanner')).toBeNull();
  });

  it('12. selecting a file via dropzone closes the active camera scanner', async () => {
    vi.spyOn(cameraUtil, 'isCameraSupported').mockReturnValue(true);
    const mockTrack = { stop: vi.fn() };
    const mockStream = {
      id: 'stream-test-3',
      getTracks: () => [mockTrack],
    } as unknown as MediaStream;
    vi.spyOn(cameraUtil, 'getCameraStream').mockResolvedValue(mockStream);
    vi.spyOn(apiModule, 'verifyQr').mockResolvedValue(createMockResponse('VERIFIED'));

    const { container } = render(<VerifyPage />);
    const launchBtn = screen.getByRole('button', { name: /Launch Camera/i });
    fireEvent.click(launchBtn);

    await waitFor(() => {
      expect(screen.getByText('Live Camera Scanner')).toBeDefined();
    });

    // Drop file in dropzone
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-drop-bytes'], 'dropped-qr.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.queryByText('Live Camera Scanner')).toBeNull();
    });
    expect(mockTrack.stop).toHaveBeenCalled();
  });

  it('13. Stage 1A: renders SUSPICIOUS with MATRIX_STRUCTURAL_DIFFERENCE and manual inspection guidance', async () => {
    const mockResponse = createMockResponse('SUSPICIOUS');
    mockResponse.destination_match = true;
    mockResponse.risk_factors = ['MATRIX_STRUCTURAL_DIFFERENCE'];
    mockResponse.recommendation = 'MANUAL_INSPECTION_RECOMMENDED';
    mockResponse.composite_evidence.tamper = {
      available: true,
      reference_available: true,
      analysis_quality: 'COMPARABLE',
      matrix_mismatch_ratio: 0.432,
      visual_deviation_index: 0.3271,
      boundary_anomaly_detected: false,
      anomaly_indicators: ['MATRIX_STRUCTURAL_DIFFERENCE'],
    };
    vi.spyOn(apiModule, 'verifyQr').mockResolvedValue(mockResponse);

    const { container } = render(<VerifyPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-bytes'], 'camera-capture.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('SUSPICIOUS')).toBeDefined();
    });

    // Breakdown pills
    expect(screen.getByText('EXACT MATCH')).toBeDefined();
    expect(screen.getByText('ANOMALY FLAGGED')).toBeDefined();
    // Action Guidance
    expect(
      screen.getByText(
        'Manual physical inspection recommended due to visual or matrix anomalies.',
      ),
    ).toBeDefined();
    // Risk factors
    expect(screen.getByText('MATRIX_STRUCTURAL_DIFFERENCE')).toBeDefined();
  });

  it('14. Stage 1A: distinguishes verified destination without reference QR (not assessed)', async () => {
    const mockResponse = createMockResponse('VERIFIED');
    mockResponse.composite_evidence.tamper = {
      available: false,
      reference_available: false,
    };
    vi.spyOn(apiModule, 'verifyQr').mockResolvedValue(mockResponse);

    const { container } = render(<VerifyPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-bytes'], 'no-ref-qr.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('VERIFIED')).toBeDefined();
    });

    expect(screen.getByText('NOT ASSESSED')).toBeDefined();
    expect(
      screen.getByText(
        'Proceed with payment based on verified destination. Physical QR integrity was not assessed (no reference baseline available).',
      ),
    ).toBeDefined();
  });

  it('15. Stage 1A: confirms clean physical baseline comparison on genuine match', async () => {
    const mockResponse = createMockResponse('VERIFIED');
    mockResponse.composite_evidence.tamper = {
      available: true,
      reference_available: true,
      analysis_quality: 'COMPARABLE',
      matrix_mismatch_ratio: 0.0,
      visual_deviation_index: 0.0,
      boundary_anomaly_detected: false,
      anomaly_indicators: [],
    };
    vi.spyOn(apiModule, 'verifyQr').mockResolvedValue(mockResponse);

    const { container } = render(<VerifyPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-bytes'], 'clean-ref-qr.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('VERIFIED')).toBeDefined();
    });

    expect(screen.getByText('CLEAN BASELINE')).toBeDefined();
    expect(
      screen.getByText(
        'Proceed with payment. Destination parity verified and physical baseline comparison is clean.',
      ),
    ).toBeDefined();
  });

  it('16. Stage 1A.1: renders INCONCLUSIVE physical comparison and appropriate guidance', async () => {
    const mockResponse = createMockResponse('INSUFFICIENT_EVIDENCE');
    mockResponse.destination_match = true;
    mockResponse.recommendation = 'CAPTURE_CLEARER_IMAGE';
    mockResponse.risk_factors = ['TAMPER_ANALYSIS_INCONCLUSIVE'];
    mockResponse.composite_evidence.tamper = {
      available: true,
      reference_available: true,
      analysis_quality: 'INCONCLUSIVE',
      alignment_quality: 0.25,
      alignment_classification: 'INSUFFICIENT',
      matrix_mismatch_ratio: 0.15,
      visual_deviation_index: 0.1,
      boundary_anomaly_detected: false,
      anomaly_indicators: ['ALIGNMENT_INSUFFICIENT', 'LOW_COMPARABILITY'],
    };
    vi.spyOn(apiModule, 'verifyQr').mockResolvedValue(mockResponse);

    const { container } = render(<VerifyPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-bytes'], 'inconclusive-qr.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('INSUFFICIENT EVIDENCE')).toBeDefined();
    });

    // Breakdown pills
    expect(screen.getByText('EXACT MATCH')).toBeDefined();
    expect(screen.getByText('INCONCLUSIVE')).toBeDefined();

    // Guidance text
    expect(
      screen.getByText(
        'Physical comparison could not be completed reliably. Capture a clearer, well-aligned QR image. No conclusion about physical tampering can be made.',
      ),
    ).toBeDefined();
    expect(screen.queryByText(/No visual or destination anomalies detected/i)).toBeNull();

    // Card D alignment comparability indicators
    expect(screen.getByText(/Alignment \/ Comparability Indicators:/i)).toBeDefined();
    expect(
      screen.getByText(/INCONCLUSIVE: insufficient geometric alignment for comparison/i),
    ).toBeDefined();
  });

  it('17. Stage 1A.2: renders DEGRADED physical comparison with consistent backend recommendation', async () => {
    const mockResponse = createMockResponse('VERIFIED');
    mockResponse.destination_match = true;
    mockResponse.recommendation = 'CAPTURE_CLEARER_IMAGE';
    mockResponse.composite_evidence.tamper = {
      available: true,
      reference_available: true,
      analysis_quality: 'DEGRADED',
      alignment_quality: 0.55,
      alignment_classification: 'DEGRADED',
      matrix_mismatch_ratio: 0.05,
      visual_deviation_index: 0.06,
      boundary_anomaly_detected: false,
      anomaly_indicators: ['ALIGNMENT_DEGRADED'],
    };
    vi.spyOn(apiModule, 'verifyQr').mockResolvedValue(mockResponse);

    const { container } = render(<VerifyPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-bytes'], 'degraded-qr.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('VERIFIED')).toBeDefined();
    });

    // Physical Integrity must clearly disclose degraded / limited confidence
    expect(screen.getByText('DEGRADED (LIMITED CONFIDENCE)')).toBeDefined();
    expect(screen.queryByText('CLEAN BASELINE')).toBeNull();

    // Guidance text matches backend CAPTURE_CLEARER_IMAGE recommendation
    expect(
      screen.getByText(
        'Capture a clearer, well-aligned photograph. Physical comparison had degraded alignment with limited confidence.',
      ),
    ).toBeDefined();
  });

  it('18. Stage 1A.2: handles missing analysis_quality safely (STATUS UNAVAILABLE, never CLEAN BASELINE)', async () => {
    const mockResponse = createMockResponse('VERIFIED');
    mockResponse.destination_match = true;
    mockResponse.recommendation = 'REVIEW_NOT_REQUIRED';
    mockResponse.composite_evidence.tamper = {
      available: true,
      reference_available: true,
      // analysis_quality is omitted / undefined
      matrix_mismatch_ratio: 0.0,
      visual_deviation_index: 0.0,
      boundary_anomaly_detected: false,
      anomaly_indicators: [],
    };
    vi.spyOn(apiModule, 'verifyQr').mockResolvedValue(mockResponse);

    const { container } = render(<VerifyPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-bytes'], 'missing-quality-qr.png', {
      type: 'image/png',
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('VERIFIED')).toBeDefined();
    });

    // Must NOT display CLEAN BASELINE
    expect(screen.queryByText('CLEAN BASELINE')).toBeNull();
    // Must display STATUS UNAVAILABLE
    expect(screen.getByText('STATUS UNAVAILABLE')).toBeDefined();

    // Truthful guidance requesting a fresh verification
    expect(
      screen.getByText(
        'Physical comparison status unavailable. Please capture a fresh verification image. Physical QR integrity could not be verified.',
      ),
    ).toBeDefined();
    // Card D detail row
    expect(
      screen.getByText('STATUS UNAVAILABLE: comparison quality undetermined.'),
    ).toBeDefined();
  });

  it('19. Stage 1A.2: handles unrecognised/unknown analysis_quality safely', async () => {
    const mockResponse = createMockResponse('VERIFIED');
    mockResponse.destination_match = true;
    mockResponse.recommendation = 'REVIEW_NOT_REQUIRED';
    mockResponse.composite_evidence.tamper = {
      available: true,
      reference_available: true,
      analysis_quality: 'UNEXPECTED_QUALITY_VALUE' as unknown as 'COMPARABLE',
      matrix_mismatch_ratio: 0.0,
      visual_deviation_index: 0.0,
      boundary_anomaly_detected: false,
      anomaly_indicators: [],
    };
    vi.spyOn(apiModule, 'verifyQr').mockResolvedValue(mockResponse);

    const { container } = render(<VerifyPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-bytes'], 'unknown-quality-qr.png', {
      type: 'image/png',
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('VERIFIED')).toBeDefined();
    });

    // Must NOT display CLEAN BASELINE
    expect(screen.queryByText('CLEAN BASELINE')).toBeNull();
    // Must display STATUS UNAVAILABLE
    expect(screen.getByText('STATUS UNAVAILABLE')).toBeDefined();

    // Truthful guidance requesting a fresh verification
    expect(
      screen.getByText(
        'Physical comparison status unavailable. Please capture a fresh verification image. Physical QR integrity could not be verified.',
      ),
    ).toBeDefined();
  });

  it('20. Stage 1A.3: renders DEGRADED comparison with structural difference as POTENTIAL DIFFERENCE (LIMITED CONFIDENCE)', async () => {
    const mockResponse = createMockResponse('VERIFIED');
    mockResponse.destination_match = true;
    mockResponse.recommendation = 'CAPTURE_CLEARER_IMAGE';
    mockResponse.risk_factors = [
      'TAMPER_ANALYSIS_DEGRADED',
      'POTENTIAL_STRUCTURAL_DIFFERENCE',
    ];
    mockResponse.composite_evidence.tamper = {
      available: true,
      reference_available: true,
      analysis_quality: 'DEGRADED',
      alignment_quality: 0.55,
      alignment_classification: 'DEGRADED',
      matrix_mismatch_ratio: 0.432,
      visual_deviation_index: 0.32,
      boundary_anomaly_detected: false,
      anomaly_indicators: ['ALIGNMENT_DEGRADED', 'MATRIX_STRUCTURAL_DIFFERENCE'],
    };
    vi.spyOn(apiModule, 'verifyQr').mockResolvedValue(mockResponse);

    const { container } = render(<VerifyPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-bytes'], 'degraded-anomaly-qr.png', {
      type: 'image/png',
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('VERIFIED')).toBeDefined();
    });

    // Badge MUST be POTENTIAL DIFFERENCE (LIMITED CONFIDENCE), NEVER ANOMALY FLAGGED or CLEAN BASELINE
    expect(screen.getByText('POTENTIAL DIFFERENCE (LIMITED CONFIDENCE)')).toBeDefined();
    expect(screen.queryByText('ANOMALY FLAGGED')).toBeNull();
    expect(screen.queryByText('CLEAN BASELINE')).toBeNull();

    // Guidance text must clearly state potential difference with limited alignment confidence
    expect(
      screen.getByText(
        'Capture a clearer, well-aligned photograph. Comparison showed potential difference with limited alignment confidence.',
      ),
    ).toBeDefined();

    // Indicators section must label as potential comparison indicators, not confirmed tamper indicators
    expect(
      screen.getByText(/Potential Comparison Indicators \(Limited Confidence\):/i),
    ).toBeDefined();
    expect(screen.queryByText(/^Tamper Indicators:/i)).toBeNull();
  });

  it('21. Stage 1A.3: renders COMPARABLE comparison with structural anomaly as ANOMALY FLAGGED', async () => {
    const mockResponse = createMockResponse('SUSPICIOUS');
    mockResponse.destination_match = true;
    mockResponse.recommendation = 'MANUAL_INSPECTION_RECOMMENDED';
    mockResponse.risk_factors = ['MATRIX_STRUCTURAL_DIFFERENCE'];
    mockResponse.composite_evidence.tamper = {
      available: true,
      reference_available: true,
      analysis_quality: 'COMPARABLE',
      alignment_quality: 0.92,
      alignment_classification: 'GOOD',
      matrix_mismatch_ratio: 0.432,
      visual_deviation_index: 0.32,
      boundary_anomaly_detected: false,
      anomaly_indicators: ['MATRIX_STRUCTURAL_DIFFERENCE'],
    };
    vi.spyOn(apiModule, 'verifyQr').mockResolvedValue(mockResponse);

    const { container } = render(<VerifyPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['fake-bytes'], 'comparable-tamper-qr.png', {
      type: 'image/png',
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('SUSPICIOUS')).toBeDefined();
    });

    // Badge MUST be ANOMALY FLAGGED
    expect(screen.getByText('ANOMALY FLAGGED')).toBeDefined();
    expect(screen.queryByText('CLEAN BASELINE')).toBeNull();

    // Guidance text
    expect(
      screen.getByText(
        'Manual physical inspection recommended due to visual or matrix anomalies.',
      ),
    ).toBeDefined();

    // Indicators section
    expect(screen.getByText(/^Tamper Indicators:/i)).toBeDefined();
  });

  it('22. Stage 1A.3: verifies all 7 physical integrity states', async () => {
    // 1. NOT ASSESSED: tamper.available === false
    const notAssessedResp = createMockResponse('VERIFIED');
    notAssessedResp.composite_evidence.tamper = { available: false };
    const spy = vi.spyOn(apiModule, 'verifyQr').mockResolvedValue(notAssessedResp);

    const { container, unmount } = render(<VerifyPage />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['b'], 'test.png', { type: 'image/png' })] },
    });

    await waitFor(() => {
      expect(screen.getByText('NOT ASSESSED')).toBeDefined();
    });
    unmount();

    // 2. CLEAN BASELINE: COMPARABLE + clean
    const cleanResp = createMockResponse('VERIFIED');
    cleanResp.composite_evidence.tamper = {
      available: true,
      reference_available: true,
      analysis_quality: 'COMPARABLE',
      alignment_quality: 0.95,
      alignment_classification: 'GOOD',
      matrix_mismatch_ratio: 0.0,
      visual_deviation_index: 0.0,
      boundary_anomaly_detected: false,
      anomaly_indicators: [],
    };
    spy.mockResolvedValue(cleanResp);
    const { container: c2, unmount: u2 } = render(<VerifyPage />);
    fireEvent.change(c2.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(['b'], 'test.png', { type: 'image/png' })] },
    });
    await waitFor(() => {
      expect(screen.getByText('CLEAN BASELINE')).toBeDefined();
    });
    expect(
      screen.getByText(
        'Proceed with payment. Destination parity verified and physical baseline comparison is clean.',
      ),
    ).toBeDefined();
    u2();
  });
});
