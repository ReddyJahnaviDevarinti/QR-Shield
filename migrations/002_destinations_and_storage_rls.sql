-- Migration: 002_destinations_and_storage_rls.sql
-- Description: Strict Row-Level Security (RLS) policies for payment_destinations,
--              reference_qrs, verification_logs, and storage.objects (reference-qrs bucket).
--
-- Security Model & Ownership Hierarchy:
--   - Tenant isolation: All secondary resources belong to a merchant (merchant_id FK).
--   - Merchants belong to an authenticated user (merchants.user_id FK references auth.users.id).
--   - Tenant ownership check:
--       merchant_id IN (SELECT m.id FROM public.merchants m WHERE m.user_id = auth.uid())
--   - Storage ownership check for 'reference-qrs' private bucket:
--       Top-level folder name must be a valid canonical UUID matching merchant_id (e.g. "<merchant_id>/filename.png"):
--       CASE WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
--       THEN (storage.foldername(name))[1]::uuid IN (SELECT m.id FROM public.merchants m WHERE m.user_id = auth.uid())
--       ELSE false END
--   - Least Privilege & Immutability:
--       * payment_destinations: SELECT, INSERT, UPDATE, DELETE strictly restricted to merchant owner.
--       * reference_qrs: SELECT, INSERT, UPDATE, DELETE strictly restricted to merchant owner.
--       * verification_logs: SELECT restricted to merchant owner.
--         INSERT, UPDATE, and DELETE are NOT granted to authenticated clients to ensure tamper-proof audit trail.
--       * storage.objects ('reference-qrs'): SELECT, INSERT, UPDATE, DELETE restricted to merchant owner.
--   - Avoid recursion: Direct subqueries against public.merchants without self-referential triggers.
--   - Review only: This migration must NOT be applied to production automatically.

--------------------------------------------------------------------------------
-- 1. PAYMENT_DESTINATIONS TABLE RLS
--------------------------------------------------------------------------------

ALTER TABLE public.payment_destinations ENABLE ROW LEVEL SECURITY;

-- 1.1 SELECT: Authenticated users can view payment destinations for their own merchants
DROP POLICY IF EXISTS "Merchants can view own payment destinations" ON public.payment_destinations;
CREATE POLICY "Merchants can view own payment destinations"
ON public.payment_destinations
FOR SELECT
TO authenticated
USING (
  merchant_id IN (
    SELECT m.id FROM public.merchants m WHERE m.user_id = auth.uid()
  )
);

-- 1.2 INSERT: Authenticated users can insert payment destinations only for their own merchants
DROP POLICY IF EXISTS "Merchants can insert own payment destinations" ON public.payment_destinations;
CREATE POLICY "Merchants can insert own payment destinations"
ON public.payment_destinations
FOR INSERT
TO authenticated
WITH CHECK (
  merchant_id IN (
    SELECT m.id FROM public.merchants m WHERE m.user_id = auth.uid()
  )
);

-- 1.3 UPDATE: Authenticated users can update payment destinations only for their own merchants
DROP POLICY IF EXISTS "Merchants can update own payment destinations" ON public.payment_destinations;
CREATE POLICY "Merchants can update own payment destinations"
ON public.payment_destinations
FOR UPDATE
TO authenticated
USING (
  merchant_id IN (
    SELECT m.id FROM public.merchants m WHERE m.user_id = auth.uid()
  )
)
WITH CHECK (
  merchant_id IN (
    SELECT m.id FROM public.merchants m WHERE m.user_id = auth.uid()
  )
);

-- 1.4 DELETE: Authenticated users can delete payment destinations only for their own merchants
DROP POLICY IF EXISTS "Merchants can delete own payment destinations" ON public.payment_destinations;
CREATE POLICY "Merchants can delete own payment destinations"
ON public.payment_destinations
FOR DELETE
TO authenticated
USING (
  merchant_id IN (
    SELECT m.id FROM public.merchants m WHERE m.user_id = auth.uid()
  )
);

--------------------------------------------------------------------------------
-- 2. REFERENCE_QRS TABLE RLS
--------------------------------------------------------------------------------

ALTER TABLE public.reference_qrs ENABLE ROW LEVEL SECURITY;

-- 2.1 SELECT: Authenticated users can view reference QRs for their own merchants
DROP POLICY IF EXISTS "Merchants can view own reference QRs" ON public.reference_qrs;
CREATE POLICY "Merchants can view own reference QRs"
ON public.reference_qrs
FOR SELECT
TO authenticated
USING (
  merchant_id IN (
    SELECT m.id FROM public.merchants m WHERE m.user_id = auth.uid()
  )
);

-- 2.2 INSERT: Authenticated users can insert reference QRs only for their own merchants
DROP POLICY IF EXISTS "Merchants can insert own reference QRs" ON public.reference_qrs;
CREATE POLICY "Merchants can insert own reference QRs"
ON public.reference_qrs
FOR INSERT
TO authenticated
WITH CHECK (
  merchant_id IN (
    SELECT m.id FROM public.merchants m WHERE m.user_id = auth.uid()
  )
);

