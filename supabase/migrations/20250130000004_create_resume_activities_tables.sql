-- Create resume_activities table to store individual resume entries
CREATE TABLE resume_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('academic', 'experience', 'projects', 'extracurricular', 'volunteering', 'skills', 'interests', 'languages')),
    title TEXT NOT NULL,
    position TEXT,
    from_date TEXT, -- MM/YYYY format
    to_date TEXT,   -- MM/YYYY format
    is_current BOOLEAN DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0, -- For maintaining order within category
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create resume_activity_bullets table to store bullet points for activities
CREATE TABLE resume_activity_bullets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID NOT NULL REFERENCES resume_activities(id) ON DELETE CASCADE,
    bullet_text TEXT NOT NULL,
    bullet_order INTEGER NOT NULL DEFAULT 0, -- For maintaining order within activity
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_resume_activities_user_id ON resume_activities(user_id);
CREATE INDEX idx_resume_activities_category ON resume_activities(category);
CREATE INDEX idx_resume_activities_display_order ON resume_activities(display_order);
CREATE INDEX idx_resume_activity_bullets_activity_id ON resume_activity_bullets(activity_id);
CREATE INDEX idx_resume_activity_bullets_order ON resume_activity_bullets(bullet_order);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_resume_activities_updated_at 
    BEFORE UPDATE ON resume_activities 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resume_activity_bullets_updated_at 
    BEFORE UPDATE ON resume_activity_bullets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE resume_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_activity_bullets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for resume_activities
CREATE POLICY "Users can view their own resume activities" ON resume_activities
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resume activities" ON resume_activities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resume activities" ON resume_activities
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resume activities" ON resume_activities
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for resume_activity_bullets
CREATE POLICY "Users can view bullets for their activities" ON resume_activity_bullets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM resume_activities 
            WHERE resume_activities.id = resume_activity_bullets.activity_id 
            AND resume_activities.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert bullets for their activities" ON resume_activity_bullets
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM resume_activities 
            WHERE resume_activities.id = resume_activity_bullets.activity_id 
            AND resume_activities.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update bullets for their activities" ON resume_activity_bullets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM resume_activities 
            WHERE resume_activities.id = resume_activity_bullets.activity_id 
            AND resume_activities.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete bullets for their activities" ON resume_activity_bullets
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM resume_activities 
            WHERE resume_activities.id = resume_activity_bullets.activity_id 
            AND resume_activities.user_id = auth.uid()
        )
    );

-- Create a view for easy querying of complete resume data
CREATE VIEW resume_activities_with_bullets AS
SELECT 
    ra.id,
    ra.user_id,
    ra.category,
    ra.title,
    ra.position,
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
GROUP BY ra.id, ra.user_id, ra.category, ra.title, ra.position, ra.from_date, ra.to_date, ra.is_current, ra.display_order, ra.created_at, ra.updated_at
ORDER BY ra.display_order;

-- Grant access to the view
GRANT SELECT ON resume_activities_with_bullets TO authenticated;
