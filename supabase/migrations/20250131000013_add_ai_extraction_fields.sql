-- Add AI extraction tracking fields to user_profiles table
-- This migration adds fields to track when profile data was extracted by AI

-- Add ai_extracted field to track if profile was populated by AI
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS ai_extracted BOOLEAN DEFAULT FALSE;

-- Add ai_extraction_date field to track when AI extraction occurred
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS ai_extraction_date TIMESTAMP WITH TIME ZONE;

-- Add comments to document the field purposes
COMMENT ON COLUMN public.user_profiles.ai_extracted IS 'Indicates if this profile was populated by AI extraction';
COMMENT ON COLUMN public.user_profiles.ai_extraction_date IS 'Timestamp when AI extraction was performed';
