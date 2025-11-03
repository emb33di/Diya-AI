-- Add INSERT policy for user_escalation_tracking
-- Allows users to create their own escalation tracking records when needed

-- RLS Policy: Users can insert their own escalation tracking records
CREATE POLICY "Users can insert their own escalation tracking" ON user_escalation_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

