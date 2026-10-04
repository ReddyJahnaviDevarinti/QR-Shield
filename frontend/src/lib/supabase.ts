import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: VITE_SUPABASE_URL');
}

if (!supabasePublishableKey) {
  throw new Error('Missing environment variable: VITE_SUPABASE_PUBLISHABLE_KEY');
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);

/**
 * Safe, read-only connection check respecting RLS.
 * Executes a head request on the existing 'merchants' table without modifying or creating data.
 */
export async function checkSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { error } = await supabase
      .from('merchants')
      .select('id', { count: 'exact', head: true });

    if (error) {
      return {
        success: false,
        message: error.message,
      };
    }

    return {
      success: true,
      message: 'Supabase client connected and reachable.',
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error
          ? err.message
          : 'Unknown error during connection verification.',
    };
  }
}
