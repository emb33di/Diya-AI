-- Create enum for ethnicity options
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

-- Add ethnicity field to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN ethnicity ethnicity;