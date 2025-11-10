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
  user_id: string | null; // Set when user signs up, allows for backup matching
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
   * Normalize various date input formats (Date, ISO string, timestamp) to a Date object.
   */
  private static normalizeDateValue(value: unknown): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const parsedDate = new Date(value);
      return isNaN(parsedDate.getTime()) ? null : parsedDate;
    }

    // Support Supabase timestamp objects (if ever returned in structured form)
    if (typeof value === 'object' && value !== null) {
      const maybeSeconds = (value as { seconds?: number; milliseconds?: number }).seconds;
      const maybeMilliseconds = (value as { milliseconds?: number; ms?: number }).milliseconds ?? (value as { ms?: number }).ms;
      if (typeof maybeSeconds === 'number') {
        const parsedFromSeconds = new Date(maybeSeconds * 1000);
        return isNaN(parsedFromSeconds.getTime()) ? null : parsedFromSeconds;
      }
      if (typeof maybeMilliseconds === 'number') {
        const parsedFromMs = new Date(maybeMilliseconds);
        return isNaN(parsedFromMs.getTime()) ? null : parsedFromMs;
      }
    }

    return null;
  }

  private static normalizeRequiredDate(value: unknown, context: string): string {
    const normalized = this.normalizeDateValue(value);
    if (normalized) {
      return normalized.toISOString();
    }
    console.warn(`[GuestEssayMigration] Invalid date encountered for ${context}. Falling back to current timestamp.`, {
      value,
      context,
    });
    return new Date().toISOString();
  }

  private static normalizeOptionalDate(value: unknown, context: string): string | null {
    if (!value) {
      return null;
    }
    const normalized = this.normalizeDateValue(value);
    if (normalized) {
      return normalized.toISOString();
    }
    console.warn(`[GuestEssayMigration] Invalid optional date encountered for ${context}. Omitting value.`, {
      value,
      context,
    });
    return null;
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
   * Migrate all guest essays for a user (called after payment succeeds)
   * This ensures all preview essays are migrated to the user's account
   */
  static async migrateAllGuestEssaysForUser(userId: string): Promise<{
    success: boolean;
    migratedCount: number;
    errors: string[];
  }> {
    try {
      // Get all guest essays for this user
      const guestEssays = await this.getGuestEssaysByUserId(userId);
      
      if (guestEssays.length === 0) {
        return {
          success: true,
          migratedCount: 0,
          errors: []
        };
      }

      const errors: string[] = [];
      let migratedCount = 0;

      // Migrate each guest essay
      for (const guestEssay of guestEssays) {
        try {
          const result = await this.migrateGuestEssayToUser(guestEssay.id, userId);
          if (result.success) {
            migratedCount++;
            console.log(`✅ Migrated guest essay ${guestEssay.id} for user ${userId}`);
          } else {
            errors.push(`Failed to migrate essay "${guestEssay.title}": ${result.error}`);
            console.warn(`⚠️ Failed to migrate guest essay ${guestEssay.id}:`, result.error);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Error migrating essay "${guestEssay.title}": ${errorMessage}`);
          console.error(`❌ Error migrating guest essay ${guestEssay.id}:`, error);
        }
      }

      return {
        success: errors.length === 0,
        migratedCount,
        errors
      };
    } catch (error) {
      console.error('Error migrating all guest essays:', error);
      return {
        success: false,
        migratedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Check if a school already exists in the user's school list (case-insensitive)
   */
  private static async schoolExistsForUser(
    userId: string,
    schoolName: string
  ): Promise<boolean> {
    try {
      if (!schoolName || !schoolName.trim()) {
        return false;
      }

      const trimmedSchoolName = schoolName.trim().toLowerCase();

      // Fetch all schools for the user and compare case-insensitively
      const { data, error } = await supabase
        .from('school_recommendations')
        .select('school')
        .eq('student_id', userId);

      if (error) {
        console.warn('Error checking if school exists:', error);
        return false;
      }

      // Check if any school matches (case-insensitive)
      return (data || []).some(
        school => school.school?.toLowerCase() === trimmedSchoolName
      );
    } catch (error) {
      console.warn('Error checking if school exists:', error);
      return false;
    }
  }

  /**
   * Add school to user's school list if it doesn't already exist
   * This is a non-blocking operation - failures are logged but don't stop migration
   */
  private static async ensureSchoolInUserList(
    userId: string,
    schoolName: string | null
  ): Promise<void> {
    try {
      // Skip if no school name provided
      if (!schoolName || !schoolName.trim()) {
        return;
      }

      const trimmedSchoolName = schoolName.trim();

      // Check if school already exists
      const exists = await this.schoolExistsForUser(userId, trimmedSchoolName);
      if (exists) {
        console.log(`School "${trimmedSchoolName}" already exists in user's list, skipping addition`);
        return;
      }

      // Add school with default school_type
      // Using 'research_university' as a safe default - user can update later
      const { error } = await supabase
        .from('school_recommendations')
        .insert({
          student_id: userId,
          school: trimmedSchoolName,
          school_type: 'research_university', // Default value, user can update later
          category: 'target' // Default category
        });

      if (error) {
        console.warn(`Failed to add school "${trimmedSchoolName}" to user's list:`, error);
        // Don't throw - this is non-blocking
      } else {
        console.log(`✅ Added school "${trimmedSchoolName}" to user's school list`);
      }
    } catch (error) {
      console.warn('Error ensuring school in user list:', error);
      // Don't throw - this is non-blocking
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

      // 2.5. Automatically add school to user's school list if it doesn't exist
      // This is non-blocking - if it fails, we still continue with the migration
      if (guestEssay.school_name) {
        await this.ensureSchoolInUserList(userId, guestEssay.school_name);
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
          created_at: GuestEssayMigrationService.normalizeRequiredDate(
            guestEssay.semantic_document.createdAt,
            'semantic_document.createdAt'
          ),
          updated_at: GuestEssayMigrationService.normalizeRequiredDate(
            guestEssay.semantic_document.updatedAt,
            'semantic_document.updatedAt'
          )
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
          resolved_at: GuestEssayMigrationService.normalizeOptionalDate(
            annotation.resolvedAt,
            `annotation.resolvedAt (${annotation.id})`
          ),
          resolved_by: annotation.resolvedBy || null,
          created_at: GuestEssayMigrationService.normalizeRequiredDate(
            annotation.createdAt,
            `annotation.createdAt (${annotation.id})`
          ), // Preserve original timestamps
          updated_at: GuestEssayMigrationService.normalizeRequiredDate(
            annotation.updatedAt,
            `annotation.updatedAt (${annotation.id})`
          ),
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

      // 5. Update guest essay with user_id before deletion (for historical tracking)
      // This provides a backup matching mechanism if guestEssayId is lost
      const { error: updateError } = await supabase
        .from('guest_essays')
        .update({ user_id: userId })
        .eq('id', guestEssayId);

      if (updateError) {
        console.warn('Failed to update guest essay with user_id:', updateError);
        // Don't fail the migration if update fails
      }

      // 6. Delete guest essay (only after successful migration and user_id update)
      const { error: deleteError } = await supabase
        .from('guest_essays')
        .delete()
        .eq('id', guestEssayId);

      if (deleteError) {
        console.warn('Failed to delete guest essay after migration:', deleteError);
        // Don't fail the migration if deletion fails - it will expire anyway
        // The user_id is already set, so we can query by user_id later if needed
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
   * Set user_id on a guest essay (fallback when migration fails)
   * This ensures the guest essay can be recovered later even if migration fails
   */
  static async setUserIdOnGuestEssay(
    guestEssayId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('guest_essays')
        .update({ user_id: userId })
        .eq('id', guestEssayId);

      if (error) {
        console.error('Failed to set user_id on guest essay:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error setting user_id on guest essay:', error);
      return false;
    }
  }

  /**
   * Get all guest essays for a user by user_id
   * This is used to retrieve essays that were scored pre-authentication
   */
  static async getGuestEssaysByUserId(userId: string): Promise<GuestEssay[]> {
    try {
      const { data, error } = await supabase
        .from('guest_essays')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString()) // Only get non-expired essays
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch guest essays by user_id:', error);
        return [];
      }

      return (data || []) as GuestEssay[];
    } catch (error) {
      console.error('Error fetching guest essays by user_id:', error);
      return [];
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

