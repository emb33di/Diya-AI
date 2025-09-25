-- Fix all missing tables and functions
-- This migration ensures all required tables and functions exist

-- ==============================================
-- 1. FIX ESSAY_PROMPTS TABLE
-- ==============================================

-- Remove any problematic columns that might exist
ALTER TABLE public.essay_prompts 
DROP COLUMN IF EXISTS category;

ALTER TABLE public.essay_prompts 
DROP COLUMN IF EXISTS school_name;

ALTER TABLE public.essay_prompts 
DROP COLUMN IF EXISTS prompt_text;

-- Ensure we have all the required columns
ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY;

ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS college_name TEXT;

ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS how_many TEXT;

ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS selection_type TEXT;

ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS prompt_number TEXT;

ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS prompt TEXT;

ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS word_limit TEXT;

ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS prompt_selection_type TEXT;

ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS school_program_type TEXT;

ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

ALTER TABLE public.essay_prompts 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Populate title for existing records if it's null
UPDATE public.essay_prompts 
SET title = college_name || ' - Prompt ' || prompt_number 
WHERE title IS NULL OR title = '';

-- Make essential columns NOT NULL
ALTER TABLE public.essay_prompts 
ALTER COLUMN title SET NOT NULL;

ALTER TABLE public.essay_prompts 
ALTER COLUMN college_name SET NOT NULL;

ALTER TABLE public.essay_prompts 
ALTER COLUMN how_many SET NOT NULL;

ALTER TABLE public.essay_prompts 
ALTER COLUMN selection_type SET NOT NULL;

ALTER TABLE public.essay_prompts 
ALTER COLUMN prompt_number SET NOT NULL;

ALTER TABLE public.essay_prompts 
ALTER COLUMN prompt SET NOT NULL;

ALTER TABLE public.essay_prompts 
ALTER COLUMN word_limit SET NOT NULL;

ALTER TABLE public.essay_prompts 
ALTER COLUMN prompt_selection_type SET NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_essay_prompts_college_name ON public.essay_prompts(college_name);
CREATE INDEX IF NOT EXISTS idx_essay_prompts_selection_type ON public.essay_prompts(selection_type);
CREATE INDEX IF NOT EXISTS idx_essay_prompts_school_program_type ON public.essay_prompts(school_program_type);

-- Ensure RLS is enabled
ALTER TABLE public.essay_prompts ENABLE ROW LEVEL SECURITY;

-- Create or replace the policy for public read access
DROP POLICY IF EXISTS "Anyone can view essay prompts" ON public.essay_prompts;
CREATE POLICY "Anyone can view essay prompts" 
ON public.essay_prompts 
FOR SELECT 
USING (true);

-- Create or replace the trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_essay_prompts_updated_at ON public.essay_prompts;
CREATE TRIGGER update_essay_prompts_updated_at
BEFORE UPDATE ON public.essay_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- 2. CREATE ESSAY_CHECKPOINTS TABLE
-- ==============================================

