/**
 * Founder Feedback Page
 * 
 * User-facing page to view founder feedback on their escalated essays.
 * Read-only view of founder edits and comments.
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EscalatedEssaysService, EscalatedEssay, FounderComment } from '@/services/escalatedEssaysService';
import { SemanticDocument, DocumentBlock, Annotation } from '@/types/semanticDocument';
import FounderFeedbackView from '@/components/essay/FounderFeedbackView';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, MessageSquare, FileText, Calendar, User as UserIcon } from 'lucide-react';
import GradientBackground from '@/components/GradientBackground';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FounderFeedbackPage: React.FC = () => {
  const { essayId } = useParams<{ essayId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [escalation, setEscalation] = useState<EscalatedEssay | null>(null);
  const [allEscalations, setAllEscalations] = useState<EscalatedEssay[]>([]);
  const [selectedEscalationId, setSelectedEscalationId] = useState<string | null>(null);
  const [founderComments, setFounderComments] = useState<FounderComment[]>([]);
  const [document, setDocument] = useState<SemanticDocument | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);

  useEffect(() => {
    if (!essayId) {
      toast({
        title: 'Error',
        description: 'Essay ID is required',
        variant: 'destructive'
      });
      navigate('/essays');
      return;
    }

    loadFeedback();
  }, [essayId]);

  // Reload feedback when selected escalation changes
  useEffect(() => {
    if (selectedEscalationId && essayId) {
      loadFeedbackForEscalation(selectedEscalationId);
    }
  }, [selectedEscalationId, essayId]);

  const loadFeedback = async () => {
    if (!essayId) return;

    try {
      setLoading(true);

      // Fetch ALL escalations for this essay
      const escalations = await EscalatedEssaysService.getAllEscalationsByEssayId(essayId);
      
      if (escalations.length === 0) {
        toast({
          title: 'No Feedback Available',
          description: 'No expert review has been provided for this essay yet.',
          variant: 'default'
        });
        navigate('/essays');
        return;
      }

      setAllEscalations(escalations);
      
      // Default to the most recent escalation (first in array)
      const mostRecentEscalation = escalations[0];
      setSelectedEscalationId(mostRecentEscalation.id);
      await loadFeedbackForEscalation(mostRecentEscalation.id);
    } catch (error) {
      console.error('Error loading founder feedback:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load feedback',
        variant: 'destructive'
      });
      navigate('/essays');
    } finally {
      setLoading(false);
    }
  };

  const loadFeedbackForEscalation = async (escalationId: string) => {
    if (!essayId) return;

    try {
      // Find the escalation from our list
      const escalationData = allEscalations.find(e => e.id === escalationId);
      
      if (!escalationData) {
        // If not in list, fetch it directly
        const fetched = await EscalatedEssaysService.getEscalatedEssayById(escalationId);
        if (!fetched) {
          throw new Error('Escalation not found');
        }
        setEscalation(fetched);
        
        // Fetch founder comments for this specific escalation
        const comments = await EscalatedEssaysService.getFounderCommentsByEscalationIdForUser(escalationId);
        setFounderComments(comments);
        
        // Build document
        buildDocument(fetched, comments);
      } else {
        setEscalation(escalationData);
        
        // Fetch founder comments for this specific escalation
        const comments = await EscalatedEssaysService.getFounderCommentsByEscalationIdForUser(escalationId);
        setFounderComments(comments);
        
        // Build document
        buildDocument(escalationData, comments);
      }
    } catch (error) {
      console.error('Error loading escalation feedback:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load feedback',
        variant: 'destructive'
      });
    }
  };

  const buildDocument = (
    escalationData: EscalatedEssay,
    comments: FounderComment[]
  ) => {
    // Use founder_edited_content if available, otherwise use original essay_content
    let contentToDisplay = escalationData.founder_edited_content || escalationData.essay_content;
    
    // IMPORTANT: Strip AI comments - user should only see founder comments, not AI comments
    contentToDisplay = {
      ...contentToDisplay,
      blocks: contentToDisplay.blocks.map(block => ({
        ...block,
        annotations: (block.annotations || []).filter(ann => ann.author !== 'ai')
      }))
    };
    
    // Convert founder comments to annotations and attach to blocks
    const blocksWithAnnotations = attachCommentsToBlocks(
      contentToDisplay.blocks,
      comments,
      escalationData.semantic_document_id || ''
    );

    // Create document with annotated blocks (only founder comments, no AI)
    const feedbackDocument: SemanticDocument = {
      ...contentToDisplay,
      blocks: blocksWithAnnotations,
      title: escalationData.essay_title,
      metadata: {
        ...contentToDisplay.metadata,
        essayId: essayId
      }
    };

    setDocument(feedbackDocument);
  };

  /**
   * Attach founder comments as annotations to their corresponding blocks
   */
  const attachCommentsToBlocks = (
    blocks: DocumentBlock[],
    comments: FounderComment[],
    documentId: string
  ): DocumentBlock[] => {
    // Create a map of block_id to comments
    const commentsByBlock = new Map<string, FounderComment[]>();
    comments.forEach(comment => {
      if (!commentsByBlock.has(comment.block_id)) {
        commentsByBlock.set(comment.block_id, []);
      }
      commentsByBlock.get(comment.block_id)!.push(comment);
    });

    // Attach annotations to blocks
    return blocks.map(block => {
      const blockComments = commentsByBlock.get(block.id) || [];
      
      // Convert FounderComment to Annotation
      const annotations: Annotation[] = blockComments.map(comment => {
        const metadata: Record<string, unknown> = {
          ...(comment.metadata || {}),
          escalationId: comment.escalation_id || undefined,
          commentCategory: 'areas-for-improvement' // Default category for founder comments
        };

        if (typeof comment.position_start === 'number') {
          metadata['position_start'] = comment.position_start;
        }

        if (typeof comment.position_end === 'number') {
          metadata['position_end'] = comment.position_end;
        }

        return {
          id: comment.id,
          type: comment.type as Annotation['type'],
          author: 'mihir', // Founder comments are marked as 'mihir' author
          content: comment.content,
          targetBlockId: comment.block_id,
          targetText: comment.target_text || '',
          createdAt: new Date(comment.created_at),
          updatedAt: new Date(comment.updated_at),
          resolved: comment.resolved,
          resolvedAt: comment.resolved_at ? new Date(comment.resolved_at) : undefined,
          metadata: metadata as Annotation['metadata']
        };
      });

      return {
        ...block,
        annotations
      };
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <GradientBackground>
        <div className="container mx-auto px-6 py-12">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading expert feedback...</p>
            </div>
          </div>
        </div>
      </GradientBackground>
    );
  }

  if (!escalation || !document) {
    return (
      <GradientBackground>
        <div className="container mx-auto px-6 py-12">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No feedback available</p>
              <Button onClick={() => navigate('/essays')} className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Essays
              </Button>
            </CardContent>
          </Card>
        </div>
      </GradientBackground>
    );
  }

  const hasEditedContent = !!escalation.founder_edited_content;
  const totalComments = founderComments.length;

  return (
    <GradientBackground>
      <div className="container mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/essays')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Essays
          </Button>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2 flex items-center gap-2">
                    <FileText className="h-6 w-6 text-primary" />
                    {escalation.essay_title}
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    {escalation.essay_prompt}
                  </CardDescription>
                </div>
                <Badge variant="default" className="flex items-center gap-1">
                  <UserIcon className="h-3 w-3" />
                  Expert Review
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Escalation Version Dropdown */}
              {allEscalations.length > 1 && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Review Version
                  </label>
                  <Select 
                    value={selectedEscalationId || ''} 
                    onValueChange={(escalationId) => {
                      setSelectedEscalationId(escalationId);
                    }}
                  >
                    <SelectTrigger className="w-full max-w-md bg-white border-gray-300 shadow-sm">
                      <SelectValue placeholder="Select review version">
                        {selectedEscalationId && escalation ? (
                          <div className="flex items-center space-x-2">
                            <span>
                              {formatDate(escalation.sent_back_at)}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({founderComments.length} comments)
                            </span>
                          </div>
                        ) : null}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {allEscalations.map((esc, index) => {
                        const hasEdits = !!esc.founder_edited_content;
                        return (
                          <SelectItem key={esc.id} value={esc.id}>
                            <div className="flex items-center justify-between w-full">
                              <div className="flex-1">
                                <div className="font-medium">
                                  Review #{allEscalations.length - index} - {formatDate(esc.sent_back_at)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {hasEdits && 'Edited • '}
                                  {formatDate(esc.escalated_at)} → {formatDate(esc.sent_back_at)}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Feedback Provided:</span>
                  <p className="font-medium">{formatDate(escalation.sent_back_at)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Comments:</span>
                  <p className="font-medium">{totalComments} comment{totalComments !== 1 ? 's' : ''}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p className="font-medium">{hasEditedContent ? 'Edited' : 'Comments Only'}</p>
                </div>
              </div>

              {/* Overall Feedback */}
              {escalation.founder_feedback && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    <h3 className="font-semibold text-blue-900">Overall Feedback</h3>
                  </div>
                  <p className="text-blue-800 whitespace-pre-wrap">{escalation.founder_feedback}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Feedback View */}
        <Card className="shadow-lg">
          <CardContent className="p-0">
            <div className="bg-white rounded-lg h-[calc(100vh-400px)] min-h-[600px] overflow-hidden">
              <FounderFeedbackView
                document={document}
                blocks={document.blocks}
                onAnnotationSelect={setSelectedAnnotation}
                selectedAnnotationId={selectedAnnotation?.id}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </GradientBackground>
  );
};

export default FounderFeedbackPage;
