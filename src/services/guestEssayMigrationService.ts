/**
 * Guest Essay Migration Service
 * 
 * Handles migration of anonymous user preview essays to user accounts after signup.
 * Ensures users see the exact same comments they previewed, not regenerated ones.
 */

import { supabase } from '@/integrations/supabase/client';
import { SemanticDocument, Annotation } from '@/types/semanticDocument';

export interface GuestEssay {
  id: string;
  title: string;
  school_name: string | null;
  prompt_text: string;
  word_limit: string | null;
  essay_content: string;
  semantic_document: SemanticDocument;
  semantic_annotations: Annotation[];
  grading_scores: {
    bigPicture: number;
    tone: number;
    clarity: number;
  } | null;
  session_id: string | null;
  user_agent: string | null;
  ip_address: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface MigrationResult {
  success: boolean;
  essayId?: string;
  semanticDocumentId?: string;
  error?: string;
}

export class GuestEssayMigrationService {
  /**
   * Calculate word count from essay content
   */
  private static calculateWordCount(text: string): number {
    if (!text || text.trim().length === 0) return 0;
    // Remove HTML tags if present and count words
    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return cleanText ? cleanText.split(' ').filter(word => word.length > 0).length : 0;
  }

  /**
   * Get guest essay by ID (for preview before signup)
   */
  static async getGuestEssay(guestEssayId: string): Promise<GuestEssay | null> {
    try {
      const { data, error } = await supabase
        .from('guest_essays')
        .select('*')
        .eq('id', guestEssayId)
        .single();

      if (error) {
        console.error('Failed to fetch guest essay:', error);
        return null;
      }

      if (!data) {
        return null;
      }

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        console.warn('Guest essay has expired:', guestEssayId);
        return null;
      }

      return data as GuestEssay;
    } catch (error) {
      console.error('Error fetching guest essay:', error);
      return null;
    }
  }

  /**
   * Migrate guest essay to user's account after signup
   */
  static async migrateGuestEssayToUser(
    guestEssayId: string,
    userId: string
  ): Promise<MigrationResult> {
    try {
      // 1. Fetch guest essay
      const guestEssay = await this.getGuestEssay(guestEssayId);
      
      if (!guestEssay) {
        return {
          success: false,
          error: 'Guest essay not found or expired'
        };
      }

      // 2. Create essay in essays table
      const wordCount = this.calculateWordCount(guestEssay.essay_content);
      const characterCount = guestEssay.essay_content.length;

      // Convert semantic document blocks to essay content format
      const essayContent = {
        blocks: guestEssay.semantic_document.blocks.map(block => ({
          id: block.id,
          type: block.type,
          content: block.content,
          metadata: block.metadata || {}
        })),
        metadata: {
          totalWordCount: wordCount,
          totalCharacterCount: characterCount,
          lastSaved: new Date().toISOString()
        }
      };

      const { data: essay, error: essayError } = await supabase
        .from('essays')
        .insert({
          user_id: userId,
          title: guestEssay.title,
          school_name: guestEssay.school_name,
          prompt_text: guestEssay.prompt_text,
          word_limit: guestEssay.word_limit,
          content: essayContent,
          word_count: wordCount,
          character_count: characterCount,
          status: 'draft'
        })
        .select()
        .single();

      if (essayError) {
        console.error('Failed to create essay:', essayError);
        return {
          success: false,
          error: `Failed to create essay: ${essayError.message}`
        };
      }

      // 3. Create semantic document
      const semanticDocMetadata = {
        ...guestEssay.semantic_document.metadata,
        essayId: essay.id,
        author: userId
      };

      const { data: semanticDoc, error: docError } = await supabase
        .from('semantic_documents')
        .insert({
          id: guestEssay.semantic_document.id, // Preserve original ID
          title: guestEssay.semantic_document.title,
          blocks: guestEssay.semantic_document.blocks,
          metadata: semanticDocMetadata,
          created_at: guestEssay.semantic_document.createdAt.toISOString(),
          updated_at: guestEssay.semantic_document.updatedAt.toISOString()
        })
        .select()
        .single();

      if (docError) {
        console.error('Failed to create semantic document:', docError);
        // Clean up essay if semantic document creation fails
        await supabase.from('essays').delete().eq('id', essay.id);
        return {
          success: false,
          error: `Failed to create semantic document: ${docError.message}`
        };
      }

      // 4. Create semantic annotations (preserve original IDs and timestamps)
      if (guestEssay.semantic_annotations && guestEssay.semantic_annotations.length > 0) {
        const annotationsToInsert = guestEssay.semantic_annotations.map(annotation => ({
          id: annotation.id, // Preserve original IDs
          document_id: semanticDoc.id,
          block_id: annotation.targetBlockId,
          type: annotation.type,
          author: annotation.author,
          content: annotation.content,
          target_text: annotation.targetText || null,
          resolved: annotation.resolved || false,
          resolved_at: annotation.resolvedAt ? annotation.resolvedAt.toISOString() : null,
          resolved_by: annotation.resolvedBy || null,
          created_at: annotation.createdAt.toISOString(), // Preserve original timestamps
          updated_at: annotation.updatedAt.toISOString(),
          // Optional edit-action fields
          action_type: annotation.actionType || 'none',
          suggested_replacement: annotation.suggestedReplacement || null,
          original_text: annotation.originalText || null,
          metadata: annotation.metadata || {}
        }));

        const { error: annotationsError } = await supabase
          .from('semantic_annotations')
          .insert(annotationsToInsert);

        if (annotationsError) {
          console.error('Failed to create semantic annotations:', annotationsError);
          // Clean up essay and semantic document if annotations creation fails
          await supabase.from('semantic_documents').delete().eq('id', semanticDoc.id);
          await supabase.from('essays').delete().eq('id', essay.id);
          return {
            success: false,
            error: `Failed to create semantic annotations: ${annotationsError.message}`
          };
        }
      }

      // 5. Delete guest essay (only after successful migration)
      const { error: deleteError } = await supabase
        .from('guest_essays')
        .delete()
        .eq('id', guestEssayId);

      if (deleteError) {
        console.warn('Failed to delete guest essay after migration:', deleteError);
        // Don't fail the migration if deletion fails - it will expire anyway
      }

      return {
        success: true,
        essayId: essay.id,
        semanticDocumentId: semanticDoc.id
      };
    } catch (error) {
      console.error('Error migrating guest essay:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during migration'
      };
    }
  }

