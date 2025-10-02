-- Migration: Implement one conversation per user with transcript overwrite logic
-- This ensures that if a user ends a conversation but onboarding_complete is not true,
-- then we overwrite the older conversation transcript

-- Step 1: Add unique constraint to conversation_metadata for one conversation per user
-- This will allow us to use ON CONFLICT (user_id) to overwrite previous conversations
ALTER TABLE conversation_metadata 
ADD CONSTRAINT unique_user_conversation_metadata UNIQUE (user_id);

-- Step 2: Add unique constraint to conversation_messages for one conversation per user
-- This ensures we can overwrite all messages for a user's previous conversation
ALTER TABLE conversation_messages 
ADD CONSTRAINT unique_user_conversation_messages UNIQUE (user_id, message_order);

-- Step 3: Create a function to clean up old conversation data for a user
-- This function will be called when a new conversation starts for a user
CREATE OR REPLACE FUNCTION cleanup_old_user_conversation(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
    old_conversation_id TEXT;
    user_onboarding_complete BOOLEAN;
BEGIN
    -- Check if user has completed onboarding
    SELECT onboarding_complete INTO user_onboarding_complete
    FROM user_profiles 
    WHERE user_id = target_user_id;
    
    -- Only cleanup if onboarding is not complete
    IF user_onboarding_complete IS NULL OR user_onboarding_complete = FALSE THEN
        -- Get the old conversation ID
        SELECT conversation_id INTO old_conversation_id
        FROM conversation_metadata 
        WHERE user_id = target_user_id
        ORDER BY created_at DESC
        LIMIT 1;
        
        -- Delete old conversation messages if they exist
        IF old_conversation_id IS NOT NULL THEN
            DELETE FROM conversation_messages 
            WHERE user_id = target_user_id;
            
            -- Delete old conversation metadata
            DELETE FROM conversation_metadata 
            WHERE user_id = target_user_id;
            
            -- Log the cleanup
            RAISE NOTICE 'Cleaned up old conversation % for user % (onboarding not complete)', 
                old_conversation_id, target_user_id;
        END IF;
    ELSE
        RAISE NOTICE 'User % has completed onboarding, keeping existing conversation data', target_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create a trigger function that automatically cleans up old conversations
-- when a new conversation starts for a user
CREATE OR REPLACE FUNCTION trigger_cleanup_old_conversation()
RETURNS TRIGGER AS $$
BEGIN
    -- Only cleanup if this is a new conversation (not an update)
    IF TG_OP = 'INSERT' THEN
        -- Clean up old conversation data for this user
        PERFORM cleanup_old_user_conversation(NEW.user_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger on conversation_metadata to automatically cleanup old conversations
DROP TRIGGER IF EXISTS cleanup_old_conversation_trigger ON conversation_metadata;
CREATE TRIGGER cleanup_old_conversation_trigger
    BEFORE INSERT ON conversation_metadata
    FOR EACH ROW
    EXECUTE FUNCTION trigger_cleanup_old_conversation();

-- Step 6: Update the save-transcript function logic by creating a helper function
-- This function will be used by the edge function to handle the one-conversation-per-user logic
CREATE OR REPLACE FUNCTION save_user_conversation_transcript(
    p_conversation_id TEXT,
    p_user_id UUID,
    p_messages JSONB,
    p_session_type TEXT DEFAULT 'onboarding'
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    user_onboarding_complete BOOLEAN;
    message_count INTEGER;
    transcript_text TEXT;
BEGIN
    -- Check if user has completed onboarding
    SELECT onboarding_complete INTO user_onboarding_complete
    FROM user_profiles 
    WHERE user_id = p_user_id;
    
    -- Only allow overwrite if onboarding is not complete
    IF user_onboarding_complete IS NULL OR user_onboarding_complete = FALSE THEN
        -- Clean up old conversation data
        PERFORM cleanup_old_user_conversation(p_user_id);
        
        -- Count messages
        message_count := jsonb_array_length(p_messages);
        
        -- Create transcript text
        SELECT string_agg(
            CASE 
                WHEN (msg->>'source') = 'ai' THEN 'Diya: ' || (msg->>'text')
                ELSE 'You: ' || (msg->>'text')
            END, 
            E'\n'
        ) INTO transcript_text
        FROM jsonb_array_elements(p_messages) AS msg;
        
        -- Insert new conversation metadata
        INSERT INTO conversation_metadata (
            conversation_id, 
            user_id, 
            summary, 
            transcript, 
            message_count, 
            session_number
        ) VALUES (
            p_conversation_id,
            p_user_id,
            'Conversation completed with ' || message_count || ' messages',
            transcript_text,
            message_count,
            CASE WHEN p_session_type = 'onboarding' THEN 1 ELSE 1 END
        )
        ON CONFLICT (user_id) DO UPDATE SET
            conversation_id = EXCLUDED.conversation_id,
            summary = EXCLUDED.summary,
            transcript = EXCLUDED.transcript,
            message_count = EXCLUDED.message_count,
            updated_at = NOW();
        
        -- Insert messages
        INSERT INTO conversation_messages (
            conversation_id,
            user_id,
            source,
            text,
            timestamp,
            message_order
        )
        SELECT 
            p_conversation_id,
            p_user_id,
            (msg->>'source')::TEXT,
            (msg->>'text')::TEXT,
            (msg->>'timestamp')::TIMESTAMPTZ,
            row_number() OVER (ORDER BY (msg->>'timestamp')::TIMESTAMPTZ)
        FROM jsonb_array_elements(p_messages) AS msg
        ON CONFLICT (user_id, message_order) DO UPDATE SET
            conversation_id = EXCLUDED.conversation_id,
            source = EXCLUDED.source,
            text = EXCLUDED.text,
            timestamp = EXCLUDED.timestamp,
            updated_at = NOW();
        
        result := jsonb_build_object(
            'success', true,
            'message', 'Transcript saved successfully',
            'message_count', message_count,
            'overwritten', true
        );
        
    ELSE
        -- User has completed onboarding, don't overwrite
        result := jsonb_build_object(
            'success', false,
            'error', 'User has completed onboarding, cannot overwrite conversation data',
            'onboarding_complete', true
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Grant necessary permissions
GRANT EXECUTE ON FUNCTION cleanup_old_user_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION save_user_conversation_transcript(TEXT, UUID, JSONB, TEXT) TO authenticated;

-- Step 8: Add comments for documentation
COMMENT ON FUNCTION cleanup_old_user_conversation(UUID) IS 'Cleans up old conversation data for a user if onboarding is not complete';
COMMENT ON FUNCTION save_user_conversation_transcript(TEXT, UUID, JSONB, TEXT) IS 'Saves conversation transcript with one-conversation-per-user logic';
COMMENT ON CONSTRAINT unique_user_conversation_metadata ON conversation_metadata IS 'Ensures one conversation per user in metadata table';
COMMENT ON CONSTRAINT unique_user_conversation_messages ON conversation_messages IS 'Ensures one conversation per user in messages table';

-- Step 9: Create index for better performance on user_id lookups
CREATE INDEX IF NOT EXISTS idx_conversation_metadata_user_id_lookup ON conversation_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_user_id_lookup ON conversation_messages(user_id);
