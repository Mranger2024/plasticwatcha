-- ============================================
-- PHASE 4: PERFORMANCE OPTIMIZATION - COMPLETE SETUP
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Performance Indexes
-- ============================================

-- Contributions table indexes
CREATE INDEX IF NOT EXISTS idx_contributions_status_created 
ON contributions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contributions_user_status 
ON contributions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_contributions_beach 
ON contributions(beach_name) 
WHERE beach_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contributions_brand_search 
ON contributions USING gin(to_tsvector('english', COALESCE(brand_suggestion, '')));

CREATE INDEX IF NOT EXISTS idx_contributions_manufacturer_search 
ON contributions USING gin(to_tsvector('english', COALESCE(manufacturer_suggestion, '')));

CREATE INDEX IF NOT EXISTS idx_contributions_combined_search 
ON contributions USING gin(
  to_tsvector('english', 
    COALESCE(brand_suggestion, '') || ' ' || 
    COALESCE(manufacturer_suggestion, '') || ' ' || 
    COALESCE(beach_name, '')
  )
);

-- Classifications table indexes
CREATE INDEX IF NOT EXISTS idx_classifications_brand_manufacturer 
ON classifications(brand, manufacturer);

CREATE INDEX IF NOT EXISTS idx_classifications_date_range 
ON classifications(classified_at DESC, confidence_level);

-- Review history table indexes
CREATE INDEX IF NOT EXISTS idx_review_history_admin_date 
ON review_history(admin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_history_contribution_date 
ON review_history(contribution_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_history_action_date 
ON review_history(action, created_at DESC);

-- ============================================
-- STEP 2: Materialized Views
-- ============================================

-- Admin performance statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_stats AS
SELECT 
  u.id as admin_id,
  u.email,
  u.raw_user_meta_data->>'name' as admin_name,
  COUNT(DISTINCT rh.contribution_id) as total_reviewed,
  COUNT(CASE WHEN rh.action = 'classified' THEN 1 END) as classified_count,
  COUNT(CASE WHEN rh.action = 'rejected' THEN 1 END) as rejected_count,
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_stats_admin_id 
ON admin_stats(admin_id);

-- Brand statistics
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
  ARRAY_AGG(DISTINCT cl.plastic_type) FILTER (WHERE cl.plastic_type IS NOT NULL) as plastic_types
FROM classifications cl
GROUP BY cl.brand, cl.manufacturer;

CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_stats_brand_manufacturer 
ON brand_stats(brand, manufacturer);

-- Daily statistics
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_stats_date 
ON daily_stats(date);

-- Beach statistics
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
HAVING COUNT(*) >= 3;

CREATE UNIQUE INDEX IF NOT EXISTS idx_beach_stats_beach_name 
ON beach_stats(beach_name);

-- Refresh function
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

-- Initial refresh
SELECT refresh_all_stats();

-- ============================================
-- STEP 3: Monitoring Tables
-- ============================================

-- Query performance log
CREATE TABLE IF NOT EXISTS query_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_name text NOT NULL,
  execution_time_ms integer NOT NULL,
  row_count integer,
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_query_performance_name_date 
ON query_performance(query_name, created_at DESC);

-- Error log
CREATE TABLE IF NOT EXISTS error_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type text NOT NULL,
  error_message text,
  error_stack text,
  user_id uuid REFERENCES auth.users(id),
  context jsonb,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_error_log_type_date 
ON error_log(error_type, created_at DESC);

-- System health metrics
CREATE TABLE IF NOT EXISTS system_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text,
  metadata jsonb,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_health_metric_date 
ON system_health(metric_name, created_at DESC);

-- Enable RLS on monitoring tables
ALTER TABLE query_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "admins_view_query_performance"
  ON query_performance FOR SELECT
  USING (is_admin());

CREATE POLICY "system_insert_query_performance"
  ON query_performance FOR INSERT
  WITH CHECK (true);

CREATE POLICY "admins_view_error_log"
  ON error_log FOR SELECT
  USING (is_admin());

CREATE POLICY "system_insert_error_log"
  ON error_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "admins_view_system_health"
  ON system_health FOR SELECT
  USING (is_admin());

CREATE POLICY "system_insert_system_health"
  ON system_health FOR INSERT
  WITH CHECK (true);

-- ============================================
-- STEP 4: Helper Functions
-- ============================================

-- Log query performance
CREATE OR REPLACE FUNCTION log_query_performance(
  p_query_name text,
  p_execution_time_ms integer,
  p_row_count integer DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO query_performance (query_name, execution_time_ms, row_count, user_id)
  VALUES (p_query_name, p_execution_time_ms, p_row_count, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log error
CREATE OR REPLACE FUNCTION log_error(
  p_error_type text,
  p_error_message text,
  p_error_stack text DEFAULT NULL,
  p_context jsonb DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO error_log (error_type, error_message, error_stack, user_id, context)
  VALUES (p_error_type, p_error_message, p_error_stack, auth.uid(), p_context);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old logs
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM query_performance WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM error_log WHERE created_at < NOW() - INTERVAL '90 days';
  DELETE FROM system_health WHERE created_at < NOW() - INTERVAL '30 days';
  RAISE NOTICE 'Old logs cleaned up successfully';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check indexes
SELECT 
  'Indexes Created' as check_type,
  COUNT(*) as count
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('contributions', 'classifications', 'review_history')

UNION ALL

-- Check materialized views
SELECT 
  'Materialized Views',
  COUNT(*)
FROM pg_matviews
WHERE schemaname = 'public'

UNION ALL

-- Check monitoring tables
SELECT 
  'Monitoring Tables',
  COUNT(*)
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('query_performance', 'error_log', 'system_health');

-- Sample statistics
SELECT 'Admin Stats' as view_name, COUNT(*) as row_count FROM admin_stats
UNION ALL
SELECT 'Brand Stats', COUNT(*) FROM brand_stats
UNION ALL
SELECT 'Daily Stats', COUNT(*) FROM daily_stats
UNION ALL
SELECT 'Beach Stats', COUNT(*) FROM beach_stats;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 4 Performance Optimization Complete!';
  RAISE NOTICE '⚡ Performance indexes added for faster queries';
  RAISE NOTICE '📊 Materialized views created for statistics';
  RAISE NOTICE '📈 Monitoring tables ready for production';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Next steps:';
  RAISE NOTICE '   - Run refresh_all_stats() periodically (e.g., hourly)';
  RAISE NOTICE '   - Monitor slow queries via query_performance table';
  RAISE NOTICE '   - Check error_log for application errors';
  RAISE NOTICE '   - Run cleanup_old_logs() daily to manage disk space';
END $$;
