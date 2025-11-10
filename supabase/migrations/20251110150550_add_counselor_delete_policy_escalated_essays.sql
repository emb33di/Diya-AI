-- Add RLS policy for counselors to delete escalated essays for their partner organization
-- Counselors can delete escalated essays where partner_slug matches their counselor_name

CREATE POLICY "Counselors can delete escalated essays for their partner" ON escalated_essays
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.is_counselor = true
      AND LOWER(user_profiles.counselor_name) = LOWER(escalated_essays.partner_slug)
      AND escalated_essays.partner_slug IS NOT NULL
    )
  );

COMMENT ON POLICY "Counselors can delete escalated essays for their partner" ON escalated_essays IS 
  'Allows counselors to delete escalated essays tagged with their partner_slug (case-insensitive match)';

