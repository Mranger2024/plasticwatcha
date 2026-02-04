-- Migration: add_product_type_suggestion
-- Created: 2026-01-26
-- Description: Adds product_type_suggestion to contributions table to store user input for product type.

ALTER TABLE public.contributions
ADD COLUMN IF NOT EXISTS product_type_suggestion text;
