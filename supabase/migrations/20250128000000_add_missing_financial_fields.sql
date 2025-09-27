-- Add missing financial fields to user_profiles table
-- This migration adds fields for scholarship and financial aid preferences

-- Add looking_for_scholarships field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS looking_for_scholarships TEXT;

-- Add looking_for_financial_aid field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS looking_for_financial_aid TEXT;

-- Add comments to document the field purposes
COMMENT ON COLUMN public.user_profiles.looking_for_scholarships IS 'Whether the student is looking for scholarships (yes/no)';
COMMENT ON COLUMN public.user_profiles.looking_for_financial_aid IS 'Whether the student is looking for financial aid (yes/no)';
