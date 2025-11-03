-- Create a view to easily see pending escalations count per user
-- This joins user_profiles with escalated_essays to count pending escalations

CREATE OR REPLACE VIEW public.user_profiles_with_pending_escalations AS
SELECT 
  up.*,
  COALESCE(COUNT(ee.id) FILTER (WHERE ee.status = 'pending'), 0) AS pending_escalations_count
FROM public.user_profiles up
LEFT JOIN public.escalated_essays ee ON ee.user_id = up.user_id AND ee.status = 'pending'
GROUP BY up.id;

-- Grant access to founders/admins
-- Note: Views inherit RLS from base tables, but functions use SECURITY DEFINER
GRANT SELECT ON user_profiles_with_pending_escalations TO authenticated;
COMMENT ON VIEW user_profiles_with_pending_escalations IS 'View showing user_profiles with count of pending escalations per user';

-- Create a function to get pending escalation count for a specific user
CREATE OR REPLACE FUNCTION public.get_user_pending_escalations_count(target_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(COUNT(*), 0)
  FROM public.escalated_essays
  WHERE user_id = target_user_id
    AND status = 'pending';
$$;

COMMENT ON FUNCTION get_user_pending_escalations_count IS 'Returns the count of pending escalations for a given user_id';
GRANT EXECUTE ON FUNCTION get_user_pending_escalations_count TO authenticated;

-- Create a function for admins/founders to see all users with pending escalations
-- This makes it easy to query in admin interfaces
CREATE OR REPLACE FUNCTION public.get_users_with_pending_escalations()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email_address TEXT,
  pending_count BIGINT,
  total_escalations BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    up.user_id,
    up.full_name,
    up.email_address,
    COUNT(ee_pending.id) AS pending_count,
    COUNT(ee_all.id) AS total_escalations
  FROM public.user_profiles up
  LEFT JOIN public.escalated_essays ee_pending 
    ON ee_pending.user_id = up.user_id 
    AND ee_pending.status = 'pending'
  LEFT JOIN public.escalated_essays ee_all 
    ON ee_all.user_id = up.user_id
  GROUP BY up.user_id, up.full_name, up.email_address
  HAVING COUNT(ee_pending.id) > 0
  ORDER BY pending_count DESC;
$$;

COMMENT ON FUNCTION get_users_with_pending_escalations IS 'Returns all users who have pending escalations with counts. For admin/founder use.';
GRANT EXECUTE ON FUNCTION get_users_with_pending_escalations TO authenticated;

