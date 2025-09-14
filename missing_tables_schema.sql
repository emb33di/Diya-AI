-- Missing Tables Schema for Diya AI Counselor
-- Copy and paste this into Supabase SQL Editor to create missing tables

-- ==============================================
-- ESSENTIAL TABLES FOR BASIC FUNCTIONALITY
-- ==============================================

-- 1. PROFILES TABLE (Critical for authentication/onboarding)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    onboarding_complete BOOLEAN DEFAULT false,
    cumulative_onboarding_time INTEGER DEFAULT 0, -- in minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_profile_user UNIQUE(user_id)
);

-- 2. SAT SCORES TABLE (for profile completion)
CREATE TABLE IF NOT EXISTS public.sat_scores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    year_taken INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ACT SCORES TABLE (for profile completion)
CREATE TABLE IF NOT EXISTS public.act_scores (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    year_taken INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. AP/IB EXAMS TABLE (for profile completion)
CREATE TABLE IF NOT EXISTS public.ap_ib_exams (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    year_taken INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ESSAY PROMPT SELECTIONS TABLE (for essay prompts)
CREATE TABLE IF NOT EXISTS public.essay_prompt_selections (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    school_name TEXT NOT NULL,
    college_name TEXT NOT NULL,
    prompt_number TEXT NOT NULL,
    prompt TEXT NOT NULL,
    word_limit TEXT NOT NULL,
    selected BOOLEAN DEFAULT true,
    essay_content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_user_school_prompt UNIQUE(user_id, school_name, prompt_number)
);

-- ==============================================
-- CONVERSATION PROCESSING TABLES
-- ==============================================

-- 6. BRAINSTORMING SUMMARIES TABLE
CREATE TABLE IF NOT EXISTS public.brainstorming_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL,
    summary_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Ensure one summary per user per conversation
    UNIQUE(user_id, conversation_id)
);

-- 7. RESUME CONTEXT SUMMARIES TABLE
CREATE TABLE IF NOT EXISTS public.resume_context_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL,
    summary_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Ensure one summary per user per conversation
    UNIQUE(user_id, conversation_id)
);

-- ==============================================
-- SCHOOL MANAGEMENT TABLES
-- ==============================================

