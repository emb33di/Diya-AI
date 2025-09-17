-- Remove unnecessary fields from essay_prompts table
-- This migration removes category and school_name columns that are not needed

-- Remove category column if it exists
ALTER TABLE public.essay_prompts 
DROP COLUMN IF EXISTS category;

-- Remove school_name column if it exists
ALTER TABLE public.essay_prompts 
DROP COLUMN IF EXISTS school_name;

-- Note: If you need to preserve any data from these columns before dropping them,
-- you can add SELECT statements here to export the data first
-- For example:
-- SELECT id, category, school_name FROM public.essay_prompts WHERE category IS NOT NULL OR school_name IS NOT NULL;
