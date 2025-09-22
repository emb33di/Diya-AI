-- Create resume_versions table for storing resume uploads with version control
CREATE TABLE IF NOT EXISTS resume_versions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    upload_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    feedback JSONB,
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'error')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique version per user
    UNIQUE(user_id, version)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_resume_versions_user_id ON resume_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_versions_status ON resume_versions(status);
CREATE INDEX IF NOT EXISTS idx_resume_versions_upload_date ON resume_versions(upload_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_resume_versions_updated_at 
    BEFORE UPDATE ON resume_versions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE resume_versions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own resume versions" ON resume_versions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resume versions" ON resume_versions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resume versions" ON resume_versions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resume versions" ON resume_versions
    FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for resume files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'resume-files',
    'resume-files',
    false,
    5242880, -- 5MB limit
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Users can upload their own resume files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'resume-files' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own resume files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'resume-files' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own resume files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'resume-files' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Create function to get next version number for a user
CREATE OR REPLACE FUNCTION get_next_resume_version(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version), 0) + 1
    INTO next_version
    FROM resume_versions
    WHERE user_id = p_user_id;
    
    RETURN next_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON resume_versions TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_resume_version(UUID) TO authenticated;
