-- Migration to add admin notification when a new user signs up
-- This will send an email to mihir@meetdiya.com whenever someone creates an account

-- Create function to invoke the admin notification edge function
CREATE OR REPLACE FUNCTION public.notify_admin_of_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  full_name_value TEXT;
  applying_to_value TEXT;
  response_status INT;
BEGIN
  -- Get Supabase URL and service role key from environment
  -- These are available in the database as configuration parameters
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- Use default URL if not configured
  IF supabase_url IS NULL THEN
    supabase_url := 'https://oliclbcxukqddxlfxuuc.supabase.co';
  END IF;
  
  -- Extract full name and applying_to from metadata if available
  full_name_value := NEW.raw_user_meta_data ->> 'full_name';
  applying_to_value := NEW.raw_user_meta_data ->> 'applying_to';
  
  -- Log the notification attempt
  RAISE LOG 'Sending admin notification for new user: % (%, %)', 
    NEW.email, NEW.id, full_name_value;
  
  -- Call the edge function to send admin notification email
  -- Using pg_net extension if available, otherwise log only
  BEGIN
    -- Try to send the notification using http extension if available
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-admin-signup-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      ),
      body := jsonb_build_object(
        'userId', NEW.id::text,
        'email', NEW.email,
        'fullName', full_name_value,
        'applyingTo', applying_to_value,
        'createdAt', NEW.created_at::text
      )
    );
    
    RAISE LOG 'Admin notification request sent for user: %', NEW.email;
    
  EXCEPTION
    WHEN undefined_function THEN
      -- If net.http_post is not available, just log a warning
      RAISE WARNING 'net.http_post not available. Admin notification not sent for user: %', NEW.email;
    WHEN OTHERS THEN
      -- Log any other errors but don't fail the user creation
      RAISE WARNING 'Error sending admin notification for user %: %', NEW.email, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Create trigger to run after user creation
-- This runs AFTER the handle_new_user trigger (they're ordered alphabetically by trigger name)
CREATE TRIGGER zz_notify_admin_on_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_of_new_user();

-- Add comment explaining the function (not the trigger, as we don't have permissions for auth.users)
COMMENT ON FUNCTION public.notify_admin_of_new_user IS 
'Sends an email notification to mihir@meetdiya.com when a new user signs up. Uses the send-admin-signup-notification edge function.';

