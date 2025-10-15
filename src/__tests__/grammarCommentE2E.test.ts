/**
 * End-to-End Tests for Grammar Comment Accept/Reject Feature
 * 
 * Tests the complete user journey from grammar error detection
 * to accepting/rejecting corrections with real document scenarios.
 */

import { SemanticDocumentService } from '@/services/semanticDocumentService';
import { CommentEditService } from '@/services/commentEditService';
import { SemanticDocument, DocumentBlock } from '@/types/semanticDocument';

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

describe('Grammar Comment Accept/Reject E2E Tests', () => {
  let semanticService: SemanticDocumentService;

  beforeEach(() => {
    jest.clearAllMocks();
    semanticService = SemanticDocumentService.getInstance();
  });

  describe('Real Essay Scenarios', () => {
    it('should handle a college application essay with multiple grammar errors', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      // Real essay content with grammar errors
      const essayContent = `
        My journey to becoming a doctor began when I was a child. I always knew that I wanted to help people, and medicine seemed like the perfect way to do that. However, its not just about wanting to help people - its about having the skills and knowledge to actually make a difference.
        
        During my undergraduate studies, I worked hard to maintain a high GPA while also participating in various extracurricular activities. I joined the pre-med society, volunteered at the local hospital, and even started a tutoring program for underprivileged students. These experiences taught me that being a doctor is about more then just treating patients - its about being a leader in your community.
        
        One of my most memorable experiences was when I shadowed Dr. Smith at the local hospital. I watched as she diagnosed a patient with a rare condition that other doctors had missed. Her attention to detail and her ability to think critically really impressed me. I realized that being a good doctor requires not just medical knowledge, but also strong analytical skills and the ability to work under pressure.
        
        Looking forward, I am excited about the opportunity to attend medical school and continue my journey towards becoming a doctor. I know that it will be challenging, but I am confident that I have the determination and the skills necessary to succeed. I am particularly interested in specializing in emergency medicine, as I believe that this field offers the opportunity to make the biggest impact on patients lives.
      `;

      // Mock grammar agent response with real errors
      const mockGrammarResponse = {
        success: true,
        comments: [
          {
            comment_text: 'Fix apostrophe: "its" should be "it\'s" (contraction for "it is")',
            original_text: 'its not just about wanting',
            suggested_replacement: "it's not just about wanting",
            anchor_text: 'its not just about wanting',
            confidence_score: 0.98
          },
          {
            comment_text: 'Fix apostrophe: "its" should be "it\'s" (contraction for "it is")',
            original_text: 'its about having the skills',
            suggested_replacement: "it's about having the skills",
            anchor_text: 'its about having the skills',
            confidence_score: 0.98
          },
          {
            comment_text: 'Fix word choice: "then" should be "than" (comparison)',
            original_text: 'more then just treating',
            suggested_replacement: 'more than just treating',
            anchor_text: 'more then just treating',
            confidence_score: 0.95
          },
          {
            comment_text: 'Fix apostrophe: "its" should be "it\'s" (contraction for "it is")',
            original_text: 'its about being a leader',
            suggested_replacement: "it's about being a leader",
            anchor_text: 'its about being a leader',
            confidence_score: 0.98
          },
          {
            comment_text: 'Fix apostrophe: "patients" should be "patients\'" (possessive)',
            original_text: 'patients lives',
            suggested_replacement: "patients' lives",
            anchor_text: 'patients lives',
            confidence_score: 0.90
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

      mockSupabase.from().insert.mockResolvedValue({
        data: [],
        error: null
      });

      // Create document with essay content
      const document: SemanticDocument = {
        id: 'essay-document-id',
        title: 'Medical School Personal Statement',
        blocks: [
          {
            id: 'essay-block-id',
            type: 'paragraph',
            content: essayContent,
            position: 0,
            annotations: [],
            isImmutable: true,
            createdAt: new Date(),
            lastUserEdit: undefined
          }
        ],
        metadata: {
          essayId: 'medical-essay-id',
          author: 'test-user-id'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Generate grammar comments
      const result = await semanticService.generateGrammarComments({
        documentId: document.id,
        blocks: document.blocks,
        context: {
          prompt: 'Write a personal statement for medical school'
        }
      });

      expect(result.success).toBe(true);
      expect(result.comments.length).toBe(5);

      // Verify each comment has valid edit fields
      result.comments.forEach(comment => {
        expect(comment.metadata?.agentType).toBe('grammar');
        expect(comment.metadata?.originalText).toBeDefined();
        expect(comment.metadata?.suggestedReplacement).toBeDefined();
        expect(comment.metadata?.originalText).not.toBe(comment.metadata?.suggestedReplacement);
      });

      // Test accepting the first correction
      const firstComment = result.comments[0];
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          success: true,
          updatedContent: essayContent.replace('its not just about wanting', "it's not just about wanting"),
          message: 'Successfully replaced "its not just about wanting" with "it\'s not just about wanting"'
        },
        error: null
      });

      const acceptResult = await semanticService.applyCommentEdit(
        document,
        firstComment.targetBlockId, // This would be the actual annotation ID in real scenario
        'accept'
      );

      expect(acceptResult).toBe(true);
    });

    it('should handle a business school essay with complex grammar issues', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      const businessEssayContent = `
        As a business leader, I have learned that success is not just about making money - its about creating value for all stakeholders. Throughout my career, I have worked with teams from diverse backgrounds, and I have seen how different perspectives can lead to innovative solutions.
        
        One of my most challenging experiences was when I had to restructure our company's operations during a difficult economic period. The decision was not easy, but I knew that it was necessary for the long-term success of the organization. I worked closely with my team to ensure that the transition was as smooth as possible, and I made sure that everyone understood the reasons behind the changes.
        
        Looking back on this experience, I realize that it taught me valuable lessons about leadership and decision-making. I learned that sometimes you have to make difficult choices, but its important to communicate clearly with your team and to be transparent about your reasoning. I also learned that successful leaders are not afraid to take risks, but they do so thoughtfully and with careful consideration of the potential consequences.
        
        In the future, I hope to continue developing my leadership skills and to take on even greater challenges. I am particularly interested in exploring opportunities in international business, as I believe that global markets offer exciting possibilities for growth and innovation. I am confident that my experience and my commitment to excellence will help me succeed in whatever challenges I face.
      `;

      const mockGrammarResponse = {
        success: true,
        comments: [
          {
            comment_text: 'Fix apostrophe: "its" should be "it\'s" (contraction for "it is")',
            original_text: 'its about creating value',
            suggested_replacement: "it's about creating value",
            anchor_text: 'its about creating value',
            confidence_score: 0.98
          },
          {
            comment_text: 'Fix apostrophe: "its" should be "it\'s" (contraction for "it is")',
            original_text: 'its important to communicate',
            suggested_replacement: "it's important to communicate",
            anchor_text: 'its important to communicate',
            confidence_score: 0.98
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

      mockSupabase.from().insert.mockResolvedValue({
        data: [],
        error: null
      });

      const document: SemanticDocument = {
        id: 'business-essay-id',
        title: 'MBA Application Essay',
        blocks: [
          {
            id: 'business-block-id',
            type: 'paragraph',
            content: businessEssayContent,
            position: 0,
            annotations: [],
            isImmutable: true,
            createdAt: new Date(),
            lastUserEdit: undefined
          }
        ],
        metadata: {
          essayId: 'mba-essay-id',
          author: 'test-user-id'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await semanticService.generateGrammarComments({
        documentId: document.id,
        blocks: document.blocks,
        context: {
          prompt: 'Describe a challenging leadership experience'
        }
      });

      expect(result.success).toBe(true);
      expect(result.comments.length).toBe(2);

      // Test rejecting a correction
      const firstComment = result.comments[0];
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          success: true,
          message: 'Comment rejected'
        },
        error: null
      });

      const rejectResult = await semanticService.applyCommentEdit(
        document,
        firstComment.targetBlockId,
        'reject'
      );

      expect(rejectResult).toBe(true);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle documents with no grammar errors', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      const perfectEssayContent = `
        I am writing to express my interest in your graduate program. Throughout my academic career, I have demonstrated a strong commitment to excellence and a passion for learning. I believe that your program will provide me with the advanced knowledge and skills necessary to achieve my professional goals.
        
        My undergraduate studies in computer science have provided me with a solid foundation in programming, algorithms, and software engineering. I have maintained a high GPA while participating in various research projects and extracurricular activities. These experiences have helped me develop strong analytical skills and the ability to work effectively in team environments.
        
        I am particularly interested in your program's focus on artificial intelligence and machine learning. I have completed several projects in these areas and have published research papers in peer-reviewed journals. I am confident that I can contribute meaningfully to your research community while continuing to develop my expertise in these exciting fields.
      `;

      const mockGrammarResponse = {
        success: true,
        comments: []
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

      const document: SemanticDocument = {
        id: 'perfect-essay-id',
        title: 'Graduate School Application',
        blocks: [
          {
            id: 'perfect-block-id',
            type: 'paragraph',
            content: perfectEssayContent,
            position: 0,
            annotations: [],
            isImmutable: true,
            createdAt: new Date(),
            lastUserEdit: undefined
          }
        ],
        metadata: {
          essayId: 'grad-essay-id',
          author: 'test-user-id'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await semanticService.generateGrammarComments({
        documentId: document.id,
        blocks: document.blocks,
        context: {
          prompt: 'Statement of purpose for graduate school'
        }
      });

      expect(result.success).toBe(true);
      expect(result.comments.length).toBe(0);
    });

    it('should handle documents with very long content', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      // Create a very long essay (simulate a 5000-word essay)
      const longEssayContent = 'This is a very long essay. '.repeat(1000) + 'its important to note that this essay is very long.';

      const mockGrammarResponse = {
        success: true,
        comments: [
          {
            comment_text: 'Fix apostrophe: "its" should be "it\'s"',
            original_text: 'its important to note',
            suggested_replacement: "it's important to note",
            anchor_text: 'its important to note',
            confidence_score: 0.98
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

      mockSupabase.from().insert.mockResolvedValue({
        data: [],
        error: null
      });

      const document: SemanticDocument = {
        id: 'long-essay-id',
        title: 'Long Essay Test',
        blocks: [
          {
            id: 'long-block-id',
            type: 'paragraph',
            content: longEssayContent,
            position: 0,
            annotations: [],
            isImmutable: true,
            createdAt: new Date(),
            lastUserEdit: undefined
          }
        ],
        metadata: {
          essayId: 'long-essay-id',
          author: 'test-user-id'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await semanticService.generateGrammarComments({
        documentId: document.id,
        blocks: document.blocks,
        context: {
          prompt: 'Test prompt for long essay'
        }
      });

      expect(result.success).toBe(true);
      expect(result.comments.length).toBe(1);
    });

    it('should handle network failures gracefully', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      mockSupabase.functions.invoke.mockRejectedValue(new Error('Network timeout'));

      const document: SemanticDocument = {
        id: 'network-test-id',
        title: 'Network Test Essay',
        blocks: [
          {
            id: 'network-block-id',
            type: 'paragraph',
            content: 'This is a test essay with some grammar errors.',
            position: 0,
            annotations: [],
            isImmutable: true,
            createdAt: new Date(),
            lastUserEdit: undefined
          }
        ],
        metadata: {
          essayId: 'network-test-id',
          author: 'test-user-id'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await semanticService.generateGrammarComments({
        documentId: document.id,
        blocks: document.blocks,
        context: {
          prompt: 'Test prompt'
        }
      });

      expect(result.success).toBe(false);
      expect(result.comments.length).toBe(0);
    });
  });

  describe('User Journey Scenarios', () => {
    it('should handle a user accepting some corrections and rejecting others', async () => {
      const mockSupabase = require('@/integrations/supabase/client').supabase;
      
      const essayContent = 'its important to note that this essay has multiple errors. The team are working hard.';

      // Mock multiple grammar comments
      const mockGrammarResponse = {
        success: true,
        comments: [
          {
            comment_text: 'Fix apostrophe: "its" should be "it\'s"',
            original_text: 'its important to note',
            suggested_replacement: "it's important to note",
            anchor_text: 'its important to note',
            confidence_score: 0.98
          },
          {
            comment_text: 'Fix subject-verb disagreement: "team" is singular',
            original_text: 'The team are working',
            suggested_replacement: 'The team is working',
            anchor_text: 'The team are working',
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

      mockSupabase.from().insert.mockResolvedValue({
        data: [],
        error: null
      });

      const document: SemanticDocument = {
        id: 'mixed-actions-id',
        title: 'Mixed Actions Test',
        blocks: [
          {
            id: 'mixed-block-id',
            type: 'paragraph',
            content: essayContent,
            position: 0,
            annotations: [],
            isImmutable: true,
            createdAt: new Date(),
            lastUserEdit: undefined
          }
        ],
        metadata: {
          essayId: 'mixed-actions-id',
          author: 'test-user-id'
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Generate grammar comments
      const result = await semanticService.generateGrammarComments({
        documentId: document.id,
        blocks: document.blocks,
        context: {
          prompt: 'Test prompt'
        }
      });

      expect(result.success).toBe(true);
      expect(result.comments.length).toBe(2);

      // Accept first correction
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          updatedContent: essayContent.replace('its important to note', "it's important to note"),
          message: 'Successfully replaced "its important to note" with "it\'s important to note"'
        },
        error: null
      });

      const acceptResult = await semanticService.applyCommentEdit(
        document,
        result.comments[0].targetBlockId,
        'accept'
      );

      expect(acceptResult).toBe(true);

      // Reject second correction
      mockSupabase.functions.invoke.mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Comment rejected'
        },
        error: null
      });

      const rejectResult = await semanticService.applyCommentEdit(
        document,
        result.comments[1].targetBlockId,
        'reject'
      );

      expect(rejectResult).toBe(true);
    });
  });
});
