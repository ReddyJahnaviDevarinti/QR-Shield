import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { buildApp } from '../app.js';
import * as registryModule from '../integrations/trusted-registry/index.js';
import { RegistryQueryFailedError } from '../integrations/trusted-registry/errors.js';
import { supabaseServer } from '../integrations/supabase/client.js';
import { execSync } from 'node:child_process';

/**
 * Generates an in-memory PNG QR code buffer using the test qrcode library.
 */
async function generateQrBuffer(payload: string): Promise<Buffer> {
  return QRCode.toBuffer(payload, {
    type: 'png',
    width: 400,
    margin: 4,
    errorCorrectionLevel: 'M',
  });
}

/**
 * Creates an in-memory multipart/form-data request body with proper boundaries.
 */
function createMultipartRequest(
  fields: Record<string, string>,
  file?: { fieldname: string; filename: string; mimetype: string; content: Buffer },
): { headers: Record<string, string>; payload: Buffer } {
  const boundary =
    '----WebKitFormBoundaryQRShield' + Math.random().toString(36).substring(2);
  const chunks: Buffer[] = [];

  for (const [key, value] of Object.entries(fields)) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`,
      ),
    );
  }

  if (file) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"\r\nContent-Type: ${file.mimetype}\r\n\r\n`,
      ),
    );
    chunks.push(file.content);
    chunks.push(Buffer.from('\r\n'));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
    },
    payload: Buffer.concat(chunks),
  };
}

