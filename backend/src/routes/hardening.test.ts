import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import sharp from 'sharp';
import QRCode from 'qrcode';
import { buildApp } from '../app.js';
import { decodeQr } from '../modules/qr-decoder/decoder.js';
import { InvalidImageError } from '../modules/qr-decoder/errors.js';
import { analyzeImageQuality } from '../modules/image-quality/analyzer.js';
import { ImageTooLargeError } from '../modules/image-quality/errors.js';
import { generateExplanation } from '../integrations/gemini/gateway.js';

function createMultipartRequest(
  fields: Record<string, string>,
  file?: { fieldname: string; filename: string; mimetype: string; content: Buffer },
  extraFiles?: Array<{
    fieldname: string;
    filename: string;
    mimetype: string;
    content: Buffer;
  }>,
) {
  const boundary =
    '----WebKitFormBoundaryHardening' + Math.random().toString(36).substring(2);
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

  if (extraFiles) {
    for (const ef of extraFiles) {
      chunks.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${ef.fieldname}"; filename="${ef.filename}"\r\nContent-Type: ${ef.mimetype}\r\n\r\n`,
        ),
      );
      chunks.push(ef.content);
      chunks.push(Buffer.from('\r\n'));
    }
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
    },
    payload: Buffer.concat(chunks),
  };
}

