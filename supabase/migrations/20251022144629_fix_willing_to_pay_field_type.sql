-- Fix willing_to_pay_2000 field type to support yes/no/maybe values
-- This migration changes the field from boolean to text to properly store form responses

-- Change the column type from boolean to text
ALTER TABLE public.user_profiles 
ALTER COLUMN willing_to_pay_2000 TYPE TEXT USING 
  CASE 
    WHEN willing_to_pay_2000 = true THEN 'yes'
    WHEN willing_to_pay_2000 = false THEN 'no'
    ELSE 'no'
  END;

-- Update the comment to reflect the new purpose
COMMENT ON COLUMN public.user_profiles.willing_to_pay_2000 IS 'User response to willingness to pay Rs. 2000: yes, maybe, or no';

-- Add a check constraint to ensure only valid values
ALTER TABLE public.user_profiles 
ADD CONSTRAINT willing_to_pay_2000_valid_values 
CHECK (willing_to_pay_2000 IS NULL OR willing_to_pay_2000 IN ('yes', 'maybe', 'no'));