-- Create essay checkpoints table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.essay_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Checkpoint metadata
  checkpoint_number INTEGER NOT NULL DEFAULT 1,
  essay_content TEXT NOT NULL,
  essay_title TEXT,
  essay_prompt TEXT,
  
  -- Version management fields
  version_name VARCHAR(100),
  version_description TEXT,
  is_fresh_draft BOOLEAN DEFAULT false,
  parent_checkpoint_id UUID REFERENCES essay_checkpoints(id),
  version_number INTEGER DEFAULT 1,
  has_ai_feedback BOOLEAN DEFAULT false,
  
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
  is_active BOOLEAN DEFAULT false, -- Only one checkpoint can be active per essay
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_essay_checkpoints_essay_id ON essay_checkpoints(essay_id);
CREATE INDEX IF NOT EXISTS idx_essay_checkpoints_user_id ON essay_checkpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_essay_checkpoints_checkpoint_number ON essay_checkpoints(essay_id, checkpoint_number);
CREATE INDEX IF NOT EXISTS idx_essay_checkpoints_active ON essay_checkpoints(essay_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_essay_checkpoints_created_at ON essay_checkpoints(created_at);
CREATE INDEX IF NOT EXISTS idx_essay_checkpoints_version_number ON essay_checkpoints(essay_id, version_number);
CREATE INDEX IF NOT EXISTS idx_essay_checkpoints_parent_id ON essay_checkpoints(parent_checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_essay_checkpoints_fresh_draft ON essay_checkpoints(essay_id, is_fresh_draft);

-- Create unique constraint to ensure only one active checkpoint per essay
DROP INDEX IF EXISTS idx_essay_checkpoints_unique_active;
CREATE UNIQUE INDEX idx_essay_checkpoints_unique_active ON essay_checkpoints(essay_id) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.essay_checkpoints ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own essay checkpoints" ON essay_checkpoints;
CREATE POLICY "Users can view their own essay checkpoints" ON essay_checkpoints
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own essay checkpoints" ON essay_checkpoints;
CREATE POLICY "Users can insert their own essay checkpoints" ON essay_checkpoints
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own essay checkpoints" ON essay_checkpoints;
CREATE POLICY "Users can update their own essay checkpoints" ON essay_checkpoints
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own essay checkpoints" ON essay_checkpoints;
CREATE POLICY "Users can delete their own essay checkpoints" ON essay_checkpoints
FOR DELETE USING (auth.uid() = user_id);

-- ==============================================
-- 3. CREATE REQUIRED FUNCTIONS
-- ==============================================

-- Create function to get the next version number for an essay
CREATE OR REPLACE FUNCTION get_next_version_number(essay_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO next_version
    FROM essay_checkpoints
    WHERE essay_id = essay_uuid;
    
    RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- Create function to create a fresh draft checkpoint
CREATE OR REPLACE FUNCTION create_fresh_draft_checkpoint(
    essay_uuid UUID,
    user_uuid UUID,
    essay_content TEXT,
    essay_title TEXT DEFAULT NULL,
    essay_prompt TEXT DEFAULT NULL,
    version_name_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_checkpoint_id UUID;
    next_version INTEGER;
    parent_checkpoint_id UUID;
BEGIN
    -- Get the next version number
    next_version := get_next_version_number(essay_uuid);
    
    -- Get the most recent checkpoint as parent (if any)
    SELECT id INTO parent_checkpoint_id
    FROM essay_checkpoints
    WHERE essay_id = essay_uuid
    ORDER BY version_number DESC
    LIMIT 1;
    
    -- Deactivate all existing active checkpoints for this essay FIRST
    -- This prevents the unique constraint violation
    UPDATE essay_checkpoints
    SET is_active = false
    WHERE essay_id = essay_uuid AND is_active = true;
    
    -- Create the new checkpoint
    INSERT INTO essay_checkpoints (
        essay_id,
        user_id,
        checkpoint_number,
        version_number,
        essay_content,
        essay_title,
        essay_prompt,
        version_name,
        is_fresh_draft,
        parent_checkpoint_id,
        has_ai_feedback,
        is_active
    ) VALUES (
        essay_uuid,
        user_uuid,
        next_version,
        next_version,
        essay_content,
        essay_title,
        essay_prompt,
        COALESCE(version_name_param, 'Fresh Draft ' || next_version::text),
        true,
        parent_checkpoint_id,
        false,
        true
    ) RETURNING id INTO new_checkpoint_id;
    
    RETURN new_checkpoint_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to create a checkpoint with AI feedback
CREATE OR REPLACE FUNCTION create_ai_feedback_checkpoint(
    essay_uuid UUID,
    user_uuid UUID,
    essay_content TEXT,
    essay_title TEXT DEFAULT NULL,
    essay_prompt TEXT DEFAULT NULL,
    ai_model_param VARCHAR(50) DEFAULT 'gemini-2.5-flash-lite',
    total_comments_param INTEGER DEFAULT 0,
    overall_comments_param INTEGER DEFAULT 0,
    inline_comments_param INTEGER DEFAULT 0,
    opening_sentence_comments_param INTEGER DEFAULT 0,
    transition_comments_param INTEGER DEFAULT 0,
    paragraph_specific_comments_param INTEGER DEFAULT 0,
    average_confidence_score_param DECIMAL(3,2) DEFAULT NULL,
    average_quality_score_param DECIMAL(3,2) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_checkpoint_id UUID;
    next_version INTEGER;
    parent_checkpoint_id UUID;
BEGIN
    -- Get the next version number
    next_version := get_next_version_number(essay_uuid);
    
    -- Get the most recent checkpoint as parent (if any)
    SELECT id INTO parent_checkpoint_id
    FROM essay_checkpoints
    WHERE essay_id = essay_uuid
    ORDER BY version_number DESC
    LIMIT 1;
    
    -- Deactivate all existing active checkpoints for this essay FIRST
    -- This prevents the unique constraint violation
    UPDATE essay_checkpoints
    SET is_active = false
    WHERE essay_id = essay_uuid AND is_active = true;
    
    -- Create the new checkpoint
    INSERT INTO essay_checkpoints (
        essay_id,
        user_id,
        checkpoint_number,
        version_number,
        essay_content,
        essay_title,
        essay_prompt,
        version_name,
        is_fresh_draft,
        parent_checkpoint_id,
        has_ai_feedback,
        is_active,
        ai_model,
        total_comments,
        overall_comments,
        inline_comments,
        opening_sentence_comments,
        transition_comments,
        paragraph_specific_comments,
        average_confidence_score,
        average_quality_score
    ) VALUES (
        essay_uuid,
        user_uuid,
        next_version,
        next_version,
        essay_content,
        essay_title,
        essay_prompt,
        'AI Feedback Version ' || next_version::text,
        false,
        parent_checkpoint_id,
        true,
        true,
        ai_model_param,
        total_comments_param,
        overall_comments_param,
        inline_comments_param,
        opening_sentence_comments_param,
        transition_comments_param,
        paragraph_specific_comments_param,
        average_confidence_score_param,
        average_quality_score_param
    ) RETURNING id INTO new_checkpoint_id;
    
    RETURN new_checkpoint_id;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 4. CREATE ESSAY_PROMPT_SELECTIONS TABLE
-- ==============================================

-- Create essay_prompt_selections table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.essay_prompt_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,
  college_name TEXT NOT NULL,
  prompt_number TEXT NOT NULL,
  prompt TEXT NOT NULL,
  word_limit TEXT NOT NULL,
  selected BOOLEAN DEFAULT true,
  essay_content TEXT,
  school_program_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for essay_prompt_selections
CREATE INDEX IF NOT EXISTS idx_essay_prompt_selections_user_id ON essay_prompt_selections(user_id);
CREATE INDEX IF NOT EXISTS idx_essay_prompt_selections_school_name ON essay_prompt_selections(school_name);
CREATE INDEX IF NOT EXISTS idx_essay_prompt_selections_college_name ON essay_prompt_selections(college_name);

-- Enable RLS
ALTER TABLE public.essay_prompt_selections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for essay_prompt_selections
DROP POLICY IF EXISTS "Users can view their own essay prompt selections" ON essay_prompt_selections;
CREATE POLICY "Users can view their own essay prompt selections" ON essay_prompt_selections
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own essay prompt selections" ON essay_prompt_selections;
CREATE POLICY "Users can insert their own essay prompt selections" ON essay_prompt_selections
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own essay prompt selections" ON essay_prompt_selections;
CREATE POLICY "Users can update their own essay prompt selections" ON essay_prompt_selections
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own essay prompt selections" ON essay_prompt_selections;
CREATE POLICY "Users can delete their own essay prompt selections" ON essay_prompt_selections
FOR DELETE USING (auth.uid() = user_id);
