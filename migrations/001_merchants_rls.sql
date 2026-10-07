-- Migration: 001_merchants_rls.sql
-- Description: Strict Row-Level Security (RLS) policies for merchants table.
-- Security Model:
--   - Tenant isolation: auth.uid() = user_id
--   - DO NOT make merchants publicly writable
--   - DO NOT use permissive policies like true
--   - Zero service-role leakage to frontend

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

-- 1. SELECT policy: authenticated users can only view their own merchant profile
DROP POLICY IF EXISTS "Users can view own merchant" ON public.merchants;
CREATE POLICY "Users can view own merchant"
ON public.merchants
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. INSERT policy: authenticated users can only insert their own merchant profile
DROP POLICY IF EXISTS "Users can insert own merchant" ON public.merchants;
CREATE POLICY "Users can insert own merchant"
ON public.merchants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE policy: authenticated users can only update their own merchant profile
DROP POLICY IF EXISTS "Users can update own merchant" ON public.merchants;
CREATE POLICY "Users can update own merchant"
ON public.merchants
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. DELETE policy: authenticated users can only delete their own merchant profile
DROP POLICY IF EXISTS "Users can delete own merchant" ON public.merchants;
CREATE POLICY "Users can delete own merchant"
ON public.merchants
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
