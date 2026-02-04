-- Create RLS policies for contributions table
-- Migration: contributions_rls_policies
-- Created: 2025-12-28

-- ============================================
-- USER POLICIES
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

-- ============================================
-- ADMIN POLICIES
-- ============================================

-- Admins can view all contributions
CREATE POLICY "admins_view_all_contributions"
  ON contributions FOR SELECT
  USING (is_admin());

-- Admins can update any contribution
CREATE POLICY "admins_update_contributions"
  ON contributions FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- PUBLIC POLICIES (for statistics, leaderboards)
-- ============================================

-- Public can view classified contributions (for transparency)
CREATE POLICY "public_view_classified"
  ON contributions FOR SELECT
  USING (status = 'classified');

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "users_view_own_contributions" ON contributions IS 
  'Users can view their own contributions';
COMMENT ON POLICY "users_create_contributions" ON contributions IS 
  'Users can create new contributions';
COMMENT ON POLICY "users_update_own_pending" ON contributions IS 
  'Users can only update their own pending contributions';
COMMENT ON POLICY "users_delete_own_pending" ON contributions IS 
  'Users can only delete their own pending contributions';
COMMENT ON POLICY "admins_view_all_contributions" ON contributions IS 
  'Admins can view all contributions';
COMMENT ON POLICY "admins_update_contributions" ON contributions IS 
  'Admins can update any contribution';
COMMENT ON POLICY "public_view_classified" ON contributions IS 
  'Public can view classified contributions for transparency';
