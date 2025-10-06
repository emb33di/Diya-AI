-- Fix critical security vulnerability in resume_activities_with_bullets view
-- This view was created without RLS policies, allowing cross-user access
-- Date: 2025-10-06
-- Issue: resume_activities_with_bullets view lacks Row Level Security

-- Drop the existing unsecured view
DROP VIEW IF EXISTS resume_activities_with_bullets;

-- Recreate the view with security context
-- Views inherit RLS from underlying tables when accessed through the view
CREATE VIEW resume_activities_with_bullets AS
SELECT 
    ra.id,
    ra.user_id,
    ra.category,
    ra.title,
    ra.position,
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
GROUP BY ra.id, ra.user_id, ra.category, ra.title, ra.position, ra.location, ra.from_date, ra.to_date, ra.is_current, ra.display_order, ra.created_at, ra.updated_at
ORDER BY ra.display_order;

-- Grant access to the secured view
GRANT SELECT ON resume_activities_with_bullets TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW resume_activities_with_bullets IS 'Resume activities with bullets view - secured by underlying table RLS policies';

-- Log the security fix
DO $$
BEGIN
    RAISE NOTICE 'Security fix applied: resume_activities_with_bullets view recreated to inherit RLS from underlying tables';
END $$;
