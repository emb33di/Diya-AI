-- Create junction table for LOR-school allocations
CREATE TABLE public.lor_school_allocations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lor_recommender_id UUID NOT NULL REFERENCES public.lor_recommenders(id) ON DELETE CASCADE,
    school_recommendation_id UUID NOT NULL REFERENCES public.school_recommendations(id) ON DELETE CASCADE,
    
    -- Allocation details
    allocation_status TEXT DEFAULT 'pending' CHECK (allocation_status IN ('pending', 'allocated', 'submitted', 'declined')),
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Ensure unique combinations
    UNIQUE(lor_recommender_id, school_recommendation_id)
);

-- Create indexes for performance
CREATE INDEX idx_lor_school_allocations_lor_id ON public.lor_school_allocations(lor_recommender_id);
CREATE INDEX idx_lor_school_allocations_school_id ON public.lor_school_allocations(school_recommendation_id);
CREATE INDEX idx_lor_school_allocations_status ON public.lor_school_allocations(allocation_status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lor_school_allocations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at updates
CREATE TRIGGER update_lor_school_allocations_updated_at
BEFORE UPDATE ON public.lor_school_allocations
FOR EACH ROW
EXECUTE FUNCTION update_lor_school_allocations_updated_at();

-- Enable RLS
ALTER TABLE public.lor_school_allocations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own LOR school allocations" 
ON public.lor_school_allocations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.lor_recommenders lr 
    WHERE lr.id = lor_school_allocations.lor_recommender_id 
    AND lr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own LOR school allocations" 
ON public.lor_school_allocations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lor_recommenders lr 
    WHERE lr.id = lor_school_allocations.lor_recommender_id 
    AND lr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own LOR school allocations" 
ON public.lor_school_allocations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.lor_recommenders lr 
    WHERE lr.id = lor_school_allocations.lor_recommender_id 
    AND lr.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own LOR school allocations" 
ON public.lor_school_allocations 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.lor_recommenders lr 
    WHERE lr.id = lor_school_allocations.lor_recommender_id 
    AND lr.user_id = auth.uid()
  )
);

-- Add comments for documentation
COMMENT ON TABLE public.lor_school_allocations IS 'Junction table linking LOR recommenders to specific schools';
COMMENT ON COLUMN public.lor_school_allocations.allocation_status IS 'Status of the LOR allocation to this school';
COMMENT ON COLUMN public.lor_school_allocations.notes IS 'Additional notes about this specific school allocation';
