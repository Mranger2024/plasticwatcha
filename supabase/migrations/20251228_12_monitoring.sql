-- Add monitoring and analytics tables
-- Migration: monitoring_tables
-- Created: 2025-12-28

-- ============================================
-- QUERY PERFORMANCE LOG
-- ============================================

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

CREATE INDEX IF NOT EXISTS idx_query_performance_slow 
ON query_performance(execution_time_ms DESC) 
WHERE execution_time_ms > 1000; -- Slow queries (>1s)

COMMENT ON TABLE query_performance IS 
  'Log of query performance metrics for monitoring';

-- ============================================
-- ERROR LOG
-- ============================================

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

CREATE INDEX IF NOT EXISTS idx_error_log_user 
ON error_log(user_id, created_at DESC) 
WHERE user_id IS NOT NULL;

COMMENT ON TABLE error_log IS 
  'Application error log for debugging and monitoring';

-- ============================================
-- SYSTEM HEALTH METRICS
-- ============================================

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

COMMENT ON TABLE system_health IS 
  'System health metrics (DB size, connection count, etc.)';

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Log query performance
CREATE OR REPLACE FUNCTION log_query_performance(
  p_query_name text,
  p_execution_time_ms integer,
  p_row_count integer DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO query_performance (
    query_name,
    execution_time_ms,
    row_count,
    user_id
  ) VALUES (
    p_query_name,
    p_execution_time_ms,
    p_row_count,
    auth.uid()
  );
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
  INSERT INTO error_log (
    error_type,
    error_message,
    error_stack,
    user_id,
    context
  ) VALUES (
    p_error_type,
    p_error_message,
    p_error_stack,
    auth.uid(),
    p_context
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record system health metric
CREATE OR REPLACE FUNCTION record_health_metric(
  p_metric_name text,
  p_metric_value numeric,
  p_metric_unit text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO system_health (
    metric_name,
    metric_value,
    metric_unit,
    metadata
  ) VALUES (
    p_metric_name,
    p_metric_value,
    p_metric_unit,
    p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- MONITORING VIEWS
-- ============================================

-- Slow queries summary
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
  query_name,
  COUNT(*) as occurrence_count,
  AVG(execution_time_ms) as avg_time_ms,
  MAX(execution_time_ms) as max_time_ms,
  MIN(execution_time_ms) as min_time_ms,
  MAX(created_at) as last_occurrence
FROM query_performance
WHERE execution_time_ms > 1000
GROUP BY query_name
ORDER BY avg_time_ms DESC;

-- Error summary
CREATE OR REPLACE VIEW error_summary AS
SELECT 
  error_type,
  COUNT(*) as occurrence_count,
  MAX(created_at) as last_occurrence,
  COUNT(DISTINCT user_id) as affected_users
FROM error_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY error_type
ORDER BY occurrence_count DESC;

-- System health dashboard
CREATE OR REPLACE VIEW health_dashboard AS
SELECT 
  metric_name,
  metric_value,
  metric_unit,
  created_at
FROM system_health
WHERE created_at >= NOW() - INTERVAL '1 hour'
ORDER BY metric_name, created_at DESC;

-- ============================================
-- CLEANUP FUNCTIONS
-- ============================================

-- Clean old performance logs (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM query_performance 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  DELETE FROM error_log 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  DELETE FROM system_health 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  RAISE NOTICE 'Old logs cleaned up successfully';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (requires pg_cron)
-- SELECT cron.schedule('cleanup-logs', '0 2 * * *', 'SELECT cleanup_old_logs()');

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE query_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;

-- Only admins can view monitoring data
CREATE POLICY "admins_view_query_performance"
  ON query_performance FOR SELECT
  USING (is_admin());

CREATE POLICY "admins_view_error_log"
  ON error_log FOR SELECT
  USING (is_admin());

CREATE POLICY "admins_view_system_health"
  ON system_health FOR SELECT
  USING (is_admin());

-- System can insert (via functions)
CREATE POLICY "system_insert_query_performance"
  ON query_performance FOR INSERT
  WITH CHECK (true);

CREATE POLICY "system_insert_error_log"
  ON error_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "system_insert_system_health"
  ON system_health FOR INSERT
  WITH CHECK (true);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION log_query_performance IS 
  'Log query execution time for performance monitoring';
COMMENT ON FUNCTION log_error IS 
  'Log application errors for debugging';
COMMENT ON FUNCTION record_health_metric IS 
  'Record system health metrics';
COMMENT ON FUNCTION cleanup_old_logs IS 
  'Clean up old monitoring logs (run daily)';
