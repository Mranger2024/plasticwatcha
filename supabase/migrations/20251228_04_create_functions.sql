-- Create atomic classification function
-- Migration: create_classify_function
-- Created: 2025-12-28

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

-- Create reject contribution function
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