-- 8. SCHOOL ARCHIVE TABLE
CREATE TABLE IF NOT EXISTS public.school_archive (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    school_name TEXT NOT NULL,
    school_type TEXT,
    category TEXT CHECK (category IN ('reach', 'target', 'safety')),
    acceptance_rate TEXT,
    school_ranking TEXT,
    early_action_deadline TEXT,
    early_decision_1_deadline TEXT,
    early_decision_2_deadline TEXT,
    regular_decision_deadline TEXT,
    notes TEXT,
    student_thesis TEXT,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- ESSAY VERSIONING TABLES
-- ==============================================

-- 9. ESSAY VERSIONS TABLE (alternative to checkpoints)
CREATE TABLE IF NOT EXISTS public.essay_versions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL DEFAULT 1,
    content JSONB NOT NULL,
    version_name TEXT,
    version_description TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- ADVANCED COMMENT SYSTEM TABLES
-- ==============================================

-- 10. COMMENT THREADS TABLE (basic version)
CREATE TABLE IF NOT EXISTS public.comment_threads (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    thread_title TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. COMMENT THREADS V2 TABLE (enhanced version)
CREATE TABLE IF NOT EXISTS public.comment_threads_v2 (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    thread_title TEXT,
    thread_type TEXT DEFAULT 'general' CHECK (thread_type IN ('general', 'collaborative', 'review')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. THREAD PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.thread_participants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES comment_threads_v2(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'participant' CHECK (role IN ('owner', 'participant', 'viewer')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_thread_participant UNIQUE(thread_id, user_id)
);

-- 13. THREAD MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.thread_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES comment_threads_v2(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_content TEXT NOT NULL,
    message_type TEXT DEFAULT 'comment' CHECK (message_type IN ('comment', 'reply', 'system')),
    parent_message_id UUID REFERENCES thread_messages(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- GOOGLE DOCS-STYLE COMMENT SYSTEM TABLES
-- ==============================================

-- 14. DOCUMENT OPERATIONS TABLE (for operational transforms)
CREATE TABLE IF NOT EXISTS public.document_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Operation metadata
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('insert', 'delete', 'retain', 'format')),
    position INTEGER NOT NULL, -- Character position in document
    length INTEGER NOT NULL, -- Length of operation
    text_content TEXT, -- Text being inserted (for insert operations)
    
    -- OT-specific fields
    operation_id VARCHAR(64) NOT NULL, -- Unique operation identifier
    parent_operation_id VARCHAR(64), -- For operation chaining
    timestamp BIGINT NOT NULL, -- High-precision timestamp for ordering
    client_id VARCHAR(64) NOT NULL, -- Client that generated the operation
    
    -- Version control
    document_version INTEGER NOT NULL, -- Document version after this operation
    operation_version INTEGER NOT NULL, -- Version of this specific operation
    
    -- Status
    applied BOOLEAN DEFAULT true,
    transformed BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. COMMENT ANCHORS TABLE (for immutable comment positions)
CREATE TABLE IF NOT EXISTS public.comment_anchors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
    comment_id UUID NOT NULL REFERENCES essay_comments(id) ON DELETE CASCADE,
    
    -- Anchor metadata
    anchor_type VARCHAR(20) NOT NULL CHECK (anchor_type IN ('text', 'position', 'paragraph')),
    start_position INTEGER NOT NULL,
    end_position INTEGER NOT NULL,
    anchor_text TEXT NOT NULL,
    
    -- Immutable properties
    document_version INTEGER NOT NULL,
    content_hash VARCHAR(64) NOT NULL, -- SHA-256 of anchored content
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. COLLABORATIVE SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.collaborative_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
    session_name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    
    -- Session metadata
    session_type VARCHAR(20) DEFAULT 'collaborative' CHECK (session_type IN ('collaborative', 'review', 'mentor')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    
    -- Session settings
    allow_comments BOOLEAN DEFAULT true,
    allow_edits BOOLEAN DEFAULT false,
    require_approval BOOLEAN DEFAULT false,
    
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_complete);

-- Test scores indexes
CREATE INDEX IF NOT EXISTS idx_sat_scores_user_id ON sat_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_act_scores_user_id ON act_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_ap_ib_exams_user_id ON ap_ib_exams(user_id);

-- Essay prompt selections indexes
CREATE INDEX IF NOT EXISTS idx_essay_prompt_selections_user_id ON essay_prompt_selections(user_id);
CREATE INDEX IF NOT EXISTS idx_essay_prompt_selections_prompt_id ON essay_prompt_selections(prompt_id);

-- Summary tables indexes
CREATE INDEX IF NOT EXISTS idx_brainstorming_summaries_user_id ON brainstorming_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_brainstorming_summaries_conversation_id ON brainstorming_summaries(conversation_id);
CREATE INDEX IF NOT EXISTS idx_resume_context_summaries_user_id ON resume_context_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_resume_context_summaries_conversation_id ON resume_context_summaries(conversation_id);

-- School archive indexes
CREATE INDEX IF NOT EXISTS idx_school_archive_user_id ON school_archive(user_id);
CREATE INDEX IF NOT EXISTS idx_school_archive_archived_at ON school_archive(archived_at);

-- Essay versions indexes
CREATE INDEX IF NOT EXISTS idx_essay_versions_essay_id ON essay_versions(essay_id);
CREATE INDEX IF NOT EXISTS idx_essay_versions_user_id ON essay_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_essay_versions_active ON essay_versions(essay_id, is_active) WHERE is_active = true;

-- Comment threads indexes
CREATE INDEX IF NOT EXISTS idx_comment_threads_essay_id ON comment_threads(essay_id);
CREATE INDEX IF NOT EXISTS idx_comment_threads_v2_essay_id ON comment_threads_v2(essay_id);
CREATE INDEX IF NOT EXISTS idx_thread_participants_thread_id ON thread_participants(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_participants_user_id ON thread_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_messages_thread_id ON thread_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_messages_user_id ON thread_messages(user_id);

-- Document operations indexes
CREATE INDEX IF NOT EXISTS idx_document_operations_essay_id ON document_operations(essay_id);
CREATE INDEX IF NOT EXISTS idx_document_operations_timestamp ON document_operations(timestamp);
CREATE INDEX IF NOT EXISTS idx_document_operations_version ON document_operations(essay_id, document_version);

-- Comment anchors indexes
CREATE INDEX IF NOT EXISTS idx_comment_anchors_essay_id ON comment_anchors(essay_id);
CREATE INDEX IF NOT EXISTS idx_comment_anchors_comment_id ON comment_anchors(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_anchors_position ON comment_anchors(essay_id, start_position, end_position);

-- Collaborative sessions indexes
CREATE INDEX IF NOT EXISTS idx_collaborative_sessions_essay_id ON collaborative_sessions(essay_id);
CREATE INDEX IF NOT EXISTS idx_collaborative_sessions_created_by ON collaborative_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_collaborative_sessions_status ON collaborative_sessions(status);

-- ==============================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ==============================================

-- Create triggers for all tables with updated_at columns
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sat_scores_updated_at
    BEFORE UPDATE ON sat_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_act_scores_updated_at
    BEFORE UPDATE ON act_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ap_ib_exams_updated_at
    BEFORE UPDATE ON ap_ib_exams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_essay_prompt_selections_updated_at
    BEFORE UPDATE ON essay_prompt_selections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brainstorming_summaries_updated_at
    BEFORE UPDATE ON brainstorming_summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resume_context_summaries_updated_at
    BEFORE UPDATE ON resume_context_summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_school_archive_updated_at
    BEFORE UPDATE ON school_archive
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_essay_versions_updated_at
    BEFORE UPDATE ON essay_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comment_threads_updated_at
    BEFORE UPDATE ON comment_threads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comment_threads_v2_updated_at
    BEFORE UPDATE ON comment_threads_v2
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_thread_messages_updated_at
    BEFORE UPDATE ON thread_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collaborative_sessions_updated_at
    BEFORE UPDATE ON collaborative_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sat_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.act_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ap_ib_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essay_prompt_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brainstorming_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_context_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essay_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_threads_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thread_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborative_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own profile" ON profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Test scores policies
CREATE POLICY "Users can view their own test scores" ON sat_scores
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own test scores" ON sat_scores
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own test scores" ON sat_scores
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own test scores" ON sat_scores
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own ACT scores" ON act_scores
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ACT scores" ON act_scores
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ACT scores" ON act_scores
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ACT scores" ON act_scores
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own AP/IB exams" ON ap_ib_exams
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own AP/IB exams" ON ap_ib_exams
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own AP/IB exams" ON ap_ib_exams
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own AP/IB exams" ON ap_ib_exams
    FOR DELETE USING (auth.uid() = user_id);

-- Essay prompt selections policies
CREATE POLICY "Users can view their own prompt selections" ON essay_prompt_selections
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own prompt selections" ON essay_prompt_selections
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own prompt selections" ON essay_prompt_selections
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own prompt selections" ON essay_prompt_selections
    FOR DELETE USING (auth.uid() = user_id);

-- Summary tables policies
CREATE POLICY "Users can view their own brainstorming summaries" ON brainstorming_summaries
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own brainstorming summaries" ON brainstorming_summaries
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own brainstorming summaries" ON brainstorming_summaries
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own brainstorming summaries" ON brainstorming_summaries
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own resume context summaries" ON resume_context_summaries
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own resume context summaries" ON resume_context_summaries
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own resume context summaries" ON resume_context_summaries
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own resume context summaries" ON resume_context_summaries
    FOR DELETE USING (auth.uid() = user_id);

-- School archive policies
CREATE POLICY "Users can view their own archived schools" ON school_archive
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own archived schools" ON school_archive
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own archived schools" ON school_archive
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own archived schools" ON school_archive
    FOR DELETE USING (auth.uid() = user_id);

-- Essay versions policies
CREATE POLICY "Users can view their own essay versions" ON essay_versions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own essay versions" ON essay_versions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own essay versions" ON essay_versions
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own essay versions" ON essay_versions
    FOR DELETE USING (auth.uid() = user_id);

-- Comment threads policies
CREATE POLICY "Users can view their own comment threads" ON comment_threads
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own comment threads" ON comment_threads
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comment threads" ON comment_threads
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comment threads" ON comment_threads
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own comment threads v2" ON comment_threads_v2
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own comment threads v2" ON comment_threads_v2
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comment threads v2" ON comment_threads_v2
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comment threads v2" ON comment_threads_v2
    FOR DELETE USING (auth.uid() = user_id);

-- Thread participants policies
CREATE POLICY "Users can view thread participants" ON thread_participants
    FOR SELECT USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM comment_threads_v2 ct 
        WHERE ct.id = thread_participants.thread_id 
        AND ct.user_id = auth.uid()
    ));
CREATE POLICY "Users can insert thread participants" ON thread_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update thread participants" ON thread_participants
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete thread participants" ON thread_participants
    FOR DELETE USING (auth.uid() = user_id);

-- Thread messages policies
CREATE POLICY "Users can view thread messages" ON thread_messages
    FOR SELECT USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM comment_threads_v2 ct 
        WHERE ct.id = thread_messages.thread_id 
        AND ct.user_id = auth.uid()
    ));
CREATE POLICY "Users can insert thread messages" ON thread_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update thread messages" ON thread_messages
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete thread messages" ON thread_messages
    FOR DELETE USING (auth.uid() = user_id);

-- Document operations policies
CREATE POLICY "Users can view their own document operations" ON document_operations
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own document operations" ON document_operations
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own document operations" ON document_operations
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own document operations" ON document_operations
    FOR DELETE USING (auth.uid() = user_id);

-- Comment anchors policies
CREATE POLICY "Users can view their own comment anchors" ON comment_anchors
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM essay_comments ec 
        WHERE ec.id = comment_anchors.comment_id 
        AND ec.user_id = auth.uid()
    ));
CREATE POLICY "Users can insert their own comment anchors" ON comment_anchors
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM essay_comments ec 
        WHERE ec.id = comment_anchors.comment_id 
        AND ec.user_id = auth.uid()
    ));
CREATE POLICY "Users can update their own comment anchors" ON comment_anchors
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM essay_comments ec 
        WHERE ec.id = comment_anchors.comment_id 
        AND ec.user_id = auth.uid()
    ));
CREATE POLICY "Users can delete their own comment anchors" ON comment_anchors
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM essay_comments ec 
        WHERE ec.id = comment_anchors.comment_id 
        AND ec.user_id = auth.uid()
    ));

-- Collaborative sessions policies
CREATE POLICY "Users can view their own collaborative sessions" ON collaborative_sessions
    FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Users can insert their own collaborative sessions" ON collaborative_sessions
    FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their own collaborative sessions" ON collaborative_sessions
    FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own collaborative sessions" ON collaborative_sessions
    FOR DELETE USING (auth.uid() = created_by);

-- ==============================================
-- GRANT PERMISSIONS
-- ==============================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'Missing tables schema setup completed successfully!';
    RAISE NOTICE 'Created 16 missing tables with proper indexes, triggers, and RLS policies.';
END $$;
