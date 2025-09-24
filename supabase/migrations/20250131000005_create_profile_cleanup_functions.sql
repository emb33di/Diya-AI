-- Utility functions to identify and fix users with null applying_to values
-- Run these queries in Supabase SQL editor to clean up existing data

-- Function to identify users with null applying_to values
CREATE OR REPLACE FUNCTION public.find_users_with_null_applying_to()
RETURNS TABLE(
  user_id UUID,
  profiles_applying_to TEXT,
  user_profiles_applying_to TEXT,
  profiles_exists BOOLEAN,
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
    COALESCE(p.user_id, up.user_id) as user_id,
    p.applying_to as profiles_applying_to,
    up.applying_to as user_profiles_applying_to,
    (p.user_id IS NOT NULL) as profiles_exists,
    (up.user_id IS NOT NULL) as user_profiles_exists,
    au.created_at
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.user_id
  LEFT JOIN public.user_profiles up ON au.id = up.user_id
  WHERE 
    (p.applying_to IS NULL OR up.applying_to IS NULL)
    AND au.created_at > '2024-01-01' -- Only check recent users
  ORDER BY au.created_at DESC;
END;
$$;

-- Function to fix users with null applying_to by setting a default value
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

  -- Update profiles table
  UPDATE public.profiles 
  SET applying_to = default_applying_to
  WHERE applying_to IS NULL;

  GET DIAGNOSTICS fixed_count = ROW_COUNT;

  -- Update user_profiles table
  UPDATE public.user_profiles 
  SET applying_to = default_applying_to
  WHERE applying_to IS NULL;

  -- Add to count
  fixed_count := fixed_count + ROW_COUNT;

  result := json_build_object(
    'success', true,
    'fixed_count', fixed_count,
    'default_value', default_applying_to,
    'message', 'Successfully fixed ' || fixed_count || ' records'
  );

  RETURN result;
END;
$$;

-- Function to prompt users to complete their profile (for manual review)
CREATE OR REPLACE FUNCTION public.get_users_needing_profile_completion()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  full_name TEXT,
  profiles_applying_to TEXT,
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
    COALESCE(p.full_name, up.full_name) as full_name,
    p.applying_to as profiles_applying_to,
    up.applying_to as user_profiles_applying_to,
    au.created_at,
    EXTRACT(DAY FROM (now() - au.created_at))::INTEGER as days_since_signup
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.user_id
  LEFT JOIN public.user_profiles up ON au.id = up.user_id
  WHERE 
    (p.applying_to IS NULL OR up.applying_to IS NULL)
    AND au.created_at > '2024-01-01'
  ORDER BY au.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.find_users_with_null_applying_to TO authenticated;
GRANT EXECUTE ON FUNCTION public.fix_null_applying_to_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_needing_profile_completion TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.find_users_with_null_applying_to IS 'Finds all users with null applying_to values in either profiles or user_profiles tables.';
COMMENT ON FUNCTION public.fix_null_applying_to_users IS 'Fixes users with null applying_to values by setting them to a default value. Use with caution!';
COMMENT ON FUNCTION public.get_users_needing_profile_completion IS 'Returns users who need to complete their profile information for manual review.';
