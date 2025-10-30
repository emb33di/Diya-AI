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

  // Refs for Tiptap editor management
  const tiptapRefs = useRef<Record<string, TiptapEditorRef | null>>({});
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
              const tiptapEditor = tiptapRefs.current[existingDoc.blocks[0].id];
              if (tiptapEditor) {
                tiptapEditor.focus();
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
    
    // TipTap positions include paragraph nodes. For a paragraph, positions are offset by ~1
    // The actual text content length in TipTap should be close to blockContent.length + 1 (for <p> tag)
    // If cursor is at or past the end of the editor's content (accounting for structure), we're at end
    // Use a small tolerance to account for paragraph node structure
    const expectedEndPos = blockContent.length + 1; // +1 for paragraph node
    
    // If cursor is at the very end of the TipTap document content
    if (cursorPos >= editorContentLength - 1) {
      return true;
    }
    
    // Also check if cursor position matches the end of the text content
    // TipTap stores text positions offset by 1 (for <p> opening tag)
    if (cursorPos >= expectedEndPos - 1) {
      return true;
    }
    
    return false;
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
          tiptapEditor.setContent(textBeforeCursor);
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
          const currentCursorPos = tiptapEditor.getSelectionStart();
          finishEditingBlock(blockId);
          setTimeout(() => {
            startEditingBlock(prevBlock.id, undefined);
            // Set cursor to end of previous block or preserve relative position
            const tiptapEditor = tiptapRefs.current[prevBlock.id];
            if (tiptapEditor) {
              const targetPosition = Math.min(currentCursorPos, prevBlock.content.length);
              tiptapEditor.setSelectionRange(targetPosition, targetPosition);
            }
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
          const currentCursorPos = tiptapEditor.getSelectionStart();
          finishEditingBlock(blockId);
          setTimeout(() => {
            startEditingBlock(nextBlock.id, undefined);
            // Set cursor to beginning of next block or preserve relative position
            const tiptapEditor = tiptapRefs.current[nextBlock.id];
            if (tiptapEditor) {
              const targetPosition = Math.min(currentCursorPos, nextBlock.content.length);
              tiptapEditor.setSelectionRange(targetPosition, targetPosition);
            }
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
          setTimeout(() => {
            startEditingBlock(nextBlock.id, undefined);
            // Set cursor to start of next block
            const tiptapEditor = tiptapRefs.current[nextBlock.id];
            if (tiptapEditor) {
              tiptapEditor.setSelectionRange(1, 1); // Position 1 is start of paragraph (after <p> tag)
            }
          }, 50);
        }
        // If no next block, allow default behavior (move to end)
      }
      // Otherwise, let TipTap handle normal cursor movement within the block
    }

    // Arrow Left: when at start or end of paragraph, move to end of previous paragraph
    if (e.key === 'ArrowLeft') {
      const isAtStart = isAtStartOfFirstLine(tiptapEditor, block.content);
      const isAtEnd = isAtEndOfLastLine(tiptapEditor, block.content);
      
      if (isAtStart || isAtEnd) {
        e.preventDefault();
        const prevBlock = state.document.blocks.find(b => b.position === block.position - 1);
        if (prevBlock) {
          finishEditingBlock(blockId);
          setTimeout(() => {
            startEditingBlock(prevBlock.id, undefined);
            // Set cursor to end of previous block
            const tiptapEditor = tiptapRefs.current[prevBlock.id];
            if (tiptapEditor) {
              const editorContentLength = tiptapEditor.getContentLength();
              // Position at the end of the content
              tiptapEditor.setSelectionRange(editorContentLength - 1, editorContentLength - 1);
            }
          }, 50);
        }
        // If no previous block, allow default behavior (move left/start)
      }
      // Otherwise, let TipTap handle normal cursor movement within the block
    }
  }, [state.document.blocks, addNewBlock, deleteBlock, startEditingBlock, finishEditingBlock, selectAllEssayText, undo, redo, saveToUndoStack, isAtStartOfBlock, isAtStartOfFirstLine, isAtEndOfLastLine]);

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
  }, [undo, redo, getDocumentPlainText, handleFullEssayCut, handleFullEssayPaste, handleFullEssayDelete]);

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
    const previousDocument = deepCloneDocument(state.document);

    // Optimistic UI update
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

    // Persist to backend
    semanticDocumentService
      .persistAnnotationDeletion(annotationId)
      .catch((error) => {
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
      });
  }, [state.document, deepCloneDocument, toast]);

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
        className="relative mb-2"
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
            }}
            placeholder={block.position === 0 ? "Start writing here..." : ""}
          />
        ) : (
          <div className="relative">
            <div
              className={`min-h-[2.5rem] p-2 text-base w-full focus:outline-none focus:ring-0 ${
                isReadOnly()
                  ? 'cursor-not-allowed bg-gray-50 text-gray-500'
                  : ''
              }`}
              style={{
                fontFamily: 'Arial, sans-serif',
                lineHeight: '1.6',
                wordWrap: 'normal',
                overflowWrap: 'normal',
                wordBreak: 'normal',
                hyphens: 'none',
              }}
              onClick={(e) => {
                if (!isReadOnly()) {
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
        {/* Editor Content */}
        <div className="relative pl-4 lg:pl-12 w-full" ref={contentContainerRef}>
          {/* Render all blocks */}
          {useMemo(() => {
            const sortedBlocks = [...state.document.blocks].sort((a, b) => a.position - b.position);
            return sortedBlocks.map(renderBlock);
          }, [state.document.blocks, editingBlockId, showCommentSidebar])}

        </div>
      </div>

      {/* Comment Sidebar */}
      <div className={showCommentSidebar ? 'hidden lg:block w-96 shrink-0 border-l overflow-y-auto h-full' : 'hidden lg:hidden'}>
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
