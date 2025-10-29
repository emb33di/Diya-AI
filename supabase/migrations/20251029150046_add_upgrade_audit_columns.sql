-- Add audit columns to track who upgraded the user and when
-- Helps debug race conditions between webhook and client verification

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS upgraded_by TEXT;

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS upgraded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.user_profiles.upgraded_by IS 'Source of upgrade: webhook or client-verification';
COMMENT ON COLUMN public.user_profiles.upgraded_at IS 'Timestamp when user tier was upgraded to Pro';


