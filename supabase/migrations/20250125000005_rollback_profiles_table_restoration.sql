-- ROLLBACK MIGRATION: Restore profiles table structure
-- This migration can be used to rollback the database consolidation if needed
-- WARNING: This will recreate the dual-table structure

-- Recreate the profiles table with its original structure
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  applying_to TEXT,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Recreate policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Recreate trigger for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_profiles_applying_to ON public.profiles(applying_to);

-- Migrate data back from user_profiles to profiles
INSERT INTO public.profiles (
    user_id,
    full_name,
    applying_to,
    onboarding_complete,
    created_at,
    updated_at
)
SELECT 
    user_id,
    full_name,
    applying_to::TEXT,
    onboarding_complete,
    created_at,
    updated_at
FROM public.user_profiles
ON CONFLICT (user_id) DO NOTHING;

-- Restore the original handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Create profiles record
  INSERT INTO public.profiles (user_id, full_name, onboarding_complete, applying_to)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name',
    false,
    NEW.raw_user_meta_data ->> 'applying_to'
  );
  
  -- Create user_profiles record
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

-- Restore the original atomic signup function
CREATE OR REPLACE FUNCTION public.create_user_profiles_atomic(
  p_user_id UUID,
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_applying_to TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result JSON;
  full_name TEXT;
BEGIN
  -- Validate required parameters
  IF p_user_id IS NULL OR p_email IS NULL OR p_first_name IS NULL OR p_last_name IS NULL OR p_applying_to IS NULL THEN
    result := json_build_object(
      'success', false,
      'error', 'Missing required parameters'
    );
    RETURN result;
  END IF;

  -- Validate applying_to value
  IF p_applying_to NOT IN ('Undergraduate', 'MBA', 'LLM', 'PhD', 'Masters') THEN
    result := json_build_object(
      'success', false,
      'error', 'Invalid applying_to value: ' || p_applying_to
    );
    RETURN result;
  END IF;

  -- Prepare full name
  full_name := TRIM(p_first_name || ' ' || p_last_name);

  -- Start transaction (implicit in function)
  BEGIN
    -- Update profiles record (created by trigger) with applying_to
    UPDATE public.profiles 
    SET 
      full_name = full_name,
      applying_to = p_applying_to,
      updated_at = now()
    WHERE user_id = p_user_id;

    -- Check if profiles record was updated
    IF NOT FOUND THEN
      -- Create profiles record if it doesn't exist (fallback)
      INSERT INTO public.profiles (user_id, full_name, applying_to, onboarding_complete)
      VALUES (p_user_id, full_name, p_applying_to, false);
    END IF;

    -- Create user_profiles record
    INSERT INTO public.user_profiles (user_id, full_name, email_address, applying_to, onboarding_complete)
    VALUES (p_user_id, full_name, p_email, p_applying_to, false)
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email_address = EXCLUDED.email_address,
      applying_to = EXCLUDED.applying_to,
      onboarding_complete = EXCLUDED.onboarding_complete,
      updated_at = now();

    -- Return success with user details
    result := json_build_object(
      'success', true,
      'user_id', p_user_id,
      'email', p_email,
      'full_name', full_name,
      'applying_to', p_applying_to,
      'message', 'User profiles created successfully'
    );

    RETURN result;

  EXCEPTION
    WHEN OTHERS THEN
      result := json_build_object(
        'success', false,
        'error', 'Database error: ' || SQLERRM
      );
      RETURN result;
  END;
END;
$$;

-- Verify rollback was successful
DO $$
DECLARE
    profiles_count INTEGER;
    user_profiles_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO profiles_count FROM public.profiles;
    SELECT COUNT(*) INTO user_profiles_count FROM public.user_profiles;
    
    RAISE NOTICE 'Rollback completed:';
    RAISE NOTICE 'Profiles table records: %', profiles_count;
    RAISE NOTICE 'User_profiles table records: %', user_profiles_count;
    
    IF profiles_count > 0 AND user_profiles_count > 0 THEN
        RAISE NOTICE 'Rollback successful - dual table structure restored';
    ELSE
        RAISE WARNING 'Rollback may have issues - check table counts';
    END IF;
END $$;

-- Add comment documenting the rollback
COMMENT ON TABLE public.profiles IS 'Restored profiles table after rollback from consolidation. Contains basic user data.';
COMMENT ON FUNCTION public.handle_new_user IS 'Restored dual-table creation function after rollback from consolidation.';
COMMENT ON FUNCTION public.create_user_profiles_atomic IS 'Restored atomic function for dual-table approach after rollback from consolidation.';
