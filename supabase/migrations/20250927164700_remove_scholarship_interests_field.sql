-- Remove scholarship_interests field from user_profiles table
-- This migration removes the scholarship interests field since it's no longer needed in the UI

-- Drop the scholarship_interests column
ALTER TABLE public.user_profiles 
DROP COLUMN IF EXISTS scholarship_interests;

-- Add comment to document the removal
COMMENT ON TABLE public.user_profiles IS 'User profile information - scholarship_interests field removed as it is no longer used in the UI';
