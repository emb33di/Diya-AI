-- Add country column to school_recommendations for application system logic
ALTER TABLE public.school_recommendations
ADD COLUMN IF NOT EXISTS country TEXT;

-- Optional index to support filtering/querying by country
CREATE INDEX IF NOT EXISTS idx_school_recommendations_country
ON public.school_recommendations(country);

