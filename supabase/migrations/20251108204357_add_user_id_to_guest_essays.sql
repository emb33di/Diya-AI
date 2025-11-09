-- Add user_id column to guest_essays table
-- This allows us to track which user a guest essay belongs to after signup
-- and provides a backup matching mechanism if guestEssayId is lost

ALTER TABLE public.guest_essays
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for better query performance when looking up guest essays by user
CREATE INDEX IF NOT EXISTS idx_guest_essays_user_id ON guest_essays(user_id);

-- Add comment to column
COMMENT ON COLUMN public.guest_essays.user_id IS 'User ID that this guest essay belongs to. Set when user signs up, allowing for backup matching if guestEssayId is lost.';

