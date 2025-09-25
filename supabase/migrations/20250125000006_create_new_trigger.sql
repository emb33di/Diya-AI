-- Create the trigger to create user_profiles when user signs up
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add comment explaining the consolidated approach
COMMENT ON FUNCTION public.handle_new_user IS 'Creates user_profiles record when new user signs up. No longer creates profiles table records.';

