import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import QRCode from 'qrcode';
import {
  supabaseServer,
  createSupabaseServerClient,
} from '../integrations/supabase/client.js';
import { buildApp } from '../app.js';

// Load .env explicitly
const candidatePaths = ['.env', 'backend/.env', '../backend/.env'];
for (const p of candidatePaths) {
  if (existsSync(p)) {
    process.loadEnvFile?.(resolve(p));
    break;
  }
}

// Harmless test users from Supabase Auth
const USER_A_EMAIL = 'merchant.test.auth@gmail.com';
const MERCHANT_A_ID = '79a836e0-68e1-4b00-a122-eadef81eb068'; // Apex Retailers Ltd, owned by User A

const USER_B_ID = 'ce3f14b7-b3cf-4f72-a1a7-46898091afae'; // pranavvchinnu@gmail.com
const NONEXISTENT_MERCHANT_ID = '00000000-0000-4000-8000-000000000000';

function createMultipartBody(
  fields: Record<string, string>,
  file: { fieldname: string; filename: string; mimetype: string; content: Buffer },
): { headers: Record<string, string>; payload: Buffer } {
  const boundary =
    '----WebKitFormBoundaryQRShieldSecCheck' + Math.random().toString(36).substring(2);
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

async function runManualSecurityValidation() {
  console.log('================================================================');
  console.log('PROMPT 021A PART 15 — MANUAL SECURITY VALIDATION');
  console.log('================================================================');

  const app = buildApp({ logger: false });

  // Setup: Find User B's merchant record by user_id
  console.log('\n[Setup] Querying User B merchant record by user_id...');
  const { data: userBMerchant, error: uBErr } = await supabaseServer
    .from('merchants')
    .select('*')
    .eq('user_id', USER_B_ID)
    .single();

  if (uBErr || !userBMerchant) {
    throw new Error(`Failed to find merchant for User B: ${uBErr?.message}`);
  }
  const MERCHANT_B_ID = userBMerchant.id;
  console.log('Found User B Merchant ID:', MERCHANT_B_ID);

  // Setup: Give Merchant B an initial reference QR and storage file
  console.log('[Setup] Seeding initial reference QR for Merchant B...');
  const userBQrBytes = await QRCode.toBuffer('upi://pay?pa=userb@bank&pn=User%20B', {
    type: 'png',
    width: 400,
  });
  const userBStoragePath = `${MERCHANT_B_ID}/baseline-ref.png`;
  const { error: storageErr } = await supabaseServer.storage
    .from('reference-qrs')
    .upload(userBStoragePath, userBQrBytes, { contentType: 'image/png', upsert: true });
  if (storageErr) {
    console.error('Storage upload error:', storageErr);
  }

  await supabaseServer.from('reference_qrs').delete().eq('merchant_id', MERCHANT_B_ID);
  const { error: refInsertErr } = await supabaseServer.from('reference_qrs').insert({
    merchant_id: MERCHANT_B_ID,
    storage_path: userBStoragePath,
    payload_hash: 'hash-user-b-baseline',
    raw_payload: 'upi://pay?pa=userb@bank&pn=User%20B',
  });
  if (refInsertErr) {
    console.error('Reference insert error:', refInsertErr);
  }

  // Snapshot User B's state BEFORE any attack attempts
  const { data: snapshotDbB } = await supabaseServer
    .from('reference_qrs')
    .select('id, merchant_id, storage_path, payload_hash, raw_payload')
    .eq('merchant_id', MERCHANT_B_ID);
  const { data: snapshotStorageB } = await supabaseServer.storage
    .from('reference-qrs')
    .list(MERCHANT_B_ID);

  console.log('Merchant B initial DB records count:', snapshotDbB?.length);
  console.log('Merchant B initial Storage files count:', snapshotStorageB?.length);

  // 1. Authenticate as User A
  console.log(
    '\n[Step 1] Authenticating as User A (harmless test account):',
    USER_A_EMAIL,
  );
  const linkRes = await supabaseServer.auth.admin.generateLink({
    type: 'magiclink',
    email: USER_A_EMAIL,
  });
  const otp = linkRes.data?.properties?.email_otp;
  if (!otp) throw new Error('Failed to generate magic link OTP for User A');

  const authClient = createSupabaseServerClient();
  const { data: authData, error: authError } = await authClient.auth.verifyOtp({
    email: USER_A_EMAIL,
    token: otp,
    type: 'magiclink',
  });
  if (authError || !authData.session?.access_token) {
    throw new Error(`User A authentication failed: ${authError?.message}`);
  }
  const userAToken = authData.session.access_token;
  console.log('User A successfully authenticated.');
  console.log('User A ID:', authData.user?.id);

  // 2. Access User A's merchant reference QR → must work (HTTP 200)
  console.log('\n[Step 2] User A accessing Merchant A reference QR (GET)...');
  const getMerchantARes = await app.inject({
    method: 'GET',
    url: `/api/v1/merchants/${MERCHANT_A_ID}/reference-qr`,
    headers: {
      Authorization: `Bearer ${userAToken}`,
    },
  });
  console.log('GET Merchant A status:', getMerchantARes.statusCode);
  if (getMerchantARes.statusCode !== 200) {
    throw new Error(
      `Expected HTTP 200 for User A accessing Merchant A, got ${getMerchantARes.statusCode}`,
    );
  }
  console.log('GET Merchant A response body:', getMerchantARes.json());

  // 3. Attempt User B merchant ID with User A's token → must return 403 E_FORBIDDEN
  console.log(
    '\n[Step 3] User A attempting to GET Merchant B reference QR (BOLA/IDOR attempt)...',
  );

  const idorGetRes = await app.inject({
    method: 'GET',
    url: `/api/v1/merchants/${MERCHANT_B_ID}/reference-qr`,
    headers: {
      Authorization: `Bearer ${userAToken}`,
    },
  });
  console.log('IDOR GET status:', idorGetRes.statusCode);
  const idorGetBody = idorGetRes.json();
  console.log('IDOR GET body:', idorGetBody);
  if (idorGetRes.statusCode !== 403 || idorGetBody.error?.code !== 'E_FORBIDDEN') {
    throw new Error(`Expected HTTP 403 E_FORBIDDEN, got ${idorGetRes.statusCode}`);
  }
  if (idorGetBody.error?.message !== 'Caller does not own this merchant profile.') {
    throw new Error(`Unexpected error message: ${idorGetBody.error?.message}`);
  }
  console.log('IDOR GET correctly blocked with HTTP 403 E_FORBIDDEN!');

  // Test IDOR POST with User A token on Merchant B
  console.log(
    '\n[Step 3b] User A attempting to POST/overwrite Merchant B reference QR (BOLA/IDOR attempt)...',
  );
  const fakeQrBuffer = await QRCode.toBuffer('upi://pay?pa=attacker@upi&pn=Malicious', {
    type: 'png',
    width: 400,
  });
  const idorPostReq = createMultipartBody(
    {},
    {
      fieldname: 'image',
      filename: 'exploit.png',
      mimetype: 'image/png',
      content: fakeQrBuffer,
    },
  );
  const idorPostRes = await app.inject({
    method: 'POST',
    url: `/api/v1/merchants/${MERCHANT_B_ID}/reference-qr`,
    headers: {
      ...idorPostReq.headers,
      Authorization: `Bearer ${userAToken}`,
    },
    payload: idorPostReq.payload,
  });
  console.log('IDOR POST status:', idorPostRes.statusCode);
  const idorPostBody = idorPostRes.json();
  console.log('IDOR POST body:', idorPostBody);
  if (idorPostRes.statusCode !== 403 || idorPostBody.error?.code !== 'E_FORBIDDEN') {
    throw new Error(
      `Expected HTTP 403 E_FORBIDDEN for POST, got ${idorPostRes.statusCode}`,
    );
  }
  console.log('IDOR POST correctly blocked with HTTP 403 E_FORBIDDEN!');

  // Test IDOR DELETE with User A token on Merchant B
  console.log(
    '\n[Step 3c] User A attempting to DELETE Merchant B reference QR (BOLA/IDOR attempt)...',
  );
  const idorDelRes = await app.inject({
    method: 'DELETE',
    url: `/api/v1/merchants/${MERCHANT_B_ID}/reference-qr`,
    headers: {
      Authorization: `Bearer ${userAToken}`,
    },
  });
  console.log('IDOR DELETE status:', idorDelRes.statusCode);
  const idorDelBody = idorDelRes.json();
  console.log('IDOR DELETE body:', idorDelBody);
  if (idorDelRes.statusCode !== 403 || idorDelBody.error?.code !== 'E_FORBIDDEN') {
    throw new Error(
      `Expected HTTP 403 E_FORBIDDEN for DELETE, got ${idorDelRes.statusCode}`,
    );
  }
  console.log('IDOR DELETE correctly blocked with HTTP 403 E_FORBIDDEN!');

  // 4. Try without Authorization → 401 E_UNAUTHORIZED
  console.log('\n[Step 4] Request without Authorization header (GET, POST, DELETE)...');
  const noAuthGet = await app.inject({
    method: 'GET',
    url: `/api/v1/merchants/${MERCHANT_A_ID}/reference-qr`,
  });
  if (noAuthGet.statusCode !== 401 || noAuthGet.json().error?.code !== 'E_UNAUTHORIZED') {
    throw new Error(
      `Expected HTTP 401 for GET without token, got ${noAuthGet.statusCode}`,
    );
  }

  const noAuthPost = await app.inject({
    method: 'POST',
    url: `/api/v1/merchants/${MERCHANT_A_ID}/reference-qr`,
    headers: idorPostReq.headers,
    payload: idorPostReq.payload,
  });
  if (
    noAuthPost.statusCode !== 401 ||
    noAuthPost.json().error?.code !== 'E_UNAUTHORIZED'
  ) {
    throw new Error(
      `Expected HTTP 401 for POST without token, got ${noAuthPost.statusCode}`,
    );
  }

  const noAuthDel = await app.inject({
    method: 'DELETE',
    url: `/api/v1/merchants/${MERCHANT_A_ID}/reference-qr`,
  });
  if (noAuthDel.statusCode !== 401 || noAuthDel.json().error?.code !== 'E_UNAUTHORIZED') {
    throw new Error(
      `Expected HTTP 401 for DELETE without token, got ${noAuthDel.statusCode}`,
    );
  }
  console.log(
    'Missing Authorization correctly rejected across GET, POST, DELETE with HTTP 401 E_UNAUTHORIZED!',
  );

  // 5. Try invalid token → 401 E_UNAUTHORIZED
  console.log('\n[Step 5] Request with invalid token...');
  const invalidTokenRes = await app.inject({
    method: 'GET',
    url: `/api/v1/merchants/${MERCHANT_A_ID}/reference-qr`,
    headers: {
      Authorization: 'Bearer invalid.bogus.jwt.token',
    },
  });
  console.log('Invalid Token status:', invalidTokenRes.statusCode);
  if (
    invalidTokenRes.statusCode !== 401 ||
    invalidTokenRes.json().error?.code !== 'E_UNAUTHORIZED'
  ) {
    throw new Error(
      `Expected HTTP 401 for invalid token, got ${invalidTokenRes.statusCode}`,
    );
  }
  console.log('Invalid token correctly rejected with HTTP 401 E_UNAUTHORIZED!');

  // 5b. Nonexistent merchant → safe 404 E_MERCHANT_NOT_FOUND
  console.log('\n[Step 5b] User A requesting nonexistent merchant UUID...');
  const nonexistentRes = await app.inject({
    method: 'GET',
    url: `/api/v1/merchants/${NONEXISTENT_MERCHANT_ID}/reference-qr`,
    headers: {
      Authorization: `Bearer ${userAToken}`,
    },
  });
  console.log('Nonexistent merchant status:', nonexistentRes.statusCode);
  if (
    nonexistentRes.statusCode !== 404 ||
    nonexistentRes.json().error?.code !== 'E_MERCHANT_NOT_FOUND'
  ) {
    throw new Error(
      `Expected HTTP 404 E_MERCHANT_NOT_FOUND, got ${nonexistentRes.statusCode}`,
    );
  }
  console.log('Nonexistent merchant correctly returned HTTP 404 E_MERCHANT_NOT_FOUND!');

  // 6. Confirm User B's reference QR is untouched
  console.log(
    '\n[Step 6] Confirming User B (Merchant B) reference records are untouched...',
  );
  const { data: finalMerchantBRef } = await supabaseServer
    .from('reference_qrs')
    .select('id, merchant_id, storage_path, payload_hash, raw_payload')
    .eq('merchant_id', MERCHANT_B_ID);

  console.log(
    `Merchant B DB records before: ${snapshotDbB?.length}, after: ${finalMerchantBRef?.length}`,
  );
  if (JSON.stringify(snapshotDbB) !== JSON.stringify(finalMerchantBRef)) {
    throw new Error(
      'CRITICAL: Merchant B database records were mutated during unauthorized attacks!',
    );
  }
  console.log(
    'Verified: Merchant B database record is 100% UNTOUCHED (zero DB mutation).',
  );

  // 7. Confirm no unauthorized Storage object was created/deleted
  console.log(
    '\n[Step 7] Confirming no unauthorized Storage object was created/deleted in Merchant B folder...',
  );
  const { data: finalStorageB } = await supabaseServer.storage
    .from('reference-qrs')
    .list(MERCHANT_B_ID);

  console.log(
    `Merchant B Storage files before: ${snapshotStorageB?.length}, after: ${finalStorageB?.length}`,
  );
  if (JSON.stringify(snapshotStorageB) !== JSON.stringify(finalStorageB)) {
    throw new Error(
      'CRITICAL: Merchant B storage files were mutated during unauthorized attacks!',
    );
  }
  console.log(
    'Verified: Merchant B storage directory is 100% UNTOUCHED (zero Storage mutation).',
  );

  // Teardown: Clean up User B test records
  console.log('\n[Teardown] Cleaning up test seed for Merchant B...');
  await supabaseServer.storage.from('reference-qrs').remove([userBStoragePath]);
  await supabaseServer.from('reference_qrs').delete().eq('merchant_id', MERCHANT_B_ID);

  console.log('\n================================================================');
  console.log('ALL MANUAL SECURITY VALIDATION CHECKS COMPLETED SUCCESSFULLY!');
  console.log('================================================================');
}

runManualSecurityValidation().catch((err) => {
  console.error('\nManual Security Validation FAILED:', err);
  process.exit(1);
});
