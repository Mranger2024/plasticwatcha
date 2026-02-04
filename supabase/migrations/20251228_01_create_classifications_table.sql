-- Create classifications table for admin-verified data
-- Migration: create_classifications_table
-- Created: 2025-12-28

CREATE TABLE IF NOT EXISTS classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id uuid REFERENCES contributions(id) UNIQUE NOT NULL,
  
  -- Admin-verified data
  brand text NOT NULL,
  manufacturer text NOT NULL,
  plastic_type text,
  
  -- Metadata
  classified_by uuid REFERENCES auth.users(id) NOT NULL,
  classified_at timestamp DEFAULT now() NOT NULL,
  admin_notes text,
  confidence_level text CHECK (confidence_level IN ('high', 'medium', 'low')) DEFAULT 'medium',
  
  -- Timestamps
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_classifications_contribution 
ON classifications(contribution_id);

CREATE INDEX IF NOT EXISTS idx_classifications_admin 
ON classifications(classified_by);

CREATE INDEX IF NOT EXISTS idx_classifications_date 
ON classifications(classified_at DESC);

CREATE INDEX IF NOT EXISTS idx_classifications_brand 
ON classifications(brand);

-- Add comments for documentation
COMMENT ON TABLE classifications IS 'Admin-verified classification data for contributions';
COMMENT ON COLUMN classifications.contribution_id IS 'Reference to the contribution being classified';
COMMENT ON COLUMN classifications.confidence_level IS 'Admin confidence in classification: high, medium, or low';

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_classifications_updated_at 
BEFORE UPDATE ON classifications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
