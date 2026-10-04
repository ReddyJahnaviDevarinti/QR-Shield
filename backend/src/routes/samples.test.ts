import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildApp } from '../app.js';
import { FastifyInstance } from 'fastify';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getSampleDataDir(): string {
  const candidates = [
    path.resolve(__dirname, '../../../sample-data'),
    path.resolve(__dirname, '../../sample-data'),
    path.resolve(process.cwd(), 'sample-data'),
    path.resolve(process.cwd(), '../sample-data'),
  ];

  for (const candidate of candidates) {
    if (
      fs.existsSync(candidate) &&
      fs.existsSync(path.join(candidate, 'manifest.json'))
    ) {
      return candidate;
    }
  }

  throw new Error('Unable to locate sample-data directory.');
}

function createMultipartRequest(
  fields: Record<string, string>,
  file: { fieldname: string; filename: string; mimetype: string; content: Buffer },
) {
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

  chunks.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"\r\nContent-Type: ${file.mimetype}\r\n\r\n`,
    ),
  );
  chunks.push(file.content);
  chunks.push(Buffer.from('\r\n'));
  chunks.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
    },
    payload: Buffer.concat(chunks),
  };
}

describe('Evaluator Sample Lab End-to-End Suite', () => {
  let app: FastifyInstance;
  let sampleDir: string;
  let manifestRaw: string;
  let manifest: {
    version: string;
    samples: Array<{
      id: string;
      name: string;
      category: string;
      expected_status: string;
      payload: string;
      image_file: string;
      storage_path: string;
      public_url: string;
      api_image_url: string;
      requires_merchant_context: boolean;
      merchant_id?: string;
      merchant_name?: string;
      expected_evidence: Record<string, unknown>;
    }>;
  };

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
    sampleDir = getSampleDataDir();
    manifestRaw = fs.readFileSync(path.join(sampleDir, 'manifest.json'), 'utf-8');
    manifest = JSON.parse(manifestRaw);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Part 15.1, 15.2, 15.3 - Sample Catalog Structure and Integrity', () => {
    it('should have a valid manifest structure with version and samples array', () => {
      expect(manifest.version).toBeDefined();
      expect(Array.isArray(manifest.samples)).toBe(true);
      expect(manifest.samples.length).toBe(5);
    });

    it('every sample must have an existing image file on disk', () => {
      for (const sample of manifest.samples) {
        const imagePath = path.join(sampleDir, 'images', sample.image_file);
        expect(fs.existsSync(imagePath)).toBe(true);
        const stats = fs.statSync(imagePath);
        expect(stats.size).toBeGreaterThan(100);
      }
    });

    it('every sample must define a canonical expected status', () => {
      const allowedStatuses = new Set([
        'VERIFIED',
        'DESTINATION_MISMATCH',
        'UNVERIFIED',
        'SUSPICIOUS',
        'INSUFFICIENT_EVIDENCE',
      ]);

      for (const sample of manifest.samples) {
        expect(allowedStatuses.has(sample.expected_status)).toBe(true);
        expect(sample.category).toBe(sample.expected_status);
      }
    });

    it('samples must cover all 5 canonical statuses without duplicates', () => {
      const statuses = manifest.samples.map((s) => s.expected_status);
      const uniqueStatuses = new Set(statuses);
      expect(uniqueStatuses.size).toBe(5);
      expect(uniqueStatuses.has('VERIFIED')).toBe(true);
      expect(uniqueStatuses.has('DESTINATION_MISMATCH')).toBe(true);
      expect(uniqueStatuses.has('UNVERIFIED')).toBe(true);
      expect(uniqueStatuses.has('SUSPICIOUS')).toBe(true);
      expect(uniqueStatuses.has('INSUFFICIENT_EVIDENCE')).toBe(true);
    });
  });

  describe('Part 15.9, 15.10, 15.11 - Security and Credential Hygiene', () => {
    it('no private reference image should appear in public sample definitions', () => {
      for (const sample of manifest.samples) {
        expect(sample.storage_path).not.toContain('reference-qrs');
        expect(sample.public_url).not.toContain('reference-qrs');
        expect(sample.public_url).toContain('sample-lab');
      }
    });

    it('no real bank credentials or secrets appear in sample payloads', () => {
      const manifestStr = JSON.stringify(manifest).toLowerCase();
      // Should not contain real account numbers, real bank auth keys, or private tokens
      expect(manifestStr).not.toContain('sbix');
      expect(manifestStr).not.toContain('service_role');
      expect(manifestStr).not.toContain('supabase_secret');
      expect(manifestStr).not.toContain('eyj'); // No JWTs
      for (const sample of manifest.samples) {
        expect(sample.payload).toContain('sample');
      }
    });

    it('sample route does NOT return precomputed fake verification results', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/samples',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.samples).toBeDefined();

      for (const sample of body.samples) {
        // Must NOT contain verification_status or mock response body pretending to be live analysis
        expect(sample.verification_status).toBeUndefined();
        expect(sample.decoded_payload).toBeUndefined();
      }
    });
  });

  describe('Part 10 & 15.12 - REST API Endpoints: GET /api/v1/samples and image streaming', () => {
    it('GET /api/v1/samples returns full catalog', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/samples',
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.samples.length).toBe(5);
    });

    it('GET /api/v1/samples/:sampleId returns specific sample', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/samples/sample-verified',
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.sample.id).toBe('sample-verified');
      expect(body.sample.expected_status).toBe('VERIFIED');
    });

    it('GET /api/v1/samples/:sampleId returns 404 for unknown sample', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/samples/sample-nonexistent',
      });
      expect(res.statusCode).toBe(404);
    });

    it('GET /api/v1/samples/:sampleId/image streams binary PNG with correct headers', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/samples/sample-verified/image',
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
      expect(res.headers['cache-control']).toContain('public');
      expect(res.rawPayload.length).toBeGreaterThan(100);
    });
  });

  describe('Part 15.4 to 15.8 & 15.13 - Live Real Verification Pipeline Execution', () => {
    it('15.4: VERIFIED sample executes and returns authoritative status VERIFIED', async () => {
      const sample = manifest.samples.find((s) => s.id === 'sample-verified')!;
      const imagePath = path.join(sampleDir, 'images', sample.image_file);
      const imageBuffer = fs.readFileSync(imagePath);

      const req = createMultipartRequest(
        { merchant_id: sample.merchant_id! },
        {
          fieldname: 'image',
          filename: sample.image_file,
          mimetype: 'image/png',
          content: imageBuffer,
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
      expect(body.image_quality.overall_quality).toBe('ACCEPTABLE');
      expect(body.composite_evidence.tamper.boundary_anomaly_detected).toBe(false);
      expect(body.recommendation).toBe('REVIEW_NOT_REQUIRED');
    });

    it('15.5: DESTINATION_MISMATCH sample executes and returns DESTINATION_MISMATCH', async () => {
      const sample = manifest.samples.find(
        (s) => s.id === 'sample-destination-mismatch',
      )!;
      const imagePath = path.join(sampleDir, 'images', sample.image_file);
      const imageBuffer = fs.readFileSync(imagePath);

      const req = createMultipartRequest(
        { merchant_id: sample.merchant_id! },
        {
          fieldname: 'image',
          filename: sample.image_file,
          mimetype: 'image/png',
          content: imageBuffer,
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
      expect(body.risk_factors).toContain('DESTINATION_CONFLICT');
      expect(body.recommendation).toBe('DO_NOT_PROCEED_WITH_PAYMENT');
    });

    it('15.6: UNVERIFIED sample executes and returns UNVERIFIED with accurate messaging', async () => {
      const sample = manifest.samples.find((s) => s.id === 'sample-unverified')!;
      const imagePath = path.join(sampleDir, 'images', sample.image_file);
      const imageBuffer = fs.readFileSync(imagePath);

      const req = createMultipartRequest(
        {},
        {
          fieldname: 'image',
          filename: sample.image_file,
          mimetype: 'image/png',
          content: imageBuffer,
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
      expect(body.risk_factors).toContain('NO_TRUSTED_REGISTRATION');
      expect(body.recommendation).toBe('VERIFY_MERCHANT_BEFORE_PAYMENT');
      expect(body.explanation.toLowerCase()).toMatch(
        /no (active )?trusted (destination|registration)/,
      );
    });

    it('15.7: SUSPICIOUS sample executes and triggers boundary edge anomaly', async () => {
      const sample = manifest.samples.find((s) => s.id === 'sample-suspicious')!;
      const imagePath = path.join(sampleDir, 'images', sample.image_file);
      const imageBuffer = fs.readFileSync(imagePath);

      const req = createMultipartRequest(
        { merchant_id: sample.merchant_id! },
        {
          fieldname: 'image',
          filename: sample.image_file,
          mimetype: 'image/png',
          content: imageBuffer,
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
      expect(body.verification_status).toBe('SUSPICIOUS');
      expect(body.destination_match).toBe(true);
      expect(body.composite_evidence.tamper.available).toBe(true);
      expect(body.composite_evidence.tamper.boundary_anomaly_detected).toBe(true);
      expect(body.risk_factors).toContain('BOUNDARY_EDGE_ANOMALY');
      expect(body.recommendation).toBe('MANUAL_INSPECTION_RECOMMENDED');
    });

    it('15.8: INSUFFICIENT_EVIDENCE sample executes and triggers image quality gate', async () => {
      const sample = manifest.samples.find(
        (s) => s.id === 'sample-insufficient-evidence',
      )!;
      const imagePath = path.join(sampleDir, 'images', sample.image_file);
      const imageBuffer = fs.readFileSync(imagePath);

      const req = createMultipartRequest(
        { merchant_id: sample.merchant_id! },
        {
          fieldname: 'image',
          filename: sample.image_file,
          mimetype: 'image/png',
          content: imageBuffer,
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
      expect(body.verification_status).toBe('INSUFFICIENT_EVIDENCE');
      expect(body.image_quality.overall_quality).toBe('INSUFFICIENT');
      expect(body.risk_factors).toContain('IMAGE_QUALITY_INSUFFICIENT');
      expect(body.recommendation).toBe('CAPTURE_CLEARER_IMAGE');
    });
  });
});
