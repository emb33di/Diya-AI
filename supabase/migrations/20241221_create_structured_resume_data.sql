-- Create structured_resume_data table for storing extracted resume content
CREATE TABLE IF NOT EXISTS structured_resume_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    original_filename TEXT NOT NULL,
    original_file_type TEXT NOT NULL,
    original_file_size BIGINT NOT NULL,
    
    -- Structured resume content
    structured_data JSONB NOT NULL,
    
    -- Processing metadata
    extraction_status TEXT NOT NULL DEFAULT 'processing' CHECK (extraction_status IN ('processing', 'completed', 'error')),
    extraction_error TEXT,
    
    -- Timestamps
    upload_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure unique version per user
    UNIQUE(user_id, version)
);

-- Create resume_feedback table for storing AI feedback on structured data
CREATE TABLE IF NOT EXISTS resume_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resume_data_id UUID NOT NULL REFERENCES structured_resume_data(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- AI feedback data
    feedback_data JSONB NOT NULL,
    
    -- Processing metadata
    feedback_status TEXT NOT NULL DEFAULT 'processing' CHECK (feedback_status IN ('processing', 'completed', 'error')),
    feedback_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create resume_generated_files table for storing generated resume outputs
CREATE TABLE IF NOT EXISTS resume_generated_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resume_data_id UUID NOT NULL REFERENCES structured_resume_data(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Generated file metadata
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx')),
    file_content BYTEA NOT NULL, -- Store file content directly
    file_size BIGINT NOT NULL,
    
    -- Generation metadata
    generation_status TEXT NOT NULL DEFAULT 'processing' CHECK (generation_status IN ('processing', 'completed', 'error')),
    generation_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_structured_resume_data_user_id ON structured_resume_data(user_id);
CREATE INDEX IF NOT EXISTS idx_structured_resume_data_status ON structured_resume_data(extraction_status);
CREATE INDEX IF NOT EXISTS idx_structured_resume_data_upload_date ON structured_resume_data(upload_date);

CREATE INDEX IF NOT EXISTS idx_resume_feedback_resume_data_id ON resume_feedback(resume_data_id);
CREATE INDEX IF NOT EXISTS idx_resume_feedback_user_id ON resume_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_feedback_status ON resume_feedback(feedback_status);

CREATE INDEX IF NOT EXISTS idx_resume_generated_files_resume_data_id ON resume_generated_files(resume_data_id);
CREATE INDEX IF NOT EXISTS idx_resume_generated_files_user_id ON resume_generated_files(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_generated_files_type ON resume_generated_files(file_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_structured_resume_data_updated_at 
    BEFORE UPDATE ON structured_resume_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resume_feedback_updated_at 
    BEFORE UPDATE ON resume_feedback 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resume_generated_files_updated_at 
    BEFORE UPDATE ON resume_generated_files 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE structured_resume_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_generated_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for structured_resume_data
CREATE POLICY "Users can view their own structured resume data" ON structured_resume_data
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own structured resume data" ON structured_resume_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own structured resume data" ON structured_resume_data
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own structured resume data" ON structured_resume_data
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for resume_feedback
CREATE POLICY "Users can view their own resume feedback" ON resume_feedback
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resume feedback" ON resume_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resume feedback" ON resume_feedback
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resume feedback" ON resume_feedback
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for resume_generated_files
CREATE POLICY "Users can view their own generated resume files" ON resume_generated_files
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generated resume files" ON resume_generated_files
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generated resume files" ON resume_generated_files
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generated resume files" ON resume_generated_files
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to get next version number for a user
CREATE OR REPLACE FUNCTION get_next_structured_resume_version(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version), 0) + 1
    INTO next_version
    FROM structured_resume_data
    WHERE user_id = p_user_id;
    
    RETURN next_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON structured_resume_data TO authenticated;
GRANT ALL ON resume_feedback TO authenticated;
GRANT ALL ON resume_generated_files TO authenticated;
GRANT EXECUTE ON FUNCTION get_next_structured_resume_version(UUID) TO authenticated;
