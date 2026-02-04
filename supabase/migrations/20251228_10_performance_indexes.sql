-- Add performance indexes for faster queries
-- Migration: performance_indexes
-- Created: 2025-12-28

-- ============================================
-- CONTRIBUTIONS TABLE INDEXES
-- ============================================

-- Composite index for status + date queries (most common)
CREATE INDEX IF NOT EXISTS idx_contributions_status_created 
ON contributions(status, created_at DESC);

-- User-specific queries
CREATE INDEX IF NOT EXISTS idx_contributions_user_status 
ON contributions(user_id, status);

-- Beach location queries
CREATE INDEX IF NOT EXISTS idx_contributions_beach 
ON contributions(beach_name) 
WHERE beach_name IS NOT NULL;

-- Full-text search on brand suggestions
CREATE INDEX IF NOT EXISTS idx_contributions_brand_search 
ON contributions USING gin(to_tsvector('english', COALESCE(brand_suggestion, '')));

-- Full-text search on manufacturer suggestions
CREATE INDEX IF NOT EXISTS idx_contributions_manufacturer_search 
ON contributions USING gin(to_tsvector('english', COALESCE(manufacturer_suggestion, '')));

-- Combined search index
CREATE INDEX IF NOT EXISTS idx_contributions_combined_search 
ON contributions USING gin(
  to_tsvector('english', 
    COALESCE(brand_suggestion, '') || ' ' || 
    COALESCE(manufacturer_suggestion, '') || ' ' || 
    COALESCE(beach_name, '')
  )
);

-- ============================================
-- CLASSIFICATIONS TABLE INDEXES
-- ============================================

-- Brand + manufacturer lookups
CREATE INDEX IF NOT EXISTS idx_classifications_brand_manufacturer 
ON classifications(brand, manufacturer);

-- Date range queries
CREATE INDEX IF NOT EXISTS idx_classifications_date_range 
ON classifications(classified_at DESC, confidence_level);

-- ============================================
-- REVIEW HISTORY TABLE INDEXES
-- ============================================

-- Admin activity queries
CREATE INDEX IF NOT EXISTS idx_review_history_admin_date 
ON review_history(admin_id, created_at DESC);

-- Contribution history lookups
CREATE INDEX IF NOT EXISTS idx_review_history_contribution_date 
ON review_history(contribution_id, created_at DESC);

-- Action type filtering
CREATE INDEX IF NOT EXISTS idx_review_history_action_date 
ON review_history(action, created_at DESC);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON INDEX idx_contributions_status_created IS 
  'Optimizes admin dashboard queries by status and date';
COMMENT ON INDEX idx_contributions_brand_search IS 
  'Enables full-text search on brand suggestions';
COMMENT ON INDEX idx_classifications_brand_manufacturer IS 
  'Speeds up brand/manufacturer statistics queries';
COMMENT ON INDEX idx_review_history_admin_date IS 
  'Optimizes admin activity dashboard queries';

-- ============================================
-- VERIFICATION
-- ============================================

-- List all indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('contributions', 'classifications', 'review_history')
ORDER BY tablename, indexname;
