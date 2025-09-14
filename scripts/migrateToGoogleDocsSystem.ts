/**
 * Migration Script: Current System → Google Docs-Level System
 * 
 * This script migrates the existing comment system to the new Google Docs-level
 * architecture with perfect comment alignment.
 */

import { supabase } from '@/integrations/supabase/client';
import { GoogleDocsCommentService } from '@/services/googleDocsCommentService';

interface MigrationStats {
  essaysProcessed: number;
  commentsMigrated: number;
  anchorsCreated: number;
  operationsCreated: number;
  errors: string[];
  warnings: string[];
}

/**
 * Main migration function
 */
export async function migrateToGoogleDocsSystem(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    essaysProcessed: 0,
    commentsMigrated: 0,
    anchorsCreated: 0,
    operationsCreated: 0,
    errors: [],
    warnings: []
  };

  console.log('🚀 Starting migration to Google Docs-level comment system...');

  try {
    // Step 1: Migrate essays to structured format
    await migrateEssaysToStructured(stats);

    // Step 2: Migrate comments to new system
    await migrateCommentsToAnchored(stats);

    // Step 3: Create initial document snapshots
    await createInitialSnapshots(stats);

    // Step 4: Validate migration
    await validateMigration(stats);

    console.log('✅ Migration completed successfully!');
    console.log('📊 Migration Stats:', stats);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    stats.errors.push(`Migration failed: ${error.message}`);
  }

  return stats;
}

/**
 * Migrate essays to structured format
 */
async function migrateEssaysToStructured(stats: MigrationStats): Promise<void> {
  console.log('📝 Migrating essays to structured format...');

  try {
    // Get all essays
    const { data: essays, error } = await supabase
      .from('essays')
      .select('id, content, user_id')
      .order('created_at', { ascending: true });

    if (error) throw error;

    for (const essay of essays || []) {
      try {
        await migrateSingleEssay(essay, stats);
        stats.essaysProcessed++;
      } catch (error) {
        console.error(`Error migrating essay ${essay.id}:`, error);
        stats.errors.push(`Essay ${essay.id}: ${error.message}`);
      }
    }

    console.log(`✅ Migrated ${stats.essaysProcessed} essays`);

  } catch (error) {
    throw new Error(`Failed to migrate essays: ${error.message}`);
  }
}

/**
 * Migrate a single essay
 */
async function migrateSingleEssay(essay: any, stats: MigrationStats): Promise<void> {
  const content = essay.content;
  if (!content || typeof content !== 'string') {
    stats.warnings.push(`Essay ${essay.id}: Invalid content format`);
    return;
  }

  // Parse essay into structured blocks
  const blocks = parseEssayIntoBlocks(content);
  
  // Create content blocks
  for (const [index, block] of blocks.entries()) {
    try {
      const { error } = await supabase
        .from('essay_content_blocks')
        .insert({
          essay_id: essay.id,
          block_type: 'paragraph',
          block_index: index,
          content_hash: await hashContent(block.text),
          raw_content: block.text,
          normalized_content: normalizeText(block.text),
          word_count: block.text.split(/\s+/).length,
          character_count: block.text.length
        });

      if (error) throw error;

    } catch (error) {
      stats.errors.push(`Essay ${essay.id}, Block ${index}: ${error.message}`);
    }
  }

  // Create initial document operation
  try {
    const { error } = await supabase
      .from('document_operations')
      .insert({
        essay_id: essay.id,
        user_id: essay.user_id,
        operation_type: 'retain',
        position: 0,
        length: content.length,
        operation_id: `initial_${essay.id}_${Date.now()}`,
        timestamp: Date.now(),
        client_id: 'migration_client',
        applied: true,
        transformed: false
      });

    if (error) throw error;
    stats.operationsCreated++;

  } catch (error) {
    stats.errors.push(`Essay ${essay.id}, Initial operation: ${error.message}`);
  }
}

/**
 * Migrate comments to anchored system
 */
async function migrateCommentsToAnchored(stats: MigrationStats): Promise<void> {
  console.log('💬 Migrating comments to anchored system...');

  try {
    // Get all comments
    const { data: comments, error } = await supabase
      .from('essay_comments')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: true });

    if (error) throw error;

    for (const comment of comments || []) {
      try {
        await migrateSingleComment(comment, stats);
        stats.commentsMigrated++;
      } catch (error) {
        console.error(`Error migrating comment ${comment.id}:`, error);
        stats.errors.push(`Comment ${comment.id}: ${error.message}`);
      }
    }

    console.log(`✅ Migrated ${stats.commentsMigrated} comments`);

  } catch (error) {
    throw new Error(`Failed to migrate comments: ${error.message}`);
  }
}

/**
 * Migrate a single comment
 */
async function migrateSingleComment(comment: any, stats: MigrationStats): Promise<void> {
  // Get the essay content
  const { data: essay, error: essayError } = await supabase
    .from('essays')
    .select('content')
    .eq('id', comment.essay_id)
    .single();

  if (essayError) throw essayError;

  const essayContent = essay.content;
  const anchorText = comment.anchor_text;

  if (!anchorText) {
    stats.warnings.push(`Comment ${comment.id}: No anchor text`);
    return;
  }

  // Find the position of the anchor text in the essay
  const position = findTextPosition(essayContent, anchorText);
  
  if (!position) {
    stats.warnings.push(`Comment ${comment.id}: Anchor text not found in essay`);
    return;
  }

  // Get current document version
  const { data: versionData, error: versionError } = await supabase.rpc('get_document_version', {
    essay_uuid: comment.essay_id
  });

  if (versionError) throw versionError;

  const documentVersion = versionData || 0;

  // Create comment anchor
  try {
    const { error } = await supabase
      .from('comment_anchors')
      .insert({
        comment_id: comment.id,
        anchor_type: 'text',
        document_version: documentVersion,
        start_position: position.start,
        end_position: position.end,
        anchor_text: anchorText,
        content_hash: await hashContent(anchorText),
        paragraph_index: comment.paragraph_index
      });

    if (error) throw error;
    stats.anchorsCreated++;

  } catch (error) {
    stats.errors.push(`Comment ${comment.id}, Anchor: ${error.message}`);
  }
}

