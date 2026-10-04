import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildApp } from '../app.js';

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

interface SampleRecord {
  id: string;
  name: string;
  category: string;
  expected_status: string;
  image_file: string;
  requires_merchant_context: boolean;
  merchant_id?: string;
  expected_evidence: Record<string, unknown>;
}

interface Manifest {
  version: string;
  generated_at: string;
  samples: SampleRecord[];
}

export async function runValidation(): Promise<boolean> {
  const dir = getSampleDataDir();
  const raw = fs.readFileSync(path.join(dir, 'manifest.json'), 'utf-8');
  const manifest = JSON.parse(raw) as Manifest;

  console.log('='.repeat(70));
  console.log('QRSHIELD SAMPLE LAB VALIDATOR');
  console.log(`Manifest Version : ${manifest.version}`);
  console.log(`Evaluator Cases  : ${manifest.samples.length}`);
  console.log(`Validation Time  : ${new Date().toISOString()}`);
  console.log('='.repeat(70));

  const app = buildApp();
  await app.ready();

  let allPassed = true;
  const results: Array<{
    id: string;
    name: string;
    expected: string;
    actual: string;
    passed: boolean;
    durationMs: number;
    details: string;
  }> = [];

  for (const sample of manifest.samples) {
    const imagePath = path.join(dir, 'images', sample.image_file);
    if (!fs.existsSync(imagePath)) {
      console.error(
        `[FAIL] Image missing for sample: ${sample.id} (${sample.image_file})`,
      );
      allPassed = false;
      results.push({
        id: sample.id,
        name: sample.name,
        expected: sample.expected_status,
        actual: 'IMAGE_NOT_FOUND',
        passed: false,
        durationMs: 0,
        details: `Missing file: ${sample.image_file}`,
      });
      continue;
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const fields: Record<string, string> = {};
    if (sample.requires_merchant_context && sample.merchant_id) {
      fields['merchant_id'] = sample.merchant_id;
    }

    const req = createMultipartRequest(fields, {
      fieldname: 'image',
      filename: sample.image_file,
      mimetype: 'image/png',
      content: imageBuffer,
    });

    const start = Date.now();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: req.headers,
      payload: req.payload,
    });
    const durationMs = Date.now() - start;

    if (res.statusCode !== 200) {
      console.error(`[FAIL] HTTP ${res.statusCode} for sample ${sample.id}: ${res.body}`);
      allPassed = false;
      results.push({
        id: sample.id,
        name: sample.name,
        expected: sample.expected_status,
        actual: `HTTP_${res.statusCode}`,
        passed: false,
        durationMs,
        details: res.body.substring(0, 100),
      });
      continue;
    }

    const body = res.json();
    const actualStatus = body.verification_status;
    const passed = actualStatus === sample.expected_status;

    if (!passed) {
      allPassed = false;
    }

    const tamperBoundary = body.composite_evidence?.tamper?.boundary_anomaly_detected;
    const quality = body.image_quality?.overall_quality;
    const destMatch = body.destination_match;
    const riskFactors = body.risk_factors || [];

    const details = `destMatch=${destMatch}, quality=${quality}, boundaryAnomaly=${tamperBoundary}, risks=[${riskFactors.join(',')}]`;

    results.push({
      id: sample.id,
      name: sample.name,
      expected: sample.expected_status,
      actual: actualStatus,
      passed,
      durationMs,
      details,
    });

    const statusBadge = passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
    console.log(
      `${statusBadge} ${sample.name.padEnd(45)} Expected: ${sample.expected_status.padEnd(22)} Actual: ${actualStatus.padEnd(22)} (${durationMs}ms)`,
    );
    console.log(`       Evidence: ${details}`);
  }

  await app.close();

  console.log('-'.repeat(70));
  const passCount = results.filter((r) => r.passed).length;
  console.log(`Summary: ${passCount} / ${results.length} samples passed validation.`);
  console.log('='.repeat(70));

  return allPassed;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runValidation()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Validation runner error:', err);
      process.exit(1);
    });
}
