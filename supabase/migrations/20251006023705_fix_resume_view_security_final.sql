-- Final security fix for resume_activities_with_bullets view
-- This ensures the view only shows current user's data
-- Date: 2025-10-06
-- Issue: resume_activities_with_bullets view was allowing cross-user access

-- Drop the insecure view
DROP VIEW IF EXISTS resume_activities_with_bullets;

-- Recreate with proper security
CREATE VIEW resume_activities_with_bullets AS
SELECT 
    ra.id,
    ra.user_id,
    ra.category,
    ra.title,
    ra."position",
    ra.location,
    ra.from_date,
    ra.to_date,
    ra.is_current,
    ra.display_order,
    ra.created_at,
    ra.updated_at,
    COALESCE(
        json_agg(
            json_build_object(
                'id', rab.id,
                'bullet_text', rab.bullet_text,
                'bullet_order', rab.bullet_order
            ) ORDER BY rab.bullet_order
        ) FILTER (WHERE rab.id IS NOT NULL),
        '[]'::json
    ) as bullets
FROM resume_activities ra
LEFT JOIN resume_activity_bullets rab ON ra.id = rab.activity_id
WHERE ra.user_id = auth.uid()  -- CRITICAL: Only show current user's data
GROUP BY ra.id, ra.user_id, ra.category, ra.title, ra."position", ra.location, ra.from_date, ra.to_date, ra.is_current, ra.display_order, ra.created_at, ra.updated_at
ORDER BY ra.display_order;

-- Grant access to authenticated users
GRANT SELECT ON resume_activities_with_bullets TO authenticated;

-- Add security comment
COMMENT ON VIEW resume_activities_with_bullets IS 'Secured view - only shows current user data';

-- Log the security fix
DO $$
BEGIN
    RAISE NOTICE 'Security fix applied: resume_activities_with_bullets view now properly secured with user-specific filtering';
END $$;
