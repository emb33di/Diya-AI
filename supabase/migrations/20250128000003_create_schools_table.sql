-- Create schools table to replace the JSON file
CREATE TABLE public.schools (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'USA',
    school_program_type school_program_type NOT NULL,
    institutional_type TEXT CHECK (institutional_type IN ('public', 'private', 'liberal_arts', 'research_university', 'community_college', 'technical_institute', 'ivy_league')),
    ranking INTEGER,
    tier TEXT,
    acceptance_rate TEXT,
    sat_range TEXT,
    act_range TEXT,
    annual_tuition_usd INTEGER,
    total_estimated_cost_usd INTEGER,
    average_scholarship_usd INTEGER,
    percent_international_aid DECIMAL(5,2),
    need_blind_for_internationals BOOLEAN DEFAULT false,
    climate TEXT,
    website_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_schools_name ON public.schools(name);
CREATE INDEX idx_schools_program_type ON public.schools(school_program_type);
CREATE INDEX idx_schools_institutional_type ON public.schools(institutional_type);
CREATE INDEX idx_schools_state ON public.schools(state);
CREATE INDEX idx_schools_ranking ON public.schools(ranking);

-- Enable RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (schools should be accessible to all users)
CREATE POLICY "Anyone can view schools" 
ON public.schools 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_schools_updated_at
BEFORE UPDATE ON public.schools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
