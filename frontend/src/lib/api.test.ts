import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyQr, ApiClientError, VerifySuccessResponse } from './api';

describe('Frontend API Client (verifyQr)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockSuccessResponse: VerifySuccessResponse = {
    verification_status: 'VERIFIED',
    decoded_payload: 'upi://pay?pa=store@icici&pn=Test%20Store&mc=5411',
    normalized_destination: 'store@icici',
    registered_destination: 'store@icici',
    destination_match: true,
    evidence: {
      normalized_scanned_destination: 'store@icici',
      active_trusted_destinations_checked: 1,
      exact_match: true,
    },
    image_quality: {
      overall_quality: 'ACCEPTABLE',
      mean_brightness: 128,
      contrast_score: 55,
      sharpness_score: 250,
      dynamic_range: 200,
      brightness_classification: 'ACCEPTABLE',
      contrast_classification: 'ACCEPTABLE_CONTRAST',
      sharpness_classification: 'ACCEPTABLE_SHARPNESS',
      quality_flags: [],
    },
    composite_evidence: {
      destination: {
        scanned_destination: 'store@icici',
        destination_match: true,
        active_trusted_destinations_checked: 1,
        exact_match: true,
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
    risk_factors: [],
    recommendation: 'REVIEW_NOT_REQUIRED',
    explanation: 'Scanned payment destination matches active trusted registration.',
    explanation_metadata: {
      provider: 'gemini',
      model: 'gemini-3.8-flash',
    },
    processing_metadata: {
      verification_id: 'test-uuid-1234',
      timestamp: new Date().toISOString(),
      duration_ms: 125.5,
    },
  };

  it('1. forms multipart request correctly with image field and no manual Content-Type', async () => {
    let capturedUrl = '';
    let capturedOptions: any = null;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
      capturedUrl = String(url);
      capturedOptions = options;
      return new Response(JSON.stringify(mockSuccessResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const file = new File(['fake-png-content'], 'qr.png', { type: 'image/png' });
    const result = await verifyQr(file, { merchantId: 'merch-42' });

    expect(capturedUrl).toContain('/api/v1/verify');
    expect(capturedOptions?.method).toBe('POST');
    // Headers must NOT manually define Content-Type (boundary handled by browser)
    expect(
      (capturedOptions?.headers as Record<string, string>)?.['Content-Type'],
    ).toBeUndefined();

    const body = capturedOptions?.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('image')).toBeDefined();
    expect(body.get('merchant_id')).toBe('merch-42');
    expect(result.verification_status).toBe('VERIFIED');
  });

  it('2. validates file existence and rejects empty files', async () => {
    const emptyFile = new File([], 'empty.png', { type: 'image/png' });
    await expect(verifyQr(emptyFile)).rejects.toThrow(
      'The selected image file is empty.',
    );
  });

  it('3. rejects files exceeding 10MB limit', async () => {
    const largeFile = new File(['x'], 'large.png', { type: 'image/png' });
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });

    await expect(verifyQr(largeFile)).rejects.toThrow(
      'Image file size exceeds the 10 MB limit.',
    );
  });

  it('4. rejects unsupported MIME types', async () => {
    const pdfFile = new File(['content'], 'file.pdf', { type: 'application/pdf' });
    await expect(verifyQr(pdfFile)).rejects.toThrow(
      "Unsupported image format 'application/pdf'",
    );
  });

  it('5. handles network failure cleanly', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    const file = new File(['fake-png'], 'qr.png', { type: 'image/png' });
    await expect(verifyQr(file)).rejects.toThrow(ApiClientError);
    await expect(verifyQr(file)).rejects.toMatchObject({
      code: 'E_NETWORK_ERROR',
      status: 0,
    });
  });

  it('6. handles server 4xx/5xx error responses with detailed backend error code', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'E_NO_QR_DETECTED',
            message: 'No readable QR code pattern was detected in the provided image.',
            details: 'Ensure QR is clearly visible.',
          },
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const file = new File(['fake-png'], 'no-qr.png', { type: 'image/png' });
    await expect(verifyQr(file)).rejects.toMatchObject({
      code: 'E_NO_QR_DETECTED',
      message: 'No readable QR code pattern was detected in the provided image.',
      status: 422,
      details: 'Ensure QR is clearly visible.',
    });
  });

  it('7. handles non-JSON server error response gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>Bad Gateway</html>', { status: 502 }),
    );

    const file = new File(['fake-png'], 'qr.png', { type: 'image/png' });
    await expect(verifyQr(file)).rejects.toMatchObject({
      code: 'E_MALFORMED_RESPONSE',
      status: 502,
    });
  });
});
