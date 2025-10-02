-- Remove remaining references to deleted profiles table in database functions
-- This fixes the "profiles does not exist" error

-- 1. Fix find_users_with_null_applying_to function
DROP FUNCTION IF EXISTS public.find_users_with_null_applying_to();
CREATE OR REPLACE FUNCTION public.find_users_with_null_applying_to()
RETURNS TABLE(
  user_id UUID,
  user_profiles_applying_to TEXT,
  user_profiles_exists BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    up.applying_to as user_profiles_applying_to,
    (up.user_id IS NOT NULL) as user_profiles_exists,
    au.created_at
  FROM auth.users au
  LEFT JOIN public.user_profiles up ON au.id = up.user_id
  WHERE 
    up.applying_to IS NULL
    AND au.created_at > '2024-01-01' -- Only check recent users
  ORDER BY au.created_at DESC;
END;
$$;

-- 2. Fix fix_null_applying_to_users function
DROP FUNCTION IF EXISTS public.fix_null_applying_to_users(TEXT);
CREATE OR REPLACE FUNCTION public.fix_null_applying_to_users(
  default_applying_to TEXT DEFAULT 'Undergraduate'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  fixed_count INTEGER := 0;
  result JSON;
BEGIN
  -- Validate default value
  IF default_applying_to NOT IN ('Undergraduate', 'MBA', 'LLM', 'PhD', 'Masters') THEN
    result := json_build_object(
      'success', false,
      'error', 'Invalid default_applying_to value'
    );
    RETURN result;
  END IF;

  -- Update user_profiles table only
  UPDATE public.user_profiles 
  SET applying_to = default_applying_to::school_program_type
  WHERE applying_to IS NULL;

  GET DIAGNOSTICS fixed_count = ROW_COUNT;

  result := json_build_object(
    'success', true,
    'fixed_count', fixed_count,
    'default_value', default_applying_to,
    'message', 'Successfully fixed ' || fixed_count || ' records'
  );

  RETURN result;
END;
$$;

-- 3. Fix get_users_needing_profile_completion function
DROP FUNCTION IF EXISTS public.get_users_needing_profile_completion();
CREATE OR REPLACE FUNCTION public.get_users_needing_profile_completion()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  full_name TEXT,
  user_profiles_applying_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  days_since_signup INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email,
    up.full_name,
    up.applying_to as user_profiles_applying_to,
    au.created_at,
    EXTRACT(DAY FROM (now() - au.created_at))::INTEGER as days_since_signup
  FROM auth.users au
  LEFT JOIN public.user_profiles up ON au.id = up.user_id
  WHERE 
    up.applying_to IS NULL
    AND au.created_at > '2024-01-01'
  ORDER BY au.created_at DESC;
END;
$$;

-- Update comments
COMMENT ON FUNCTION public.find_users_with_null_applying_to IS 'Finds all users with null applying_to values in user_profiles table.';
COMMENT ON FUNCTION public.fix_null_applying_to_users IS 'Fixes users with null applying_to values by setting them to a default value. Use with caution!';
COMMENT ON FUNCTION public.get_users_needing_profile_completion IS 'Returns users who need to complete their profile information for manual review.';
