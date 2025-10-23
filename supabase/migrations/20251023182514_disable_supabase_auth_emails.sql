-- Migration to disable Supabase's built-in email service
-- This approach creates a simple function that can be used as an auth hook
-- Note: This may need to be configured in the Supabase dashboard as well

-- Create a simple no-op function in the public schema
CREATE OR REPLACE FUNCTION public.disable_auth_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function does nothing, effectively disabling auth emails
  -- when used as a custom auth hook in Supabase dashboard
  RETURN;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.disable_auth_emails() TO service_role;
GRANT EXECUTE ON FUNCTION public.disable_auth_emails() TO anon;
GRANT EXECUTE ON FUNCTION public.disable_auth_emails() TO authenticated;
