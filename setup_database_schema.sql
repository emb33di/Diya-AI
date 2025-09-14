-- Complete Database Schema Setup for Diya AI Counselor
-- Project ID: oliclbcxukqddxlfxuuc
-- This script creates all necessary tables, indexes, and policies

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types/enums
CREATE TYPE citizenship_status AS ENUM ('U.S. Citizen', 'Permanent Resident', 'International Student', 'Other');
CREATE TYPE college_size AS ENUM ('Small (< 2,000 students)', 'Medium (2,000 - 15,000 students)', 'Large (> 15,000 students)');
CREATE TYPE college_setting AS ENUM ('Urban', 'Suburban', 'Rural', 'College Town');
CREATE TYPE geographic_preference AS ENUM ('In-state', 'Out-of-state', 'Northeast', 'West Coast', 'No Preference');
CREATE TYPE college_budget AS ENUM ('< $20,000', '$20,000 - $35,000', '$35,000 - $50,000', '$50,000 - $70,000', '> $70,000');
CREATE TYPE financial_aid_importance AS ENUM ('Crucial', 'Very Important', 'Somewhat Important', 'Not a factor');

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Personal Information
    full_name TEXT,
    preferred_name TEXT,
    date_of_birth DATE,
    email_address TEXT,
    phone_number TEXT,
    street_address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    citizenship_status citizenship_status,
    
    -- Academic Profile
    high_school_name TEXT,
    high_school_graduation_year INTEGER,
    gpa_unweighted DECIMAL(3,2),
    gpa_weighted DECIMAL(3,2),
    class_rank TEXT,
    sat_score INTEGER,
    act_score INTEGER,
    intended_majors TEXT,
    secondary_major_minor_interests TEXT,
    career_interests TEXT,
    
    -- College Preferences
    ideal_college_size college_size,
    ideal_college_setting college_setting,
    geographic_preference geographic_preference,
    must_haves TEXT,
    deal_breakers TEXT,
    
    -- Financial Information
    college_budget college_budget,
    financial_aid_importance financial_aid_importance,
    scholarship_interests TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    CONSTRAINT unique_user_profile UNIQUE(user_id)
);

-- Create essays table
CREATE TABLE IF NOT EXISTS public.essays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    prompt_id UUID,
    school_name TEXT,
    word_count INTEGER DEFAULT 0,
    character_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'final', 'submitted')),
    last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Custom essay fields
    prompt_text TEXT,
    word_limit TEXT
);

-- Create essay_prompts table
CREATE TABLE IF NOT EXISTS public.essay_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    prompt_text TEXT NOT NULL,
    word_limit TEXT,
    category TEXT,
    school_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create essay_checkpoints table
