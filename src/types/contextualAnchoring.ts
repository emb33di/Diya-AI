/**
 * Contextual Anchoring System Types
 * 
 * This file defines the TypeScript interfaces for the new robust commenting system
 * that anchors comments to document structure rather than fragile text matching.
 */

/**
 * Represents a paragraph in the essay with a unique identifier
 */
export interface EssayParagraph {
  paragraphId: string; // e.g., 'para_uuid_12345'
  text: string;
}

/**
 * Input structure sent to the AI agent for comment generation
 */
export interface AIInput {
  documentId: string;
  content: EssayParagraph[];
}

/**
 * Output structure returned by the AI agent for each comment
 */
export interface AICommentOutput {
  comment: string;
  paragraphId: string; // The ID of the paragraph this comment refers to
  anchorText: string;  // The exact substring from that paragraph's text to highlight
  commentType: 'suggestion' | 'critique' | 'praise' | 'question';
  confidenceScore: number;
  commentCategory: 'overall' | 'inline';
  commentSubcategory: 'opening' | 'body' | 'conclusion' | 'opening-sentence' | 'transition' | 'paragraph-specific' | 'paragraph-quality' | 'final-sentence';
  agentType?: 'big-picture' | 'paragraph' | 'weaknesses' | 'strengths' | 'reconciliation';
}

/**
 * Extended comment interface that includes paragraph ID for contextual anchoring
 */
export interface ContextualComment {
  id: string;
  text: string;
  type: 'suggestion' | 'critique' | 'praise' | 'question';
  aiGenerated: boolean;
  resolved: boolean;
  anchorText: string;
  paragraphId?: string; // New field for contextual anchoring
  textSelection: {
    start: { pos: number; path: number[] };
    end: { pos: number; path: number[] };
  };
  hovered?: boolean;
  selected?: boolean;
}

/**
 * Response from AI agent using the new contextual anchoring system
 */
export interface ContextualAICommentResponse {
  success: boolean;
  comments: AICommentOutput[];
  message: string;
  documentId: string;
}

/**
 * Utility type for position finding results
 */
export interface TextPosition {
  from: number;
  to: number;
}

/**
 * Match strategy used for comment positioning
 */
export type MatchStrategy = 'contextual' | 'anchorText' | 'textSelection' | 'paragraphFallback' | 'contentMatch' | 'none';
