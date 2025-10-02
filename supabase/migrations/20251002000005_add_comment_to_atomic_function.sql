-- Add comment to the fixed atomic function
COMMENT ON FUNCTION public.create_user_profiles_atomic IS 'Atomic function to create/update user_profiles. Fixed to remove references to deleted profiles table.';
