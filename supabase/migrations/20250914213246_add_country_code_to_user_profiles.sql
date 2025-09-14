-- Add country_code and undergraduate_cgpa fields to user_profiles table
-- This migration adds fields for international phone numbers and graduate student CGPA

-- Add country_code field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS country_code TEXT;

-- Add undergraduate_cgpa field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS undergraduate_cgpa DECIMAL(3,2);

-- Add comments to document the field purposes
COMMENT ON COLUMN public.user_profiles.country_code IS 'Country code for phone number (e.g., +91, +1, +44)';
COMMENT ON COLUMN public.user_profiles.undergraduate_cgpa IS 'Undergraduate CGPA for graduate students (scale 0-10)';
