-- Add Razorpay customer ID to user_profiles table
-- This enables Razorpay payment integration by storing the unique customer identifier

-- Add razorpay_customer_id column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT;

-- Add razorpay_order_id column to track orders
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;

-- Add razorpay_payment_id column to track completed payments
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;

-- Add payment_status column to track payment state
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS payment_status TEXT;

-- Add payment_completed_at timestamp
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS payment_completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups by razorpay_customer_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_razorpay_customer_id 
ON public.user_profiles(razorpay_customer_id);

-- Create index for faster lookups by razorpay_order_id
CREATE INDEX IF NOT EXISTS idx_user_profiles_razorpay_order_id 
ON public.user_profiles(razorpay_order_id);

-- Create index for faster lookups by payment_status
CREATE INDEX IF NOT EXISTS idx_user_profiles_payment_status 
ON public.user_profiles(payment_status);

-- Add comments to document the columns
COMMENT ON COLUMN public.user_profiles.razorpay_customer_id IS 'Razorpay customer ID for payment processing';
COMMENT ON COLUMN public.user_profiles.razorpay_order_id IS 'Latest Razorpay order ID for the user';
COMMENT ON COLUMN public.user_profiles.razorpay_payment_id IS 'Latest successful Razorpay payment ID';
COMMENT ON COLUMN public.user_profiles.payment_status IS 'Payment status: pending, completed, failed';
COMMENT ON COLUMN public.user_profiles.payment_completed_at IS 'Timestamp when payment was completed';

