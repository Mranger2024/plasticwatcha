-- Create blog_posts table
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  author_id UUID REFERENCES auth.users(id) NOT NULL,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tags TEXT[] DEFAULT '{}',
  meta_title TEXT,
  meta_description TEXT,
  featured BOOLEAN DEFAULT false,
  reading_time_minutes INTEGER DEFAULT 5
);

-- Create index for better query performance
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_published ON public.blog_posts(published, published_at);
CREATE INDEX idx_blog_posts_author ON public.blog_posts(author_id);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Enable read access for all users"
  ON public.blog_posts
  FOR SELECT
  USING (published = true);

CREATE POLICY "Enable all access for admins"
  ON public.blog_posts
  USING (auth.role() = 'authenticated' AND auth.jwt() ->> 'role' = 'admin');

-- Update updated_at trigger
CREATE OR REPLACE FUNCTION update_blog_post_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_blog_post_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION update_blog_post_updated_at();

-- Function to generate slug from title
CREATE OR REPLACE FUNCTION create_slug(title TEXT)
RETURNS TEXT AS $$
DECLARE
  slug TEXT;
  counter INTEGER := 1;
  base_slug TEXT;
BEGIN
  -- Convert to lowercase, replace spaces with hyphens, remove special chars
  base_slug := regexp_replace(
    regexp_replace(
      lower(trim(title)),
      '[^a-z0-9\- ]',
      '',
      'g'
    ),
    '\s+',
    '-',
    'g'
  );
  
  slug := base_slug;
  
  -- Check if slug exists, if so, append a counter
  WHILE EXISTS (SELECT 1 FROM public.blog_posts WHERE blog_posts.slug = slug) LOOP
    slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN slug;
END;
$$ LANGUAGE plpgsql;
