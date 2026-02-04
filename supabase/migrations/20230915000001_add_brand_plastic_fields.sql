-- Add brand_suggestion and plastic_type_suggestion to contributions table
ALTER TABLE public.contributions
ADD COLUMN brand_suggestion TEXT,
ADD COLUMN plastic_type_suggestion TEXT;