describe('End-to-End QR Verification API (POST /api/v1/verify)', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Valid registered VPA with no merchant_id returns VERIFIED', async () => {
    const qrBuffer = await generateQrBuffer(
      'upi://pay?pa=store@icici&pn=Test%20Store&mc=5411',
    );
    vi.spyOn(registryModule, 'findActiveTrustedDestinations').mockResolvedValueOnce([
      {
        merchantId: 'merchant-101',
        destinationType: 'VPA',
        destinationValue: 'store@icici',
        isActive: true,
      },
    ]);

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'qr.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.verification_status).toBe('VERIFIED');
    expect(body.destination_match).toBe(true);
    expect(body.registered_destination).toBe('store@icici');
    expect(body.normalized_destination).toBe('store@icici');
    expect(body.explanation).toBe(
      'The scanned payment destination matches an active trusted registration.',
    );
  });

  it('2. Unknown VPA with no merchant_id returns UNVERIFIED', async () => {
    const qrBuffer = await generateQrBuffer(
      'upi://pay?pa=unknown-store@icici&pn=Unknown%20Store',
    );
    vi.spyOn(registryModule, 'findActiveTrustedDestinations').mockResolvedValueOnce([]);

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'qr.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.verification_status).toBe('UNVERIFIED');
    expect(body.destination_match).toBe(false);
    expect(body.registered_destination).toBeNull();
    expect(body.explanation).toBe(
      'No active trusted destination is available for comparison.',
    );
  });

  it('3. Valid VPA with merchant_id returns VERIFIED', async () => {
    const qrBuffer = await generateQrBuffer(
      'upi://pay?pa=store@icici&pn=Test%20Store&mc=5411',
    );
    vi.spyOn(
      registryModule,
      'findActiveTrustedDestinationsForMerchant',
    ).mockResolvedValueOnce([
      {
        merchantId: 'merchant-abc',
        destinationType: 'VPA',
        destinationValue: 'store@icici',
        isActive: true,
      },
    ]);

    const req = createMultipartRequest(
      { merchant_id: 'merchant-abc' },
      {
        fieldname: 'image',
        filename: 'qr.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.verification_status).toBe('VERIFIED');
    expect(body.destination_match).toBe(true);
    expect(body.registered_destination).toBe('store@icici');
  });

  it('4. Wrong VPA with merchant_id returns DESTINATION_MISMATCH', async () => {
    const qrBuffer = await generateQrBuffer(
      'upi://pay?pa=attacker@upi&pn=Other%20Store&mc=5411',
    );
    vi.spyOn(
      registryModule,
      'findActiveTrustedDestinationsForMerchant',
    ).mockResolvedValueOnce([
      {
        merchantId: 'merchant-abc',
        destinationType: 'VPA',
        destinationValue: 'legit-store@icici',
        isActive: true,
      },
    ]);

    const req = createMultipartRequest(
      { merchant_id: 'merchant-abc' },
      {
        fieldname: 'image',
        filename: 'qr.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.verification_status).toBe('DESTINATION_MISMATCH');
    expect(body.destination_match).toBe(false);
    expect(body.registered_destination).toBeNull();
    expect(body.explanation).toBe(
      'The scanned payment destination conflicts with the active trusted destination for the selected merchant.',
    );
  });

  it('5. Merchant with no active destination returns UNVERIFIED', async () => {
    const qrBuffer = await generateQrBuffer('upi://pay?pa=store@icici&pn=Test%20Store');
    vi.spyOn(
      registryModule,
      'findActiveTrustedDestinationsForMerchant',
    ).mockResolvedValueOnce([]);

    const req = createMultipartRequest(
      { merchant_id: 'merchant-empty' },
      {
        fieldname: 'image',
        filename: 'qr.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.verification_status).toBe('UNVERIFIED');
    expect(body.destination_match).toBe(false);
    expect(body.registered_destination).toBeNull();
  });

  it('6. Inactive merchant destination is ignored and results in UNVERIFIED', async () => {
    const qrBuffer = await generateQrBuffer('upi://pay?pa=store@icici&pn=Test%20Store');
    // Repository contract returns only active destinations; if inactive row is queried it returns empty
    vi.spyOn(
      registryModule,
      'findActiveTrustedDestinationsForMerchant',
    ).mockResolvedValueOnce([]);

    const req = createMultipartRequest(
      { merchant_id: 'merchant-inactive' },
      {
        fieldname: 'image',
        filename: 'qr.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.verification_status).toBe('UNVERIFIED');
    expect(body.destination_match).toBe(false);
  });

  it('7. Valid generic URL with matching trusted URL returns VERIFIED', async () => {
    const qrBuffer = await generateQrBuffer('https://example.com/checkout');
    vi.spyOn(registryModule, 'findActiveTrustedDestinations').mockResolvedValueOnce([
      {
        merchantId: 'merchant-url',
        destinationType: 'URL',
        destinationValue: 'https://example.com/checkout',
        isActive: true,
      },
    ]);

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'qr.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.verification_status).toBe('VERIFIED');
    expect(body.destination_match).toBe(true);
    expect(body.registered_destination).toBe('https://example.com/checkout');
  });

  it('8. Generic URL mismatch with merchant context returns DESTINATION_MISMATCH', async () => {
    const qrBuffer = await generateQrBuffer('https://phishing-site.example/pay');
    vi.spyOn(
      registryModule,
      'findActiveTrustedDestinationsForMerchant',
    ).mockResolvedValueOnce([
      {
        merchantId: 'merchant-legit',
        destinationType: 'URL',
        destinationValue: 'https://legit-store.example/pay',
        isActive: true,
      },
    ]);

    const req = createMultipartRequest(
      { merchant_id: 'merchant-legit' },
      {
        fieldname: 'image',
        filename: 'qr.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.verification_status).toBe('DESTINATION_MISMATCH');
    expect(body.destination_match).toBe(false);
  });

  it('9. Text QR payload returns UNVERIFIED with no payment destination', async () => {
    const qrBuffer = await generateQrBuffer('Hello Plain Text QR Code');

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'qr.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.verification_status).toBe('UNVERIFIED');
    expect(body.destination_match).toBe(false);
    expect(body.normalized_destination).toBeNull();
    expect(body.registered_destination).toBeNull();
  });

  it('10. Missing image returns HTTP 400', async () => {
    const req = createMultipartRequest({ merchant_id: 'merchant-123' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('E_MISSING_IMAGE');
  });

  it('11. Unsupported MIME type returns HTTP 400', async () => {
    const qrBuffer = await generateQrBuffer('upi://pay?pa=store@icici');

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'doc.pdf',
        mimetype: 'application/pdf',
        content: qrBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('E_UNSUPPORTED_MIME_TYPE');
  });

  it('12. Oversized upload returns HTTP 413', async () => {
    // 10 MB + 1 byte
    const largeBuffer = Buffer.alloc(10 * 1024 * 1024 + 1);

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'large.png',
        mimetype: 'image/png',
        content: largeBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    expect(res.statusCode).toBe(413);
    const body = res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('E_PAYLOAD_TOO_LARGE');
  });

  it('13. Corrupt image returns HTTP 400', async () => {
    const corruptBuffer = Buffer.from('NOT_A_VALID_IMAGE_BUFFER_DATA_12345');

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'corrupt.png',
        mimetype: 'image/png',
        content: corruptBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('E_INVALID_IMAGE');
  });

  it('14. No QR in valid image returns HTTP 422', async () => {
    // Generate valid blank red PNG image
    const blankPng = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'blank.png',
        mimetype: 'image/png',
        content: blankPng,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('E_NO_QR_DETECTED');
  });

  it('15. Malformed payload returns HTTP 422', async () => {
    // UPI scheme without mandatory "pa" parameter
    const qrBuffer = await generateQrBuffer('upi://pay?pn=StoreNameWithoutPa');

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'qr.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('E_INVALID_UPI_PAYLOAD');
  });

  it('16. Supabase registry failure returns HTTP 503', async () => {
    const qrBuffer = await generateQrBuffer('upi://pay?pa=store@icici');
    vi.spyOn(registryModule, 'findActiveTrustedDestinations').mockRejectedValueOnce(
      new RegistryQueryFailedError('Database unreachable'),
    );

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'qr.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('E_REGISTRY_UNAVAILABLE');
    // Ensure raw SQL / internal errors are not leaked
    expect(JSON.stringify(body)).not.toContain('Database unreachable');
  });

  it('17. Unexpected internal failure returns HTTP 500', async () => {
    const qrBuffer = await generateQrBuffer('upi://pay?pa=store@icici');
    vi.spyOn(registryModule, 'findActiveTrustedDestinations').mockRejectedValueOnce(
      new Error('Catastrophic failure'),
    );

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'qr.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    expect(res.statusCode).toBe(500);
    const body = res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('E_INTERNAL_ERROR');
    expect(JSON.stringify(body)).not.toContain('Catastrophic failure');
  });

  it('18. Response contains real verification UUID', async () => {
    const qrBuffer = await generateQrBuffer('upi://pay?pa=store@icici');
    vi.spyOn(registryModule, 'findActiveTrustedDestinations').mockResolvedValueOnce([]);

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'qr.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    const body = res.json();
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(body.processing_metadata.verification_id).toMatch(uuidRegex);
  });

  it('19. Response contains dynamic timestamp', async () => {
    const beforeTime = Date.now();
    const qrBuffer = await generateQrBuffer('upi://pay?pa=store@icici');
    vi.spyOn(registryModule, 'findActiveTrustedDestinations').mockResolvedValueOnce([]);

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'qr.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    const body = res.json();
    const timestampParsed = new Date(body.processing_metadata.timestamp).getTime();
    const afterTime = Date.now();

    expect(timestampParsed).toBeGreaterThanOrEqual(beforeTime - 1000);
    expect(timestampParsed).toBeLessThanOrEqual(afterTime + 1000);
  });

  it('20. Response processing duration is numeric and non-negative', async () => {
    const qrBuffer = await generateQrBuffer('upi://pay?pa=store@icici');
    vi.spyOn(registryModule, 'findActiveTrustedDestinations').mockResolvedValueOnce([]);

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'qr.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    const body = res.json();
    expect(typeof body.processing_metadata.duration_ms).toBe('number');
    expect(body.processing_metadata.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('21. No verification log is inserted into Supabase', async () => {
    const qrBuffer = await generateQrBuffer('upi://pay?pa=store@icici');
    vi.spyOn(registryModule, 'findActiveTrustedDestinations').mockResolvedValueOnce([]);

    const insertSpy = vi.spyOn(supabaseServer, 'from');

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'qr.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    // Verification route must NOT call supabaseServer directly or insert into verification_logs
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('22. No Storage upload happens', async () => {
    const qrBuffer = await generateQrBuffer('upi://pay?pa=store@icici');
    vi.spyOn(registryModule, 'findActiveTrustedDestinations').mockResolvedValueOnce([]);

    const storageSpy = vi.spyOn(supabaseServer.storage, 'from');

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'qr.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    expect(storageSpy).not.toHaveBeenCalled();
  });

  it('23. Gemini is never called', async () => {
    // Verify that global fetch is not called (Gemini uses Google GenAI / HTTP endpoints)
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const qrBuffer = await generateQrBuffer('upi://pay?pa=store@icici');
    vi.spyOn(registryModule, 'findActiveTrustedDestinations').mockResolvedValueOnce([]);

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'qr.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('24. Frontend files remain untouched', () => {
    const statusOutput = execSync('git status --porcelain frontend', {
      encoding: 'utf8',
    }).trim();
    expect(statusOutput).toBe('');
  });

  it('25. Existing GET /api/v1/health continues working unchanged', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.version).toBe('1.0.0');
    expect(typeof body.uptime_seconds).toBe('number');
    expect(typeof body.timestamp).toBe('string');
  });
});
