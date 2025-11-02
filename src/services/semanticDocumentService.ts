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
  AICommentRequest,
  AICommentResponse,
  SemanticComment
} from '@/types/semanticDocument';
import { supabase } from '@/integrations/supabase/client';
import { CommentEditService } from '@/services/commentEditService';
import { EssayVersionService } from '@/services/essayVersionService';

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
    // Create the first empty block ready for typing
    const firstBlock: DocumentBlock = {
      id: crypto.randomUUID(),
      type: 'paragraph',
      content: '',
      position: 0,
      annotations: [],
      isImmutable: false, // Allow editing
      createdAt: new Date(),
      lastUserEdit: undefined
    };

    const document: SemanticDocument = {
      id: crypto.randomUUID(),
      title,
      blocks: [firstBlock], // Start with one empty block ready for typing
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

    // Load associated annotations (non-blocking - if it fails, we still return the document)
    let annotations: Annotation[] = [];
    try {
      annotations = await this.loadAnnotationsForDocument(documentId);
    } catch (error) {
      console.warn('Failed to load annotations, continuing without them:', error);
    }

    // Check if blocks contain raw HTML content and convert if needed
    let blocks = data.blocks || [];
    
    // If blocks contain HTML content (like <p> tags), convert them to proper semantic blocks
    const hasHtmlContent = blocks.some(block => 
      block.content && 
      typeof block.content === 'string' && 
      block.content.includes('<') && 
      block.content.includes('>')
    );

    if (hasHtmlContent) {
      console.log('Converting HTML content to semantic blocks for document:', documentId);
      // Convert HTML content to semantic blocks
      const htmlContent = blocks.map(block => block.content).join('');
      blocks = this.convertHtmlToBlocks(htmlContent, false);
    }

    // Attach annotations to their respective blocks
    const processedBlocks = blocks.map(block => ({
      ...block,
      annotations: annotations.filter(annotation => annotation.targetBlockId === block.id)
    }));

    return {
      id: data.id,
      title: data.title,
      blocks: processedBlocks,
      metadata: data.metadata || {},
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  /**
   * Load a semantic document by essay ID (from metadata)
   */
  async loadDocumentByEssayId(essayId: string): Promise<SemanticDocument | null> {
    try {
      // First try to get all documents and filter client-side as a fallback
      const { data: allDocs, error } = await supabase
        .from('semantic_documents')
        .select('*');

      if (error) {
        console.error(`SemanticDocumentService: Failed to load documents for essay ${essayId} - ${error.message}`);
        throw new Error(`Failed to load documents: ${error.message}`);
      }
      
      // Filter client-side to find the document with matching essayId
      // Sort by updated_at descending to get the most recent document
      const matchingDocs = allDocs?.filter(doc => 
        doc.metadata && doc.metadata.essayId === essayId
      ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      
      const matchingDoc = matchingDocs?.[0]; // Get the most recent document

      if (!matchingDoc) {
        console.log(`SemanticDocumentService: No document found for essay ${essayId} - user may need to create a new document`);
        return null;
      }

      // Clean up duplicate documents if there are multiple
      if (matchingDocs && matchingDocs.length > 1) {
        console.log(`SemanticDocumentService: Found ${matchingDocs.length} duplicate documents for essay ${essayId}, cleaning up duplicates`);
        const cleanupResult = await this.cleanupDuplicateDocuments(essayId);
        if (cleanupResult.success && cleanupResult.deletedCount > 0) {
          console.log(`SemanticDocumentService: Cleaned up ${cleanupResult.deletedCount} duplicate documents for essay ${essayId}`);
        }
      }

      // Load associated annotations (non-blocking - if it fails, we still return the document)
      let annotations: Annotation[] = [];
      try {
        annotations = await this.loadAnnotationsForDocument(matchingDoc.id);
      } catch (error) {
        console.warn('Failed to load annotations, continuing without them:', error);
      }

      // Check if blocks contain raw HTML content and convert if needed
      let blocks = matchingDoc.blocks || [];
      
      // If blocks contain HTML content (like <p> tags), convert them to proper semantic blocks
      const hasHtmlContent = blocks.some(block => 
        block.content && 
        typeof block.content === 'string' && 
        block.content.includes('<') && 
        block.content.includes('>')
      );

      if (hasHtmlContent) {
        console.log('Converting HTML content to semantic blocks for essay:', essayId);
        // Convert HTML content to semantic blocks
        const htmlContent = blocks.map(block => block.content).join('');
        blocks = this.convertHtmlToBlocks(htmlContent, false);
      }

      // Attach annotations to their respective blocks
      const processedBlocks = blocks.map(block => {
        const blockAnnotations = annotations.filter(annotation => annotation.targetBlockId === block.id);
        return {
          ...block,
          annotations: blockAnnotations
        };
      });
      
      console.log(`SemanticDocumentService: Successfully loaded document for essay ${essayId} - ${processedBlocks.length} blocks, ${annotations.length} annotations`);

      return {
        id: matchingDoc.id,
        title: matchingDoc.title,
        blocks: processedBlocks,
        metadata: matchingDoc.metadata || {},
        createdAt: new Date(matchingDoc.created_at),
        updatedAt: new Date(matchingDoc.updated_at)
      };
    } catch (error) {
      console.error('Error in loadDocumentByEssayId:', error);
      return null;
    }
  }

  /**
   * Clean up duplicate documents for an essay (keep only the most recent one)
   */
  async cleanupDuplicateDocuments(essayId: string): Promise<{
    success: boolean;
    deletedCount: number;
    errors: string[];
  }> {
    try {
      // Get all documents for this essay
      const { data: allDocs, error } = await supabase
        .from('semantic_documents')
        .select('*');

      if (error) {
        return {
          success: false,
          deletedCount: 0,
          errors: [`Failed to fetch documents: ${error.message}`]
        };
      }

      const matchingDocs = allDocs?.filter(doc => 
        doc.metadata && doc.metadata.essayId === essayId
      ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      if (!matchingDocs || matchingDocs.length <= 1) {
        return {
          success: true,
          deletedCount: 0,
          errors: []
        };
      }

      // Keep the most recent document, delete the rest
      const docsToDelete = matchingDocs.slice(1);
      const deleteIds = docsToDelete.map(doc => doc.id);

      const { error: deleteError } = await supabase
        .from('semantic_documents')
        .delete()
        .in('id', deleteIds);

      if (deleteError) {
        return {
          success: false,
          deletedCount: 0,
          errors: [`Failed to delete duplicate documents: ${deleteError.message}`]
        };
      }

      return {
        success: true,
        deletedCount: docsToDelete.length,
        errors: []
      };

    } catch (error) {
      return {
        success: false,
        deletedCount: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Load annotations for a document from the semantic_annotations table
   */
  private async loadAnnotationsForDocument(documentId: string): Promise<Annotation[]> {
    try {
      const { data, error } = await supabase
        .from('semantic_annotations')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error(`SemanticDocumentService: Failed to load annotations for document ${documentId} - ${error.message}`);
        return [];
      }

      return (data || []).map(annotation => ({
        id: annotation.id,
        type: annotation.type as AnnotationType,
        author: annotation.author as 'ai' | 'user',
        content: annotation.content,
        targetBlockId: annotation.block_id,
        targetText: annotation.target_text,
        createdAt: new Date(annotation.created_at),
        updatedAt: new Date(annotation.updated_at),
        resolved: annotation.resolved || false,
        resolvedAt: annotation.resolved_at ? new Date(annotation.resolved_at) : undefined,
        resolvedBy: annotation.resolved_by,
        metadata: annotation.metadata
      }));
    } catch (error) {
      console.error(`SemanticDocumentService: Error loading annotations for document ${documentId} - ${error.message}`);
      return [];
    }
  }

  /**
   * Ensure essay exists in essays table for RLS policies
   */
  private async ensureEssayExists(essayId: string, title: string): Promise<void> {
    try {
      // Check if essay exists
      const { data: existingEssay, error: checkError } = await supabase
        .from('essays')
        .select('id')
        .eq('id', essayId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error(`SemanticDocumentService: Error checking essay existence for essay ${essayId} - ${checkError.message}`);
        return;
      }

      // If essay doesn't exist, create it
      if (!existingEssay) {
        console.log(`SemanticDocumentService: Creating essay record for essay ${essayId} - "${title}"`);
        
        const { error: insertError } = await supabase
          .from('essays')
          .insert({
            id: essayId,
            title: title,
            content: { blocks: [] }, // Empty content initially
            user_id: (await supabase.auth.getUser()).data.user?.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error(`SemanticDocumentService: Failed to create essay record for essay ${essayId} - ${insertError.message}`);
        } else {
          console.log(`SemanticDocumentService: Successfully created essay record for essay ${essayId}`);
        }
      }
    } catch (error) {
      console.error(`SemanticDocumentService: Error in ensureEssayExists for essay ${essayId} - ${error.message}`);
    }
  }

  /**
   * Save a semantic document
   */
  async saveDocument(document: SemanticDocument): Promise<void> {
    try {
      // Ensure the essay exists in essays table for RLS policies
      const essayId = document.metadata?.essayId;
      if (essayId) {
        await this.ensureEssayExists(essayId, document.title);
      }

      // Check if document exists first - CRITICAL for preventing HMR data loss
      const { data: existingDocData, error: checkError } = await supabase
        .from('semantic_documents')
        .select('*')
        .eq('id', document.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Failed to check existing document: ${checkError.message}`);
      }

      // Critical safeguard: Never overwrite a document with content using an empty document
      // This prevents HMR or reload bugs from saving empty state over existing content
      if (existingDocData && existingDocData.blocks && document.blocks) {
        const existingHasContent = existingDocData.blocks.some((block: any) => 
          block.content && typeof block.content === 'string' && block.content.trim().length > 0
        );
        const newIsEmpty = !document.blocks.some((block: any) => 
          block.content && typeof block.content === 'string' && block.content.trim().length > 0
        );

        if (existingHasContent && newIsEmpty) {
          const errorMsg = `[SAFETY] Preventing save: Attempted to overwrite document ${document.id} with empty content. Existing document has ${existingDocData.blocks.length} blocks with content.`;
          console.error(errorMsg);
          console.error('Existing document blocks:', existingDocData.blocks.map((b: any) => ({ id: b.id, contentLength: b.content?.length || 0 })));
          console.error('New document blocks:', document.blocks.map((b: any) => ({ id: b.id, contentLength: b.content?.length || 0 })));
          throw new Error('Cannot save empty document over existing document with content. This prevents data loss during hot reload.');
        }
      }

      const { data, error } = await supabase
        .from('semantic_documents')
        .upsert({
          id: document.id,
          title: document.title,
          blocks: document.blocks,
          metadata: document.metadata,
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error(`SemanticDocumentService: Failed to save document ${document.id} for essay ${essayId} - ${error.message}`);
        throw new Error(`Failed to save document: ${error.message}`);
      }

      console.log(`SemanticDocumentService: Successfully saved document ${document.id} for essay ${essayId} - ${document.blocks.length} blocks`);
      
      // Ensure Version 1 exists if document has text content
      if (essayId) {
        await this.ensureVersion1Exists(document);
      }
    } catch (error) {
      console.error(`SemanticDocumentService: Error saving document ${document.id} - ${error.message}`);
      throw error;
    }
  }

  /**
   * Add a new block to the document
   */
  addBlock(
    document: SemanticDocument, 
    block: Omit<DocumentBlock, 'id' | 'annotations' | 'isImmutable' | 'createdAt' | 'lastUserEdit'>,
    isUserCreated: boolean = true
  ): DocumentBlock {
    const newBlock: DocumentBlock = {
      ...block,
      id: crypto.randomUUID(),
      annotations: [],
      isImmutable: true, // Blocks are immutable by default
      createdAt: new Date(),
      lastUserEdit: isUserCreated ? new Date() : undefined
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
    updates: Partial<DocumentBlock>,
    isUserEdit: boolean = false
  ): DocumentBlock | null {
    const blockIndex = document.blocks.findIndex(b => b.id === blockId);
    if (blockIndex === -1) {
      return null;
    }

    const existingBlock = document.blocks[blockIndex];
    
    // Check if block is immutable and this is not a user edit
    if (existingBlock.isImmutable && !isUserEdit) {
      console.warn(`Block ${blockId} is immutable and cannot be updated by system`);
      return null;
    }

    const updatedBlock = {
      ...existingBlock,
      ...updates,
      id: blockId, // Ensure ID doesn't change
      lastUserEdit: isUserEdit ? new Date() : existingBlock.lastUserEdit
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
   * Persist resolved state for an annotation to Supabase
   */
  async persistAnnotationResolution(annotationId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const resolvedAtIso = new Date().toISOString();

      const { error } = await (supabase.from as any)('semantic_annotations')
        .update({
          resolved: true,
          resolved_at: resolvedAtIso,
          resolved_by: user?.id || null
        } as any)
        .eq('id' as any, annotationId as any);

      if (error) {
        throw new Error(error.message);
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to persist annotation resolution');
    }
  }

  /**
   * Persist deletion of an annotation to Supabase
   */
  async persistAnnotationDeletion(annotationId: string): Promise<void> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { error } = await (supabase.from as any)('semantic_annotations')
        .delete()
        .eq('id' as any, annotationId as any);

      if (error) {
        throw new Error(error.message);
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to persist annotation deletion');
    }
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
   * Check if a block can be edited by the user
   */
  canEditBlock(document: SemanticDocument, blockId: string): boolean {
    const block = document.blocks.find(b => b.id === blockId);
    if (!block) return false;
    
    // Blocks are always editable by users, but immutable blocks cannot be changed by system
    return true;
  }

  /**
   * Check if a block is immutable (cannot be changed by system)
   */
  isBlockImmutable(document: SemanticDocument, blockId: string): boolean {
    const block = document.blocks.find(b => b.id === blockId);
    return block?.isImmutable ?? false;
  }

  /**
   * Convert HTML content to semantic blocks
   * Only used for initial document creation - blocks become immutable after creation
   */
  convertHtmlToBlocks(htmlContent: string, isInitialCreation: boolean = true): DocumentBlock[] {
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
                annotations: [],
                isImmutable: true, // Blocks are immutable from creation
                createdAt: new Date(),
                lastUserEdit: undefined // No user edit yet
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
                annotations: [],
                isImmutable: true,
                createdAt: new Date(),
                lastUserEdit: undefined
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
                annotations: [],
                isImmutable: true,
                createdAt: new Date(),
                lastUserEdit: undefined
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
                annotations: [],
                isImmutable: true,
                createdAt: new Date(),
                lastUserEdit: undefined
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
   * Generate grammar comments for semantic blocks (block by block analysis)
   */
  async generateGrammarComments(request: AICommentRequest): Promise<AICommentResponse> {
    const startTime = Date.now();
    
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      const allGrammarComments: any[] = [];
      const totalBlocks = request.blocks.length;

      // Process each block individually for comprehensive grammar analysis
      for (let blockIndex = 0; blockIndex < request.blocks.length; blockIndex++) {
        const block = request.blocks[blockIndex];
        
        // Skip empty blocks
        if (!block.content || block.content.trim().length < 10) {
          continue;
        }


        try {
          // Call the grammar agent edge function for this specific block
          const { data, error } = await supabase.functions.invoke('ai_agent_grammar_spelling', {
            body: {
              essayContent: block.content,
              essayPrompt: request.context?.prompt,
              blockId: block.id,
              blockIndex: blockIndex,
              totalBlocks: totalBlocks
            },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            }
          });

          if (error) {
            console.error(`SemanticDocumentService: Grammar agent error for block ${blockIndex + 1}/${totalBlocks} - ${error.message}`);
            continue; // Continue with other blocks even if one fails
          }

          // Add block context to comments
          const blockComments = (data.comments || []).map((comment: any) => ({
            ...comment,
            blockId: block.id,
            blockIndex: blockIndex
          }));

          allGrammarComments.push(...blockComments);

        } catch (blockError) {
          console.error(`SemanticDocumentService: Error analyzing block ${blockIndex + 1}/${totalBlocks} - ${blockError.message}`);
          continue; // Continue with other blocks
        }
      }

      // Convert grammar agent comments to semantic format
      const grammarComments = this.convertGrammarCommentsToSemantic(allGrammarComments, request.blocks);

      // Store grammar comments in database if any were generated
      if (grammarComments.length > 0) {
        const annotationsToInsert = grammarComments.map(comment => ({
          id: crypto.randomUUID(),
          document_id: request.documentId,
          block_id: comment.targetBlockId,
          type: comment.type,
          author: 'ai',
          content: comment.comment,
          target_text: comment.targetText,
          resolved: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // NEW FIELDS FOR EDIT ACTIONS
          action_type: 'none',
          suggested_replacement: comment.metadata?.suggestedReplacement,
          original_text: comment.metadata?.originalText,
          metadata: {
            confidence: comment.confidence,
            agentType: 'grammar',
            ...comment.metadata
          }
        }));

        const { error: insertError } = await supabase
          .from('semantic_annotations')
          .insert(annotationsToInsert);

        if (insertError) {
          console.error(`SemanticDocumentService: Failed to store ${grammarComments.length} grammar comments for document ${request.documentId} - ${insertError.message}`);
          throw new Error('Failed to store grammar comments');
        }
      }

      // Mark grammar check as completed for the current version
      try {
        // Find the version associated with this document
        const { data: versionData, error: versionError } = await supabase
          .from('essay_versions')
          .select('id')
          .eq('semantic_document_id', request.documentId)
          .eq('is_active', true)
          .single();

        if (!versionError && versionData) {
          await EssayVersionService.markGrammarCheckCompleted(versionData.id);
          console.log(`SemanticDocumentService: Marked grammar check as completed for version ${versionData.id}`);
        } else {
          console.warn(`SemanticDocumentService: Could not find active version for document ${request.documentId}`);
        }
      } catch (versionError) {
        console.error(`SemanticDocumentService: Error marking grammar check as completed - ${versionError.message}`);
        // Don't throw error here as grammar comments were successfully generated
      }

      return {
        success: true,
        comments: grammarComments,
        message: `Generated ${grammarComments.length} grammar suggestions across ${totalBlocks} blocks`,
        metadata: {
          processingTime: Date.now() - startTime,
          blocksAnalyzed: totalBlocks,
          commentsGenerated: grammarComments.length
        }
      };
    } catch (error) {
      console.error(`SemanticDocumentService: Error generating grammar comments for document ${request.documentId} - ${error.message}`);
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
   * Generate AI comments for semantic blocks
   */
  async generateAIComments(request: AICommentRequest): Promise<AICommentResponse> {
    const startTime = Date.now();
    
    try {
      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }


      // Call the Supabase edge function for semantic comments
      const { data, error } = await supabase.functions.invoke('generate-semantic-comments', {
        body: request,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        }
      });

      // Debug: log raw edge response summary
      try {
        console.log('[AI_DEBUG] Edge response (generate-semantic-comments)', {
          hasError: Boolean(error),
          errorMessage: error?.message,
          dataSuccess: (data as any)?.success,
          dataMessage: (data as any)?.message,
          commentsCount: Array.isArray((data as any)?.comments) ? (data as any)?.comments.length : undefined
        });
      } catch (_) {}

      if (error) {
        console.error(`SemanticDocumentService: Edge function error generating AI comments for document ${request.documentId} - ${error.message}`);
        throw new Error(`Edge Function error: ${error.message}`);
      }

      return {
        success: true,
        comments: data.comments || [],
        message: data.message || 'AI comments generated successfully',
        metadata: {
          processingTime: Date.now() - startTime,
          blocksAnalyzed: request.blocks.length,
          commentsGenerated: data.comments?.length || 0
        }
      };
    } catch (error) {
      console.error(`SemanticDocumentService: Error generating AI comments for document ${request.documentId} - ${error instanceof Error ? error.message : String(error)}`);
      // Debug: flag potential strengths agent response shape issue for console triage
      try {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("Cannot read properties of undefined (reading '0')") || msg.includes('Invalid response from Gemini API')) {
          console.warn('[AI_DEBUG] Suspected strengths agent response shape issue (missing parts[0].text). Check server logs for strengths agent.');
        }
      } catch (_) {}
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
   * Convert grammar agent comments to semantic format with enhanced validation
   */
  private convertGrammarCommentsToSemantic(
    grammarComments: any[], 
    blocks: DocumentBlock[]
  ): SemanticComment[] {
    const semanticComments: SemanticComment[] = [];
    let filteredOutInvalidCount = 0;

    for (const grammarComment of grammarComments) {
      // Find the best matching block for this grammar comment
      const targetBlock = this.findBestMatchingBlockForGrammar(grammarComment, blocks);
      if (!targetBlock) {
        console.warn(`SemanticDocumentService: Could not find target block for grammar comment: ${grammarComment.comment_text}`);
        continue;
      }

      // Extract target text from the comment with enhanced validation
      // Prefer original_text for precise highlighting if present
      const targetText = grammarComment.original_text || grammarComment.anchor_text || grammarComment.target_text || 
                        this.extractTargetTextFromGrammarComment(grammarComment, targetBlock.content);

      // Validate edit fields for grammar comments - be more lenient
      // Allow empty suggested_replacement for word removals
      const hasValidEditFields = grammarComment.original_text && 
                                grammarComment.suggested_replacement !== undefined && 
                                grammarComment.original_text !== grammarComment.suggested_replacement &&
                                grammarComment.original_text.length > 0 &&
                                grammarComment.suggested_replacement.length >= 0; // Allow empty string for word removals

      if (!hasValidEditFields && grammarComment.original_text) {
        console.warn(`SemanticDocumentService: Grammar comment missing valid edit fields:`, {
          comment: grammarComment.comment_text,
          original: grammarComment.original_text,
          suggested: grammarComment.suggested_replacement,
          blockContent: targetBlock.content.substring(0, 100) + '...'
        });
      }

      // Filter out invalid grammar comments from UI (skip adding to semanticComments)
      if (!hasValidEditFields) {
        filteredOutInvalidCount++;
        continue;
      }

      const semanticComment: SemanticComment = {
        targetBlockId: targetBlock.id,
        targetText: targetText,
        comment: grammarComment.comment_text || grammarComment.commentText || grammarComment.comment,
        type: 'suggestion', // Grammar comments are typically suggestions
        confidence: grammarComment.confidence_score || grammarComment.confidenceScore || 0.9,
        metadata: {
          agentType: 'grammar',
          category: grammarComment.comment_category || 'inline',
          subcategory: grammarComment.comment_subcategory || 'grammar',
          commentNature: 'improvement',
          commentCategory: 'grammar',
          // ENHANCED EDIT ACTION FIELDS WITH VALIDATION
          originalText: hasValidEditFields ? grammarComment.original_text : undefined,
          suggestedReplacement: hasValidEditFields ? grammarComment.suggested_replacement : undefined,
          // Add validation metadata for debugging
          hasValidEditFields: hasValidEditFields
        }
      };

      semanticComments.push(semanticComment);
    }

    // Log summary of conversion results
    const validEditComments = semanticComments.filter(c => c.metadata?.hasValidEditFields);
    console.log(`SemanticDocumentService: Converted ${semanticComments.length} grammar comments (skipped ${filteredOutInvalidCount} invalid edit comments)`);
    console.log(`- ${validEditComments.length} comments with valid edit fields`);

    return semanticComments;
  }

  /**
   * Find the best matching block for a grammar comment
   */
  private findBestMatchingBlockForGrammar(grammarComment: any, blocks: DocumentBlock[]): DocumentBlock | null {
    // Strategy 1: Use blockId if available (from block-by-block processing)
    if (grammarComment.blockId) {
      const block = blocks.find(b => b.id === grammarComment.blockId);
      if (block) return block;
    }

    // Strategy 2: Use blockIndex if available
    if (grammarComment.blockIndex !== null && grammarComment.blockIndex !== undefined) {
      const block = blocks[grammarComment.blockIndex];
      if (block) return block;
    }

    // Strategy 3: If comment has text selection info, use that
    if (grammarComment.text_selection) {
      const selection = grammarComment.text_selection;
      if (selection.start && typeof selection.start.pos === 'number') {
        let currentPos = 0;
        for (const block of blocks.sort((a, b) => a.position - b.position)) {
          const blockEnd = currentPos + block.content.length;
          if (selection.start.pos >= currentPos && selection.start.pos <= blockEnd) {
            return block;
          }
          currentPos = blockEnd + 2; // Account for paragraph breaks
        }
      }
    }

    // Strategy 4: Find block containing the target text (case-insensitive)
    if (grammarComment.anchor_text || grammarComment.target_text || grammarComment.original_text) {
      const targetText = (grammarComment.original_text || grammarComment.anchor_text || grammarComment.target_text || '').toLowerCase();
      for (const block of blocks) {
        if (block.content.toLowerCase().includes(targetText)) {
          return block;
        }
      }
    }

    // Strategy 5: Last resort: return first non-empty block
    return blocks.find(block => block.content.trim().length > 0) || blocks[0] || null;
  }

  /**
   * Extract target text from grammar comment
   */
  private extractTargetTextFromGrammarComment(grammarComment: any, blockContent: string): string {
    // Try to extract from comment text patterns
    const commentText = grammarComment.comment_text || grammarComment.commentText || grammarComment.comment || '';
    
    // Look for quoted text in the comment
    const quotedMatch = commentText.match(/"([^"]+)"/);
    if (quotedMatch) {
      return quotedMatch[1];
    }

    // Look for text after "Change" or "Replace"
    const changeMatch = commentText.match(/(?:Change|Replace)\s+"?([^"]+)"?/i);
    if (changeMatch) {
      return changeMatch[1];
    }

    // Look for text after "should be" or "should read"
    const shouldBeMatch = commentText.match(/(?:should be|should read)\s+"?([^"]+)"?/i);
    if (shouldBeMatch) {
      return shouldBeMatch[1];
    }

    // Look for text after "correct to"
    const correctMatch = commentText.match(/(?:correct to)\s+"?([^"]+)"?/i);
    if (correctMatch) {
      return correctMatch[1];
    }

    // If we have text selection, try to extract the actual text from the block
    if (grammarComment.text_selection && 
        grammarComment.text_selection.start && 
        grammarComment.text_selection.end &&
        typeof grammarComment.text_selection.start.pos === 'number' && 
        typeof grammarComment.text_selection.end.pos === 'number') {
      const start = grammarComment.text_selection.start.pos;
      const end = grammarComment.text_selection.end.pos;
      if (start >= 0 && end <= blockContent.length && start < end) {
        return blockContent.substring(start, end);
      }
    }

    // Return first few words of block as fallback
    return blockContent.split(' ').slice(0, 5).join(' ') + '...';
  }

  /**
   * Check if document has any text content (non-whitespace)
   */
  private hasTextContent(document: SemanticDocument): boolean {
    return document.blocks.some(block => block.content.trim().length > 0);
  }

  /**
   * Apply a comment edit action (accept or reject)
   */
  async applyCommentEdit(
    document: SemanticDocument,
    annotationId: string,
    action: 'accept' | 'reject'
  ): Promise<boolean> {
    try {
      console.log(`SemanticDocumentService: Applying ${action} edit for annotation ${annotationId}`);
      
      const result = await CommentEditService.applyEdit({
        documentId: document.id,
        annotationId,
        action
      });

      if (result.success && action === 'accept') {
        // Update local document state optimistically
        const updatedBlocks = document.blocks.map(block => ({
          ...block,
          annotations: block.annotations.map(annotation =>
            annotation.id === annotationId
              ? {
                  ...annotation,
                  resolved: true,
                  actionType: 'accepted' as const,
                  replacementAppliedAt: new Date(),
                  resolvedAt: new Date(),
                  updatedAt: new Date()
                }
              : annotation
          )
        }));

        document.blocks = updatedBlocks;
        document.updatedAt = new Date();
        
        console.log(`SemanticDocumentService: Successfully applied ${action} edit for annotation ${annotationId}`);
      } else if (result.success && action === 'reject') {
        // Update local document state for rejection
        const updatedBlocks = document.blocks.map(block => ({
          ...block,
          annotations: block.annotations.map(annotation =>
            annotation.id === annotationId
              ? {
                  ...annotation,
                  resolved: true,
                  actionType: 'rejected' as const,
                  resolvedAt: new Date(),
                  updatedAt: new Date()
                }
              : annotation
          )
        }));

        document.blocks = updatedBlocks;
        document.updatedAt = new Date();
        
        console.log(`SemanticDocumentService: Successfully applied ${action} edit for annotation ${annotationId}`);
      }

      return result.success;
    } catch (error) {
      console.error(`SemanticDocumentService: Error applying comment edit for annotation ${annotationId}:`, error);
      return false;
    }
  }

  /**
   * Check if an annotation can be edited
   */
  canEditAnnotation(annotation: Annotation): boolean {
    return CommentEditService.canEditComment(annotation);
  }

  /**
   * Check if essay version already exists for this essay
   */
  private async checkVersionExists(essayId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('essay_versions')
        .select('id')
        .eq('essay_id', essayId)
        .limit(1);

      if (error) {
        console.error(`SemanticDocumentService: Error checking version existence for essay ${essayId}:`, error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error(`SemanticDocumentService: Error checking version existence for essay ${essayId}:`, error);
      return false;
    }
  }

  /**
   * Create Version 1 for an essay if it doesn't exist and document has text content
   */
  private async ensureVersion1Exists(document: SemanticDocument): Promise<void> {
    try {
      const essayId = document.metadata?.essayId;
      if (!essayId) {
        return;
      }

      // Check if document has any text content
      if (!this.hasTextContent(document)) {
        return;
      }

      // Check if version already exists
      const versionExists = await this.checkVersionExists(essayId);
      if (versionExists) {
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('SemanticDocumentService: No authenticated user, cannot create version');
        return;
      }

      // Create Version 1
      const { data: version, error } = await supabase
        .from('essay_versions')
        .insert({
          essay_id: essayId,
          user_id: user.id,
          version_number: 1,
          content: {
            blocks: document.blocks,
            metadata: document.metadata
          },
          version_name: 'Version 1',
          version_description: undefined,
          is_active: true,
          semantic_document_id: document.id,
          is_fresh_draft: true
        })
        .select()
        .single();

      if (error) {
        console.error(`SemanticDocumentService: Failed to create Version 1 for essay ${essayId}:`, error);
        return;
      }

      console.log(`SemanticDocumentService: Successfully created Version 1 for essay ${essayId}, version ID: ${version.id}`);
    } catch (error) {
      console.error(`SemanticDocumentService: Error ensuring Version 1 exists:`, error);
      // Don't throw error - version creation is best effort, shouldn't break document saving
    }
  }

}

// Export singleton instance
export const semanticDocumentService = SemanticDocumentService.getInstance();
