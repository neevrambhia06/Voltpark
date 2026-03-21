-- Add image_url column to locations table
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS image_url TEXT;
