import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Load .env explicitly
const candidatePaths = ['.env', 'backend/.env', '../backend/.env'];
for (const p of candidatePaths) {
  if (existsSync(p)) {
    process.loadEnvFile?.(resolve(p));
    break;
  }
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const supabasePublishableKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_UTnMZWa1O8T2rtPJOorUBA_6oh7Gl2I';

if (!supabaseUrl || !supabaseSecretKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, supabaseSecretKey);

async function runValidation() {
  console.log('================================================================');
  console.log('PROMPT 024-RLS-FIX — LIVE SUPABASE RLS REGRESSION VERIFICATION');
  console.log('================================================================');

  const liveAccountEmail = 'meekosampranav@gmail.com';
  const otherUserId = 'e640047c-6309-44ce-a141-09083710df3b'; // merchant.test.auth@gmail.com

  // Step 1: Obtain authenticated session for live account
  console.log(`\n[Step 1] Authenticating test session for: ${liveAccountEmail}`);
  const linkRes = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: liveAccountEmail,
  });

  const otp = linkRes.data?.properties?.email_otp;
  if (!otp) {
    throw new Error('Failed to generate magiclink OTP for live account');
  }

  const authenticatedClient = createClient(supabaseUrl!, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await authenticatedClient.auth.verifyOtp({
    email: liveAccountEmail,
    token: otp,
    type: 'magiclink',
  });

  if (authError || !authData.user || !authData.session) {
    throw new Error(`Failed to verify OTP for live account: ${authError?.message}`);
  }

  const authenticatedUserId = authData.user.id;
  console.log(
    `[Step 1 PASS] Authenticated User ID: ${authenticatedUserId} (session confirmed)`,
  );

  // Clean any previous test rows for this user before running
  await adminClient.from('merchants').delete().eq('user_id', authenticatedUserId);

  try {
    // Step 2: Regression Check — Signed-out user cannot insert
    console.log(
      '\n[Step 2] Verifying signed-out (anon) client cannot insert into merchants...',
    );
    const anonClient = createClient(supabaseUrl!, supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: anonError } = await anonClient.from('merchants').insert({
      user_id: authenticatedUserId,
      business_name: 'Unauthorized Anon Store',
    });

    if (!anonError || anonError.code !== '42501') {
      throw new Error(
        `Expected error 42501 for signed-out insert, got: ${anonError?.code} - ${anonError?.message}`,
      );
    }
    console.log(
      `[Step 2 PASS] Signed-out insert rejected strictly by RLS: ${anonError.code} - ${anonError.message}`,
    );

    // Step 3: Regression Check — Authenticated user cannot insert for another user
    console.log(
      '\n[Step 3] Verifying authenticated user cannot create merchant for another user...',
    );
    const { error: foreignInsertError } = await authenticatedClient
      .from('merchants')
      .insert({
        user_id: otherUserId,
        business_name: 'Spoofed Foreign Merchant Profile',
      });

    if (!foreignInsertError || foreignInsertError.code !== '42501') {
      throw new Error(
        `Expected error 42501 for foreign user insert, got: ${foreignInsertError?.code} - ${foreignInsertError?.message}`,
      );
    }
    console.log(
      `[Step 3 PASS] Foreign user profile insert rejected strictly by RLS: ${foreignInsertError.code} - ${foreignInsertError.message}`,
    );

    // Step 4: Live Check — Authenticated user creates their own merchant profile
    console.log(
      '\n[Step 4] Verifying authenticated user creates their own merchant profile...',
    );
    const testBusinessName = 'Meekosam Authoritative Store';
    const { data: createdProfile, error: createError } = await authenticatedClient
      .from('merchants')
      .insert({
        user_id: authenticatedUserId,
        business_name: testBusinessName,
        contact_email: liveAccountEmail,
      })
      .select()
      .single();

    if (createError || !createdProfile) {
      throw new Error(
        `Merchant profile creation failed: ${createError?.code} - ${createError?.message}`,
      );
    }

    if (createdProfile.user_id !== authenticatedUserId) {
      throw new Error(
        `Security mismatch! created user_id (${createdProfile.user_id}) !== session user_id (${authenticatedUserId})`,
      );
    }

    console.log('[Step 4 PASS] Merchant profile created successfully:');
    console.log(` - ID: ${createdProfile.id}`);
    console.log(` - user_id: ${createdProfile.user_id} (strictly matches session)`);
    console.log(` - business_name: ${createdProfile.business_name}`);
    console.log(` - contact_email: ${createdProfile.contact_email}`);

    // Step 5: Regression Check — Existing merchant isolation remains intact
    console.log(
      '\n[Step 5] Verifying tenant isolation: cannot read, update, or delete other merchant...',
    );
    const { data: foreignRead } = await authenticatedClient
      .from('merchants')
      .select('*')
      .eq('user_id', otherUserId);

    if (foreignRead && foreignRead.length > 0) {
      throw new Error(
        'Tenant isolation failure! Authenticated user was able to read another merchant profile.',
      );
    }

    const { data: foreignUpdate } = await authenticatedClient
      .from('merchants')
      .update({ business_name: 'Hacked Store' })
      .eq('user_id', otherUserId)
      .select();

    if (foreignUpdate && foreignUpdate.length > 0) {
      throw new Error(
        'Tenant isolation failure! Authenticated user was able to update another merchant profile.',
      );
    }

    const { data: foreignDelete } = await authenticatedClient
      .from('merchants')
      .delete()
      .eq('user_id', otherUserId)
      .select();

    if (foreignDelete && foreignDelete.length > 0) {
      throw new Error(
        'Tenant isolation failure! Authenticated user was able to delete another merchant profile.',
      );
    }

    console.log(
      '[Step 5 PASS] Tenant isolation confirmed intact: 0 records accessible across foreign tenants.',
    );

    // Step 6: Verify dashboard refresh and persistence
    console.log(
      '\n[Step 6] Re-testing profile query and persistence for authenticated user...',
    );
    const { data: reloadedProfile, error: reloadError } = await authenticatedClient
      .from('merchants')
      .select('*')
      .eq('user_id', authenticatedUserId)
      .maybeSingle();

    if (reloadError || !reloadedProfile) {
      throw new Error(`Failed to reload merchant profile: ${reloadError?.message}`);
    }

    if (reloadedProfile.id !== createdProfile.id) {
      throw new Error('Reloaded profile ID does not match created profile ID');
    }
    console.log(
      `[Step 6 PASS] Merchant profile persisted and verified on reload (Merchant ID: ${reloadedProfile.id})`,
    );

    console.log('\n================================================================');
    console.log('ALL LIVE RLS SECURITY AND FUNCTIONAL CHECKS PASSED (100%)');
    console.log('================================================================');
  } finally {
    // Clean up created test profile to maintain pristine testing state
    await adminClient.from('merchants').delete().eq('user_id', authenticatedUserId);
    console.log('\n[Cleanup] Cleaned up test merchant record from Supabase.');
  }
}

runValidation().catch((err) => {
  console.error('\nValidation failed with error:', err);
  process.exit(1);
});