CREATE TABLE IF NOT EXISTS public.essay_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Checkpoint metadata
    checkpoint_number INTEGER NOT NULL DEFAULT 1,
    essay_content TEXT NOT NULL,
    essay_title TEXT,
    essay_prompt TEXT,
    
    -- AI feedback metadata
    ai_feedback_generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ai_model VARCHAR(50) DEFAULT 'gemini-2.5-flash-lite',
    total_comments INTEGER DEFAULT 0,
    
    -- Comment counts by category
    overall_comments INTEGER DEFAULT 0,
    inline_comments INTEGER DEFAULT 0,
    opening_sentence_comments INTEGER DEFAULT 0,
    transition_comments INTEGER DEFAULT 0,
    paragraph_specific_comments INTEGER DEFAULT 0,
    
    -- Quality metrics
    average_confidence_score DECIMAL(3,2),
    average_quality_score DECIMAL(3,2),
    
    -- Status
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create essay_comments table
CREATE TABLE IF NOT EXISTS public.essay_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
    checkpoint_id UUID REFERENCES essay_checkpoints(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Comment content
    text_selection JSONB NOT NULL,
    anchor_text TEXT NOT NULL,
    comment_text TEXT NOT NULL,
    comment_type TEXT NOT NULL CHECK (comment_type IN ('suggestion', 'critique', 'praise', 'question')),
    
    -- AI metadata
    ai_generated BOOLEAN DEFAULT false,
    ai_model TEXT,
    confidence_score DECIMAL(3,2),
    
    -- Comment categorization
    comment_category TEXT CHECK (comment_category IN ('overall', 'inline')),
    comment_subcategory TEXT CHECK (comment_subcategory IN ('opening', 'body', 'conclusion', 'opening-sentence', 'transition', 'paragraph-specific', 'paragraph-quality', 'final-sentence')),
    agent_type TEXT CHECK (agent_type IN ('big-picture', 'paragraph', 'weaknesses', 'strengths', 'reconciliation', 'tone', 'clarity', 'grammar_spelling', 'editor-chief')),
    
    -- Scoring fields
    paragraph_index INTEGER,
    transition_score INTEGER,
    transition_score_color TEXT,
    opening_sentence_score INTEGER,
    opening_sentence_score_color TEXT,
    paragraph_quality_score INTEGER,
    paragraph_quality_score_color TEXT,
    final_sentence_score INTEGER,
    final_sentence_score_color TEXT,
    
    -- Status and organization
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    paragraph_id TEXT,
    organization_category TEXT CHECK (organization_category IN ('overall-strength', 'overall-weakness', 'inline')),
    reconciliation_source TEXT CHECK (reconciliation_source IN ('strength', 'weakness', 'both', 'none')),
    chronological_position INTEGER,
    
    -- User feedback
    user_feedback_helpful BOOLEAN,
    
    -- Additional metadata
    comment_nature TEXT CHECK (comment_nature IN ('strength', 'weakness', 'combined', 'neutral')),
    comment_quality_score DECIMAL(3,2),
    is_duplicate BOOLEAN DEFAULT false,
    duplicate_of_comment_id UUID,
    anchor_text_validated BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create school_recommendations table
CREATE TABLE IF NOT EXISTS public.school_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    school TEXT NOT NULL,
    school_type TEXT,
    school_ranking TEXT,
    acceptance_rate TEXT,
    ed_deadline TEXT,
    first_round_deadline TEXT,
    notes TEXT,
    student_thesis TEXT,
    category TEXT,
    
    -- Deadline fields
    early_action_deadline TEXT,
    early_decision_1_deadline TEXT,
    early_decision_2_deadline TEXT,
    regular_decision_deadline TEXT,
    application_status TEXT DEFAULT 'not_started',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversation_tracking table
CREATE TABLE IF NOT EXISTS public.conversation_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    conversation_type TEXT DEFAULT 'general',
    status TEXT DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversation_metadata table
CREATE TABLE IF NOT EXISTS public.conversation_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversation_tracking(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transcript TEXT,
    summary TEXT,
    key_topics TEXT[],
    action_items TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create school_deadlines table
CREATE TABLE IF NOT EXISTS public.school_deadlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name TEXT NOT NULL,
    early_action_deadline TEXT,
    early_decision_1_deadline TEXT,
    early_decision_2_deadline TEXT,
    regular_decision_deadline TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create resume_versions table
CREATE TABLE IF NOT EXISTS public.resume_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    content JSONB NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_essays_user_id ON essays(user_id);
CREATE INDEX IF NOT EXISTS idx_essays_school_name ON essays(school_name);
CREATE INDEX IF NOT EXISTS idx_essays_prompt_id ON essays(prompt_id);
CREATE INDEX IF NOT EXISTS idx_essays_status ON essays(status);
CREATE INDEX IF NOT EXISTS idx_essay_checkpoints_essay_id ON essay_checkpoints(essay_id);
CREATE INDEX IF NOT EXISTS idx_essay_checkpoints_user_id ON essay_checkpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_essay_checkpoints_active ON essay_checkpoints(essay_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_essay_comments_essay_id ON essay_comments(essay_id);
CREATE INDEX IF NOT EXISTS idx_essay_comments_checkpoint_id ON essay_comments(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_essay_comments_user_id ON essay_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_school_recommendations_student_id ON school_recommendations(student_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tracking_user_id ON conversation_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_metadata_conversation_id ON conversation_metadata(conversation_id);

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_essays_updated_at
    BEFORE UPDATE ON essays
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_essay_checkpoints_updated_at
    BEFORE UPDATE ON essay_checkpoints
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_essay_comments_updated_at
    BEFORE UPDATE ON essay_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_school_recommendations_updated_at
    BEFORE UPDATE ON school_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_tracking_updated_at
    BEFORE UPDATE ON conversation_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversation_metadata_updated_at
    BEFORE UPDATE ON conversation_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resume_versions_updated_at
    BEFORE UPDATE ON resume_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essay_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essay_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essay_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_versions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" ON user_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for essays
CREATE POLICY "Users can view their own essays" ON essays
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own essays" ON essays
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own essays" ON essays
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own essays" ON essays
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for essay_prompts (public read access)
CREATE POLICY "Anyone can view essay prompts" ON essay_prompts
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert essay prompts" ON essay_prompts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create RLS policies for essay_checkpoints
CREATE POLICY "Users can view their own essay checkpoints" ON essay_checkpoints
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own essay checkpoints" ON essay_checkpoints
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own essay checkpoints" ON essay_checkpoints
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own essay checkpoints" ON essay_checkpoints
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for essay_comments
CREATE POLICY "Users can view their own essay comments" ON essay_comments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own essay comments" ON essay_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own essay comments" ON essay_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own essay comments" ON essay_comments
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for school_recommendations
CREATE POLICY "Users can view their own school recommendations" ON school_recommendations
    FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Users can insert their own school recommendations" ON school_recommendations
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can update their own school recommendations" ON school_recommendations
    FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Users can delete their own school recommendations" ON school_recommendations
    FOR DELETE USING (auth.uid() = student_id);

-- Create RLS policies for conversation_tracking
CREATE POLICY "Users can view their own conversations" ON conversation_tracking
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" ON conversation_tracking
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" ON conversation_tracking
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations" ON conversation_tracking
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for conversation_metadata
CREATE POLICY "Users can view their own conversation metadata" ON conversation_metadata
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversation metadata" ON conversation_metadata
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation metadata" ON conversation_metadata
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversation metadata" ON conversation_metadata
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for resume_versions
CREATE POLICY "Users can view their own resume versions" ON resume_versions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resume versions" ON resume_versions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resume versions" ON resume_versions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resume versions" ON resume_versions
    FOR DELETE USING (auth.uid() = user_id);

-- Insert sample essay prompts
INSERT INTO essay_prompts (title, prompt_text, word_limit, category, school_name) VALUES
('Common App Personal Statement', 'Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it. If this sounds like you, then please share your story.', '650 words', 'common_app', 'Common Application'),
('Why This College', 'Why are you interested in attending [College Name]?', '250 words', 'supplemental', 'General'),
('Academic Interest', 'Describe your academic interests and how you plan to pursue them at [College Name].', '300 words', 'supplemental', 'General'),
('Leadership Experience', 'Describe a time when you demonstrated leadership and how it has shaped your perspective.', '500 words', 'supplemental', 'General'),
('Challenge Overcome', 'Describe a significant challenge you have faced and how you overcame it.', '400 words', 'supplemental', 'General')
ON CONFLICT DO NOTHING;

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_essay_checkpoints_unique_active ON essay_checkpoints(essay_id) WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_resume_versions_unique_active ON resume_versions(user_id) WHERE is_active = true;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database schema setup completed successfully for project oliclbcxukqddxlfxuuc';
END $$;
