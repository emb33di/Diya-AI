-- Create LOR recommenders table for managing letter of recommendation requests
CREATE TABLE public.lor_recommenders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    relationship TEXT, -- e.g., "Chemistry Teacher", "Product Supervisor"
    
    -- Internal deadlines for LOR process
    internal_deadline_1 TIMESTAMP WITH TIME ZONE, -- When to reach out to recommender
    internal_deadline_2 TIMESTAMP WITH TIME ZONE, -- Check-in about progress
    internal_deadline_3 TIMESTAMP WITH TIME ZONE, -- When recommender should submit LOR
    
    -- Status tracking
    status TEXT DEFAULT 'not_contacted' CHECK (status IN ('not_contacted', 'contacted', 'agreed', 'in_progress', 'submitted', 'declined')),
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_lor_recommenders_user_id ON public.lor_recommenders(user_id);
CREATE INDEX idx_lor_recommenders_status ON public.lor_recommenders(status);
CREATE INDEX idx_lor_recommenders_deadlines ON public.lor_recommenders(internal_deadline_1, internal_deadline_2, internal_deadline_3);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lor_recommenders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at updates
CREATE TRIGGER update_lor_recommenders_updated_at
BEFORE UPDATE ON public.lor_recommenders
FOR EACH ROW
EXECUTE FUNCTION update_lor_recommenders_updated_at();

-- Enable RLS
ALTER TABLE public.lor_recommenders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own LOR recommenders" 
ON public.lor_recommenders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own LOR recommenders" 
ON public.lor_recommenders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own LOR recommenders" 
ON public.lor_recommenders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own LOR recommenders" 
ON public.lor_recommenders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE public.lor_recommenders IS 'Stores letter of recommendation requests and internal deadlines';
COMMENT ON COLUMN public.lor_recommenders.internal_deadline_1 IS 'Deadline to reach out to recommender for LOR request';
COMMENT ON COLUMN public.lor_recommenders.internal_deadline_2 IS 'Deadline to check-in with recommender about progress';
COMMENT ON COLUMN public.lor_recommenders.internal_deadline_3 IS 'Deadline for recommender to submit the LOR';
COMMENT ON COLUMN public.lor_recommenders.status IS 'Current status of the LOR request process';
