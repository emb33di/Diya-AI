/**
 * Clean Semantic Editor - Simplified Block Management
 * 
 * A streamlined editor where users can:
 * - Click into ANY block at ANY time to edit it
 * - Delete any block easily (blocks automatically reorder)
 * - Copy/paste content seamlessly
 * - No complex selection states or confusing interactions
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  SemanticDocument, 
  DocumentBlock, 
  Annotation, 
  AnnotationType,
  SemanticEditorState
} from '@/types/semanticDocument';
import { semanticDocumentService } from '@/services/semanticDocumentService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  CheckCircle, 
  Plus, 
  Trash2,
  Sparkles,
  User,
  Bot,
  Copy,
  CheckSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AICommentsLoadingPane, { AI_COMMENTS_LOADING_STEPS } from './AICommentsLoadingPane';
import GrammarLoadingPane, { GRAMMAR_LOADING_STEPS } from './GrammarLoadingPane';
import CommentSidebar from './CommentSidebar';
import './SemanticHighlighting.css';

interface CleanSemanticEditorProps {
  documentId?: string;
  essayId: string;
  title: string;
  initialContent?: string;
  wordLimit?: number;
  onDocumentChange?: (document: SemanticDocument) => void;
  onAnnotationSelect?: (annotation: Annotation | null) => void;
  onSaveStatusChange?: (isAutoSaving: boolean, lastSaved: Date | null) => void;
  showCommentSidebar?: boolean;
  selectedAnnotationId?: string;
  onHideSidebar?: () => void;
  className?: string;
}

const CleanSemanticEditor: React.FC<CleanSemanticEditorProps> = ({
  documentId,
  essayId,
  title,
  initialContent = '',
  wordLimit = 650,
  onDocumentChange,
  onAnnotationSelect,
  onSaveStatusChange,
  showCommentSidebar = false,
  selectedAnnotationId,
  onHideSidebar,
  className = ''
}) => {
  // Simple, clean state management
  const [state, setState] = useState<SemanticEditorState>({
    document: {
      id: documentId || crypto.randomUUID(),
      title,
      blocks: [],
      metadata: { essayId },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    selectedBlockId: undefined,
    selectedAnnotationId: undefined,
    isEditing: false,
    isCommenting: false,
    pendingChanges: false
  });

  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [newCommentType, setNewCommentType] = useState<AnnotationType>('suggestion');
  const [isGeneratingAIComments, setIsGeneratingAIComments] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isGeneratingGrammar, setIsGeneratingGrammar] = useState(false);
  const [grammarLoadingStep, setGrammarLoadingStep] = useState(0);
  const [noGrammarErrorsFound, setNoGrammarErrorsFound] = useState(false);

  // Toast for user feedback
  const { toast } = useToast();

  // Refs for textarea management
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Initialize document from initial content
  useEffect(() => {
    if (initialContent && state.document.blocks.length === 0) {
      const blocks = semanticDocumentService.convertHtmlToBlocks(initialContent);
      setState(prev => ({
        ...prev,
        document: { ...prev.document, blocks, updatedAt: new Date() },
        pendingChanges: true
      }));
    }
  }, [initialContent]);

  // Auto-save functionality
  useEffect(() => {
    if (!state.pendingChanges) return;

    const autoSaveTimer = setTimeout(async () => {
      try {
        setIsAutoSaving(true);
        await semanticDocumentService.saveDocument(state.document);
        setLastSaved(new Date());
        setState(prev => ({ ...prev, pendingChanges: false }));
        onSaveStatusChange?.(false, new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        setIsAutoSaving(false);
      }
    }, 1000);

    return () => clearTimeout(autoSaveTimer);
  }, [state.document, state.pendingChanges, onSaveStatusChange]);

  // Load existing document
  useEffect(() => {
    const loadDocument = async () => {
      try {
        let existingDoc = null;
        
        if (documentId) {
          existingDoc = await semanticDocumentService.loadDocument(documentId);
        } else {
          existingDoc = await semanticDocumentService.loadDocumentByEssayId(essayId);
        }

        if (existingDoc) {
          setState(prev => ({
            ...prev,
            document: existingDoc
          }));
          
          // If the document has only empty blocks, start editing the first one
          const hasContent = existingDoc.blocks.some(block => block.content.trim().length > 0);
          if (!hasContent && existingDoc.blocks.length > 0) {
            setTimeout(() => {
              setEditingBlockId(existingDoc.blocks[0].id);
              const textarea = textareaRefs.current[existingDoc.blocks[0].id];
              if (textarea) {
                textarea.focus();
              }
            }, 100);
          }
        } else if (!initialContent) {
          // Create a new document with a single empty block
          addNewBlock();
        }
      } catch (error) {
        console.error('Failed to load document:', error);
        // Create a new document with a single empty block on error
        addNewBlock();
      }
    };

    loadDocument();
  }, [documentId, essayId]);

  // Notify parent of document changes
  useEffect(() => {
    onDocumentChange?.(state.document);
  }, [state.document, onDocumentChange]);

  // Auto-resize textarea
  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  // Add a new block
  const addNewBlock = useCallback((position?: number) => {
    const newPosition = position !== undefined ? position : state.document.blocks.length;
    
    const newBlock: DocumentBlock = {
      id: crypto.randomUUID(),
      type: 'paragraph',
      content: '',
      position: newPosition,
      annotations: [],
      isImmutable: newPosition > 0, // First block (position 0) is editable, others are immutable
      createdAt: new Date(),
      lastUserEdit: newPosition === 0 ? undefined : new Date() // First block hasn't been edited yet
    };

    setState(prev => {
      const newBlocks = [...prev.document.blocks];
      newBlocks.splice(newPosition, 0, newBlock);
      
      // Update positions of all blocks
      newBlocks.forEach((block, index) => {
        block.position = index;
      });

      return {
        ...prev,
        document: {
          ...prev.document,
          blocks: newBlocks,
          updatedAt: new Date()
        },
        pendingChanges: true
      };
    });
    
    // Start editing the new block
    setTimeout(() => {
      setEditingBlockId(newBlock.id);
      const textarea = textareaRefs.current[newBlock.id];
      if (textarea) {
        textarea.focus();
      }
    }, 50);

    return newBlock;
  }, [state.document.blocks]);

  // Ensure there's always at least one block for editing
  useEffect(() => {
    if (state.document.blocks.length === 0 && !initialContent) {
      const newBlock = addNewBlock();
      // Automatically start editing the first block
      setTimeout(() => {
        setEditingBlockId(newBlock.id);
        const textarea = textareaRefs.current[newBlock.id];
        if (textarea) {
          textarea.focus();
        }
      }, 100);
    }
  }, [state.document.blocks.length, initialContent, addNewBlock]);

  // Delete a block
  const deleteBlock = useCallback((blockId: string) => {
    setState(prev => {
      // Don't allow deleting all blocks
      if (prev.document.blocks.length <= 1) {
        return prev;
      }

      const newBlocks = prev.document.blocks.filter(block => block.id !== blockId);
      
      // Update positions of remaining blocks
      newBlocks.forEach((block, index) => {
        block.position = index;
      });

      return {
        ...prev,
        document: {
          ...prev.document,
          blocks: newBlocks,
          updatedAt: new Date()
        },
        pendingChanges: true
      };
    });

    // If we deleted the editing block, stop editing
    if (editingBlockId === blockId) {
      setEditingBlockId(null);
    }
  }, [editingBlockId]);

  // Start editing a block
  const startEditingBlock = useCallback((blockId: string) => {
    setEditingBlockId(blockId);
    setState(prev => ({ ...prev, isEditing: true }));
    setTimeout(() => {
      const textarea = textareaRefs.current[blockId];
      if (textarea) {
        textarea.focus();
        autoResizeTextarea(textarea);
      }
    }, 50);
  }, []);

  // Finish editing a block
  const finishEditingBlock = useCallback((blockId: string) => {
    setEditingBlockId(null);
    setState(prev => ({ ...prev, isEditing: false }));
  }, []);

  // Update block content
  const updateBlockContent = useCallback((blockId: string, content: string) => {
    setState(prev => ({
      ...prev,
      document: {
        ...prev.document,
        blocks: prev.document.blocks.map(block => 
          block.id === blockId 
            ? { ...block, content, lastUserEdit: new Date() }
            : block
        ),
        updatedAt: new Date()
      },
      pendingChanges: true
    }));
  }, []);

  // Copy block content
  const copyBlock = useCallback((blockId: string) => {
    const block = state.document.blocks.find(b => b.id === blockId);
    if (block) {
      navigator.clipboard.writeText(block.content);
    }
  }, [state.document.blocks]);

  // Detect paragraphs in pasted text
  const detectParagraphs = useCallback((text: string): string[] => {
    // Use the same logic as ParagraphComparisonService for consistency
    const processedText = text
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n') // Handle old Mac line endings
      .trim();
    
    // Split by double newlines (paragraph breaks)
    const paragraphs = processedText
      .split(/\n\s*\n/) // Split on double newlines with optional whitespace
      .map(p => p.trim()) // Remove leading/trailing whitespace
      .filter(p => p.length > 0); // Remove empty paragraphs
    
    // If no double newlines found, try single newlines for shorter content
    if (paragraphs.length === 1 && processedText.includes('\n')) {
      const singleLineParagraphs = processedText
        .split(/\n/)
        .map(p => p.trim())
        .filter(p => p.length > 0);
      
      // Only split if we have multiple non-empty lines and they're substantial
      if (singleLineParagraphs.length > 1) {
        // Check if lines are substantial (not just single words or very short)
        const substantialLines = singleLineParagraphs.filter(line => 
          line.length > 10 || line.split(' ').length > 2
        );
        
        if (substantialLines.length > 1) {
          return singleLineParagraphs;
        }
      }
    }
    
    return paragraphs;
  }, []);

  // Insert multiple blocks from pasted content
  const insertMultipleBlocks = useCallback((currentBlockId: string, paragraphs: string[]) => {
    const currentBlock = state.document.blocks.find(b => b.id === currentBlockId);
    if (!currentBlock) return;

    const insertPosition = currentBlock.position;
    const cursorPosition = textareaRefs.current[currentBlockId]?.selectionStart || 0;
    const currentContent = currentBlock.content;
    
    // Split current content at cursor position
    const textBeforeCursor = currentContent.substring(0, cursorPosition);
    const textAfterCursor = currentContent.substring(cursorPosition);
    
    // Update current block with text before cursor + first paragraph
    const firstParagraph = paragraphs[0];
    updateBlockContent(currentBlockId, textBeforeCursor + firstParagraph);
    
    // Insert remaining paragraphs as new blocks
    const remainingParagraphs = paragraphs.slice(1);
    remainingParagraphs.forEach((paragraph, index) => {
      const newBlock = addNewBlock(insertPosition + index + 1);
      updateBlockContent(newBlock.id, paragraph);
    });
    
    // If there was text after cursor, add it to the last new block
    if (textAfterCursor) {
      const lastNewBlock = state.document.blocks.find(b => b.position === insertPosition + remainingParagraphs.length);
      if (lastNewBlock) {
        updateBlockContent(lastNewBlock.id, lastNewBlock.content + textAfterCursor);
      }
    }
    
    // Focus on the last inserted block
    const lastBlock = state.document.blocks.find(b => b.position === insertPosition + remainingParagraphs.length);
    if (lastBlock) {
      setTimeout(() => {
        startEditingBlock(lastBlock.id);
        const textarea = textareaRefs.current[lastBlock.id];
        if (textarea) {
          // Set cursor to end of content
          const endPosition = lastBlock.content.length;
          textarea.setSelectionRange(endPosition, endPosition);
          textarea.focus();
        }
      }, 50);
    }
  }, [state.document.blocks, addNewBlock, updateBlockContent, startEditingBlock]);

  // Handle paste events
  const handlePaste = useCallback((e: React.ClipboardEvent, blockId: string) => {
    const pastedText = e.clipboardData.getData('text/plain');
    
    if (!pastedText.trim()) return;
    
    // Detect if content has multiple paragraphs
    const paragraphs = detectParagraphs(pastedText);
    
    if (paragraphs.length > 1) {
      e.preventDefault(); // Prevent default paste behavior
      insertMultipleBlocks(blockId, paragraphs);
      
      // Show user feedback
      toast({
        title: "Content Auto-Split",
        description: `Pasted content automatically split into ${paragraphs.length} blocks for better organization.`,
        duration: 3000,
      });
    }
  }, [detectParagraphs, insertMultipleBlocks]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent, blockId: string) => {
    const block = state.document.blocks.find(b => b.id === blockId);
    if (!block) return;

    // Enter key: split text at cursor position or create new block
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      const textarea = textareaRefs.current[blockId];
      if (textarea) {
        const cursorPosition = textarea.selectionStart;
        const currentContent = block.content;
        
        // Split the text at cursor position
        const textBeforeCursor = currentContent.substring(0, cursorPosition);
        const textAfterCursor = currentContent.substring(cursorPosition);
        
        // Update current block with text before cursor
        updateBlockContent(blockId, textBeforeCursor);
        
        // Create new block with text after cursor
        const newBlock = addNewBlock(block.position + 1);
        if (textAfterCursor) {
          // Update the new block with the text after cursor
          setTimeout(() => {
            updateBlockContent(newBlock.id, textAfterCursor);
            startEditingBlock(newBlock.id);
            
            // Set cursor to beginning of new block
            const newTextarea = textareaRefs.current[newBlock.id];
            if (newTextarea) {
              setTimeout(() => {
                newTextarea.setSelectionRange(0, 0);
                newTextarea.focus();
              }, 10);
            }
          }, 50);
        } else {
          // If no text after cursor, just start editing the new empty block
          setTimeout(() => startEditingBlock(newBlock.id), 50);
        }
      } else {
        // Fallback to original behavior if textarea ref is not available
        const newBlock = addNewBlock(block.position + 1);
        setTimeout(() => startEditingBlock(newBlock.id), 50);
      }
    }

    // Backspace on empty block: delete block
    if (e.key === 'Backspace' && block.content === '' && state.document.blocks.length > 1) {
      e.preventDefault();
      deleteBlock(blockId);
      
      // Focus on previous block
      const prevBlock = state.document.blocks.find(b => b.position === block.position - 1);
      if (prevBlock) {
        setTimeout(() => startEditingBlock(prevBlock.id), 50);
      }
    }

    // Arrow Up: move to previous block
    if (e.key === 'ArrowUp' && e.ctrlKey) {
      e.preventDefault();
      const prevBlock = state.document.blocks.find(b => b.position === block.position - 1);
      if (prevBlock) {
        finishEditingBlock(blockId);
        setTimeout(() => startEditingBlock(prevBlock.id), 50);
      }
    }

    // Arrow Down: move to next block
    if (e.key === 'ArrowDown' && e.ctrlKey) {
      e.preventDefault();
      const nextBlock = state.document.blocks.find(b => b.position === block.position + 1);
      if (nextBlock) {
        finishEditingBlock(blockId);
        setTimeout(() => startEditingBlock(nextBlock.id), 50);
      }
    }
  }, [state.document.blocks, addNewBlock, deleteBlock, startEditingBlock, finishEditingBlock]);

  // Generate AI comments for all blocks
  const generateAIComments = useCallback(async () => {
    setIsGeneratingAIComments(true);
    setLoadingStep(0);

    try {
      // Start AI generation in parallel with loading animation
      const aiGenerationPromise = semanticDocumentService.generateAIComments({
        documentId: state.document.id,
        blocks: state.document.blocks,
        context: {
          prompt: state.document.metadata.prompt,
          wordLimit: state.document.metadata.wordLimit
        }
      });

      // Simulate loading steps - Total: 30 seconds
      const stepDurations = [8000, 12000, 8000, 2000]; // Duration for each step in ms
      
      // Step through each loading phase
      for (let i = 0; i < AI_COMMENTS_LOADING_STEPS.length; i++) {
        setLoadingStep(i);
        await new Promise(resolve => setTimeout(resolve, stepDurations[i]));
      }

      // Wait for AI generation to complete
      const response = await aiGenerationPromise;

      if (response.success) {
        // Add a small delay to ensure database insert is complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reload document to get updated comments from database
        const updatedDocument = await semanticDocumentService.loadDocument(state.document.id);
        if (updatedDocument) {
          setState(prev => ({ ...prev, document: updatedDocument }));
        }
      }

      // Mark as complete
      setLoadingStep(AI_COMMENTS_LOADING_STEPS.length);
    } catch (error) {
      console.error('Failed to generate AI comments:', error);
    } finally {
      // Reset after a short delay to show completion
      setTimeout(() => {
        setIsGeneratingAIComments(false);
        setLoadingStep(0);
      }, 1000);
    }
  }, [state.document]);

  // Generate grammar comments for all blocks
  const generateGrammarComments = useCallback(async () => {
    setIsGeneratingGrammar(true);
    setGrammarLoadingStep(0);

    try {
      // Start grammar generation in parallel with loading animation
      const grammarGenerationPromise = semanticDocumentService.generateGrammarComments({
        documentId: state.document.id,
        blocks: state.document.blocks,
        context: {
          prompt: state.document.metadata.prompt,
          wordLimit: state.document.metadata.wordLimit
        }
      });

      // Simulate loading steps - Total: 15 seconds
      const stepDurations = [5000, 8000, 2000]; // Duration for each step in ms
      
      // Step through each loading phase
      for (let i = 0; i < GRAMMAR_LOADING_STEPS.length; i++) {
        setGrammarLoadingStep(i);
        await new Promise(resolve => setTimeout(resolve, stepDurations[i]));
      }

      // Wait for grammar generation to complete
      const response = await grammarGenerationPromise;

      if (response.success) {
        // Check if no grammar comments were generated
        const hasGrammarComments = response.comments && response.comments.length > 0;
        setNoGrammarErrorsFound(!hasGrammarComments);
        
        // Add a small delay to ensure database insert is complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reload document to get updated comments from database
        const updatedDocument = await semanticDocumentService.loadDocument(state.document.id);
        if (updatedDocument) {
          setState(prev => ({ ...prev, document: updatedDocument }));
        }
      }

      // Mark as complete
      setGrammarLoadingStep(GRAMMAR_LOADING_STEPS.length);
    } catch (error) {
      console.error('Failed to generate grammar comments:', error);
    } finally {
      // Reset after a short delay to show completion
      setTimeout(() => {
        setIsGeneratingGrammar(false);
        setGrammarLoadingStep(0);
      }, 1000);
    }
  }, [state.document]);

  // Resolve annotation
  const resolveAnnotation = useCallback((annotationId: string) => {
    setState(prev => ({
      ...prev,
      document: {
        ...prev.document,
        blocks: prev.document.blocks.map(block => ({
          ...block,
          annotations: block.annotations.map(annotation =>
            annotation.id === annotationId
              ? { ...annotation, resolved: true, resolvedAt: new Date() }
              : annotation
          )
        })),
        updatedAt: new Date()
      },
      pendingChanges: true
    }));
  }, []);

  // Delete annotation
  const deleteAnnotation = useCallback((annotationId: string) => {
    setState(prev => ({
      ...prev,
      document: {
        ...prev.document,
        blocks: prev.document.blocks.map(block => ({
          ...block,
          annotations: block.annotations.filter(annotation => annotation.id !== annotationId)
        })),
        updatedAt: new Date()
      },
      pendingChanges: true
    }));
  }, []);

  // Render highlighted text with annotations
  const renderHighlightedText = (text: string, annotations: Annotation[]) => {
    if (!text || annotations.length === 0) {
      return text;
    }

    console.log('renderHighlightedText called with:', {
      text: text.substring(0, 100) + '...',
      annotationsCount: annotations.length,
      annotations: annotations.map(a => ({ id: a.id, targetText: a.targetText, resolved: a.resolved })),
      selectedAnnotationId
    });

    // Create highlight segments for annotations with targetText
    const segments: Array<{ start: number; end: number; annotation: Annotation }> = [];
    
    annotations.forEach(annotation => {
      console.log(`Processing annotation ${annotation.id}:`, {
        targetText: annotation.targetText,
        resolved: annotation.resolved,
        hasTargetText: !!annotation.targetText
      });

      if (annotation.targetText && !annotation.resolved) {
        // Debug: Show the actual text we're searching in
        console.log(`Block text (first 200 chars): "${text.substring(0, 200)}"`);
        console.log(`Target text: "${annotation.targetText}"`);
        console.log(`Target text length: ${annotation.targetText.length}`);
        
        // Find all occurrences of the target text (in case it appears multiple times)
        let index = text.indexOf(annotation.targetText);
        console.log(`Looking for "${annotation.targetText}" in text, found at index:`, index);
        
        // If exact match fails, try intelligent fuzzy matching
        if (index === -1) {
          console.log('Exact match failed, trying intelligent fuzzy matching...');
          
          // Try to find quoted text that might be the actual target
          const quotedTextMatch = annotation.content.match(/['"]([^'"]+)['"]/);
          if (quotedTextMatch && quotedTextMatch[1]) {
            const quotedText = quotedTextMatch[1];
            console.log(`Found quoted text in comment: "${quotedText}"`);
            index = text.indexOf(quotedText);
            if (index !== -1) {
              annotation.targetText = quotedText;
              console.log(`Successfully matched quoted text: "${quotedText}"`);
            }
          }
          
          // If still no match, try to find a partial match by removing the "..." if present
          if (index === -1) {
            let cleanTargetText = annotation.targetText;
            if (cleanTargetText.endsWith('...')) {
              cleanTargetText = cleanTargetText.slice(0, -3);
              console.log(`Trying without "...": "${cleanTargetText}"`);
              index = text.indexOf(cleanTargetText);
            }
            
            // If still no match, try first few words
            if (index === -1) {
              const words = cleanTargetText.split(' ').slice(0, 5).join(' ');
              console.log(`Trying first 5 words: "${words}"`);
              index = text.indexOf(words);
              if (index !== -1) {
                // Update the target text to what we actually found
                annotation.targetText = words;
              }
            }
          }
        }
        
        let searchStart = 0;
        
        while (index !== -1) {
          segments.push({
            start: index,
            end: index + annotation.targetText.length,
            annotation
          });
          
          console.log(`Added segment for annotation ${annotation.id}:`, {
            start: index,
            end: index + annotation.targetText.length,
            text: text.substring(index, index + annotation.targetText.length)
          });
          
          // Look for next occurrence
          searchStart = index + 1;
          index = text.indexOf(annotation.targetText, searchStart);
          
          // Only highlight the first occurrence to avoid confusion
          break;
        }
      }
    });

    // Sort segments by start position, then by end position (longer segments first for overlaps)
    segments.sort((a, b) => {
      if (a.start !== b.start) {
        return a.start - b.start;
      }
      return b.end - a.end; // Longer segments first
    });

    // Handle overlapping segments more intelligently
    const nonOverlappingSegments: typeof segments = [];
    
    for (const segment of segments) {
      const overlappingSegments = nonOverlappingSegments.filter(existing => 
        (segment.start < existing.end && segment.end > existing.start)
      );
      
      if (overlappingSegments.length === 0) {
        // No overlap, add the segment
        nonOverlappingSegments.push(segment);
      } else {
        // Handle overlap - prefer the selected annotation or the most specific one
        const isCurrentSelected = selectedAnnotationId === segment.annotation.id;
        const hasSelectedOverlap = overlappingSegments.some(existing => 
          selectedAnnotationId === existing.annotation.id
        );
        
        if (isCurrentSelected && !hasSelectedOverlap) {
          // Current segment is selected and no existing selected overlap, replace overlapping segments
          // Remove overlapping segments
          overlappingSegments.forEach(overlapping => {
            const index = nonOverlappingSegments.indexOf(overlapping);
            if (index > -1) nonOverlappingSegments.splice(index, 1);
          });
          nonOverlappingSegments.push(segment);
        } else if (!hasSelectedOverlap && !isCurrentSelected) {
          // Neither current nor existing segments are selected, prefer the shorter/more specific one
          const shortestOverlap = overlappingSegments.reduce((shortest, current) => 
            (current.end - current.start) < (shortest.end - shortest.start) ? current : shortest
          );
          
          if ((segment.end - segment.start) < (shortestOverlap.end - shortestOverlap.start)) {
            // Current segment is shorter, replace the longest overlapping one
            const index = nonOverlappingSegments.indexOf(shortestOverlap);
            if (index > -1) nonOverlappingSegments.splice(index, 1);
            nonOverlappingSegments.push(segment);
          }
          // Otherwise keep the existing shorter segment
        }
        // If existing segment is selected, keep it and skip current segment
      }
    }
    
    console.log(`Overlap processing: ${segments.length} segments → ${nonOverlappingSegments.length} segments`, {
      original: segments.map(s => ({ id: s.annotation.id, text: s.annotation.targetText, start: s.start, end: s.end })),
      filtered: nonOverlappingSegments.map(s => ({ id: s.annotation.id, text: s.annotation.targetText, start: s.start, end: s.end }))
    });

    // If no segments to highlight, return plain text
    if (nonOverlappingSegments.length === 0) {
      console.log('No segments to highlight, returning plain text');
      return text;
    }

    console.log('Building highlighted text with segments:', nonOverlappingSegments.map(s => ({
      start: s.start,
      end: s.end,
      annotationId: s.annotation.id,
      targetText: s.annotation.targetText
    })));

    // Build the highlighted text
    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    nonOverlappingSegments.forEach((segment, index) => {
      // Add text before the highlight
      if (segment.start > lastEnd) {
        parts.push(
          <span key={`text-${index}-before`}>
            {text.substring(lastEnd, segment.start)}
          </span>
        );
      }

      // Add the highlighted segment
      const isSelected = selectedAnnotationId === segment.annotation.id;
      const highlightClass = `inline-highlight ${getHighlightClass(segment.annotation)} ${isSelected ? 'selected' : ''}`;
      
      console.log(`Creating highlight span for annotation ${segment.annotation.id}:`, {
        isSelected,
        highlightClass,
        selectedAnnotationId,
        annotationId: segment.annotation.id,
        idsMatch: selectedAnnotationId === segment.annotation.id,
        selectedType: typeof selectedAnnotationId,
        annotationType: typeof segment.annotation.id,
        segmentText: text.substring(segment.start, segment.end)
      });
      
      parts.push(
        <span
          key={`highlight-${segment.annotation.id}`}
          className={highlightClass}
          onClick={(e) => {
            e.stopPropagation();
            console.log('Highlight clicked, calling onAnnotationSelect with:', segment.annotation);
            onAnnotationSelect?.(segment.annotation);
          }}
          title={`${segment.annotation.type}: ${segment.annotation.content}`}
        >
          {text.substring(segment.start, segment.end)}
        </span>
      );

      lastEnd = Math.max(lastEnd, segment.end);
    });

    // Add remaining text after the last highlight
    if (lastEnd < text.length) {
      parts.push(
        <span key="text-after">
          {text.substring(lastEnd)}
        </span>
      );
    }

    return <>{parts}</>;
  };

  // Get CSS class for highlight based on annotation type and metadata
  const getHighlightClass = (annotation: Annotation) => {
    const baseClass = `highlight-${annotation.type}`;
    const agentClass = annotation.metadata?.agentType ? `highlight-agent-${annotation.metadata.agentType}` : '';
    return `${baseClass} ${agentClass}`.trim();
  };

  // Render a single block
  const renderBlock = (block: DocumentBlock) => {
    const isEditing = editingBlockId === block.id;

    return (
      <div
        key={block.id}
        className="group relative mb-2"
      >
        {/* Block Actions - Show on hover */}
        <div className="absolute -left-12 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => deleteBlock(block.id)}
            title="Delete block"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => copyBlock(block.id)}
            title="Copy block"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => addNewBlock(block.position + 1)}
            title="Add block below"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        {/* Block Content */}
        {isEditing ? (
          <Textarea
            ref={(el) => {
              textareaRefs.current[block.id] = el;
              if (el) {
                autoResizeTextarea(el);
              }
            }}
            value={block.content}
            onChange={(e) => {
              updateBlockContent(block.id, e.target.value);
              if (textareaRefs.current[block.id]) {
                autoResizeTextarea(textareaRefs.current[block.id]!);
              }
            }}
            onBlur={() => finishEditingBlock(block.id)}
            onKeyDown={(e) => handleKeyDown(e, block.id)}
            onPaste={(e) => handlePaste(e, block.id)}
            onFocus={(e) => {
              // If the block is empty, set cursor to the beginning
              if (!block.content || block.content.trim() === '') {
                setTimeout(() => {
                  e.target.setSelectionRange(0, 0);
                }, 0);
              }
            }}
            className="min-h-[2.5rem] resize-none border-none shadow-none focus-visible:ring-0 text-lg"
            style={{
              fontFamily: 'Times New Roman, serif',
              lineHeight: '1.6',
            }}
            placeholder={block.position === 0 ? "Start writing here..." : ""}
          />
        ) : (
          <div
            className="min-h-[2.5rem] cursor-text p-2 rounded hover:bg-gray-50 transition-colors text-lg"
            onClick={() => startEditingBlock(block.id)}
            style={{
              fontFamily: 'Times New Roman, serif',
              lineHeight: '1.6',
            }}
          >
            {block.content ? (
              renderHighlightedText(block.content, block.annotations)
            ) : (
              <span className="text-gray-400 italic">
                {block.position === 0 ? "Start writing here..." : "Click to add content..."}
              </span>
            )}
          </div>
        )}

        {/* Comment indicators (for blocks with comments) */}
        {block.annotations.length > 0 && !showCommentSidebar && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              {block.annotations.length} comment{block.annotations.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`clean-semantic-editor ${className} ${showCommentSidebar ? 'flex h-full' : 'h-full'}`}>
      {/* Main Editor Area */}
      <div className={`${showCommentSidebar ? 'flex-1 min-w-0 pr-4' : 'w-full'}`}>
        {/* Editor Content */}
        <div className="relative pl-12">
          {/* Render all blocks */}
          {state.document.blocks
            .sort((a, b) => a.position - b.position)
            .map(renderBlock)}

        </div>
      </div>

      {/* Comment Sidebar */}
      {showCommentSidebar && (
        <CommentSidebar
          blocks={state.document.blocks}
          onAnnotationResolve={resolveAnnotation}
          onAnnotationDelete={deleteAnnotation}
          onAnnotationSelect={onAnnotationSelect}
          selectedAnnotationId={selectedAnnotationId}
          onHideSidebar={onHideSidebar}
        />
      )}

      {/* AI Comments Loading Pane */}
      <AICommentsLoadingPane
        isVisible={isGeneratingAIComments}
        steps={AI_COMMENTS_LOADING_STEPS}
        currentStepIndex={loadingStep}
        onComplete={() => {
          setIsGeneratingAIComments(false);
          setLoadingStep(0);
        }}
      />

      {/* Grammar Loading Pane */}
      <GrammarLoadingPane
        isVisible={isGeneratingGrammar}
        steps={GRAMMAR_LOADING_STEPS}
        currentStepIndex={grammarLoadingStep}
        noErrorsFound={noGrammarErrorsFound}
        onComplete={() => {
          setIsGeneratingGrammar(false);
          setGrammarLoadingStep(0);
          setNoGrammarErrorsFound(false); // Reset for next time
        }}
      />
    </div>
  );
};

export default CleanSemanticEditor;
