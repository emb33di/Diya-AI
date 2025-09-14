-- Add category field to school_recommendations table
ALTER TABLE public.school_recommendations 
ADD COLUMN category TEXT;

-- Add comment explaining the category field
COMMENT ON COLUMN public.school_recommendations.category IS 'Category of the school recommendation (e.g., dream, target, safety)'; 