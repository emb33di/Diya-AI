-- Add early user fields to user_profiles table
-- This migration adds fields to support early user signup with 2-week free trial

-- Add early user identification and tracking fields
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_early_user BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS early_user_signup_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS early_user_trial_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS biggest_pain_point TEXT,
ADD COLUMN IF NOT EXISTS willing_to_pay_2000 BOOLEAN DEFAULT FALSE;

-- Add comments for documentation
COMMENT ON COLUMN public.user_profiles.is_early_user IS 'Flag to identify users who signed up through early access program';
COMMENT ON COLUMN public.user_profiles.early_user_signup_date IS 'Date when user signed up for early access';
COMMENT ON COLUMN public.user_profiles.early_user_trial_end_date IS 'End date of 2-week free trial (calculated as signup_date + 14 days)';
COMMENT ON COLUMN public.user_profiles.biggest_pain_point IS 'Optional field capturing users biggest pain point in admissions process';
COMMENT ON COLUMN public.user_profiles.willing_to_pay_2000 IS 'Whether user indicated willingness to pay Rs. 2000 for the solution';

-- Create function to automatically calculate trial end date
CREATE OR REPLACE FUNCTION public.calculate_early_user_trial_end_date()
RETURNS TRIGGER AS $$
BEGIN
  -- If early_user_signup_date is set and trial_end_date is not set, calculate it
  IF NEW.early_user_signup_date IS NOT NULL AND NEW.early_user_trial_end_date IS NULL THEN
    NEW.early_user_trial_end_date := NEW.early_user_signup_date + INTERVAL '14 days';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate trial end date
CREATE TRIGGER calculate_early_user_trial_end_date_trigger
  BEFORE INSERT OR UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_early_user_trial_end_date();
