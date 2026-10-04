import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseServer } from '../supabase/client.js';
import { RegistryQueryFailedError } from './errors.js';
import { ReferenceQrRecord, TrustedRegistryDestination } from './types.js';

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

/**
 * Retrieves the latest active reference QR record registered for a merchant.
 *
 * @param merchantId - Authoritative merchant identifier.
 * @param client - Supabase client instance.
 * @returns Promise resolving to ReferenceQrRecord or null if not registered.
 */
export async function findActiveReferenceQrForMerchant(
  merchantId: string,
  client: SupabaseClient = supabaseServer,
): Promise<ReferenceQrRecord | null> {
  if (!merchantId || merchantId.trim().length === 0) {
    return null;
  }

  const { data, error } = await client
    .from('reference_qrs')
    .select(
      'id, merchant_id, storage_path, payload_hash, raw_payload, finder_coordinates, uploaded_at',
    )
    .eq('merchant_id', merchantId.trim())
    .order('uploaded_at', { ascending: false })
    .limit(1);

  if (error) {
    throw new RegistryQueryFailedError(
      `Failed to retrieve reference QR record: ${error.message}`,
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  const row = data[0] as unknown as {
    id: string;
    merchant_id: string;
    storage_path: string;
    payload_hash: string;
    raw_payload: string;
    finder_coordinates?: unknown;
    uploaded_at: string;
  };

  return {
    id: row.id,
    merchantId: row.merchant_id,
    storagePath: row.storage_path,
    payloadHash: row.payload_hash,
    rawPayload: row.raw_payload,
    finderCoordinates: row.finder_coordinates,
    uploadedAt: row.uploaded_at,
  };
}

/**
 * Downloads a private reference QR image buffer from Supabase Storage.
 *
 * @param storagePath - Relative path inside the private reference-qrs bucket.
 * @param client - Supabase client instance.
 * @returns Promise resolving to in-memory Buffer or null if missing.
 */
export async function downloadReferenceQrImage(
  storagePath: string,
  client: SupabaseClient = supabaseServer,
): Promise<Buffer | null> {
  if (!storagePath || storagePath.trim().length === 0) {
    return null;
  }

  try {
    const { data, error } = await client.storage
      .from('reference-qrs')
      .download(storagePath.trim());

    if (error || !data) {
      return null;
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

/**
 * Saves a new reference QR metadata record into reference_qrs.
 *
 * @param params - Registration parameters matching the database schema.
 * @param client - Supabase client instance.
 * @returns Promise resolving to created ReferenceQrRecord.
 */
export async function saveReferenceQr(
  params: {
    merchantId: string;
    storagePath: string;
    payloadHash: string;
    rawPayload: string;
    finderCoordinates?: unknown;
  },
  client: SupabaseClient = supabaseServer,
): Promise<ReferenceQrRecord> {
  const { merchantId, storagePath, payloadHash, rawPayload, finderCoordinates } = params;

  const insertPayload: Record<string, unknown> = {
    merchant_id: merchantId.trim(),
    storage_path: storagePath.trim(),
    payload_hash: payloadHash.trim(),
    raw_payload: rawPayload.trim(),
  };

  if (finderCoordinates !== undefined) {
    insertPayload.finder_coordinates = finderCoordinates;
  }

  const { data, error } = await client
    .from('reference_qrs')
    .insert(insertPayload)
    .select(
      'id, merchant_id, storage_path, payload_hash, raw_payload, finder_coordinates, uploaded_at',
    )
    .single();

  if (error || !data) {
    throw new RegistryQueryFailedError(
      `Failed to save reference QR record: ${error?.message ?? 'Unknown database error'}`,
    );
  }

  const row = data as unknown as {
    id: string;
    merchant_id: string;
    storage_path: string;
    payload_hash: string;
    raw_payload: string;
    finder_coordinates?: unknown;
    uploaded_at: string;
  };

  return {
    id: row.id,
    merchantId: row.merchant_id,
    storagePath: row.storage_path,
    payloadHash: row.payload_hash,
    rawPayload: row.raw_payload,
    finderCoordinates: row.finder_coordinates,
    uploadedAt: row.uploaded_at,
  };
}

/**
 * Removes all reference QR records and associated private storage files for a merchant.
 *
 * @param merchantId - Authoritative merchant identifier.
 * @param client - Supabase client instance.
 * @returns Promise resolving to deletion summary.
 */
export async function deleteReferenceQrForMerchant(
  merchantId: string,
  client: SupabaseClient = supabaseServer,
): Promise<{ deletedRecords: number; storagePathsRemoved: string[] }> {
  if (!merchantId || merchantId.trim().length === 0) {
    return { deletedRecords: 0, storagePathsRemoved: [] };
  }

  const trimmedId = merchantId.trim();

  // 1. Find existing records to identify storage paths to remove
  const { data: existingRecords } = await client
    .from('reference_qrs')
    .select('id, storage_path')
    .eq('merchant_id', trimmedId);

  const storagePaths = (
    (existingRecords as Array<{ id: string; storage_path: string }> | null) ?? []
  )
    .map((r) => r.storage_path)
    .filter((p: unknown): p is string => typeof p === 'string' && p.length > 0);

  // 2. Delete database records
  const { error: dbError } = await client
    .from('reference_qrs')
    .delete()
    .eq('merchant_id', trimmedId);

  if (dbError) {
    throw new RegistryQueryFailedError(
      `Failed to delete reference QR records: ${dbError.message}`,
    );
  }

  // 3. Delete files from storage
  if (storagePaths.length > 0) {
    try {
      await client.storage.from('reference-qrs').remove(storagePaths);
    } catch {
      // Best-effort storage removal
    }
  }

  return {
    deletedRecords: existingRecords?.length ?? 0,
    storagePathsRemoved: storagePaths,
  };
}

/**
 * Generates a short-lived private signed URL for previewing the reference QR image in the dashboard.
 *
 * @param storagePath - Storage path inside reference-qrs.
 * @param expiresInSeconds - Token validity in seconds (default: 300 / 5 minutes).
 * @param client - Supabase client instance.
 * @returns Promise resolving to signed URL string or null.
 */
export async function createReferenceQrPreviewUrl(
  storagePath: string,
  expiresInSeconds = 300,
  client: SupabaseClient = supabaseServer,
): Promise<string | null> {
  if (!storagePath || storagePath.trim().length === 0) {
    return null;
  }

  try {
    const { data, error } = await client.storage
      .from('reference-qrs')
      .createSignedUrl(storagePath.trim(), expiresInSeconds);

    if (error || !data) {
      return null;
    }

    return data.signedUrl;
  } catch {
    return null;
  }
}
