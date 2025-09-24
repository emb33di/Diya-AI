-- Remove the old handle_new_user trigger that was causing data inconsistency
-- This migration removes the problematic trigger and replaces it with a simpler one

-- Drop the old trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a simpler trigger that only creates the basic profiles record
-- The atomic function will handle the applying_to field properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Only create basic profiles record, let the atomic function handle applying_to
  INSERT INTO public.profiles (user_id, full_name, onboarding_completed)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name',
    false
  );
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add comment explaining the change
COMMENT ON FUNCTION public.handle_new_user IS 'Simplified trigger that only creates basic profiles record. The applying_to field is handled by the atomic profile creation function.';
