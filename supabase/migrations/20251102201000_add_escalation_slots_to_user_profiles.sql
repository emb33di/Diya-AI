-- Add escalation_slots column to user_profiles table
-- This column tracks remaining escalation slots for Pro users
-- Starts at 2 when user converts to Pro, decrements by 1 on each escalation

-- Add the column
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS escalation_slots INTEGER DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.user_profiles.escalation_slots IS 'Remaining escalation slots for Pro users. Starts at 2 when user converts to Pro, decrements by 1 on each escalation. Admin can manually adjust this value.';

-- Backfill existing Pro users to have 2 slots
UPDATE public.user_profiles
SET escalation_slots = 2
WHERE user_tier = 'Pro' 
  AND escalation_slots IS NULL;

-- Create index for performance when querying remaining slots
CREATE INDEX IF NOT EXISTS idx_user_profiles_escalation_slots 
ON public.user_profiles(escalation_slots) 
WHERE escalation_slots IS NOT NULL;

