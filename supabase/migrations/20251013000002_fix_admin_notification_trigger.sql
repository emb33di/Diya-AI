-- Fix the admin notification trigger to properly use pg_net
-- This version uses the correct pg_net.http_post syntax

DROP TRIGGER IF EXISTS zz_notify_admin_on_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.notify_admin_of_new_user();

-- Create improved function that properly uses pg_net
CREATE OR REPLACE FUNCTION public.notify_admin_of_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT := 'https://oliclbcxukqddxlfxuuc.supabase.co';
  full_name_value TEXT;
  applying_to_value TEXT;
  request_id BIGINT;
BEGIN
  -- Extract full name and applying_to from metadata if available
  full_name_value := NEW.raw_user_meta_data ->> 'full_name';
  applying_to_value := NEW.raw_user_meta_data ->> 'applying_to';
  
  -- Log the notification attempt
  RAISE LOG 'Sending admin notification for new user: % (%, %)', 
    NEW.email, NEW.id, full_name_value;
  
  -- Call the edge function to send admin notification email using pg_net
  BEGIN
    SELECT INTO request_id net.http_post(
      url := supabase_url || '/functions/v1/send-admin-signup-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'userId', NEW.id::text,
        'email', NEW.email,
        'fullName', full_name_value,
        'applyingTo', applying_to_value,
        'createdAt', NEW.created_at::text
      )
    );
    
    RAISE LOG 'Admin notification request queued with id: % for user: %', request_id, NEW.email;
    
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
CREATE TRIGGER zz_notify_admin_on_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_of_new_user();

-- Add comment
COMMENT ON FUNCTION public.notify_admin_of_new_user IS 
'Sends an email notification to mihir@meetdiya.com when a new user signs up. Uses the send-admin-signup-notification edge function via pg_net.';

