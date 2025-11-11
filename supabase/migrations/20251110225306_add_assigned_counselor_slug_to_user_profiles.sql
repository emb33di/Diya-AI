-- Add assigned_counselor_slug column to user_profiles table
-- This field allows per-user designation of which counselor their essays should be escalated to
-- NULL means essays go to founder (default behavior)
-- Non-NULL values (e.g., 'ivysummit') route essays to the specified counselor portal

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS assigned_counselor_slug TEXT;

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_assigned_counselor_slug 
ON user_profiles(assigned_counselor_slug) 
WHERE assigned_counselor_slug IS NOT NULL;

-- Add comment to document the field purpose
COMMENT ON COLUMN public.user_profiles.assigned_counselor_slug IS 'Partner slug (e.g., "ivysummit") that designates which counselor portal this user''s essays should be escalated to. NULL means essays go to founder (default).';

-- Note: To assign a user to a specific counselor, update their profile:
-- UPDATE user_profiles SET assigned_counselor_slug = 'ivysummit' WHERE user_id = '<user_id>';
-- To reset to founder (default), set to NULL:
-- UPDATE user_profiles SET assigned_counselor_slug = NULL WHERE user_id = '<user_id>';

