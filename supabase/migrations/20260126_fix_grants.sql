-- Migration: fix_grants_classifications
-- Created: 2026-01-26
-- Description: Explicitly grant SELECT permissions to anon and authenticated roles. (Required because RLS policies only work if the role has basic table access)

GRANT SELECT ON public.classifications TO anon, authenticated;
GRANT SELECT ON public.classifications TO service_role;
