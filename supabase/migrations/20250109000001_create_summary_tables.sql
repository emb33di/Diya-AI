-- Create brainstorming_summaries table
CREATE TABLE public.brainstorming_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL,
    summary_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Ensure one summary per user per conversation
    UNIQUE(user_id, conversation_id)
);

-- Create resume_context_summaries table
CREATE TABLE public.resume_context_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL,
    summary_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Ensure one summary per user per conversation
    UNIQUE(user_id, conversation_id)
);

-- Create indexes for faster queries
CREATE INDEX idx_brainstorming_summaries_user_id ON public.brainstorming_summaries(user_id);
CREATE INDEX idx_brainstorming_summaries_conversation_id ON public.brainstorming_summaries(conversation_id);
CREATE INDEX idx_resume_context_summaries_user_id ON public.resume_context_summaries(user_id);
CREATE INDEX idx_resume_context_summaries_conversation_id ON public.resume_context_summaries(conversation_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_summary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic updated_at updates
CREATE TRIGGER update_brainstorming_summaries_updated_at
BEFORE UPDATE ON public.brainstorming_summaries
FOR EACH ROW
EXECUTE FUNCTION update_summary_updated_at();

CREATE TRIGGER update_resume_context_summaries_updated_at
BEFORE UPDATE ON public.resume_context_summaries
FOR EACH ROW
EXECUTE FUNCTION update_summary_updated_at();

-- Enable RLS
ALTER TABLE public.brainstorming_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_context_summaries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for brainstorming_summaries
CREATE POLICY "Users can view their own brainstorming summaries" 
ON public.brainstorming_summaries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brainstorming summaries" 
ON public.brainstorming_summaries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brainstorming summaries" 
ON public.brainstorming_summaries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own brainstorming summaries" 
ON public.brainstorming_summaries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for resume_context_summaries
CREATE POLICY "Users can view their own resume context summaries" 
ON public.resume_context_summaries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resume context summaries" 
ON public.resume_context_summaries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resume context summaries" 
ON public.resume_context_summaries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resume context summaries" 
ON public.resume_context_summaries 
FOR DELETE 
USING (auth.uid() = user_id);
