-- Add location field to resume_activities table
ALTER TABLE resume_activities 
ADD COLUMN location TEXT;

-- Update the view to include location field
DROP VIEW IF EXISTS resume_activities_with_bullets;

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

-- Grant access to the updated view
GRANT SELECT ON resume_activities_with_bullets TO authenticated;
