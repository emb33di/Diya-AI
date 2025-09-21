-- Add applying_to field to profiles table to consolidate profile data
-- This eliminates the need to query both profiles and user_profiles tables

-- Add applying_to field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS applying_to TEXT;

-- Add comment to document the field purpose
COMMENT ON COLUMN public.profiles.applying_to IS 'Type of program applying to (Undergraduate Colleges, MBA, LLM, PhD, Masters)';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_applying_to ON public.profiles(applying_to);

-- Migrate existing applying_to data from user_profiles to profiles
UPDATE public.profiles 
SET applying_to = up.applying_to
FROM public.user_profiles up
WHERE profiles.user_id = up.user_id 
AND up.applying_to IS NOT NULL;

-- Update the handle_new_user function to include applying_to
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, onboarding_completed, applying_to)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name',
    false,
    NEW.raw_user_meta_data ->> 'applying_to'
  );
  RETURN NEW;
END;
$$;
