import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildApp } from '../app.js';
import { supabaseServer } from '../integrations/supabase/client.js';

describe('Secure Merchant Destination Routes & Tenant Isolation (Task 2)', () => {
  const app = buildApp();

  const merchantAId = 'a0000000-0000-0000-0000-000000000001';
  const merchantBId = 'b0000000-0000-0000-0000-000000000002';
  const nonexistentMerchantId = 'c0000000-0000-0000-0000-000000000003';
  const destinationAId = 'd0000000-0000-0000-0000-000000000001';
  const destinationBId = 'd0000000-0000-0000-0000-000000000002';

  const userAToken = 'user-a-valid-token';
  const userBToken = 'user-b-valid-token';
  const expiredToken = 'expired-token';

  // In-memory mock database store for destinations
  let destinationsStore: Array<{
    id: string;
    merchant_id: string;
    destination_type: 'VPA' | 'URL' | 'ACCOUNT';
    destination_value: string;
    is_active: boolean;
    registered_at: string;
  }> = [];

  beforeEach(() => {
    vi.restoreAllMocks();

    destinationsStore = [
      {
        id: destinationAId,
        merchant_id: merchantAId,
        destination_type: 'VPA',
        destination_value: 'storea@icici',
        is_active: true,
        registered_at: '2026-10-01T10:00:00Z',
      },
      {
        id: destinationBId,
        merchant_id: merchantBId,
        destination_type: 'VPA',
        destination_value: 'storeb@hdfc',
        is_active: true,
        registered_at: '2026-10-01T11:00:00Z',
      },
    ];

    // Mock Supabase Auth verification
    vi.spyOn(supabaseServer.auth, 'getUser').mockImplementation(
      async (token?: string) => {
        if (token === userAToken) {
          return {
            data: {
              user: {
                id: 'user-a-id',
                app_metadata: {},
                user_metadata: {},
                aud: 'authenticated',
                created_at: '2026-10-01T00:00:00Z',
              },
            },
            error: null,
          } as unknown as Awaited<ReturnType<typeof supabaseServer.auth.getUser>>;
        }
        if (token === userBToken) {
          return {
            data: {
              user: {
                id: 'user-b-id',
                app_metadata: {},
                user_metadata: {},
                aud: 'authenticated',
                created_at: '2026-10-01T00:00:00Z',
              },
            },
            error: null,
          } as unknown as Awaited<ReturnType<typeof supabaseServer.auth.getUser>>;
        }
        return {
          data: { user: null },
          error: new Error('Invalid or expired token'),
        } as unknown as Awaited<ReturnType<typeof supabaseServer.auth.getUser>>;
      },
    );

    // Mock Supabase database queries
    vi.spyOn(supabaseServer, 'from').mockImplementation(((table: string) => {
      if (table === 'merchants') {
        return {
          select: () => ({
            eq: (_field: string, val: string) => ({
              maybeSingle: () => {
                if (val === merchantAId) {
                  return Promise.resolve({
                    data: { id: merchantAId, user_id: 'user-a-id' },
                    error: null,
                  });
                }
                if (val === merchantBId) {
                  return Promise.resolve({
                    data: { id: merchantBId, user_id: 'user-b-id' },
                    error: null,
                  });
                }
                return Promise.resolve({ data: null, error: null });
              },
            }),
          }),
        };
      }

      if (table === 'payment_destinations') {
        return {
          select: () => ({
            eq: (_field: string, mId: string) => ({
              order: () => {
                const results = destinationsStore.filter((d) => d.merchant_id === mId);
                return Promise.resolve({ data: results, error: null });
              },
            }),
          }),
          insert: (record: {
            merchant_id: string;
            destination_type: 'VPA' | 'URL' | 'ACCOUNT';
            destination_value: string;
            is_active: boolean;
          }) => {
            const newRecord = {
              id: 'new-dest-' + Math.random().toString(36).substring(2, 9),
              ...record,
              registered_at: new Date().toISOString(),
            };
            destinationsStore.push(newRecord);
            return {
              select: () => ({
                single: () => Promise.resolve({ data: newRecord, error: null }),
              }),
            };
          },
          update: (payload: Record<string, unknown>) => ({
            eq: (_field1: string, idVal: string) => ({
              eq: (_field2: string, mIdVal: string) => ({
                select: () => ({
                  maybeSingle: () => {
                    const idx = destinationsStore.findIndex(
                      (d) => d.id === idVal && d.merchant_id === mIdVal,
                    );
                    if (idx === -1) {
                      return Promise.resolve({ data: null, error: null });
                    }
                    const updated = {
                      ...destinationsStore[idx]!,
                      ...payload,
                    };
                    destinationsStore[idx] = updated;
                    return Promise.resolve({ data: updated, error: null });
                  },
                }),
              }),
            }),
          }),
          delete: () => ({
            eq: (_field1: string, idVal: string) => ({
              eq: (_field2: string, mIdVal: string) => {
                destinationsStore = destinationsStore.filter(
                  (d) => !(d.id === idVal && d.merchant_id === mIdVal),
                );
                return Promise.resolve({ error: null });
              },
            }),
          }),
        };
      }

      return {
        select: () => Promise.resolve({ data: null, error: null }),
      };
    }) as unknown as typeof supabaseServer.from);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Authentication Checks
  describe('Authentication Enforcement', () => {
    it('rejects unauthenticated requests with HTTP 401 E_UNAUTHORIZED', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/merchants/${merchantAId}/destinations`,
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe('E_UNAUTHORIZED');
    });

    it('rejects malformed Authorization header with HTTP 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/merchants/${merchantAId}/destinations`,
        headers: { authorization: 'Basic invalid-creds' },
        body: { destination_type: 'VPA', destination_value: 'test@bank' },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe('E_UNAUTHORIZED');
    });

    it('rejects expired or invalid token with HTTP 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/merchants/${merchantAId}/destinations`,
        headers: { authorization: `Bearer ${expiredToken}` },
        body: { destination_type: 'VPA', destination_value: 'test@bank' },
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe('E_UNAUTHORIZED');
    });
  });

  // 2. Tenant Isolation & Ownership Authorization
  describe('Tenant Isolation & Cross-Tenant Rejection', () => {
    it('rejects User B attempting to read Merchant A destinations with HTTP 403 E_FORBIDDEN', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/merchants/${merchantAId}/destinations`,
        headers: { authorization: `Bearer ${userBToken}` },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe('E_FORBIDDEN');
    });

    it('rejects User B attempting to insert destination into Merchant A with HTTP 403 E_FORBIDDEN', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/merchants/${merchantAId}/destinations`,
        headers: { authorization: `Bearer ${userBToken}` },
        body: { destination_type: 'VPA', destination_value: 'malicious@bank' },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe('E_FORBIDDEN');
      // Verify destination was NOT inserted
      expect(
        destinationsStore.some((d) => d.destination_value === 'malicious@bank'),
      ).toBe(false);
    });

    it('rejects User A attempting to update Merchant B destination with HTTP 403 E_FORBIDDEN', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/merchants/${merchantBId}/destinations/${destinationBId}`,
        headers: { authorization: `Bearer ${userAToken}` },
        body: { destination_value: 'hacked@bank' },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe('E_FORBIDDEN');
      // Destination B remains unchanged
      const destB = destinationsStore.find((d) => d.id === destinationBId);
      expect(destB?.destination_value).toBe('storeb@hdfc');
    });

    it('rejects User A attempting to delete Merchant B destination with HTTP 403 E_FORBIDDEN', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/merchants/${merchantBId}/destinations/${destinationBId}`,
        headers: { authorization: `Bearer ${userAToken}` },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().error.code).toBe('E_FORBIDDEN');
      // Destination B was not deleted
      expect(destinationsStore.some((d) => d.id === destinationBId)).toBe(true);
    });

    it('returns 404 E_MERCHANT_NOT_FOUND when merchant profile does not exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/merchants/${nonexistentMerchantId}/destinations`,
        headers: { authorization: `Bearer ${userAToken}` },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('E_MERCHANT_NOT_FOUND');
    });
  });

  // 3. Payload Validation & Normalization
  describe('Payload Validation & Normalization', () => {
    it('rejects destination with missing destination_type with HTTP 400 E_INVALID_PAYLOAD', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/merchants/${merchantAId}/destinations`,
        headers: { authorization: `Bearer ${userAToken}` },
        body: { destination_value: 'valid@icici' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('E_INVALID_PAYLOAD');
    });

    it('rejects invalid destination_type with HTTP 400 E_INVALID_PAYLOAD', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/merchants/${merchantAId}/destinations`,
        headers: { authorization: `Bearer ${userAToken}` },
        body: {
          destination_type: 'BITCOIN',
          destination_value: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('E_INVALID_PAYLOAD');
    });

    it('rejects malformed VPA format (missing @) with HTTP 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/merchants/${merchantAId}/destinations`,
        headers: { authorization: `Bearer ${userAToken}` },
        body: { destination_type: 'VPA', destination_value: 'invalid-vpa-without-at' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('E_INVALID_PAYLOAD');
      expect(res.json().error.message).toContain('Invalid Virtual Payment Address');
    });

    it('rejects invalid URL destination with HTTP 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/merchants/${merchantAId}/destinations`,
        headers: { authorization: `Bearer ${userAToken}` },
        body: { destination_type: 'URL', destination_value: 'not-a-valid-url' },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('E_INVALID_PAYLOAD');
    });

    it('rejects empty update payload with HTTP 400', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/merchants/${merchantAId}/destinations/${destinationAId}`,
        headers: { authorization: `Bearer ${userAToken}` },
        body: {},
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('E_INVALID_PAYLOAD');
    });
  });

  // 4. Valid Mutations by Owning Merchant
  describe('Valid Mutations by Owning Merchant', () => {
    it('creates a new VPA destination and normalizes value to lowercase', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/merchants/${merchantAId}/destinations`,
        headers: { authorization: `Bearer ${userAToken}` },
        body: {
          destination_type: 'VPA',
          destination_value: '  NewStore.Branch@ICICI  ',
          is_active: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.destination).toBeDefined();
      expect(body.destination.merchant_id).toBe(merchantAId);
      expect(body.destination.destination_type).toBe('VPA');
      expect(body.destination.destination_value).toBe('newstore.branch@icici');
      expect(body.destination.is_active).toBe(true);
    });

    it('creates a new URL destination with valid HTTPS URI', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/merchants/${merchantAId}/destinations`,
        headers: { authorization: `Bearer ${userAToken}` },
        body: {
          destination_type: 'URL',
          destination_value: 'https://pay.example.com/checkout',
          is_active: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.destination.destination_value).toBe('https://pay.example.com/checkout');
    });

    it('updates destination active status and value', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/merchants/${merchantAId}/destinations/${destinationAId}`,
        headers: { authorization: `Bearer ${userAToken}` },
        body: {
          destination_value: 'updatedstore@icici',
          is_active: false,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.destination.destination_value).toBe('updatedstore@icici');
      expect(body.destination.is_active).toBe(false);
    });

    it('lists destinations belonging to the owning merchant', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/merchants/${merchantAId}/destinations`,
        headers: { authorization: `Bearer ${userAToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(Array.isArray(body.destinations)).toBe(true);
      expect(body.destinations.length).toBeGreaterThanOrEqual(1);
      expect(body.destinations[0].merchant_id).toBe(merchantAId);
    });

    it('deletes destination belonging to the owning merchant', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/merchants/${merchantAId}/destinations/${destinationAId}`,
        headers: { authorization: `Bearer ${userAToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);

      // Verify destination is no longer in store
      expect(destinationsStore.some((d) => d.id === destinationAId)).toBe(false);
    });

    it('returns 404 when updating non-existent destination ID', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/api/v1/merchants/${merchantAId}/destinations/00000000-0000-0000-0000-999999999999`,
        headers: { authorization: `Bearer ${userAToken}` },
        body: { is_active: false },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('E_DESTINATION_NOT_FOUND');
    });
  });

  describe('Static Migration 002 RLS Policy & Storage Safety Checks', () => {
    it('verifies verification_logs has no client INSERT policy and drops legacy insert policies', () => {
      const migrationPath = path.resolve(
        process.cwd(),
        '../migrations/002_destinations_and_storage_rls.sql',
      );
      const content = fs.readFileSync(migrationPath, 'utf-8');

      // Must explicitly drop both the production INSERT policy and legacy draft policy
      expect(content).toContain(
        'DROP POLICY IF EXISTS "verification_logs_insert_own" ON public.verification_logs;',
      );
      expect(content).toContain(
        'DROP POLICY IF EXISTS "Merchants can insert own verification logs" ON public.verification_logs;',
      );

      // Must preserve merchant-owned SELECT policy on verification_logs
      expect(content).toContain(
        'CREATE POLICY "Merchants can view own verification logs"',
      );

      // Must NOT contain any CREATE POLICY ... FOR INSERT on verification_logs
      const hasVerificationInsert =
        /CREATE\s+POLICY\s+["']?[^"'\n]+["']?\s+ON\s+public\.verification_logs\s+FOR\s+INSERT/i.test(
          content,
        );
      expect(hasVerificationInsert).toBe(false);

      // Must NOT contain merchant_id IS NULL in verification_logs policy
      expect(content).not.toContain('merchant_id IS NULL');
    });

    it('verifies storage.objects enforces backend-only access by removing client-facing policies and dropping legacy aliases', () => {
      const migrationPath = path.resolve(
        process.cwd(),
        '../migrations/002_destinations_and_storage_rls.sql',
      );
      const content = fs.readFileSync(migrationPath, 'utf-8');

      // Client-facing storage policies must be dropped
      expect(content).toContain(
        'DROP POLICY IF EXISTS "Merchants can read own reference QR storage objects" ON storage.objects;',
      );
      expect(content).toContain(
        'DROP POLICY IF EXISTS "Merchants can upload own reference QR storage objects" ON storage.objects;',
      );
      expect(content).toContain(
        'DROP POLICY IF EXISTS "Merchants can update own reference QR storage objects" ON storage.objects;',
      );
      expect(content).toContain(
        'DROP POLICY IF EXISTS "Merchants can delete own reference QR storage objects" ON storage.objects;',
      );

      // Legacy and alias storage policies must also be dropped
      expect(content).toContain(
        'DROP POLICY IF EXISTS "Users can read own reference QR storage objects" ON storage.objects;',
      );
      expect(content).toContain(
        'DROP POLICY IF EXISTS "reference_qrs_storage_select" ON storage.objects;',
      );

      // Must NOT contain any CREATE POLICY on storage.objects (storage is controlled via backend service-role)
      const hasStorageCreatePolicy =
        /CREATE\s+POLICY\s+["']?[^"'\n]+["']?\s+ON\s+storage\.objects/i.test(content);
      expect(hasStorageCreatePolicy).toBe(false);

      // Raw unvalidated cast without CASE must NOT be present
      const rawUncheckedCast =
        /bucket_id\s*=\s*'reference-qrs'\s*AND\s*\(\s*\(storage\.foldername\(name\)\)\[1\]::uuid/i;
      expect(rawUncheckedCast.test(content)).toBe(false);
    });
  });
});
