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
  Copy
} from 'lucide-react';

interface CleanSemanticEditorProps {
  documentId?: string;
  essayId: string;
  title: string;
  initialContent?: string;
  onDocumentChange?: (document: SemanticDocument) => void;
  onAnnotationSelect?: (annotation: Annotation | null) => void;
  onSaveStatusChange?: (isAutoSaving: boolean, lastSaved: Date | null) => void;
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
    try {
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
    } catch (error) {
      console.error('Failed to generate AI comments:', error);
    } finally {
      setIsGeneratingAIComments(false);
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
              fontFamily: 'Times New Roman',
              fontSize: '12pt',
              lineHeight: '1.6',
            }}
            placeholder={block.position === 0 ? "Start writing here..." : ""}
          />
        ) : (
          <div
            className="min-h-[2.5rem] cursor-text p-2 rounded hover:bg-gray-50 transition-colors"
            onClick={() => startEditingBlock(block.id)}
            style={{
              fontFamily: 'Times New Roman',
              fontSize: '12pt',
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

        {/* Block Annotations */}
        {block.annotations.length > 0 && (
          <div className="mt-2 space-y-2">
            {block.annotations.map(annotation => (
              <div
                key={annotation.id}
                className={`p-3 rounded-lg border-l-4 ${
                  annotation.type === 'suggestion' ? 'border-l-green-500 bg-green-50' :
                  annotation.type === 'critique' ? 'border-l-red-500 bg-red-50' :
                  annotation.type === 'praise' ? 'border-l-purple-500 bg-purple-50' :
                  annotation.type === 'question' ? 'border-l-yellow-500 bg-yellow-50' :
                  'border-l-blue-500 bg-blue-50'
                }`}
                onClick={() => onAnnotationSelect?.(annotation)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {annotation.author === 'ai' ? (
                      <Bot className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                    <Badge variant="outline" className="text-xs">
                      {annotation.type}
                    </Badge>
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
                <p className="text-sm">{annotation.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`clean-semantic-editor ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="flex items-center gap-4">
          <Button
            onClick={generateAIComments}
            disabled={isGeneratingAIComments}
            variant="outline"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {isGeneratingAIComments ? 'Generating...' : 'AI Comments'}
          </Button>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {isAutoSaving && (
              <span className="flex items-center gap-1">
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                Saving...
              </span>
            )}
            {lastSaved && (
              <span>
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </div>

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
  );
};

export default CleanSemanticEditor;
