-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id INTEGER PRIMARY KEY DEFAULT 1, -- Single row table
  site_name TEXT NOT NULL DEFAULT 'Plastic Watch',
  site_description TEXT,
  contact_email TEXT,
  site_logo_url TEXT,
  favicon_url TEXT,
  ai_enabled BOOLEAN DEFAULT true,
  ai_confidence_threshold NUMERIC(3, 2) DEFAULT 0.7,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create RLS policy for settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow only authenticated users with admin role to access settings
CREATE POLICY "Enable read access for admins"
  ON public.settings
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Enable update for admins"
  ON public.settings
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the updated_at column
DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings if not exists
INSERT INTO public.settings (id, site_name, site_description)
VALUES (1, 'Plastic Watch', 'Tracking plastic pollution worldwide')
ON CONFLICT (id) DO NOTHING;
