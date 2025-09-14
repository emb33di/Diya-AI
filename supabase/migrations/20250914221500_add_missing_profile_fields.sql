-- Add missing fields to user_profiles table
-- This migration adds fields that are in the form but missing from the database

-- Add school_board field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS school_board TEXT;

-- Add year_of_study field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS year_of_study TEXT;

-- Add class_10_score field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS class_10_score DECIMAL(5,2);

-- Add class_11_score field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS class_11_score DECIMAL(5,2);

-- Add class_12_half_yearly_score field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS class_12_half_yearly_score DECIMAL(5,2);

-- Add undergraduate_cgpa field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS undergraduate_cgpa DECIMAL(5,2);

-- Add ideal_college_size field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS ideal_college_size TEXT;

-- Add ideal_college_setting field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS ideal_college_setting TEXT;

-- Add geographic_preference field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS geographic_preference TEXT;

-- Add must_haves field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS must_haves TEXT;

-- Add deal_breakers field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS deal_breakers TEXT;

-- Add college_budget field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS college_budget TEXT;

-- Add financial_aid_importance field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS financial_aid_importance TEXT;

-- Add scholarship_interests field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS scholarship_interests TEXT[];

-- Add comments to document the field purposes
COMMENT ON COLUMN public.user_profiles.school_board IS 'School board (ICSE, CBSE, IB, etc.)';
COMMENT ON COLUMN public.user_profiles.year_of_study IS 'Current year of study (11th, 12th, Graduate)';
COMMENT ON COLUMN public.user_profiles.class_10_score IS 'Class 10 grade percentage';
COMMENT ON COLUMN public.user_profiles.class_11_score IS 'Class 11 grade percentage';
COMMENT ON COLUMN public.user_profiles.class_12_half_yearly_score IS 'Class 12 half-yearly grade percentage';
COMMENT ON COLUMN public.user_profiles.undergraduate_cgpa IS 'Undergraduate CGPA (0-10 scale)';
COMMENT ON COLUMN public.user_profiles.ideal_college_size IS 'Preferred college size';
COMMENT ON COLUMN public.user_profiles.ideal_college_setting IS 'Preferred college setting';
COMMENT ON COLUMN public.user_profiles.geographic_preference IS 'Preferred geographic location';
COMMENT ON COLUMN public.user_profiles.must_haves IS 'Essential features for ideal college';
COMMENT ON COLUMN public.user_profiles.deal_breakers IS 'Features that would make a college undesirable';
COMMENT ON COLUMN public.user_profiles.college_budget IS 'Annual college budget range';
COMMENT ON COLUMN public.user_profiles.financial_aid_importance IS 'Importance of financial aid';
COMMENT ON COLUMN public.user_profiles.scholarship_interests IS 'Types of scholarships interested in';
