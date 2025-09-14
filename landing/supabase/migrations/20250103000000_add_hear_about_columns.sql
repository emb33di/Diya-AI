-- Add hear_about_us and hear_about_other columns to waitlist table

ALTER TABLE waitlist 
ADD COLUMN hear_about_us TEXT,
ADD COLUMN hear_about_other TEXT;

-- Add comments for documentation
COMMENT ON COLUMN waitlist.hear_about_us IS 'How the user heard about Diya AI (reddit, instagram, linkedin, facebook, friend_referred, other)';
COMMENT ON COLUMN waitlist.hear_about_other IS 'Additional explanation when hear_about_us is "other"';
