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
import AICommentsLoadingPane, { AI_COMMENTS_LOADING_STEPS } from './AICommentsLoadingPane';
import GrammarLoadingPane, { GRAMMAR_LOADING_STEPS } from './GrammarLoadingPane';
import CommentSidebar from './CommentSidebar';

interface CleanSemanticEditorProps {
  documentId?: string;
  essayId: string;
  title: string;
  initialContent?: string;
  onDocumentChange?: (document: SemanticDocument) => void;
  onAnnotationSelect?: (annotation: Annotation | null) => void;
  onSaveStatusChange?: (isAutoSaving: boolean, lastSaved: Date | null) => void;
  showCommentSidebar?: boolean;
  selectedAnnotationId?: string;
  className?: string;
}

const CleanSemanticEditor: React.FC<CleanSemanticEditorProps> = ({
  documentId,
  essayId,
  title,
  initialContent = '',
  onDocumentChange,
  onAnnotationSelect,
  onSaveStatusChange,
  showCommentSidebar = false,
  selectedAnnotationId,
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
      isImmutable: true,
      createdAt: new Date(),
      lastUserEdit: new Date()
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

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent, blockId: string) => {
    const block = state.document.blocks.find(b => b.id === blockId);
    if (!block) return;

    // Enter key: create new block
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const newBlock = addNewBlock(block.position + 1);
      setTimeout(() => startEditingBlock(newBlock.id), 50);
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
      // Simulate loading steps
      const stepDurations = [1000, 2000, 1500, 500]; // Duration for each step in ms
      
      // Step through each loading phase
      for (let i = 0; i < AI_COMMENTS_LOADING_STEPS.length; i++) {
        setLoadingStep(i);
        await new Promise(resolve => setTimeout(resolve, stepDurations[i]));
      }

      const response = await semanticDocumentService.generateAIComments({
        documentId: state.document.id,
        blocks: state.document.blocks,
        context: {
          prompt: state.document.metadata.prompt,
          wordLimit: state.document.metadata.wordLimit
        }
      });

      if (response.success && response.comments.length > 0) {
        // Add the AI comments as annotations to the appropriate blocks
        setState(prev => {
          const updatedBlocks = prev.document.blocks.map(block => {
            const blockComments = response.comments.filter(c => c.targetBlockId === block.id);
            // Convert SemanticComment to Annotation format
            const annotations = blockComments.map(comment => ({
              id: crypto.randomUUID(),
              type: comment.type,
              author: 'ai' as const,
              content: comment.comment,
              targetBlockId: comment.targetBlockId,
              targetText: comment.targetText,
              createdAt: new Date(),
              updatedAt: new Date(),
              resolved: false,
              metadata: comment.metadata
            }));
            return {
              ...block,
              annotations: [...block.annotations, ...annotations]
            };
          });

          return {
            ...prev,
            document: {
              ...prev.document,
              blocks: updatedBlocks,
              updatedAt: new Date()
            },
            pendingChanges: true
          };
        });
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
      // Simulate loading steps
      const stepDurations = [800, 1200, 600]; // Duration for each step in ms
      
      // Step through each loading phase
      for (let i = 0; i < GRAMMAR_LOADING_STEPS.length; i++) {
        setGrammarLoadingStep(i);
        await new Promise(resolve => setTimeout(resolve, stepDurations[i]));
      }

      const response = await semanticDocumentService.generateGrammarComments({
        documentId: state.document.id,
        blocks: state.document.blocks,
        context: {
          prompt: state.document.metadata.prompt,
          wordLimit: state.document.metadata.wordLimit
        }
      });

      if (response.success && response.comments.length > 0) {
        // Add the grammar comments as annotations to the appropriate blocks
        setState(prev => {
          const updatedBlocks = prev.document.blocks.map(block => {
            const blockComments = response.comments.filter(c => c.targetBlockId === block.id);
            // Convert SemanticComment to Annotation format
            const annotations = blockComments.map(comment => ({
              id: crypto.randomUUID(),
              type: comment.type,
              author: 'ai' as const,
              content: comment.comment,
              targetBlockId: comment.targetBlockId,
              targetText: comment.targetText,
              createdAt: new Date(),
              updatedAt: new Date(),
              resolved: false,
              metadata: comment.metadata
            }));
            return {
              ...block,
              annotations: [...block.annotations, ...annotations]
            };
          });

          return {
            ...prev,
            document: {
              ...prev.document,
              blocks: updatedBlocks,
              updatedAt: new Date()
            },
            pendingChanges: true
          };
        });
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
            className="min-h-[2.5rem] resize-none border-none shadow-none focus-visible:ring-1 focus-visible:ring-blue-500"
            style={{
              fontFamily: 'Times New Roman, serif',
              fontSize: '16px',
              lineHeight: '1.6',
            }}
            placeholder={block.position === 0 ? "Start writing here..." : ""}
          />
        ) : (
          <div
            className="min-h-[2.5rem] cursor-text p-2 rounded hover:bg-gray-50 transition-colors"
            onClick={() => startEditingBlock(block.id)}
            style={{
              fontFamily: 'Times New Roman, serif',
              fontSize: '16px',
              lineHeight: '1.6',
            }}
          >
            {block.content || (
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
    <div className={`clean-semantic-editor ${className} ${showCommentSidebar ? 'flex' : ''}`}>
      {/* Main Editor Area */}
      <div className={`${showCommentSidebar ? 'flex-1 pr-6' : 'w-full'}`}>
        {/* Editor Content */}
        <div className="relative pl-12">
          {state.document.blocks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No content yet. Start writing!</p>
              <Button onClick={() => addNewBlock()}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Block
              </Button>
            </div>
          ) : (
            <>
              {/* Render all blocks */}
              {state.document.blocks
                .sort((a, b) => a.position - b.position)
                .map(renderBlock)}

              {/* Add new block at the end */}
              <div className="mt-4">
                <Button
                  variant="ghost"
                  onClick={() => addNewBlock()}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add new paragraph
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Status Bar */}
        <div className="mt-6 pt-4 border-t text-sm text-gray-500 flex justify-between">
          <span>{state.document.blocks.length} blocks</span>
          <span>
            {state.document.blocks.reduce((total, block) => total + block.content.split(' ').filter(w => w.length > 0).length, 0)} words
          </span>
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
        onComplete={() => {
          setIsGeneratingGrammar(false);
          setGrammarLoadingStep(0);
        }}
      />
    </div>
  );
};

export default CleanSemanticEditor;
