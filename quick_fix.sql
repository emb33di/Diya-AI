-- Quick fix for atomic signup function search_path issue
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
SET search_path = 'public'
AS $$
DECLARE
  result JSON;
  full_name TEXT;
BEGIN
  -- Debug logging
  RAISE LOG 'DEBUG: create_user_profiles_atomic called with params: user_id=%, email=%, first_name=%, last_name=%, applying_to=%', 
    p_user_id, p_email, p_first_name, p_last_name, p_applying_to;

  -- Validate required parameters
  IF p_user_id IS NULL OR p_email IS NULL OR p_first_name IS NULL OR p_last_name IS NULL OR p_applying_to IS NULL THEN
    RAISE LOG 'DEBUG: Missing required parameters - user_id=%, email=%, first_name=%, last_name=%, applying_to=%', 
      p_user_id, p_email, p_first_name, p_last_name, p_applying_to;
    result := json_build_object(
      'success', false,
      'error', 'Missing required parameters'
    );
    RETURN result;
  END IF;

  -- Validate applying_to value
  IF p_applying_to NOT IN ('Undergraduate', 'MBA', 'LLM', 'PhD', 'Masters') THEN
    RAISE LOG 'DEBUG: Invalid applying_to value: %', p_applying_to;
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
    RAISE LOG 'DEBUG: About to insert/update user_profiles record';
    RAISE LOG 'DEBUG: Values: user_id=%, full_name=%, email=%, applying_to=%', 
      p_user_id, full_name, p_email, p_applying_to;
    
    -- Create or update user_profiles record
    INSERT INTO public.user_profiles (user_id, full_name, email_address, applying_to, onboarding_complete)
    VALUES (p_user_id, full_name, p_email, p_applying_to::school_program_type<｜tool▁sep｜>false)
    ON CONFLICT (user_id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      email_address = EXCLUDED.email_address,
      applying_to = EXCLUDED.applying_to::school_program_type,
      updated_at = now;
    
    RAISE LOG 'DEBUG: Successfully inserted/updated user_profiles record';

    -- Return success with user details
    result := json_build_object(
      'success', true,
      'user_id', p_user_id,
      'email', p_email,
      'full_name', full_name,
      'applying_to', p_applying_to,
      'message', 'User profile created successfully'
    );

    RETURN result;

  EXCEPTION
    WHEN check_violation THEN
      -- Handle constraint violations
      RAISE LOG 'DEBUG: Check violation error: %', SQLERRM;
      result := json_build_object(
        'success', false,
        'error', 'Invalid data provided'
      );
      RETURN result;
    WHEN OTHERS THEN
      -- Handle any other errors
      RAISE LOG 'DEBUG: Other error: %', SQLERRM;
      result := json_build_object(
        'success', false,
        'error', 'Profile creation failed: ' || SQLERRM
      );
      RETURN result;
  END;
END;
$$;
