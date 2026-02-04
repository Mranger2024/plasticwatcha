-- Migration: fix_permissions
-- Created: 2026-01-26
-- Description: Ensures classifications table is readable by public.

-- Enable RLS
ALTER TABLE public.classifications ENABLE ROW LEVEL SECURITY;

-- Create Policy for SELECT (Public Read)
DROP POLICY IF EXISTS "Public read access" ON public.classifications;
CREATE POLICY "Public read access" ON public.classifications
  FOR SELECT
  USING (true);

-- Ensure authenticated users (admins) can Insert/Update (this might be covered by other policies, but good to ensure)
-- Assuming admin checks are done via function for 'classify_contribution', but direct insert might be needed?
-- The functions are SECURITY DEFINER so they bypass RLS.
-- So we strictly need Read access for the frontend.
