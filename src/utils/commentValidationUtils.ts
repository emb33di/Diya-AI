/**
 * Utility functions for comment validation and quality assurance
 */

export interface CommentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface AnchorTextValidationResult {
  isValid: boolean;
  error?: string;
  suggestedText?: string;
  position?: { start: number; end: number };
}

/**
 * Validate anchor text against essay content
 */
export function validateAnchorText(
  anchorText: string,
  essayContent: string,
  options: {
    caseSensitive?: boolean;
    fuzzyMatch?: boolean;
    minLength?: number;
  } = {}
): AnchorTextValidationResult {
  const {
    caseSensitive = false,
    fuzzyMatch = true,
    minLength = 3
  } = options;

  // Check minimum length
  if (anchorText.length < minLength) {
    return {
      isValid: false,
      error: `Anchor text too short (minimum ${minLength} characters)`
    };
  }

  const content = caseSensitive ? essayContent : essayContent.toLowerCase();
  const anchor = caseSensitive ? anchorText : anchorText.toLowerCase();

  // Exact match
  const exactIndex = content.indexOf(anchor);
  if (exactIndex !== -1) {
    return {
      isValid: true,
      position: {
        start: exactIndex,
        end: exactIndex + anchorText.length
      }
    };
  }

  // Fuzzy match if enabled
  if (fuzzyMatch) {
    const words = anchor.split(' ');
    if (words.length > 1) {
      // Try to find the first word
      const firstWord = words[0];
      const firstWordIndex = content.indexOf(firstWord);
      
      if (firstWordIndex !== -1) {
        // Check if subsequent words are nearby
        let currentIndex = firstWordIndex;
        let allWordsFound = true;
        
        for (let i = 1; i < words.length; i++) {
          const nextWordIndex = content.indexOf(words[i], currentIndex);
          if (nextWordIndex === -1 || nextWordIndex - currentIndex > 100) {
            allWordsFound = false;
            break;
          }
          currentIndex = nextWordIndex;
        }
        
        if (allWordsFound) {
          return {
            isValid: true,
            position: {
              start: firstWordIndex,
              end: currentIndex + words[words.length - 1].length
            }
          };
        }
      }
    }
  }

  // Find similar text
  const suggestedText = findSimilarText(anchorText, essayContent);
  
  return {
    isValid: false,
    error: 'Anchor text not found in essay content',
    suggestedText
  };
}

/**
 * Find similar text in essay content
 */
function findSimilarText(anchorText: string, essayContent: string): string | undefined {
  const words = anchorText.toLowerCase().split(' ');
  const content = essayContent.toLowerCase();
  
  // Find the longest common substring
  let bestMatch = '';
  let bestLength = 0;
  
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j <= words.length; j++) {
      const phrase = words.slice(i, j).join(' ');
      if (phrase.length > bestLength && content.includes(phrase)) {
        bestMatch = phrase;
        bestLength = phrase.length;
      }
    }
  }
  
  return bestMatch.length > 0 ? bestMatch : undefined;
}

/**
 * Validate comment quality and completeness
 */
