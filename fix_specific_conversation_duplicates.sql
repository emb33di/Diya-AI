-- Quick Fix for Specific Conversation ID: conv_1758846087861_pvwd6s3hy
-- This script specifically addresses the duplicate records for this conversation

-- Step 1: Check current duplicates for this specific conversation
SELECT 
    id,
    conversation_id,
    user_id,
    created_at,
    message_count,
    LENGTH(transcript) as transcript_length
FROM conversation_metadata 
WHERE conversation_id = 'conv_1758846087861_pvwd6s3hy'
ORDER BY created_at DESC;

-- Step 2: Delete all but the most recent record for this conversation
WITH ranked_records AS (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
    FROM conversation_metadata
    WHERE conversation_id = 'conv_1758846087861_pvwd6s3hy'
)
DELETE FROM conversation_metadata 
WHERE id IN (
    SELECT id 
    FROM ranked_records 
    WHERE rn > 1
);

-- Step 3: Verify only one record remains
SELECT 
    id,
    conversation_id,
    user_id,
    created_at,
    message_count,
    LENGTH(transcript) as transcript_length
FROM conversation_metadata 
WHERE conversation_id = 'conv_1758846087861_pvwd6s3hy';

-- Step 4: Add unique constraint if it doesn't exist
-- First check if constraint exists, then add it
DO $$
BEGIN
    -- Check if unique constraint already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'conversation_metadata_conversation_id_key'
        AND table_name = 'conversation_metadata'
    ) THEN
        -- Add the unique constraint
        ALTER TABLE conversation_metadata 
        ADD CONSTRAINT conversation_metadata_conversation_id_key 
        UNIQUE (conversation_id);
        
        RAISE NOTICE 'Unique constraint added successfully';
    ELSE
        RAISE NOTICE 'Unique constraint already exists';
    END IF;
END $$;

-- Step 5: Final verification - should return 1 row
SELECT COUNT(*) as remaining_records
FROM conversation_metadata 
WHERE conversation_id = 'conv_1758846087861_pvwd6s3hy';
