-- Migrate existing classified contributions to new tables
-- Migration: migrate_existing_data
-- Created: 2025-12-28

-- Step 1: Migrate classified contributions to classifications table
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

-- Step 2: Create initial history entries for classified items
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

-- Step 3: Create history entries for rejected items
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

-- Verification query (run this to check migration)
-- SELECT 
--   (SELECT COUNT(*) FROM contributions WHERE status = 'classified') as classified_contributions,
--   (SELECT COUNT(*) FROM classifications) as classifications_count,
--   (SELECT COUNT(*) FROM review_history WHERE action = 'classified') as classified_history_count,
--   (SELECT COUNT(*) FROM review_history WHERE action = 'rejected') as rejected_history_count;
