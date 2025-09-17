-- Add missing columns to essay_prompts table
-- This migration handles the case where the remote database has columns
-- that are not reflected in the local migrations

-- Add title column
ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS title TEXT;

-- Add prompt_text column
ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS prompt_text TEXT;

-- If the columns were just added, we need to populate them with data
-- We'll use a combination of college_name and prompt_number as the title
-- And use the prompt field as the prompt_text
UPDATE public.essay_prompts 
SET title = college_name || ' - Prompt ' || prompt_number,
    prompt_text = prompt
WHERE title IS NULL OR prompt_text IS NULL;

-- Now make the columns NOT NULL
ALTER TABLE public.essay_prompts 
ALTER COLUMN title SET NOT NULL;

ALTER TABLE public.essay_prompts 
ALTER COLUMN prompt_text SET NOT NULL;
