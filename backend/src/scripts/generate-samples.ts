import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import crypto from 'node:crypto';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { supabaseServer } from '../integrations/supabase/client.js';

// Load .env explicitly
const candidatePaths = ['.env', 'backend/.env', '../backend/.env'];
for (const p of candidatePaths) {
  if (existsSync(p)) {
    process.loadEnvFile?.(resolve(p));
    break;
  }
}

const OFFICIAL_PAYLOAD =
  'upi://pay?pa=qrshield-sample@icici&pn=QRShield%20Sample%20Store&mc=5411';
const ATTACKER_PAYLOAD =
  'upi://pay?pa=attacker-sample@upi&pn=QRShield%20Sample%20Store&mc=5411';
const UNREGISTERED_PAYLOAD =
  'upi://pay?pa=unregistered-sample@upi&pn=Unregistered%20Merchant&mc=5411';

export const SAMPLE_MERCHANT_ID = '51bc512c-7945-4404-bd24-4316ce924daa';

export async function generateSampleBuffers(): Promise<{
  baseline: Buffer;
  verified: Buffer;
  mismatch: Buffer;
  unverified: Buffer;
  suspicious: Buffer;
  insufficient: Buffer;
}> {
  // 1. Baseline & Verified candidate (official)
  const baseline = await QRCode.toBuffer(OFFICIAL_PAYLOAD, {
    type: 'png',
    width: 400,
    margin: 4,
    errorCorrectionLevel: 'M',
  });
  const verified = Buffer.from(baseline);

  // 2. Mismatch candidate
  const mismatch = await QRCode.toBuffer(ATTACKER_PAYLOAD, {
    type: 'png',
    width: 400,
    margin: 4,
    errorCorrectionLevel: 'M',
  });

  // 3. Unverified candidate
  const unverified = await QRCode.toBuffer(UNREGISTERED_PAYLOAD, {
    type: 'png',
    width: 400,
    margin: 4,
    errorCorrectionLevel: 'M',
  });

  // 4. Suspicious candidate (controlled boundary / sticker cutline anomaly)
  const overlaySvg = Buffer.from(
    `<svg width="400" height="400">
      <rect x="30" y="30" width="340" height="340" fill="none" stroke="#000000" stroke-width="8" />
    </svg>`,
  );
  const suspicious = await sharp(baseline)
    .composite([{ input: overlaySvg, top: 0, left: 0 }])
    .png()
    .toBuffer();

  // 5. Insufficient evidence candidate (degraded capture)
  const insufficient = await sharp(baseline)
    .resize(140, 140)
    .modulate({ brightness: 0.18 })
    .blur(0.8)
    .png()
    .toBuffer();

  return { baseline, verified, mismatch, unverified, suspicious, insufficient };
}

