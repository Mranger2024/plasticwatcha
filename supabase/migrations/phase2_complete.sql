-- ============================================
-- PHASE 2: DATABASE NORMALIZATION - COMPLETE SETUP
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Create Classifications Table
-- ============================================

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

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_classifications_updated_at 
BEFORE UPDATE ON classifications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 2: Create Review History Table
-- ============================================

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

-- ============================================
-- STEP 3: Migrate Existing Data
-- ============================================

-- Migrate classified contributions to classifications table
INSERT INTO classifications (
  contribution_id,
  brand,
  manufacturer,
  plastic_type,
  classified_by,
  classified_at,
  admin_notes,
  confidence_level,
  created_at,
  updated_at
)
SELECT 
  id,
  COALESCE(brand, brand_suggestion, 'Unknown') as brand,
  COALESCE(manufacturer, manufacturer_suggestion, 'Unknown') as manufacturer,
  COALESCE(plastic_type, plastic_type_suggestion) as plastic_type,
  classified_by,
  COALESCE(classified_at, created_at) as classified_at,
  notes as admin_notes,
  'medium' as confidence_level,
  COALESCE(classified_at, created_at) as created_at,
  COALESCE(classified_at, created_at) as updated_at
FROM contributions
WHERE status = 'classified'
  AND classified_by IS NOT NULL
ON CONFLICT (contribution_id) DO NOTHING;

-- Create initial history entries for classified items
INSERT INTO review_history (
  contribution_id,
  admin_id,
  action,
  previous_status,
  new_status,
  changes,
  created_at
)
SELECT 
  c.id,
  c.classified_by,
  'classified' as action,
  'pending' as previous_status,
  'classified' as new_status,
  jsonb_build_object(
    'brand', COALESCE(c.brand, c.brand_suggestion),
    'manufacturer', COALESCE(c.manufacturer, c.manufacturer_suggestion),
    'plastic_type', COALESCE(c.plastic_type, c.plastic_type_suggestion),
    'migrated', true
  ) as changes,
  COALESCE(c.classified_at, c.created_at) as created_at
FROM contributions c
WHERE c.status = 'classified'
  AND c.classified_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM review_history rh 
    WHERE rh.contribution_id = c.id 
    AND rh.action = 'classified'
  );

-- Create history entries for rejected items
INSERT INTO review_history (
  contribution_id,
  admin_id,
  action,
  previous_status,
  new_status,
  reason,
  created_at
)
SELECT 
  c.id,
  c.classified_by,
  'rejected' as action,
  'pending' as previous_status,
  'rejected' as new_status,
  c.notes as reason,
  COALESCE(c.classified_at, c.created_at) as created_at
FROM contributions c
WHERE c.status = 'rejected'
  AND c.classified_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM review_history rh 
    WHERE rh.contribution_id = c.id 
    AND rh.action = 'rejected'
  );

-- ============================================
-- STEP 4: Create Database Functions
-- ============================================

-- Function to classify a contribution atomically
CREATE OR REPLACE FUNCTION classify_contribution(
  p_contribution_id uuid,
  p_admin_id uuid,
  p_brand text,
  p_manufacturer text,
  p_plastic_type text DEFAULT NULL,
  p_admin_notes text DEFAULT NULL,
  p_confidence_level text DEFAULT 'medium'
) RETURNS jsonb AS $$
DECLARE
  v_old_status text;
  v_classification_id uuid;
BEGIN
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
  
  -- Update contribution status
  UPDATE contributions
  SET status = 'classified',
      classified_by = p_admin_id,
      classified_at = now()
  WHERE id = p_contribution_id;
  
  -- Insert or update classification
  INSERT INTO classifications (
    contribution_id,
    brand,
    manufacturer,
    plastic_type,
    classified_by,
    admin_notes,
    confidence_level
  ) VALUES (
    p_contribution_id,
    p_brand,
    p_manufacturer,
    p_plastic_type,
    p_admin_id,
    p_admin_notes,
    p_confidence_level
  )
  ON CONFLICT (contribution_id) DO UPDATE SET
    brand = EXCLUDED.brand,
    manufacturer = EXCLUDED.manufacturer,
    plastic_type = EXCLUDED.plastic_type,
    classified_by = EXCLUDED.classified_by,
    classified_at = now(),
    admin_notes = EXCLUDED.admin_notes,
    confidence_level = EXCLUDED.confidence_level,
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
      'confidence_level', p_confidence_level,
      'admin_notes', p_admin_notes
    )
  );
  
  -- Return success with classification ID
  RETURN jsonb_build_object(
    'success', true,
    'classification_id', v_classification_id,
    'previous_status', v_old_status
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Return error
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject a contribution atomically
CREATE OR REPLACE FUNCTION reject_contribution(
  p_contribution_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_old_status text;
BEGIN
  -- Get current status
  SELECT status INTO v_old_status
  FROM contributions
  WHERE id = p_contribution_id;
  
  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'Contribution not found: %', p_contribution_id;
  END IF;
  
  -- Update contribution status
  UPDATE contributions
  SET status = 'rejected',
      classified_by = p_admin_id,
      classified_at = now(),
      notes = p_reason
  WHERE id = p_contribution_id;
  
  -- Delete classification if exists
  DELETE FROM classifications
  WHERE contribution_id = p_contribution_id;
  
  -- Log to review history
  INSERT INTO review_history (
    contribution_id,
    admin_id,
    action,
    previous_status,
    new_status,
    reason
  ) VALUES (
    p_contribution_id,
    p_admin_id,
    'rejected',
    v_old_status,
    'rejected',
    p_reason
  );
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'previous_status', v_old_status
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Return error
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION classify_contribution IS 'Atomically classify a contribution with full audit trail';
COMMENT ON FUNCTION reject_contribution IS 'Atomically reject a contribution with full audit trail';

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 
  'Tables Created' as check_type,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('classifications', 'review_history')

UNION ALL

SELECT 
  'Data Migrated',
  COUNT(*)
FROM classifications

UNION ALL

SELECT 
  'History Entries',
  COUNT(*)
FROM review_history;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 2 Migration Complete!';
  RAISE NOTICE '📊 Check the results above for verification';
  RAISE NOTICE '🔍 Tables Created: Should show 2';
  RAISE NOTICE '📦 Data Migrated: Number of classified contributions';
  RAISE NOTICE '📝 History Entries: Number of audit records';
END $$;
