/**
 * Edge Cases and Error Scenario Tests
 * 
 * Tests various edge cases, error conditions, and boundary scenarios
 * for the grammar comment accept/reject functionality.
 */

import { CommentEditService } from '@/services/commentEditService';
import { SemanticDocumentService } from '@/services/semanticDocumentService';
import { Annotation } from '@/types/semanticDocument';

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: jest.fn()
    },
    auth: {
      getSession: jest.fn(),
      getUser: jest.fn()
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      insert: jest.fn(),
      update: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  }
}));

describe('Grammar Comment Edge Cases and Error Scenarios', () => {
  let semanticService: SemanticDocumentService;

  beforeEach(() => {
    jest.clearAllMocks();
    semanticService = SemanticDocumentService.getInstance();
  });

  describe('Edge Cases', () => {
    it('should handle empty strings in edit fields', () => {
      const annotation: Annotation = {
        id: 'test-id',
        type: 'suggestion',
        author: 'ai',
        content: 'Fix grammar error',
        targetBlockId: 'test-block-id',
        targetText: 'your going',
        createdAt: new Date(),
        updatedAt: new Date(),
        resolved: false,
        metadata: {
          agentType: 'grammar',
          originalText: '',
          suggestedReplacement: "you're going"
        }
      };

      const canEdit = CommentEditService.canEditComment(annotation);
      expect(canEdit).toBe(false);
    });

    it('should handle whitespace-only strings in edit fields', () => {
      const annotation: Annotation = {
        id: 'test-id',
        type: 'suggestion',
        author: 'ai',
        content: 'Fix grammar error',
        targetBlockId: 'test-block-id',
        targetText: 'your going',
        createdAt: new Date(),
        updatedAt: new Date(),
        resolved: false,
        metadata: {
          agentType: 'grammar',
          originalText: '   ',
          suggestedReplacement: "you're going"
        }
      };

      const canEdit = CommentEditService.canEditComment(annotation);
      expect(canEdit).toBe(false);
    });

    it('should handle very long edit fields', () => {
      const longText = 'a'.repeat(10000);
      const annotation: Annotation = {
        id: 'test-id',
        type: 'suggestion',
        author: 'ai',
        content: 'Fix grammar error',
        targetBlockId: 'test-block-id',
        targetText: longText,
        createdAt: new Date(),
        updatedAt: new Date(),
        resolved: false,
        metadata: {
          agentType: 'grammar',
          originalText: longText,
          suggestedReplacement: longText + 'b'
        }
      };

      const canEdit = CommentEditService.canEditComment(annotation);
      expect(canEdit).toBe(true);
    });

    it('should handle special characters in edit fields', () => {
      const specialText = 'Hello, "world"! It\'s a great day.';
      const annotation: Annotation = {
        id: 'test-id',
        type: 'suggestion',
        author: 'ai',
        content: 'Fix punctuation',
        targetBlockId: 'test-block-id',
        targetText: specialText,
        createdAt: new Date(),
        updatedAt: new Date(),
        resolved: false,
        metadata: {
          agentType: 'grammar',
          originalText: specialText,
          suggestedReplacement: 'Hello, "world"! It\'s a great day.'
        }
      };

      const canEdit = CommentEditService.canEditComment(annotation);
      expect(canEdit).toBe(true);
    });

    it('should handle Unicode characters in edit fields', () => {
      const unicodeText = 'Café résumé naïve';
      const annotation: Annotation = {
        id: 'test-id',
        type: 'suggestion',
        author: 'ai',
        content: 'Fix spelling',
        targetBlockId: 'test-block-id',
        targetText: unicodeText,
        createdAt: new Date(),
        updatedAt: new Date(),
        resolved: false,
        metadata: {
          agentType: 'grammar',
          originalText: unicodeText,
          suggestedReplacement: 'Café résumé naïve'
        }
      };

      const canEdit = CommentEditService.canEditComment(annotation);
      expect(canEdit).toBe(true);
    });

    it('should handle annotations with null/undefined metadata', () => {
      const annotation: Annotation = {
        id: 'test-id',
        type: 'suggestion',
        author: 'ai',
        content: 'Fix grammar error',
        targetBlockId: 'test-block-id',
        targetText: 'your going',
        createdAt: new Date(),
        updatedAt: new Date(),
        resolved: false,
        metadata: null as any
      };

      const canEdit = CommentEditService.canEditComment(annotation);
      expect(canEdit).toBe(false);
    });

    it('should handle annotations with partial metadata', () => {
      const annotation: Annotation = {
        id: 'test-id',
        type: 'suggestion',
        author: 'ai',
        content: 'Fix grammar error',
        targetBlockId: 'test-block-id',
        targetText: 'your going',
        createdAt: new Date(),
        updatedAt: new Date(),
        resolved: false,
        metadata: {
          agentType: 'grammar'
          // Missing other fields
        }
      };

      const canEdit = CommentEditService.canEditComment(annotation);
      expect(canEdit).toBe(false);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle Supabase function timeout', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      mockSupabase.functions.invoke.mockRejectedValue(new Error('Function timeout'));

      const result = await CommentEditService.applyEdit({
        documentId: 'test-document-id',
        annotationId: 'test-annotation-id',
        action: 'accept'
      });

      expect(result).toEqual({
        success: false,
        error: 'Function timeout'
      });
    });

    it('should handle Supabase function not found', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: {
          message: 'Function not found',
          code: 'FUNCTION_NOT_FOUND'
        }
      });

      const result = await CommentEditService.applyEdit({
        documentId: 'test-document-id',
        annotationId: 'test-annotation-id',
        action: 'accept'
      });

      expect(result).toEqual({
        success: false,
        error: 'Function not found'
      });
    });

    it('should handle invalid JSON response from edge function', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      mockSupabase.functions.invoke.mockResolvedValue({
        data: 'invalid json response',
        error: null
      });

      const result = await CommentEditService.applyEdit({
        documentId: 'test-document-id',
        annotationId: 'test-annotation-id',
        action: 'accept'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle edge function returning unexpected data structure', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          unexpectedField: 'unexpected value'
        },
        error: null
      });

      const result = await CommentEditService.applyEdit({
        documentId: 'test-document-id',
        annotationId: 'test-annotation-id',
        action: 'accept'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle network connectivity issues', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      mockSupabase.functions.invoke.mockRejectedValue(new Error('Network error: Failed to fetch'));

      const result = await CommentEditService.applyEdit({
        documentId: 'test-document-id',
        annotationId: 'test-annotation-id',
        action: 'accept'
      });

      expect(result).toEqual({
        success: false,
        error: 'Network error: Failed to fetch'
      });
    });

    it('should handle authentication errors', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: {
          message: 'Unauthorized',
          code: 'UNAUTHORIZED'
        }
      });

      const result = await CommentEditService.applyEdit({
        documentId: 'test-document-id',
        annotationId: 'test-annotation-id',
        action: 'accept'
      });

      expect(result).toEqual({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('should handle rate limiting errors', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: {
          message: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED'
        }
      });

      const result = await CommentEditService.applyEdit({
        documentId: 'test-document-id',
        annotationId: 'test-annotation-id',
        action: 'accept'
      });

      expect(result).toEqual({
        success: false,
        error: 'Rate limit exceeded'
      });
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle very short edit fields', () => {
      const annotation: Annotation = {
        id: 'test-id',
        type: 'suggestion',
        author: 'ai',
        content: 'Fix grammar error',
        targetBlockId: 'test-block-id',
        targetText: 'a',
        createdAt: new Date(),
        updatedAt: new Date(),
        resolved: false,
        metadata: {
          agentType: 'grammar',
          originalText: 'a',
          suggestedReplacement: 'A'
        }
      };

      const canEdit = CommentEditService.canEditComment(annotation);
      expect(canEdit).toBe(true);
    });

    it('should handle identical original and suggested text', () => {
      const annotation: Annotation = {
        id: 'test-id',
        type: 'suggestion',
        author: 'ai',
        content: 'Fix grammar error',
        targetBlockId: 'test-block-id',
        targetText: 'your going',
        createdAt: new Date(),
        updatedAt: new Date(),
        resolved: false,
        metadata: {
          agentType: 'grammar',
          originalText: 'your going',
          suggestedReplacement: 'your going'
        }
      };

      const canEdit = CommentEditService.canEditComment(annotation);
      expect(canEdit).toBe(false);
    });

    it('should handle case-only differences', () => {
      const annotation: Annotation = {
        id: 'test-id',
        type: 'suggestion',
        author: 'ai',
        content: 'Fix capitalization',
        targetBlockId: 'test-block-id',
        targetText: 'hello',
        createdAt: new Date(),
        updatedAt: new Date(),
        resolved: false,
        metadata: {
          agentType: 'grammar',
          originalText: 'hello',
          suggestedReplacement: 'Hello'
        }
      };

      const canEdit = CommentEditService.canEditComment(annotation);
      expect(canEdit).toBe(true);
    });

    it('should handle whitespace-only differences', () => {
      const annotation: Annotation = {
        id: 'test-id',
        type: 'suggestion',
        author: 'ai',
        content: 'Fix spacing',
        targetBlockId: 'test-block-id',
        targetText: 'hello world',
        createdAt: new Date(),
        updatedAt: new Date(),
        resolved: false,
        metadata: {
          agentType: 'grammar',
          originalText: 'hello world',
          suggestedReplacement: 'hello  world' // Extra space
        }
      };

      const canEdit = CommentEditService.canEditComment(annotation);
      expect(canEdit).toBe(true);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous edit operations', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      // Mock successful responses for all operations
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          success: true,
          message: 'Operation completed'
        },
        error: null
      });

      const operations = [
        CommentEditService.applyEdit({
          documentId: 'test-document-id',
          annotationId: 'annotation-1',
          action: 'accept'
        }),
        CommentEditService.applyEdit({
          documentId: 'test-document-id',
          annotationId: 'annotation-2',
          action: 'reject'
        }),
        CommentEditService.applyEdit({
          documentId: 'test-document-id',
          annotationId: 'annotation-3',
          action: 'accept'
        })
      ];

      const results = await Promise.all(operations);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      expect(mockSupabase.functions.invoke).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and failure in concurrent operations', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      // Mock mixed responses
      mockSupabase.functions.invoke
        .mockResolvedValueOnce({
          data: { success: true, message: 'Success' },
          error: null
        })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: { success: true, message: 'Success' },
          error: null
        });

      const operations = [
        CommentEditService.applyEdit({
          documentId: 'test-document-id',
          annotationId: 'annotation-1',
          action: 'accept'
        }),
        CommentEditService.applyEdit({
          documentId: 'test-document-id',
          annotationId: 'annotation-2',
          action: 'reject'
        }),
        CommentEditService.applyEdit({
          documentId: 'test-document-id',
          annotationId: 'annotation-3',
          action: 'accept'
        })
      ];

      const results = await Promise.all(operations);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data integrity with malformed annotations', () => {
      const malformedAnnotation = {
        id: 'test-id',
        type: 'suggestion',
        author: 'ai',
        content: 'Fix grammar error',
        targetBlockId: 'test-block-id',
        targetText: 'your going',
        createdAt: new Date(),
        updatedAt: new Date(),
        resolved: false,
        metadata: {
          agentType: 'grammar',
          originalText: 'your going',
          suggestedReplacement: "you're going",
          // Add unexpected fields
          unexpectedField: 'unexpected value',
          anotherField: 123
        }
      } as any;

      const canEdit = CommentEditService.canEditComment(malformedAnnotation);
      expect(canEdit).toBe(true);
    });

    it('should handle circular references in metadata', () => {
      const circularMetadata: any = {
        agentType: 'grammar',
        originalText: 'your going',
        suggestedReplacement: "you're going"
      };
      circularMetadata.self = circularMetadata;

      const annotation: Annotation = {
        id: 'test-id',
        type: 'suggestion',
        author: 'ai',
        content: 'Fix grammar error',
        targetBlockId: 'test-block-id',
        targetText: 'your going',
        createdAt: new Date(),
        updatedAt: new Date(),
        resolved: false,
        metadata: circularMetadata
      };

      // Should not throw error and should still work
      const canEdit = CommentEditService.canEditComment(annotation);
      expect(canEdit).toBe(true);
    });
  });
});
