-- Fix essay_prompts table structure
-- This migration ensures the table has the correct columns and removes any problematic ones

-- First, let's ensure we have the correct table structure
-- Remove any problematic columns that might exist
ALTER TABLE public.essay_prompts 
DROP COLUMN IF EXISTS category;

ALTER TABLE public.essay_prompts 
DROP COLUMN IF EXISTS school_name;

ALTER TABLE public.essay_prompts 
DROP COLUMN IF EXISTS prompt_text;

-- Ensure we have all the required columns
ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY;

ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS college_name TEXT;

ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS how_many TEXT;

ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS selection_type TEXT;

ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS prompt_number TEXT;

ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS prompt TEXT;

ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS word_limit TEXT;

ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS prompt_selection_type TEXT;

ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS school_program_type TEXT;

ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Populate title for existing records if it's null
UPDATE public.essay_prompts 
SET title = college_name || ' - Prompt ' || prompt_number 
WHERE title IS NULL OR title = '';

-- Make essential columns NOT NULL
ALTER TABLE public.essay_prompts 
ALTER COLUMN title SET NOT NULL;

ALTER TABLE public.essay_prompts 
ALTER COLUMN college_name SET NOT NULL;

ALTER TABLE public.essay_prompts 
ALTER COLUMN how_many SET NOT NULL;

ALTER TABLE public.essay_prompts 
ALTER COLUMN selection_type SET NOT NULL;

ALTER TABLE public.essay_prompts 
ALTER COLUMN prompt_number SET NOT NULL;

ALTER TABLE public.essay_prompts 
ALTER COLUMN prompt SET NOT NULL;

ALTER TABLE public.essay_prompts 
ALTER COLUMN word_limit SET NOT NULL;

ALTER TABLE public.essay_prompts 
ALTER COLUMN prompt_selection_type SET NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_essay_prompts_college_name ON public.essay_prompts(college_name);
CREATE INDEX IF NOT EXISTS idx_essay_prompts_selection_type ON public.essay_prompts(selection_type);
CREATE INDEX IF NOT EXISTS idx_essay_prompts_school_program_type ON public.essay_prompts(school_program_type);

-- Ensure RLS is enabled
ALTER TABLE public.essay_prompts ENABLE ROW LEVEL SECURITY;

-- Create or replace the policy for public read access
DROP POLICY IF EXISTS "Anyone can view essay prompts" ON public.essay_prompts;
CREATE POLICY "Anyone can view essay prompts" 
ON public.essay_prompts 
FOR SELECT 
USING (true);

-- Create or replace the trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_essay_prompts_updated_at ON public.essay_prompts;
CREATE TRIGGER update_essay_prompts_updated_at
BEFORE UPDATE ON public.essay_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
