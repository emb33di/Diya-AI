/**
 * Integration Tests for Grammar Comment Accept/Reject Flow
 * 
 * Tests the complete integration between all components including
 * grammar agent, semantic document service, comment edit service,
 * and UI components.
 */

import { SemanticDocumentService } from '@/services/semanticDocumentService';
import { CommentEditService } from '@/services/commentEditService';
import { SemanticDocument, DocumentBlock, Annotation } from '@/types/semanticDocument';

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

describe('Grammar Comment Accept/Reject Integration', () => {
  let mockDocument: SemanticDocument;
  let mockAnnotation: Annotation;
  let semanticService: SemanticDocumentService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    semanticService = SemanticDocumentService.getInstance();

    // Create mock document with grammar error
    mockDocument = {
      id: 'test-document-id',
      title: 'Test Essay',
      blocks: [
        {
          id: 'test-block-id',
          type: 'paragraph',
          content: 'your going to the store today',
          position: 0,
          annotations: [],
          isImmutable: true,
          createdAt: new Date(),
          lastUserEdit: undefined
        }
      ],
      metadata: {
        essayId: 'test-essay-id',
        author: 'test-user-id'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create mock grammar annotation
    mockAnnotation = {
      id: 'test-annotation-id',
      type: 'suggestion',
      author: 'ai',
      content: 'Fix apostrophe: "your" should be "you\'re"',
      targetBlockId: 'test-block-id',
      targetText: 'your going',
      createdAt: new Date(),
      updatedAt: new Date(),
      resolved: false,
      metadata: {
        agentType: 'grammar',
        originalText: 'your going',
        suggestedReplacement: "you're going",
        hasValidEditFields: true
      }
    };

    // Add annotation to document
    mockDocument.blocks[0].annotations.push(mockAnnotation);
  });

  describe('Complete Accept Flow', () => {
    it('should successfully accept a grammar correction', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      // Mock successful edge function response
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          success: true,
          updatedContent: "you're going to the store today",
          message: 'Successfully replaced "your going" with "you\'re going"'
        },
        error: null
      });

      // Test the complete flow
      const result = await semanticService.applyCommentEdit(
        mockDocument,
        mockAnnotation.id,
        'accept'
      );

      expect(result).toBe(true);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('apply-comment-edit', {
        body: {
          documentId: mockDocument.id,
          annotationId: mockAnnotation.id,
          action: 'accept'
        }
      });

      // Verify local document state was updated
      const updatedAnnotation = mockDocument.blocks[0].annotations[0];
      expect(updatedAnnotation.resolved).toBe(true);
      expect(updatedAnnotation.actionType).toBe('accepted');
      expect(updatedAnnotation.replacementAppliedAt).toBeDefined();
    });

    it('should handle accept failure gracefully', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      // Mock failed edge function response
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          success: false,
          error: 'Text not found in document'
        },
        error: null
      });

      const result = await semanticService.applyCommentEdit(
        mockDocument,
        mockAnnotation.id,
        'accept'
      );

      expect(result).toBe(false);
      
      // Verify local document state was not updated
      const annotation = mockDocument.blocks[0].annotations[0];
      expect(annotation.resolved).toBe(false);
      expect(annotation.actionType).toBeUndefined();
    });
  });

  describe('Complete Reject Flow', () => {
    it('should successfully reject a grammar correction', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      // Mock successful edge function response
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          success: true,
          message: 'Comment rejected'
        },
        error: null
      });

      const result = await semanticService.applyCommentEdit(
        mockDocument,
        mockAnnotation.id,
        'reject'
      );

      expect(result).toBe(true);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('apply-comment-edit', {
        body: {
          documentId: mockDocument.id,
          annotationId: mockAnnotation.id,
          action: 'reject'
        }
      });

      // Verify local document state was updated
      const updatedAnnotation = mockDocument.blocks[0].annotations[0];
      expect(updatedAnnotation.resolved).toBe(true);
      expect(updatedAnnotation.actionType).toBe('rejected');
    });
  });

  describe('Validation Integration', () => {
    it('should correctly identify editable annotations', () => {
      const canEdit = semanticService.canEditAnnotation(mockAnnotation);
      expect(canEdit).toBe(true);
    });

    it('should correctly identify non-editable annotations', () => {
      const nonEditableAnnotation = {
        ...mockAnnotation,
        metadata: {
          agentType: 'tone',
          originalText: 'some text',
          suggestedReplacement: 'other text'
        }
      };

      const canEdit = semanticService.canEditAnnotation(nonEditableAnnotation);
      expect(canEdit).toBe(false);
    });

    it('should handle annotations without edit fields', () => {
      const annotationWithoutEditFields = {
        ...mockAnnotation,
        metadata: {
          agentType: 'grammar',
          hasValidEditFields: false
        }
      };

      const canEdit = semanticService.canEditAnnotation(annotationWithoutEditFields);
      expect(canEdit).toBe(false);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle network errors in the complete flow', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      mockSupabase.functions.invoke.mockRejectedValue(new Error('Network error'));

      const result = await semanticService.applyCommentEdit(
        mockDocument,
        mockAnnotation.id,
        'accept'
      );

      expect(result).toBe(false);
    });

    it('should handle invalid annotation IDs', async () => {
      const result = await semanticService.applyCommentEdit(
        mockDocument,
        'non-existent-annotation-id',
        'accept'
      );

      expect(result).toBe(false);
    });

    it('should handle invalid actions', async () => {
      const result = await semanticService.applyCommentEdit(
        mockDocument,
        mockAnnotation.id,
        'invalid-action' as any
      );

      expect(result).toBe(false);
    });
  });

  describe('Grammar Agent Integration', () => {
    it('should process grammar agent response correctly', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      // Mock grammar agent response
      const mockGrammarResponse = {
        success: true,
        comments: [
          {
            comment_text: 'Fix apostrophe: "its" should be "it\'s"',
            original_text: 'its important',
            suggested_replacement: "it's important",
            anchor_text: 'its important',
            confidence_score: 0.95
          }
        ]
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockGrammarResponse,
        error: null
      });

      mockSupabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-token'
          }
        }
      });

      // Mock database insert
      mockSupabase.from().insert.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await semanticService.generateGrammarComments({
        documentId: 'test-document-id',
        blocks: mockDocument.blocks,
        context: {
          prompt: 'Test prompt'
        }
      });

      expect(result.success).toBe(true);
      expect(result.comments.length).toBeGreaterThan(0);
      
      const comment = result.comments[0];
      expect(comment.metadata?.agentType).toBe('grammar');
      expect(comment.metadata?.originalText).toBe('its important');
      expect(comment.metadata?.suggestedReplacement).toBe("it's important");
    });
  });

  describe('UI Integration Points', () => {
    it('should provide correct data for UI components', () => {
      // Test that the annotation has all required fields for UI
      expect(mockAnnotation.metadata?.agentType).toBe('grammar');
      expect(mockAnnotation.metadata?.originalText).toBeDefined();
      expect(mockAnnotation.metadata?.suggestedReplacement).toBeDefined();
      expect(mockAnnotation.resolved).toBe(false);

      // Test that CommentEditService can validate the annotation
      const canEdit = CommentEditService.canEditComment(mockAnnotation);
      expect(canEdit).toBe(true);
    });

    it('should handle resolved annotations correctly', () => {
      const resolvedAnnotation = {
        ...mockAnnotation,
        resolved: true,
        actionType: 'accepted' as const,
        replacementAppliedAt: new Date()
      };

      const canEdit = CommentEditService.canEditComment(resolvedAnnotation);
      expect(canEdit).toBe(false);
    });
  });

  describe('Annotation Deletion Persistence', () => {
    it('should persist annotation deletion to database', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      // Mock successful deletion
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } }
      });

      // Test deletion persistence
      await semanticService.persistAnnotationDeletion('test-annotation-id');

      // Verify database call was made
      expect(mockSupabase.from).toHaveBeenCalledWith('semantic_annotations');
      expect(mockSupabase.from().delete).toHaveBeenCalled();
      expect(mockSupabase.from().delete().eq).toHaveBeenCalledWith('id', 'test-annotation-id');
    });

    it('should handle deletion persistence errors gracefully', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      // Mock deletion error
      mockSupabase.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ 
            error: { message: 'Database error' } 
          })
        })
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } }
      });

      // Test error handling
      await expect(
        semanticService.persistAnnotationDeletion('test-annotation-id')
      ).rejects.toThrow('Failed to persist annotation deletion');
    });

    it('should handle authentication errors during deletion', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      // Mock authentication error
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null }
      });

      // Test authentication error handling
      await expect(
        semanticService.persistAnnotationDeletion('test-annotation-id')
      ).rejects.toThrow();
    });
  });
});
