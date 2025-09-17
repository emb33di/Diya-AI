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
  Bot
} from 'lucide-react';

interface SemanticEditorProps {
  documentId?: string;
  essayId: string;
  title: string;
  initialContent?: string;
  onDocumentChange?: (document: SemanticDocument) => void;
  onAnnotationSelect?: (annotation: Annotation | null) => void;
  className?: string;
}

const SemanticEditor: React.FC<SemanticEditorProps> = ({
  documentId,
  essayId,
  title,
  initialContent = '',
  onDocumentChange,
  onAnnotationSelect,
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
  const [editingContent, setEditingContent] = useState<string>('');
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [newCommentType, setNewCommentType] = useState<AnnotationType>('suggestion');
  const [isGeneratingAIComments, setIsGeneratingAIComments] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  // Load document on mount
  useEffect(() => {
    const loadDocument = async () => {
      if (documentId) {
        const document = await semanticDocumentService.loadDocument(documentId);
        if (document) {
          setState(prev => ({ ...prev, document }));
        }
      } else if (initialContent) {
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

  // Save document when it changes
  useEffect(() => {
    if (state.pendingChanges) {
      const saveDocument = async () => {
        try {
          await semanticDocumentService.saveDocument(state.document);
          setState(prev => ({ ...prev, pendingChanges: false }));
          onDocumentChange?.(state.document);
        } catch (error) {
          console.error('Failed to save document:', error);
        }
      };

      const timeoutId = setTimeout(saveDocument, 1000); // Debounce saves
      return () => clearTimeout(timeoutId);
    }
  }, [state.document, state.pendingChanges, onDocumentChange]);

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

  // Start editing a block
  const startEditingBlock = useCallback((blockId: string) => {
    const block = state.document.blocks.find(b => b.id === blockId);
    if (block) {
      setEditingBlockId(blockId);
      setEditingContent(block.content);
      setState(prev => ({ ...prev, isEditing: true }));
    }
  }, [state.document.blocks]);

  // Save block edits
  const saveBlockEdit = useCallback(() => {
    if (editingBlockId) {
      const updatedBlock = semanticDocumentService.updateBlock(
        state.document,
        editingBlockId,
        { content: editingContent }
      );

      if (updatedBlock) {
        setState(prev => ({
          ...prev,
          document: { ...prev.document },
          pendingChanges: true
        }));
      }

      setEditingBlockId(null);
      setEditingContent('');
      setState(prev => ({ ...prev, isEditing: false }));
    }
  }, [editingBlockId, editingContent, state.document]);

  // Cancel block editing
  const cancelBlockEdit = useCallback(() => {
    setEditingBlockId(null);
    setEditingContent('');
    setState(prev => ({ ...prev, isEditing: false }));
  }, []);

  // Add a new block
  const addNewBlock = useCallback(() => {
    const newBlock = semanticDocumentService.addBlock(state.document, {
      type: 'paragraph',
      content: '',
      position: state.document.blocks.length
    });

    setState(prev => ({
      ...prev,
      document: { ...prev.document },
      pendingChanges: true
    }));

    // Start editing the new block immediately
    setEditingBlockId(newBlock.id);
    setEditingContent('');
    setState(prev => ({ ...prev, isEditing: true }));
  }, [state.document]);

  // Delete a block
  const deleteBlock = useCallback((blockId: string) => {
    const success = semanticDocumentService.deleteBlock(state.document, blockId);
    if (success) {
      setState(prev => ({
        ...prev,
        document: { ...prev.document },
        pendingChanges: true,
        selectedBlockId: prev.selectedBlockId === blockId ? undefined : prev.selectedBlockId
      }));
    }
  }, [state.document]);

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

    return (
      <div
        key={block.id}
        className={`group relative mb-4 p-4 rounded-lg border transition-all ${
          isSelected 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => handleBlockSelect(block.id)}
      >
        {/* Block Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {block.type}
            </Badge>
            <span className="text-sm text-gray-500">
              {block.content.length} chars
            </span>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                startEditingBlock(block.id);
              }}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                deleteBlock(block.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Block Content */}
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              className="min-h-[100px]"
              placeholder="Enter block content..."
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={saveBlockEdit}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={cancelBlockEdit}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="prose max-w-none">
            {block.content || (
              <span className="text-gray-400 italic">Empty block - click edit to add content</span>
            )}
          </div>
        )}

        {/* Annotations */}
        {block.annotations.length > 0 && (
          <div className="mt-3 space-y-2">
            {block.annotations.map((annotation) => (
              <div
                key={annotation.id}
                className={`p-3 rounded-lg border-l-4 ${
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

        {/* Add Comment Button */}
        {isSelected && !state.isCommenting && (
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                setState(prev => ({ ...prev, isCommenting: true }));
              }}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Add Comment
            </Button>
          </div>
        )}

        {/* Comment Input */}
        {isSelected && state.isCommenting && (
          <div className="mt-3 p-3 border rounded-lg bg-gray-50">
            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  value={newCommentType}
                  onChange={(e) => setNewCommentType(e.target.value as AnnotationType)}
                  className="px-3 py-1 border rounded text-sm"
                >
                  <option value="suggestion">Suggestion</option>
                  <option value="critique">Critique</option>
                  <option value="praise">Praise</option>
                  <option value="question">Question</option>
                  <option value="comment">Comment</option>
                </select>
              </div>
              
              <Textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Enter your comment..."
                className="min-h-[80px]"
              />
              
              <div className="flex gap-2">
                <Button size="sm" onClick={addComment}>
                  Add Comment
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setState(prev => ({ ...prev, isCommenting: false }))}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`semantic-editor ${className}`} ref={editorRef}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{state.document.title}</h2>
            <p className="text-sm text-gray-500">
              {state.document.blocks.length} blocks • {state.pendingChanges ? 'Unsaved changes' : 'Saved'}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={addNewBlock}
              disabled={state.isEditing}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Block
            </Button>
            
            <Button
              onClick={generateAIComments}
              disabled={isGeneratingAIComments || state.document.blocks.length === 0}
              variant="outline"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isGeneratingAIComments ? 'Generating...' : 'AI Comments'}
            </Button>
          </div>
        </div>
      </div>

      {/* Document Blocks */}
      <div className="space-y-4">
        {state.document.blocks.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 mb-4">No blocks yet. Add your first block to get started.</p>
              <Button onClick={addNewBlock}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Block
              </Button>
            </CardContent>
          </Card>
        ) : (
          state.document.blocks
            .sort((a, b) => a.position - b.position)
            .map(renderBlock)
        )}
      </div>

      {/* Statistics */}
      {state.document.blocks.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Document Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium">Total Blocks</div>
                <div className="text-gray-500">{state.document.blocks.length}</div>
              </div>
              <div>
                <div className="font-medium">Total Comments</div>
                <div className="text-gray-500">
                  {semanticDocumentService.getAllAnnotations(state.document).length}
                </div>
              </div>
              <div>
                <div className="font-medium">AI Comments</div>
                <div className="text-gray-500">
                  {semanticDocumentService.getAllAnnotations(state.document)
                    .filter(a => a.author === 'ai').length}
                </div>
              </div>
              <div>
                <div className="font-medium">Resolved</div>
                <div className="text-gray-500">
                  {semanticDocumentService.getAllAnnotations(state.document)
                    .filter(a => a.resolved).length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SemanticEditor;