  /**
   * Delete guest essay (when user discards)
   */
  static async deleteGuestEssay(guestEssayId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('guest_essays')
        .delete()
        .eq('id', guestEssayId);

      if (error) {
        console.error('Failed to delete guest essay:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting guest essay:', error);
      return false;
    }
  }

  /**
   * Save guest essay after analysis
   */
  static async saveGuestEssay(data: {
    title: string;
    schoolName: string | null;
    promptText: string;
    wordLimit: string | null;
    essayContent: string;
    semanticDocument: SemanticDocument;
    semanticAnnotations: Annotation[];
    gradingScores: {
      bigPicture: number;
      tone: number;
      clarity: number;
    } | null;
    sessionId?: string;
  }): Promise<string | null> {
    try {
      // Generate or get session ID
      const sessionId = data.sessionId || this.getOrCreateSessionId();

      const guestEssayData = {
        title: data.title,
        school_name: data.schoolName,
        prompt_text: data.promptText,
        word_limit: data.wordLimit,
        essay_content: data.essayContent,
        semantic_document: data.semanticDocument,
        semantic_annotations: data.semanticAnnotations,
        grading_scores: data.gradingScores,
        session_id: sessionId,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      };

      const { data: insertedData, error } = await supabase
        .from('guest_essays')
        .insert(guestEssayData)
        .select()
        .single();

      if (error) {
        console.error('Failed to save guest essay:', error);
        return null;
      }

      return insertedData.id;
    } catch (error) {
      console.error('Error saving guest essay:', error);
      return null;
    }
  }

  /**
   * Get or create a session ID from localStorage
   */
  private static getOrCreateSessionId(): string {
    if (typeof window === 'undefined') {
      return crypto.randomUUID();
    }

    const storageKey = 'guest_essay_session_id';
    let sessionId = localStorage.getItem(storageKey);

    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem(storageKey, sessionId);
    }

    return sessionId;
  }
}

