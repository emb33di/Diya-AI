-- Remove preferred_name field from user_profiles table
-- This migration removes the preferred_name field that is no longer needed

-- Drop the preferred_name column from user_profiles table
ALTER TABLE public.user_profiles 
DROP COLUMN IF EXISTS preferred_name;

-- Add comment to document the change
COMMENT ON TABLE public.user_profiles IS 'User profiles table - preferred_name field removed as it was redundant with full_name';
