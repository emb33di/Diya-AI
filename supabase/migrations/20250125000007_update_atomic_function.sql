-- Update the atomic signup function to only work with user_profiles
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
    -- Update user_profiles record (created by trigger) with complete data
    UPDATE public.user_profiles 
    SET 
      full_name = full_name,
      applying_to = p_applying_to::school_program_type,
      email_address = p_email,
      updated_at = now()
    WHERE user_id = p_user_id;

    -- Check if user_profiles record was updated
    IF NOT FOUND THEN
      -- Create user_profiles record if it doesn't exist (fallback)
      INSERT INTO public.user_profiles (
        user_id, 
        full_name, 
        email_address, 
        applying_to, 
        onboarding_complete
      )
      VALUES (p_user_id, full_name, p_email, p_applying_to::school_program_type, false);
    END IF;

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
    WHEN OTHERS THEN
      result := json_build_object(
        'success', false,
        'error', 'Database error: ' || SQLERRM
      );
      RETURN result;
  END;
END;
$$;

