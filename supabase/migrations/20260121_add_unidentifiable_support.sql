-- Add support for unidentifiable products
-- Migration: add_unidentifiable_products_support
-- Created: 2026-01-21

-- Add new columns to contributions table
ALTER TABLE contributions
ADD COLUMN IF NOT EXISTS is_identifiable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS unidentifiable_images JSONB;

-- Add comment
COMMENT ON COLUMN contributions.is_identifiable IS 'Whether the product has identifiable brand/logo';
COMMENT ON COLUMN contributions.unidentifiable_images IS 'Array of image URLs for unidentifiable products';

-- Update existing rows to be identifiable by default
UPDATE contributions 
SET is_identifiable = true 
WHERE is_identifiable IS NULL;
