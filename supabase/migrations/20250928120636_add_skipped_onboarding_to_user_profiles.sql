-- Add skipped_onboarding field to user_profiles table
-- This field tracks whether the user clicked "Skip Onboarding" to bypass the conversation entirely

-- Add skipped_onboarding field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS skipped_onboarding BOOLEAN NOT NULL DEFAULT false;

-- Add comment to document the field purpose
COMMENT ON COLUMN public.user_profiles.skipped_onboarding IS 'Whether the user skipped the onboarding conversation entirely by clicking "Skip Onboarding"';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_skipped_onboarding ON public.user_profiles(skipped_onboarding);

-- Create composite index for common queries involving both onboarding fields
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_status ON public.user_profiles(onboarding_complete, skipped_onboarding);
