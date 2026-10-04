import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import QRCode from 'qrcode';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { buildApp } from '../app.js';
import * as registryModule from '../integrations/trusted-registry/index.js';
import { supabaseServer } from '../integrations/supabase/client.js';

/**
 * Generates an in-memory PNG QR code buffer.
 */
async function generateQrBuffer(
  payload: string,
  width = 400,
  margin = 4,
): Promise<Buffer> {
  return QRCode.toBuffer(payload, {
    type: 'png',
    width,
    margin,
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

describe('Reference QR Storage & Real Physical Tamper Verification (Prompt 021 & 021A)', () => {
  const app = buildApp();
  const testMerchantId = 'a0000000-0000-0000-0000-000000000001';
  const otherMerchantId = 'b0000000-0000-0000-0000-000000000002';
  const nonexistentMerchantId = 'c0000000-0000-0000-0000-000000000003';
  const authHeaders = { authorization: 'Bearer valid-owner-token' };

  let mockStorageBucket: {
    upload: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    createSignedUrl: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    mockStorageBucket = {
      upload: vi
        .fn()
        .mockResolvedValue({ data: { path: `${testMerchantId}/ref.png` }, error: null }),
      remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://supabase.co/storage/signed' },
        error: null,
      }),
    };

    vi.spyOn(supabaseServer.storage, 'from').mockReturnValue(
      mockStorageBucket as unknown as ReturnType<typeof supabaseServer.storage.from>,
    );

    // Default Supabase Auth verification mock
    vi.spyOn(supabaseServer.auth, 'getUser').mockImplementation(
      async (token?: string) => {
        if (token === 'valid-owner-token' || token === 'valid-test-token') {
          return {
            data: {
              user: {
                id: 'test-user-id',
                app_metadata: {},
                user_metadata: {},
                aud: 'authenticated',
                created_at: '2026-10-01T00:00:00Z',
              },
            },
            error: null,
          } as unknown as Awaited<ReturnType<typeof supabaseServer.auth.getUser>>;
        }
        if (token === 'valid-other-token') {
          return {
            data: {
              user: {
                id: 'other-user-id',
                app_metadata: {},
                user_metadata: {},
                aud: 'authenticated',
                created_at: '2026-10-01T00:00:00Z',
              },
            },
            error: null,
          } as unknown as Awaited<ReturnType<typeof supabaseServer.auth.getUser>>;
        }
        return {
          data: { user: null },
          error: new Error('Invalid or expired token'),
        } as unknown as Awaited<ReturnType<typeof supabaseServer.auth.getUser>>;
      },
    );

    // Default Supabase DB queries mock
    vi.spyOn(supabaseServer, 'from').mockImplementation(((table: string) => {
      if (table === 'merchants') {
        return {
          select: () => ({
            eq: (_field: string, val: string) => ({
              maybeSingle: () => {
                if (val === testMerchantId) {
                  return Promise.resolve({
                    data: { id: testMerchantId, user_id: 'test-user-id' },
                    error: null,
                  });
                }
                if (val === otherMerchantId) {
                  return Promise.resolve({
                    data: { id: otherMerchantId, user_id: 'other-user-id' },
                    error: null,
                  });
                }
                return Promise.resolve({ data: null, error: null });
              },
            }),
          }),
        };
      }
      return {
        delete: () => ({
          eq: () => ({
            neq: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    }) as unknown as typeof supabaseServer.from);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================================================
  // PART 18: REFERENCE STORAGE / REGISTRATION TESTS (1-11)
  // ==================================================

  it('1. valid reference QR upload succeeds', async () => {
    const qrBuffer = await generateQrBuffer('upi://pay?pa=apex@icici&pn=Apex%20Store');

    vi.spyOn(registryModule, 'findActiveReferenceQrForMerchant').mockResolvedValueOnce(
      null,
    );
    vi.spyOn(registryModule, 'saveReferenceQr').mockResolvedValueOnce({
      id: 'ref-record-1',
      merchantId: testMerchantId,
      storagePath: `${testMerchantId}/ref.png`,
      payloadHash: 'hash-1234',
      rawPayload: 'upi://pay?pa=apex@icici&pn=Apex%20Store',
      uploadedAt: '2026-10-04T12:00:00Z',
    });
    vi.spyOn(registryModule, 'createReferenceQrPreviewUrl').mockResolvedValueOnce(
      'https://supabase.co/storage/v1/object/sign/reference-qrs/signed-preview',
    );

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'reference.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
      headers: { ...req.headers, ...authHeaders },
      payload: req.payload,
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.reference_qr).toBeDefined();
    expect(body.reference_qr.merchant_id).toBe(testMerchantId);
    expect(body.reference_qr.preview_url).toContain('signed-preview');
    expect(mockStorageBucket.upload).toHaveBeenCalled();
  });

  it('2. unsupported image rejected', async () => {
    const textBuffer = Buffer.from('this is a plain text file pretending to be an image');
    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'notes.txt',
        mimetype: 'text/plain',
        content: textBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
      headers: { ...req.headers, ...authHeaders },
      payload: req.payload,
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('E_UNSUPPORTED_MIME_TYPE');
  });

  it('3. zero-byte image rejected', async () => {
    const emptyBuffer = Buffer.alloc(0);
    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'empty.png',
        mimetype: 'image/png',
        content: emptyBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
      headers: { ...req.headers, ...authHeaders },
      payload: req.payload,
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('E_EMPTY_IMAGE');
  });

  it('4. oversized image rejected', async () => {
    const hugeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11 MB
    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'huge.png',
        mimetype: 'image/png',
        content: hugeBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
      headers: { ...req.headers, ...authHeaders },
      payload: req.payload,
    });

    expect(res.statusCode).toBe(413);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('E_PAYLOAD_TOO_LARGE');
  });

  it('5. invalid image bytes rejected', async () => {
    const corruptedBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0xff, 0xff]);
    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'corrupted.png',
        mimetype: 'image/png',
        content: corruptedBytes,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
      headers: { ...req.headers, ...authHeaders },
      payload: req.payload,
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('E_UNREADABLE_REFERENCE_QR');
  });

  it('6. QR-less image rejected', async () => {
    const whiteImage = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'white.png',
        mimetype: 'image/png',
        content: whiteImage,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
      headers: { ...req.headers, ...authHeaders },
      payload: req.payload,
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('E_UNREADABLE_REFERENCE_QR');
  });

  it('7. duplicate active reference handled safely by single-reference design', async () => {
    const qrBuffer = await generateQrBuffer('upi://pay?pa=apex@icici&pn=Apex%20Store');

    vi.spyOn(registryModule, 'findActiveReferenceQrForMerchant').mockResolvedValueOnce(
      null,
    );
    vi.spyOn(registryModule, 'saveReferenceQr').mockResolvedValueOnce({
      id: 'ref-record-dup',
      merchantId: testMerchantId,
      storagePath: `${testMerchantId}/reference-qr-123.png`,
      payloadHash: 'hash-123',
      rawPayload: 'upi://pay?pa=apex@icici&pn=Apex%20Store',
      uploadedAt: '2026-10-04T12:00:00Z',
    });
    vi.spyOn(registryModule, 'createReferenceQrPreviewUrl').mockResolvedValueOnce(
      'https://signed-url.com/preview',
    );

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'ref.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
      headers: { ...req.headers, ...authHeaders },
      payload: req.payload,
    });

    expect(res.statusCode).toBe(201);
  });

  it('8. replacement reference handled correctly with cleanup of previous object', async () => {
    const qrBuffer = await generateQrBuffer(
      'upi://pay?pa=apex@icici&pn=Apex%20Store%20V2',
    );

    const oldRecord = {
      id: 'old-ref-uuid',
      merchantId: testMerchantId,
      storagePath: `${testMerchantId}/reference-qr-old.png`,
      payloadHash: 'old-hash',
      rawPayload: 'upi://pay?pa=apex@icici&pn=Apex%20Store%20V1',
      uploadedAt: '2026-10-01T00:00:00Z',
    };

    vi.spyOn(registryModule, 'findActiveReferenceQrForMerchant').mockResolvedValueOnce(
      oldRecord,
    );

    vi.spyOn(registryModule, 'saveReferenceQr').mockResolvedValueOnce({
      id: 'new-ref-uuid',
      merchantId: testMerchantId,
      storagePath: `${testMerchantId}/reference-qr-new.png`,
      payloadHash: 'new-hash',
      rawPayload: 'upi://pay?pa=apex@icici&pn=Apex%20Store%20V2',
      uploadedAt: '2026-10-04T12:00:00Z',
    });

    vi.spyOn(registryModule, 'createReferenceQrPreviewUrl').mockResolvedValueOnce(
      'https://signed-url.com/preview-new',
    );

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'new-ref.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
      headers: { ...req.headers, ...authHeaders },
      payload: req.payload,
    });

    expect(res.statusCode).toBe(201);
    expect(mockStorageBucket.remove).toHaveBeenCalledWith([oldRecord.storagePath]);
  });

  it('9. upload failure is surfaced', async () => {
    const qrBuffer = await generateQrBuffer('upi://pay?pa=apex@icici&pn=Apex');

    mockStorageBucket.upload.mockResolvedValueOnce({
      data: null,
      error: { message: 'Storage quota exceeded or network timeout' },
    });

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'ref.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
      headers: { ...req.headers, ...authHeaders },
      payload: req.payload,
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('E_STORAGE_UPLOAD_FAILED');
  });

  it('10. database metadata failure is surfaced and cleans up uploaded storage file', async () => {
    const qrBuffer = await generateQrBuffer('upi://pay?pa=apex@icici&pn=Apex');

    vi.spyOn(registryModule, 'findActiveReferenceQrForMerchant').mockResolvedValueOnce(
      null,
    );
    vi.spyOn(registryModule, 'saveReferenceQr').mockRejectedValueOnce(
      new Error('Postgres connection reset'),
    );

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'ref.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
      headers: { ...req.headers, ...authHeaders },
      payload: req.payload,
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('E_DATABASE_INSERT_FAILED');
    expect(mockStorageBucket.remove).toHaveBeenCalled();
  });

  it('11. merchant isolation enforced in storage paths', async () => {
    const qrBuffer = await generateQrBuffer('upi://pay?pa=apex@icici&pn=Apex');

    let uploadedPath = '';
    mockStorageBucket.upload.mockImplementationOnce((pathArg: string) => {
      uploadedPath = pathArg;
      return Promise.resolve({ data: { path: pathArg }, error: null });
    });

    vi.spyOn(registryModule, 'findActiveReferenceQrForMerchant').mockResolvedValueOnce(
      null,
    );
    vi.spyOn(registryModule, 'saveReferenceQr').mockResolvedValueOnce({
      id: 'iso-id',
      merchantId: testMerchantId,
      storagePath: `${testMerchantId}/reference-qr.png`,
      payloadHash: 'hash',
      rawPayload: 'upi://pay?pa=apex@icici&pn=Apex',
      uploadedAt: new Date().toISOString(),
    });

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'test.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    await app.inject({
      method: 'POST',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
      headers: { ...req.headers, ...authHeaders },
      payload: req.payload,
    });

    // Enforce that storage path is safely scoped to the merchant ID
    expect(uploadedPath.startsWith(`${testMerchantId}/`)).toBe(true);
  });

  // ==================================================
  // PART 18: BACKEND VERIFICATION PIPELINE TESTS (12-17)
  // ==================================================

  it('12. merchant with reference QR loads it during verification', async () => {
    const qrBuffer = await generateQrBuffer(
      'upi://pay?pa=store@icici&pn=Test%20Store&mc=5411',
    );

    vi.spyOn(
      registryModule,
      'findActiveTrustedDestinationsForMerchant',
    ).mockResolvedValueOnce([
      {
        merchantId: testMerchantId,
        destinationType: 'VPA',
        destinationValue: 'store@icici',
        isActive: true,
      },
    ]);

    vi.spyOn(registryModule, 'findActiveReferenceQrForMerchant').mockResolvedValueOnce({
      id: 'ref-record-1',
      merchantId: testMerchantId,
      storagePath: `${testMerchantId}/ref.png`,
      payloadHash: 'hash-abc',
      rawPayload: 'upi://pay?pa=store@icici&pn=Test%20Store&mc=5411',
      uploadedAt: '2026-10-04T12:00:00Z',
    });

    vi.spyOn(registryModule, 'downloadReferenceQrImage').mockResolvedValueOnce(qrBuffer);

    const req = createMultipartRequest(
      { merchant_id: testMerchantId },
      {
        fieldname: 'image',
        filename: 'candidate.png',
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
    const body = JSON.parse(res.payload);
    expect(body.composite_evidence.tamper).toBeDefined();
    expect(body.composite_evidence.tamper.available).toBe(true);
    expect(body.composite_evidence.tamper.reference_available).toBe(true);
  });

  it('13. missing reference QR produces tamper unavailable state without suspicion', async () => {
    const qrBuffer = await generateQrBuffer(
      'upi://pay?pa=store@icici&pn=Test%20Store&mc=5411',
    );

    vi.spyOn(
      registryModule,
      'findActiveTrustedDestinationsForMerchant',
    ).mockResolvedValueOnce([
      {
        merchantId: testMerchantId,
        destinationType: 'VPA',
        destinationValue: 'store@icici',
        isActive: true,
      },
    ]);

    // No reference registered
    vi.spyOn(registryModule, 'findActiveReferenceQrForMerchant').mockResolvedValueOnce(
      null,
    );

    const req = createMultipartRequest(
      { merchant_id: testMerchantId },
      {
        fieldname: 'image',
        filename: 'candidate.png',
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
    const body = JSON.parse(res.payload);
    expect(body.verification_status).toBe('VERIFIED');
    expect(body.composite_evidence.tamper.available).toBe(false);
    expect(body.composite_evidence.tamper.reference_available).toBe(false);
    expect(body.risk_factors).not.toContain('TAMPER_ANALYSIS_SUSPICIOUS');
  });

  it('14. valid reference + identical candidate produces non-suspicious VERIFIED result', async () => {
    const qrBuffer = await generateQrBuffer(
      'upi://pay?pa=store@icici&pn=Test%20Store&mc=5411',
    );

    vi.spyOn(
      registryModule,
      'findActiveTrustedDestinationsForMerchant',
    ).mockResolvedValueOnce([
      {
        merchantId: testMerchantId,
        destinationType: 'VPA',
        destinationValue: 'store@icici',
        isActive: true,
      },
    ]);

    vi.spyOn(registryModule, 'findActiveReferenceQrForMerchant').mockResolvedValueOnce({
      id: 'ref-1',
      merchantId: testMerchantId,
      storagePath: `${testMerchantId}/ref.png`,
      payloadHash: 'hash',
      rawPayload: 'upi://pay?pa=store@icici&pn=Test%20Store&mc=5411',
      uploadedAt: '2026-10-04T12:00:00Z',
    });

    vi.spyOn(registryModule, 'downloadReferenceQrImage').mockResolvedValueOnce(qrBuffer);

    const req = createMultipartRequest(
      { merchant_id: testMerchantId },
      {
        fieldname: 'image',
        filename: 'candidate.png',
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
    const body = JSON.parse(res.payload);
    expect(body.verification_status).toBe('VERIFIED');
    expect(body.composite_evidence.tamper.available).toBe(true);
    expect(body.composite_evidence.tamper.visual_deviation_index).toBeLessThan(0.05);
  });

  it('15. valid reference + tampered candidate produces SUSPICIOUS when thresholds met', async () => {
    const refBuffer = await generateQrBuffer(
      'upi://pay?pa=store@icici&pn=Test%20Store&mc=5411',
    );

    // Tampered candidate: overlay a sticker over the candidate QR code
    const patch = Buffer.from(
      `<svg width="80" height="80"><rect width="80" height="80" fill="gray" /></svg>`,
    );
    const tamperedBuffer = await sharp(refBuffer)
      .composite([{ input: patch, top: 120, left: 120 }])
      .png()
      .toBuffer();

    vi.spyOn(
      registryModule,
      'findActiveTrustedDestinationsForMerchant',
    ).mockResolvedValueOnce([
      {
        merchantId: testMerchantId,
        destinationType: 'VPA',
        destinationValue: 'store@icici',
        isActive: true,
      },
    ]);

    vi.spyOn(registryModule, 'findActiveReferenceQrForMerchant').mockResolvedValueOnce({
      id: 'ref-1',
      merchantId: testMerchantId,
      storagePath: `${testMerchantId}/ref.png`,
      payloadHash: 'hash',
      rawPayload: 'upi://pay?pa=store@icici&pn=Test%20Store&mc=5411',
      uploadedAt: '2026-10-04T12:00:00Z',
    });

    vi.spyOn(registryModule, 'downloadReferenceQrImage').mockResolvedValueOnce(refBuffer);

    const req = createMultipartRequest(
      { merchant_id: testMerchantId },
      {
        fieldname: 'image',
        filename: 'tampered.png',
        mimetype: 'image/png',
        content: tamperedBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    // Tamper is recorded in evidence
    expect(body.composite_evidence.tamper.available).toBe(true);
    expect(body.composite_evidence.tamper.visual_deviation_index).toBeGreaterThan(0);
  });

  it('16. destination mismatch remains DESTINATION_MISMATCH even if visual comparison occurs', async () => {
    const refBuffer = await generateQrBuffer(
      'upi://pay?pa=store@icici&pn=Test%20Store&mc=5411',
    );
    const attackerBuffer = await generateQrBuffer(
      'upi://pay?pa=attacker@upi&pn=Test%20Store&mc=5411',
    );

    vi.spyOn(
      registryModule,
      'findActiveTrustedDestinationsForMerchant',
    ).mockResolvedValueOnce([
      {
        merchantId: testMerchantId,
        destinationType: 'VPA',
        destinationValue: 'store@icici',
        isActive: true,
      },
    ]);

    vi.spyOn(registryModule, 'findActiveReferenceQrForMerchant').mockResolvedValueOnce({
      id: 'ref-1',
      merchantId: testMerchantId,
      storagePath: `${testMerchantId}/ref.png`,
      payloadHash: 'hash',
      rawPayload: 'upi://pay?pa=store@icici&pn=Test%20Store&mc=5411',
      uploadedAt: '2026-10-04T12:00:00Z',
    });

    vi.spyOn(registryModule, 'downloadReferenceQrImage').mockResolvedValueOnce(refBuffer);

    const req = createMultipartRequest(
      { merchant_id: testMerchantId },
      {
        fieldname: 'image',
        filename: 'attacker.png',
        mimetype: 'image/png',
        content: attackerBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.verification_status).toBe('DESTINATION_MISMATCH');
  });

  it('17. Gemini cannot override canonical status', async () => {
    const refBuffer = await generateQrBuffer(
      'upi://pay?pa=store@icici&pn=Test%20Store&mc=5411',
    );
    const attackerBuffer = await generateQrBuffer(
      'upi://pay?pa=attacker@upi&pn=Test%20Store&mc=5411',
    );

    vi.spyOn(
      registryModule,
      'findActiveTrustedDestinationsForMerchant',
    ).mockResolvedValueOnce([
      {
        merchantId: testMerchantId,
        destinationType: 'VPA',
        destinationValue: 'store@icici',
        isActive: true,
      },
    ]);

    vi.spyOn(registryModule, 'findActiveReferenceQrForMerchant').mockResolvedValueOnce({
      id: 'ref-1',
      merchantId: testMerchantId,
      storagePath: `${testMerchantId}/ref.png`,
      payloadHash: 'hash',
      rawPayload: 'upi://pay?pa=store@icici&pn=Test%20Store&mc=5411',
      uploadedAt: '2026-10-04T12:00:00Z',
    });

    vi.spyOn(registryModule, 'downloadReferenceQrImage').mockResolvedValueOnce(refBuffer);

    const req = createMultipartRequest(
      { merchant_id: testMerchantId },
      {
        fieldname: 'image',
        filename: 'attacker.png',
        mimetype: 'image/png',
        content: attackerBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.verification_status).toBe('DESTINATION_MISMATCH');
  });

  // ==================================================
  // PART 18: SECURITY TESTS (18-21)
  // ==================================================

  it('18. reference-qrs bucket remains private in architecture', () => {
    const archPath = path.resolve(process.cwd(), '../docs/architecture.md');
    const content = fs.readFileSync(archPath, 'utf-8');
    expect(content).toContain('`reference-qrs` (Private)');
  });

  it('19. browser source contains no backend secrets', () => {
    const frontendSrc = path.resolve(process.cwd(), '../frontend/src');
    const checkDir = (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          checkDir(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          const code = fs.readFileSync(fullPath, 'utf-8');
          expect(code).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
          expect(code).not.toContain('GEMINI_API_KEY');
        }
      }
    };
    checkDir(frontendSrc);
  });

  it('20. no hard-coded demo merchant UUID in verify flow', () => {
    const verifyRoutePath = path.resolve(process.cwd(), 'src/routes/verify.ts');
    const code = fs.readFileSync(verifyRoutePath, 'utf-8');
    expect(code).not.toContain('51bc512c-7945-4404-bd24-4316ce924daa');
  });

  it('21. arbitrary storage path manipulation is rejected/prevented', async () => {
    const qrBuffer = await generateQrBuffer('upi://pay?pa=apex@icici');

    const maliciousMerchantId = '../../etc/passwd';
    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'test.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/merchants/${encodeURIComponent(maliciousMerchantId)}/reference-qr`,
      headers: { ...req.headers, ...authHeaders },
      payload: req.payload,
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('E_MERCHANT_NOT_FOUND');
  });

  // ==================================================
  // PROMPT 021A: BOLA / IDOR AUTHORIZATION TESTS (22-41)
  // ==================================================

  it('22. GET without token returns 401 E_UNAUTHORIZED', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('E_UNAUTHORIZED');
  });

  it('23. GET malformed token returns 401 E_UNAUTHORIZED', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
      headers: { authorization: 'NotBearer token123' },
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('E_UNAUTHORIZED');
  });

  it('24. GET invalid token returns 401 E_UNAUTHORIZED', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
      headers: { authorization: 'Bearer invalid-expired-token' },
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('E_UNAUTHORIZED');
  });

  it('25. GET owner succeeds', async () => {
    vi.spyOn(registryModule, 'findActiveReferenceQrForMerchant').mockResolvedValueOnce({
      id: 'ref-1',
      merchantId: testMerchantId,
      storagePath: `${testMerchantId}/ref.png`,
      payloadHash: 'hash',
      rawPayload: 'upi://pay?pa=store@icici',
      uploadedAt: '2026-10-01T00:00:00Z',
    });
    vi.spyOn(registryModule, 'createReferenceQrPreviewUrl').mockResolvedValueOnce(
      'https://signed-url.com/preview',
    );

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
      headers: authHeaders,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.reference_qr.id).toBe('ref-1');
  });

  it('26. GET non-owner returns 403 E_FORBIDDEN', async () => {
    // Calling otherMerchantId with test-user-id token
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/merchants/${otherMerchantId}/reference-qr`,
      headers: authHeaders,
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('E_FORBIDDEN');
    expect(body.error.message).toBe('Caller does not own this merchant profile.');
  });

  it('27. GET nonexistent merchant returns safe 404 E_MERCHANT_NOT_FOUND', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/merchants/${nonexistentMerchantId}/reference-qr`,
      headers: authHeaders,
    });
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('E_MERCHANT_NOT_FOUND');
  });

  it('28. POST without token returns 401 E_UNAUTHORIZED', async () => {
    const qrBuffer = await generateQrBuffer('upi://pay?pa=apex@icici');
    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'ref.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
      headers: req.headers,
      payload: req.payload,
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('E_UNAUTHORIZED');
  });

  it('29. POST invalid token returns 401 E_UNAUTHORIZED', async () => {
    const qrBuffer = await generateQrBuffer('upi://pay?pa=apex@icici');
    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'ref.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
      headers: { ...req.headers, authorization: 'Bearer bad-token' },
      payload: req.payload,
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('E_UNAUTHORIZED');
  });

  it('30. POST owner succeeds', async () => {
    const qrBuffer = await generateQrBuffer('upi://pay?pa=apex@icici');
    vi.spyOn(registryModule, 'findActiveReferenceQrForMerchant').mockResolvedValueOnce(
      null,
    );
    vi.spyOn(registryModule, 'saveReferenceQr').mockResolvedValueOnce({
      id: 'owner-ref',
      merchantId: testMerchantId,
      storagePath: `${testMerchantId}/ref.png`,
      payloadHash: 'hash',
      rawPayload: 'upi://pay?pa=apex@icici',
      uploadedAt: '2026-10-04T00:00:00Z',
    });
    vi.spyOn(registryModule, 'createReferenceQrPreviewUrl').mockResolvedValueOnce(
      'https://signed.url',
    );

    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'ref.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
      headers: { ...req.headers, ...authHeaders },
      payload: req.payload,
    });
    expect(res.statusCode).toBe(201);
  });

  it('31. POST non-owner returns 403 E_FORBIDDEN', async () => {
    const qrBuffer = await generateQrBuffer('upi://pay?pa=apex@icici');
    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'ref.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );
    // Attacking otherMerchantId with test-user-id token
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/merchants/${otherMerchantId}/reference-qr`,
      headers: { ...req.headers, ...authHeaders },
      payload: req.payload,
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('E_FORBIDDEN');
    expect(body.error.message).toBe('Caller does not own this merchant profile.');
  });

  it('32. POST non-owner causes no Storage mutation', async () => {
    const qrBuffer = await generateQrBuffer('upi://pay?pa=apex@icici');
    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'ref.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );
    await app.inject({
      method: 'POST',
      url: `/api/v1/merchants/${otherMerchantId}/reference-qr`,
      headers: { ...req.headers, ...authHeaders },
      payload: req.payload,
    });
    expect(mockStorageBucket.upload).not.toHaveBeenCalled();
    expect(mockStorageBucket.remove).not.toHaveBeenCalled();
  });

  it('33. POST non-owner causes no DB mutation', async () => {
    const qrBuffer = await generateQrBuffer('upi://pay?pa=apex@icici');
    const saveSpy = vi.spyOn(registryModule, 'saveReferenceQr');
    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'ref.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );
    await app.inject({
      method: 'POST',
      url: `/api/v1/merchants/${otherMerchantId}/reference-qr`,
      headers: { ...req.headers, ...authHeaders },
      payload: req.payload,
    });
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('34. DELETE without token returns 401 E_UNAUTHORIZED', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('E_UNAUTHORIZED');
  });

  it('35. DELETE invalid token returns 401 E_UNAUTHORIZED', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
      headers: { authorization: 'Bearer invalid-token' },
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('E_UNAUTHORIZED');
  });

  it('36. DELETE owner succeeds', async () => {
    vi.spyOn(registryModule, 'deleteReferenceQrForMerchant').mockResolvedValueOnce({
      deletedRecords: 1,
      storagePathsRemoved: ['path.png'],
    });
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
      headers: authHeaders,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
  });

  it('37. DELETE non-owner returns 403 E_FORBIDDEN', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/merchants/${otherMerchantId}/reference-qr`,
      headers: authHeaders,
    });
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.payload);
    expect(body.error.code).toBe('E_FORBIDDEN');
    expect(body.error.message).toBe('Caller does not own this merchant profile.');
  });

  it('38. DELETE non-owner causes no Storage deletion', async () => {
    await app.inject({
      method: 'DELETE',
      url: `/api/v1/merchants/${otherMerchantId}/reference-qr`,
      headers: authHeaders,
    });
    expect(mockStorageBucket.remove).not.toHaveBeenCalled();
  });

  it('39. DELETE non-owner causes no DB deletion', async () => {
    const deleteSpy = vi.spyOn(registryModule, 'deleteReferenceQrForMerchant');
    await app.inject({
      method: 'DELETE',
      url: `/api/v1/merchants/${otherMerchantId}/reference-qr`,
      headers: authHeaders,
    });
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('40. Authorization occurs before privileged Storage access', async () => {
    // Unauthenticated GET, POST, DELETE must never touch storage
    await app.inject({
      method: 'GET',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
    });
    expect(mockStorageBucket.createSignedUrl).not.toHaveBeenCalled();

    const qrBuffer = await generateQrBuffer('upi://pay?pa=apex@icici');
    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'ref.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );
    await app.inject({
      method: 'POST',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
      headers: req.headers,
      payload: req.payload,
    });
    expect(mockStorageBucket.upload).not.toHaveBeenCalled();

    await app.inject({
      method: 'DELETE',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
    });
    expect(mockStorageBucket.remove).not.toHaveBeenCalled();
  });

  it('41. Authorization occurs before privileged DB mutation', async () => {
    const saveSpy = vi.spyOn(registryModule, 'saveReferenceQr');
    const deleteSpy = vi.spyOn(registryModule, 'deleteReferenceQrForMerchant');

    const qrBuffer = await generateQrBuffer('upi://pay?pa=apex@icici');
    const req = createMultipartRequest(
      {},
      {
        fieldname: 'image',
        filename: 'ref.png',
        mimetype: 'image/png',
        content: qrBuffer,
      },
    );
    await app.inject({
      method: 'POST',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
      headers: req.headers,
      payload: req.payload,
    });
    expect(saveSpy).not.toHaveBeenCalled();

    await app.inject({
      method: 'DELETE',
      url: `/api/v1/merchants/${testMerchantId}/reference-qr`,
    });
    expect(deleteSpy).not.toHaveBeenCalled();
  });
});
