-- Remove create_user_profiles_atomic function
-- The database trigger handle_new_user already creates user_profiles records successfully
-- This eliminates redundant functionality and confusing error messages

DROP FUNCTION IF EXISTS public.create_user_profiles_atomic(UUID, TEXT, TEXT, TEXT, TEXT);
