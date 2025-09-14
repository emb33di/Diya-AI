-- Create essays table with support for custom prompts and word limits
CREATE TABLE IF NOT EXISTS public.essays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB NOT NULL, -- EssayContent structure
  prompt_id UUID REFERENCES essay_prompts(id),
  school_name TEXT,
  word_count INTEGER DEFAULT 0,
  character_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'final', 'submitted')),
  last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Custom essay fields
  prompt_text TEXT, -- Custom prompt text for user-created essays
  word_limit TEXT -- Custom word limit for user-created essays
);

-- Add custom fields to existing essays table if they don't exist
ALTER TABLE public.essays 
ADD COLUMN IF NOT EXISTS prompt_text TEXT,
ADD COLUMN IF NOT EXISTS word_limit TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_essays_user_id ON essays(user_id);
CREATE INDEX IF NOT EXISTS idx_essays_school_name ON essays(school_name);
CREATE INDEX IF NOT EXISTS idx_essays_prompt_id ON essays(prompt_id);
CREATE INDEX IF NOT EXISTS idx_essays_status ON essays(status);
CREATE INDEX IF NOT EXISTS idx_essays_created_at ON essays(created_at);
CREATE INDEX IF NOT EXISTS idx_essays_updated_at ON essays(updated_at);

-- Enable RLS
ALTER TABLE public.essays ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (only if they don't exist)
DO $$
BEGIN
    -- Check if policies exist before creating them
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'essays' AND policyname = 'Users can view their own essays') THEN
        CREATE POLICY "Users can view their own essays" 
        ON public.essays 
        FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'essays' AND policyname = 'Users can insert their own essays') THEN
        CREATE POLICY "Users can insert their own essays" 
        ON public.essays 
        FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'essays' AND policyname = 'Users can update their own essays') THEN
        CREATE POLICY "Users can update their own essays" 
        ON public.essays 
        FOR UPDATE 
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'essays' AND policyname = 'Users can delete their own essays') THEN
        CREATE POLICY "Users can delete their own essays" 
        ON public.essays 
        FOR DELETE 
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Create trigger for automatic timestamp updates (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_essays_updated_at') THEN
        CREATE TRIGGER update_essays_updated_at
        BEFORE UPDATE ON public.essays
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;
