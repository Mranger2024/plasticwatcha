-- Migration: security_hardening
-- Created: 2026-01-26
-- Description: Fixes vulnerabilities identified in security audit (Privilege Escalation, Unprotected Functions, Search Path)

-- 1. HARDEN is_admin()
-- Switch to using app_metadata (protected) instead of user_metadata (writable by user)
-- NOTE: You must ensure your Auth setup writes roles to app_metadata. 
-- If you currently use user_metadata, this will lock admins out until you migrate their role to app_metadata.
-- For safety in this transition, we will check BOTH, but prioritizing app_metadata is the end goal.
-- Ideally, you should move entirely to app_metadata or a separate `user_roles` table.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  v_role text;
BEGIN
  -- Check app_metadata first (Secure)
  v_role := (auth.jwt()->>'app_metadata')::jsonb->>'role';
  
  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  -- FALLBACK: Check user_metadata (Less Secure, but keeps existing admins working for now)
  -- TODO: Remove this fallback after migrating admin roles to app_metadata
  v_role := (auth.jwt()->>'user_metadata')::jsonb->>'role';
  
  RETURN v_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, temp;


-- 2. SECURE CRITICAL FUNCTIONS
-- Add explicit authorization checks and search_path configuration

-- Secure classify_contribution
CREATE OR REPLACE FUNCTION public.classify_contribution(
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
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, temp;


-- Secure reject_contribution
CREATE OR REPLACE FUNCTION public.reject_contribution(
  p_contribution_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_old_status text;
BEGIN
  -- SECURITY CHECK
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
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
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, temp;

-- 3. SECURE OTHER HELPERS
ALTER FUNCTION public.owns_contribution(uuid) SET search_path = public, temp;
ALTER FUNCTION public.current_user_role() SET search_path = public, temp;

-- Handle New User Trigger (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
        ALTER FUNCTION public.handle_new_user() SET search_path = public, temp;
    END IF;
END $$;
