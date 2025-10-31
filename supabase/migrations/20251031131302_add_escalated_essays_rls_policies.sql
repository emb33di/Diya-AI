-- Add RLS policies for escalated_essays table
-- Students can view their own escalated essays
-- Founders can view all escalated essays

-- Policy: Students can view their own escalated essays
CREATE POLICY "Students can view their own escalated essays" ON escalated_essays
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- Policy: Students can insert their own escalations
CREATE POLICY "Students can escalate their own essays" ON escalated_essays
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND essay_id IN (SELECT id FROM essays WHERE user_id = auth.uid())
  );

-- Policy: Founders can view all escalated essays
CREATE POLICY "Founders can view all escalated essays" ON escalated_essays
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_founder = true
    )
  );

-- Policy: Founders can update escalated essays (to add feedback, change status)
CREATE POLICY "Founders can update escalated essays" ON escalated_essays
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_founder = true
    )
  );

-- Policy: Students can view founder feedback on their escalated essays
-- (Already covered by "Students can view their own escalated essays" policy)

-- Note: DELETE operations should be restricted (only founders or system cleanup)
-- For MVP, we'll prevent all deletes via RLS (no DELETE policy = no deletes allowed)

