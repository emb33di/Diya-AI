-- Fix handle_new_user function to use user_profiles instead of removed profiles table
-- This fixes the profile creation error

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the corrected trigger function that uses user_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Debug logging
  RAISE LOG 'DEBUG: handle_new_user trigger called for user_id: %', NEW.id;
  RAISE LOG 'DEBUG: raw_user_meta_data: %', NEW.raw_user_meta_data;
  
  -- Create user_profiles record instead of profiles
  -- Note: applying_to will be set by the atomic function, so we don't set it here
  INSERT INTO public.user_profiles (user_id, full_name, onboarding_complete)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name',
    false
  );
  
  RAISE LOG 'DEBUG: Successfully created user_profiles record for user_id: %', NEW.id;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add comment explaining the fix
COMMENT ON FUNCTION public.handle_new_user IS 'Creates user_profiles record when new user signs up. Fixed to use user_profiles instead of removed profiles table.';