-- 2.3 UPDATE: Authenticated users can update reference QRs only for their own merchants
DROP POLICY IF EXISTS "Merchants can update own reference QRs" ON public.reference_qrs;
CREATE POLICY "Merchants can update own reference QRs"
ON public.reference_qrs
FOR UPDATE
TO authenticated
USING (
  merchant_id IN (
    SELECT m.id FROM public.merchants m WHERE m.user_id = auth.uid()
  )
)
WITH CHECK (
  merchant_id IN (
    SELECT m.id FROM public.merchants m WHERE m.user_id = auth.uid()
  )
);

-- 2.4 DELETE: Authenticated users can delete reference QRs only for their own merchants
DROP POLICY IF EXISTS "Merchants can delete own reference QRs" ON public.reference_qrs;
CREATE POLICY "Merchants can delete own reference QRs"
ON public.reference_qrs
FOR DELETE
TO authenticated
USING (
  merchant_id IN (
    SELECT m.id FROM public.merchants m WHERE m.user_id = auth.uid()
  )
);

--------------------------------------------------------------------------------
-- 3. VERIFICATION_LOGS TABLE RLS
--------------------------------------------------------------------------------

ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;

-- 3.1 SELECT: Authenticated users can view verification logs targeting their own merchants
DROP POLICY IF EXISTS "Merchants can view own verification logs" ON public.verification_logs;
CREATE POLICY "Merchants can view own verification logs"
ON public.verification_logs
FOR SELECT
TO authenticated
USING (
  merchant_id IN (
    SELECT m.id FROM public.merchants m WHERE m.user_id = auth.uid()
  )
);

-- 3.2 Immutability and Audit Integrity:
-- Drop any legacy or existing client-facing INSERT policy on verification_logs.
-- Safely and idempotently drops both the production policy ('verification_logs_insert_own')
-- and legacy policy alias ('Merchants can insert own verification logs').
DROP POLICY IF EXISTS "verification_logs_insert_own" ON public.verification_logs;
DROP POLICY IF EXISTS "Merchants can insert own verification logs" ON public.verification_logs;

-- Note: INSERT, UPDATE, and DELETE policies are intentionally omitted for authenticated clients.
-- Verification logs are strictly system-generated audit records created via the backend
-- service-role (bypassing RLS). Authenticated clients may only SELECT logs for owned merchants.
-- This guarantees tamper-proof audit trails and prevents arbitrary log injection.

--------------------------------------------------------------------------------
-- 4. STORAGE OBJECTS (reference-qrs private bucket) RLS
--------------------------------------------------------------------------------

-- 4.1 SELECT: Authenticated users can only read reference QR objects belonging to their merchant folder
DROP POLICY IF EXISTS "Merchants can read own reference QR storage objects" ON storage.objects;
CREATE POLICY "Merchants can read own reference QR storage objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'reference-qrs'
  AND CASE
    WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN (storage.foldername(name))[1]::uuid IN (
      SELECT m.id FROM public.merchants m WHERE m.user_id = auth.uid()
    )
    ELSE false
  END
);

-- 4.2 INSERT: Authenticated users can only upload reference QR objects to their merchant folder
DROP POLICY IF EXISTS "Merchants can upload own reference QR storage objects" ON storage.objects;
CREATE POLICY "Merchants can upload own reference QR storage objects"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reference-qrs'
  AND CASE
    WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN (storage.foldername(name))[1]::uuid IN (
      SELECT m.id FROM public.merchants m WHERE m.user_id = auth.uid()
    )
    ELSE false
  END
);

-- 4.3 UPDATE: Authenticated users can only update reference QR objects in their merchant folder
DROP POLICY IF EXISTS "Merchants can update own reference QR storage objects" ON storage.objects;
CREATE POLICY "Merchants can update own reference QR storage objects"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'reference-qrs'
  AND CASE
    WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN (storage.foldername(name))[1]::uuid IN (
      SELECT m.id FROM public.merchants m WHERE m.user_id = auth.uid()
    )
    ELSE false
  END
)
WITH CHECK (
  bucket_id = 'reference-qrs'
  AND CASE
    WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN (storage.foldername(name))[1]::uuid IN (
      SELECT m.id FROM public.merchants m WHERE m.user_id = auth.uid()
    )
    ELSE false
  END
);

-- 4.4 DELETE: Authenticated users can only delete reference QR objects in their merchant folder
DROP POLICY IF EXISTS "Merchants can delete own reference QR storage objects" ON storage.objects;
CREATE POLICY "Merchants can delete own reference QR storage objects"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'reference-qrs'
  AND CASE
    WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN (storage.foldername(name))[1]::uuid IN (
      SELECT m.id FROM public.merchants m WHERE m.user_id = auth.uid()
    )
    ELSE false
  END
);