async function main() {
  console.log('================================================================');
  console.log('QRShield Deterministic Sample Lab Asset Generator');
  console.log('================================================================');

  // Step 1: Generate buffers
  console.log('\n[Step 1] Generating deterministic QR buffers...');
  const buffers = await generateSampleBuffers();

  // Step 2: Save locally to sample-data/images/
  console.log('\n[Step 2] Saving buffers to sample-data/images/...');
  const projectRoot = resolve(process.cwd(), '..');
  const imagesDir = existsSync(resolve(process.cwd(), 'sample-data'))
    ? resolve(process.cwd(), 'sample-data', 'images')
    : resolve(projectRoot, 'sample-data', 'images');

  if (!existsSync(imagesDir)) {
    mkdirSync(imagesDir, { recursive: true });
  }

  writeFileSync(join(imagesDir, 'reference-baseline.png'), buffers.baseline);
  writeFileSync(join(imagesDir, 'sample-01-verified.png'), buffers.verified);
  writeFileSync(join(imagesDir, 'sample-02-mismatch.png'), buffers.mismatch);
  writeFileSync(join(imagesDir, 'sample-03-unverified.png'), buffers.unverified);
  writeFileSync(join(imagesDir, 'sample-04-suspicious.png'), buffers.suspicious);
  writeFileSync(join(imagesDir, 'sample-05-insufficient.png'), buffers.insufficient);
  console.log(`Saved 6 image assets to: ${imagesDir}`);

  // Step 3: Upload to public Supabase Storage bucket 'sample-lab'
  console.log('\n[Step 3] Uploading to public Supabase Storage bucket "sample-lab"...');
  const publicUploads = [
    { path: 'verified/candidate.png', buffer: buffers.verified },
    { path: 'mismatch/candidate.png', buffer: buffers.mismatch },
    { path: 'unverified/candidate.png', buffer: buffers.unverified },
    { path: 'suspicious/candidate.png', buffer: buffers.suspicious },
    { path: 'insufficient-evidence/candidate.png', buffer: buffers.insufficient },
    { path: 'reference/baseline.png', buffer: buffers.baseline },
  ];

  for (const item of publicUploads) {
    const { error: upErr } = await supabaseServer.storage
      .from('sample-lab')
      .upload(item.path, item.buffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (upErr) {
      console.error(`Failed to upload ${item.path} to sample-lab:`, upErr.message);
    } else {
      const { data: pubData } = supabaseServer.storage
        .from('sample-lab')
        .getPublicUrl(item.path);
      console.log(`- Uploaded: ${item.path} -> ${pubData.publicUrl}`);
    }
  }

  // Step 4: Ensure Sample Merchant & Destination in PostgreSQL
  console.log('\n[Step 4] Ensuring demo merchant & trusted destination in PostgreSQL...');
  // Check if destination exists
  const { data: existingDests } = await supabaseServer
    .from('payment_destinations')
    .select('id, destination_value')
    .eq('merchant_id', SAMPLE_MERCHANT_ID)
    .eq('destination_value', 'qrshield-sample@icici');

  if (!existingDests || existingDests.length === 0) {
    const { error: insertDestErr } = await supabaseServer
      .from('payment_destinations')
      .insert({
        merchant_id: SAMPLE_MERCHANT_ID,
        destination_type: 'VPA',
        destination_value: 'qrshield-sample@icici',
        is_active: true,
      });
    if (insertDestErr) {
      console.error('Error inserting trusted destination:', insertDestErr.message);
    } else {
      console.log(
        'Inserted active destination: qrshield-sample@icici for sample merchant.',
      );
    }
  } else {
    console.log('Active destination qrshield-sample@icici already exists.');
  }

  // Step 5: Upload baseline to private reference-qrs bucket and register record
  console.log('\n[Step 5] Registering reference QR in private reference-qrs bucket...');
  const refStoragePath = `${SAMPLE_MERCHANT_ID}/reference.png`;
  const { error: refStorageErr } = await supabaseServer.storage
    .from('reference-qrs')
    .upload(refStoragePath, buffers.baseline, {
      contentType: 'image/png',
      upsert: true,
    });

  if (refStorageErr) {
    console.error(
      'Failed to upload reference QR to reference-qrs:',
      refStorageErr.message,
    );
  } else {
    console.log(`Uploaded reference image to private storage: ${refStoragePath}`);
  }

  // Clean old reference records for sample merchant
  await supabaseServer
    .from('reference_qrs')
    .delete()
    .eq('merchant_id', SAMPLE_MERCHANT_ID);

  const payloadHash = crypto.createHash('sha256').update(OFFICIAL_PAYLOAD).digest('hex');
  const { error: refInsertErr } = await supabaseServer.from('reference_qrs').insert({
    merchant_id: SAMPLE_MERCHANT_ID,
    storage_path: refStoragePath,
    payload_hash: payloadHash,
    raw_payload: OFFICIAL_PAYLOAD,
  });

  if (refInsertErr) {
    console.error('Failed to insert reference_qrs record:', refInsertErr.message);
  } else {
    console.log('Registered active reference_qrs record for sample merchant.');
  }

  console.log('\n================================================================');
  console.log('Sample Lab generation and registration completed successfully!');
  console.log('================================================================');
}

// Execute if run directly
if (process.argv[1]?.includes('generate-samples')) {
  main().catch((err) => {
    console.error('Sample generation failed:', err);
    process.exit(1);
  });
}
