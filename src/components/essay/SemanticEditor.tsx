/**
 * Clean Semantic Editor - Simplified Block Management
 * 
 * A streamlined editor where users can:
 * - Click into ANY block at ANY time to edit it
 * - Delete any block easily (blocks automatically reorder)
 * - Copy/paste content seamlessly
 * - No complex selection states or confusing interactions
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  readOnly?: boolean;
  hasGrammarCheckRun?: boolean;
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
  className = '',
  readOnly = false,
  hasGrammarCheckRun = false
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
  const contentContainerRef = useRef<HTMLDivElement | null>(null);
  const undoStackRef = useRef<SemanticDocument[]>([]);
  const redoStackRef = useRef<SemanticDocument[]>([]);
  const lastInputAtRef = useRef<number>(0);

  // Respect read-only mode passed by parent
  const isReadOnly = useCallback(() => {
    return Boolean(readOnly);
  }, [readOnly]);

  

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
          // Seed undo stack with the loaded document so Cmd+Z with no edits is a no-op
          try {
            undoStackRef.current = [deepCloneDocument(existingDoc)];
            redoStackRef.current = [];
          } catch (_e) {
            // If deep clone fails for any reason, skip seeding safely
          }
          
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

  const deepCloneDocument = useCallback((doc: SemanticDocument): SemanticDocument => {
    return JSON.parse(JSON.stringify(doc));
  }, []);

  const saveToUndoStack = useCallback(() => {
    const snapshot = deepCloneDocument(state.document);
    undoStackRef.current = [...undoStackRef.current, snapshot].slice(-100);
    redoStackRef.current = [];
  }, [state.document, deepCloneDocument]);

  const undo = useCallback(() => {
    const undoStack = undoStackRef.current;
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    redoStackRef.current = [...redoStackRef.current, deepCloneDocument(state.document)].slice(-100);
    undoStackRef.current = undoStack.slice(0, -1);
    setState(prev => ({ ...prev, document: previous, pendingChanges: true }));
    setEditingBlockId(null);
  }, [state.document, deepCloneDocument]);

  const redo = useCallback(() => {
    const redoStack = redoStackRef.current;
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    undoStackRef.current = [...undoStackRef.current, deepCloneDocument(state.document)].slice(-100);
    redoStackRef.current = redoStack.slice(0, -1);
    setState(prev => ({ ...prev, document: next, pendingChanges: true }));
    setEditingBlockId(null);
  }, [state.document, deepCloneDocument]);

  const getDocumentPlainText = useCallback(() => {
    return [...state.document.blocks]
      .sort((a, b) => a.position - b.position)
      .map(b => b.content)
      .join('\n\n');
  }, [state.document.blocks]);

  const normalizeText = (text: string) => text.replace(/\s+/g, ' ').trim();

  // Select all text across all blocks in the editor content
  const selectAllEssayText = useCallback(() => {
    // Exit editing mode so visible content is selectable
    setEditingBlockId(null);

    // Next tick: select the full contents of the content container
    setTimeout(() => {
      const container = contentContainerRef.current;
      if (!container) return;

      const selection = window.getSelection();
      if (!selection) return;

      selection.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(container);
      selection.addRange(range);
    }, 0);
  }, []);

  const handleFullEssayCut = useCallback(async () => {
    try {
      const text = getDocumentPlainText();
      await navigator.clipboard.writeText(text);
    } catch (_e) {
      // Continue even if clipboard fails
    }

    saveToUndoStack();

    const emptyBlock: DocumentBlock = {
      id: crypto.randomUUID(),
      type: 'paragraph',
      content: '',
      position: 0,
      annotations: [],
      isImmutable: false,
      createdAt: new Date(),
      lastUserEdit: undefined
    };

    setState(prev => ({
      ...prev,
      document: {
        ...prev.document,
        blocks: [emptyBlock],
        updatedAt: new Date()
      },
      pendingChanges: true
    }));

    setTimeout(() => {
      setEditingBlockId(emptyBlock.id);
      const textarea = textareaRefs.current[emptyBlock.id];
      if (textarea) textarea.focus();
    }, 50);
  }, [getDocumentPlainText, saveToUndoStack]);

  // Add a new block
  const addNewBlock = useCallback((position?: number) => {
    // Editing always allowed
    saveToUndoStack();
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
  }, [state.document.blocks, isReadOnly, toast, saveToUndoStack]);

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
    // Editing always allowed
    saveToUndoStack();
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
  }, [editingBlockId, isReadOnly, toast, saveToUndoStack]);

  // Start editing a block
  const startEditingBlock = useCallback((blockId: string) => {
    // Editing always allowed

    setEditingBlockId(blockId);
    setState(prev => ({ ...prev, isEditing: true }));
    setTimeout(() => {
      const textarea = textareaRefs.current[blockId];
      if (textarea) {
        textarea.focus();
        autoResizeTextarea(textarea);
      }
    }, 50);
  }, [isReadOnly, toast]);

  // Finish editing a block
  const finishEditingBlock = useCallback((blockId: string) => {
    setEditingBlockId(null);
    setState(prev => ({ ...prev, isEditing: false }));
  }, []);

  // Update block content
  const updateBlockContent = useCallback((blockId: string, content: string) => {
    // Editing always allowed
    const now = Date.now();
    if (now - lastInputAtRef.current > 1000) {
      saveToUndoStack();
    }
    lastInputAtRef.current = now;
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
  }, [isReadOnly, saveToUndoStack]);

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

    saveToUndoStack();

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
      // Content auto-split
    }
  }, [detectParagraphs, insertMultipleBlocks]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent, blockId: string) => {
    const block = state.document.blocks.find(b => b.id === blockId);
    if (!block) return;

    // Undo / Redo at document scope
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      if (undoStackRef.current.length > 0) {
        e.preventDefault();
        undo();
      }
      return;
    }
    if ((e.metaKey && e.shiftKey && e.key.toLowerCase() === 'z') || (e.ctrlKey && e.key.toLowerCase() === 'y')) {
      if (redoStackRef.current.length > 0) {
        e.preventDefault();
        redo();
      }
      return;
    }

    // Cmd/Ctrl + A: select all text across all blocks
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      selectAllEssayText();
      return;
    }

    // Enter key: split text at cursor position or create new block
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveToUndoStack();
      
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
      saveToUndoStack();
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
  }, [state.document.blocks, addNewBlock, deleteBlock, startEditingBlock, finishEditingBlock, selectAllEssayText, undo, redo, saveToUndoStack]);

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
    }
    // Note: Don't auto-close the loading pane - let user click "See AI Comments" button
  }, [state.document]);

  // Global key handling for undo/redo and full-essay cut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Undo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (undoStackRef.current.length > 0) {
          e.preventDefault();
          undo();
        }
        return;
      }
      // Redo: Cmd+Shift+Z (Mac) or Ctrl+Y
      if ((e.metaKey && e.shiftKey && e.key.toLowerCase() === 'z') || (e.ctrlKey && e.key.toLowerCase() === 'y')) {
        if (redoStackRef.current.length > 0) {
          e.preventDefault();
          redo();
        }
        return;
      }

      // Cut entire essay after select-all
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'x') {
        const selection = window.getSelection();
        const container = contentContainerRef.current;
        if (!selection || !container || selection.toString().trim().length === 0) return;
        // Compare normalized selection to full document text
        const selectionText = normalizeText(selection.toString());
        const docText = normalizeText(getDocumentPlainText());
        if (selectionText && docText && selectionText === docText) {
          e.preventDefault();
          handleFullEssayCut();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, getDocumentPlainText, handleFullEssayCut]);

  // Handle "See AI Comments" button click
  const handleSeeAIComments = () => {
    // Close the loading pane
    setIsGeneratingAIComments(false);
    setLoadingStep(0);
    
    // Refresh the page to show the newly generated comments
    window.location.reload();
  };

  // Handle "See Grammar Comments" button click
  const handleSeeGrammarComments = () => {
    // Close the loading pane
    setIsGeneratingGrammar(false);
    setGrammarLoadingStep(0);
    
    // Refresh the page to show the newly generated comments
    window.location.reload();
  };

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
    }
    // Note: Don't auto-close the loading pane - let user click "See Grammar Comments" button
  }, [state.document]);

  // Resolve annotation (optimistic update + persist to Supabase)
  const resolveAnnotation = useCallback((annotationId: string) => {
    const previousDocument = deepCloneDocument(state.document);

    // Optimistic UI update
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

    // Persist to backend
    semanticDocumentService
      .persistAnnotationResolution(annotationId)
      .catch((error) => {
        // Revert optimistic change on failure
        setState(prev => ({
          ...prev,
          document: previousDocument,
          pendingChanges: prev.pendingChanges
        }));
        toast({
          title: 'Failed to resolve comment',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'destructive'
        });
      });
  }, [state.document, deepCloneDocument, toast]);

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

  // Reload document from database
  const reloadDocument = useCallback(async () => {
    try {
      const reloadedDocument = await semanticDocumentService.loadDocument(state.document.id);
      if (reloadedDocument) {
        setState(prev => ({
          ...prev,
          document: reloadedDocument,
          pendingChanges: false
        }));
      }
    } catch (error) {
      console.error('Failed to reload document:', error);
      toast({
        title: "Error",
        description: "Failed to reload document. Please try again.",
        variant: "destructive"
      });
    }
  }, [state.document.id, toast]);

  // Render highlighted text with annotations
  const renderHighlightedText = (text: string, annotations: Annotation[]) => {
    if (!text || annotations.length === 0) {
      return text;
    }


    // Create highlight segments for annotations with targetText
    const segments: Array<{ start: number; end: number; annotation: Annotation }> = [];
    
    annotations.forEach(annotation => {

      if (annotation.targetText && !annotation.resolved) {
        // Find all occurrences of the target text (in case it appears multiple times)
        let index = text.indexOf(annotation.targetText);
        
        // If exact match fails, try intelligent fuzzy matching
        if (index === -1) {
          
          // Try to find quoted text that might be the actual target
          const quotedTextMatch = annotation.content.match(/['"]([^'"]+)['"]/);
          if (quotedTextMatch && quotedTextMatch[1]) {
            const quotedText = quotedTextMatch[1];
            index = text.indexOf(quotedText);
            if (index !== -1) {
              annotation.targetText = quotedText;
            }
          }
          
          // If still no match, try to find a partial match by removing the "..." if present
          if (index === -1) {
            let cleanTargetText = annotation.targetText;
            if (cleanTargetText.endsWith('...')) {
              cleanTargetText = cleanTargetText.slice(0, -3);
              index = text.indexOf(cleanTargetText);
            }
            
            // If still no match, try first few words
            if (index === -1) {
              const words = cleanTargetText.split(' ').slice(0, 5).join(' ');
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
    

    // If no segments to highlight, return plain text
    if (nonOverlappingSegments.length === 0) {
      console.log('No segments to highlight, returning plain text');
      return text;
    }


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
            className="min-h-[2.5rem] resize-none border-none shadow-none focus-visible:ring-0 text-base w-full overflow-wrap-anywhere break-words"
            style={{
              fontFamily: 'Arial, sans-serif',
              lineHeight: '1.6',
              wordWrap: 'break-word',
              overflowWrap: 'anywhere',
              hyphens: 'auto',
            }}
            placeholder={block.position === 0 ? "Start writing here..." : ""}
          />
        ) : (
          <div className="relative">
            <div
              className={`min-h-[2.5rem] p-2 rounded transition-colors text-base w-full overflow-wrap-anywhere break-words ${
                isReadOnly()
                  ? 'cursor-not-allowed bg-gray-50 text-gray-500'
                  : 'cursor-text hover:bg-gray-50'
              }`}
              onClick={() => {
                if (!isReadOnly()) startEditingBlock(block.id);
              }}
              title={isReadOnly() ? 'Editor text is read-only. Create a new version to edit.' : 'Click to edit'}
              style={{
                fontFamily: 'Arial, sans-serif',
                lineHeight: '1.6',
                wordWrap: 'break-word',
                overflowWrap: 'anywhere',
                hyphens: 'auto',
              }}
            >
              {block.content ? (
                renderHighlightedText(block.content, block.annotations)
              ) : (
                <span className="text-gray-400 italic">
                  {block.position === 0 ? 'Start writing here...' : 'Click to add content...'}
                </span>
              )}
            </div>
            {isReadOnly() && (
              <div className="pointer-events-none absolute inset-0 flex items-start opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="ml-2 mt-1 text-[11px] text-gray-600 bg-gray-100/80 border border-gray-300 rounded px-2 py-0.5">
                  Editor is read-only. Click "New Version" to edit.
                </div>
              </div>
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
    <div className={`clean-semantic-editor ${className} ${showCommentSidebar ? 'flex h-full' : 'h-full'} w-full overflow-hidden`}>
      {/* Main Editor Area */}
      <div className={`${showCommentSidebar ? 'flex-1 min-w-0 pr-4 lg:pr-4 pr-0' : 'w-full'} overflow-hidden`}>
        {/* Editor Content */}
        <div className="relative pl-4 lg:pl-12 w-full overflow-hidden" ref={contentContainerRef}>
          {/* Render all blocks */}
          {useMemo(() => {
            const sortedBlocks = [...state.document.blocks].sort((a, b) => a.position - b.position);
            return sortedBlocks.map(renderBlock);
          }, [state.document.blocks, editingBlockId, showCommentSidebar])}

        </div>
      </div>

      {/* Comment Sidebar */}
      <div className={showCommentSidebar ? 'hidden lg:block' : 'hidden lg:hidden'}>
        <CommentSidebar
          key={state.document.id}
          blocks={useMemo(() => [...state.document.blocks].sort((a, b) => a.position - b.position), [state.document.blocks])}
          documentId={state.document.id}
          onAnnotationResolve={resolveAnnotation}
          onAnnotationDelete={deleteAnnotation}
          onAnnotationSelect={onAnnotationSelect}
          onDocumentReload={reloadDocument}
          hasGrammarCheckRun={hasGrammarCheckRun}
          selectedAnnotationId={selectedAnnotationId}
          onHideSidebar={onHideSidebar}
        />
      </div>

      {/* AI Comments Loading Pane */}
      <AICommentsLoadingPane
        isVisible={isGeneratingAIComments}
        steps={AI_COMMENTS_LOADING_STEPS}
        currentStepIndex={loadingStep}
        onComplete={() => {
          setIsGeneratingAIComments(false);
          setLoadingStep(0);
        }}
        onSeeComments={handleSeeAIComments}
      />

      {/* Grammar Loading Pane */}
      <GrammarLoadingPane
        isVisible={isGeneratingGrammar}
        steps={GRAMMAR_LOADING_STEPS}
        currentStepIndex={grammarLoadingStep}
        noErrorsFound={noGrammarErrorsFound}
        onSeeGrammarComments={handleSeeGrammarComments}
      />

    </div>
  );
};

export default CleanSemanticEditor;
