/**
 * Test Configuration for Grammar Comment Accept/Reject Feature
 * 
 * This file contains test utilities, mocks, and configuration
 * for testing the grammar comment functionality.
 */

// Test utilities
export const createMockAnnotation = (overrides: Partial<any> = {}) => ({
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
  },
  ...overrides
});

export const createMockDocument = (overrides: Partial<any> = {}) => ({
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
  updatedAt: new Date(),
  ...overrides
});

export const createMockGrammarResponse = (comments: any[] = []) => ({
  success: true,
  comments: comments.length > 0 ? comments : [
    {
      comment_text: 'Fix apostrophe: "its" should be "it\'s"',
      original_text: 'its important',
      suggested_replacement: "it's important",
      anchor_text: 'its important',
      confidence_score: 0.95
    }
  ]
});

export const createMockEditResponse = (success: boolean = true, overrides: any = {}) => ({
  success,
  message: success ? 'Operation completed successfully' : 'Operation failed',
  ...overrides
});

// Test data for various scenarios
export const TEST_SCENARIOS = {
  VALID_GRAMMAR_COMMENT: {
    comment_text: 'Fix apostrophe: "its" should be "it\'s"',
    original_text: 'its important',
    suggested_replacement: "it's important",
    anchor_text: 'its important',
    confidence_score: 0.95
  },
  
  INVALID_COMMENT_MISSING_REPLACEMENT: {
    comment_text: 'Style suggestion',
    original_text: 'some text'
    // Missing suggested_replacement
  },
  
  SUBJECT_VERB_DISAGREEMENT: {
    comment_text: 'Fix subject-verb disagreement: "team" is singular',
    original_text: 'The team are working',
    suggested_replacement: 'The team is working',
    anchor_text: 'The team are working',
    confidence_score: 0.90
  },
  
  SPELLING_ERROR: {
    comment_text: 'Fix spelling error',
    original_text: 'recieve',
    suggested_replacement: 'receive',
    anchor_text: 'recieve',
    confidence_score: 0.98
  }
};

// Mock Supabase responses
export const MOCK_SUPABASE_RESPONSES = {
  SUCCESS: {
    data: { success: true, message: 'Operation completed' },
    error: null
  },
  
  NETWORK_ERROR: {
    data: null,
    error: { message: 'Network error', code: 'NETWORK_ERROR' }
  },
  
  UNAUTHORIZED: {
    data: null,
    error: { message: 'Unauthorized', code: 'UNAUTHORIZED' }
  },
  
  FUNCTION_NOT_FOUND: {
    data: null,
    error: { message: 'Function not found', code: 'FUNCTION_NOT_FOUND' }
  },
  
  RATE_LIMITED: {
    data: null,
    error: { message: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' }
  }
};

// Test assertions helpers
export const expectValidGrammarComment = (comment: any) => {
  expect(comment.metadata?.agentType).toBe('grammar');
  expect(comment.metadata?.originalText).toBeDefined();
  expect(comment.metadata?.suggestedReplacement).toBeDefined();
  expect(comment.metadata?.originalText).not.toBe(comment.metadata?.suggestedReplacement);
};

export const expectEditableComment = (annotation: any) => {
  expect(annotation.metadata?.agentType).toBe('grammar');
  expect(annotation.metadata?.originalText).toBeDefined();
  expect(annotation.metadata?.suggestedReplacement).toBeDefined();
  expect(annotation.resolved).toBe(false);
};

export const expectNonEditableComment = (annotation: any) => {
  const canEdit = annotation.metadata?.agentType === 'grammar' &&
                 annotation.metadata?.originalText &&
                 annotation.metadata?.suggestedReplacement &&
                 !annotation.resolved;
  expect(canEdit).toBe(false);
};

// Performance test helpers
export const measurePerformance = async (fn: () => Promise<any>) => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return {
    result,
    duration: end - start
  };
};

export const createLargeDocument = (wordCount: number = 1000) => {
  const words = 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua'.split(' ');
  const content = Array.from({ length: wordCount }, () => 
    words[Math.floor(Math.random() * words.length)]
  ).join(' ') + ' its important to note that this is a large document.';
  
  return createMockDocument({
    blocks: [{
      id: 'large-block-id',
      type: 'paragraph',
      content,
      position: 0,
      annotations: [],
      isImmutable: true,
      createdAt: new Date(),
      lastUserEdit: undefined
    }]
  });
};

// Test environment setup
export const setupTestEnvironment = () => {
  // Mock console methods to avoid noise in tests
  const originalConsole = { ...console };
  
  beforeEach(() => {
    console.warn = jest.fn();
    console.error = jest.fn();
    console.log = jest.fn();
  });
  
  afterEach(() => {
    Object.assign(console, originalConsole);
  });
};

export default {
  createMockAnnotation,
  createMockDocument,
  createMockGrammarResponse,
  createMockEditResponse,
  TEST_SCENARIOS,
  MOCK_SUPABASE_RESPONSES,
  expectValidGrammarComment,
  expectEditableComment,
  expectNonEditableComment,
  measurePerformance,
  createLargeDocument,
  setupTestEnvironment
};
