-- Create user_escalation_tracking table
-- Tracks escalation count per user to enforce 2-per-pro-cycle limit

CREATE TABLE IF NOT EXISTS public.user_escalation_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Subscription period tracking (simplified for MVP)
  -- For MVP: track total escalations, reset manually or on subscription renewal
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  escalation_count INTEGER DEFAULT 0 NOT NULL,
  max_escalations INTEGER DEFAULT 2 NOT NULL,
  
  -- Reset tracking
  last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one tracking record per user
  UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_escalation_tracking_user_id ON user_escalation_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_escalation_tracking_count ON user_escalation_tracking(escalation_count);

-- Create trigger for updated_at
CREATE TRIGGER update_user_escalation_tracking_updated_at
  BEFORE UPDATE ON user_escalation_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.user_escalation_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view/update their own escalation tracking
CREATE POLICY "Users can view their own escalation tracking" ON user_escalation_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own escalation tracking" ON user_escalation_tracking
  FOR UPDATE USING (auth.uid() = user_id);

-- Note: INSERT will be handled by edge function/service role for initial setup
-- Users don't directly insert their own tracking records

-- Add comments
COMMENT ON TABLE user_escalation_tracking IS 'Tracks escalation count per user to enforce Pro user limit of 2 escalations per subscription cycle';
COMMENT ON COLUMN user_escalation_tracking.escalation_count IS 'Current count of escalations in this cycle';
COMMENT ON COLUMN user_escalation_tracking.max_escalations IS 'Maximum escalations allowed (default 2 for Pro users)';
COMMENT ON COLUMN user_escalation_tracking.subscription_started_at IS 'When current subscription period started (for future cycle-based tracking)';
COMMENT ON COLUMN user_escalation_tracking.last_reset_at IS 'When escalation count was last reset';

