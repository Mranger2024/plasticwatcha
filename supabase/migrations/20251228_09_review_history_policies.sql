-- Create RLS policies for review_history table
-- Migration: review_history_rls_policies
-- Created: 2025-12-28

-- ============================================
-- ADMIN READ ACCESS
-- ============================================

-- Only admins can view review history
CREATE POLICY "admins_view_review_history"
  ON review_history FOR SELECT
  USING (is_admin());

-- ============================================
-- SYSTEM INSERT ACCESS
-- ============================================

-- Allow inserts from database functions (SECURITY DEFINER functions bypass RLS)
-- This policy allows the classify_contribution and reject_contribution functions to work
CREATE POLICY "system_insert_review_history"
  ON review_history FOR INSERT
  WITH CHECK (true);

-- ============================================
-- NO UPDATE OR DELETE
-- ============================================
-- Audit trail is immutable - no update or delete policies
-- This ensures the history cannot be tampered with

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "admins_view_review_history" ON review_history IS 
  'Only admins can view the audit trail';
COMMENT ON POLICY "system_insert_review_history" ON review_history IS 
  'System functions can insert audit records (append-only)';

COMMENT ON TABLE review_history IS 
  'Audit trail - immutable, append-only, admin-visible only';
