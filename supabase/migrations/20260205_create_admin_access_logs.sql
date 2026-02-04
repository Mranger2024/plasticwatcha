-- Drop existing policies if they might conflicts
DROP POLICY IF EXISTS "Admins can view all access logs" ON admin_access_logs;
DROP POLICY IF EXISTS "Users can insert their own access logs" ON admin_access_logs;

-- Re-apply table structure (idempotent)
CREATE TABLE IF NOT EXISTS admin_access_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid REFERENCES auth.users(id) NOT NULL,
    ip_address text,
    user_agent text,
    location text,
    device_info jsonb,
    created_at timestamp DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE admin_access_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins to read all logs
CREATE POLICY "Admins can view all access logs"
    ON admin_access_logs
    FOR SELECT
    TO authenticated
    USING (
      (auth.jwt()->>'role' = 'service_role') OR
      (public.is_admin())
    );

-- Allow authenticated users to insert their own access logs
CREATE POLICY "Users can insert their own access logs"
    ON admin_access_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = admin_id);
