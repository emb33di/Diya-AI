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

      const timeoutId = setTimeout(saveDocument, 500); // Faster autosave - 500ms
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
    
    // Auto-resize textarea when editing starts
    setTimeout(() => {
      if (textareaRefs.current[blockId]) {
        autoResizeTextarea(textareaRefs.current[blockId]!);
        textareaRefs.current[blockId]!.focus();
      }
    }, 0);
  }, [editingBlockId, finishEditingBlock, autoResizeTextarea]);

  // Handle content change in block with immediate save and localStorage backup
  const handleBlockContentChange = useCallback((blockId: string, newContent: string) => {
    console.log('Block content changed:', blockId, 'new content length:', newContent.length);
    
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
      }, 500); // Faster save - 500ms of inactivity
    } else {
      console.error('Failed to update block:', blockId);
    }
  }, [state.document, autoSaveBlock]);

  // Add a new block
  const addNewBlock = useCallback(() => {
    const newBlock = semanticDocumentService.addBlock(
      state.document, 
      {
        type: 'paragraph',
        content: '',
        position: state.document.blocks.length
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
    
    // Auto-resize and focus the new textarea
    setTimeout(() => {
      if (textareaRefs.current[newBlock.id]) {
        autoResizeTextarea(textareaRefs.current[newBlock.id]!);
        textareaRefs.current[newBlock.id]!.focus();
      }
    }, 0);
  }, [state.document, autoResizeTextarea]);


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

    return (
      <div
        key={block.id}
        className="relative"
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
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                finishEditingBlock(block.id);
              }
              // Handle Enter key to create new block
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                finishEditingBlock(block.id);
                addNewBlock();
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
            placeholder="Start writing here..."
          />
        ) : (
          <div 
            className="prose max-w-none min-h-[1.5em] cursor-text transition-colors duration-150 hover:bg-gray-50"
            onClick={() => {
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
            {block.content || 'Start writing here...'}
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
          <div className="flex items-center justify-end">
            <div className="flex gap-2">
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
                  onClick={addNewBlock}
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
