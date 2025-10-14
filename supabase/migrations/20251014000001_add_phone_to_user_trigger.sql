-- Update handle_new_user function to include phone_number and country_code
-- This ensures phone number data is captured during signup

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the updated trigger function that includes phone_number and country_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  -- Debug logging
  RAISE LOG 'DEBUG: handle_new_user trigger called for user_id: %', NEW.id;
  RAISE LOG 'DEBUG: raw_user_meta_data: %', NEW.raw_user_meta_data;
  RAISE LOG 'DEBUG: applying_to value: %', NEW.raw_user_meta_data ->> 'applying_to';
  RAISE LOG 'DEBUG: phone_number value: %', NEW.raw_user_meta_data ->> 'phone_number';
  RAISE LOG 'DEBUG: country_code value: %', NEW.raw_user_meta_data ->> 'country_code';
  
  -- Create user_profiles record with all metadata fields
  -- Use COALESCE to provide default values if fields are NULL
  INSERT INTO public.user_profiles (
    user_id, 
    full_name, 
    email_address, 
    applying_to, 
    phone_number,
    country_code,
    onboarding_complete
  )
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'applying_to', 'undergraduate'),
    NEW.raw_user_meta_data ->> 'phone_number',
    COALESCE(NEW.raw_user_meta_data ->> 'country_code', '+91'),
    false
  );
  
  RAISE LOG 'DEBUG: Successfully created user_profiles record for user_id: %', NEW.id;
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'DEBUG: Error in handle_new_user: %', SQLERRM;
    -- Return NEW to allow auth.users creation to succeed
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add comment explaining the update
COMMENT ON FUNCTION public.handle_new_user IS 'Creates user_profiles record when new user signs up. Includes phone_number and country_code from metadata.';

