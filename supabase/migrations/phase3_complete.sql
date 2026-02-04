-- ============================================
-- PHASE 3: ROW LEVEL SECURITY (RLS) - COMPLETE SETUP
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Enable RLS on All Tables
-- ============================================

ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Create Helper Functions
-- ============================================

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt()->>'user_metadata')::jsonb->>'role' = 'admin',
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user owns a contribution
CREATE OR REPLACE FUNCTION owns_contribution(p_contribution_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM contributions
    WHERE id = p_contribution_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get current user's role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS text AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt()->>'user_metadata')::jsonb->>'role',
    'user'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- STEP 3: Contributions Table Policies
-- ============================================

-- Users can view their own contributions
CREATE POLICY "users_view_own_contributions"
  ON contributions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own contributions
CREATE POLICY "users_create_contributions"
  ON contributions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending contributions only
CREATE POLICY "users_update_own_pending"
  ON contributions FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND status = 'pending'
  );

-- Users can delete their own pending contributions only
CREATE POLICY "users_delete_own_pending"
  ON contributions FOR DELETE
  USING (
    auth.uid() = user_id 
    AND status = 'pending'
  );

-- Admins can view all contributions
CREATE POLICY "admins_view_all_contributions"
  ON contributions FOR SELECT
  USING (is_admin());

-- Admins can update any contribution
CREATE POLICY "admins_update_contributions"
  ON contributions FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Public can view classified contributions (for transparency)
CREATE POLICY "public_view_classified"
  ON contributions FOR SELECT
  USING (status = 'classified');

-- ============================================
-- STEP 4: Classifications Table Policies
-- ============================================

-- Anyone can view classifications (for public transparency)
CREATE POLICY "public_view_classifications"
  ON classifications FOR SELECT
  USING (true);

-- Only admins can insert classifications
CREATE POLICY "admins_create_classifications"
  ON classifications FOR INSERT
  WITH CHECK (is_admin());

-- Only admins can update classifications
CREATE POLICY "admins_update_classifications"
  ON classifications FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Only admins can delete classifications
CREATE POLICY "admins_delete_classifications"
  ON classifications FOR DELETE
  USING (is_admin());

-- ============================================
-- STEP 5: Review History Table Policies
-- ============================================

-- Only admins can view review history
CREATE POLICY "admins_view_review_history"
  ON review_history FOR SELECT
  USING (is_admin());

-- System functions can insert audit records (append-only)
CREATE POLICY "system_insert_review_history"
  ON review_history FOR INSERT
  WITH CHECK (true);

-- No update or delete policies - audit trail is immutable

-- ============================================
-- VERIFICATION
-- ============================================

-- Check RLS is enabled
SELECT 
  'RLS Status' as check_type,
  tablename,
  CASE WHEN rowsecurity THEN 'Enabled ✅' ELSE 'Disabled ❌' END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('contributions', 'classifications', 'review_history')

UNION ALL

-- Count policies
SELECT 
  'Policy Count' as check_type,
  tablename,
  COUNT(*)::text || ' policies' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('contributions', 'classifications', 'review_history')
GROUP BY tablename

ORDER BY check_type, tablename;

-- ============================================
-- DETAILED POLICY LIST
-- ============================================

SELECT 
  tablename,
  policyname,
  cmd as command,
  CASE 
    WHEN policyname LIKE '%admin%' THEN 'Admin'
    WHEN policyname LIKE '%user%' THEN 'User'
    WHEN policyname LIKE '%public%' THEN 'Public'
    WHEN policyname LIKE '%system%' THEN 'System'
    ELSE 'Other'
  END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('contributions', 'classifications', 'review_history')
ORDER BY tablename, policy_type, policyname;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 3 RLS Setup Complete!';
  RAISE NOTICE '🔒 Row Level Security enabled on all tables';
  RAISE NOTICE '📋 Policies created for users, admins, and public access';
  RAISE NOTICE '🛡️ Audit trail protected (immutable)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Check the results above for verification';
  RAISE NOTICE '   - All tables should show "Enabled ✅"';
  RAISE NOTICE '   - contributions: 7 policies';
  RAISE NOTICE '   - classifications: 4 policies';
  RAISE NOTICE '   - review_history: 2 policies';
END $$;
