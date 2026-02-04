-- Create RLS policies for classifications table
-- Migration: classifications_rls_policies
-- Created: 2025-12-28

-- ============================================
-- PUBLIC READ ACCESS
-- ============================================

-- Anyone can view classifications (for public transparency, leaderboards, statistics)
CREATE POLICY "public_view_classifications"
  ON classifications FOR SELECT
  USING (true);

-- ============================================
-- ADMIN WRITE ACCESS
-- ============================================

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
-- COMMENTS
-- ============================================

COMMENT ON POLICY "public_view_classifications" ON classifications IS 
  'Public can view all classifications for transparency';
COMMENT ON POLICY "admins_create_classifications" ON classifications IS 
  'Only admins can create classifications';
COMMENT ON POLICY "admins_update_classifications" ON classifications IS 
  'Only admins can update classifications';
COMMENT ON POLICY "admins_delete_classifications" ON classifications IS 
  'Only admins can delete classifications';
