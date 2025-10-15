/**
 * Unit Tests for CommentEditService
 * 
 * Tests the core functionality of the comment edit service including
 * validation, accept/reject operations, and error handling.
 */

import { CommentEditService } from '@/services/commentEditService';
import { Annotation } from '@/types/semanticDocument';

// Mock Supabase client
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: jest.fn()
    }
  }
}));

describe('CommentEditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('canEditComment', () => {
    it('should return true for valid grammar comments with edit fields', () => {
      const annotation: Annotation = {
        id: 'test-annotation-id',
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
          hasValidEditFields: true
        }
      };

      const result = CommentEditService.canEditComment(annotation);
      expect(result).toBe(true);
    });

    it('should return true for grammar comments with edit fields in metadata', () => {
      const annotation: Annotation = {
        id: 'test-annotation-id',
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
          suggestedReplacement: "you're going"
        }
      };

      const result = CommentEditService.canEditComment(annotation);
      expect(result).toBe(true);
    });

    it('should return false for non-grammar comments', () => {
      const annotation: Annotation = {
        id: 'test-annotation-id',
        type: 'suggestion',
        author: 'ai',
        content: 'Tone suggestion',
        targetBlockId: 'test-block-id',
        targetText: 'some text',
        createdAt: new Date(),
        updatedAt: new Date(),
        resolved: false,
        metadata: {
          agentType: 'tone',
          originalText: 'some text',
          suggestedReplacement: 'other text'
        }
      };

      const result = CommentEditService.canEditComment(annotation);
      expect(result).toBe(false);
    });

    it('should return false for resolved comments', () => {
      const annotation: Annotation = {
        id: 'test-annotation-id',
        type: 'suggestion',
        author: 'ai',
        content: 'Fix grammar error',
        targetBlockId: 'test-block-id',
        targetText: 'your going',
        createdAt: new Date(),
        updatedAt: new Date(),
        resolved: true,
        metadata: {
          agentType: 'grammar',
          originalText: 'your going',
          suggestedReplacement: "you're going"
        }
      };

      const result = CommentEditService.canEditComment(annotation);
      expect(result).toBe(false);
    });

    it('should return false for comments without original text', () => {
      const annotation: Annotation = {
        id: 'test-annotation-id',
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
          suggestedReplacement: "you're going"
        }
      };

      const result = CommentEditService.canEditComment(annotation);
      expect(result).toBe(false);
    });

    it('should return false for comments without suggested replacement', () => {
      const annotation: Annotation = {
        id: 'test-annotation-id',
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
          originalText: 'your going'
        }
      };

      const result = CommentEditService.canEditComment(annotation);
      expect(result).toBe(false);
    });

    it('should return false for comments with invalid edit fields flag', () => {
      const annotation: Annotation = {
        id: 'test-annotation-id',
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
          hasValidEditFields: false
        }
      };

      const result = CommentEditService.canEditComment(annotation);
      expect(result).toBe(false);
    });

    it('should return false for comments where original equals suggested', () => {
      const annotation: Annotation = {
        id: 'test-annotation-id',
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

      const result = CommentEditService.canEditComment(annotation);
      expect(result).toBe(false);
    });
  });

  describe('applyEdit', () => {
    const mockSupabase = require('@/integrations/supabase/client').supabase;

    it('should successfully accept an edit', async () => {
      const mockResponse = {
        success: true,
        updatedContent: "you're going to the store",
        message: 'Successfully replaced "your going" with "you\'re going"'
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockResponse,
        error: null
      });

      const result = await CommentEditService.applyEdit({
        documentId: 'test-document-id',
        annotationId: 'test-annotation-id',
        action: 'accept'
      });

      expect(result).toEqual(mockResponse);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('apply-comment-edit', {
        body: {
          documentId: 'test-document-id',
          annotationId: 'test-annotation-id',
          action: 'accept'
        }
      });
    });

    it('should successfully reject an edit', async () => {
      const mockResponse = {
        success: true,
        message: 'Comment rejected'
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockResponse,
        error: null
      });

      const result = await CommentEditService.applyEdit({
        documentId: 'test-document-id',
        annotationId: 'test-annotation-id',
        action: 'reject'
      });

      expect(result).toEqual(mockResponse);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('apply-comment-edit', {
        body: {
          documentId: 'test-document-id',
          annotationId: 'test-annotation-id',
          action: 'reject'
        }
      });
    });

    it('should handle Supabase errors', async () => {
      const mockError = {
        message: 'Function not found'
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: mockError
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

    it('should handle network errors', async () => {
      mockSupabase.functions.invoke.mockRejectedValue(new Error('Network error'));

      const result = await CommentEditService.applyEdit({
        documentId: 'test-document-id',
        annotationId: 'test-annotation-id',
        action: 'accept'
      });

      expect(result).toEqual({
        success: false,
        error: 'Network error'
      });
    });

    it('should handle unknown errors', async () => {
      mockSupabase.functions.invoke.mockRejectedValue('Unknown error');

      const result = await CommentEditService.applyEdit({
        documentId: 'test-document-id',
        annotationId: 'test-annotation-id',
        action: 'accept'
      });

      expect(result).toEqual({
        success: false,
        error: 'Unknown error'
      });
    });
  });

  describe('acceptEdit', () => {
    const mockSupabase = require('@/integrations/supabase/client').supabase;

    it('should call applyEdit with accept action', async () => {
      const mockResponse = {
        success: true,
        updatedContent: "you're going to the store",
        message: 'Successfully replaced "your going" with "you\'re going"'
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockResponse,
        error: null
      });

      const result = await CommentEditService.acceptEdit('test-document-id', 'test-annotation-id');

      expect(result).toEqual(mockResponse);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('apply-comment-edit', {
        body: {
          documentId: 'test-document-id',
          annotationId: 'test-annotation-id',
          action: 'accept'
        }
      });
    });
  });

  describe('rejectEdit', () => {
    const mockSupabase = require('@/integrations/supabase/client').supabase;

    it('should call applyEdit with reject action', async () => {
      const mockResponse = {
        success: true,
        message: 'Comment rejected'
      };

      mockSupabase.functions.invoke.mockResolvedValue({
        data: mockResponse,
        error: null
      });

      const result = await CommentEditService.rejectEdit('test-document-id', 'test-annotation-id');

      expect(result).toEqual(mockResponse);
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('apply-comment-edit', {
        body: {
          documentId: 'test-document-id',
          annotationId: 'test-annotation-id',
          action: 'reject'
        }
      });
    });
  });
});
