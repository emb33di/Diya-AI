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
  CheckSquare,
  Target,
  SidebarClose
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommentSidebarProps {
  blocks: DocumentBlock[];
  onAnnotationResolve?: (annotationId: string) => void;
  onAnnotationDelete?: (annotationId: string) => void;
  onAnnotationSelect?: (annotation: Annotation | null) => void;
  selectedAnnotationId?: string;
  onHideSidebar?: () => void;
  className?: string;
}

interface GroupedComment {
  annotation: Annotation;
  blockIndex: number;
  blockContent: string;
}

const CommentSidebar: React.FC<CommentSidebarProps> = ({
  blocks,
  onAnnotationResolve,
  onAnnotationDelete,
  onAnnotationSelect,
  selectedAnnotationId,
  onHideSidebar,
  className
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<CommentCategory>>(
    new Set(['overall-analysis', 'tone', 'clarity', 'strengths', 'areas-for-improvement', 'paragraph-quality', 'grammar'])
  );
  const [activeTab, setActiveTab] = useState<'all' | 'unresolved'>('unresolved');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Determine comment category based on annotation metadata and type
  const determineCommentCategory = (annotation: Annotation): CommentCategory => {
    // Use explicit category if set
    if (annotation.metadata?.commentCategory) {
      return annotation.metadata.commentCategory;
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
        case 'grammar':
          return 'grammar';
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

  // Group comments by category
  const groupedComments = useMemo(() => {
    const allComments: GroupedComment[] = [];
    
    blocks.forEach((block, blockIndex) => {
      block.annotations?.forEach(annotation => {
        // Skip resolved comments if we're only showing unresolved
        if (activeTab === 'unresolved' && annotation.resolved) return;
        
        allComments.push({
          annotation,
          blockIndex,
          blockContent: block.content
        });
      });
    });
    

    // Group by category
    const grouped: Record<CommentCategory, GroupedComment[]> = {
      'overall-analysis': [],
      'tone': [],
      'clarity': [],
      'strengths': [],
      'areas-for-improvement': [],
      'paragraph-quality': [],
      'grammar': []
    };

    allComments.forEach(comment => {
      const category = determineCommentCategory(comment.annotation);
      grouped[category].push(comment);
    });

    return grouped;
  }, [blocks, activeTab]);

  // Scroll to selected comment when selectedAnnotationId changes
  useEffect(() => {
    if (selectedAnnotationId && scrollAreaRef.current) {
      // Find the comment element with the selected annotation ID
      const commentElement = scrollAreaRef.current.querySelector(`[data-annotation-id="${selectedAnnotationId}"]`);
      
      console.log('CommentSidebar: Scroll effect triggered', {
        selectedAnnotationId,
        commentElementFound: !!commentElement,
        scrollAreaRef: !!scrollAreaRef.current
      });
      
      if (commentElement) {
        // Ensure the category is expanded
        const category = determineCommentCategory(
          groupedComments['overall-analysis'].concat(
            Object.values(groupedComments).flat()
          ).find(c => c.annotation.id === selectedAnnotationId)?.annotation || 
          { type: 'suggestion', metadata: {} } as Annotation
        );
        
        console.log('CommentSidebar: Category determined', {
          category,
          isExpanded: expandedCategories.has(category),
          selectedAnnotationId
        });
        
        if (!expandedCategories.has(category)) {
          console.log('CommentSidebar: Expanding category', category);
          setExpandedCategories(prev => new Set([...prev, category]));
        }
        
        // Scroll within the ScrollArea only, not the entire page
        setTimeout(() => {
          const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
          console.log('CommentSidebar: Attempting to scroll', {
            scrollContainer: !!scrollContainer,
            commentElement: !!commentElement,
            selectedAnnotationId
          });
          
          if (scrollContainer && commentElement) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const elementRect = commentElement.getBoundingClientRect();
            
            // Calculate the scroll position to bring the element to the top of the container
            const scrollTop = scrollContainer.scrollTop + (elementRect.top - containerRect.top);
            
            console.log('CommentSidebar: Scrolling to position', {
              scrollTop,
              elementTop: elementRect.top,
              containerTop: containerRect.top
            });
            
            scrollContainer.scrollTo({
              top: scrollTop,
              behavior: 'smooth'
            });
          }
        }, 200); // Increased timeout to allow for category expansion
      }
    }
  }, [selectedAnnotationId, expandedCategories, groupedComments]);

  const toggleCategoryExpansion = (category: CommentCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const getCategoryIcon = (category: CommentCategory) => {
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
      case 'grammar':
        return <CheckSquare className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: CommentCategory) => {
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
      case 'grammar':
        return 'border-cyan-500 bg-cyan-50';
    }
  };

  const getCategoryTitle = (category: CommentCategory) => {
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
      case 'grammar':
        return 'Grammar';
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
          {/* Overall Analysis Section - Always at top */}
          {groupedComments['overall-analysis'].length > 0 && (
            <>
              {(() => {
                const category = 'overall-analysis' as CommentCategory;
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
                                console.log('CommentSidebar: Comment clicked, calling onAnnotationSelect with:', {
                                  annotationId: annotation.id,
                                  annotationType: typeof annotation.id,
                                  annotation: annotation
                                });
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
                                  <Badge variant="outline" className="text-xs">
                                    {annotation.type}
                                  </Badge>
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
                                  <strong>{annotation.metadata?.agentType === 'grammar' ? 'Need to fix:' : 'Context:'}</strong> "{annotation.targetText}"
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
            if (comments.length === 0 && category !== 'grammar' || category === 'overall-analysis') return null;
            
            const isExpanded = expandedCategories.has(category as CommentCategory);
            const categoryKey = category as CommentCategory;
            
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
                      {/* Show congratulations message for empty grammar category */}
                      {category === 'grammar' && comments.length === 0 && (
                        <div className="text-center py-4 text-green-600">
                          <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-70" />
                          <p className="font-medium text-sm">Congratulations!</p>
                          <p className="text-xs">No grammar errors found! 🎉</p>
                        </div>
                      )}
                      
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
                            console.log('CommentSidebar: Comment clicked (other categories), calling onAnnotationSelect with:', {
                              annotationId: annotation.id,
                              annotationType: typeof annotation.id,
                              annotation: annotation
                            });
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
                              <Badge variant="outline" className="text-xs">
                                {annotation.type}
                              </Badge>
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
                              <strong>{annotation.metadata?.agentType === 'grammar' ? 'Need to fix:' : 'Context:'}</strong> "{annotation.targetText}"
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

// Memoize to prevent unnecessary re-renders when switching versions rapidly.
// Compare a compact signature of blocks and annotations rather than deep objects.
const areEqual = (
  prevProps: Readonly<CommentSidebarProps>,
  nextProps: Readonly<CommentSidebarProps>
) => {
  if (prevProps.selectedAnnotationId !== nextProps.selectedAnnotationId) return false;
  if (prevProps.className !== nextProps.className) return false;

  const prevBlocks = prevProps.blocks;
  const nextBlocks = nextProps.blocks;
  if (prevBlocks.length !== nextBlocks.length) return false;

  for (let i = 0; i < prevBlocks.length; i++) {
    const pb = prevBlocks[i];
    const nb = nextBlocks[i];
    if (pb.id !== nb.id) return false;
    if (pb.position !== nb.position) return false;
    const pa = pb.annotations || [];
    const na = nb.annotations || [];
    if (pa.length !== na.length) return false;
    for (let j = 0; j < pa.length; j++) {
      if (pa[j].id !== na[j].id || pa[j].resolved !== na[j].resolved) return false;
    }
  }

  return true;
};

export default React.memo(CommentSidebar, areEqual);
