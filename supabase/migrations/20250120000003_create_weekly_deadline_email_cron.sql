-- Create a cron job to send weekly deadline reminder emails
-- This will run every Monday at 9:00 AM UTC

-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to call the weekly deadline emails Edge Function
CREATE OR REPLACE FUNCTION trigger_weekly_deadline_emails()
RETURNS void AS $$
BEGIN
  -- Call the weekly-deadline-emails Edge Function
  PERFORM net.http_post(
    url := 'https://oliclbcxukqddxlfxuuc.supabase.co/functions/v1/weekly-deadline-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'trigger', 'cron',
      'timestamp', now()
    )
  );
  
  -- Log the execution
  INSERT INTO cron.job_run_details (jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time)
  VALUES (
    (SELECT jobid FROM cron.job WHERE jobname = 'weekly-deadline-emails'),
    nextval('cron.runid_seq'),
    pg_backend_pid(),
    current_database(),
    current_user,
    'trigger_weekly_deadline_emails()',
    'succeeded',
    'Weekly deadline emails triggered successfully',
    now(),
    now()
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Log any errors
  INSERT INTO cron.job_run_details (jobid, runid, job_pid, database, username, command, status, return_message, start_time, end_time)
  VALUES (
    (SELECT jobid FROM cron.job WHERE jobname = 'weekly-deadline-emails'),
    nextval('cron.runid_seq'),
    pg_backend_pid(),
    current_database(),
    current_user,
    'trigger_weekly_deadline_emails()',
    'failed',
    'Error: ' || SQLERRM,
    now(),
    now()
  );
  
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cron job to run every Monday at 9:00 AM UTC
-- This will send weekly deadline reminder emails
SELECT cron.schedule(
  'weekly-deadline-emails',
  '0 9 * * 1', -- Every Monday at 9:00 AM UTC
  'SELECT trigger_weekly_deadline_emails();'
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA cron TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION trigger_weekly_deadline_emails() TO postgres, anon, authenticated, service_role;

-- Add comment explaining the cron job
COMMENT ON FUNCTION trigger_weekly_deadline_emails() IS 'Triggers weekly deadline reminder emails via Edge Function';