export function validateCommentQuality(comment: {
  comment_text?: string;
  comment_type?: string;
  confidence_score?: number;
  anchor_text?: string;
  comment_subcategory?: string;
  agent_type?: string;
}): CommentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Required fields validation
  if (!comment.comment_text || comment.comment_text.trim().length === 0) {
    errors.push('Comment text is required');
  } else if (comment.comment_text.length < 10) {
    warnings.push('Comment text is very short');
  } else if (comment.comment_text.length > 500) {
    warnings.push('Comment text is very long');
  }

  if (!comment.comment_type) {
    errors.push('Comment type is required');
  }

  if (!comment.anchor_text || comment.anchor_text.trim().length === 0) {
    errors.push('Anchor text is required');
  }

  // Confidence score validation
  if (comment.confidence_score !== undefined) {
    if (comment.confidence_score < 0 || comment.confidence_score > 1) {
      errors.push('Confidence score must be between 0 and 1');
    } else if (comment.confidence_score < 0.3) {
      warnings.push('Low confidence score');
    }
  }

  // Comment type validation
  const validTypes = ['suggestion', 'critique', 'praise', 'question'];
  if (comment.comment_type && !validTypes.includes(comment.comment_type)) {
    errors.push(`Invalid comment type: ${comment.comment_type}`);
  }

  // Subcategory validation
  const validSubcategories = [
    'opening', 'body', 'conclusion', 'opening-sentence', 
    'transition', 'paragraph-specific', 'paragraph-quality', 'final-sentence'
  ];
  if (comment.comment_subcategory && !validSubcategories.includes(comment.comment_subcategory)) {
    errors.push(`Invalid comment subcategory: ${comment.comment_subcategory}`);
  }

  // Agent type validation
  const validAgentTypes = [
    'big-picture', 'paragraph', 'weaknesses', 'strengths', 
    'reconciliation', 'tone', 'clarity', 'grammar_spelling'
  ];
  if (comment.agent_type && !validAgentTypes.includes(comment.agent_type)) {
    errors.push(`Invalid agent type: ${comment.agent_type}`);
  }

  // Quality suggestions
  if (comment.comment_text && comment.comment_text.length < 50) {
    suggestions.push('Consider providing more detailed feedback');
  }

  if (comment.confidence_score && comment.confidence_score < 0.5) {
    suggestions.push('Consider reviewing the comment for accuracy');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Detect potential duplicate comments
 */
export function detectDuplicateComments(comments: Array<{
  comment_text: string;
  comment_type: string;
  anchor_text: string;
  id: string;
}>): Array<{
  originalId: string;
  duplicateIds: string[];
  similarity: number;
}> {
  const duplicates: Array<{
    originalId: string;
    duplicateIds: string[];
    similarity: number;
  }> = [];
  
  const processed = new Set<string>();
  
  for (let i = 0; i < comments.length; i++) {
    if (processed.has(comments[i].id)) continue;
    
    const currentComment = comments[i];
    const duplicateIds: string[] = [];
    
    for (let j = i + 1; j < comments.length; j++) {
      if (processed.has(comments[j].id)) continue;
      
      const similarity = calculateSimilarity(currentComment, comments[j]);
      if (similarity > 0.8) { // 80% similarity threshold
        duplicateIds.push(comments[j].id);
        processed.add(comments[j].id);
      }
    }
    
    if (duplicateIds.length > 0) {
      duplicates.push({
        originalId: currentComment.id,
        duplicateIds,
        similarity: 0.8 // Approximate
      });
      processed.add(currentComment.id);
    }
  }
  
  return duplicates;
}

/**
 * Calculate similarity between two comments
 */
function calculateSimilarity(comment1: any, comment2: any): number {
  const text1 = `${comment1.comment_text} ${comment1.anchor_text}`.toLowerCase();
  const text2 = `${comment2.comment_text} ${comment2.anchor_text}`.toLowerCase();
  
  // Simple Jaccard similarity
  const words1 = new Set(text1.split(/\s+/));
  const words2 = new Set(text2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

/**
 * Calculate comment priority based on various factors
 */
export function calculateCommentPriority(comment: {
  confidence_score?: number;
  comment_subcategory?: string;
  comment_type?: string;
  is_fallback_comment?: boolean;
  agent_type?: string;
}): number {
  let priority = 5; // Base priority
  
  // Confidence score impact
  if (comment.confidence_score !== undefined) {
    if (comment.confidence_score >= 0.8) {
      priority += 2;
    } else if (comment.confidence_score >= 0.6) {
      priority += 1;
    } else if (comment.confidence_score < 0.4) {
      priority -= 1;
    }
  }
  
  // Subcategory impact
  switch (comment.comment_subcategory) {
    case 'opening-sentence':
      priority += 2;
      break;
    case 'transition':
      priority += 1;
      break;
    case 'paragraph-quality':
      priority += 1;
      break;
    case 'final-sentence':
      priority += 1;
      break;
  }
  
  // Comment type impact
  switch (comment.comment_type) {
    case 'critique':
      priority += 1;
      break;
    case 'suggestion':
      priority += 0;
      break;
    case 'praise':
      priority -= 1;
      break;
  }
  
  // Agent type impact
  switch (comment.agent_type) {
    case 'big-picture':
      priority += 1;
      break;
    case 'paragraph':
      priority += 0;
      break;
    case 'grammar_spelling':
      priority -= 1;
      break;
  }
  
  // Fallback comment penalty
  if (comment.is_fallback_comment) {
    priority -= 3;
  }
  
  // Ensure priority stays within bounds
  return Math.max(1, Math.min(10, priority));
}

/**
 * Sanitize comment text for security
 */
export function sanitizeCommentText(text: string): string {
  // Remove potentially dangerous HTML/script tags
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}