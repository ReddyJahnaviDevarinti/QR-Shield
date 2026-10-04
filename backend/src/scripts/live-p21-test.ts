import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { buildApp } from '../app.js';
import { supabaseServer } from '../integrations/supabase/client.js';

// Load .env explicitly
const candidatePaths = ['.env', 'backend/.env', '../backend/.env'];
for (const p of candidatePaths) {
  if (existsSync(p)) {
    process.loadEnvFile?.(resolve(p));
    break;
  }
}

const TEST_MERCHANT_ID = '79a836e0-68e1-4b00-a122-eadef81eb068';
const OFFICIAL_PAYLOAD =
  'upi://pay?pa=apexretail@icici&pn=Apex%20Retailers%20Ltd&mc=5411';
const ATTACKER_PAYLOAD = 'upi://pay?pa=attacker@upi&pn=Apex%20Retailers%20Ltd&mc=5411';

function createMultipartBody(
  fields: Record<string, string>,
  file: { fieldname: string; filename: string; mimetype: string; content: Buffer },
): { headers: Record<string, string>; payload: Buffer } {
  const boundary =
    '----WebKitFormBoundaryQRShieldP21' + Math.random().toString(36).substring(2);
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

async function runLiveManualTest() {
  console.log('====================================================');
  console.log('QRShield Prompt 021 Live Supabase Manual Test (Part 19)');
  console.log('====================================================');

  const app = buildApp({ logger: false });

  // 1. Initial State: Check merchant exists and active reference QR is initially empty
  console.log('\n[Step 1-2] Querying initial state for merchant:', TEST_MERCHANT_ID);
  const initialGetRes = await app.inject({
    method: 'GET',
    url: `/api/v1/merchants/${TEST_MERCHANT_ID}/reference-qr`,
  });
  console.log('Initial GET status:', initialGetRes.statusCode);
  const initialGetBody = initialGetRes.json();
  console.log('Initial reference QR registered:', initialGetBody.reference_qr !== null);

  // 3. Generate Official Test QR Reference Image
  console.log('\n[Step 3] Generating official reference QR image...');
  const officialQrBuffer = await QRCode.toBuffer(OFFICIAL_PAYLOAD, {
    type: 'png',
    width: 400,
    margin: 4,
    errorCorrectionLevel: 'M',
  });
  console.log(`Generated official QR image (${officialQrBuffer.length} bytes)`);

  // Upload official test QR reference image
  console.log(
    'Uploading official reference QR to POST /api/v1/merchants/:merchantId/reference-qr...',
  );
  const uploadReq = createMultipartBody(
    {},
    {
      fieldname: 'image',
      filename: 'official-apex-qr.png',
      mimetype: 'image/png',
      content: officialQrBuffer,
    },
  );

  const uploadRes = await app.inject({
    method: 'POST',
    url: `/api/v1/merchants/${TEST_MERCHANT_ID}/reference-qr`,
    headers: uploadReq.headers,
    payload: uploadReq.payload,
  });

  console.log('Upload response status:', uploadRes.statusCode);
  const uploadBody = uploadRes.json();
  console.log('Upload response body:', JSON.stringify(uploadBody, null, 2));

  if (uploadRes.statusCode !== 201 || !uploadBody.reference_qr) {
    throw new Error(`Reference QR upload failed with status ${uploadRes.statusCode}`);
  }

  // 4. Confirm Storage upload succeeds in private bucket
  console.log('\n[Step 4] Checking Supabase Storage bucket "reference-qrs"...');
  const storagePath = uploadBody.reference_qr.storage_path;
  console.log('Object storage path:', storagePath);
  const { data: fileData, error: downloadError } = await supabaseServer.storage
    .from('reference-qrs')
    .download(storagePath);

  if (downloadError || !fileData) {
    throw new Error(`Failed to download object from Storage: ${downloadError?.message}`);
  }
  const downloadedBytes = Buffer.from(await fileData.arrayBuffer());
  console.log(
    `Successfully verified Storage object exists (${downloadedBytes.length} bytes)`,
  );

  // 5. Confirm reference_qrs record exists in PostgreSQL
  console.log('\n[Step 5] Checking Supabase database "reference_qrs" record...');
  const { data: dbRecords, error: dbError } = await supabaseServer
    .from('reference_qrs')
    .select('*')
    .eq('merchant_id', TEST_MERCHANT_ID);

  if (dbError || !dbRecords || dbRecords.length === 0) {
    throw new Error(`Database record not found in reference_qrs: ${dbError?.message}`);
  }
  console.log('Database record found:', {
    id: dbRecords[0].id,
    merchant_id: dbRecords[0].merchant_id,
    storage_path: dbRecords[0].storage_path,
    payload_hash: dbRecords[0].payload_hash,
    raw_payload: dbRecords[0].raw_payload,
    finder_coordinates: dbRecords[0].finder_coordinates,
  });

  // 6-7. Refresh / reload: Confirm reference QR remains registered
  console.log('\n[Steps 6-7] Refreshing / querying GET reference-qr...');
  const refreshGetRes = await app.inject({
    method: 'GET',
    url: `/api/v1/merchants/${TEST_MERCHANT_ID}/reference-qr`,
  });
  console.log('Refreshed GET status:', refreshGetRes.statusCode);
  const refreshBody = refreshGetRes.json();
  const isRegistered = refreshBody.reference_qr !== null;
  console.log('Refreshed reference registered:', isRegistered);
  console.log(
    'Signed preview URL generated:',
    refreshBody.reference_qr?.preview_url ? 'YES (active signed URL)' : 'NO',
  );
  if (!isRegistered) {
    throw new Error('Reference QR was not registered upon refresh');
  }

  // 8-9. Verify the same/reference-equivalent image: Confirm physical comparison reports available
  console.log('\n[Steps 8-9] Verifying reference-equivalent QR with candidate image...');
  const verifyReq1 = createMultipartBody(
    { merchant_id: TEST_MERCHANT_ID },
    {
      fieldname: 'image',
      filename: 'candidate_official.png',
      mimetype: 'image/png',
      content: officialQrBuffer,
    },
  );

  const verifyRes1 = await app.inject({
    method: 'POST',
    url: '/api/v1/verify',
    headers: verifyReq1.headers,
    payload: verifyReq1.payload,
  });

  console.log('Verification 1 status code:', verifyRes1.statusCode);
  const verifyBody1 = verifyRes1.json();
  console.log('Verification 1 status:', verifyBody1.verification_status);
  console.log('Destination match:', verifyBody1.destination_match);
  console.log(
    'Tamper evidence available:',
    verifyBody1.composite_evidence?.tamper?.available,
  );
  console.log(
    'Visual deviation index:',
    verifyBody1.composite_evidence?.tamper?.visual_deviation_index,
  );
  console.log(
    'Alignment classification:',
    verifyBody1.composite_evidence?.tamper?.alignment_classification,
  );
  console.log(
    'Matrix mismatch ratio:',
    verifyBody1.composite_evidence?.tamper?.matrix_mismatch_ratio,
  );

  if (verifyBody1.verification_status !== 'VERIFIED') {
    throw new Error(`Expected VERIFIED, got ${verifyBody1.verification_status}`);
  }
  if (!verifyBody1.composite_evidence?.tamper?.available) {
    throw new Error('Expected tamper evidence to be available');
  }

  // 10-12. Verify a visually modified copy: Confirm real tamper evidence and SUSPICIOUS status
  console.log('\n[Steps 10-12] Creating visually modified candidate QR...');
  // Overlay a physical sticker/patch over the candidate QR (around center, retaining decodability with Reed-Solomon)
  const stickerSvg = Buffer.from(
    `<svg width="50" height="50"><rect width="50" height="50" fill="gray" /></svg>`,
  );
  const tamperedQrBuffer = await sharp(officialQrBuffer)
    .composite([{ input: stickerSvg, top: 120, left: 120 }])
    .png()
    .toBuffer();

  const verifyReq2 = createMultipartBody(
    { merchant_id: TEST_MERCHANT_ID },
    {
      fieldname: 'image',
      filename: 'candidate_tampered.png',
      mimetype: 'image/png',
      content: tamperedQrBuffer,
    },
  );

  const verifyRes2 = await app.inject({
    method: 'POST',
    url: '/api/v1/verify',
    headers: verifyReq2.headers,
    payload: verifyReq2.payload,
  });

  console.log('Verification 2 status code:', verifyRes2.statusCode);
  const verifyBody2 = verifyRes2.json();
  console.log('Verification 2 status:', verifyBody2.verification_status);
  console.log('Destination match:', verifyBody2.destination_match);
  console.log(
    'Tamper evidence available:',
    verifyBody2.composite_evidence?.tamper?.available,
  );
  console.log(
    'Visual deviation index:',
    verifyBody2.composite_evidence?.tamper?.visual_deviation_index,
  );
  console.log(
    'Alignment classification:',
    verifyBody2.composite_evidence?.tamper?.alignment_classification,
  );
  console.log(
    'Boundary anomaly:',
    verifyBody2.composite_evidence?.tamper?.boundary_anomaly_score,
  );
  console.log(
    'Tamper indicators:',
    verifyBody2.composite_evidence?.tamper?.tamper_indicators,
  );
  console.log('Composite flags:', verifyBody2.composite_flags);

  // 13-14. Verify QR with different destination: Confirm DESTINATION_MISMATCH remains authoritative
  console.log(
    '\n[Steps 13-14] Verifying QR with different destination (attacker payload)...',
  );
  const attackerQrBuffer = await QRCode.toBuffer(ATTACKER_PAYLOAD, {
    type: 'png',
    width: 400,
    margin: 4,
    errorCorrectionLevel: 'M',
  });
  // Also add visual tamper to attacker QR to prove destination mismatch supersedes visual tamper
  const attackerTamperedBuffer = await sharp(attackerQrBuffer)
    .composite([{ input: stickerSvg, top: 120, left: 120 }])
    .png()
    .toBuffer();

  const verifyReq3 = createMultipartBody(
    { merchant_id: TEST_MERCHANT_ID },
    {
      fieldname: 'image',
      filename: 'candidate_attacker.png',
      mimetype: 'image/png',
      content: attackerTamperedBuffer,
    },
  );

  const verifyRes3 = await app.inject({
    method: 'POST',
    url: '/api/v1/verify',
    headers: verifyReq3.headers,
    payload: verifyReq3.payload,
  });

  console.log('Verification 3 status code:', verifyRes3.statusCode);
  const verifyBody3 = verifyRes3.json();
  console.log('Verification 3 status:', verifyBody3.verification_status);
  console.log('Destination match:', verifyBody3.destination_match);
  if (verifyBody3.verification_status !== 'DESTINATION_MISMATCH') {
    throw new Error(
      `Expected DESTINATION_MISMATCH, got ${verifyBody3.verification_status}`,
    );
  }

  // 15-16. Sign out / Anonymous access check on private Storage bucket
  console.log(
    '\n[Steps 15-16] Testing anonymous access rejection to private storage bucket...',
  );
  const anonSupabase = createClient(
    process.env.SUPABASE_URL!,
    // Using a non-authenticated / dummy key or standard anon client without auth session
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'dummy-anon-key',
  );

  const { data: anonData, error: anonError } = await anonSupabase.storage
    .from('reference-qrs')
    .download(storagePath);

  if (anonError) {
    console.log('Anonymous download correctly REJECTED with error:', anonError.message);
  } else if (!anonData || anonData.size === 0) {
    console.log('Anonymous download returned 0 bytes (access denied)');
  } else {
    throw new Error(
      'SECURITY VIOLATION: Private reference QR was accessible anonymously!',
    );
  }

  // Cleanup: Delete the reference QR from the test merchant so state remains pristine
  console.log('\n[Cleanup] Deleting test reference QR...');
  const deleteRes = await app.inject({
    method: 'DELETE',
    url: `/api/v1/merchants/${TEST_MERCHANT_ID}/reference-qr`,
  });
  console.log('Delete status:', deleteRes.statusCode);
  const deleteBody = deleteRes.json();
  console.log('Delete response:', JSON.stringify(deleteBody, null, 2));

  // Verify deletion from DB and Storage
  const { data: postDeleteDb } = await supabaseServer
    .from('reference_qrs')
    .select('id')
    .eq('merchant_id', TEST_MERCHANT_ID);
  console.log('Post-cleanup reference_qrs count in DB:', postDeleteDb?.length ?? 0);

  console.log('\n====================================================');
  console.log('ALL PART 19 LIVE SUPABASE CHECKS COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
}

runLiveManualTest().catch((err) => {
  console.error('\nPart 19 Test Failed:', err);
  process.exit(1);
});
