-- Add missing fields for undergraduate prompt topics
-- This migration adds fields to capture information from the structured undergraduate prompt

-- Add extracurricular activities field
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS extracurricular_activities TEXT;

-- Add leadership roles field
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS leadership_roles TEXT;

-- Add personal projects field
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS personal_projects TEXT;

-- Add application concerns field
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS application_concerns TEXT;

-- Add specific questions field
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS specific_questions TEXT;

-- Add comments to document the field purposes
COMMENT ON COLUMN public.user_profiles.extracurricular_activities IS 'Activities, passions, and accomplishments outside of academics';
COMMENT ON COLUMN public.user_profiles.leadership_roles IS 'Leadership experiences and roles';
COMMENT ON COLUMN public.user_profiles.personal_projects IS 'Personal projects and initiatives';
COMMENT ON COLUMN public.user_profiles.application_concerns IS 'Specific concerns or anxieties about the application process';
COMMENT ON COLUMN public.user_profiles.specific_questions IS 'Specific questions the applicant wants addressed in their report';
