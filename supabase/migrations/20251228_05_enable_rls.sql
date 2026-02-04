-- Enable Row Level Security on all tables
-- Migration: enable_rls
-- Created: 2025-12-28

-- Enable RLS on contributions table
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on classifications table
ALTER TABLE classifications ENABLE ROW LEVEL SECURITY;

-- Enable RLS on review_history table
ALTER TABLE review_history ENABLE ROW LEVEL SECURITY;

-- Add comments
COMMENT ON TABLE contributions IS 'User-submitted plastic pollution contributions (RLS enabled)';
COMMENT ON TABLE classifications IS 'Admin-verified classifications (RLS enabled)';
COMMENT ON TABLE review_history IS 'Audit trail of admin actions (RLS enabled)';

-- Verification query
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('contributions', 'classifications', 'review_history');
