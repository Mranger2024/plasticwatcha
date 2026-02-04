-- Add review form enhancement fields to contributions table
-- Migration: 20260122_162145_add_review_form_fields.sql

-- Add product type field
ALTER TABLE contributions 
ADD COLUMN IF NOT EXISTS product_type TEXT;

-- Add recyclability indicator with constraint
ALTER TABLE contributions 
ADD COLUMN IF NOT EXISTS recyclability_indicator TEXT 
CHECK (recyclability_indicator IN ('high', 'medium', 'low'));

-- Add reviewer feedback field
ALTER TABLE contributions 
ADD COLUMN IF NOT EXISTS reviewer_feedback TEXT;

-- Add index for filtering by product type
CREATE INDEX IF NOT EXISTS idx_contributions_product_type 
ON contributions(product_type);

-- Add index for filtering by recyclability
CREATE INDEX IF NOT EXISTS idx_contributions_recyclability 
ON contributions(recyclability_indicator);

-- Comment on columns
COMMENT ON COLUMN contributions.product_type IS 'Type of plastic product (e.g., pet_bottle, carry_bag, etc.)';
COMMENT ON COLUMN contributions.recyclability_indicator IS 'Local recyclability rating: high (blue), medium (orange), low (red)';
COMMENT ON COLUMN contributions.reviewer_feedback IS 'Feedback from reviewer to contributor, visible in user dashboard';