describe('Prompt 023 — Security, Edge & Hardening Suite', () => {
  let app: FastifyInstance;
  let validQrPngBuffer: Buffer;
  let qrWithoutPatternBuffer: Buffer;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // Generate valid in-memory QR image
    validQrPngBuffer = await QRCode.toBuffer(
      'upi://pay?pa=qrshield-sample@icici&pn=Test&mc=5411',
      {
        errorCorrectionLevel: 'M',
        width: 300,
      },
    );

    // Generate clean blank image without QR
    qrWithoutPatternBuffer = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Part 3 & 20: POST /api/v1/verify Input & Form Field Security', () => {
    it('1. rejects non-multipart request with 400 E_INVALID_REQUEST', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/verify',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ image: 'base64' }),
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.error.code).toBe('E_INVALID_REQUEST');
    });

    it('2. rejects missing image file with 400 E_MISSING_IMAGE', async () => {
      const req = createMultipartRequest({ opt_in_audit: 'false' });
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/verify',
        headers: req.headers,
        payload: req.payload,
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.error.code).toBe('E_MISSING_IMAGE');
    });

    it('3. rejects empty image buffer with 400 E_EMPTY_IMAGE', async () => {
      const req = createMultipartRequest(
        {},
        {
          fieldname: 'image',
          filename: 'empty.png',
          mimetype: 'image/png',
          content: Buffer.alloc(0),
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
      expect(body.error.code).toBe('E_EMPTY_IMAGE');
    });

    it('4. rejects unsupported MIME type with 400 E_UNSUPPORTED_MIME_TYPE', async () => {
      const req = createMultipartRequest(
        {},
        {
          fieldname: 'image',
          filename: 'test.gif',
          mimetype: 'image/gif',
          content: Buffer.from('GIF89a...'),
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
      expect(body.error.code).toBe('E_UNSUPPORTED_MIME_TYPE');
    });

    it('5. rejects corrupted image bytes with 400 E_INVALID_IMAGE', async () => {
      const req = createMultipartRequest(
        {},
        {
          fieldname: 'image',
          filename: 'corrupted.png',
          mimetype: 'image/png',
          content: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00]), // Truncated PNG header
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
      expect(body.error.code).toBe('E_INVALID_IMAGE');
    });

    it('6. rejects multiple uploaded files with 400 E_TOO_MANY_FILES', async () => {
      const req = createMultipartRequest(
        {},
        {
          fieldname: 'image',
          filename: 'first.png',
          mimetype: 'image/png',
          content: validQrPngBuffer,
        },
        [
          {
            fieldname: 'image_secondary',
            filename: 'second.png',
            mimetype: 'image/png',
            content: validQrPngBuffer,
          },
        ],
      );
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/verify',
        headers: req.headers,
        payload: req.payload,
      });

      expect([400, 413]).toContain(res.statusCode);
      const body = res.json();
      expect(['E_TOO_MANY_FILES', 'E_PAYLOAD_TOO_LARGE']).toContain(body.error.code);
    });

    it('7. rejects malformed non-UUID merchant_id with 400 E_INVALID_MERCHANT_ID', async () => {
      const req = createMultipartRequest(
        { merchant_id: 'not-a-valid-uuid-format' },
        {
          fieldname: 'image',
          filename: 'valid.png',
          mimetype: 'image/png',
          content: validQrPngBuffer,
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
      expect(body.error.code).toBe('E_INVALID_MERCHANT_ID');
    });

    it('8. rejects SQL-like injection in merchant_id with 400 E_INVALID_MERCHANT_ID', async () => {
      const req = createMultipartRequest(
        { merchant_id: "' OR '1'='1" },
        {
          fieldname: 'image',
          filename: 'valid.png',
          mimetype: 'image/png',
          content: validQrPngBuffer,
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
      expect(body.error.code).toBe('E_INVALID_MERCHANT_ID');
    });

    it('9. rejects oversized string in merchant_id with 400 E_INVALID_MERCHANT_ID', async () => {
      const req = createMultipartRequest(
        { merchant_id: 'a'.repeat(5000) },
        {
          fieldname: 'image',
          filename: 'valid.png',
          mimetype: 'image/png',
          content: validQrPngBuffer,
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
      expect(body.error.code).toBe('E_INVALID_MERCHANT_ID');
    });

    it('10. returns 422 E_NO_QR_DETECTED when image has no QR code', async () => {
      const req = createMultipartRequest(
        {},
        {
          fieldname: 'image',
          filename: 'blank.png',
          mimetype: 'image/png',
          content: qrWithoutPatternBuffer,
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
      expect(body.error.code).toBe('E_NO_QR_DETECTED');
    });
  });

  describe('Part 4: Resource Exhaustion & Decompression Bomb Protection', () => {
    it('11. decodeQr rejects image dimensions exceeding MAX_IMAGE_DIMENSION (4096 px)', async () => {
      const hugeImageBuffer = await sharp({
        create: {
          width: 4097,
          height: 100,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      await expect(decodeQr(hugeImageBuffer)).rejects.toThrow(InvalidImageError);
      await expect(decodeQr(hugeImageBuffer)).rejects.toThrow(
        /exceed maximum allowed limit/i,
      );
    });

    it('12. analyzeImageQuality rejects image dimensions exceeding MAX_IMAGE_DIMENSION (4096 px)', async () => {
      const hugeImageBuffer = await sharp({
        create: {
          width: 100,
          height: 4097,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      await expect(analyzeImageQuality(hugeImageBuffer)).rejects.toThrow(
        ImageTooLargeError,
      );
      await expect(analyzeImageQuality(hugeImageBuffer)).rejects.toThrow(
        /exceed maximum allowed limit/i,
      );
    });
  });

  describe('Part 7: Sample Lab Route Parameter Security & Path Traversal', () => {
    it('13. rejects path traversal in GET /api/v1/samples/:sampleId with 400', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/samples/..%2F..%2Fetc%2Fpasswd',
      });
      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.error.code).toBe('E_INVALID_SAMPLE_ID');
    });

    it('14. rejects special characters in GET /api/v1/samples/:sampleId with 400', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/samples/sample!bad*id',
      });
      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.error.code).toBe('E_INVALID_SAMPLE_ID');
    });

    it('15. rejects path traversal in GET /api/v1/samples/:sampleId/image with 400', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/samples/..%2F..%2Fetc%2Fpasswd/image',
      });
      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.error.code).toBe('E_INVALID_SAMPLE_ID');
    });

    it('16. returns standardized 404 E_SAMPLE_NOT_FOUND for unknown sample ID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/samples/sample-nonexistent-12345',
      });
      expect(res.statusCode).toBe(404);
      const body = res.json();
      expect(body.error.code).toBe('E_SAMPLE_NOT_FOUND');
    });
  });

  describe('Part 11 & 12: Gemini Boundary & Fallback Safety', () => {
    it('17. falls back to deterministic explanation on mock timeout without stalling', async () => {
      // Mock client that hangs indefinitely
      const hangingClient = {
        models: {
          generateContent: () =>
            new Promise<never>(() => {
              // Intentionally never resolves
            }),
        },
      };

      const t0 = performance.now();
      const result = await generateExplanation(
        {
          canonicalStatus: 'VERIFIED',
          scannedDestination: 'qrshield-sample@icici',
          matchedDestination: 'qrshield-sample@icici',
          destinationMatch: true,
          riskFactors: [],
          recommendation: 'REVIEW_NOT_REQUIRED',
          imageQualitySummary: {
            overallQuality: 'ACCEPTABLE',
            brightnessClassification: 'ACCEPTABLE',
            contrastClassification: 'ACCEPTABLE_CONTRAST',
            sharpnessClassification: 'ACCEPTABLE_SHARPNESS',
          },
          tamperSummary: null,
          evidenceCodes: ['VERIFIED'],
        },
        {
          client: hangingClient as never,
          timeoutMs: 50, // Fast 50ms timeout for test
        },
      );
      const elapsed = performance.now() - t0;

      expect(elapsed).toBeLessThan(300); // Rejection happens quickly
      expect(result.metadata.provider).toBe('deterministic_fallback');
      expect(result.explanation).toContain('matches an active trusted registration');
    });

    it('18. falls back to deterministic explanation when model returns contradicting text', async () => {
      // Mock client that returns text contradicting VERIFIED
      const contradictingClient = {
        models: {
          generateContent: async () => ({
            text: JSON.stringify({
              summary:
                'This QR code is suspicious and has a mismatch with merchant record.',
              key_findings: ['Destination mismatch detected'],
              action: 'Do not pay',
            }),
          }),
        },
      };

      const result = await generateExplanation(
        {
          canonicalStatus: 'VERIFIED',
          scannedDestination: 'qrshield-sample@icici',
          matchedDestination: 'qrshield-sample@icici',
          destinationMatch: true,
          riskFactors: [],
          recommendation: 'REVIEW_NOT_REQUIRED',
          imageQualitySummary: {
            overallQuality: 'ACCEPTABLE',
            brightnessClassification: 'ACCEPTABLE',
            contrastClassification: 'ACCEPTABLE_CONTRAST',
            sharpnessClassification: 'ACCEPTABLE_SHARPNESS',
          },
          tamperSummary: null,
          evidenceCodes: ['VERIFIED'],
        },
        {
          client: contradictingClient as never,
          timeoutMs: 500,
        },
      );

      // Must be safely rejected and fall back
      expect(result.metadata.provider).toBe('deterministic_fallback');
    });
  });
});
