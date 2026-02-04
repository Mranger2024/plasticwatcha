-- Migration: refactor_contributions_schema
-- Created: 2026-01-26
-- Description: Moves verified data from contributions to classifications, drops unused columns.

-- 1. ENRICH CLASSIFICATIONS TABLE
-- Add columns that were previously in contributions but belong here
ALTER TABLE public.classifications 
ADD COLUMN IF NOT EXISTS beach_id int8 REFERENCES public.beaches(id),
ADD COLUMN IF NOT EXISTS company_id int8 REFERENCES public.companies(id),
ADD COLUMN IF NOT EXISTS product_type text,
ADD COLUMN IF NOT EXISTS beach_latitude float8,
ADD COLUMN IF NOT EXISTS beach_longitude float8;

-- 2. UPDATE FUNCTIONS
-- We must update the function BEFORE dropping columns to avoid breaking active dependencies
-- Updated signature to include new classification fields
CREATE OR REPLACE FUNCTION public.classify_contribution(
  p_contribution_id uuid,
  p_admin_id uuid,
  p_brand text,
  p_manufacturer text,
  p_plastic_type text DEFAULT NULL,
  p_admin_notes text DEFAULT NULL,
  p_confidence_level text DEFAULT 'medium',
  -- New Arguments
  p_product_type text DEFAULT NULL,
  p_beach_id int8 DEFAULT NULL,
  p_company_id int8 DEFAULT NULL,
  p_beach_latitude float8 DEFAULT NULL,
  p_beach_longitude float8 DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_old_status text;
  v_classification_id uuid;
BEGIN
  -- SECURITY CHECK
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Validate confidence level
  IF p_confidence_level NOT IN ('high', 'medium', 'low') THEN
    RAISE EXCEPTION 'Invalid confidence level: %', p_confidence_level;
  END IF;

  -- Get current status
  SELECT status INTO v_old_status
  FROM contributions
  WHERE id = p_contribution_id;
  
  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'Contribution not found: %', p_contribution_id;
  END IF;
  
  -- Update contribution status (ONLY status now)
  UPDATE contributions
  SET status = 'classified'
      -- classified_by and classified_at are REMOVED from contributions
  WHERE id = p_contribution_id;
  
  -- Insert or update classification
  INSERT INTO classifications (
    contribution_id,
    brand,
    manufacturer,
    plastic_type,
    classified_by,
    admin_notes,
    confidence_level,
    -- New Fields
    product_type,
    beach_id,
    company_id,
    beach_latitude,
    beach_longitude
  ) VALUES (
    p_contribution_id,
    p_brand,
    p_manufacturer,
    p_plastic_type,
    p_admin_id,
    p_admin_notes,
    p_confidence_level,
    -- New Fields
    p_product_type,
    p_beach_id,
    p_company_id,
    p_beach_latitude,
    p_beach_longitude
  )
  ON CONFLICT (contribution_id) DO UPDATE SET
    brand = EXCLUDED.brand,
    manufacturer = EXCLUDED.manufacturer,
    plastic_type = EXCLUDED.plastic_type,
    classified_by = EXCLUDED.classified_by,
    classified_at = now(),
    admin_notes = EXCLUDED.admin_notes,
    confidence_level = EXCLUDED.confidence_level,
    product_type = EXCLUDED.product_type,
    beach_id = EXCLUDED.beach_id,
    company_id = EXCLUDED.company_id,
    beach_latitude = EXCLUDED.beach_latitude,
    beach_longitude = EXCLUDED.beach_longitude,
    updated_at = now()
  RETURNING id INTO v_classification_id;
  
  -- Log to review history
  INSERT INTO review_history (
    contribution_id,
    admin_id,
    action,
    previous_status,
    new_status,
    changes
  ) VALUES (
    p_contribution_id,
    p_admin_id,
    CASE WHEN v_old_status = 'classified' THEN 'reclassified' ELSE 'classified' END,
    v_old_status,
    'classified',
    jsonb_build_object(
      'brand', p_brand,
      'manufacturer', p_manufacturer,
      'plastic_type', p_plastic_type,
      'product_type', p_product_type,
      'beach_id', p_beach_id,
      'confidence_level', p_confidence_level
    )
  );
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'classification_id', v_classification_id,
    'previous_status', v_old_status
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, temp;


-- 3. DROP COLUMNS FROM CONTRIBUTIONS
-- Users confirmed data migration is NOT needed ("random test data")

-- Admin Metadata
ALTER TABLE public.contributions DROP COLUMN IF EXISTS classified_by;
ALTER TABLE public.contributions DROP COLUMN IF EXISTS classified_at;

-- Verified Data (Moved to classifications)
ALTER TABLE public.contributions DROP COLUMN IF EXISTS brand;
ALTER TABLE public.contributions DROP COLUMN IF EXISTS manufacturer;
ALTER TABLE public.contributions DROP COLUMN IF EXISTS plastic_type;
ALTER TABLE public.contributions DROP COLUMN IF EXISTS product_type;

-- Location Links (Moved to classifications)
ALTER TABLE public.contributions DROP COLUMN IF EXISTS beach_id;
ALTER TABLE public.contributions DROP COLUMN IF EXISTS company_id;
ALTER TABLE public.contributions DROP COLUMN IF EXISTS beach_latitude;
ALTER TABLE public.contributions DROP COLUMN IF EXISTS beach_longitude;

-- Unused / Deleted Data
ALTER TABLE public.contributions DROP COLUMN IF EXISTS location_accuracy;

-- NOTE: kept recyclability_indicator, notes, reviewer_feedback as requested.
