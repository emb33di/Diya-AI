-- Create new function that only creates user_profiles records
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Only create user_profiles record, no more profiles table
  INSERT INTO public.user_profiles (
    user_id, 
    full_name, 
    applying_to, 
    onboarding_complete,
    email_address
  )
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'applying_to',
    false,
    NEW.email
  );
  RETURN NEW;
END;
$$;
