-- Add comment and grant permissions for atomic function
COMMENT ON FUNCTION public.create_user_profiles_atomic IS 'Atomic function to create/update user_profiles with complete data. Consolidated from dual-table approach.';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.create_user_profiles_atomic TO authenticated;
