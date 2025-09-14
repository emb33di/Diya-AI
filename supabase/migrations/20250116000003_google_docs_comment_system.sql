-- Google Docs-Level Comment System Migration
-- This creates the infrastructure for perfect comment alignment like Google Docs

-- 1. DOCUMENT OPERATIONS TABLE (Core of OT system)
CREATE TABLE document_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Operation metadata
  operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('insert', 'delete', 'retain', 'format')),
  position INTEGER NOT NULL, -- Character position in document
  length INTEGER NOT NULL, -- Length of operation
  text_content TEXT, -- Text being inserted (for insert operations)
  
  -- OT-specific fields
  operation_id VARCHAR(64) NOT NULL, -- Unique operation identifier
  parent_operation_id VARCHAR(64), -- For operation chaining
  timestamp BIGINT NOT NULL, -- High-precision timestamp for ordering
  client_id VARCHAR(64) NOT NULL, -- Client that generated the operation
  
  -- Version control
  document_version INTEGER NOT NULL, -- Document version after this operation
  operation_version INTEGER NOT NULL, -- Version of this specific operation
  
  -- Status
  applied BOOLEAN DEFAULT true,
  transformed BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. DOCUMENT SNAPSHOTS (Immutable document states)
CREATE TABLE document_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
  
  -- Snapshot metadata
  version INTEGER NOT NULL,
  content_hash VARCHAR(64) NOT NULL, -- SHA-256 of document content
  content_text TEXT NOT NULL, -- Full document content at this version
  
  -- Statistics
  word_count INTEGER NOT NULL,
  character_count INTEGER NOT NULL,
  paragraph_count INTEGER NOT NULL,
  
  -- Creation info
  created_by_operation_id VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(essay_id, version)
);

-- 3. COMMENT ANCHORS (Immutable comment positions)
CREATE TABLE comment_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES essay_comments(id) ON DELETE CASCADE,
  
  -- Anchor metadata
  anchor_type VARCHAR(20) NOT NULL CHECK (anchor_type IN ('text', 'paragraph', 'position')),
  document_version INTEGER NOT NULL, -- Document version when comment was created
  
  -- Position information
  start_position INTEGER NOT NULL, -- Character position in document
  end_position INTEGER NOT NULL, -- Character position in document
  anchor_text TEXT NOT NULL, -- Exact text being commented on
  
  -- Immutable reference
  content_hash VARCHAR(64) NOT NULL, -- Hash of the specific text
  paragraph_index INTEGER,
  sentence_index INTEGER,
  
  -- OT tracking
  operation_history JSONB, -- History of operations that affected this anchor
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. COLLABORATIVE SESSIONS (Real-time collaboration)
CREATE TABLE collaborative_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Session metadata
  session_id VARCHAR(64) NOT NULL,
  client_id VARCHAR(64) NOT NULL,
  user_agent TEXT,
  ip_address INET,
  
  -- Session state
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  document_version INTEGER NOT NULL DEFAULT 0,
  
  -- Cursor/selection info
  cursor_position INTEGER,
  selection_start INTEGER,
  selection_end INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. OPERATION TRANSFORMS (OT algorithm data)
CREATE TABLE operation_transforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Transform metadata
  original_operation_id VARCHAR(64) NOT NULL,
  transformed_operation_id VARCHAR(64) NOT NULL,
  transform_type VARCHAR(20) NOT NULL CHECK (transform_type IN ('retain', 'insert', 'delete')),
  
  -- Transform parameters
  original_position INTEGER NOT NULL,
  transformed_position INTEGER NOT NULL,
  length INTEGER NOT NULL,
  
  -- Result
  transformed_operation JSONB NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. COMMENT THREADS (Google Docs-style threading)
