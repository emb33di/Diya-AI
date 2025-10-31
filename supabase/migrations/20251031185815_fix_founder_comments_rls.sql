-- Fix RLS policy for founder_comments to allow founders to insert comments
-- The issue is that the user_profiles table RLS might block the EXISTS check
-- We'll create a security definer function or adjust the policy

-- First, let's create a helper function that can check founder status
-- This function runs with SECURITY DEFINER so it can bypass RLS on user_profiles
CREATE OR REPLACE FUNCTION public.is_user_founder(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = check_user_id
    AND user_profiles.is_founder = true
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_user_founder(UUID) TO authenticated;

-- Now drop the old INSERT policy and recreate it using the function
DROP POLICY IF EXISTS "Founders can insert comments" ON founder_comments;

CREATE POLICY "Founders can insert comments" ON founder_comments
  FOR INSERT WITH CHECK (
    public.is_user_founder(auth.uid())
  );

-- Also update the SELECT policy to allow founders to see all comments
DROP POLICY IF EXISTS "Founders can view all founder comments" ON founder_comments;

CREATE POLICY "Founders can view all founder comments" ON founder_comments
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
  );

-- Update the UPDATE and DELETE policies to use the function as well
DROP POLICY IF EXISTS "Founders can update comments" ON founder_comments;
DROP POLICY IF EXISTS "Founders can delete comments" ON founder_comments;

CREATE POLICY "Founders can update comments" ON founder_comments
  FOR UPDATE USING (
    public.is_user_founder(auth.uid())
  );

CREATE POLICY "Founders can delete comments" ON founder_comments
  FOR DELETE USING (
    public.is_user_founder(auth.uid())
  );

-- Add comment explaining the function
COMMENT ON FUNCTION public.is_user_founder(UUID) IS 'Checks if a user is a founder. Uses SECURITY DEFINER to bypass RLS on user_profiles for this check. If no parameter is provided, defaults to auth.uid().';

