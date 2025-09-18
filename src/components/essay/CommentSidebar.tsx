import React, { useState, useMemo } from 'react';
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
    
    console.log('CommentSidebar: Processing blocks:', blocks.length);
    blocks.forEach((block, blockIndex) => {
      console.log(`Block ${blockIndex} (${block.id}) has ${block.annotations?.length || 0} annotations:`, block.annotations);
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
    
    console.log('CommentSidebar: Total comments found:', allComments.length);

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
        return 'Overall Analysis';
      case 'tone':
        return 'Tone';
      case 'clarity':
        return 'Clarity';
      case 'strengths':
        return 'Strengths';
      case 'areas-for-improvement':
        return 'Areas for Improvement';
      case 'paragraph-quality':
        return 'Paragraph Quality';
      case 'grammar':
        return 'Grammar';
    }
  };

  const totalUnresolvedComments = Object.values(groupedComments).flat().length;

  return (
    <div className={cn("w-64 sm:w-72 max-w-sm h-full border-l border-gray-200 bg-white flex-shrink-0", className)}>
      <div className="p-3 border-b border-gray-200">
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

      <ScrollArea className="flex-1 h-[calc(100vh-200px)]">
        <div className="p-4 space-y-4">
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
                              className={cn(
                                "p-2 rounded-lg border-l-4 cursor-pointer transition-all duration-200",
                                getCategoryColor(category),
                                selectedAnnotationId === annotation.id && "ring-2 ring-indigo-500 ring-opacity-50",
                                annotation.resolved && "opacity-60"
                              )}
                              onClick={() => onAnnotationSelect?.(annotation)}
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
                              
                              <p className="text-xs text-gray-700 mb-2 leading-relaxed">{annotation.content}</p>
                              
                              {annotation.targetText && (
                                <div className="mt-2 p-2 bg-white rounded border text-xs text-gray-600 leading-relaxed">
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
                      {comments.map(({ annotation, blockIndex, blockContent }) => (
                        <div
                          key={annotation.id}
                          className={cn(
                            "p-2 rounded-lg border-l-4 cursor-pointer transition-all duration-200",
                            getCategoryColor(categoryKey),
                            selectedAnnotationId === annotation.id && "ring-2 ring-blue-500 ring-opacity-50",
                            annotation.resolved && "opacity-60"
                          )}
                          onClick={() => onAnnotationSelect?.(annotation)}
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
                          
                          <p className="text-xs text-gray-700 mb-2 leading-relaxed">{annotation.content}</p>
                          
                          {annotation.targetText && (
                            <div className="mt-2 p-2 bg-white rounded border text-xs text-gray-600 leading-relaxed">
                              <strong>Context:</strong> "{annotation.targetText}"
                            </div>
                          )}
                          
                          <div className="mt-2 text-xs text-gray-500">
                            <div className="truncate">
                              <strong>From:</strong> {blockContent.substring(0, 60)}...
                            </div>
                          </div>
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

export default CommentSidebar;
