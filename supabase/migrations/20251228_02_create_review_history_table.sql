-- Create review_history table for audit trail
-- Migration: create_review_history_table
-- Created: 2025-12-28

CREATE TABLE IF NOT EXISTS review_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id uuid REFERENCES contributions(id) NOT NULL,
  admin_id uuid REFERENCES auth.users(id) NOT NULL,
  
  -- Action details
  action text NOT NULL CHECK (action IN ('classified', 'rejected', 'updated', 'deleted', 'reclassified')),
  previous_status text,
  new_status text,
  
  -- Change tracking
  changes jsonb,
  reason text,
  
  -- Timestamp
  created_at timestamp DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_review_history_contribution 
ON review_history(contribution_id);

CREATE INDEX IF NOT EXISTS idx_review_history_admin 
ON review_history(admin_id);

CREATE INDEX IF NOT EXISTS idx_review_history_date 
ON review_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_history_action 
ON review_history(action);

-- Add comments for documentation
COMMENT ON TABLE review_history IS 'Audit trail of all admin actions on contributions';
COMMENT ON COLUMN review_history.action IS 'Type of action: classified, rejected, updated, deleted, reclassified';
COMMENT ON COLUMN review_history.changes IS 'JSON object containing the changes made';
COMMENT ON COLUMN review_history.reason IS 'Optional reason for the action (e.g., rejection reason)';

-- Create view for easy history lookup with admin details
CREATE OR REPLACE VIEW review_history_with_admin AS
SELECT 
  rh.*,
  u.email as admin_email,
  u.raw_user_meta_data->>'name' as admin_name
FROM review_history rh
LEFT JOIN auth.users u ON rh.admin_id = u.id;

COMMENT ON VIEW review_history_with_admin IS 'Review history with admin user details joined';
