-- Add user_tier column to user_profiles table
-- This migration adds a tier system for Free and Pro users

-- Create enum for user tiers
CREATE TYPE user_tier AS ENUM ('Free', 'Pro');

-- Add user_tier column to user_profiles table with default value 'Free'
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS user_tier user_tier NOT NULL DEFAULT 'Free';

-- Add comment to document the field purpose
COMMENT ON COLUMN public.user_profiles.user_tier IS 'User subscription tier: Free or Pro';

-- Create index for better query performance on tier-based queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_tier ON public.user_profiles(user_tier);

-- Update existing users to have 'Free' tier (this is redundant with DEFAULT but ensures consistency)
UPDATE public.user_profiles 
SET user_tier = 'Free' 
WHERE user_tier IS NULL;
