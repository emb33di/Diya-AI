-- Update trigger to call both waitlist-confirmation and waitlist-email functions

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

-- The trigger already exists, so we don't need to recreate it
-- It will now use the updated function that calls both endpoints
