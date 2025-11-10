-- Add is_counselor and counselor_name columns to user_profiles table
-- This allows partner organizations (like IvySummit) to have authenticated users
-- who can access their partner portal to review escalated essays

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_counselor BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS counselor_name TEXT;

-- Create index for counselor queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_counselor ON user_profiles(is_counselor) WHERE is_counselor = true;

-- Create index for counselor_name lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_counselor_name ON user_profiles(counselor_name) WHERE counselor_name IS NOT NULL;

-- Add comments to document the field purposes
COMMENT ON COLUMN public.user_profiles.is_counselor IS 'Flag indicating if user is a partner counselor who can access partner portals';
COMMENT ON COLUMN public.user_profiles.counselor_name IS 'Name/identifier of the partner organization (e.g., "ivysummit") that this counselor belongs to';

-- Note: You will need to manually set these fields for counselor accounts
-- Example SQL to set counselor (run separately):
-- UPDATE user_profiles SET is_counselor = true, counselor_name = 'ivysummit' WHERE email_address = 'counselor@ivysummit.com';

