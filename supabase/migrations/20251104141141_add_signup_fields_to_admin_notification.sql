-- Update admin notification to include hear_about_us, hear_about_other, and is_early_user fields
-- This migration updates the notify_admin_of_new_user function to extract and send additional signup information

-- Create updated function that includes hear_about_us, hear_about_other, and is_early_user
-- Using CREATE OR REPLACE so we don't need to drop the trigger first
CREATE OR REPLACE FUNCTION public.notify_admin_of_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT := 'https://oliclbcxukqddxlfxuuc.supabase.co';
  full_name_value TEXT;
  applying_to_value TEXT;
  hear_about_us_value TEXT;
  hear_about_other_value TEXT;
  is_early_user_value BOOLEAN;
  request_id BIGINT;
BEGIN
  -- Extract all metadata fields
  full_name_value := NEW.raw_user_meta_data ->> 'full_name';
  applying_to_value := NEW.raw_user_meta_data ->> 'applying_to';
  hear_about_us_value := NEW.raw_user_meta_data ->> 'hear_about_us';
  hear_about_other_value := NEW.raw_user_meta_data ->> 'hear_about_other';
  
  -- Check if user is early access (can be in metadata as boolean or string)
  IF NEW.raw_user_meta_data ? 'is_early_user' THEN
    -- Handle both boolean and string representations
    IF jsonb_typeof(NEW.raw_user_meta_data -> 'is_early_user') = 'boolean' THEN
      is_early_user_value := (NEW.raw_user_meta_data -> 'is_early_user')::boolean;
    ELSIF jsonb_typeof(NEW.raw_user_meta_data -> 'is_early_user') = 'string' THEN
      is_early_user_value := (NEW.raw_user_meta_data ->> 'is_early_user')::boolean;
    ELSE
      is_early_user_value := false;
    END IF;
  ELSE
    is_early_user_value := false;
  END IF;
  
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
        'hearAboutUs', hear_about_us_value,
        'hearAboutOther', hear_about_other_value,
        'isEarlyUser', is_early_user_value,
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

-- Trigger already exists and will automatically use the updated function
-- No need to recreate it

-- Add comment
COMMENT ON FUNCTION public.notify_admin_of_new_user IS 
'Sends an email notification to mihir@meetdiya.com when a new user signs up. Includes hear_about_us, hear_about_other, and is_early_user fields. Uses the send-admin-signup-notification edge function via pg_net.';

