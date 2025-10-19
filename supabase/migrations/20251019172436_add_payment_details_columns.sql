-- Add additional payment tracking columns to user_profiles table
-- This enables storing complete payment details from Razorpay

-- Add payment_amount column to track payment amount
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS payment_amount INTEGER;

-- Add payment_currency column to track payment currency
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'INR';

-- Add razorpay_signature column to store payment signature
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS razorpay_signature TEXT;

-- Create index for faster lookups by payment_amount
CREATE INDEX IF NOT EXISTS idx_user_profiles_payment_amount 
ON public.user_profiles(payment_amount);

-- Create index for faster lookups by razorpay_signature
CREATE INDEX IF NOT EXISTS idx_user_profiles_razorpay_signature 
ON public.user_profiles(razorpay_signature);

-- Add comments to document the new columns
COMMENT ON COLUMN public.user_profiles.payment_amount IS 'Payment amount in paise (e.g., 999900 for ₹9999)';
COMMENT ON COLUMN public.user_profiles.payment_currency IS 'Payment currency (e.g., INR, USD)';
COMMENT ON COLUMN public.user_profiles.razorpay_signature IS 'Razorpay payment signature for verification';
