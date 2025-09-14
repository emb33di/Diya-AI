-- Add onboarding_completed field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Update the handle_new_user function to set onboarding_completed to false for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, onboarding_completed)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 