-- Ensure essay_prompt_selections table exists with correct structure
-- This migration creates the table if it doesn't exist or updates it if needed

-- Drop the table if it exists (to ensure clean recreation)
DROP TABLE IF EXISTS public.essay_prompt_selections CASCADE;

-- Create the table with correct structure
CREATE TABLE public.essay_prompt_selections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_name TEXT NOT NULL,
  college_name TEXT NOT NULL,
  prompt_number TEXT NOT NULL,
  prompt TEXT NOT NULL,
  word_limit TEXT NOT NULL,
  selected BOOLEAN DEFAULT false,
  essay_content TEXT,
  school_program_type school_program_type,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for faster queries (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_essay_prompt_selections_user_id ON public.essay_prompt_selections(user_id);
CREATE INDEX IF NOT EXISTS idx_essay_prompt_selections_school_name ON public.essay_prompt_selections(school_name);
CREATE INDEX IF NOT EXISTS idx_essay_prompt_selections_program_type ON public.essay_prompt_selections(school_program_type);

-- Enable RLS
ALTER TABLE public.essay_prompt_selections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view their own essay prompt selections" ON public.essay_prompt_selections;
DROP POLICY IF EXISTS "Users can insert their own essay prompt selections" ON public.essay_prompt_selections;
DROP POLICY IF EXISTS "Users can update their own essay prompt selections" ON public.essay_prompt_selections;
DROP POLICY IF EXISTS "Users can delete their own essay prompt selections" ON public.essay_prompt_selections;

-- Create RLS policies
CREATE POLICY "Users can view their own essay prompt selections" 
ON public.essay_prompt_selections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own essay prompt selections" 
ON public.essay_prompt_selections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own essay prompt selections" 
ON public.essay_prompt_selections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own essay prompt selections" 
ON public.essay_prompt_selections 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_essay_prompt_selections_updated_at') THEN
        CREATE TRIGGER update_essay_prompt_selections_updated_at
        BEFORE UPDATE ON public.essay_prompt_selections
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Verify the table structure
DO $$
BEGIN
    -- Check if school_name column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'essay_prompt_selections' 
        AND column_name = 'school_name'
        AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'school_name column is missing from essay_prompt_selections table';
    END IF;
    
    RAISE NOTICE 'essay_prompt_selections table structure verified successfully';
END $$;