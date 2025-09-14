-- Create a trigger to automatically send confirmation emails when users join the waitlist

-- First, create a function that will call both Edge Functions
CREATE OR REPLACE FUNCTION send_waitlist_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the confirmation email function (to user)
  PERFORM net.http_post(
    url := 'https://oliclbcxukqddxlfxuuc.supabase.co/functions/v1/waitlist-confirmation',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'schema', 'public',
      'table', 'waitlist',
      'record', row_to_json(NEW)
    )
  );
  
  -- Call the admin notification email function
  PERFORM net.http_post(
    url := 'https://oliclbcxukqddxlfxuuc.supabase.co/functions/v1/waitlist-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'schema', 'public',
      'table', 'waitlist',
      'record', row_to_json(NEW)
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger that fires after INSERT on waitlist table
DROP TRIGGER IF EXISTS on_waitlist_signup ON waitlist;
CREATE TRIGGER on_waitlist_signup
  AFTER INSERT ON waitlist
  FOR EACH ROW
  EXECUTE FUNCTION send_waitlist_confirmation();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION net.http_post TO postgres, anon, authenticated, service_role;
