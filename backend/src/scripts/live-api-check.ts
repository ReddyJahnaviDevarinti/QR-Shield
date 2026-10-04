import { performance } from 'node:perf_hooks';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import QRCode from 'qrcode';
import { buildApp } from '../app.js';

// Load .env explicitly
const candidatePaths = ['.env', 'backend/.env', '../backend/.env'];
for (const p of candidatePaths) {
  if (existsSync(p)) {
    process.loadEnvFile?.(resolve(p));
    break;
  }
}

const MERCHANT_ID = '51bc512c-7945-4404-bd24-4316ce924daa';
const TRUSTED_PAYLOAD = 'upi://pay?pa=qrshield-test@icici&pn=QRShield%20Test&mc=5411';
const ATTACKER_PAYLOAD = 'upi://pay?pa=attacker@upi&pn=QRShield%20Test&mc=5411';

async function generateQrBuffer(payload: string): Promise<Buffer> {
  return QRCode.toBuffer(payload, {
    type: 'png',
    width: 400,
    margin: 4,
    errorCorrectionLevel: 'M',
  });
}

function createMultipartBody(
  fields: Record<string, string>,
  filename: string,
  mimetype: string,
  buffer: Buffer,
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

  chunks.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: ${mimetype}\r\n\r\n`,
    ),
  );
  chunks.push(buffer);
  chunks.push(Buffer.from('\r\n'));
  chunks.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
    },
    payload: Buffer.concat(chunks),
  };
}

async function runLiveChecks() {
  console.log('====================================================');
  console.log('QRShield Prompt 018 Live End-to-End API Checks');
  console.log('====================================================');

  const app = buildApp({ logger: false });

  // ------------------------------------------------------------------
  // Task 16: Live VERIFIED API Check
  // ------------------------------------------------------------------
  console.log('\n--- Task 16: Live VERIFIED API Check ---');
  const verifiedBuffer = await generateQrBuffer(TRUSTED_PAYLOAD);
  const req1 = createMultipartBody(
    { merchant_id: MERCHANT_ID },
    'verified_qr.png',
    'image/png',
    verifiedBuffer,
  );

  const t1Start = performance.now();
  const res1 = await app.inject({
    method: 'POST',
    url: '/api/v1/verify',
    headers: req1.headers,
    payload: req1.payload,
  });
  const t1TotalDuration = Math.round((performance.now() - t1Start) * 100) / 100;

  const body1 = res1.json();
  console.log(`HTTP Status: ${res1.statusCode}`);
  console.log(`Total API Latency: ${t1TotalDuration} ms`);
  console.log(`Verification Status: ${body1.verification_status}`);
  console.log(`Destination Match: ${body1.destination_match}`);
  console.log(`Explanation Provider: ${body1.explanation_metadata?.provider}`);
  console.log(`Explanation Model: ${body1.explanation_metadata?.model}`);
  console.log(`Explanation: "${body1.explanation}"`);
  console.log(`Duration recorded by API: ${body1.processing_metadata?.duration_ms} ms`);

  if (body1.verification_status !== 'VERIFIED') {
    throw new Error(
      `Task 16 FAILED: Expected VERIFIED but got ${body1.verification_status}`,
    );
  }
  if (body1.destination_match !== true) {
    throw new Error(`Task 16 FAILED: Expected destination_match=true`);
  }
  if (
    body1.explanation_metadata?.provider !== 'gemini' &&
    body1.explanation_metadata?.provider !== 'deterministic_fallback'
  ) {
    throw new Error(
      `Task 16 FAILED: Unexpected provider ${body1.explanation_metadata?.provider}`,
    );
  }
  console.log('>>> TASK 16 PASSED: Canonical status is strictly VERIFIED.');

  // ------------------------------------------------------------------
  // Task 17: Live DESTINATION_MISMATCH Safety Check
  // ------------------------------------------------------------------
  console.log('\n--- Task 17: Live DESTINATION_MISMATCH Safety Check ---');
  const mismatchBuffer = await generateQrBuffer(ATTACKER_PAYLOAD);
  const req2 = createMultipartBody(
    { merchant_id: MERCHANT_ID },
    'mismatch_qr.png',
    'image/png',
    mismatchBuffer,
  );

  const t2Start = performance.now();
  const res2 = await app.inject({
    method: 'POST',
    url: '/api/v1/verify',
    headers: req2.headers,
    payload: req2.payload,
  });
  const t2TotalDuration = Math.round((performance.now() - t2Start) * 100) / 100;

  const body2 = res2.json();
  console.log(`HTTP Status: ${res2.statusCode}`);
  console.log(`Total API Latency: ${t2TotalDuration} ms`);
  console.log(`Verification Status: ${body2.verification_status}`);
  console.log(`Destination Match: ${body2.destination_match}`);
  console.log(`Explanation Provider: ${body2.explanation_metadata?.provider}`);
  console.log(`Explanation Model: ${body2.explanation_metadata?.model}`);
  console.log(`Explanation: "${body2.explanation}"`);
  console.log(`Duration recorded by API: ${body2.processing_metadata?.duration_ms} ms`);

  if (body2.verification_status !== 'DESTINATION_MISMATCH') {
    throw new Error(
      `Task 17 FAILED: Expected DESTINATION_MISMATCH but got ${body2.verification_status}`,
    );
  }
  if (body2.destination_match !== false) {
    throw new Error(`Task 17 FAILED: Expected destination_match=false`);
  }
  console.log('>>> TASK 17 PASSED: Canonical status is strictly DESTINATION_MISMATCH.');

  // ------------------------------------------------------------------
  // Task 18: Performance Summary
  // ------------------------------------------------------------------
  console.log('\n====================================================');
  console.log('Task 18: Performance Measurements');
  console.log('====================================================');
  console.log(`VERIFIED request total latency: ${t1TotalDuration} ms`);
  console.log(`DESTINATION_MISMATCH request total latency: ${t2TotalDuration} ms`);
}

runLiveChecks().catch((err) => {
  console.error('Fatal error during live API check:', err);
  process.exit(1);
});