CREATE TABLE comment_threads_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  essay_id UUID NOT NULL REFERENCES essays(id) ON DELETE CASCADE,
  
  -- Thread metadata
  thread_id VARCHAR(64) NOT NULL UNIQUE,
  thread_type VARCHAR(20) NOT NULL CHECK (thread_type IN ('comment', 'suggestion', 'question')),
  
  -- Thread state
  is_resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Thread content
  thread_title TEXT,
  thread_description TEXT,
  
  -- Position (immutable)
  anchor_id UUID REFERENCES comment_anchors(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. THREAD PARTICIPANTS (Who's involved in the thread)
CREATE TABLE thread_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES comment_threads_v2(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Participant state
  is_mentioned BOOLEAN DEFAULT false,
  has_read BOOLEAN DEFAULT false,
  last_read_at TIMESTAMP WITH TIME ZONE,
  
  -- Permissions
  can_edit BOOLEAN DEFAULT true,
  can_resolve BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. THREAD MESSAGES (Individual messages in threads)
CREATE TABLE thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES comment_threads_v2(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Message content
  message_text TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('comment', 'reply', 'suggestion', 'resolution')),
  
  -- Rich content
  rich_content JSONB, -- For formatted text, mentions, etc.
  
  -- Message state
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  original_message_id UUID REFERENCES thread_messages(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_document_operations_essay_id ON document_operations(essay_id);
CREATE INDEX idx_document_operations_timestamp ON document_operations(timestamp);
CREATE INDEX idx_document_operations_version ON document_operations(document_version);
CREATE INDEX idx_document_operations_client_id ON document_operations(client_id);

CREATE INDEX idx_document_snapshots_essay_id ON document_snapshots(essay_id);
CREATE INDEX idx_document_snapshots_version ON document_snapshots(essay_id, version);
CREATE INDEX idx_document_snapshots_hash ON document_snapshots(content_hash);

CREATE INDEX idx_comment_anchors_comment_id ON comment_anchors(comment_id);
CREATE INDEX idx_comment_anchors_version ON comment_anchors(document_version);
CREATE INDEX idx_comment_anchors_position ON comment_anchors(start_position, end_position);
CREATE INDEX idx_comment_anchors_hash ON comment_anchors(content_hash);

CREATE INDEX idx_collaborative_sessions_essay_id ON collaborative_sessions(essay_id);
CREATE INDEX idx_collaborative_sessions_user_id ON collaborative_sessions(user_id);
CREATE INDEX idx_collaborative_sessions_active ON collaborative_sessions(essay_id, is_active) WHERE is_active = true;

CREATE INDEX idx_operation_transforms_original ON operation_transforms(original_operation_id);
CREATE INDEX idx_operation_transforms_transformed ON operation_transforms(transformed_operation_id);

CREATE INDEX idx_comment_threads_essay_id ON comment_threads_v2(essay_id);
CREATE INDEX idx_comment_threads_anchor ON comment_threads_v2(anchor_id);
CREATE INDEX idx_comment_threads_resolved ON comment_threads_v2(is_resolved);

CREATE INDEX idx_thread_participants_thread_id ON thread_participants(thread_id);
CREATE INDEX idx_thread_participants_user_id ON thread_participants(user_id);

CREATE INDEX idx_thread_messages_thread_id ON thread_messages(thread_id);
CREATE INDEX idx_thread_messages_user_id ON thread_messages(user_id);
CREATE INDEX idx_thread_messages_created_at ON thread_messages(created_at);

-- FUNCTIONS FOR OT OPERATIONS

-- Function to apply an operation to document content
CREATE OR REPLACE FUNCTION apply_operation(
  content TEXT,
  operation_type VARCHAR(20),
  position INTEGER,
  length INTEGER,
  text_content TEXT DEFAULT NULL
) RETURNS TEXT AS $$
BEGIN
  CASE operation_type
    WHEN 'insert' THEN
      RETURN substring(content, 1, position) || COALESCE(text_content, '') || substring(content, position + 1);
    WHEN 'delete' THEN
      RETURN substring(content, 1, position) || substring(content, position + length + 1);
    WHEN 'retain' THEN
      RETURN content;
    ELSE
      RETURN content;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to transform operations (OT algorithm)
CREATE OR REPLACE FUNCTION transform_operation(
  op1_type VARCHAR(20),
  op1_pos INTEGER,
  op1_len INTEGER,
  op1_text TEXT,
  op2_type VARCHAR(20),
  op2_pos INTEGER,
  op2_len INTEGER,
  op2_text TEXT
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Simplified OT algorithm - in production, this would be more complex
  result := jsonb_build_object(
    'type', op1_type,
    'position', op1_pos,
    'length', op1_len,
    'text', op1_text
  );
  
  -- Apply transformation logic here
  -- This is a simplified version - real OT is much more complex
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get document version
CREATE OR REPLACE FUNCTION get_document_version(essay_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  version INTEGER;
BEGIN
  SELECT COALESCE(MAX(document_version), 0) INTO version
  FROM document_operations
  WHERE essay_id = essay_uuid;
  
  RETURN version;
END;
$$ LANGUAGE plpgsql;

-- Function to create comment anchor
CREATE OR REPLACE FUNCTION create_comment_anchor(
  comment_uuid UUID,
  essay_uuid UUID,
  start_pos INTEGER,
  end_pos INTEGER,
  anchor_text TEXT,
  doc_version INTEGER
) RETURNS UUID AS $$
DECLARE
  anchor_id UUID;
  content_hash VARCHAR(64);
BEGIN
  -- Generate content hash
  content_hash := encode(digest(anchor_text, 'sha256'), 'hex');
  
  -- Create anchor
  INSERT INTO comment_anchors (
    comment_id,
    anchor_type,
    document_version,
    start_position,
    end_position,
    anchor_text,
    content_hash
  ) VALUES (
    comment_uuid,
    'text',
    doc_version,
    start_pos,
    end_pos,
    anchor_text,
    content_hash
  ) RETURNING id INTO anchor_id;
  
  RETURN anchor_id;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS FOR AUTOMATIC UPDATES

-- Trigger to update document version on operation
CREATE OR REPLACE FUNCTION update_document_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.document_version := get_document_version(NEW.essay_id) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_version
  BEFORE INSERT ON document_operations
  FOR EACH ROW
  EXECUTE FUNCTION update_document_version();

-- Trigger to create document snapshot on significant changes
CREATE OR REPLACE FUNCTION create_document_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  current_content TEXT;
  word_count INTEGER;
  char_count INTEGER;
  para_count INTEGER;
BEGIN
  -- Get current document content (simplified)
  SELECT content INTO current_content FROM essays WHERE id = NEW.essay_id;
  
  -- Calculate statistics
  word_count := array_length(string_to_array(trim(current_content), ' '), 1);
  char_count := length(current_content);
  para_count := array_length(string_to_array(current_content, E'\n\n'), 1);
  
  -- Create snapshot every 10 operations
  IF NEW.document_version % 10 = 0 THEN
    INSERT INTO document_snapshots (
      essay_id,
      version,
      content_hash,
      content_text,
      word_count,
      character_count,
      paragraph_count,
      created_by_operation_id
    ) VALUES (
      NEW.essay_id,
      NEW.document_version,
      encode(digest(current_content, 'sha256'), 'hex'),
      current_content,
      word_count,
      char_count,
      para_count,
      NEW.operation_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_document_snapshot
  AFTER INSERT ON document_operations
  FOR EACH ROW
  EXECUTE FUNCTION create_document_snapshot();

-- ENABLE RLS
ALTER TABLE document_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborative_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_transforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_threads_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_messages ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
CREATE POLICY "Users can view operations for their essays" ON document_operations
  FOR SELECT USING (
    essay_id IN (SELECT id FROM essays WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert operations for their essays" ON document_operations
  FOR INSERT WITH CHECK (
    essay_id IN (SELECT id FROM essays WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view snapshots for their essays" ON document_snapshots
  FOR SELECT USING (
    essay_id IN (SELECT id FROM essays WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view anchors for their comments" ON comment_anchors
  FOR SELECT USING (
    comment_id IN (SELECT id FROM essay_comments WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create anchors for their comments" ON comment_anchors
  FOR INSERT WITH CHECK (
    comment_id IN (SELECT id FROM essay_comments WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view sessions for their essays" ON collaborative_sessions
  FOR SELECT USING (
    essay_id IN (SELECT id FROM essays WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create sessions for their essays" ON collaborative_sessions
  FOR INSERT WITH CHECK (
    essay_id IN (SELECT id FROM essays WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view threads for their essays" ON comment_threads_v2
  FOR SELECT USING (
    essay_id IN (SELECT id FROM essays WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create threads for their essays" ON comment_threads_v2
  FOR INSERT WITH CHECK (
    essay_id IN (SELECT id FROM essays WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view participants for their threads" ON thread_participants
  FOR SELECT USING (
    thread_id IN (SELECT id FROM comment_threads_v2 WHERE essay_id IN (SELECT id FROM essays WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can view messages for their threads" ON thread_messages
  FOR SELECT USING (
    thread_id IN (SELECT id FROM comment_threads_v2 WHERE essay_id IN (SELECT id FROM essays WHERE user_id = auth.uid()))
  );

-- COMMENTS
COMMENT ON TABLE document_operations IS 'Core operational transform table - stores all document editing operations';
COMMENT ON TABLE document_snapshots IS 'Immutable document snapshots for version control and comment anchoring';
COMMENT ON TABLE comment_anchors IS 'Immutable comment positions that never change - like Google Docs';
COMMENT ON TABLE collaborative_sessions IS 'Real-time collaboration sessions for multiple users';
COMMENT ON TABLE operation_transforms IS 'Operational transform algorithm data for conflict resolution';
COMMENT ON TABLE comment_threads_v2 IS 'Google Docs-style comment threads with rich metadata';
COMMENT ON TABLE thread_participants IS 'Users involved in comment threads';
COMMENT ON TABLE thread_messages IS 'Individual messages within comment threads';
