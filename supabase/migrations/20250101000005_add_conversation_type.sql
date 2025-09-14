-- Add conversation_type field to conversation_tracking table
ALTER TABLE conversation_tracking 
ADD COLUMN conversation_type TEXT DEFAULT 'onboarding_1';

-- Update existing records to have conversation_type
UPDATE conversation_tracking 
SET conversation_type = 'onboarding_1' 
WHERE conversation_type IS NULL;

-- Create index for conversation_type
CREATE INDEX IF NOT EXISTS idx_conversation_tracking_conversation_type ON conversation_tracking(conversation_type);

-- Add comment
COMMENT ON COLUMN conversation_tracking.conversation_type IS 'Type of conversation session (onboarding_1, onboarding_2, etc.)'; 