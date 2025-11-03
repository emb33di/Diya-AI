-- Migration to add founder notification when an essay is escalated
-- This will send an email to mihir@meetdiya.com whenever a student escalates an essay for review

-- Create function to invoke the founder escalation notification edge function
CREATE OR REPLACE FUNCTION public.notify_founder_of_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT := 'https://oliclbcxukqddxlfxuuc.supabase.co';
  request_id BIGINT;
BEGIN
  -- Log the notification attempt
  RAISE LOG 'Sending founder notification for escalated essay: % (Essay: %, User: %)', 
    NEW.id, NEW.essay_id, NEW.user_id;
  
  -- Call the edge function to send founder notification email using pg_net
  BEGIN
    SELECT INTO request_id net.http_post(
      url := supabase_url || '/functions/v1/send-founder-escalation-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'escalationId', NEW.id::text,
        'essayId', NEW.essay_id::text,
        'userId', NEW.user_id::text,
        'essayTitle', NEW.essay_title,
        'wordCount', COALESCE(NEW.word_count, 0),
        'characterCount', COALESCE(NEW.character_count, 0),
        'escalatedAt', NEW.escalated_at::text
      )
    );
    
    RAISE LOG 'Founder notification request queued with id: % for escalation: %', request_id, NEW.id;
    
  EXCEPTION
    WHEN undefined_function THEN
      -- If net.http_post is not available, just log a warning
      RAISE WARNING 'net.http_post not available. Founder notification not sent for escalation: %', NEW.id;
    WHEN OTHERS THEN
      -- Log error but don't fail the transaction
      RAISE WARNING 'Error sending founder notification for escalation %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Create trigger that fires on INSERT to escalated_essays
DROP TRIGGER IF EXISTS zz_notify_founder_on_escalation ON public.escalated_essays;

CREATE TRIGGER zz_notify_founder_on_escalation
  AFTER INSERT ON public.escalated_essays
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_founder_of_escalation();

-- Add comments
COMMENT ON FUNCTION public.notify_founder_of_escalation() IS 
'Sends an email notification to mihir@meetdiya.com when a student escalates an essay for review. Uses the send-founder-escalation-notification edge function via pg_net.';

