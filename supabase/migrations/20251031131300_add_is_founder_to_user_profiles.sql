-- Add is_founder column to user_profiles table
-- This flag identifies founder/admin users who can access the founder portal

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_founder BOOLEAN NOT NULL DEFAULT false;

-- Create index for founder queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_founder ON user_profiles(is_founder) WHERE is_founder = true;

-- Add comment to document the field purpose
COMMENT ON COLUMN public.user_profiles.is_founder IS 'Flag indicating if user has founder/admin access to review escalated essays';

-- Note: You will need to manually set this flag for founder accounts
-- Example SQL to set founder (run separately):
-- UPDATE user_profiles SET is_founder = true WHERE email_address = 'mihir@meetdiya.com';

