import fs from 'fs';
import path from 'path';

async function checkLivePublicAssets() {
  const manifestPath = path.resolve(process.cwd(), '../sample-data/manifest.json');
  const raw = fs.readFileSync(manifestPath, 'utf-8');
  const manifest = JSON.parse(raw);

  console.log('Testing public access to Supabase sample-lab bucket:');
  for (const sample of manifest.samples) {
    const res = await fetch(sample.public_url);
    console.log(`[HTTP ${res.status}] ${sample.id}: ${sample.public_url}`);
    if (res.status !== 200) {
      throw new Error(`Failed to fetch ${sample.public_url}`);
    }
  }

  console.log('\nTesting unauthorized access to private reference-qrs bucket:');
  const privateUrl =
    'https://uivcrkcbhidsgyfbezju.supabase.co/storage/v1/object/public/reference-qrs/51bc512c-7945-4404-bd24-4316ce924daa/reference.png';
  const privateRes = await fetch(privateUrl);
  console.log(
    `[HTTP ${privateRes.status}] private reference QR access (Expected: 400/403/404): ${privateUrl}`,
  );

  if (privateRes.status === 200) {
    throw new Error(
      'CRITICAL SECURITY VIOLATION: Private reference-qrs bucket is publicly readable!',
    );
  }

  console.log('\nAll Supabase storage access rules verified successfully.');
}

checkLivePublicAssets().catch((err) => {
  console.error(err);
  process.exit(1);
});
