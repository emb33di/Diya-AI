-- Add Stripe payment tracking columns to user_profiles table
-- This enables storing Stripe checkout session and customer information

-- Add stripe_checkout_session_id column to track Stripe checkout sessions
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

-- Add stripe_customer_email column to track customer email from Stripe
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_email TEXT;

-- Create index for faster lookups by stripe_checkout_session_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_checkout_session_id 
ON public.user_profiles(stripe_checkout_session_id);

-- Create index for faster lookups by stripe_customer_email
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer_email 
ON public.user_profiles(stripe_customer_email);

-- Add comments to document the columns
COMMENT ON COLUMN public.user_profiles.stripe_checkout_session_id IS 'Stripe checkout session ID for payment tracking';
COMMENT ON COLUMN public.user_profiles.stripe_customer_email IS 'Customer email from Stripe checkout session';