/**
 * Create initial document snapshots
 */
async function createInitialSnapshots(stats: MigrationStats): Promise<void> {
  console.log('📸 Creating initial document snapshots...');

  try {
    // Get all essays
    const { data: essays, error } = await supabase
      .from('essays')
      .select('id, content');

    if (error) throw error;

    for (const essay of essays || []) {
      try {
        await createDocumentSnapshot(essay.id, essay.content, 0);
      } catch (error) {
        stats.errors.push(`Essay ${essay.id}, Snapshot: ${error.message}`);
      }
    }

    console.log(`✅ Created snapshots for ${essays?.length || 0} essays`);

  } catch (error) {
    throw new Error(`Failed to create snapshots: ${error.message}`);
  }
}

/**
 * Create a document snapshot
 */
async function createDocumentSnapshot(
  essayId: string,
  content: string,
  version: number
): Promise<void> {
  const wordCount = content.split(/\s+/).length;
  const charCount = content.length;
  const paraCount = content.split(/\n\s*\n/).length;

  const { error } = await supabase
    .from('document_snapshots')
    .insert({
      essay_id: essayId,
      version,
      content_hash: await hashContent(content),
      content_text: content,
      word_count: wordCount,
      character_count: charCount,
      paragraph_count: paraCount,
      created_by_operation_id: `snapshot_${essayId}_${version}`
    });

  if (error) throw error;
}

/**
 * Validate migration
 */
async function validateMigration(stats: MigrationStats): Promise<void> {
  console.log('🔍 Validating migration...');

  try {
    // Check that all essays have content blocks
    const { data: essaysWithoutBlocks, error: blocksError } = await supabase
      .from('essays')
      .select('id')
      .not('id', 'in', 
        supabase
          .from('essay_content_blocks')
          .select('essay_id')
      );

    if (blocksError) throw blocksError;

    if (essaysWithoutBlocks && essaysWithoutBlocks.length > 0) {
      stats.warnings.push(`${essaysWithoutBlocks.length} essays missing content blocks`);
    }

    // Check that all comments have anchors
    const { data: commentsWithoutAnchors, error: anchorsError } = await supabase
      .from('essay_comments')
      .select('id')
      .eq('resolved', false)
      .not('id', 'in',
        supabase
          .from('comment_anchors')
          .select('comment_id')
      );

    if (anchorsError) throw anchorsError;

    if (commentsWithoutAnchors && commentsWithoutAnchors.length > 0) {
      stats.warnings.push(`${commentsWithoutAnchors.length} comments missing anchors`);
    }

    // Check comment alignment
    await validateCommentAlignment(stats);

    console.log('✅ Migration validation completed');

  } catch (error) {
    throw new Error(`Validation failed: ${error.message}`);
  }
}

/**
 * Validate comment alignment
 */
async function validateCommentAlignment(stats: MigrationStats): Promise<void> {
  try {
    const { data: anchors, error } = await supabase
      .from('comment_anchors')
      .select(`
        *,
        essay_comments!inner(essay_id, anchor_text),
        essays!inner(content)
      `);

    if (error) throw error;

    let alignedCount = 0;
    let misalignedCount = 0;

    for (const anchor of anchors || []) {
      const essayContent = anchor.essays.content;
      const currentText = essayContent.substring(
        anchor.start_position,
        anchor.end_position
      );

      if (currentText === anchor.anchor_text) {
        alignedCount++;
      } else {
        misalignedCount++;
        stats.warnings.push(`Comment ${anchor.comment_id}: Misaligned anchor text`);
      }
    }

    console.log(`📊 Comment Alignment: ${alignedCount} aligned, ${misalignedCount} misaligned`);

  } catch (error) {
    stats.errors.push(`Alignment validation failed: ${error.message}`);
  }
}

/**
 * Utility functions
 */

function parseEssayIntoBlocks(content: string): Array<{ text: string; index: number }> {
  // Remove HTML tags and split into paragraphs
  const cleanContent = content
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

  const paragraphs = cleanContent
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  return paragraphs.map((text, index) => ({ text, index }));
}

function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
    .toLowerCase();
}

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function findTextPosition(text: string, searchText: string): { start: number; end: number } | null {
  const index = text.indexOf(searchText);
  if (index === -1) {
    // Try case-insensitive
    const lowerIndex = text.toLowerCase().indexOf(searchText.toLowerCase());
    if (lowerIndex !== -1) {
      return { start: lowerIndex, end: lowerIndex + searchText.length };
    }
    return null;
  }
  return { start: index, end: index + searchText.length };
}

/**
 * Rollback function (in case migration needs to be undone)
 */
export async function rollbackMigration(): Promise<void> {
  console.log('🔄 Rolling back migration...');

  try {
    // Delete new tables (in reverse order due to foreign keys)
    await supabase.from('thread_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('thread_participants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('comment_threads_v2').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('operation_transforms').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('collaborative_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('comment_anchors').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('document_snapshots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('document_operations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('essay_content_blocks').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('✅ Rollback completed');

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

/**
 * Run migration from command line
 */
if (require.main === module) {
  migrateToGoogleDocsSystem()
    .then(stats => {
      console.log('Migration completed with stats:', stats);
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
