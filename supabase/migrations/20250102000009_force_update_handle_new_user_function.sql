-- Force update handle_new_user function to use TEXT instead of enum
-- This migration ensures the function uses the correct TEXT type after enum migration

-- Drop and recreate the trigger function with correct TEXT handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the corrected trigger function that uses TEXT instead of enum
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
  
  -- Create user_profiles record with applying_to from metadata
  -- Use COALESCE to provide default value if applying_to is NULL
  INSERT INTO public.user_profiles (user_id, full_name, email_address, applying_to, onboarding_complete)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'applying_to', 'undergraduate'),
    false
  );
  
  RAISE LOG 'DEBUG: Successfully created user_profiles record for user_id: %', NEW.id;
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'DEBUG: Error in handle_new_user: %', SQLERRM;
    -- Return NEW to allow auth.users creation to succeed
    -- The atomic function will handle profile creation
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add comment explaining the fix
COMMENT ON FUNCTION public.handle_new_user IS 'Creates user_profiles record when new user signs up. Uses TEXT type for applying_to field with COALESCE default.';
