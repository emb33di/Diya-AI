-- Add cumulative_onboarding_time column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN cumulative_onboarding_time INTEGER DEFAULT 0;