-- Fix willing_to_pay_2000 default constraint issue
-- The column was changed from BOOLEAN to TEXT but still has the old DEFAULT FALSE

-- Remove the old default
ALTER TABLE public.user_profiles 
ALTER COLUMN willing_to_pay_2000 DROP DEFAULT;

-- Update any existing rows that have 'false' (which shouldn't exist but just in case)
UPDATE public.user_profiles 
SET willing_to_pay_2000 = NULL 
WHERE willing_to_pay_2000 = 'false';

-- Fix the handle_new_user trigger to properly insert into public.user_profiles
-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  -- Insert into public.user_profiles with all metadata fields
  -- Note: willing_to_pay_2000 has a CHECK constraint, so we don't set it here
  INSERT INTO public.user_profiles (
    user_id,
    full_name,
    email_address,
    applying_to,
    phone_number,
    country_code,
    hear_about_us,
    hear_about_other,
    onboarding_complete,
    skipped_onboarding,
    profile_saved
  ) VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'applying_to', 'undergraduate'),
    NEW.raw_user_meta_data ->> 'phone_number',
    COALESCE(NEW.raw_user_meta_data ->> 'country_code', '+91'),
    NEW.raw_user_meta_data ->> 'hear_about_us',
    NEW.raw_user_meta_data ->> 'hear_about_other',
    false,
    false,
    false
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Note: Manual backfill was done for existing users via SQL Editor
-- The automatic backfill below handles any remaining cases

-- Backfill any other auth.users missing a profile
WITH missing AS (
  SELECT u.id AS user_id,
         u.email,
         COALESCE(u.raw_user_meta_data ->> 'full_name', NULL) AS full_name,
         COALESCE(u.raw_user_meta_data ->> 'applying_to', 'undergraduate') AS applying_to
  FROM auth.users u
  LEFT JOIN public.user_profiles p ON p.user_id = u.id
  WHERE p.user_id IS NULL
)
INSERT INTO public.user_profiles (
  user_id,
  full_name,
  email_address,
  applying_to,
  onboarding_complete,
  skipped_onboarding,
  profile_saved
)
SELECT m.user_id,
       NULLIF(m.full_name, ''),
       m.email,
       m.applying_to,
       false,
       false,
       false
FROM missing m
ON CONFLICT (user_id) DO NOTHING;

