-- Create helper functions for RLS policies
-- Migration: rls_helper_functions
-- Created: 2025-12-28

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

-- Add comments
COMMENT ON FUNCTION is_admin() IS 'Check if current user has admin role';
COMMENT ON FUNCTION owns_contribution(uuid) IS 'Check if current user owns the specified contribution';
COMMENT ON FUNCTION current_user_role() IS 'Get current user role (admin or user)';
