-- Add tracking fields to lor_recommenders table
ALTER TABLE public.lor_recommenders 
ADD COLUMN reached_out BOOLEAN DEFAULT FALSE,
ADD COLUMN checked_in BOOLEAN DEFAULT FALSE,
ADD COLUMN submitted_recommendation BOOLEAN DEFAULT FALSE,
ADD COLUMN reached_out_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN checked_in_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN submitted_recommendation_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for tracking fields
CREATE INDEX idx_lor_recommenders_reached_out ON public.lor_recommenders(reached_out);
CREATE INDEX idx_lor_recommenders_checked_in ON public.lor_recommenders(checked_in);
CREATE INDEX idx_lor_recommenders_submitted_recommendation ON public.lor_recommenders(submitted_recommendation);

-- Add comments for documentation
COMMENT ON COLUMN public.lor_recommenders.reached_out IS 'Whether the student has reached out to this recommender';
COMMENT ON COLUMN public.lor_recommenders.checked_in IS 'Whether the student has checked in with this recommender about progress';
COMMENT ON COLUMN public.lor_recommenders.submitted_recommendation IS 'Whether the recommender has submitted their recommendation';
COMMENT ON COLUMN public.lor_recommenders.reached_out_at IS 'Timestamp when the student reached out to this recommender';
COMMENT ON COLUMN public.lor_recommenders.checked_in_at IS 'Timestamp when the student checked in with this recommender';
COMMENT ON COLUMN public.lor_recommenders.submitted_recommendation_at IS 'Timestamp when the recommender submitted their recommendation';
