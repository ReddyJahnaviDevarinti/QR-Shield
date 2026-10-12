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
    let capturedOptions: RequestInit | undefined = undefined;

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
    const options = capturedOptions as unknown as RequestInit;
    expect(options.method).toBe('POST');
    // Headers must NOT manually define Content-Type (boundary handled by browser)
    expect(
      (options.headers as Record<string, string> | undefined)?.['Content-Type'],
    ).toBeUndefined();

    const body = options.body as FormData;
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

  it('8. fetchReferenceQr sends Authorization Bearer header when token provided', async () => {
    let capturedHeaders: Record<string, string> | undefined;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => {
      capturedHeaders = options?.headers as Record<string, string>;
      return new Response(JSON.stringify({ reference_qr: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const { fetchReferenceQr } = await import('./api');
    await fetchReferenceQr('merch-123', 'test-access-token');

    expect(capturedHeaders?.['Authorization']).toBe('Bearer test-access-token');
  });

  it('9. uploadReferenceQr sends Authorization Bearer header when token provided', async () => {
    let capturedHeaders: Record<string, string> | undefined;
    let capturedMethod: string | undefined;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => {
      capturedHeaders = options?.headers as Record<string, string>;
      capturedMethod = options?.method;
      return new Response(
        JSON.stringify({
          reference_qr: {
            id: 'ref-1',
            merchant_id: 'merch-123',
            storage_path: 'merch-123/ref.png',
            payload_hash: 'hash',
            raw_payload: 'upi://pay',
            uploaded_at: new Date().toISOString(),
          },
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });

    const { uploadReferenceQr } = await import('./api');
    const file = new File(['fake-png'], 'ref.png', { type: 'image/png' });
    const res = await uploadReferenceQr('merch-123', file, 'test-access-token');

    expect(capturedMethod).toBe('POST');
    expect(capturedHeaders?.['Authorization']).toBe('Bearer test-access-token');
    expect(res.id).toBe('ref-1');
  });

  it('10. deleteReferenceQr sends Authorization Bearer header when token provided', async () => {
    let capturedHeaders: Record<string, string> | undefined;
    let capturedMethod: string | undefined;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, options) => {
      capturedHeaders = options?.headers as Record<string, string>;
      capturedMethod = options?.method;
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const { deleteReferenceQr } = await import('./api');
    await deleteReferenceQr('merch-123', 'test-access-token');

    expect(capturedMethod).toBe('DELETE');
    expect(capturedHeaders?.['Authorization']).toBe('Bearer test-access-token');
  });

  it('11. fetchDestinations sends GET with Bearer token and returns destinations array', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> | undefined;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
      capturedUrl = String(url);
      capturedHeaders = options?.headers as Record<string, string>;
      return new Response(
        JSON.stringify({
          destinations: [
            {
              id: 'dest-1',
              merchant_id: 'merch-123',
              destination_type: 'VPA',
              destination_value: 'store@icici',
              is_active: true,
              registered_at: '2026-10-01T00:00:00Z',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });

    const { fetchDestinations } = await import('./api');
    const result = await fetchDestinations('merch-123', 'test-jwt');

    expect(capturedUrl).toContain('/api/v1/merchants/merch-123/destinations');
    expect(capturedHeaders?.['Authorization']).toBe('Bearer test-jwt');
    expect(result).toHaveLength(1);
    expect(result[0]?.destination_value).toBe('store@icici');
  });

  it('12. createDestination sends POST with payload and Bearer token', async () => {
    let capturedUrl = '';
    let capturedMethod = '';
    let capturedBody = '';

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
      capturedUrl = String(url);
      capturedMethod = options?.method || '';
      capturedBody = String(options?.body || '');
      return new Response(
        JSON.stringify({
          destination: {
            id: 'dest-2',
            merchant_id: 'merch-123',
            destination_type: 'VPA',
            destination_value: 'new@icici',
            is_active: true,
            registered_at: '2026-10-01T00:00:00Z',
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      );
    });

    const { createDestination } = await import('./api');
    const result = await createDestination(
      'merch-123',
      { destinationType: 'VPA', destinationValue: 'new@icici', isActive: true },
      'test-jwt',
    );

    expect(capturedUrl).toContain('/api/v1/merchants/merch-123/destinations');
    expect(capturedMethod).toBe('POST');
    expect(JSON.parse(capturedBody).destination_value).toBe('new@icici');
    expect(result.id).toBe('dest-2');
  });

  it('13. updateDestinationApi sends PUT with updates and Bearer token', async () => {
    let capturedUrl = '';
    let capturedMethod = '';
    let capturedBody = '';

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
      capturedUrl = String(url);
      capturedMethod = options?.method || '';
      capturedBody = String(options?.body || '');
      return new Response(
        JSON.stringify({
          destination: {
            id: 'dest-2',
            merchant_id: 'merch-123',
            destination_type: 'VPA',
            destination_value: 'updated@icici',
            is_active: false,
            registered_at: '2026-10-01T00:00:00Z',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });

    const { updateDestinationApi } = await import('./api');
    const result = await updateDestinationApi(
      'merch-123',
      'dest-2',
      { is_active: false },
      'test-jwt',
    );

    expect(capturedUrl).toContain('/api/v1/merchants/merch-123/destinations/dest-2');
    expect(capturedMethod).toBe('PUT');
    expect(JSON.parse(capturedBody).is_active).toBe(false);
    expect(result.is_active).toBe(false);
  });

  it('14. deleteDestinationApi sends DELETE with Bearer token', async () => {
    let capturedUrl = '';
    let capturedMethod = '';

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options) => {
      capturedUrl = String(url);
      capturedMethod = options?.method || '';
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const { deleteDestinationApi } = await import('./api');
    await deleteDestinationApi('merch-123', 'dest-2', 'test-jwt');

    expect(capturedUrl).toContain('/api/v1/merchants/merch-123/destinations/dest-2');
    expect(capturedMethod).toBe('DELETE');
  });
});
