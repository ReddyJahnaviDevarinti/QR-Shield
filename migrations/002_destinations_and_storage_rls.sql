-- Migration: 002_destinations_and_storage_rls.sql
-- Description: Strict Row-Level Security (RLS) policies for payment_destinations,
--              reference_qrs, verification_logs, and storage.objects lockdown.
--
-- Security Model & Ownership Hierarchy:
--   - Tenant isolation: All secondary resources belong to a merchant (merchant_id FK).
--   - Merchants belong to an authenticated user (merchants.user_id FK references auth.users.id).
--   - Tenant ownership check:
--       merchant_id IN (SELECT m.id FROM public.merchants m WHERE m.user_id = auth.uid())
--   - Least Privilege & Immutability:
--       * payment_destinations: SELECT, INSERT, UPDATE, DELETE strictly restricted to merchant owner.
--       * reference_qrs: SELECT, INSERT, UPDATE, DELETE strictly restricted to merchant owner.
--       * verification_logs: SELECT restricted to merchant owner.
--         INSERT, UPDATE, and DELETE are strictly disallowed for clients to guarantee tamper-proof audit trails.
--       * storage.objects ('reference-qrs'): Direct client access is completely removed and disallowed.
--         All storage operations must remain controlled by the backend using service-role credentials (BYPASSRLS)
--         and existing application-level ownership and validation checks.
--   - Supabase Policy Combination Defense:
--       PostgreSQL evaluates multiple permissive policies for the same action with OR.
--       To prevent accidental broadening of access from duplicate or conflicting policies,
--       all canonical policies and legacy aliases are dropped idempotently before creation.
--   - Avoid recursion: Direct subqueries against public.merchants without self-referential triggers.
--   - Review only: This migration must NOT be applied to production automatically.

--------------------------------------------------------------------------------
-- 1. PAYMENT_DESTINATIONS TABLE RLS
--------------------------------------------------------------------------------

ALTER TABLE public.payment_destinations ENABLE ROW LEVEL SECURITY;

-- 1.1 SELECT: Authenticated users can view payment destinations for their own merchants
DROP POLICY IF EXISTS "Merchants can view own payment destinations" ON public.payment_destinations;
DROP POLICY IF EXISTS "Users can view own payment destinations" ON public.payment_destinations;
DROP POLICY IF EXISTS "payment_destinations_select_own" ON public.payment_destinations;

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
DROP POLICY IF EXISTS "Users can insert own payment destinations" ON public.payment_destinations;
DROP POLICY IF EXISTS "payment_destinations_insert_own" ON public.payment_destinations;

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
DROP POLICY IF EXISTS "Users can update own payment destinations" ON public.payment_destinations;
DROP POLICY IF EXISTS "payment_destinations_update_own" ON public.payment_destinations;

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
DROP POLICY IF EXISTS "Users can delete own payment destinations" ON public.payment_destinations;
DROP POLICY IF EXISTS "payment_destinations_delete_own" ON public.payment_destinations;

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
DROP POLICY IF EXISTS "Users can view own reference QRs" ON public.reference_qrs;
DROP POLICY IF EXISTS "reference_qrs_select_own" ON public.reference_qrs;

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
DROP POLICY IF EXISTS "Users can insert own reference QRs" ON public.reference_qrs;
DROP POLICY IF EXISTS "reference_qrs_insert_own" ON public.reference_qrs;

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
DROP POLICY IF EXISTS "Users can update own reference QRs" ON public.reference_qrs;
DROP POLICY IF EXISTS "reference_qrs_update_own" ON public.reference_qrs;

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
DROP POLICY IF EXISTS "Users can delete own reference QRs" ON public.reference_qrs;
DROP POLICY IF EXISTS "reference_qrs_delete_own" ON public.reference_qrs;

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
DROP POLICY IF EXISTS "Users can view own verification logs" ON public.verification_logs;
DROP POLICY IF EXISTS "verification_logs_select_own" ON public.verification_logs;

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
-- Drop any legacy, draft, or conflicting mutation policies on verification_logs.
-- Supabase policies combine permissively with OR; dropping all mutation policies
-- guarantees that no client-facing INSERT, UPDATE, or DELETE is permitted.
DROP POLICY IF EXISTS "verification_logs_insert_own" ON public.verification_logs;
DROP POLICY IF EXISTS "Merchants can insert own verification logs" ON public.verification_logs;
DROP POLICY IF EXISTS "Users can insert own verification logs" ON public.verification_logs;
DROP POLICY IF EXISTS "verification_logs_update_own" ON public.verification_logs;
DROP POLICY IF EXISTS "Merchants can update own verification logs" ON public.verification_logs;
DROP POLICY IF EXISTS "Users can update own verification logs" ON public.verification_logs;
DROP POLICY IF EXISTS "verification_logs_delete_own" ON public.verification_logs;
DROP POLICY IF EXISTS "Merchants can delete own verification logs" ON public.verification_logs;
DROP POLICY IF EXISTS "Users can delete own verification logs" ON public.verification_logs;

-- Note: INSERT, UPDATE, and DELETE policies are strictly and intentionally omitted for clients.
-- Verification logs are tamper-proof audit records generated exclusively by the QRShield backend
-- service-role (which bypasses RLS via BYPASSRLS). Clients may only SELECT logs for their owned merchants.

--------------------------------------------------------------------------------
-- 4. STORAGE OBJECTS (reference-qrs private bucket) LOCKDOWN
--------------------------------------------------------------------------------
-- Security Architecture:
-- Storage operations for 'reference-qrs' are strictly controlled by the backend
-- using its service-role credentials and existing ownership checks.
-- Direct client-facing storage policies are explicitly removed to prevent unauthorized
-- direct uploads, updates, deletes, or reads that bypass backend validation.
--
-- Under Supabase Storage RLS (default deny), omitting policies for authenticated and anon
-- completely locks down direct client access. The backend continues to manage storage
-- via service-role credentials (bypassing RLS).

DROP POLICY IF EXISTS "Merchants can read own reference QR storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Merchants can upload own reference QR storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Merchants can update own reference QR storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Merchants can delete own reference QR storage objects" ON storage.objects;

-- Also drop any legacy or alternative policy aliases on storage.objects:
DROP POLICY IF EXISTS "Users can read own reference QR storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own reference QR storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own reference QR storage objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own reference QR storage objects" ON storage.objects;
DROP POLICY IF EXISTS "reference_qrs_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "reference_qrs_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "reference_qrs_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "reference_qrs_storage_delete" ON storage.objects;
