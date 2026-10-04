import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from '../supabase/client.js';
import { RegistryQueryFailedError } from './errors.js';
import { TrustedRegistryDestination } from './types.js';

interface PaymentDestinationRow {
  merchant_id: string;
  destination_type: 'VPA' | 'URL' | 'ACCOUNT';
  destination_value: string;
  is_active: boolean;
}

/**
 * Normalizes a payment destination for deterministic exact comparison.
 * Keeps rules aligned with the verification engine.
 */
function normalizeDestinationForLookup(destination: string, type: 'VPA' | 'URL'): string {
  const trimmed = destination.trim();
  if (type === 'VPA') {
    return trimmed.toLowerCase();
  }
  return trimmed;
}

/**
 * Retrieves active trusted destination registrations matching the scanned destination.
 *
 * Architectural & Security Rules:
 * - Read-only query: performs no inserts, updates, deletes, or mutations.
 * - Narrow projection: selects only merchant_id, destination_type, destination_value, is_active.
 * - Does not load the entire merchant registry into memory.
 * - Uses exact normalized matching; no fuzzy matching or similarity scoring.
 * - Does not query external banking networks or resolve DNS.
 *
 * @param scannedDestination - The raw or parsed destination string to verify.
 * @param destinationType - Expected destination type ('VPA' or 'URL').
 * @param client - Supabase client instance (defaults to supabaseServer).
 * @returns Promise resolving to matching TrustedRegistryDestination records.
 * @throws RegistryQueryFailedError on database query failure.
 */
export async function findActiveTrustedDestinations(
  scannedDestination: string,
  destinationType: 'VPA' | 'URL',
  client: SupabaseClient = supabaseServer,
): Promise<TrustedRegistryDestination[]> {
  if (!scannedDestination || scannedDestination.trim().length === 0) {
    return [];
  }

  const normalizedScanned = normalizeDestinationForLookup(
    scannedDestination,
    destinationType,
  );

  const { data, error } = await client
    .from('payment_destinations')
    .select('merchant_id, destination_type, destination_value, is_active')
    .eq('is_active', true)
    .eq('destination_type', destinationType)
    .ilike('destination_value', normalizedScanned);

  if (error) {
    throw new RegistryQueryFailedError(
      'Failed to retrieve trusted destination records from database.',
    );
  }

  if (!data || data.length === 0) {
    return [];
  }

  const rows = data as unknown as PaymentDestinationRow[];
  const matchingDestinations: TrustedRegistryDestination[] = [];

  for (const row of rows) {
    if (!row.is_active || row.destination_type !== destinationType) {
      continue;
    }

    const normalizedRowValue = normalizeDestinationForLookup(
      row.destination_value,
      destinationType,
    );

    if (normalizedRowValue === normalizedScanned) {
      matchingDestinations.push({
        merchantId: row.merchant_id,
        destinationType: row.destination_type,
        destinationValue: row.destination_value,
        isActive: row.is_active,
      });
    }
  }

  return matchingDestinations;
}

/**
 * Retrieves active trusted destination registrations for a specific merchant.
 *
 * Architectural & Security Rules:
 * - Read-only query: performs no inserts, updates, deletes, or mutations.
 * - Narrow projection: selects only merchant_id, destination_type, destination_value, is_active.
 * - Filters strictly by merchant_id, is_active = true, and destination_type.
 * - Returns only merchantId, destinationType, destinationValue, isActive.
 * - No contact data, registration numbers, or storage access.
 *
 * @param merchantId - The merchant identifier to query.
 * @param destinationType - Expected destination type ('VPA' or 'URL').
 * @param client - Supabase client instance (defaults to supabaseServer).
 * @returns Promise resolving to active TrustedRegistryDestination records for this merchant.
 * @throws RegistryQueryFailedError on database query failure.
 */
export async function findActiveTrustedDestinationsForMerchant(
  merchantId: string,
  destinationType: 'VPA' | 'URL',
  client: SupabaseClient = supabaseServer,
): Promise<TrustedRegistryDestination[]> {
  if (!merchantId || merchantId.trim().length === 0) {
    return [];
  }

  const { data, error } = await client
    .from('payment_destinations')
    .select('merchant_id, destination_type, destination_value, is_active')
    .eq('merchant_id', merchantId.trim())
    .eq('is_active', true)
    .eq('destination_type', destinationType);

  if (error) {
    throw new RegistryQueryFailedError(
      'Failed to retrieve trusted destination records from database.',
    );
  }

  if (!data || data.length === 0) {
    return [];
  }

  const rows = data as unknown as PaymentDestinationRow[];
  const matchingDestinations: TrustedRegistryDestination[] = [];

  for (const row of rows) {
    if (!row.is_active || row.destination_type !== destinationType) {
      continue;
    }

    matchingDestinations.push({
      merchantId: row.merchant_id,
      destinationType: row.destination_type,
      destinationValue: row.destination_value,
      isActive: row.is_active,
    });
  }

  return matchingDestinations;
}

/**
 * Verifies Supabase database reachability against the payment_destinations table.
 *
 * Safety Guarantees:
 * - Read-only `LIMIT 1` query.
 * - Never mutates data or creates test rows.
 * - Zero rows returned is considered successful connectivity.
 * - Designed for startup diagnostics, not per-request execution.
 *
 * @param client - Supabase client instance.
 * @returns Promise resolving to true if connection succeeded, false otherwise.
 */
export async function checkRegistryConnection(
  client: SupabaseClient = supabaseServer,
): Promise<boolean> {
  try {
    const { error } = await client.from('payment_destinations').select('id').limit(1);

    return !error;
  } catch {
    return false;
  }
}
