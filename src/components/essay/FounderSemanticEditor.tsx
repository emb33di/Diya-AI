/**
 * Founder Semantic Editor - Grammar-free version for Founder Portal
 * 
 * A duplicate of SemanticEditor but without grammar features.
 * This ensures changes to Founder Portal don't affect the user-facing editor.
 * 
 * - Click into ANY block at ANY time to edit it
 * - Delete any block easily (blocks automatically reorder)
 * - Copy/paste content seamlessly
 * - No grammar checking (not relevant for Founder Portal)
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  SemanticDocument, 
  DocumentBlock, 
  Annotation, 
  SemanticEditorState
} from '@/types/semanticDocument';
import { semanticDocumentService } from '@/services/semanticDocumentService';
import { EscalatedEssaysService } from '@/services/escalatedEssaysService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import TiptapEditor, { TiptapEditorRef } from './TiptapEditor';
import { 
  MessageSquare, 
  CheckCircle, 
  Plus, 
  Trash2,
  Sparkles,
  User,
  Bot,
  Copy,
  CheckSquare,
  FileEdit,
  Save
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AICommentsLoadingPane, { AI_COMMENTS_LOADING_STEPS } from './AICommentsLoadingPane';
import FounderCommentSidebar from './FounderCommentSidebar';
import './SemanticHighlighting.css';

interface FounderSemanticEditorProps {
  documentId?: string;
  essayId: string;
  escalationId?: string;
  title: string;
  initialContent?: string;
  initialDocument?: SemanticDocument; // If provided, use this document instead of loading from DB
  wordLimit?: number;
  onDocumentChange?: (document: SemanticDocument) => void;
  onAnnotationSelect?: (annotation: Annotation | null) => void;
  onSaveStatusChange?: (isAutoSaving: boolean, lastSaved: Date | null) => void;
  showCommentSidebar?: boolean;
  selectedAnnotationId?: string;
  onHideSidebar?: () => void;
  className?: string;
  readOnly?: boolean;
  disableAutoSave?: boolean; // When true, don't auto-save to semantic_documents (parent handles saving)
  onSave?: () => void;
  saveDisabled?: boolean;
  saveLabel?: string;
  onMarkReviewed?: () => void;
  markReviewedDisabled?: boolean;
}

const FounderSemanticEditor: React.FC<FounderSemanticEditorProps> = ({
  documentId,
  essayId,
  escalationId,
  title,
  initialContent = '',
  initialDocument,
  wordLimit = 650,
  onDocumentChange,
  onAnnotationSelect,
  onSaveStatusChange,
  showCommentSidebar = false,
  selectedAnnotationId,
  onHideSidebar,
  className = '',
  readOnly = false,
  disableAutoSave = false,
  onSave,
  saveDisabled = false,
  saveLabel = 'Save',
  onMarkReviewed,
  markReviewedDisabled = false
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
  const [isGeneratingAIComments, setIsGeneratingAIComments] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // Mode-based editing state
  const [founderMode, setFounderMode] = useState<'comment' | 'edit'>('comment');

  // Selection tracking for comments
  const [activeSelection, setActiveSelection] = useState<{
    text: string;
    range: Range;
    blockIds: string[];
    startBlock: string;
    startOffset: number;
    endBlock: string;
    endOffset: number;
  } | null>(null);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [commentDialogText, setCommentDialogText] = useState('');
  const [focusNewComment, setFocusNewComment] = useState(false);
  const [newCommentSelectedText, setNewCommentSelectedText] = useState('');
  const [isMac, setIsMac] = useState(false);

  // Toast for user feedback
  const { toast } = useToast();

  // Detect platform for keyboard shortcut display
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
             navigator.userAgent.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl + S to trigger save
  useEffect(() => {
    if (!onSave || readOnly) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';
      if (isSaveShortcut) {
        event.preventDefault();
        if (!saveDisabled) {
          onSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, saveDisabled, readOnly]);

  // Refs for Tiptap editor management
  const tiptapRefs = useRef<Record<string, TiptapEditorRef | null>>({});
  const contentContainerRef = useRef<HTMLDivElement | null>(null);
  const undoStackRef = useRef<SemanticDocument[]>([]);
  const redoStackRef = useRef<SemanticDocument[]>([]);
  const lastInputAtRef = useRef<number>(0);
  const activeSelectionRef = useRef<typeof activeSelection>(null);

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

  // Auto-save functionality (disabled if disableAutoSave is true - parent handles saving)
  useEffect(() => {
    // Skip auto-save if disabled (founder workflow - parent saves to escalated_essays table)
    if (disableAutoSave) {
      // Still notify parent of changes so it can handle saving
      if (state.pendingChanges && onDocumentChange) {
        onDocumentChange(state.document);
      }
      return;
    }

    if (!state.pendingChanges) return;

    // Critical safeguard: Don't autosave if document appears empty but we're tracking a loaded document
    // This prevents HMR from saving empty state over existing content
    const hasContent = state.document.blocks.some(block => 
      block.content && typeof block.content === 'string' && block.content.trim().length > 0
    );
    
    // If we've previously loaded a document with this ID, but now state is empty, don't save
    // This indicates a state reset (possibly from HMR) and we should reload instead
    if (!hasContent && lastLoadedDocumentIdRef.current && lastLoadedDocumentIdRef.current === (documentId || essayId)) {
      console.warn('[AUTOSAVE] Skipping save: Document appears empty but we had loaded content. This might be from HMR. Reloading...');
      // Trigger a reload instead of saving empty content
      if (documentId) {
        semanticDocumentService.loadDocument(documentId).then(loadedDoc => {
          if (loadedDoc && loadedDoc.blocks.some(b => b.content?.trim())) {
            setState(prev => ({ ...prev, document: loadedDoc, pendingChanges: false }));
          }
        }).catch(console.error);
      }
      return;
    }

    const autoSaveTimer = setTimeout(async () => {
      try {
        setIsAutoSaving(true);
        await semanticDocumentService.saveDocument(state.document);
        setLastSaved(new Date());
        setState(prev => ({ ...prev, pendingChanges: false }));
        onSaveStatusChange?.(false, new Date());
      } catch (error) {
        console.error('Auto-save failed:', error);
        // If save failed due to empty content protection, try to reload from DB
        if (error instanceof Error && error.message.includes('empty document over existing')) {
          console.warn('[AUTOSAVE] Save blocked by safety check. Attempting to reload from database...');
          if (documentId) {
            try {
              const reloaded = await semanticDocumentService.loadDocument(documentId);
              if (reloaded) {
                setState(prev => ({ ...prev, document: reloaded, pendingChanges: false }));
              }
            } catch (reloadError) {
              console.error('Failed to reload after blocked save:', reloadError);
            }
          }
        }
      } finally {
        setIsAutoSaving(false);
      }
    }, 1000);

    return () => clearTimeout(autoSaveTimer);
  }, [state.document, state.pendingChanges, onSaveStatusChange, documentId, essayId, disableAutoSave, onDocumentChange]);

  // Track the last documentId we loaded to prevent unnecessary reloads
  // Use a stable key to persist across HMR - store in window to survive hot reloads
  const getStableKey = (id: string | undefined) => `semantic_editor_last_loaded_${id || essayId}`;
  const lastLoadedDocumentIdRef = useRef<string | undefined>(
    typeof window !== 'undefined' && documentId 
      ? window.sessionStorage.getItem(getStableKey(documentId)) || undefined
      : undefined
  );
  const isInitialMountRef = useRef(true);
  const lastInitialDocumentRef = useRef<string>(''); // Track initialDocument to prevent re-setting

  // Load existing document
  useEffect(() => {
    const loadDocument = async () => {
      try {
        // If initialDocument is provided, use it instead of loading from DB
        if (initialDocument) {
          // Check if initialDocument actually changed (compare JSON to prevent loops)
          const initialDocJson = JSON.stringify(initialDocument);
          if (lastInitialDocumentRef.current === initialDocJson && !isInitialMountRef.current) {
            // Same document, skip setting
            isInitialMountRef.current = false;
            return;
          }
          lastInitialDocumentRef.current = initialDocJson;
          
          // Only set if document ID is different (prevent infinite loops)
          if (state.document.id !== initialDocument.id || isInitialMountRef.current) {
            // Filter out grammar annotations (not relevant for Founder Portal)
            const filteredDoc = {
              ...initialDocument,
              blocks: initialDocument.blocks.map(block => ({
                ...block,
                annotations: (block.annotations || []).filter(ann => 
                  ann.metadata?.agentType !== 'grammar' && 
                  ann.metadata?.commentCategory !== 'grammar'
                )
              }))
            };
            
            // Skip notifying parent when setting from initialDocument
            skipNextChangeRef.current = true;
            setState(prev => ({
              ...prev,
              document: filteredDoc
            }));
            
            lastLoadedDocumentIdRef.current = filteredDoc.id;
          }
          isInitialMountRef.current = false;
          return;
        }
        
        const targetDocumentId = documentId || essayId;
        
        // Critical fix: If documentId hasn't changed AND it's not the initial mount, don't reload (prevents overwriting unsaved edits)
        if (!isInitialMountRef.current && lastLoadedDocumentIdRef.current === targetDocumentId && state.document.id === targetDocumentId) {
          // Document ID hasn't changed, skip reload to preserve unsaved edits
          return;
        }
        
        isInitialMountRef.current = false;

        // If we have pending changes and documentId changed, save them first
        if (state.pendingChanges && lastLoadedDocumentIdRef.current && lastLoadedDocumentIdRef.current !== targetDocumentId) {
          try {
            setIsAutoSaving(true);
            await semanticDocumentService.saveDocument(state.document);
            setState(prev => ({ ...prev, pendingChanges: false }));
          } catch (error) {
            console.error('Failed to save pending changes before reload:', error);
          } finally {
            setIsAutoSaving(false);
          }
        }

        let existingDoc = null;
        
        if (documentId) {
          existingDoc = await semanticDocumentService.loadDocument(documentId);
        } else {
          existingDoc = await semanticDocumentService.loadDocumentByEssayId(essayId);
        }

        if (existingDoc) {
          // Filter out grammar annotations (not relevant for Founder Portal)
          const filteredDoc = {
            ...existingDoc,
            blocks: existingDoc.blocks.map(block => ({
              ...block,
              annotations: (block.annotations || []).filter(ann => 
                ann.metadata?.agentType !== 'grammar' && 
                ann.metadata?.commentCategory !== 'grammar'
              )
            }))
          };
          
          // Only update if documentId actually changed
          if (filteredDoc.id !== state.document.id) {
            setState(prev => ({
              ...prev,
              document: filteredDoc
            }));
          }
          // Seed undo stack with the loaded document so Cmd+Z with no edits is a no-op
          try {
            undoStackRef.current = [deepCloneDocument(existingDoc)];
            redoStackRef.current = [];
          } catch (_e) {
            // If deep clone fails for any reason, skip seeding safely
          }
          
          // Track that we've loaded this document (persist across HMR)
          lastLoadedDocumentIdRef.current = targetDocumentId;
          if (typeof window !== 'undefined') {
            try {
              window.sessionStorage.setItem(getStableKey(targetDocumentId), targetDocumentId);
            } catch (e) {
              // sessionStorage might fail in private browsing, ignore
            }
          }
          
          // If the document has only empty blocks, start editing the first one
          const hasContent = existingDoc.blocks.some(block => block.content.trim().length > 0);
          if (!hasContent && existingDoc.blocks.length > 0) {
            setTimeout(() => {
              setEditingBlockId(existingDoc.blocks[0].id);
              const tiptapEditor = tiptapRefs.current[existingDoc.blocks[0].id];
              if (tiptapEditor) {
                tiptapEditor.focus();
              }
            }, 100);
          }
        } else if (!initialContent) {
          // Create a new document with a single empty block
          addNewBlock();
          lastLoadedDocumentIdRef.current = targetDocumentId;
        }
      } catch (error) {
        console.error('Failed to load document:', error);
        // Create a new document with a single empty block on error
        addNewBlock();
      }
    };

    loadDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, essayId, initialDocument]); // Note: intentionally not including state to prevent unnecessary reloads

  // Notify parent of document changes (with grammar annotations filtered out)
  // Only notify when document actually changes, not on every render
  const prevDocumentRef = useRef<string>('');
  const skipNextChangeRef = useRef(false);
  
  useEffect(() => {
    // Skip notification during initial mount to prevent loops
    if (isInitialMountRef.current) {
      prevDocumentRef.current = JSON.stringify(state.document);
      return;
    }
    
    // Skip if we just set the document from initialDocument prop
    if (skipNextChangeRef.current) {
      skipNextChangeRef.current = false;
      prevDocumentRef.current = JSON.stringify(state.document);
      return;
    }
    
    // Use a ref to track if document actually changed (compare JSON)
    const currentDocJson = JSON.stringify(state.document);
    if (prevDocumentRef.current === currentDocJson) {
      return; // Document hasn't changed, skip notification
    }
    prevDocumentRef.current = currentDocJson;

    // Filter out grammar annotations before notifying parent
    const filteredDocument = {
      ...state.document,
      blocks: state.document.blocks.map(block => ({
        ...block,
        annotations: (block.annotations || []).filter(ann => 
          ann.metadata?.agentType !== 'grammar' && 
          ann.metadata?.commentCategory !== 'grammar'
        )
      }))
    };
    onDocumentChange?.(filteredDocument);
  }, [state.document, onDocumentChange]);

  // Auto-resize Tiptap editor (minimal implementation for now)
  const autoResizeTiptap = (editorRef: TiptapEditorRef | null) => {
    // Tiptap handles sizing automatically, this is a placeholder for future enhancements
    if (editorRef) {
      // Future: implement custom sizing logic if needed
    }
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

  // Copy essay text to clipboard
  const copyEssayText = useCallback(async () => {
    try {
      const text = getDocumentPlainText();
      if (!text.trim()) {
        toast({
          title: 'Nothing to copy',
          description: 'The essay is empty.',
          variant: 'destructive'
        });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: 'Essay text has been copied to your clipboard.',
      });
    } catch (error) {
      console.error('Failed to copy text:', error);
      toast({
        title: 'Copy failed',
        description: 'Failed to copy text to clipboard. Please try again.',
        variant: 'destructive'
      });
    }
  }, [getDocumentPlainText, toast]);

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
      const tiptapEditor = tiptapRefs.current[emptyBlock.id];
      if (tiptapEditor) tiptapEditor.focus();
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
      const tiptapEditor = tiptapRefs.current[newBlock.id];
      if (tiptapEditor) {
        tiptapEditor.focus();
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
        const tiptapEditor = tiptapRefs.current[newBlock.id];
        if (tiptapEditor) {
          tiptapEditor.focus();
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
  const startEditingBlock = useCallback((blockId: string, clickPosition?: number, selectionRange?: { start: number; end: number }) => {
    // Editing always allowed
    setEditingBlockId(blockId);
    setState(prev => ({ ...prev, isEditing: true }));
    setTimeout(() => {
      const tiptapEditor = tiptapRefs.current[blockId];
      if (tiptapEditor) {
        tiptapEditor.focus();
        autoResizeTiptap(tiptapEditor);
        
        // If we have a selection range, restore the selection
        if (selectionRange !== undefined) {
          // TipTap paragraph text starts at position 1; adjust by +1 to avoid off-by-one
          const contentLen = tiptapEditor.getContentLength();
          const adjustedStart = Math.max(1, Math.min(selectionRange.start + 1, contentLen - 1));
          const adjustedEnd = Math.max(1, Math.min(selectionRange.end + 1, contentLen - 1));
          tiptapEditor.setSelectionRange(adjustedStart, adjustedEnd);
        } else if (clickPosition !== undefined) {
          // If we have a click position, set the cursor there
          // TipTap paragraph text starts at position 1; adjust by +1 to avoid off-by-one
          const contentLen = tiptapEditor.getContentLength();
          const adjusted = Math.max(1, Math.min(clickPosition + 1, contentLen - 1));
          tiptapEditor.setCursorAtPosition(adjusted);
        }
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
  }, [saveToUndoStack]);

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
    const cursorPosition = tiptapRefs.current[currentBlockId]?.getSelectionStart() || 0;
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
        startEditingBlock(lastBlock.id, undefined);
        const tiptapEditor = tiptapRefs.current[lastBlock.id];
        if (tiptapEditor) {
          // Set cursor to end of content
          const endPosition = lastBlock.content.length;
          tiptapEditor.setSelectionRange(endPosition, endPosition);
          tiptapEditor.focus();
        }
      }, 50);
    }
  }, [state.document.blocks, addNewBlock, updateBlockContent, startEditingBlock]);

  // Handle paste events
  const handlePaste = useCallback((e: React.ClipboardEvent, blockId: string): boolean => {
    const pastedText = e.clipboardData.getData('text/plain');
    
    if (!pastedText.trim()) return false;
    
    // Detect if content has multiple paragraphs
    const paragraphs = detectParagraphs(pastedText);
    
    if (paragraphs.length > 1) {
      e.preventDefault(); // Prevent default paste behavior
      insertMultipleBlocks(blockId, paragraphs);
      return true; // Indicate we handled the paste
    } else {
      return false; // Let Tiptap handle it normally
    }
  }, [detectParagraphs, insertMultipleBlocks]);

  // Helper function to get text nodes within a container
  const getTextNodesIn = useCallback((container: HTMLElement): Text[] => {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip hidden nodes
          const element = node.parentElement;
          if (!element) return NodeFilter.FILTER_REJECT;
          const style = window.getComputedStyle(element);
          if (style.display === 'none' || style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
          }
          // Accept all visible text nodes, including whitespace, to preserve accurate offsets
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE) {
        textNodes.push(node as Text);
      }
    }
    return textNodes;
  }, []);

  // Helper function to get wrapped line rects for a text node
  const getWrappedLineRectsForNode = useCallback((textNode: Text): DOMRect[] => {
    const lines: { top: number; bottom: number; left: number; right: number }[] = [];
    const text = textNode.textContent || '';
    
    if (!text.trim()) return [];
    
    // Create ranges for each character to get line information
    for (let i = 0; i < text.length; i++) {
      const range = document.createRange();
      range.setStart(textNode, i);
      range.setEnd(textNode, i + 1);
      
      const rect = range.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) { // Valid rect
        // Check if this rect belongs to an existing line
        let foundLine = false;
        for (const line of lines) {
          // Same line if top/bottom are close (within 1px tolerance)
          if (Math.abs(rect.top - line.top) < 1 && Math.abs(rect.bottom - line.bottom) < 1) {
            // Extend the line rect to include this character
            line.left = Math.min(line.left, rect.left);
            line.right = Math.max(line.right, rect.right);
            foundLine = true;
            break;
          }
        }
        
        if (!foundLine) {
          lines.push({
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right
          });
        }
      }
    }
    
    // Convert back to DOMRect-like objects
    return lines.map(line => ({
      top: line.top,
      bottom: line.bottom,
      left: line.left,
      right: line.right,
      width: line.right - line.left,
      height: line.bottom - line.top,
      x: line.left,
      y: line.top,
      toJSON: () => ({})
    })) as DOMRect[];
  }, []);

  // Helper function to find caret offset in a text node on a specific line
  const caretOffsetInNodeOnLine = useCallback((textNode: Text, clientX: number, lineIndex: number): number => {
    const text = textNode.textContent || '';
    const lines = getWrappedLineRectsForNode(textNode);
    
    if (lineIndex >= lines.length) {
      return text.length; // Beyond last line
    }
    
    const lineRect = lines[lineIndex];
    
    // Handle empty lines or lines with no visible characters
    if (lineRect.width === 0) {
      // If click is on the left half of the line, go to start
      // If click is on the right half, go to end
      const lineMidpoint = lineRect.left + lineRect.width / 2;
      return clientX < lineMidpoint ? 0 : text.length;
    }
    
    // Binary search by glyph using Range rects
    let left = 0;
    let right = text.length;
    let bestOffset = 0;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      
      // Create range for this character
      const range = document.createRange();
      range.setStart(textNode, mid);
      range.setEnd(textNode, Math.min(mid + 1, text.length));
      
      const rect = range.getBoundingClientRect();
      
      // Check if this character is on the target line
      const isOnTargetLine = Math.abs(rect.top - lineRect.top) < 1 && 
                            Math.abs(rect.bottom - lineRect.bottom) < 1;
      
      if (isOnTargetLine) {
        // Handle RTL text by checking both left and right boundaries
        const charMidpoint = rect.left + rect.width / 2;
        const isRTL = rect.right < rect.left; // Simple RTL detection
        
        if (isRTL) {
          // For RTL text, reverse the comparison logic
          if (charMidpoint > clientX) {
            bestOffset = mid + 1;
            left = mid + 1;
          } else {
            right = mid - 1;
          }
        } else {
          // Normal LTR logic
          if (charMidpoint < clientX) {
            bestOffset = mid + 1;
            left = mid + 1;
          } else {
            right = mid - 1;
          }
        }
      } else if (rect.top < lineRect.top) {
        // Character is above target line
        left = mid + 1;
      } else {
        // Character is below target line
        right = mid - 1;
      }
    }
    
    return Math.min(bestOffset, text.length);
  }, [getWrappedLineRectsForNode]);

  // Main function to get caret position at point using DOM hit-testing
  const getCaretAtPoint = useCallback((container: HTMLElement, clientX: number, clientY: number): { node: Text; offset: number } | null => {
    const anyDoc: any = document;

    // 1) Native fast path - try browser's built-in hit-testing
    let r: Range | null = null;
    if (anyDoc.caretRangeFromPoint) {
      r = anyDoc.caretRangeFromPoint(clientX, clientY);
    } else if (anyDoc.caretPositionFromPoint) {
      const pos = anyDoc.caretPositionFromPoint(clientX, clientY);
      if (pos) {
        r = document.createRange();
        r.setStart(pos.offsetNode, pos.offset);
        r.collapse(true);
      }
    }
    
    if (r && r.startContainer?.nodeType === Node.TEXT_NODE) {
      const node = r.startContainer as Text;
      const offset = r.startOffset ?? 0;
      return { node, offset };
    }

    // 2) Fallback: find line at Y, then glyph binary search
    const textNodes = getTextNodesIn(container);
    let hit: { node: Text; lineRect: DOMRect; lineIndex: number } | null = null;

    for (const node of textNodes) {
      const lines = getWrappedLineRectsForNode(node);
      for (let i = 0; i < lines.length; i++) {
        const rect = lines[i];
        // Use a small tolerance for line detection to handle sub-pixel rendering
        const tolerance = 2;
        const inside = clientY >= (rect.top - tolerance) && clientY <= (rect.bottom + tolerance);
        if (inside) { 
          hit = { node, lineRect: rect, lineIndex: i }; 
          break; 
        }
      }
      if (hit) break;
    }
    
    // If no exact line match, find the closest line
    if (!hit && textNodes.length > 0) {
      let closestDistance = Infinity;
      for (const node of textNodes) {
        const lines = getWrappedLineRectsForNode(node);
        for (let i = 0; i < lines.length; i++) {
          const rect = lines[i];
          const distance = Math.min(
            Math.abs(clientY - rect.top),
            Math.abs(clientY - rect.bottom),
            Math.abs(clientY - (rect.top + rect.bottom) / 2)
          );
          if (distance < closestDistance) {
            closestDistance = distance;
            hit = { node, lineRect: rect, lineIndex: i };
          }
        }
      }
    }
    
    if (!hit) return null;

    const offset = caretOffsetInNodeOnLine(hit.node, clientX, hit.lineIndex);
    return { node: hit.node, offset };
  }, [getTextNodesIn, getWrappedLineRectsForNode, caretOffsetInNodeOnLine]);

  // Helper function to get selection range within a block element
  const getSelectionRangeInBlock = useCallback((blockElement: HTMLElement, text: string): { start: number; end: number } | null => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().trim().length === 0) {
      return null;
    }
    
    const range = selection.getRangeAt(0);
    if (!range) {
      return null;
    }
    
    // Check if the selection is within this block
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;
    
    // Check if both containers are within the block element
    if (!blockElement.contains(startContainer) || !blockElement.contains(endContainer)) {
      return null;
    }
    
    // Use Range API to calculate positions by creating ranges from block start to selection boundaries
    const getPositionFromBlockStart = (container: Node, offset: number): number => {
      // Create a range from the start of the block to the target position
      const measureRange = document.createRange();
      
      // Find the first text node in the block
      const textNodes = getTextNodesIn(blockElement);
      if (textNodes.length === 0) {
        return 0;
      }
      
      // Set range start to beginning of block
      measureRange.setStart(textNodes[0], 0);
      
      // Set range end to the target position
      // If container is a text node, use it directly
      if (container.nodeType === Node.TEXT_NODE) {
        measureRange.setEnd(container, Math.min(offset, (container as Text).textContent?.length || 0));
      } else if (container.nodeType === Node.ELEMENT_NODE) {
        // If container is an element, find the text node at the given offset
        const childNodes = Array.from(container.childNodes);
        let currentOffset = offset;
        
        for (const child of childNodes) {
          if (child.nodeType === Node.TEXT_NODE) {
            const textLength = (child as Text).textContent?.length || 0;
            if (currentOffset === 0) {
              measureRange.setEnd(child, 0);
              break;
            } else if (currentOffset <= textLength) {
              measureRange.setEnd(child, currentOffset);
              break;
            }
            currentOffset -= textLength;
          } else {
            // For element nodes, offset refers to child node index
            if (currentOffset === 0 && child.nodeType === Node.ELEMENT_NODE) {
              // Find first text node in this child
              const childTextNodes = getTextNodesIn(child as HTMLElement);
              if (childTextNodes.length > 0) {
                measureRange.setEnd(childTextNodes[0], 0);
              } else {
                // No text nodes, set to the element itself
                measureRange.setEnd(child, 0);
              }
              break;
            }
            currentOffset--;
          }
        }
      }
      
      // The text content length of the range is the position from block start
      return measureRange.toString().length;
    };
    
    const startPos = getPositionFromBlockStart(startContainer, range.startOffset);
    const endPos = getPositionFromBlockStart(endContainer, range.endOffset);
    
    // Ensure positions are within bounds and ordered correctly
    const finalStart = Math.max(0, Math.min(Math.min(startPos, endPos), text.length));
    const finalEnd = Math.max(0, Math.min(Math.max(startPos, endPos), text.length));
    
    // Only return range if there's actually a selection (start !== end)
    if (finalStart === finalEnd) {
      return null;
    }
    
    return { start: finalStart, end: finalEnd };
  }, [getTextNodesIn]);

  // Helper function to calculate click position within text using DOM hit-testing
  const calculateClickPosition = useCallback((event: React.MouseEvent, text: string): number => {
    if (!text) return 0;
    
    const target = event.currentTarget as HTMLElement;
    const clientX = event.clientX;
    const clientY = event.clientY;
    
    // Use DOM hit-testing to find the exact caret position
    const caretResult = getCaretAtPoint(target, clientX, clientY);
    
    if (caretResult) {
      const { node, offset } = caretResult;
      // Sum lengths of all prior text nodes within the block container to get block-relative index
      const textNodes = getTextNodesIn(target);
      let cumulative = 0;
      for (const n of textNodes) {
        if (n === node) {
          cumulative += Math.min(offset, n.textContent ? n.textContent.length : 0);
          break;
        }
        cumulative += n.textContent ? n.textContent.length : 0;
      }
      return Math.max(0, Math.min(cumulative, text.length));
    }
    
    // Fallback: if DOM hit-testing fails, estimate based on click position
    const rect = target.getBoundingClientRect();
    const x = clientX - rect.left;
    const avgCharWidth = 8;
    const estimatedPosition = Math.floor(x / avgCharWidth);
    return Math.max(0, Math.min(estimatedPosition, text.length));
  }, [getCaretAtPoint, getTextNodesIn]);

  // Helper functions for cursor position detection
  const isAtStartOfBlock = useCallback((tiptapEditor: TiptapEditorRef, blockContent: string) => {
    const cursorPos = tiptapEditor.getSelectionStart();
    // Treat TipTap positions 0 or 1 as the start of the block (inside <p> tag)
    return cursorPos <= 1;
  }, []);

  const isAtEndOfBlock = useCallback((tiptapEditor: TiptapEditorRef, blockContent: string) => {
    const cursorPos = tiptapEditor.getSelectionStart();
    const contentLength = blockContent.length;
    // Check if cursor is at or very close to the end of the content
    // TipTap might have slight position differences due to paragraph nodes, so we check within 2 characters
    return cursorPos >= contentLength - 1;
  }, []);

  // Check if cursor is at the end of the last line (allowing normal down arrow to work within block)
  // We check if cursor is at the absolute end of the block content
  const isAtEndOfLastLine = useCallback((tiptapEditor: TiptapEditorRef, blockContent: string) => {
    if (!blockContent) return true; // Empty block is considered at end
    
    const cursorPos = tiptapEditor.getSelectionStart();
    const editorContentLength = tiptapEditor.getContentLength();
    
    // TipTap positions include paragraph nodes. For a paragraph, positions start at 1 (inside the <p> tag).
    // TipTap's doc.content.size includes the paragraph structure:
    // - For "see." (length 4), editorContentLength is typically 6 (positions 0-6)
    // - Valid cursor positions are 1-5 (position 1 before 's', positions 2-5 for characters, position 5 after '.')
    // - The last valid cursor position inside the text is editorContentLength - 1 = 5
    // 
    // We use editorContentLength - 1 as the source of truth since it reflects TipTap's actual document structure.
    // We compare against both this and blockContent.length + 1 to ensure accuracy.
    // The key is that cursorPos must be at or beyond the true end, not one position before.
    const expectedLastPosition = blockContent.length + 1;
    const actualLastPosition = editorContentLength - 1;
    
    // Use editorContentLength - 1 as primary check (TipTap's actual end position)
    // This should typically equal blockContent.length + 1, but using TipTap's reported length is more reliable
    // We check >= actualLastPosition to ensure we're truly at the end, not one character before
    return cursorPos >= actualLastPosition;
  }, []);

  // Check if cursor is at the start of the first line (allowing normal up arrow to work within block)
  // We check if cursor is at the absolute start of the block content
  const isAtStartOfFirstLine = useCallback((tiptapEditor: TiptapEditorRef, blockContent: string) => {
    if (!blockContent) return true; // Empty block is considered at start
    
    const cursorPos = tiptapEditor.getSelectionStart();
    
    // TipTap positions for start of paragraph are typically 1 (inside <p> tag, after opening tag)
    // Position 0 might be before the paragraph, position 1 is inside it at the start
    // If cursor is at position 0 or 1, we're at the start of the first line
    if (cursorPos <= 1) {
      return true;
    }
    
    return false;
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent, blockId: string) => {
    const block = state.document.blocks.find(b => b.id === blockId);
    if (!block) return;

    const tiptapEditor = tiptapRefs.current[blockId];
    if (!tiptapEditor) return;

    // Undo / Redo at document scope
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      if (undoStackRef.current.length > 0) {
        e.preventDefault();
        // If a block is currently active, save current state first to capture any unsaved edits
        if (editingBlockId !== null) {
          saveToUndoStack();
        }
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
      
      const tiptapEditor = tiptapRefs.current[blockId];
      if (tiptapEditor) {
        // TipTap includes paragraph node in positions; adjust to text index
        const cursorPositionTipTap = tiptapEditor.getSelectionStart();
        const cursorPosition = Math.max(0, cursorPositionTipTap - 1);
        const currentContent = block.content;
        
        // Split the text at cursor position
        const textBeforeCursor = currentContent.substring(0, cursorPosition);
        const textAfterCursor = currentContent.substring(cursorPosition);
        
        // Update current block with text before cursor and force the live editor to reflect it immediately
        updateBlockContent(blockId, textBeforeCursor);
        try {
          if (tiptapEditor.setContentSafe) {
            tiptapEditor.setContentSafe(textBeforeCursor);
          } else {
            tiptapEditor.setContent(textBeforeCursor);
          }
        } catch (_e) {
          // If imperative update fails, prop-driven update will still sync shortly
        }
        
        // Create new block with text after cursor
        const newBlock = addNewBlock(block.position + 1);
        if (textAfterCursor) {
          // Update the new block with the text after cursor
          setTimeout(() => {
            updateBlockContent(newBlock.id, textAfterCursor);
            startEditingBlock(newBlock.id, undefined);
            
            // Set cursor to beginning of new block
            const newTiptapEditor = tiptapRefs.current[newBlock.id];
            if (newTiptapEditor) {
              setTimeout(() => {
                newTiptapEditor.setSelectionRange(0, 0);
                newTiptapEditor.focus();
              }, 10);
            }
          }, 50);
        } else {
          // If no text after cursor, just start editing the new empty block
          setTimeout(() => startEditingBlock(newBlock.id, undefined), 50);
        }
      } else {
        // Fallback to original behavior if tiptap ref is not available
        const newBlock = addNewBlock(block.position + 1);
        setTimeout(() => startEditingBlock(newBlock.id, undefined), 50);
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
        setTimeout(() => startEditingBlock(prevBlock.id, undefined), 50);
      }
    }

    // Backspace at beginning of non-empty block: move text to previous block
    // BUT only if there's no text selection (let TipTap handle deletion of selections)
    const selectionStart = tiptapEditor.getSelectionStart();
    const selectionEnd = tiptapEditor.getSelectionEnd();
    const hasSelection = selectionStart !== selectionEnd;
    
    if (e.key === 'Backspace' && !hasSelection && isAtStartOfBlock(tiptapEditor, block.content) && block.content !== '' && state.document.blocks.length > 1) {
      e.preventDefault();
      saveToUndoStack();
      
      const prevBlock = state.document.blocks.find(b => b.position === block.position - 1);
      if (prevBlock) {
        // Move current block's content to the end of previous block
        const newPrevContent = prevBlock.content + block.content;
        updateBlockContent(prevBlock.id, newPrevContent);
        
        // Delete current block
        deleteBlock(blockId);
        
        // Focus on previous block and set cursor to end
        setTimeout(() => {
          startEditingBlock(prevBlock.id, undefined);
          const tiptapEditor = tiptapRefs.current[prevBlock.id];
          if (tiptapEditor) {
            // Set cursor to end of merged content
            const endPosition = newPrevContent.length;
            tiptapEditor.setSelectionRange(endPosition, endPosition);
            tiptapEditor.focus();
          }
        }, 50);
      }
    }

    // Arrow Up: move to previous block only when at start of first line or Ctrl pressed
    if (e.key === 'ArrowUp') {
      const shouldNavigateToBlock = e.ctrlKey || e.metaKey || isAtStartOfFirstLine(tiptapEditor, block.content);
      
      if (shouldNavigateToBlock) {
        e.preventDefault();
        const prevBlock = state.document.blocks.find(b => b.position === block.position - 1);
        if (prevBlock) {
          finishEditingBlock(blockId);
          // Use startEditingBlock's clickPosition parameter to set cursor to end of previous block
          // clickPosition is 0-indexed from content start, and startEditingBlock adds +1, then clamps
          // So passing content.length will result in the cursor at the end
          const endPositionInContent = prevBlock.content.length;
          setTimeout(() => {
            startEditingBlock(prevBlock.id, endPositionInContent);
          }, 50);
        } else {
          // If no previous block, allow default behavior (do nothing or move to start)
          // Don't prevent default to allow normal editor behavior
        }
      }
      // Otherwise, let TipTap handle normal line navigation within the block
    }

    // Arrow Down: move to next block only when at end of last line or Ctrl pressed
    if (e.key === 'ArrowDown') {
      const shouldNavigateToBlock = e.ctrlKey || e.metaKey || isAtEndOfLastLine(tiptapEditor, block.content);
      
      if (shouldNavigateToBlock) {
        e.preventDefault();
        const nextBlock = state.document.blocks.find(b => b.position === block.position + 1);
        if (nextBlock) {
          finishEditingBlock(blockId);
          // Use startEditingBlock's clickPosition parameter to set cursor to start of next block
          // clickPosition is 0-indexed from content start, and startEditingBlock adds +1, then clamps
          // So passing 0 will result in the cursor at the start (position 1)
          const startPositionInContent = 0;
          setTimeout(() => {
            startEditingBlock(nextBlock.id, startPositionInContent);
          }, 50);
        } else {
          // If no next block, allow default behavior (do nothing or move to end)
          // Don't prevent default to allow normal editor behavior
        }
      }
      // Otherwise, let TipTap handle normal line navigation within the block
    }

    // Arrow Right: when at end of paragraph, move to start of next paragraph
    if (e.key === 'ArrowRight') {
      const isAtEnd = isAtEndOfLastLine(tiptapEditor, block.content);
      
      if (isAtEnd) {
        e.preventDefault();
        const nextBlock = state.document.blocks.find(b => b.position === block.position + 1);
        if (nextBlock) {
          finishEditingBlock(blockId);
          // Use startEditingBlock's clickPosition parameter to set cursor to start of next block
          // clickPosition is 0-indexed from content start, and startEditingBlock adds +1, then clamps
          // So passing 0 will result in the cursor at the start (position 1)
          const startPositionInContent = 0;
          setTimeout(() => {
            startEditingBlock(nextBlock.id, startPositionInContent);
          }, 50);
        }
        // If no next block, allow default behavior (move to end)
      }
      // Otherwise, let TipTap handle normal cursor movement within the block
    }

    // Arrow Left: when at start of paragraph, move to end of previous paragraph
    if (e.key === 'ArrowLeft') {
      const isAtStart = isAtStartOfFirstLine(tiptapEditor, block.content);
      
      if (isAtStart) {
        e.preventDefault();
        const prevBlock = state.document.blocks.find(b => b.position === block.position - 1);
        if (prevBlock) {
          finishEditingBlock(blockId);
          // Use startEditingBlock's clickPosition parameter to set cursor to end of previous block
          // clickPosition is 0-indexed from content start, and startEditingBlock adds +1, then clamps
          // So passing content.length will result in the cursor at the end
          const endPositionInContent = prevBlock.content.length;
          setTimeout(() => {
            startEditingBlock(prevBlock.id, endPositionInContent);
          }, 50);
        }
        // If no previous block, allow default behavior (move left/start)
      }
      // Otherwise, let TipTap handle normal cursor movement within the block
    }
  }, [state.document.blocks, addNewBlock, deleteBlock, startEditingBlock, finishEditingBlock, selectAllEssayText, undo, redo, saveToUndoStack, isAtStartOfBlock, isAtStartOfFirstLine, isAtEndOfLastLine, editingBlockId]);

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

  // Handle full essay paste (replace all selected content)
  const handleFullEssayPaste = useCallback(async (pastedText: string) => {
    if (!pastedText.trim()) return;

    saveToUndoStack();

    // Detect if content has multiple paragraphs
    const paragraphs = detectParagraphs(pastedText);
    
    if (paragraphs.length > 1) {
      // Create multiple blocks from pasted content
      const newBlocks: DocumentBlock[] = paragraphs.map((paragraph, index) => ({
        id: crypto.randomUUID(),
        type: 'paragraph',
        content: paragraph,
        position: index,
        annotations: [],
        isImmutable: index > 0, // First block (position 0) is editable, others are immutable
        createdAt: new Date(),
        lastUserEdit: index === 0 ? undefined : new Date() // First block hasn't been edited yet
      }));

      setState(prev => ({
        ...prev,
        document: {
          ...prev.document,
          blocks: newBlocks,
          updatedAt: new Date()
        },
        pendingChanges: true
      }));

      // Focus on the first block
      setTimeout(() => {
        setEditingBlockId(newBlocks[0].id);
        const tiptapEditor = tiptapRefs.current[newBlocks[0].id];
        if (tiptapEditor) {
          tiptapEditor.focus();
          // Set cursor to end of content
          const endPosition = newBlocks[0].content.length;
          tiptapEditor.setSelectionRange(endPosition, endPosition);
        }
      }, 50);
    } else {
      // Single paragraph - replace with one block
      const newBlock: DocumentBlock = {
        id: crypto.randomUUID(),
        type: 'paragraph',
        content: pastedText,
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
          blocks: [newBlock],
          updatedAt: new Date()
        },
        pendingChanges: true
      }));

      setTimeout(() => {
        setEditingBlockId(newBlock.id);
        const tiptapEditor = tiptapRefs.current[newBlock.id];
        if (tiptapEditor) {
          tiptapEditor.focus();
          // Set cursor to end of content
          const endPosition = newBlock.content.length;
          tiptapEditor.setSelectionRange(endPosition, endPosition);
        }
      }, 50);
    }
  }, [detectParagraphs, saveToUndoStack]);

  // Handle full essay delete (backspace when all text is selected)
  const handleFullEssayDelete = useCallback(() => {
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
      const tiptapEditor = tiptapRefs.current[emptyBlock.id];
      if (tiptapEditor) tiptapEditor.focus();
    }, 50);
  }, [saveToUndoStack]);

  // Global key handling for undo/redo, full-essay cut, paste, and delete
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields or dialogs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Allow Escape to work even in input fields for closing dialogs
        if (e.key === 'Escape') {
          if (showCommentDialog) {
            e.preventDefault();
            setShowCommentDialog(false);
            setCommentDialogText('');
            setActiveSelection(null);
            activeSelectionRef.current = null;
            window.getSelection()?.removeAllRanges();
          }
        }
        return;
      }

      // Cmd/Ctrl + E: Toggle edit mode
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setFounderMode(founderMode === 'edit' ? 'comment' : 'edit');
        return;
      }

      // Cmd/Ctrl + M: Create comment for selected text (show in sidebar)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') {
        // Use ref to get latest value
        const currentSelection = activeSelectionRef.current || activeSelection;
        
        if (currentSelection && currentSelection.text.trim().length > 0) {
          e.preventDefault();
          // Set selected text and trigger focus in sidebar
          setNewCommentSelectedText(currentSelection.text);
          setFocusNewComment(true);
          // Ensure sidebar is visible - note: if sidebar is controlled by parent, 
          // we'll need to rely on parent showing it or add a callback
        }
        return;
      }

      // Escape: Close comment dialog, clear selection
      if (e.key === 'Escape') {
        if (showCommentDialog) {
          e.preventDefault();
          setShowCommentDialog(false);
          setCommentDialogText('');
          setActiveSelection(null);
          activeSelectionRef.current = null;
          window.getSelection()?.removeAllRanges();
        } else if (activeSelection) {
          e.preventDefault();
          setActiveSelection(null);
          activeSelectionRef.current = null;
          window.getSelection()?.removeAllRanges();
        }
        return;
      }

      // Undo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (undoStackRef.current.length > 0) {
          e.preventDefault();
          // If a block is currently active, save current state first to capture any unsaved edits
          const isBlockActive = editingBlockId !== null;
          if (isBlockActive) {
            saveToUndoStack();
          }
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

      // Check if all text is selected
      const selection = window.getSelection();
      const container = contentContainerRef.current;
      const isAllTextSelected = selection && container && selection.toString().trim().length > 0 && 
        normalizeText(selection.toString()) === normalizeText(getDocumentPlainText());

      // Cut entire essay after select-all
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'x') {
        if (isAllTextSelected) {
          e.preventDefault();
          handleFullEssayCut();
        }
        return;
      }

      // Paste entire essay after select-all
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
        if (isAllTextSelected) {
          e.preventDefault();
          // Get pasted text from clipboard
          navigator.clipboard.readText().then(pastedText => {
            handleFullEssayPaste(pastedText);
          }).catch(() => {
            // If clipboard access fails, just proceed with normal paste behavior
          });
        }
        return;
      }

      // Delete entire essay after select-all (backspace)
      if (e.key === 'Backspace' && isAllTextSelected) {
        e.preventDefault();
        handleFullEssayDelete();
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, getDocumentPlainText, handleFullEssayCut, handleFullEssayPaste, handleFullEssayDelete, editingBlockId, saveToUndoStack, founderMode, showCommentDialog, activeSelection]);

  // Handle "See AI Comments" button click
  const handleSeeAIComments = () => {
    // Close the loading pane
    setIsGeneratingAIComments(false);
    setLoadingStep(0);
    
    // Refresh the page to show the newly generated comments
    window.location.reload();
  };

  // Grammar features removed for Founder Portal

  // Resolve annotation (optimistic update + persist to Supabase)
  const resolveAnnotation = useCallback((annotationId: string) => {
    let annotationToResolve: Annotation | null = null;
    for (const block of state.document.blocks) {
      const match = block.annotations.find(ann => ann.id === annotationId);
      if (match) {
        annotationToResolve = match;
        break;
      }
    }

    if (!annotationToResolve) {
      toast({
        title: 'Comment not found',
        description: 'We could not locate that comment in the current document.',
        variant: 'destructive'
      });
      return;
    }

    if (annotationToResolve.author === 'mihir') {
      toast({
        title: 'Resolve not supported',
        description: 'Founder comments are managed separately and cannot be resolved here.',
        variant: 'destructive'
      });
      return;
    }

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

    // Persist to backend (AI comments only)
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

  // Delete annotation (founder comments only)
  const deleteAnnotation = useCallback(async (annotationId: string) => {
    const previousDocument = deepCloneDocument(state.document);

    // Locate annotation in current document
    let annotationToDelete: Annotation | null = null;
    for (const block of state.document.blocks) {
      const match = block.annotations.find(ann => ann.id === annotationId);
      if (match) {
        annotationToDelete = match;
        break;
      }
    }

    if (!annotationToDelete) {
      toast({
        title: 'Comment not found',
        description: 'We could not locate that comment in the current document.',
        variant: 'destructive'
      });
      return;
    }

    if (annotationToDelete.author !== 'mihir') {
      toast({
        title: 'Cannot delete AI comment',
        description: 'Founder annotations are managed separately from AI comments.',
        variant: 'destructive'
      });
      return;
    }

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

    if (!escalationId) {
      toast({
        title: 'Error',
        description: 'Cannot delete comment: Missing escalation ID.',
        variant: 'destructive'
      });
      // Revert optimistic update
      setState(prev => ({
        ...prev,
        document: previousDocument,
        pendingChanges: prev.pendingChanges
      }));
      return;
    }

    // Create updated document with annotation removed
    const updatedDocument = {
      ...state.document,
      blocks: state.document.blocks.map(block => ({
        ...block,
        annotations: block.annotations.filter(annotation => annotation.id !== annotationId)
      })),
      updatedAt: new Date()
    };

    try {
      await EscalatedEssaysService.deleteFounderComment(
        annotationId,
        escalationId,
        updatedDocument
      );
    } catch (error) {

      // Revert optimistic change on failure
      setState(prev => ({
        ...prev,
        document: previousDocument,
        pendingChanges: prev.pendingChanges
      }));

      toast({
        title: 'Failed to delete comment',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive'
      });
    }
  }, [state.document, deepCloneDocument, toast, essayId, escalationId]);

  // Update annotation (founder comments only)
  const updateAnnotation = useCallback(async (annotationId: string, updatedContent: string) => {
    console.log('[FOUNDER_UPDATE_DEBUG] updateAnnotation invoked', {
      annotationId,
      documentId: state.document.id,
      essayId,
      escalationId,
      updatedContent: updatedContent.substring(0, 50)
    });

    const previousDocument = deepCloneDocument(state.document);

    // Locate annotation in current document
    let annotationToUpdate: Annotation | null = null;
    for (const block of state.document.blocks) {
      const match = block.annotations.find(ann => ann.id === annotationId);
      if (match) {
        annotationToUpdate = match;
        break;
      }
    }

    if (!annotationToUpdate) {
      console.warn('[FOUNDER_UPDATE_DEBUG] Annotation not found in document state', {
        annotationId
      });
      toast({
        title: 'Comment not found',
        description: 'We could not locate that comment in the current document.',
        variant: 'destructive'
      });
      return;
    }

    if (annotationToUpdate.author !== 'mihir') {
      console.warn('[FOUNDER_UPDATE_DEBUG] Attempted to update non-founder annotation. Skipping.', {
        annotationId,
        author: annotationToUpdate.author
      });
      toast({
        title: 'Cannot edit AI comment',
        description: 'Founder annotations are managed separately from AI comments.',
        variant: 'destructive'
      });
      return;
    }

    console.log('[FOUNDER_UPDATE_DEBUG] Updating founder annotation in local state', {
      annotationId,
      author: annotationToUpdate.author
    });

    // Update annotation in document using semanticDocumentService
    const documentCopy = deepCloneDocument(state.document);
    const updatedAnnotation = semanticDocumentService.updateAnnotation(
      documentCopy,
      annotationId,
      { content: updatedContent }
    );

    if (!updatedAnnotation) {
      console.error('[FOUNDER_UPDATE_DEBUG] Failed to update annotation in document', {
        annotationId
      });
      toast({
        title: 'Error',
        description: 'Failed to update comment in document.',
        variant: 'destructive'
      });
      return;
    }

    setState(prev => ({
      ...prev,
      document: documentCopy,
      pendingChanges: true
    }));

    if (!escalationId) {
      console.error('[FOUNDER_UPDATE_DEBUG] Cannot update: escalationId is required', {
        annotationId
      });
      toast({
        title: 'Error',
        description: 'Cannot update comment: Missing escalation ID.',
        variant: 'destructive'
      });
      // Revert optimistic update
      setState(prev => ({
        ...prev,
        document: previousDocument,
        pendingChanges: prev.pendingChanges
      }));
      return;
    }

    // Trigger parent callback with updated document
    onDocumentChange?.(documentCopy);

    try {
      await EscalatedEssaysService.updateFounderComment(
        annotationId,
        escalationId,
        updatedContent,
        documentCopy
      );
      console.log('[FOUNDER_UPDATE_DEBUG] Founder comment updated successfully', {
        annotationId,
        escalationId
      });
      toast({
        title: 'Comment updated',
        description: 'Your comment has been updated.',
      });
    } catch (error) {
      console.error('[FOUNDER_UPDATE_DEBUG] Failed to update founder comment from backend', {
        annotationId,
        escalationId,
        error
      });

      // Revert optimistic change on failure
      setState(prev => ({
        ...prev,
        document: previousDocument,
        pendingChanges: prev.pendingChanges
      }));

      toast({
        title: 'Failed to update comment',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive'
      });
    }
  }, [state.document, deepCloneDocument, toast, essayId, escalationId, onDocumentChange]);

  // Create comment from selection (kept for backward compatibility with dialog)
  const handleCreateComment = useCallback((
    selection: typeof activeSelection,
    commentText: string
  ) => {
    if (!selection) return;

    saveToUndoStack();

    // For single-block: use block directly
    if (selection.blockIds.length === 1) {
      const blockId = selection.blockIds[0];
      const annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'> = {
        type: 'comment', // Default type
        author: 'mihir',
        content: commentText,
        targetBlockId: blockId,
        targetText: selection.text,
        resolved: false,
        metadata: {
          // Store position info for reference (using type assertion since metadata is flexible JSONB)
          ...({ position_start: selection.startOffset, position_end: selection.endOffset } as any)
        }
      };
      
      // Use service to add annotation (mutates document in place)
      const documentCopy = deepCloneDocument(state.document);
      const newAnnotation = semanticDocumentService.addAnnotation(
        documentCopy,
        annotation
      );
      
      if (newAnnotation) {
        setState(prev => ({
          ...prev,
          document: documentCopy,
          pendingChanges: true
        }));
        
        // Trigger parent callback with updated document
        onDocumentChange?.(documentCopy);
        
        toast({
          title: 'Comment added',
          description: 'Your comment has been added to the document.',
        });
      }
    } else {
      // Multi-block: use first block as anchor
      const startBlockId = selection.startBlock;
      const annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'> = {
        type: 'comment', // Default type
        author: 'mihir',
        content: commentText,
        targetBlockId: startBlockId,
        targetText: selection.text, // Full selected text
        resolved: false,
        metadata: {
          // Store multi-block info (using type assertion since metadata is flexible JSONB)
          ...({ 
            multiBlock: true, 
            blockIds: selection.blockIds, 
            position_start: selection.startOffset, 
            position_end: selection.endOffset 
          } as any)
        }
      };
      
      // Use service to add annotation (mutates document in place)
      const documentCopy = deepCloneDocument(state.document);
      const newAnnotation = semanticDocumentService.addAnnotation(
        documentCopy,
        annotation
      );
      
      if (newAnnotation) {
        setState(prev => ({
          ...prev,
          document: documentCopy,
          pendingChanges: true
        }));
        
        // Trigger parent callback with updated document
        onDocumentChange?.(documentCopy);
        
        toast({
          title: 'Comment added',
          description: 'Your comment has been added to the document.',
        });
      }
    }

    // Clear selection and UI
    setShowCommentDialog(false);
    setActiveSelection(null);
    activeSelectionRef.current = null;
    window.getSelection()?.removeAllRanges();
  }, [activeSelection, state.document, onDocumentChange, saveToUndoStack, toast]);

  // Wrapper for sidebar to add annotation (uses current activeSelection)
  const handleAnnotationAdd = useCallback((
    annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    // Use ref to get the latest activeSelection value (may have been preserved during typing)
    const currentSelection = activeSelectionRef.current;
    
    if (!currentSelection) {
      toast({
        title: 'Error',
        description: 'No text selected. Please select text and try again.',
        variant: 'destructive'
      });
      return;
    }

    // Merge annotation data with selection info
    const blockId = currentSelection.blockIds.length === 1 
      ? currentSelection.blockIds[0] 
      : currentSelection.startBlock;

    const normalizedMetadata = {
      ...(annotation.metadata || {}),
      ...(currentSelection.blockIds.length > 1 ? {
        multiBlock: true,
        blockIds: currentSelection.blockIds,
        position_start: currentSelection.startOffset,
        position_end: currentSelection.endOffset
      } : {
        position_start: currentSelection.startOffset,
        position_end: currentSelection.endOffset
      })
    } as Annotation['metadata'];

    const fullAnnotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'> = {
      ...annotation,
      type: 'comment', // Default type
      author: annotation.author || 'mihir', // Ensure author is set (founder comments should be 'mihir')
      targetBlockId: blockId,
      targetText: currentSelection.text,
      metadata: normalizedMetadata
    };

    // Ensure author is set correctly for founder comments

    saveToUndoStack();

    // Use service to add annotation (mutates document in place)
    const documentCopy = deepCloneDocument(state.document);
    const newAnnotation = semanticDocumentService.addAnnotation(
      documentCopy,
      fullAnnotation
    );
    
    if (newAnnotation) {
      setState(prev => ({
        ...prev,
        document: documentCopy,
        pendingChanges: true
      }));
      
      // Trigger parent callback with updated document
      onDocumentChange?.(documentCopy);
      
      toast({
        title: 'Comment added',
        description: 'Your comment has been added to the document.',
      });
    }

    // Clear selection and UI
    setFocusNewComment(false);
    setNewCommentSelectedText('');
    setActiveSelection(null);
    activeSelectionRef.current = null;
    window.getSelection()?.removeAllRanges();
  }, [state.document, onDocumentChange, saveToUndoStack, toast]);

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

  // Helper function to find blocks involved in a selection range
  const findBlocksInSelection = useCallback((range: Range): string[] => {
    const blockIds: string[] = [];
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    // Walk up the DOM tree to find block elements
    const findBlockId = (node: Node | null): string | null => {
      if (!node) return null;
      
      let current: Node | null = node;
      while (current && current.nodeType !== Node.DOCUMENT_NODE) {
        if (current.nodeType === Node.ELEMENT_NODE) {
          const element = current as HTMLElement;
          const blockId = element.getAttribute('data-block-id');
          if (blockId) return blockId;
        }
        current = current.parentNode;
      }
      return null;
    };

    // Get block IDs for start and end
    const startBlockId = findBlockId(startContainer);
    const endBlockId = findBlockId(endContainer);

    if (!startBlockId || !endBlockId) return [];

    // If same block, return it
    if (startBlockId === endBlockId) {
      return [startBlockId];
    }

    // For multi-block selections, find all blocks between start and end
    const sortedBlocks = [...state.document.blocks].sort((a, b) => a.position - b.position);
    const startIndex = sortedBlocks.findIndex(b => b.id === startBlockId);
    const endIndex = sortedBlocks.findIndex(b => b.id === endBlockId);

    if (startIndex === -1 || endIndex === -1) return [startBlockId];

    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);

    for (let i = minIndex; i <= maxIndex; i++) {
      blockIds.push(sortedBlocks[i].id);
    }

    return blockIds;
  }, [state.document.blocks]);

  // Helper function to calculate cross-block selection positions
  const calculateCrossBlockSelection = useCallback((range: Range, blockIds: string[]) => {
    const sortedBlocks = [...state.document.blocks].sort((a, b) => a.position - b.position);
    
    if (blockIds.length === 0) {
      return {
        startBlock: '',
        startOffset: 0,
        endBlock: '',
        endOffset: 0
      };
    }

    if (blockIds.length === 1) {
      // Single block selection
      const blockId = blockIds[0];
      const block = sortedBlocks.find(b => b.id === blockId);
      if (!block) {
        return { startBlock: blockId, startOffset: 0, endBlock: blockId, endOffset: 0 };
      }

      // Find the block element in the DOM
      const blockElement = contentContainerRef.current?.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
      if (!blockElement) {
        return { startBlock: blockId, startOffset: 0, endBlock: blockId, endOffset: 0 };
      }

      // Calculate position within the block
      const textNodes = getTextNodesIn(blockElement);
      let startOffset = 0;
      let endOffset = 0;

      const startContainer = range.startContainer;
      const endContainer = range.endContainer;

      // Calculate start offset
      for (const node of textNodes) {
        if (node === startContainer) {
          startOffset += range.startOffset;
          break;
        }
        if (node.contains(startContainer) || startContainer.contains(node)) {
          // Walk to find exact position
          const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
          let found = false;
          let tempNode;
          let tempOffset = 0;
          while ((tempNode = walker.nextNode()) && !found) {
            if (tempNode === startContainer) {
              startOffset += range.startOffset;
              found = true;
              break;
            }
            if (tempNode.nodeType === Node.TEXT_NODE) {
              tempOffset += (tempNode as Text).textContent?.length || 0;
            }
          }
          if (!found) {
            startOffset += tempOffset + (range.startOffset || 0);
          }
          break;
        }
        if (node.nodeType === Node.TEXT_NODE) {
          startOffset += (node as Text).textContent?.length || 0;
        }
      }

      // Calculate end offset
      for (const node of textNodes) {
        if (node === endContainer) {
          endOffset += range.endOffset;
          break;
        }
        if (node.contains(endContainer) || endContainer.contains(node)) {
          const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
          let found = false;
          let tempNode;
          let tempOffset = 0;
          while ((tempNode = walker.nextNode()) && !found) {
            if (tempNode === endContainer) {
              endOffset += range.endOffset;
              found = true;
              break;
            }
            if (tempNode.nodeType === Node.TEXT_NODE) {
              tempOffset += (tempNode as Text).textContent?.length || 0;
            }
          }
          if (!found) {
            endOffset += tempOffset + (range.endOffset || 0);
          }
          break;
        }
        if (node.nodeType === Node.TEXT_NODE) {
          endOffset += (node as Text).textContent?.length || 0;
        }
      }

      // Clamp offsets to block content length
      const contentLength = block.content.length;
      startOffset = Math.max(0, Math.min(startOffset, contentLength));
      endOffset = Math.max(0, Math.min(endOffset, contentLength));

      return {
        startBlock: blockId,
        startOffset,
        endBlock: blockId,
        endOffset
      };
    } else {
      // Multi-block selection
      const startBlockId = blockIds[0];
      const endBlockId = blockIds[blockIds.length - 1];

      // For multi-block, we'll use simplified position calculation
      // Start at beginning of first block, end at end of last block
      const startBlock = sortedBlocks.find(b => b.id === startBlockId);
      const endBlock = sortedBlocks.find(b => b.id === endBlockId);

      return {
        startBlock: startBlockId,
        startOffset: 0,
        endBlock: endBlockId,
        endOffset: endBlock ? endBlock.content.length : 0
      };
    }
  }, [state.document.blocks, getTextNodesIn]);

  // Keep activeSelection ref in sync
  useEffect(() => {
    activeSelectionRef.current = activeSelection;
  }, [activeSelection]);

  // Global selection listener for comment mode
  useEffect(() => {
    // Only listen for selections when not in edit mode for a block
    if (editingBlockId !== null) {
      setActiveSelection(null);
      activeSelectionRef.current = null;
      return;
    }

    const handleSelection = () => {
      // Check if user is currently typing in a textarea or input field
      // (either in the comment dialog or sidebar)
      // OR if they're interacting with buttons/controls in the comment form
      const activeElement = document.activeElement;
      const isTypingInInput = activeElement && (
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'INPUT'
      );
      
      // Also check if clicking buttons within comment form areas (dialog or sidebar)
      const isInCommentForm = activeElement && (
        activeElement.closest('[role="dialog"]') !== null ||
        activeElement.closest('.founder-comment-sidebar') !== null ||
        activeElement.closest('[data-comment-form]') !== null ||
        (activeElement.tagName === 'BUTTON' && (
          activeElement.textContent?.includes('Save Comment') ||
          activeElement.textContent?.includes('Cancel') ||
          activeElement.closest('form') !== null
        ))
      );

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        // If user is typing in an input field or interacting with comment form,
        // and we have an existing activeSelection, preserve it.
        // Otherwise, clear it.
        if ((!isTypingInInput && !isInCommentForm) || !activeSelectionRef.current) {
          setActiveSelection(null);
          activeSelectionRef.current = null;
        }
        return;
      }

      const text = selection.toString().trim();
      if (!text) {
        // If user is typing in an input field or in comment form and we have an existing activeSelection,
        // preserve it. Otherwise, clear it.
        if ((!isTypingInInput && !isInCommentForm) || !activeSelectionRef.current) {
          setActiveSelection(null);
          activeSelectionRef.current = null;
        }
        return;
      }

      const range = selection.getRangeAt(0);
      
      // Check if selection is within editor
      if (!contentContainerRef.current?.contains(range.commonAncestorContainer)) {
        // If user is typing in an input field or in comment form and we have an existing activeSelection,
        // preserve it. Otherwise, clear it.
        if ((!isTypingInInput && !isInCommentForm) || !activeSelectionRef.current) {
          setActiveSelection(null);
          activeSelectionRef.current = null;
        }
        return;
      }

      // Find blocks involved in selection
      const blockIds = findBlocksInSelection(range);
      if (blockIds.length === 0) {
        // If user is typing in an input field or in comment form and we have an existing activeSelection,
        // preserve it. Otherwise, clear it.
        if ((!isTypingInInput && !isInCommentForm) || !activeSelectionRef.current) {
          setActiveSelection(null);
          activeSelectionRef.current = null;
        }
        return;
      }

      // Calculate positions
      const selectionData = calculateCrossBlockSelection(range, blockIds);
      
      const newSelection = {
        text,
        range: range.cloneRange(),
        blockIds,
        ...selectionData
      };
      
      setActiveSelection(newSelection);
      activeSelectionRef.current = newSelection;
    };

    document.addEventListener('selectionchange', handleSelection);
    document.addEventListener('mouseup', handleSelection);
    
    return () => {
      document.removeEventListener('selectionchange', handleSelection);
      document.removeEventListener('mouseup', handleSelection);
    };
  }, [editingBlockId, findBlocksInSelection, calculateCrossBlockSelection, showCommentDialog]);

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
          title={segment.annotation.content}
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
    const isCommentMode = founderMode === 'comment';
    const isEditMode = founderMode === 'edit';

    return (
      <div
        key={block.id}
        className="relative"
        data-block-id={block.id}
      >

        {/* Block Content */}
        {isEditing ? (
          <TiptapEditor
            ref={(el) => {
              tiptapRefs.current[block.id] = el;
              if (el) {
                autoResizeTiptap(el);
              }
            }}
            content={block.content}
            onUpdate={(content) => {
              updateBlockContent(block.id, content);
              if (tiptapRefs.current[block.id]) {
                autoResizeTiptap(tiptapRefs.current[block.id]!);
              }
            }}
            onBlur={() => finishEditingBlock(block.id)}
            onKeyDown={(e) => handleKeyDown(e, block.id)}
            onPaste={(e) => handlePaste(e, block.id)}
            className="min-h-[2.5rem] resize-none border-none shadow-none focus-visible:ring-0 text-base w-full"
            style={{
              fontFamily: 'Arial, sans-serif',
              lineHeight: '1.6',
              wordWrap: 'normal',
              overflowWrap: 'normal',
              wordBreak: 'normal',
              hyphens: 'none',
              textAlign: 'justify',
            }}
            placeholder={block.position === 0 ? "Start writing here..." : ""}
          />
        ) : (
          <div 
            className={`relative ${
              isEditMode && !isEditing ? 'hover:bg-gray-50' : ''
            }`}
            data-block-id={block.id}
          >
            <div
              className={`min-h-[2.5rem] p-2 text-base w-full focus:outline-none focus:ring-0 ${
                isReadOnly()
                  ? 'cursor-not-allowed bg-gray-50 text-gray-500'
                  : isCommentMode
                  ? 'cursor-text'
                  : 'cursor-pointer'
              }`}
              data-block-id={block.id}
              style={{
                fontFamily: 'Arial, sans-serif',
                lineHeight: '1.6',
                wordWrap: 'normal',
                overflowWrap: 'normal',
                wordBreak: 'normal',
                hyphens: 'none',
                textAlign: 'justify',
                ...(isEditMode && !isEditing ? {
                  borderLeft: '2px solid transparent',
                  paddingLeft: '8px',
                  transition: 'all 0.2s'
                } : {})
              }}
              onMouseEnter={(e) => {
                if (isEditMode && !isEditing && !isReadOnly()) {
                  e.currentTarget.style.borderLeftColor = '#3b82f6';
                  e.currentTarget.style.paddingLeft = '10px';
                }
              }}
              onMouseLeave={(e) => {
                if (isEditMode && !isEditing && !isReadOnly()) {
                  e.currentTarget.style.borderLeftColor = 'transparent';
                  e.currentTarget.style.paddingLeft = '8px';
                }
              }}
              onClick={(e) => {
                if (isReadOnly()) return;
                
                if (founderMode === 'comment') {
                  // In comment mode: delay to check for selection
                  setTimeout(() => {
                    const selection = window.getSelection();
                    const hasSelection = selection && selection.toString().trim().length > 0;
                    
                    if (hasSelection) {
                      // Selection exists - comment button already shown by global listener
                      // Don't enter edit mode
                      return;
                    }
                    // No selection - do nothing (comment mode is read-only)
                  }, 50);
                } else {
                  // Edit mode - enter edit mode on click
                  const blockElement = e.currentTarget as HTMLElement;
                  const plainText = block.content;
                  
                  // First, check if there's an active text selection in this block
                  // Capture selection synchronously before any state changes
                  const selectionRange = getSelectionRangeInBlock(blockElement, plainText);
                  
                  if (selectionRange) {
                    // User has selected text - preserve the selection
                    startEditingBlock(block.id, undefined, selectionRange);
                  } else {
                    // Normal click - position cursor at click location
                    const clickPosition = calculateClickPosition(e, plainText);
                    startEditingBlock(block.id, clickPosition);
                  }
                }
              }}
              onDoubleClick={(e) => {
                if (isReadOnly()) return;
                
                // Double-click always enters edit mode
                const blockElement = e.currentTarget as HTMLElement;
                const plainText = block.content;
                const clickPosition = calculateClickPosition(e, plainText);
                startEditingBlock(block.id, clickPosition);
                
                // Optionally switch to edit mode if in comment mode
                if (founderMode === 'comment') {
                  setFounderMode('edit');
                }
              }}
              title={isReadOnly() ? 'Editor is read-only. Click "New Version" to edit.' : ''}
            >
              {block.content ? (
                renderHighlightedText(block.content, block.annotations)
              ) : (
                <span className="text-gray-400 italic">
                  {block.position === 0 ? 'Start writing here...' : ''}
                </span>
              )}
            </div>
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
    <div className={`clean-semantic-editor ${className} ${showCommentSidebar ? 'flex h-full w-full' : 'h-full w-full'} overflow-hidden`}>
      {/* Main Editor Area */}
      <div className={`${showCommentSidebar ? 'flex-1 min-w-0 pr-4 lg:pr-4 pr-0' : 'w-full'} h-full overflow-y-auto`}> 
        {/* Keyboard Shortcuts Info */}
        <div className="border-b bg-gray-50 px-4 py-2 flex justify-end">
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono shadow-sm">
                {isMac ? '⌘' : 'Ctrl'}+M
              </kbd>
              <span className="text-gray-500">New comment</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono shadow-sm">
                {isMac ? '⌘' : 'Ctrl'}+E
              </kbd>
              <span className="text-gray-500">Toggle mode</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono shadow-sm">
                {isMac ? '⌘' : 'Ctrl'}+↵
              </kbd>
              <span className="text-gray-500">Submit comment</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono shadow-sm">
                {isMac ? '⌘' : 'Ctrl'}+S
              </kbd>
              <span className="text-gray-500">Save</span>
            </div>
          </div>
        </div>
        {/* Mode Toolbar */}
        <div className="border-b bg-gray-50 px-4 py-2 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Mode:</span>
            
            <Button
              variant={founderMode === 'comment' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFounderMode('comment')}
            >
              <MessageSquare className="h-4 w-4 mr-1" />
              Comment
              {founderMode === 'comment' && <Badge variant="secondary" className="ml-1">Active</Badge>}
            </Button>
            
            <Button
              variant={founderMode === 'edit' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFounderMode('edit')}
            >
              <FileEdit className="h-4 w-4 mr-1" />
              Edit
              {founderMode === 'edit' && <Badge variant="secondary" className="ml-1">Active</Badge>}
            </Button>
          </div>

          {/* Save / Copy */}
          <div className="flex items-center gap-2 ml-auto border-l pl-4">
            {onSave && (
              <Button
                size="sm"
                variant="default"
                onClick={onSave}
                disabled={saveDisabled}
                title="Save feedback"
              >
                <Save className="h-4 w-4 mr-1" />
                {saveLabel}
              </Button>
            )}
            {onMarkReviewed && (
              <Button
                size="sm"
                variant="outline"
                onClick={onMarkReviewed}
                disabled={markReviewedDisabled}
                title="Mark as reviewed"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark as Reviewed
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={copyEssayText}
              title="Copy essay text"
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy
            </Button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="relative pl-4 lg:pl-12 pr-4 lg:pr-12 w-full" ref={contentContainerRef}>
          {/* Render all blocks */}
          {useMemo(() => {
            const sortedBlocks = [...state.document.blocks].sort((a, b) => a.position - b.position);
            return sortedBlocks.map(renderBlock);
          }, [state.document.blocks, editingBlockId, showCommentSidebar, founderMode])}

        </div>
      </div>

      {/* Comment Sidebar */}
      <div className={showCommentSidebar ? 'hidden lg:block w-96 shrink-0 border-l overflow-y-auto h-full' : 'hidden lg:hidden'}>
        <FounderCommentSidebar
          key={state.document.id}
          blocks={useMemo(() => [...state.document.blocks].sort((a, b) => a.position - b.position), [state.document.blocks])}
          documentId={state.document.id}
          onAnnotationResolve={resolveAnnotation}
          onAnnotationDelete={deleteAnnotation}
          onAnnotationUpdate={updateAnnotation}
          onAnnotationSelect={onAnnotationSelect}
          onAnnotationAdd={handleAnnotationAdd}
          onDocumentReload={reloadDocument}
          newCommentText={newCommentSelectedText}
          focusNewComment={focusNewComment}
          onNewCommentFocusComplete={() => setFocusNewComment(false)}
          selectedAnnotationId={selectedAnnotationId}
          onHideSidebar={onHideSidebar}
          className="h-full"
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

      {/* Comment Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
            <DialogDescription>
              {activeSelection && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm italic">
                  Selected text: &quot;{activeSelection.text.substring(0, 100)}
                  {activeSelection.text.length > 100 ? '...' : ''}&quot;
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="comment-text" className="text-sm font-medium">
                Comment
              </label>
              <Textarea
                id="comment-text"
                placeholder="Enter your comment..."
                value={commentDialogText}
                onChange={(e) => setCommentDialogText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    if (commentDialogText.trim()) {
                      // Use ref to get latest selection value (may have been preserved during typing)
                      const currentSelection = activeSelectionRef.current;
                      
                      if (currentSelection) {
                        handleCreateComment(currentSelection, commentDialogText.trim());
                        setCommentDialogText('');
                      } else {
                        toast({
                          title: 'Error',
                          description: 'No text selected. Please select text and try again.',
                          variant: 'destructive'
                        });
                      }
                    }
                  }
                }}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCommentDialog(false);
                setCommentDialogText('');
                setActiveSelection(null);
                activeSelectionRef.current = null;
                window.getSelection()?.removeAllRanges();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Use ref to get latest selection value (may have been preserved during typing)
                const currentSelection = activeSelectionRef.current;
                
                if (commentDialogText.trim() && currentSelection) {
                  handleCreateComment(currentSelection, commentDialogText.trim());
                  setCommentDialogText('');
                } else if (!currentSelection) {
                  toast({
                    title: 'Error',
                    description: 'No text selected. Please select text and try again.',
                    variant: 'destructive'
                  });
                }
              }}
              disabled={!commentDialogText.trim()}
            >
              Save Comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default FounderSemanticEditor;
