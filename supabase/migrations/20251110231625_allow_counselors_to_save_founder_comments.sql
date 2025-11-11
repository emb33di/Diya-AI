-- Allow counselors to save comments on escalated essays
-- This migration updates RLS policies on founder_comments to allow counselors
-- who have access to the escalation (matching partner_slug)

-- Create helper function to check if user is a counselor with access to an escalation
CREATE OR REPLACE FUNCTION public.is_user_counselor_for_escalation(
  check_user_id UUID DEFAULT auth.uid(),
  check_escalation_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If no escalation_id provided, just check if user is a counselor
  IF check_escalation_id IS NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = check_user_id
      AND user_profiles.is_counselor = true
    );
  END IF;

  -- Check if user is a counselor AND the escalation's partner_slug matches their counselor_name
  RETURN EXISTS (
    SELECT 1 
    FROM user_profiles up
    INNER JOIN escalated_essays ee ON LOWER(ee.partner_slug) = LOWER(up.counselor_name)
    WHERE up.user_id = check_user_id
    AND up.is_counselor = true
    AND ee.id = check_escalation_id
    AND ee.partner_slug IS NOT NULL
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_user_counselor_for_escalation(UUID, UUID) TO authenticated;

-- Update INSERT policy to allow both founders and counselors
DROP POLICY IF EXISTS "Founders can insert comments" ON founder_comments;

CREATE POLICY "Founders and counselors can insert comments" ON founder_comments
  FOR INSERT WITH CHECK (
    public.is_user_founder(auth.uid())
    OR
    public.is_user_counselor_for_escalation(auth.uid(), founder_comments.escalation_id)
  );

-- Update SELECT policy to allow counselors to view comments for their escalations
DROP POLICY IF EXISTS "Founders can view all founder comments" ON founder_comments;

CREATE POLICY "Users can view founder comments" ON founder_comments
  FOR SELECT USING (
    -- Users can view comments for their own essays
    EXISTS (
      SELECT 1 FROM essays
      WHERE essays.id = founder_comments.essay_id
      AND essays.user_id = auth.uid()
    )
    OR
    -- OR founders can view all comments
    public.is_user_founder(auth.uid())
    OR
    -- OR counselors can view comments for escalations they have access to
    public.is_user_counselor_for_escalation(auth.uid(), founder_comments.escalation_id)
  );

-- Update UPDATE policy to allow counselors
DROP POLICY IF EXISTS "Founders can update comments" ON founder_comments;

CREATE POLICY "Founders and counselors can update comments" ON founder_comments
  FOR UPDATE USING (
    public.is_user_founder(auth.uid())
    OR
    public.is_user_counselor_for_escalation(auth.uid(), founder_comments.escalation_id)
  );

-- Update DELETE policy to allow counselors
DROP POLICY IF EXISTS "Founders can delete comments" ON founder_comments;

CREATE POLICY "Founders and counselors can delete comments" ON founder_comments
  FOR DELETE USING (
    public.is_user_founder(auth.uid())
    OR
    public.is_user_counselor_for_escalation(auth.uid(), founder_comments.escalation_id)
  );

-- Add comment explaining the function
COMMENT ON FUNCTION public.is_user_counselor_for_escalation(UUID, UUID) IS 
  'Checks if a user is a counselor with access to a specific escalation. Uses SECURITY DEFINER to bypass RLS. If escalation_id is NULL, just checks if user is a counselor.';

-- Ensure save_founder_comments function is accessible to all authenticated users
-- (This should already be the case, but making it explicit)
GRANT EXECUTE ON FUNCTION public.save_founder_comments(uuid, uuid, jsonb) TO authenticated;

