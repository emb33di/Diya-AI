-- Add graduate school fields to user_profiles table
-- This migration adds fields for graduate school applications (MBA, LLM, PhD, Masters)

-- Add applying_to field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS applying_to TEXT;

-- Add masters_field_of_focus field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS masters_field_of_focus TEXT;

-- Add college_name field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS college_name TEXT;

-- Add college_graduation_year field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS college_graduation_year INTEGER;

-- Add college_gpa field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS college_gpa DECIMAL(5,2);

-- Add test_type field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS test_type TEXT;

-- Add test_score field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS test_score INTEGER;

-- Add comments to document the field purposes
COMMENT ON COLUMN public.user_profiles.applying_to IS 'Type of program applying to (Undergraduate Colleges, MBA, LLM, PhD, Masters)';
COMMENT ON COLUMN public.user_profiles.masters_field_of_focus IS 'Field of focus for Masters and PhD programs';
COMMENT ON COLUMN public.user_profiles.college_name IS 'Name of undergraduate college/university';
COMMENT ON COLUMN public.user_profiles.college_graduation_year IS 'Year of graduation from undergraduate college';
COMMENT ON COLUMN public.user_profiles.college_gpa IS 'Undergraduate college GPA';
COMMENT ON COLUMN public.user_profiles.test_type IS 'Type of graduate test taken (GRE, GMAT, LSAT, Not yet taken)';
COMMENT ON COLUMN public.user_profiles.test_score IS 'Score on graduate test';
