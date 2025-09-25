-- Add cumulative_onboarding_time column to user_profiles table
-- This corrects the previous migration that incorrectly targeted the profiles table

-- Add cumulative_onboarding_time field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS cumulative_onboarding_time INTEGER DEFAULT 0;

-- Add comment to document the field purpose
COMMENT ON COLUMN public.user_profiles.cumulative_onboarding_time IS 'Total time spent in onboarding sessions across all sessions (in seconds)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_cumulative_onboarding_time ON public.user_profiles(cumulative_onboarding_time);

-- Verify the column was added successfully
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Check if the column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles' 
        AND column_name = 'cumulative_onboarding_time'
    ) INTO column_exists;
    
    IF column_exists THEN
        RAISE NOTICE 'cumulative_onboarding_time column successfully added to user_profiles table';
    ELSE
        RAISE EXCEPTION 'Failed to add cumulative_onboarding_time column to user_profiles table';
    END IF;
END $$;
