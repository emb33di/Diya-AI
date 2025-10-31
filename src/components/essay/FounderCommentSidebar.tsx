/**
 * Founder Comment Sidebar - Grammar-free version for Founder Portal
 * 
 * A duplicate of CommentSidebar but without grammar category support.
 * This ensures changes to Founder Portal don't affect the user-facing editor.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Annotation, 
  DocumentBlock, 
  CommentCategory 
} from '@/types/semanticDocument';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  CheckCircle, 
  User, 
  Bot, 
  Trash2,
  ChevronDown,
  ChevronRight,
  Volume2,
  Eye,
  Star,
  TrendingUp,
  FileText,
  Target,
  SidebarClose
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

// Grammar-free comment categories for Founder Portal
type FounderCommentCategory = Exclude<CommentCategory, 'grammar'>;

interface FounderCommentSidebarProps {
  blocks: DocumentBlock[];
  documentId?: string;
  onAnnotationResolve?: (annotationId: string) => void;
  onAnnotationDelete?: (annotationId: string) => void;
  onAnnotationSelect?: (annotation: Annotation | null) => void;
  onAnnotationAdd?: (annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>) => void;
  selectedAnnotationId?: string;
  onHideSidebar?: () => void;
  onDocumentReload?: () => Promise<void>;
  className?: string;
  // For new comment creation
  newCommentText?: string; // Pre-filled selected text
  focusNewComment?: boolean; // Trigger focus on new comment box
  onNewCommentFocusComplete?: () => void; // Callback when focus is complete
}

interface GroupedComment {
  annotation: Annotation;
  blockIndex: number;
  blockContent: string;
}

const FounderCommentSidebar: React.FC<FounderCommentSidebarProps> = ({
  blocks,
  documentId,
  onAnnotationResolve,
  onAnnotationDelete,
  onAnnotationSelect,
  onAnnotationAdd,
  selectedAnnotationId,
  onHideSidebar,
  onDocumentReload,
  className,
  newCommentText: initialNewCommentText,
  focusNewComment,
  onNewCommentFocusComplete
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<FounderCommentCategory>>(
    new Set(['overall-analysis', 'tone', 'clarity', 'strengths', 'areas-for-improvement', 'paragraph-quality'])
  );
  const [activeTab, setActiveTab] = useState<'all' | 'unresolved'>('unresolved');
  const [showNewComment, setShowNewComment] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentSelectedText, setNewCommentSelectedText] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const newCommentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Determine comment category - excludes grammar
  const determineCommentCategory = (annotation: Annotation): FounderCommentCategory => {
    // Filter out grammar annotations
    if (annotation.metadata?.agentType === 'grammar') {
      return 'clarity'; // Default fallback, but these should be filtered out
    }

    // Use explicit category if set (and not grammar)
    const rawCategory = annotation.metadata?.commentCategory;
    if (rawCategory && rawCategory !== 'grammar') {
      return rawCategory as FounderCommentCategory;
    }

    // Infer from agent type
    if (annotation.metadata?.agentType) {
      switch (annotation.metadata.agentType) {
        case 'tone':
          return 'tone';
        case 'clarity':
          return 'clarity';
        case 'strengths':
          return 'strengths';
        case 'weaknesses':
          return 'areas-for-improvement';
        case 'paragraph':
          return 'paragraph-quality';
        case 'big-picture':
          return 'overall-analysis';
        default:
          break;
      }
    }

    // Infer from annotation type
    switch (annotation.type) {
      case 'praise':
        return 'strengths';
      case 'critique':
        return 'areas-for-improvement';
      case 'suggestion':
        return 'areas-for-improvement';
      default:
        return 'clarity'; // Default fallback
    }
  };

  // Group comments by category (excluding grammar)
  const groupedComments = useMemo(() => {
    const allComments: GroupedComment[] = [];
    
    blocks.forEach((block, blockIndex) => {
      block.annotations?.forEach(annotation => {
        // Skip grammar annotations entirely
        if (annotation.metadata?.agentType === 'grammar' || annotation.metadata?.commentCategory === 'grammar') {
          return;
        }
        
        // Skip resolved comments if we're only showing unresolved
        if (activeTab === 'unresolved' && annotation.resolved) return;
        
        allComments.push({
          annotation,
          blockIndex,
          blockContent: block.content
        });
      });
    });

    // Group by category (excluding grammar)
    const grouped: Record<FounderCommentCategory, GroupedComment[]> = {
      'overall-analysis': [],
      'tone': [],
      'clarity': [],
      'strengths': [],
      'areas-for-improvement': [],
      'paragraph-quality': []
    };

    allComments.forEach(comment => {
      const category = determineCommentCategory(comment.annotation);
      grouped[category].push(comment);
    });

    return grouped;
  }, [blocks, activeTab]);

  // Handle focus new comment trigger
  useEffect(() => {
    if (focusNewComment) {
      if (initialNewCommentText) {
        setNewCommentSelectedText(initialNewCommentText);
        setShowNewComment(true);
      } else {
        setShowNewComment(true);
      }
      
      // Scroll to top and focus textarea
      setTimeout(() => {
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }
        
        setTimeout(() => {
          newCommentTextareaRef.current?.focus();
          onNewCommentFocusComplete?.();
        }, 100);
      }, 50);
    }
  }, [focusNewComment, initialNewCommentText, onNewCommentFocusComplete]);

  // Initialize new comment text when prop changes
  useEffect(() => {
    if (initialNewCommentText) {
      setNewCommentSelectedText(initialNewCommentText);
    }
  }, [initialNewCommentText]);

  // Handle saving new comment
  const handleSaveNewComment = () => {
    console.log('[SELECTION_DEBUG] Sidebar handleSaveNewComment called', {
      newCommentText: newCommentText ? newCommentText.substring(0, 50) : 'null/undefined',
      newCommentTextLength: newCommentText?.length || 0,
      newCommentTextTrimmed: newCommentText?.trim() || '',
      newCommentSelectedText: newCommentSelectedText ? newCommentSelectedText.substring(0, 50) : 'null/undefined',
      hasOnAnnotationAdd: !!onAnnotationAdd,
      blocksCount: blocks.length,
      stackTrace: new Error().stack
    });
    
    if (!newCommentText.trim() || !onAnnotationAdd) {
      console.log('[SELECTION_DEBUG] Sidebar Save: Early return - no text or callback', {
        hasText: !!newCommentText.trim(),
        textValue: newCommentText,
        textTrimmed: newCommentText.trim(),
        hasCallback: !!onAnnotationAdd,
        onAnnotationAddType: typeof onAnnotationAdd
      });
      return;
    }

    // Find appropriate block - use first block as fallback
    // The parent's handleAnnotationAdd will override with correct block from activeSelection
    const firstBlock = blocks[0];
    if (!firstBlock) {
      console.log('[SELECTION_DEBUG] Sidebar Save: ERROR - No blocks found');
      toast({
        title: 'Error',
        description: 'No content to comment on.',
        variant: 'destructive'
      });
      return;
    }

    const annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'comment', // Default type
      author: 'mihir',
      content: newCommentText.trim(),
      targetBlockId: firstBlock.id, // Will be overridden by handleAnnotationAdd if activeSelection exists
      targetText: newCommentSelectedText || '',
      resolved: false,
      metadata: {}
    };

    console.log('[SELECTION_DEBUG] Sidebar Save: Calling onAnnotationAdd', {
      annotationContent: annotation.content.substring(0, 50),
      targetBlockId: annotation.targetBlockId,
      targetText: annotation.targetText.substring(0, 50)
    });

    onAnnotationAdd(annotation);

    // Reset form
    setNewCommentText('');
    setNewCommentSelectedText('');
    setShowNewComment(false);
    
    console.log('[SELECTION_DEBUG] Sidebar Save: Form reset complete');
  };

  // Scroll to selected comment when selectedAnnotationId changes
  useEffect(() => {
    if (selectedAnnotationId && scrollAreaRef.current) {
      const commentElement = scrollAreaRef.current.querySelector(`[data-annotation-id="${selectedAnnotationId}"]`);
      
      if (commentElement) {
        const category = determineCommentCategory(
          Object.values(groupedComments).flat()
            .find(c => c.annotation.id === selectedAnnotationId)?.annotation || 
          { type: 'suggestion', metadata: {} } as Annotation
        );
        
        if (!expandedCategories.has(category)) {
          setExpandedCategories(prev => new Set([...prev, category]));
        }
        
        setTimeout(() => {
          const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
          
          if (scrollContainer && commentElement) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const elementRect = commentElement.getBoundingClientRect();
            const scrollTop = scrollContainer.scrollTop + (elementRect.top - containerRect.top);
            
            scrollContainer.scrollTo({
              top: scrollTop,
              behavior: 'smooth'
            });
          }
        }, 200);
      }
    }
  }, [selectedAnnotationId, expandedCategories, groupedComments]);

  const toggleCategoryExpansion = (category: FounderCommentCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoryIcon = (category: FounderCommentCategory) => {
    switch (category) {
      case 'overall-analysis':
        return <Target className="h-4 w-4" />;
      case 'tone':
        return <Volume2 className="h-4 w-4" />;
      case 'clarity':
        return <Eye className="h-4 w-4" />;
      case 'strengths':
        return <Star className="h-4 w-4" />;
      case 'areas-for-improvement':
        return <TrendingUp className="h-4 w-4" />;
      case 'paragraph-quality':
        return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: FounderCommentCategory) => {
    switch (category) {
      case 'overall-analysis':
        return 'border-indigo-500 bg-indigo-50';
      case 'tone':
        return 'border-orange-500 bg-orange-50';
      case 'clarity':
        return 'border-blue-500 bg-blue-50';
      case 'strengths':
        return 'border-green-500 bg-green-50';
      case 'areas-for-improvement':
        return 'border-red-500 bg-red-50';
      case 'paragraph-quality':
        return 'border-purple-500 bg-purple-50';
    }
  };

  const getCategoryTitle = (category: FounderCommentCategory) => {
    switch (category) {
      case 'overall-analysis':
        return 'Big-Picture';
      case 'tone':
        return 'Tone';
      case 'clarity':
        return 'Clarity';
      case 'strengths':
        return 'Strengths';
      case 'areas-for-improvement':
        return 'Weaknesses';
      case 'paragraph-quality':
        return 'Paragraph Quality';
    }
  };

  const totalUnresolvedComments = Object.values(groupedComments).flat().length;

  return (
    <div className={cn("flex-1 min-w-64 max-w-96 h-full max-h-screen border border-gray-300 bg-white flex-shrink-0 flex flex-col comment-sidebar", className)}>
      <div className="p-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Comments
            {totalUnresolvedComments > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {totalUnresolvedComments}
              </Badge>
            )}
          </h3>
          {onHideSidebar && (
            <Button
              onClick={onHideSidebar}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Hide comments"
            >
              <SidebarClose className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'unresolved')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="unresolved">Unresolved</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea ref={scrollAreaRef} className="flex-1 h-[calc(100vh-200px)]">
        <div className="space-y-4 p-2 pb-4">
          {/* New Comment Creation UI */}
          {onAnnotationAdd && (
            <Card className="border-2 border-blue-200 shadow-md" data-comment-form="true">
              <CardHeader className="py-2 px-3 bg-blue-25">
                <CardTitle className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {showNewComment ? 'New Comment' : 'Add Comment'}
                </CardTitle>
              </CardHeader>
              {showNewComment ? (
                <CardContent className="p-3 space-y-3">
                  {(() => {
                    console.log('[SELECTION_DEBUG] Rendering new comment form', {
                      showNewComment,
                      newCommentText,
                      newCommentSelectedText: newCommentSelectedText ? newCommentSelectedText.substring(0, 50) : null,
                      hasOnAnnotationAdd: !!onAnnotationAdd
                    });
                    return null;
                  })()}
                  {newCommentSelectedText && (
                    <div className="p-2 bg-gray-50 rounded text-sm italic text-gray-600 border border-gray-200">
                      <strong>Selected text:</strong> &quot;{newCommentSelectedText.substring(0, 100)}
                      {newCommentSelectedText.length > 100 ? '...' : ''}&quot;
                    </div>
                  )}
                  <div className="space-y-2">
                    <label htmlFor="new-comment-text" className="text-sm font-medium">
                      Comment
                    </label>
                    <Textarea
                      id="new-comment-text"
                      ref={(el) => {
                        newCommentTextareaRef.current = el;
                        if (el) {
                          console.log('[SELECTION_DEBUG] Textarea ref updated', {
                            value: el.value,
                            newCommentText: newCommentText
                          });
                        }
                      }}
                      placeholder="Enter your comment..."
                      value={newCommentText}
                      onChange={(e) => {
                        console.log('[SELECTION_DEBUG] Textarea onChange', {
                          newValue: e.target.value,
                          newValueLength: e.target.value.length,
                          willEnableButton: !!e.target.value.trim()
                        });
                        setNewCommentText(e.target.value);
                      }}
                      rows={4}
                      className="resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      ref={(btn) => {
                        if (btn) {
                          console.log('[SELECTION_DEBUG] Save Button rendered/updated', {
                            isDisabled: btn.disabled,
                            newCommentText: newCommentText,
                            newCommentTextLength: newCommentText?.length || 0,
                            newCommentTextTrimmed: newCommentText?.trim() || '',
                            willBeDisabled: !newCommentText.trim()
                          });
                        }
                      }}
                      onClick={(e) => {
                        console.log('[SELECTION_DEBUG] Sidebar Save Button clicked directly', {
                          newCommentText: newCommentText,
                          newCommentTextTrimmed: newCommentText.trim(),
                          isEmpty: !newCommentText.trim(),
                          event: e,
                          buttonDisabled: (e.currentTarget as HTMLButtonElement).disabled
                        });
                        e.preventDefault();
                        e.stopPropagation();
                        handleSaveNewComment();
                      }}
                      disabled={!newCommentText.trim()}
                      size="sm"
                      className="flex-1"
                      type="button"
                    >
                      Save Comment
                    </Button>
                    <Button
                      onClick={() => {
                        setShowNewComment(false);
                        setNewCommentText('');
                        setNewCommentSelectedText('');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              ) : (
                <CardContent className="p-3">
                  <Button
                    onClick={() => setShowNewComment(true)}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Add New Comment
                  </Button>
                </CardContent>
              )}
            </Card>
          )}
          {/* Overall Analysis Section - Always at top */}
          {groupedComments['overall-analysis'].length > 0 && (
            <>
              {(() => {
                const category = 'overall-analysis' as FounderCommentCategory;
                const comments = groupedComments[category];
                const isExpanded = expandedCategories.has(category);
                
                return (
                  <Card key={category} className="overflow-hidden border-2 border-indigo-200 shadow-md">
                    <CardHeader 
                      className="py-2 px-3 cursor-pointer hover:bg-indigo-25 bg-indigo-25"
                      onClick={() => toggleCategoryExpansion(category)}
                    >
                      <CardTitle className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(category)}
                          <span className="font-semibold text-indigo-800">{getCategoryTitle(category)}</span>
                          <Badge variant="outline" className="text-xs border-indigo-300 text-indigo-700">
                            {comments.length}
                          </Badge>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-indigo-600" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-indigo-600" />
                        )}
                      </CardTitle>
                    </CardHeader>
                    
                    {isExpanded && (
                      <CardContent className="p-0">
                        <div className="space-y-2 p-3 pt-0">
                          {comments.map(({ annotation, blockIndex, blockContent }) => (
                            <div
                              key={annotation.id}
                              data-annotation-id={annotation.id}
                              className={cn(
                                "p-2 rounded-lg border-l-4 cursor-pointer transition-all duration-200 overflow-hidden",
                                getCategoryColor(category),
                                selectedAnnotationId === annotation.id && "ring-2 ring-indigo-500 ring-opacity-50",
                                annotation.resolved && "opacity-60"
                              )}
                              onClick={() => {
                                onAnnotationSelect?.(annotation);
                              }}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {annotation.author === 'ai' ? (
                                    <Bot className="h-3 w-3 text-gray-600" />
                                  ) : (
                                    <User className="h-3 w-3 text-gray-600" />
                                  )}
                                  <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-300">
                                    Big Picture
                                  </Badge>
                                  {annotation.resolved && (
                                    <Badge variant="outline" className="text-xs text-green-600">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Resolved
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  {!annotation.resolved && onAnnotationResolve && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onAnnotationResolve(annotation.id);
                                      }}
                                      title="Mark as resolved"
                                    >
                                      <CheckCircle className="h-3 w-3" />
                                    </Button>
                                  )}
                                  {onAnnotationDelete && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onAnnotationDelete(annotation.id);
                                      }}
                                      title="Delete comment"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              
                              <p className="text-comment text-gray-700 mb-2 leading-relaxed break-words overflow-wrap-anywhere comment-content" style={{ fontFamily: 'Arial, sans-serif' }}>{annotation.content}</p>
                              
                              {annotation.targetText && (
                                <div className="mt-2 p-2 bg-white rounded border text-sm text-gray-600 leading-relaxed break-words overflow-wrap-anywhere" style={{ fontFamily: 'Arial, sans-serif' }}>
                                  <strong>Context:</strong> "{annotation.targetText}"
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })()}
              
              {/* Divider */}
              <div className="border-t border-gray-300 my-6 relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-gray-500 font-medium">Specific Feedback</span>
                </div>
              </div>
            </>
          )}

          {/* Other Categories */}
          {Object.entries(groupedComments).map(([category, comments]) => {
            if (comments.length === 0 || category === 'overall-analysis') return null;
            
            const isExpanded = expandedCategories.has(category as FounderCommentCategory);
            const categoryKey = category as FounderCommentCategory;
            
            return (
              <Card key={category} className="overflow-hidden">
                <CardHeader 
                  className="py-2 px-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleCategoryExpansion(categoryKey)}
                >
                  <CardTitle className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(categoryKey)}
                      {getCategoryTitle(categoryKey)}
                      <Badge variant="outline" className="text-xs">
                        {comments.length}
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </CardTitle>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="p-0">
                    <div className="space-y-2 p-3 pt-0">
                      {comments.map(({ annotation, blockIndex, blockContent }) => (
                        <div
                          key={annotation.id}
                          data-annotation-id={annotation.id}
                          className={cn(
                            "p-2 rounded-lg border-l-4 cursor-pointer transition-all duration-200 overflow-hidden",
                            getCategoryColor(categoryKey),
                            selectedAnnotationId === annotation.id && "ring-2 ring-blue-500 ring-opacity-50",
                            annotation.resolved && "opacity-60"
                          )}
                          onClick={() => {
                            onAnnotationSelect?.(annotation);
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {annotation.author === 'ai' ? (
                                <Bot className="h-3 w-3 text-gray-600" />
                              ) : (
                                <User className="h-3 w-3 text-gray-600" />
                              )}
                              <Badge variant="outline" className="text-xs text-gray-500">
                                Para {blockIndex + 1}
                              </Badge>
                              {annotation.resolved && (
                                <Badge variant="outline" className="text-xs text-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Resolved
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {!annotation.resolved && onAnnotationResolve && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAnnotationResolve(annotation.id);
                                  }}
                                  title="Mark as resolved"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                              )}
                              {onAnnotationDelete && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAnnotationDelete(annotation.id);
                                  }}
                                  title="Delete comment"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-comment text-gray-700 mb-2 leading-relaxed break-words overflow-wrap-anywhere comment-content" style={{ fontFamily: 'Arial, sans-serif' }}>{annotation.content}</p>
                          
                          {annotation.targetText && (
                            <div className="mt-2 p-2 bg-white rounded border text-sm text-gray-600 leading-relaxed break-words overflow-wrap-anywhere" style={{ fontFamily: 'Arial, sans-serif' }}>
                              <strong>Context:</strong> "{annotation.targetText}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
          
          {totalUnresolvedComments === 0 && activeTab === 'unresolved' && (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No unresolved comments</p>
              <p className="text-sm">Great work! All feedback has been addressed.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default FounderCommentSidebar;

