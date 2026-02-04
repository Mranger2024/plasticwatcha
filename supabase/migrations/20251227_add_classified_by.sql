-- Add classified_by column to track which admin classified each contribution
-- Migration: add_classified_by_column
-- Created: 2025-12-27

ALTER TABLE contributions 
ADD COLUMN IF NOT EXISTS classified_by uuid REFERENCES auth.users(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_contributions_classified_by 
ON contributions(classified_by);

-- Add comment for documentation
COMMENT ON COLUMN contributions.classified_by IS 'ID of the admin user who classified this contribution';
