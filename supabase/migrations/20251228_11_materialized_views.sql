-- Create materialized views for statistics
-- Migration: materialized_views
-- Created: 2025-12-28

-- ============================================
-- ADMIN PERFORMANCE STATISTICS
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS admin_stats AS
SELECT 
  u.id as admin_id,
  u.email,
  u.raw_user_meta_data->>'name' as admin_name,
  COUNT(DISTINCT rh.contribution_id) as total_reviewed,
  COUNT(CASE WHEN rh.action = 'classified' THEN 1 END) as classified_count,
  COUNT(CASE WHEN rh.action = 'rejected' THEN 1 END) as rejected_count,
  COUNT(CASE WHEN rh.action = 'reclassified' THEN 1 END) as reclassified_count,
  ROUND(
    COUNT(CASE WHEN rh.action = 'classified' THEN 1 END)::numeric / 
    NULLIF(COUNT(DISTINCT rh.contribution_id), 0) * 100, 
    2
  ) as approval_rate,
  MIN(rh.created_at) as first_review,
  MAX(rh.created_at) as last_review,
  COUNT(CASE WHEN rh.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as reviews_last_7_days,
  COUNT(CASE WHEN rh.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as reviews_last_30_days
FROM auth.users u
LEFT JOIN review_history rh ON u.id = rh.admin_id
WHERE u.raw_user_meta_data->>'role' = 'admin'
GROUP BY u.id, u.email, u.raw_user_meta_data->>'name';

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_stats_admin_id 
ON admin_stats(admin_id);

COMMENT ON MATERIALIZED VIEW admin_stats IS 
  'Admin performance statistics - refresh periodically';

-- ============================================
-- BRAND STATISTICS
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS brand_stats AS
SELECT 
  cl.brand,
  cl.manufacturer,
  COUNT(*) as classification_count,
  COUNT(DISTINCT cl.classified_by) as admin_count,
  MIN(cl.classified_at) as first_classified,
  MAX(cl.classified_at) as last_classified,
  MODE() WITHIN GROUP (ORDER BY cl.confidence_level) as most_common_confidence,
  COUNT(CASE WHEN cl.confidence_level = 'high' THEN 1 END) as high_confidence_count,
  COUNT(CASE WHEN cl.confidence_level = 'medium' THEN 1 END) as medium_confidence_count,
  COUNT(CASE WHEN cl.confidence_level = 'low' THEN 1 END) as low_confidence_count,
  ARRAY_AGG(DISTINCT cl.plastic_type) FILTER (WHERE cl.plastic_type IS NOT NULL) as plastic_types
FROM classifications cl
GROUP BY cl.brand, cl.manufacturer;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_stats_brand_manufacturer 
ON brand_stats(brand, manufacturer);

COMMENT ON MATERIALIZED VIEW brand_stats IS 
  'Brand and manufacturer statistics - refresh periodically';

-- ============================================
-- DAILY STATISTICS
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS daily_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_contributions,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'classified' THEN 1 END) as classified,
  COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT beach_name) FILTER (WHERE beach_name IS NOT NULL) as unique_beaches
FROM contributions
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stats_date 
ON daily_stats(date);

COMMENT ON MATERIALIZED VIEW daily_stats IS 
  'Daily contribution statistics - refresh daily';

-- ============================================
-- BEACH STATISTICS
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS beach_stats AS
SELECT 
  beach_name,
  COUNT(*) as contribution_count,
  COUNT(CASE WHEN status = 'classified' THEN 1 END) as classified_count,
  COUNT(DISTINCT user_id) as unique_contributors,
  MIN(created_at) as first_contribution,
  MAX(created_at) as last_contribution,
  AVG(latitude) as avg_latitude,
  AVG(longitude) as avg_longitude
FROM contributions
WHERE beach_name IS NOT NULL
GROUP BY beach_name
HAVING COUNT(*) >= 3; -- Only beaches with 3+ contributions

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_beach_stats_beach_name 
ON beach_stats(beach_name);

COMMENT ON MATERIALIZED VIEW beach_stats IS 
  'Beach location statistics - refresh periodically';

-- ============================================
-- REFRESH FUNCTIONS
-- ============================================

-- Refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY admin_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY brand_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY beach_stats;
  
  RAISE NOTICE 'All materialized views refreshed successfully';
END;
$$ LANGUAGE plpgsql;

-- Refresh only admin stats (faster, for real-time updates)
CREATE OR REPLACE FUNCTION refresh_admin_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY admin_stats;
END;
$$ LANGUAGE plpgsql;

-- Schedule automatic refresh (requires pg_cron extension)
-- Uncomment if pg_cron is available:
-- SELECT cron.schedule('refresh-stats', '0 * * * *', 'SELECT refresh_all_stats()');

COMMENT ON FUNCTION refresh_all_stats() IS 
  'Refresh all materialized views - run periodically (e.g., hourly)';
COMMENT ON FUNCTION refresh_admin_stats() IS 
  'Refresh admin statistics only - faster for real-time updates';

-- ============================================
-- INITIAL REFRESH
-- ============================================

-- Refresh all views on creation
SELECT refresh_all_stats();

-- ============================================
-- VERIFICATION
-- ============================================

-- Check materialized views exist
SELECT 
  schemaname,
  matviewname,
  hasindexes,
  ispopulated
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY matviewname;

-- Sample data from views
SELECT 'Admin Stats' as view_name, COUNT(*) as row_count FROM admin_stats
UNION ALL
SELECT 'Brand Stats', COUNT(*) FROM brand_stats
UNION ALL
SELECT 'Daily Stats', COUNT(*) FROM daily_stats
UNION ALL
SELECT 'Beach Stats', COUNT(*) FROM beach_stats;
