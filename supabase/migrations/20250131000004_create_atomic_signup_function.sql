-- Create atomic profile creation function
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
      INSERT INTO public.profiles (user_id, full_name, applying_to, onboarding_completed)
      VALUES (p_user_id, full_name, p_applying_to, false);
    END IF;

    -- Create user_profiles record
    INSERT INTO public.user_profiles (user_id, full_name, email_address, applying_to)
    VALUES (p_user_id, full_name, p_email, p_applying_to);

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
    WHEN unique_violation THEN
      -- Handle duplicate user_id
      result := json_build_object(
        'success', false,
        'error', 'User profile already exists'
      );
      RETURN result;
    WHEN check_violation THEN
      -- Handle constraint violations
      result := json_build_object(
        'success', false,
        'error', 'Invalid data provided'
      );
      RETURN result;
    WHEN OTHERS THEN
      -- Handle any other errors
      result := json_build_object(
        'success', false,
        'error', 'Profile creation failed: ' || SQLERRM
      );
      RETURN result;
  END;
END;
$$;
