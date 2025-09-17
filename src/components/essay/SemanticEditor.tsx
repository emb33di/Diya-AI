/**
 * Semantic Editor Component
 * 
 * A new editor built around semantic document blocks instead of fragile positions.
 * Provides Google Docs-like commenting experience with stable AI integration.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  SemanticDocument, 
  DocumentBlock, 
  Annotation, 
  AnnotationType,
  SemanticEditorState,
  SemanticEditorEvent
} from '@/types/semanticDocument';
import { semanticDocumentService } from '@/services/semanticDocumentService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  CheckCircle, 
  Circle, 
  Plus, 
  Edit3, 
  Trash2,
  Sparkles,
  User,
  Bot,
  FileText
} from 'lucide-react';

interface SemanticEditorProps {
  documentId?: string;
  essayId: string;
  title: string;
  initialContent?: string;
  onDocumentChange?: (document: SemanticDocument) => void;
  onAnnotationSelect?: (annotation: Annotation | null) => void;
  onSaveStatusChange?: (isAutoSaving: boolean, lastSaved: Date | null) => void;
  className?: string;
}

const SemanticEditor: React.FC<SemanticEditorProps> = ({
  documentId,
  essayId,
  title,
  initialContent = '',
  onDocumentChange,
  onAnnotationSelect,
  onSaveStatusChange,
  className = ''
}) => {
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
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [newCommentType, setNewCommentType] = useState<AnnotationType>('suggestion');
  const [isGeneratingAIComments, setIsGeneratingAIComments] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [editingStates, setEditingStates] = useState<Record<string, boolean>>({});
  const [cmdASelectionState, setCmdASelectionState] = useState<{
    blockId: string | null;
    hasSelectedBlock: boolean;
  }>({ blockId: null, hasSelectedBlock: false });
  
  // Multi-block selection state
  const [multiSelectState, setMultiSelectState] = useState<{
    selectedBlockIds: Set<string>;
    anchorBlockId: string | null;
    focusBlockId: string | null;
    isDragging: boolean;
    dragStartBlockId: string | null;
  }>({
    selectedBlockIds: new Set(),
    anchorBlockId: null,
    focusBlockId: null,
    isDragging: false,
    dragStartBlockId: null
  });

  // Cross-block text selection state
  const [crossBlockSelection, setCrossBlockSelection] = useState<{
    startBlockId: string | null;
    endBlockId: string | null;
    startOffset: number;
    endOffset: number;
    isActive: boolean;
  }>({
    startBlockId: null,
    endBlockId: null,
    startOffset: 0,
    endOffset: 0,
    isActive: false
  });
  
  const autosaveTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const editorRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea to fit content
  const autoResizeTextarea = useCallback((textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(textarea.scrollHeight, 24) + 'px'; // minimum 24px height
  }, []);

  // Load document on mount with localStorage fallback
  useEffect(() => {
    const loadDocument = async () => {
      console.log('Loading document with ID:', documentId);
      
      if (documentId) {
        try {
          const document = await semanticDocumentService.loadDocument(documentId);
          console.log('Loaded document from DB:', document);
          
          if (document) {
            setState(prev => ({ ...prev, document }));
            console.log('Document loaded successfully from DB');
            // Keep localStorage backup until we're sure save works
          } else {
            console.log('No document found in DB, checking localStorage...');
            // Try to load from localStorage as fallback
            const localBackup = localStorage.getItem(`semantic-doc-${documentId}`);
            if (localBackup) {
              try {
                const parsedDocument = JSON.parse(localBackup);
                setState(prev => ({ ...prev, document: parsedDocument }));
                console.log('Loaded document from localStorage fallback');
                // Try to save to DB
                await semanticDocumentService.saveDocument(parsedDocument);
                console.log('Successfully saved localStorage backup to DB');
              } catch (parseError) {
                console.error('Failed to parse localStorage backup:', parseError);
              }
            } else {
              console.log('No localStorage backup found');
            }
          }
        } catch (error) {
          console.error('Failed to load document from DB:', error);
          // Try localStorage fallback
          const localBackup = localStorage.getItem(`semantic-doc-${documentId}`);
          if (localBackup) {
            try {
              const parsedDocument = JSON.parse(localBackup);
              setState(prev => ({ ...prev, document: parsedDocument }));
              console.log('Loaded document from localStorage after DB failure');
            } catch (parseError) {
              console.error('Failed to parse localStorage backup:', parseError);
            }
          }
        }
      } else if (initialContent) {
        console.log('No documentId, converting initial content to blocks');
        // Convert initial HTML content to semantic blocks
        const blocks = semanticDocumentService.convertHtmlToBlocks(initialContent);
        setState(prev => ({
          ...prev,
          document: {
            ...prev.document,
            blocks
          }
        }));
      }
    };

    loadDocument();
  }, [documentId, initialContent]);

  // Save document when it changes - enhanced autosave
  useEffect(() => {
    if (state.pendingChanges) {
      const saveDocument = async () => {
        try {
          console.log('Saving document:', state.document.id, 'blocks:', state.document.blocks.length);
          setIsAutoSaving(true);
          await semanticDocumentService.saveDocument(state.document);
          setState(prev => ({ ...prev, pendingChanges: false }));
          setLastSaved(new Date());
          onDocumentChange?.(state.document);
          
          // Also save to localStorage as backup
          localStorage.setItem(`semantic-doc-${state.document.id}`, JSON.stringify(state.document));
          console.log('Document saved successfully to DB and localStorage');
        } catch (error) {
          console.error('Failed to save document to DB:', error);
          // If save fails, try to save to localStorage at least
          try {
            localStorage.setItem(`semantic-doc-${state.document.id}`, JSON.stringify(state.document));
            console.log('Document saved to localStorage as fallback');
          } catch (localError) {
            console.error('Failed to save to localStorage:', localError);
          }
        } finally {
          setIsAutoSaving(false);
        }
      };

      const timeoutId = setTimeout(saveDocument, 200); // Even faster autosave - 200ms
      return () => clearTimeout(timeoutId);
    }
  }, [state.document, state.pendingChanges, onDocumentChange]);

  // Auto-save function for block content
  const autoSaveBlock = useCallback(async (blockId: string, content: string) => {
    try {
      setIsAutoSaving(true);
      const updatedBlock = semanticDocumentService.updateBlock(
        state.document,
        blockId,
        { content },
        true // isUserEdit = true
      );

      if (updatedBlock) {
        setState(prev => ({
          ...prev,
          document: { ...prev.document },
          pendingChanges: true
        }));
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Failed to autosave block:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [state.document]);

  // Notify parent of save status changes
  useEffect(() => {
    onSaveStatusChange?.(isAutoSaving, lastSaved);
  }, [isAutoSaving, lastSaved, onSaveStatusChange]);

  // Cleanup and save before unload
  useEffect(() => {
    const handleBeforeUnload = async () => {
      // Save any pending changes before page unload
      if (state.pendingChanges) {
        try {
          await semanticDocumentService.saveDocument(state.document);
          localStorage.setItem(`semantic-doc-${state.document.id}`, JSON.stringify(state.document));
        } catch (error) {
          console.error('Failed to save before unload:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Clear timeouts and save before unmount
      Object.values(autosaveTimeouts.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      
      // Clear textarea refs
      textareaRefs.current = {};
      
      // Save before unmount
      if (state.pendingChanges) {
        semanticDocumentService.saveDocument(state.document).catch(console.error);
        localStorage.setItem(`semantic-doc-${state.document.id}`, JSON.stringify(state.document));
      }
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [state.pendingChanges, state.document]);

  // Handle block selection
  const handleBlockSelect = useCallback((blockId: string) => {
    setState(prev => ({
      ...prev,
      selectedBlockId: blockId,
      selectedAnnotationId: undefined
    }));
  }, []);

  // Handle annotation selection
  const handleAnnotationSelect = useCallback((annotation: Annotation | null) => {
    setState(prev => ({
      ...prev,
      selectedAnnotationId: annotation?.id
    }));
    onAnnotationSelect?.(annotation);
  }, [onAnnotationSelect]);

  // Finish editing block with auto-save
  const finishEditingBlock = useCallback(async (blockId: string) => {
    // Clear any pending autosave timeout
    if (autosaveTimeouts.current[blockId]) {
      clearTimeout(autosaveTimeouts.current[blockId]);
      delete autosaveTimeouts.current[blockId];
    }

    const block = state.document.blocks.find(b => b.id === blockId);
    if (block) {
      await autoSaveBlock(blockId, block.content);
    }
    
    setEditingBlockId(null);
    setEditingStates(prev => ({ ...prev, [blockId]: false }));
    setState(prev => ({ ...prev, isEditing: false }));
  }, [state.document.blocks, autoSaveBlock]);

  // Start editing a block
  const startEditingBlock = useCallback(async (blockId: string) => {
    // Save current block if switching
    if (editingBlockId && editingBlockId !== blockId) {
      await finishEditingBlock(editingBlockId);
    }
    
    setEditingBlockId(blockId);
    setEditingStates(prev => ({ ...prev, [blockId]: true }));
    setState(prev => ({ ...prev, isEditing: true }));
    
    // Reset Cmd+A selection state when switching blocks
    if (cmdASelectionState.blockId !== blockId) {
      setCmdASelectionState({ blockId: null, hasSelectedBlock: false });
    }
    
    // Auto-resize textarea when editing starts
    setTimeout(() => {
      if (textareaRefs.current[blockId]) {
        autoResizeTextarea(textareaRefs.current[blockId]!);
        textareaRefs.current[blockId]!.focus();
      }
    }, 0);
  }, [editingBlockId, finishEditingBlock, autoResizeTextarea, cmdASelectionState.blockId]);

  // Handle content change in block with immediate save and localStorage backup
  const handleBlockContentChange = useCallback((blockId: string, newContent: string) => {
    console.log('Block content changed:', blockId, 'new content length:', newContent.length);
    
    // Reset Cmd+A selection state when content changes
    setCmdASelectionState({ blockId: null, hasSelectedBlock: false });
    
    // Update the block content immediately
    const updatedBlock = semanticDocumentService.updateBlock(
      state.document,
      blockId,
      { content: newContent },
      true // isUserEdit = true
    );

    if (updatedBlock) {
      console.log('Block updated successfully, marking as pending changes');
      setState(prev => ({
        ...prev,
        document: { ...prev.document },
        pendingChanges: true
      }));

      // Immediate localStorage backup for better persistence
      try {
        localStorage.setItem(`semantic-doc-${state.document.id}`, JSON.stringify(state.document));
        console.log('Immediate localStorage backup saved');
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }

      // Clear existing timeout for this block
      if (autosaveTimeouts.current[blockId]) {
        clearTimeout(autosaveTimeouts.current[blockId]);
      }

      // Set new debounced autosave to DB
      autosaveTimeouts.current[blockId] = setTimeout(() => {
        console.log('Debounced autosave triggered for block:', blockId);
        autoSaveBlock(blockId, newContent);
        delete autosaveTimeouts.current[blockId];
      }, 200); // Even faster save - 200ms of inactivity
    } else {
      console.error('Failed to update block:', blockId);
    }
  }, [state.document, autoSaveBlock]);

  // Force save document
  const forceSaveDocument = useCallback(async () => {
    try {
      console.log('Force saving document...');
      setIsAutoSaving(true);
      await semanticDocumentService.saveDocument(state.document);
      setState(prev => ({ ...prev, pendingChanges: false }));
      setLastSaved(new Date());
      onDocumentChange?.(state.document);
      
      // Also save to localStorage as backup
      localStorage.setItem(`semantic-doc-${state.document.id}`, JSON.stringify(state.document));
      console.log('Force save completed successfully');
    } catch (error) {
      console.error('Force save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [state.document, onDocumentChange]);

  // Add a new block at a specific position
  const addNewBlock = useCallback((insertPosition?: number) => {
    const position = insertPosition !== undefined ? insertPosition : state.document.blocks.length;
    
    const newBlock = semanticDocumentService.addBlock(
      state.document, 
      {
        type: 'paragraph',
        content: '',
        position: position
      },
      true // isUserCreated = true
    );

    setState(prev => ({
      ...prev,
      document: { ...prev.document },
      pendingChanges: true
    }));

    // Start editing the new block immediately
    setEditingBlockId(newBlock.id);
    setEditingStates(prev => ({ ...prev, [newBlock.id]: true }));
    setState(prev => ({ ...prev, isEditing: true }));
    
    // Auto-resize and focus the new textarea with a slight delay to ensure DOM update
    setTimeout(() => {
      const textarea = textareaRefs.current[newBlock.id];
      if (textarea) {
        autoResizeTextarea(textarea);
        textarea.focus();
        // Ensure cursor is at the end
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      }
    }, 10);
  }, [state.document, autoResizeTextarea]);

  // Handle smart paste behavior - split multi-paragraph content into blocks
  const handleSmartPaste = useCallback(async (blockId: string, pastedText: string, currentPosition: number) => {
    // Split by double newlines (paragraph breaks) or single newlines followed by capital letters
    const paragraphs = pastedText
      .split(/\n\s*\n|\n(?=[A-Z])/) // Split on double newlines or newline + capital letter
      .map(p => p.trim())
      .filter(p => p.length > 0);

    // If only one paragraph or very short text, use normal paste behavior
    if (paragraphs.length <= 1 || pastedText.length < 100) {
      return false; // Let default paste behavior handle it
    }

    // Handle multi-paragraph paste: replace current block and create new blocks
    const currentBlock = state.document.blocks.find(b => b.id === blockId);
    if (!currentBlock) return false;

    // Update current block with first paragraph
    handleBlockContentChange(blockId, paragraphs[0]);

    // Create new blocks for remaining paragraphs
    for (let i = 1; i < paragraphs.length; i++) {
      const newBlock = semanticDocumentService.addBlock(
        state.document,
        {
          type: 'paragraph',
          content: paragraphs[i],
          position: currentPosition + i
        },
        true // isUserCreated = true
      );
    }

    // Update state to reflect all new blocks
    setState(prev => ({
      ...prev,
      document: { ...prev.document },
      pendingChanges: true
    }));

    return true; // Indicate we handled the paste
  }, [state.document, handleBlockContentChange]);

  // Handle smart Cmd+A behavior
  const handleSmartSelectAll = useCallback((blockId: string, textarea: HTMLTextAreaElement) => {
    const currentBlock = state.document.blocks.find(b => b.id === blockId);
    if (!currentBlock) return;

    // Check if this is the same block and we've already selected it
    if (cmdASelectionState.blockId === blockId && cmdASelectionState.hasSelectedBlock) {
      // Second Cmd+A: Create a temporary textarea with all content for selection
      const allContent = state.document.blocks
        .sort((a, b) => a.position - b.position)
        .map(block => block.content)
        .join('\n\n');
      
      // Create a temporary textarea positioned over the current one
      const tempTextarea = document.createElement('textarea');
      tempTextarea.value = allContent;
      tempTextarea.style.position = 'fixed';
      tempTextarea.style.top = '50%';
      tempTextarea.style.left = '50%';
      tempTextarea.style.transform = 'translate(-50%, -50%)';
      tempTextarea.style.width = '80%';
      tempTextarea.style.height = '60%';
      tempTextarea.style.zIndex = '9999';
      tempTextarea.style.fontSize = '12pt';
      tempTextarea.style.fontFamily = 'Times New Roman';
      tempTextarea.style.lineHeight = '1.6';
      tempTextarea.style.padding = '20px';
      tempTextarea.style.border = '2px solid #3b82f6';
      tempTextarea.style.borderRadius = '8px';
      tempTextarea.style.backgroundColor = 'white';
      tempTextarea.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
      tempTextarea.style.outline = 'none';
      
      document.body.appendChild(tempTextarea);
      tempTextarea.select();
      
      // Reset selection state
      setCmdASelectionState({ blockId: null, hasSelectedBlock: false });
      
      // Remove the temporary textarea when user clicks outside or presses Escape
      const cleanup = () => {
        if (document.body.contains(tempTextarea)) {
          document.body.removeChild(tempTextarea);
        }
        document.removeEventListener('click', cleanup);
        document.removeEventListener('keydown', handleEscape);
      };
      
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          cleanup();
        }
      };
      
      // Clean up after 5 seconds or on click outside
      setTimeout(cleanup, 5000);
      document.addEventListener('click', cleanup);
      document.addEventListener('keydown', handleEscape);
      
    } else {
      // First Cmd+A: Select current block content
      textarea.select();
      setCmdASelectionState({ blockId, hasSelectedBlock: true });
    }
  }, [state.document.blocks, cmdASelectionState]);

  // Multi-block selection helpers
  const clearSelection = useCallback(() => {
    setMultiSelectState({
      selectedBlockIds: new Set(),
      anchorBlockId: null,
      focusBlockId: null,
      isDragging: false,
      dragStartBlockId: null
    });
  }, []);

  const selectBlock = useCallback((blockId: string, extend: boolean = false) => {
    setMultiSelectState(prev => {
      if (!extend) {
        return {
          selectedBlockIds: new Set([blockId]),
          anchorBlockId: blockId,
          focusBlockId: blockId,
          isDragging: false,
          dragStartBlockId: null
        };
      }
      
      // Extend selection
      if (!prev.anchorBlockId) {
        return {
          selectedBlockIds: new Set([blockId]),
          anchorBlockId: blockId,
          focusBlockId: blockId,
          isDragging: false,
          dragStartBlockId: null
        };
      }
      
      // Select range between anchor and focus
      const blocks = state.document.blocks.sort((a, b) => a.position - b.position);
      const anchorIndex = blocks.findIndex(b => b.id === prev.anchorBlockId);
      const focusIndex = blocks.findIndex(b => b.id === blockId);
      
      const startIndex = Math.min(anchorIndex, focusIndex);
      const endIndex = Math.max(anchorIndex, focusIndex);
      
      const selectedIds = new Set<string>();
      for (let i = startIndex; i <= endIndex; i++) {
        selectedIds.add(blocks[i].id);
      }
      
      return {
        ...prev,
        selectedBlockIds: selectedIds,
        focusBlockId: blockId
      };
    });
  }, [state.document.blocks]);

  const selectRange = useCallback((startBlockId: string, endBlockId: string) => {
    const blocks = state.document.blocks.sort((a, b) => a.position - b.position);
    const startIndex = blocks.findIndex(b => b.id === startBlockId);
    const endIndex = blocks.findIndex(b => b.id === endBlockId);
    
    if (startIndex === -1 || endIndex === -1) return;
    
    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);
    
    const selectedIds = new Set<string>();
    for (let i = minIndex; i <= maxIndex; i++) {
      selectedIds.add(blocks[i].id);
    }
    
    setMultiSelectState(prev => ({
      ...prev,
      selectedBlockIds: selectedIds,
      anchorBlockId: startBlockId,
      focusBlockId: endBlockId
    }));
  }, [state.document.blocks]);

  // Delete selected blocks
  const deleteSelectedBlocks = useCallback(() => {
    if (multiSelectState.selectedBlockIds.size === 0) {
      return;
    }
    
    // Don't allow deleting all blocks
    if (multiSelectState.selectedBlockIds.size >= state.document.blocks.length) {
      return;
    }
    
    // Remove selected blocks
    const blocksToKeep = state.document.blocks.filter(
      block => !multiSelectState.selectedBlockIds.has(block.id)
    );
    
    // Update positions
    blocksToKeep.forEach((block, index) => {
      block.position = index;
    });
    
    // Update document
    state.document.blocks = blocksToKeep;
    
    setState(prev => ({
      ...prev,
      document: { ...prev.document },
      pendingChanges: true
    }));
    
    // Clear selection
    clearSelection();
    
    // If we deleted the editing block, stop editing
    if (editingBlockId && multiSelectState.selectedBlockIds.has(editingBlockId)) {
      setEditingBlockId(null);
      setState(prev => ({ ...prev, isEditing: false }));
    }
  }, [multiSelectState.selectedBlockIds, state.document.blocks, clearSelection, editingBlockId]);

  // Cross-block text selection helpers
  const clearCrossBlockSelection = useCallback(() => {
    setCrossBlockSelection({
      startBlockId: null,
      endBlockId: null,
      startOffset: 0,
      endOffset: 0,
      isActive: false
    });
  }, []);

  const deleteCrossBlockSelection = useCallback(() => {
    if (!crossBlockSelection.isActive || !crossBlockSelection.startBlockId || !crossBlockSelection.endBlockId) {
      return;
    }

    const blocks = state.document.blocks.sort((a, b) => a.position - b.position);
    const startBlockIndex = blocks.findIndex(b => b.id === crossBlockSelection.startBlockId);
    const endBlockIndex = blocks.findIndex(b => b.id === crossBlockSelection.endBlockId);

    if (startBlockIndex === -1 || endBlockIndex === -1) return;

    const startBlock = blocks[startBlockIndex];
    const endBlock = blocks[endBlockIndex];

    if (startBlockIndex === endBlockIndex) {
      // Same block - delete text within the block
      const newContent = startBlock.content.slice(0, crossBlockSelection.startOffset) + 
                        startBlock.content.slice(crossBlockSelection.endOffset);
      handleBlockContentChange(startBlock.id, newContent);
    } else {
      // Different blocks - more complex deletion
      const startContent = startBlock.content.slice(0, crossBlockSelection.startOffset);
      const endContent = endBlock.content.slice(crossBlockSelection.endOffset);
      
      // Update start block
      handleBlockContentChange(startBlock.id, startContent);
      
      // Update end block
      handleBlockContentChange(endBlock.id, endContent);
      
      // Delete blocks in between (if any)
      if (endBlockIndex - startBlockIndex > 1) {
        const blocksToDelete = blocks.slice(startBlockIndex + 1, endBlockIndex);
        const blocksToKeep = state.document.blocks.filter(block => 
          !blocksToDelete.some(b => b.id === block.id)
        );
        
        // Update positions
        blocksToKeep.forEach((block, index) => {
          block.position = index;
        });
        
        state.document.blocks = blocksToKeep;
      }
      setState(prev => ({
        ...prev,
        document: { ...prev.document },
        pendingChanges: true
      }));
    }

    clearCrossBlockSelection();
  }, [crossBlockSelection, state.document.blocks, handleBlockContentChange, clearCrossBlockSelection]);

  // Detect cross-block text selection
  const detectCrossBlockSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      clearCrossBlockSelection();
      return;
    }

    const range = selection.getRangeAt(0);
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    // Find which blocks contain the selection
    let startBlockId: string | null = null;
    let endBlockId: string | null = null;
    let startOffset = 0;
    let endOffset = 0;

    // Helper function to find block ID from DOM element
    const findBlockId = (element: Node): string | null => {
      let current = element;
      while (current && current.nodeType !== Node.DOCUMENT_NODE) {
        if (current.nodeType === Node.ELEMENT_NODE) {
          const el = current as Element;
          if (el.hasAttribute('data-block-id')) {
            return el.getAttribute('data-block-id');
          }
        }
        current = current.parentNode;
      }
      return null;
    };

    // Find start block and calculate text offset
    if (startContainer.nodeType === Node.TEXT_NODE) {
      startBlockId = findBlockId(startContainer.parentNode!);
      startOffset = range.startOffset;
    } else {
      startBlockId = findBlockId(startContainer);
      // For element nodes, try to get text content offset
      const textContent = (startContainer as Element).textContent || '';
      startOffset = Math.min(range.startOffset, textContent.length);
    }

    // Find end block and calculate text offset
    if (endContainer.nodeType === Node.TEXT_NODE) {
      endBlockId = findBlockId(endContainer.parentNode!);
      endOffset = range.endOffset;
    } else {
      endBlockId = findBlockId(endContainer);
      // For element nodes, try to get text content offset
      const textContent = (endContainer as Element).textContent || '';
      endOffset = Math.min(range.endOffset, textContent.length);
    }

    // Check if selection spans multiple blocks
    if (startBlockId && endBlockId && startBlockId !== endBlockId) {
      setCrossBlockSelection({
        startBlockId,
        endBlockId,
        startOffset,
        endOffset,
        isActive: true
      });
    } else {
      clearCrossBlockSelection();
    }
  }, [clearCrossBlockSelection]);

  // Add selection change listener
  useEffect(() => {
    const handleSelectionChange = () => {
      // Small delay to ensure selection is fully established
      setTimeout(detectCrossBlockSelection, 10);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [detectCrossBlockSelection]);

  // Keyboard navigation
  const handleKeyboardNavigation = useCallback((e: KeyboardEvent) => {
    // Only handle when not editing a block
    if (editingBlockId) {
      return;
    }
    
    // Don't interfere with text input in any textarea or input
    const target = e.target as HTMLElement;
    if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.contentEditable === 'true') {
      return;
    }
    
    // If user starts typing (letters, numbers, etc.), clear selection and start editing
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Clear multi-selection and start editing the focused block
      if (multiSelectState.focusBlockId) {
        clearSelection();
        startEditingBlock(multiSelectState.focusBlockId);
        // Let the typing continue normally
        return;
      }
    }
    
    // Only handle specific navigation keys
    if (!['ArrowUp', 'ArrowDown', 'Delete', 'Backspace', 'Escape'].includes(e.key)) {
      return;
    }
    
    const blocks = state.document.blocks.sort((a, b) => a.position - b.position);
    const currentFocusIndex = multiSelectState.focusBlockId 
      ? blocks.findIndex(b => b.id === multiSelectState.focusBlockId)
      : -1;
    
    let newFocusIndex = currentFocusIndex;
    
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        newFocusIndex = Math.max(0, currentFocusIndex - 1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        newFocusIndex = Math.min(blocks.length - 1, currentFocusIndex + 1);
        break;
      case 'Delete':
      case 'Backspace':
        // Check for cross-block text selection first
        if (crossBlockSelection.isActive) {
          e.preventDefault();
          deleteCrossBlockSelection();
          return;
        }
        // Only delete blocks if we have multiple blocks selected
        if (multiSelectState.selectedBlockIds.size > 1) {
          e.preventDefault();
          deleteSelectedBlocks();
          return;
        }
        // For single block or no selection, let normal behavior handle it
        break;
      case 'Escape':
        e.preventDefault();
        clearSelection();
        clearCrossBlockSelection();
        return;
      default:
        return;
    }
    
    if (newFocusIndex >= 0 && newFocusIndex < blocks.length) {
      const newFocusBlockId = blocks[newFocusIndex].id;
      selectBlock(newFocusBlockId, e.shiftKey);
    }
  }, [editingBlockId, state.document.blocks, multiSelectState.focusBlockId, multiSelectState.selectedBlockIds, crossBlockSelection.isActive, selectBlock, deleteSelectedBlocks, deleteCrossBlockSelection, clearSelection, clearCrossBlockSelection, startEditingBlock]);

  // Add global keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardNavigation);
    return () => document.removeEventListener('keydown', handleKeyboardNavigation);
  }, [handleKeyboardNavigation]);

  // Add global mouse up listener to end dragging
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (multiSelectState.isDragging) {
        setMultiSelectState(prev => ({
          ...prev,
          isDragging: false,
          dragStartBlockId: null
        }));
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [multiSelectState.isDragging]);

  // Add a comment to the selected block
  const addComment = useCallback(() => {
    if (state.selectedBlockId && newCommentText.trim()) {
      const annotation = semanticDocumentService.addAnnotation(state.document, {
        type: newCommentType,
        author: 'user',
        content: newCommentText.trim(),
        targetBlockId: state.selectedBlockId,
        resolved: false
      });

      if (annotation) {
        setState(prev => ({
          ...prev,
          document: { ...prev.document },
          pendingChanges: true
        }));

        setNewCommentText('');
        setState(prev => ({ ...prev, isCommenting: false }));
      }
    }
  }, [state.selectedBlockId, newCommentText, newCommentType, state.document]);

  // Generate AI comments
  const generateAIComments = useCallback(async () => {
    setIsGeneratingAIComments(true);
    
    try {
      const response = await semanticDocumentService.generateAIComments({
        documentId: state.document.id,
        blocks: state.document.blocks,
        context: {
          prompt: state.document.metadata.prompt,
          wordLimit: state.document.metadata.wordLimit
        }
      });

      if (response.success) {
        // Add AI comments to the document
        for (const semanticComment of response.comments) {
          semanticDocumentService.addAnnotation(state.document, {
            type: semanticComment.type,
            author: 'ai',
            content: semanticComment.comment,
            targetBlockId: semanticComment.targetBlockId,
            targetText: semanticComment.targetText,
            resolved: false,
            metadata: {
              confidence: semanticComment.confidence,
              ...semanticComment.metadata
            }
          });
        }

        setState(prev => ({
          ...prev,
          document: { ...prev.document },
          pendingChanges: true
        }));
      }
    } catch (error) {
      console.error('Failed to generate AI comments:', error);
    } finally {
      setIsGeneratingAIComments(false);
    }
  }, [state.document]);

  // Resolve an annotation
  const resolveAnnotation = useCallback((annotationId: string) => {
    const success = semanticDocumentService.resolveAnnotation(
      state.document,
      annotationId,
      'user' // TODO: Get actual user ID
    );

    if (success) {
      setState(prev => ({
        ...prev,
        document: { ...prev.document },
        pendingChanges: true
      }));
    }
  }, [state.document]);

  // Delete an annotation
  const deleteAnnotation = useCallback((annotationId: string) => {
    const success = semanticDocumentService.deleteAnnotation(state.document, annotationId);
    if (success) {
      setState(prev => ({
        ...prev,
        document: { ...prev.document },
        pendingChanges: true,
        selectedAnnotationId: prev.selectedAnnotationId === annotationId ? undefined : prev.selectedAnnotationId
      }));
    }
  }, [state.document]);

  // Render a block
  const renderBlock = (block: DocumentBlock) => {
    const isSelected = state.selectedBlockId === block.id;
    const isEditing = editingBlockId === block.id;
    const isImmutable = block.isImmutable ?? false;
    const isMultiSelected = multiSelectState.selectedBlockIds.has(block.id);
    const isFocused = multiSelectState.focusBlockId === block.id;

    return (
      <div
        key={block.id}
        data-block-id={block.id}
        className={`relative transition-all duration-150 ${
          isMultiSelected 
            ? 'bg-blue-100 border-l-4 border-blue-500 pl-4 ml-2' 
            : isFocused 
              ? 'bg-blue-50 border-l-2 border-blue-300 pl-2 ml-1'
              : ''
        }`}
        onMouseDown={(e) => {
          if (isEditing) return;
          
          e.preventDefault();
          const isShiftClick = e.shiftKey;
          const isCtrlClick = e.ctrlKey || e.metaKey;
          
          if (isShiftClick && multiSelectState.anchorBlockId) {
            // Shift+click: extend selection
            selectRange(multiSelectState.anchorBlockId, block.id);
          } else if (isCtrlClick) {
            // Ctrl+click: toggle individual block
            if (multiSelectState.selectedBlockIds.has(block.id)) {
              const newSelection = new Set(multiSelectState.selectedBlockIds);
              newSelection.delete(block.id);
              setMultiSelectState(prev => ({
                ...prev,
                selectedBlockIds: newSelection,
                focusBlockId: block.id
              }));
            } else {
              selectBlock(block.id, true);
            }
          } else {
            // Regular click: start new selection and prepare for drag
            selectBlock(block.id, false);
            setMultiSelectState(prev => ({
              ...prev,
              isDragging: true,
              dragStartBlockId: block.id
            }));
          }
        }}
        onMouseEnter={(e) => {
          if (multiSelectState.isDragging && multiSelectState.dragStartBlockId) {
            // Extend selection during drag
            selectRange(multiSelectState.dragStartBlockId, block.id);
          }
        }}
        onMouseUp={() => {
          if (multiSelectState.isDragging) {
            setMultiSelectState(prev => ({
              ...prev,
              isDragging: false,
              dragStartBlockId: null
            }));
          }
        }}
      >
        {/* Block Content - Seamless essay-like appearance */}
        {isEditing ? (
          <textarea
            ref={(el) => {
              textareaRefs.current[block.id] = el;
              if (el) {
                autoResizeTextarea(el);
              }
            }}
            className="w-full resize-none border-none outline-none bg-transparent"
            value={block.content}
            onChange={(e) => {
              handleBlockContentChange(block.id, e.target.value);
              // Auto-resize on content change
              if (textareaRefs.current[block.id]) {
                autoResizeTextarea(textareaRefs.current[block.id]!);
              }
            }}
            onBlur={() => {
              finishEditingBlock(block.id);
            }}
            onPaste={async (e) => {
              const pastedText = e.clipboardData.getData('text/plain');
              if (pastedText.trim()) {
                const handled = await handleSmartPaste(block.id, pastedText, block.position);
                if (handled) {
                  e.preventDefault(); // Prevent default paste if we handled it
                }
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                finishEditingBlock(block.id);
              }
              // Handle Cmd+A (or Ctrl+A on Windows/Linux) for smart select all
              if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
                e.preventDefault();
                handleSmartSelectAll(block.id, e.currentTarget);
              }
              // Handle Enter key to create new block
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // Save current block content first
                const currentContent = e.currentTarget.value;
                handleBlockContentChange(block.id, currentContent);
                
                // Create new block at the next position (current block position + 1)
                addNewBlock(block.position + 1);
              }
            }}
            autoFocus
            style={{ 
              fontFamily: 'Times New Roman', 
              fontSize: '12pt',
              lineHeight: '1.6',
              minHeight: '1.5em',
              marginBottom: '1em',
              padding: '0',
              direction: 'ltr',
              textAlign: 'left'
            }}
            placeholder={block.position === 0 ? "Start writing here..." : ""}
          />
        ) : (
          <div 
            data-block-id={block.id}
            className="prose max-w-none min-h-[1.5em] cursor-text transition-colors duration-150 hover:bg-gray-50"
            onClick={(e) => {
              // Don't start editing if we're in multi-select mode
              if (multiSelectState.selectedBlockIds.size > 0) {
                e.stopPropagation();
                return;
              }
              startEditingBlock(block.id);
            }}
            style={{ 
              fontFamily: 'Times New Roman', 
              fontSize: '12pt',
              lineHeight: '1.6',
              marginBottom: '1em',
              padding: '0',
              direction: 'ltr',
              textAlign: 'left',
              whiteSpace: 'pre-wrap'
            }}
          >
            {block.content || (block.position === 0 ? <span className="text-gray-400">Start writing here...</span> : "")}
          </div>
        )}

        {/* Annotations */}
        {block.annotations.length > 0 && (
          <div className="mt-3 space-y-2">
            {block.annotations.map((annotation) => (
              <div
                key={annotation.id}
                className={`p-3 rounded-lg border-l-4 ${
                  // Use agent type for color coding if available, otherwise fall back to comment type
                  annotation.metadata?.agentType === 'tone' ? 'border-l-orange-500 bg-orange-50' :
                  annotation.metadata?.agentType === 'clarity' ? 'border-l-blue-500 bg-blue-50' :
                  annotation.metadata?.agentType === 'strengths' ? 'border-l-green-500 bg-green-50' :
                  annotation.metadata?.agentType === 'weaknesses' ? 'border-l-red-500 bg-red-50' :
                  annotation.type === 'suggestion' ? 'border-l-green-500 bg-green-50' :
                  annotation.type === 'critique' ? 'border-l-red-500 bg-red-50' :
                  annotation.type === 'praise' ? 'border-l-purple-500 bg-purple-50' :
                  annotation.type === 'question' ? 'border-l-yellow-500 bg-yellow-50' :
                  'border-l-blue-500 bg-blue-50'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAnnotationSelect(annotation);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {annotation.author === 'ai' ? (
                      <Bot className="h-4 w-4 text-blue-600" />
                    ) : (
                      <User className="h-4 w-4 text-gray-600" />
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {annotation.type}
                    </Badge>
                    {annotation.metadata?.agentType && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          annotation.metadata.agentType === 'tone' ? 'border-orange-300 text-orange-700' :
                          annotation.metadata.agentType === 'clarity' ? 'border-blue-300 text-blue-700' :
                          annotation.metadata.agentType === 'strengths' ? 'border-green-300 text-green-700' :
                          annotation.metadata.agentType === 'weaknesses' ? 'border-red-300 text-red-700' :
                          'border-gray-300 text-gray-700'
                        }`}
                      >
                        {annotation.metadata.agentType}
                      </Badge>
                    )}
                    {annotation.resolved && (
                      <Badge variant="outline" className="text-xs">
                        Resolved
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {!annotation.resolved && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          resolveAnnotation(annotation.id);
                        }}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAnnotation(annotation.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <p className="mt-2 text-sm">{annotation.content}</p>
                
                {annotation.targetText && (
                  <div className="mt-2 p-2 bg-white rounded border text-xs text-gray-600">
                    <strong>Target:</strong> "{annotation.targetText}"
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    );
  };

  return (
    <div className={`semantic-editor ${className}`} ref={editorRef}>
      {/* Essay Page Backdrop */}
      <div className="bg-white min-h-[600px] relative">
        {/* Page Header */}
        <div className="border-b border-gray-100 p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {state.pendingChanges ? 'Unsaved changes' : 'All changes saved'}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={forceSaveDocument}
                disabled={isAutoSaving}
                size="sm"
                variant="outline"
              >
                {isAutoSaving ? 'Saving...' : 'Save Now'}
              </Button>
              <Button
                onClick={generateAIComments}
                disabled={isGeneratingAIComments || state.document.blocks.length === 0}
                size="sm"
                variant="outline"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isGeneratingAIComments ? 'Generating..' : 'AI Comments'}
              </Button>
            </div>
          </div>
        </div>

        {/* Essay Content Area - Seamless essay appearance */}
        <div className="p-8 max-w-4xl mx-auto">
          <div className="essay-content" style={{ 
            fontFamily: 'Times New Roman', 
            fontSize: '12pt', 
            lineHeight: '1.6',
            color: '#1a1a1a'
          }}>
            {/* Always show at least one block - Google Docs style */}
            {state.document.blocks.length === 0 ? (
              // Show empty block with cursor when no content exists
              <div 
                className="prose max-w-none min-h-[1.5em] cursor-text transition-colors duration-150 hover:bg-gray-50"
                onClick={() => {
                  addNewBlock();
                }}
                style={{ 
                  fontFamily: 'Times New Roman', 
                  fontSize: '12pt',
                  lineHeight: '1.6',
                  marginBottom: '1em',
                  padding: '0',
                  direction: 'ltr',
                  textAlign: 'left',
                  whiteSpace: 'pre-wrap',
                  position: 'relative'
                }}
              >
                {/* Cursor indicator */}
                <span className="inline-block w-0.5 h-5 bg-gray-400 animate-pulse mr-1"></span>
                <span className="text-gray-400">Start writing...</span>
              </div>
            ) : (
              <>
                {/* Seamless block rendering */}
                {state.document.blocks
                  .sort((a, b) => a.position - b.position)
                  .map((block, index) => renderBlock(block))}
                
                {/* Invisible add block area - click anywhere at the end to add */}
                <div 
                  className="min-h-[3em] cursor-text hover:bg-gray-50 transition-colors duration-150 rounded"
                  onClick={() => addNewBlock()}
                  style={{
                    fontFamily: 'Times New Roman',
                    fontSize: '12pt',
                    lineHeight: '1.6'
                  }}
                >
                  {/* Invisible placeholder for new content */}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default SemanticEditor;
