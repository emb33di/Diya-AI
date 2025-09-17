/**
 * Semantic Document Service
 * 
 * Service layer for managing semantic documents and annotations.
 * Provides stable, block-based operations for the new commenting system.
 */

import { 
  SemanticDocument, 
  DocumentBlock, 
  Annotation, 
  AnnotationType,
  DocumentOperations,
  LegacyComment,
  MigrationResult,
  AICommentRequest,
  AICommentResponse,
  SemanticComment
} from '@/types/semanticDocument';
import { supabase } from '@/integrations/supabase/client';

export class SemanticDocumentService {
  private static instance: SemanticDocumentService;
  
  public static getInstance(): SemanticDocumentService {
    if (!SemanticDocumentService.instance) {
      SemanticDocumentService.instance = new SemanticDocumentService();
    }
    return SemanticDocumentService.instance;
  }

  /**
   * Create a new semantic document
   */
  async createDocument(
    title: string, 
    essayId: string, 
    userId: string,
    metadata?: any
  ): Promise<SemanticDocument> {
    const document: SemanticDocument = {
      id: crypto.randomUUID(),
      title,
      blocks: [],
      metadata: {
        essayId,
        author: userId,
        version: 1,
        ...metadata
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store in database
    const { error } = await supabase
      .from('semantic_documents')
      .insert({
        id: document.id,
        title: document.title,
        blocks: document.blocks,
        metadata: document.metadata,
        created_at: document.createdAt.toISOString(),
        updated_at: document.updatedAt.toISOString()
      });

    if (error) {
      throw new Error(`Failed to create document: ${error.message}`);
    }

    return document;
  }

  /**
   * Load a semantic document by ID
   */
  async loadDocument(documentId: string): Promise<SemanticDocument | null> {
    const { data, error } = await supabase
      .from('semantic_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Document not found
      }
      throw new Error(`Failed to load document: ${error.message}`);
    }

    return {
      id: data.id,
      title: data.title,
      blocks: data.blocks || [],
      metadata: data.metadata || {},
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  /**
   * Save a semantic document
   */
  async saveDocument(document: SemanticDocument): Promise<void> {
    const { error } = await supabase
      .from('semantic_documents')
      .upsert({
        id: document.id,
        title: document.title,
        blocks: document.blocks,
        metadata: document.metadata,
        updated_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to save document: ${error.message}`);
    }
  }

  /**
   * Add a new block to the document
   */
  addBlock(
    document: SemanticDocument, 
    block: Omit<DocumentBlock, 'id' | 'annotations'>
  ): DocumentBlock {
    const newBlock: DocumentBlock = {
      ...block,
      id: crypto.randomUUID(),
      annotations: []
    };

    // Insert at the specified position
    document.blocks.splice(block.position, 0, newBlock);
    
    // Update positions of subsequent blocks
    document.blocks.forEach((b, index) => {
      b.position = index;
    });

    document.updatedAt = new Date();
    return newBlock;
  }

  /**
   * Update an existing block
   */
  updateBlock(
    document: SemanticDocument, 
    blockId: string, 
    updates: Partial<DocumentBlock>
  ): DocumentBlock | null {
    const blockIndex = document.blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) {
      return null;
    }

    const updatedBlock = {
      ...document.blocks[blockIndex],
      ...updates,
      id: blockId // Ensure ID doesn't change
    };

    document.blocks[blockIndex] = updatedBlock;
    document.updatedAt = new Date();
    return updatedBlock;
  }

  /**
   * Delete a block from the document
   */
  deleteBlock(document: SemanticDocument, blockId: string): boolean {
    const blockIndex = document.blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) {
      return false;
    }

    document.blocks.splice(blockIndex, 1);
    
    // Update positions of remaining blocks
    document.blocks.forEach((b, index) => {
      b.position = index;
    });

    document.updatedAt = new Date();
    return true;
  }

  /**
   * Move a block to a new position
   */
  moveBlock(document: SemanticDocument, blockId: string, newPosition: number): boolean {
    const blockIndex = document.blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1 || newPosition < 0 || newPosition >= document.blocks.length) {
      return false;
    }

    const [block] = document.blocks.splice(blockIndex, 1);
    document.blocks.splice(newPosition, 0, block);
    
    // Update positions of all blocks
    document.blocks.forEach((b, index) => {
      b.position = index;
    });

    document.updatedAt = new Date();
    return true;
  }

  /**
   * Add an annotation to a block
   */
  addAnnotation(
    document: SemanticDocument,
    annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>
  ): Annotation | null {
    const block = document.blocks.find(b => b.id === annotation.targetBlockId);
    if (!block) {
      return null;
    }

    const newAnnotation: Annotation = {
      ...annotation,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    block.annotations.push(newAnnotation);
    document.updatedAt = new Date();
    return newAnnotation;
  }

  /**
   * Update an existing annotation
   */
  updateAnnotation(
    document: SemanticDocument,
    annotationId: string,
    updates: Partial<Annotation>
  ): Annotation | null {
    for (const block of document.blocks) {
      const annotationIndex = block.annotations.findIndex(a => a.id === annotationId);
      if (annotationIndex !== -1) {
        const updatedAnnotation = {
          ...block.annotations[annotationIndex],
          ...updates,
          id: annotationId, // Ensure ID doesn't change
          updatedAt: new Date()
        };

        block.annotations[annotationIndex] = updatedAnnotation;
        document.updatedAt = new Date();
        return updatedAnnotation;
      }
    }

    return null;
  }

  /**
   * Delete an annotation
   */
  deleteAnnotation(document: SemanticDocument, annotationId: string): boolean {
    for (const block of document.blocks) {
      const annotationIndex = block.annotations.findIndex(a => a.id === annotationId);
      if (annotationIndex !== -1) {
        block.annotations.splice(annotationIndex, 1);
        document.updatedAt = new Date();
        return true;
      }
    }

    return false;
  }

  /**
   * Resolve an annotation
   */
  resolveAnnotation(
    document: SemanticDocument, 
    annotationId: string, 
    resolvedBy: string
  ): boolean {
    const annotation = this.findAnnotation(document, annotationId);
    if (!annotation) {
      return false;
    }

    annotation.resolved = true;
    annotation.resolvedAt = new Date();
    annotation.resolvedBy = resolvedBy;
    annotation.updatedAt = new Date();
    document.updatedAt = new Date();
    return true;
  }

  /**
   * Find an annotation by ID
   */
  findAnnotation(document: SemanticDocument, annotationId: string): Annotation | null {
    for (const block of document.blocks) {
      const annotation = block.annotations.find(a => a.id === annotationId);
      if (annotation) {
        return annotation;
      }
    }
    return null;
  }

  /**
   * Get all annotations for a document
   */
  getAllAnnotations(document: SemanticDocument): Annotation[] {
    return document.blocks.flatMap(block => block.annotations);
  }

  /**
   * Get annotations for a specific block
   */
  getBlockAnnotations(document: SemanticDocument, blockId: string): Annotation[] {
    const block = document.blocks.find(b => b.id === blockId);
    return block ? block.annotations : [];
  }

  /**
   * Convert HTML content to semantic blocks
   */
  convertHtmlToBlocks(htmlContent: string): DocumentBlock[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const blocks: DocumentBlock[] = [];

    let position = 0;
    
    const processNode = (node: Node): void => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        
        switch (element.tagName.toLowerCase()) {
          case 'p':
            if (element.textContent?.trim()) {
              blocks.push({
                id: crypto.randomUUID(),
                type: 'paragraph',
                content: element.textContent.trim(),
                position: position++,
                annotations: []
              });
            }
            break;
          case 'h1':
          case 'h2':
          case 'h3':
          case 'h4':
          case 'h5':
          case 'h6':
            if (element.textContent?.trim()) {
              blocks.push({
                id: crypto.randomUUID(),
                type: 'heading',
                content: element.textContent.trim(),
                position: position++,
                annotations: []
              });
            }
            break;
          case 'ul':
          case 'ol':
            if (element.textContent?.trim()) {
              blocks.push({
                id: crypto.randomUUID(),
                type: 'list',
                content: element.textContent.trim(),
                position: position++,
                annotations: []
              });
            }
            break;
          case 'blockquote':
            if (element.textContent?.trim()) {
              blocks.push({
                id: crypto.randomUUID(),
                type: 'quote',
                content: element.textContent.trim(),
                position: position++,
                annotations: []
              });
            }
            break;
          default:
            // Process child nodes
            Array.from(element.childNodes).forEach(processNode);
            break;
        }
      }
    };

    Array.from(doc.body.childNodes).forEach(processNode);
    return blocks;
  }

  /**
   * Convert semantic blocks back to HTML
   */
  convertBlocksToHtml(blocks: DocumentBlock[]): string {
    return blocks
      .sort((a, b) => a.position - b.position)
      .map(block => {
        switch (block.type) {
          case 'heading':
            return `<h2>${this.escapeHtml(block.content)}</h2>`;
          case 'list':
            return `<ul><li>${this.escapeHtml(block.content)}</li></ul>`;
          case 'quote':
            return `<blockquote>${this.escapeHtml(block.content)}</blockquote>`;
          case 'paragraph':
          default:
            return `<p>${this.escapeHtml(block.content)}</p>`;
        }
      })
      .join('\n');
  }

  /**
   * Escape HTML characters
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Generate AI comments for semantic blocks
   */
  async generateAIComments(request: AICommentRequest): Promise<AICommentResponse> {
    const startTime = Date.now();
    
    try {
      // Call the AI service with semantic blocks
      const response = await fetch('/api/ai/generate-semantic-comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        comments: result.comments || [],
        message: result.message,
        metadata: {
          processingTime: Date.now() - startTime,
          blocksAnalyzed: request.blocks.length,
          commentsGenerated: result.comments?.length || 0
        }
      };
    } catch (error) {
      console.error('Error generating AI comments:', error);
      return {
        success: false,
        comments: [],
        message: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          processingTime: Date.now() - startTime,
          blocksAnalyzed: request.blocks.length,
          commentsGenerated: 0
        }
      };
    }
  }

  /**
   * Migrate legacy comments to semantic format
   */
  async migrateLegacyComments(
    essayId: string, 
    document: SemanticDocument
  ): Promise<MigrationResult> {
    try {
      // Fetch legacy comments
      const { data: legacyComments, error } = await supabase
        .from('essay_comments')
        .select('*')
        .eq('essay_id', essayId);

      if (error) {
        throw new Error(`Failed to fetch legacy comments: ${error.message}`);
      }

      const migratedComments: Annotation[] = [];
      const errors: string[] = [];
      let failedComments = 0;

      for (const legacyComment of legacyComments || []) {
        try {
          // Try to find the appropriate block for this comment
          const targetBlock = this.findTargetBlockForLegacyComment(
            document, 
            legacyComment
          );

          if (targetBlock) {
            const annotation: Annotation = {
              id: crypto.randomUUID(),
              type: this.mapLegacyCommentType(legacyComment.comment_type),
              author: legacyComment.ai_generated ? 'ai' : 'user',
              content: legacyComment.comment_text,
              targetBlockId: targetBlock.id,
              targetText: legacyComment.anchor_text,
              createdAt: new Date(legacyComment.created_at),
              updatedAt: new Date(legacyComment.updated_at),
              resolved: legacyComment.resolved,
              metadata: {
                confidence: legacyComment.ai_generated ? 0.8 : undefined,
                category: 'inline'
              }
            };

            targetBlock.annotations.push(annotation);
            migratedComments.push(annotation);
          } else {
            failedComments++;
            errors.push(`Could not find target block for comment: ${legacyComment.id}`);
          }
        } catch (error) {
          failedComments++;
          errors.push(`Failed to migrate comment ${legacyComment.id}: ${error}`);
        }
      }

      return {
        success: true,
        document,
        migratedComments: migratedComments.length,
        failedComments,
        errors
      };
    } catch (error) {
      return {
        success: false,
        document,
        migratedComments: 0,
        failedComments: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Find the best target block for a legacy comment
   */
  private findTargetBlockForLegacyComment(
    document: SemanticDocument, 
    legacyComment: LegacyComment
  ): DocumentBlock | null {
    // Strategy 1: Use paragraph_id if available
    if (legacyComment.paragraph_id) {
      const block = document.blocks.find(b => b.id === legacyComment.paragraph_id);
      if (block) return block;
    }

    // Strategy 2: Use paragraph_index if available
    if (legacyComment.paragraph_index !== null && legacyComment.paragraph_index !== undefined) {
      const block = document.blocks[legacyComment.paragraph_index];
      if (block) return block;
    }

    // Strategy 3: Try to match anchor_text with block content
    if (legacyComment.anchor_text) {
      const block = document.blocks.find(b => 
        b.content.toLowerCase().includes(legacyComment.anchor_text.toLowerCase())
      );
      if (block) return block;
    }

    // Strategy 4: Fallback to first block
    return document.blocks[0] || null;
  }

  /**
   * Map legacy comment type to new annotation type
   */
  private mapLegacyCommentType(legacyType: string): AnnotationType {
    switch (legacyType.toLowerCase()) {
      case 'suggestion':
        return 'suggestion';
      case 'critique':
        return 'critique';
      case 'praise':
        return 'praise';
      case 'question':
        return 'question';
      default:
        return 'comment';
    }
  }
}

// Export singleton instance
export const semanticDocumentService = SemanticDocumentService.getInstance();
