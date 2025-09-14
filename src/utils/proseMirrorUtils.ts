/**
 * ProseMirror Utilities for Contextual Anchoring
 * 
 * This file contains utility functions for working with ProseMirror documents
 * in the new contextual anchoring system.
 */

import { Node as ProseMirrorNode } from 'prosemirror-model';
import { Transaction } from 'prosemirror-state';
import { EssayParagraph } from '@/types/contextualAnchoring';

/**
 * Add unique paragraph IDs to all paragraph nodes in a ProseMirror document
 * This is the pre-processing step that enables contextual anchoring
 * Uses consistent ID generation to match AI comment creation
 */
export function addParagraphIdsToDocument(
  doc: ProseMirrorNode,
  tr: Transaction
): Transaction {
  try {
    let paragraphCounter = 0;
    const timestamp = Date.now();
    
    // Walk through the document and add paragraph IDs
    doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph') {
        // Only add ID if it doesn't already exist
        if (!node.attrs['data-paragraph-id']) {
          // Generate a unique paragraph ID using the same format as AI comment creation
          const paragraphId = `para_${timestamp}_${paragraphCounter}`;
          
          // Add the data-paragraph-id attribute to the paragraph node
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            'data-paragraph-id': paragraphId
          });
          
          console.log(`Added paragraph ID '${paragraphId}' to paragraph at position ${pos}`);
        } else {
          console.log(`Paragraph at position ${pos} already has ID: ${node.attrs['data-paragraph-id']}`);
        }
        
        paragraphCounter++;
      }
    });
    
    console.log(`Successfully processed ${paragraphCounter} paragraphs for ID assignment`);
    return tr;
  } catch (error) {
    console.error('Error adding paragraph IDs to document:', error);
    return tr;
  }
}

/**
 * Extract structured paragraphs from a ProseMirror document
 * This creates the EssayParagraph[] structure needed for AI input
 * Uses consistent processing with AI paragraph splitting
 */
export function extractParagraphsFromDocument(doc: ProseMirrorNode): EssayParagraph[] {
  try {
    const paragraphs: EssayParagraph[] = [];
    let paragraphCounter = 0;
    const timestamp = Date.now();
    
    doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph') {
        const textContent = node.textContent.trim();
        
        // Only include non-empty paragraphs
        if (textContent.length > 0) {
          // Use existing paragraph ID if available, otherwise generate one
          const paragraphId = node.attrs['data-paragraph-id'] || `para_${timestamp}_${paragraphCounter}`;
          
          paragraphs.push({
            paragraphId,
            text: textContent
          });
          
          paragraphCounter++;
        }
      }
    });
    
    console.log(`Extracted ${paragraphs.length} paragraphs from document:`, 
      paragraphs.map(p => ({ id: p.paragraphId, preview: p.text.substring(0, 50) + '...' })));
    
    return paragraphs;
  } catch (error) {
    console.error('Error extracting paragraphs from document:', error);
    return [];
  }
}

/**
 * Process essay content consistently for both AI and editor
 * This ensures paragraph splitting matches between comment creation and display
 */
export function processEssayContentConsistently(content: string): {
  paragraphs: string[];
  positions: { start: number; end: number }[];
  processedContent: string;
} {
  try {
    console.log('Processing essay content consistently...');
    
    // Use the same HTML processing logic as AI functions
    let processedContent = content
      .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n') // Convert </p><p> to double line breaks
      .replace(/<p[^>]*>/gi, '') // Remove opening <p> tags
      .replace(/<\/p>/gi, '') // Remove closing </p> tags
      .replace(/<br\s*\/?>/gi, '\n') // Convert <br> tags to newlines
      .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
      .replace(/&nbsp;/g, ' ') // Convert non-breaking spaces
      .replace(/&amp;/g, '&') // Convert HTML entities
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    
    // Split by double line breaks (consistent separator)
    const rawParagraphs = processedContent
      .split(/\n\s*\n/) // Split on double newlines with optional whitespace
      .map(p => p.trim()) // Remove leading/trailing whitespace
      .filter(p => p.length > 0); // Remove empty paragraphs
    
    // Calculate positions for each paragraph
    const positions: { start: number; end: number }[] = [];
    let currentPos = 0;
    
    for (const paragraph of rawParagraphs) {
      const start = processedContent.indexOf(paragraph, currentPos);
      if (start !== -1) {
        positions.push({
          start,
          end: start + paragraph.length
        });
        currentPos = start + paragraph.length;
      } else {
        // Fallback: estimate position
        positions.push({
          start: currentPos,
          end: currentPos + paragraph.length
        });
        currentPos += paragraph.length;
      }
    }
    
    console.log(`Processed content into ${rawParagraphs.length} paragraphs with positions`);
    
    return {
      paragraphs: rawParagraphs,
      positions,
      processedContent
    };
  } catch (error) {
    console.error('Error processing essay content consistently:', error);
    return {
      paragraphs: [content],
      positions: [{ start: 0, end: content.length }],
      processedContent: content
    };
  }
}

/**
 * Check if a ProseMirror document has paragraph IDs
 */
export function documentHasParagraphIds(doc: ProseMirrorNode): boolean {
  try {
    let hasParagraphIds = false;
    
    doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' && node.attrs['data-paragraph-id']) {
        hasParagraphIds = true;
        return false; // Stop searching once we find one
      }
    });
    
    return hasParagraphIds;
  } catch (error) {
    console.error('Error checking for paragraph IDs:', error);
    return false;
  }
}

/**
 * Get all paragraph IDs from a ProseMirror document
 */
export function getParagraphIdsFromDocument(doc: ProseMirrorNode): string[] {
  try {
    const paragraphIds: string[] = [];
    
    doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' && node.attrs['data-paragraph-id']) {
        paragraphIds.push(node.attrs['data-paragraph-id']);
      }
    });
    
    return paragraphIds;
  } catch (error) {
    console.error('Error getting paragraph IDs from document:', error);
    return [];
  }
}

/**
 * Find a paragraph node by its ID
 */
export function findParagraphById(doc: ProseMirrorNode, paragraphId: string): {
  node: ProseMirrorNode | null;
  pos: number;
} {
  try {
    let targetNode: ProseMirrorNode | null = null;
    let targetPos = -1;
    
    doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' && node.attrs['data-paragraph-id'] === paragraphId) {
        targetNode = node;
        targetPos = pos;
        return false; // Stop searching once found
      }
    });
    
    return { node: targetNode, pos: targetPos };
  } catch (error) {
    console.error('Error finding paragraph by ID:', error);
    return { node: null, pos: -1 };
  }
}
