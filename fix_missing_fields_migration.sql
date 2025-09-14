-- Fix Missing Fields Migration
-- This migration adds missing fields to existing tables

-- ==============================================
-- FIX PROFILES TABLE FIELD MISMATCHES
-- ==============================================

-- Fix onboarding field name mismatch
-- Code expects 'onboarding_complete' but migration created 'onboarding_completed'
-- First check if onboarding_completed exists and rename it
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'profiles' 
               AND column_name = 'onboarding_completed' 
               AND table_schema = 'public') THEN
        ALTER TABLE public.profiles 
        RENAME COLUMN onboarding_completed TO onboarding_complete;
    END IF;
END $$;

-- Update the handle_new_user function to use the correct field name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, onboarding_complete)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', false);
  RETURN NEW;
END;
$$;

-- ==============================================
-- ENSURE ALL REQUIRED FIELDS EXIST
-- ==============================================

-- Add cumulative_onboarding_time if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cumulative_onboarding_time INTEGER DEFAULT 0;

-- Add onboarding_complete if it doesn't exist (in case the rename didn't work)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN DEFAULT false;

-- ==============================================
-- ENSURE USER_PROFILES TABLE HAS ALL REQUIRED FIELDS
-- ==============================================

-- Create ethnicity enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ethnicity') THEN
        CREATE TYPE ethnicity AS ENUM (
            'American Indian or Alaska Native',
            'Asian',
            'Black or African American',
            'Hispanic or Latino',
            'Native Hawaiian or Other Pacific Islander',
            'White',
            'Two or More Races',
            'Other',
            'Prefer not to answer'
        );
    END IF;
END $$;

-- Add ethnicity field to user_profiles if it doesn't exist
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS ethnicity ethnicity;

-- ==============================================
-- ENSURE ESSAY_COMMENTS TABLE HAS ALL REQUIRED FIELDS
-- ==============================================

-- Add missing fields to essay_comments table
ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS checkpoint_id UUID REFERENCES essay_checkpoints(id) ON DELETE CASCADE;

ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS comment_category TEXT CHECK (comment_category IN ('overall', 'inline'));

ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS comment_subcategory TEXT CHECK (comment_subcategory IN ('opening', 'body', 'conclusion', 'opening-sentence', 'transition', 'paragraph-specific', 'paragraph-quality', 'final-sentence'));

ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS agent_type TEXT CHECK (agent_type IN ('big-picture', 'paragraph', 'weaknesses', 'strengths', 'reconciliation', 'tone', 'clarity', 'grammar_spelling', 'editor-chief'));

ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS paragraph_index INTEGER;

ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS transition_score INTEGER;

ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS transition_score_color TEXT;

ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS opening_sentence_score INTEGER;

ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS opening_sentence_score_color TEXT;

ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS paragraph_quality_score INTEGER;

ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS paragraph_quality_score_color TEXT;

ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS final_sentence_score INTEGER;

ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS final_sentence_score_color TEXT;

ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS paragraph_id TEXT;

ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS organization_category TEXT CHECK (organization_category IN ('overall-strength', 'overall-weakness', 'inline'));

ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS reconciliation_source TEXT CHECK (reconciliation_source IN ('strength', 'weakness', 'both', 'none'));

ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS chronological_position INTEGER;

ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS user_feedback_helpful BOOLEAN;

ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS comment_nature TEXT CHECK (comment_nature IN ('strength', 'weakness', 'combined', 'neutral'));

ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS comment_quality_score DECIMAL(3,2);

ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false;

ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS duplicate_of_comment_id UUID;

ALTER TABLE public.essay_comments 
ADD COLUMN IF NOT EXISTS anchor_text_validated BOOLEAN DEFAULT false;

-- ==============================================
-- ENSURE ESSAY_CHECKPOINTS TABLE HAS ALL REQUIRED FIELDS
-- ==============================================

-- Add missing fields to essay_checkpoints table
ALTER TABLE public.essay_checkpoints 
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;

ALTER TABLE public.essay_checkpoints 
ADD COLUMN IF NOT EXISTS version_name TEXT;

ALTER TABLE public.essay_checkpoints 
ADD COLUMN IF NOT EXISTS version_description TEXT;

ALTER TABLE public.essay_checkpoints 
ADD COLUMN IF NOT EXISTS is_fresh_draft BOOLEAN DEFAULT false;

ALTER TABLE public.essay_checkpoints 
ADD COLUMN IF NOT EXISTS parent_checkpoint_id UUID;

ALTER TABLE public.essay_checkpoints 
ADD COLUMN IF NOT EXISTS has_ai_feedback BOOLEAN DEFAULT false;

-- ==============================================
-- ENSURE ESSAYS TABLE HAS ALL REQUIRED FIELDS
-- ==============================================

-- Add missing fields to essays table
ALTER TABLE public.essays 
ADD COLUMN IF NOT EXISTS prompt_text TEXT;

ALTER TABLE public.essays 
ADD COLUMN IF NOT EXISTS word_limit TEXT;

-- ==============================================
-- ENSURE SCHOOL_RECOMMENDATIONS TABLE HAS ALL REQUIRED FIELDS
-- ==============================================

-- Add missing fields to school_recommendations table
ALTER TABLE public.school_recommendations 
ADD COLUMN IF NOT EXISTS early_action_deadline TEXT;

ALTER TABLE public.school_recommendations 
ADD COLUMN IF NOT EXISTS early_decision_1_deadline TEXT;

ALTER TABLE public.school_recommendations 
ADD COLUMN IF NOT EXISTS early_decision_2_deadline TEXT;

ALTER TABLE public.school_recommendations 
ADD COLUMN IF NOT EXISTS regular_decision_deadline TEXT;

ALTER TABLE public.school_recommendations 
ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'not_started';

-- ==============================================
-- CREATE MISSING INDEXES FOR PERFORMANCE
-- ==============================================

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_complete ON profiles(onboarding_complete);
CREATE INDEX IF NOT EXISTS idx_profiles_cumulative_time ON profiles(cumulative_onboarding_time);

-- Essay comments indexes
CREATE INDEX IF NOT EXISTS idx_essay_comments_checkpoint_id ON essay_comments(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_essay_comments_paragraph_index ON essay_comments(paragraph_index);
CREATE INDEX IF NOT EXISTS idx_essay_comments_agent_type ON essay_comments(agent_type);
CREATE INDEX IF NOT EXISTS idx_essay_comments_comment_category ON essay_comments(comment_category);

-- Essay checkpoints indexes
CREATE INDEX IF NOT EXISTS idx_essay_checkpoints_version_number ON essay_checkpoints(version_number);
CREATE INDEX IF NOT EXISTS idx_essay_checkpoints_is_fresh_draft ON essay_checkpoints(is_fresh_draft);
CREATE INDEX IF NOT EXISTS idx_essay_checkpoints_has_ai_feedback ON essay_checkpoints(has_ai_feedback);

-- School recommendations indexes
CREATE INDEX IF NOT EXISTS idx_school_recommendations_application_status ON school_recommendations(application_status);

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================

DO $$
BEGIN
    RAISE NOTICE 'Missing fields migration completed successfully!';
    RAISE NOTICE 'Fixed field name mismatches and added all missing fields.';
END $$;
