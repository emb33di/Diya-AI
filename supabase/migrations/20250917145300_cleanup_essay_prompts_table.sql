-- Clean up essay_prompts table to remove unnecessary columns
-- This migration removes columns that aren't needed for the core functionality

-- First, let's see what columns exist and remove the ones we don't need
-- Remove prompt_text column if it exists (we already have 'prompt' column)
ALTER TABLE public.essay_prompts 
DROP COLUMN IF EXISTS prompt_text;

-- Remove any other unnecessary columns that might exist
-- (Add more DROP COLUMN statements here if you find other unnecessary columns)

-- Ensure we have the essential columns with proper constraints
-- Add title column if it doesn't exist
ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS title TEXT;

-- Populate title for existing records
UPDATE public.essay_prompts 
SET title = college_name || ' - Prompt ' || prompt_number 
WHERE title IS NULL;

-- Make title NOT NULL
ALTER TABLE public.essay_prompts 
ALTER COLUMN title SET NOT NULL;

-- Verify the final table structure
-- The table should now have these essential columns:
-- id (UUID, PRIMARY KEY)
-- title (TEXT, NOT NULL)
-- college_name (TEXT, NOT NULL)
-- how_many (TEXT, NOT NULL)
-- selection_type (TEXT, NOT NULL)
-- prompt_number (TEXT, NOT NULL)
-- prompt (TEXT, NOT NULL)
-- word_limit (TEXT, NOT NULL)
-- prompt_selection_type (TEXT, NOT NULL)
-- school_program_type (school_program_type enum)
-- created_at (TIMESTAMP WITH TIME ZONE, NOT NULL)
-- updated_at (TIMESTAMP WITH TIME ZONE, NOT NULL)
