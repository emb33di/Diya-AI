/**
 * Migration Utilities
 * 
 * Tools for migrating from the old TipTap/ProseMirror commenting system
 * to the new semantic document architecture.
 */

import { 
  SemanticDocument, 
  DocumentBlock, 
  Annotation, 
  LegacyComment,
  MigrationResult 
} from '@/types/semanticDocument';
import { semanticDocumentService } from '@/services/semanticDocumentService';
import { supabase } from '@/integrations/supabase/client';

export class MigrationUtils {
  /**
   * Migrate an essay from old system to semantic document
   */
  static async migrateEssay(
    essayId: string, 
    essayContent: string,
    essayTitle: string
  ): Promise<MigrationResult> {
    try {
      console.log(`Starting migration for essay ${essayId}`);

      // Step 1: Convert HTML content to semantic blocks
      const blocks = semanticDocumentService.convertHtmlToBlocks(essayContent);
      
      // Step 2: Create semantic document
      const document: SemanticDocument = {
        id: crypto.randomUUID(),
        title: essayTitle,
        blocks,
        metadata: {
          essayId,
          version: 1
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Step 3: Migrate legacy comments
      const migrationResult = await semanticDocumentService.migrateLegacyComments(
        essayId, 
        document
      );

      if (!migrationResult.success) {
        return migrationResult;
      }

      // Step 4: Store the semantic document
      await semanticDocumentService.saveDocument(document);

      console.log(`Migration completed for essay ${essayId}:`, {
        blocks: document.blocks.length,
        migratedComments: migrationResult.migratedComments,
        failedComments: migrationResult.failedComments
      });

      return migrationResult;

    } catch (error) {
      console.error(`Migration failed for essay ${essayId}:`, error);
      return {
        success: false,
        document: {
          id: crypto.randomUUID(),
          title: essayTitle,
          blocks: [],
          metadata: { essayId },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        migratedComments: 0,
        failedComments: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Batch migrate multiple essays
   */
  static async batchMigrateEssays(
    essayIds: string[]
  ): Promise<Array<{ essayId: string; result: MigrationResult }>> {
    const results = [];

    for (const essayId of essayIds) {
      try {
        // Fetch essay data
        const { data: essay, error } = await supabase
          .from('essays')
          .select('id, title, content')
          .eq('id', essayId)
          .single();

        if (error || !essay) {
          results.push({
            essayId,
            result: {
              success: false,
              document: {
                id: crypto.randomUUID(),
                title: 'Unknown',
                blocks: [],
                metadata: { essayId },
                createdAt: new Date(),
                updatedAt: new Date()
              },
              migratedComments: 0,
              failedComments: 0,
              errors: [`Essay not found: ${error?.message || 'Unknown error'}`]
            }
          });
          continue;
        }

        // Migrate the essay
        const result = await this.migrateEssay(
          essayId,
          essay.content || '',
          essay.title || 'Untitled'
        );

        results.push({ essayId, result });

      } catch (error) {
        results.push({
          essayId,
          result: {
            success: false,
            document: {
              id: crypto.randomUUID(),
              title: 'Unknown',
              blocks: [],
              metadata: { essayId },
              createdAt: new Date(),
              updatedAt: new Date()
            },
            migratedComments: 0,
            failedComments: 0,
            errors: [error instanceof Error ? error.message : 'Unknown error']
          }
        });
      }
    }

    return results;
  }

  /**
   * Validate migration results
   */
  static validateMigration(migrationResult: MigrationResult): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check document structure
    if (migrationResult.document.blocks.length === 0) {
      issues.push('Document has no blocks');
      recommendations.push('Check if HTML content was properly parsed');
    }

    // Check comment migration
    if (migrationResult.failedComments > 0) {
      issues.push(`${migrationResult.failedComments} comments failed to migrate`);
      recommendations.push('Review failed comments and consider manual migration');
    }

    // Check comment distribution
    const totalComments = migrationResult.migratedComments + migrationResult.failedComments;
    if (totalComments > 0) {
      const successRate = migrationResult.migratedComments / totalComments;
      if (successRate < 0.8) {
        issues.push(`Low migration success rate: ${(successRate * 100).toFixed(1)}%`);
        recommendations.push('Consider improving the migration logic for better success rate');
      }
    }

    // Check for duplicate annotations
    const allAnnotations = migrationResult.document.blocks.flatMap(b => b.annotations);
    const annotationIds = new Set();
    const duplicates = allAnnotations.filter(annotation => {
      if (annotationIds.has(annotation.id)) {
        return true;
      }
      annotationIds.add(annotation.id);
      return false;
    });

    if (duplicates.length > 0) {
      issues.push(`${duplicates.length} duplicate annotations found`);
      recommendations.push('Review annotation ID generation logic');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Generate migration report
   */
  static generateMigrationReport(
    results: Array<{ essayId: string; result: MigrationResult }>
  ): {
    summary: {
      totalEssays: number;
      successfulMigrations: number;
      failedMigrations: number;
      totalCommentsMigrated: number;
      totalCommentsFailed: number;
    };
    details: Array<{
      essayId: string;
      success: boolean;
      blocks: number;
      migratedComments: number;
      failedComments: number;
      errors: string[];
    }>;
  } {
    const summary = {
      totalEssays: results.length,
      successfulMigrations: results.filter(r => r.result.success).length,
      failedMigrations: results.filter(r => !r.result.success).length,
      totalCommentsMigrated: results.reduce((sum, r) => sum + r.result.migratedComments, 0),
      totalCommentsFailed: results.reduce((sum, r) => sum + r.result.failedComments, 0)
    };

    const details = results.map(({ essayId, result }) => ({
      essayId,
      success: result.success,
      blocks: result.document.blocks.length,
      migratedComments: result.migratedComments,
      failedComments: result.failedComments,
      errors: result.errors
    }));

    return { summary, details };
  }

  /**
   * Clean up legacy data after successful migration
   */
  static async cleanupLegacyData(essayId: string): Promise<{
    success: boolean;
    deletedComments: number;
    errors: string[];
  }> {
    try {
      // Delete legacy comments
      const { data: deletedComments, error } = await supabase
        .from('essay_comments')
        .delete()
        .eq('essay_id', essayId)
        .select('id');

      if (error) {
        return {
          success: false,
          deletedComments: 0,
          errors: [`Failed to delete legacy comments: ${error.message}`]
        };
      }

      return {
        success: true,
        deletedComments: deletedComments?.length || 0,
        errors: []
      };

    } catch (error) {
      return {
        success: false,
        deletedComments: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Rollback migration (restore from backup)
   */
  static async rollbackMigration(
    essayId: string,
    backupData: {
      document: SemanticDocument;
      legacyComments: LegacyComment[];
    }
  ): Promise<{
    success: boolean;
    errors: string[];
  }> {
    try {
      // Delete semantic document
      const { error: deleteError } = await supabase
        .from('semantic_documents')
        .delete()
        .eq('id', backupData.document.id);

      if (deleteError) {
        return {
          success: false,
          errors: [`Failed to delete semantic document: ${deleteError.message}`]
        };
      }

      // Restore legacy comments
      if (backupData.legacyComments.length > 0) {
        const { error: restoreError } = await supabase
          .from('essay_comments')
          .insert(backupData.legacyComments);

        if (restoreError) {
          return {
            success: false,
            errors: [`Failed to restore legacy comments: ${restoreError.message}`]
          };
        }
      }

      return {
        success: true,
        errors: []
      };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Create backup before migration
   */
  static async createBackup(essayId: string): Promise<{
    success: boolean;
    backupData?: {
      document?: SemanticDocument;
      legacyComments: LegacyComment[];
    };
    errors: string[];
  }> {
    try {
      // Fetch legacy comments
      const { data: legacyComments, error: commentsError } = await supabase
        .from('essay_comments')
        .select('*')
        .eq('essay_id', essayId);

      if (commentsError) {
        return {
          success: false,
          errors: [`Failed to fetch legacy comments: ${commentsError.message}`]
        };
      }

      // Check if semantic document already exists
      const { data: existingDocument } = await supabase
        .from('semantic_documents')
        .select('*')
        .eq('metadata->>essayId', essayId)
        .single();

      return {
        success: true,
        backupData: {
          document: existingDocument || undefined,
          legacyComments: legacyComments || []
        },
        errors: []
      };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}

// Export utility functions
export const migrationUtils = MigrationUtils;
