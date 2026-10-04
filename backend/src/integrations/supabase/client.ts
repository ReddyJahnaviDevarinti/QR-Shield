import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env.js';

/**
 * Creates a server-only Supabase client instance configured without
 * browser session storage or automatic token refreshes.
 *
 * @param url - Supabase project URL.
 * @param secretKey - Supabase server secret key.
 * @returns Configured SupabaseClient instance.
 */
export function createSupabaseServerClient(
  url = env.SUPABASE_URL,
  secretKey = env.SUPABASE_SECRET_KEY,
): SupabaseClient {
  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Singleton server-side Supabase client instance.
 * Bypasses RLS using the backend SUPABASE_SECRET_KEY.
 * Must be accessed only via narrow application-level adapters.
 */
export const supabaseServer: SupabaseClient = createSupabaseServerClient();
