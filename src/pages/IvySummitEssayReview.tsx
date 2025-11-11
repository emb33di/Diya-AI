/**
 * IvySummit Essay Review Page
 * 
 * Allows IvySummit counselor to review, comment on, and provide feedback for escalated essays.
 * Uses the same SemanticEditor experience as students.
 * This is a demo portal for IV Summit partner
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  FileText,
  Save,
  CheckCircle,
  Send,
  MessageSquare,
  AlertCircle,
  Sparkles,
  GraduationCap,
  Trash2
} from 'lucide-react';
import { EscalatedEssaysService, EscalatedEssay, EscalatedEssayComment, EssaySummary } from '@/services/escalatedEssaysService';
import { SemanticDocument, Annotation, AnnotationType } from '@/types/semanticDocument';
import { semanticDocumentService } from '@/services/semanticDocumentService';
import { useToast } from '@/hooks/use-toast';
import IvySummitGuard from '@/components/IvySummitGuard';
import FounderSemanticEditor from '@/components/essay/FounderSemanticEditor';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const IvySummitEssayReview: React.FC = () => {
  const { escalationId } = useParams<{ escalationId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [essay, setEssay] = useState<EscalatedEssay | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [founderFeedback, setFounderFeedback] = useState('');
  const [document, setDocument] = useState<SemanticDocument | null>(null);
  const [initialHtml, setInitialHtml] = useState<string>('');
  const [displaySaveTime, setDisplaySaveTime] = useState<Date | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActualSaveTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    if (escalationId) {
      loadEssay();
    }
  }, [escalationId]);

  const loadEssay = async () => {
    if (!escalationId) return;

    try {
      setLoading(true);
      const data = await EscalatedEssaysService.getEscalatedEssayById(escalationId);
      
      if (!data) {
        throw new Error('Essay not found');
      }

      setEssay(data);
      setFounderFeedback(data.founder_feedback || '');

      // Use founder_edited_content if available, otherwise use essay_content snapshot
      let contentToUse: SemanticDocument = data.founder_edited_content || data.essay_content;
      
      // IMPORTANT: Strip AI comments - counselor should only see essay text and their own comments
      contentToUse = {
        ...contentToUse,
        blocks: contentToUse.blocks.map(block => ({
          ...block,
          annotations: (block.annotations || []).filter(ann => ann.author !== 'ai')
        }))
      };
      
      // Fetch founder comments from the new founder_comments table
      const founderComments = await EscalatedEssaysService.getFounderCommentsByEscalationId(escalationId);
      
      if (founderComments.length > 0) {
        // Convert founder_comments to annotations and attach to blocks
        const founderCommentsMap = new Map<string, Annotation[]>();
        
        founderComments.forEach((comment) => {
          if (!founderCommentsMap.has(comment.block_id)) {
            founderCommentsMap.set(comment.block_id, []);
          }
          
          const annotation: Annotation = {
            id: comment.id,
            type: comment.type as AnnotationType,
            author: 'mihir', // Keep 'mihir' for demo compatibility
            content: comment.content,
            targetBlockId: comment.block_id,
            targetText: comment.target_text || undefined,
            createdAt: new Date(comment.created_at),
            updatedAt: new Date(comment.updated_at),
            resolved: comment.resolved
          };
          
          founderCommentsMap.get(comment.block_id)!.push(annotation);
        });
        
        // Merge founder comments into document blocks (only counselor comments, no AI)
        contentToUse = {
          ...contentToUse,
          blocks: contentToUse.blocks.map(block => {
            const existingMihirComments = (block.annotations || []).filter(ann => ann.author === 'mihir');
            const newMihirComments = founderCommentsMap.get(block.id) || [];
            
            return {
              ...block,
              annotations: [
                ...(block.annotations || []).filter(ann => ann.author !== 'mihir' && ann.author !== 'ai'),
                ...newMihirComments
              ]
            };
          })
        };
      }
      
      setDocument(contentToUse);

      // Convert SemanticDocument to HTML for SemanticEditor's initialContent
      const htmlContent = semanticDocumentService.convertBlocksToHtml(contentToUse.blocks);
      setInitialHtml(htmlContent);

      // Mark as in_review if it's currently pending
      if (data.status === 'pending') {
        await EscalatedEssaysService.markInReview(escalationId);
        // Reload to get updated status
        const updated = await EscalatedEssaysService.getEscalatedEssayById(escalationId);
        setEssay(updated);
      }
    } catch (error) {
      console.error('Error loading escalated essay:', error);
      toast({
        title: 'Error',
        description: 'Failed to load essay. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper to extract counselor comments (those with author === 'mihir')
  const extractFounderComments = (doc: SemanticDocument): EscalatedEssayComment[] => {
    // Get all annotations with author 'mihir'
    const founderAnnotations = doc.blocks.flatMap(block => 
      (block.annotations || []).filter(ann => ann.author === 'mihir')
    );

    if (founderAnnotations.length === 0) {
      return [];
    }

    return founderAnnotations.map(ann => {
      const metadata = ann.metadata as any;
      const positionStart = metadata?.position_start as number | undefined;
      const positionEnd = metadata?.position_end as number | undefined;
      
      let createdAtStr: string;
      if (ann.createdAt instanceof Date) {
        createdAtStr = ann.createdAt.toISOString();
      } else if (typeof ann.createdAt === 'string') {
        createdAtStr = ann.createdAt;
      } else {
        createdAtStr = new Date().toISOString();
      }
      
      const comment: EscalatedEssayComment = {
        id: ann.id,
        blockId: ann.targetBlockId || ann.id,
        type: ann.type,
        content: ann.content,
        targetText: ann.targetText,
        position: (positionStart !== undefined && positionEnd !== undefined) ? {
          start: positionStart,
          end: positionEnd
        } : undefined,
        created_at: createdAtStr
      };

      return comment;
    });
  };

  // Auto-save counselor comments
  const autoSaveFounderCommentsMemo = React.useCallback(async (doc: SemanticDocument) => {
    if (!escalationId || !doc || !essay) {
      return;
    }

    try {
      setIsAutoSaving(true);
      
      const comments = extractFounderComments(doc);
      
      if (comments.length === 0) {
        return;
      }

      await EscalatedEssaysService.updateEscalatedEssay(escalationId, {
        founder_edited_content: doc,
      });

      await EscalatedEssaysService.saveFounderComments(
        essay.essay_id,
        escalationId,
        comments
      );

      lastActualSaveTimeRef.current = new Date();
    } catch (error) {
      console.error('Error auto-saving counselor comments:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [escalationId, essay]);

  const handleDocumentChange = React.useCallback((updatedDocument: SemanticDocument) => {
    const hasUserComments = updatedDocument.blocks.some(block =>
      block.annotations?.some(ann => ann.author === 'user')
    );

    if (hasUserComments) {
      const updatedBlocks = updatedDocument.blocks.map(block => ({
        ...block,
        annotations: block.annotations?.map(ann => 
          ann.author === 'user' ? { ...ann, author: 'mihir' as const } : ann
        ) || []
      }));
      
      updatedDocument = {
        ...updatedDocument,
        blocks: updatedBlocks,
        updatedAt: new Date()
      };
    }

    setDocument(updatedDocument);

    const founderCommentCount = updatedDocument.blocks.reduce((sum, b) => 
      sum + (b.annotations?.filter(a => a.author === 'mihir').length || 0), 0
    );
    
    if (essay && escalationId && founderCommentCount > 0) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSaveFounderCommentsMemo(updatedDocument);
      }, 500);
    }
  }, [essay, escalationId, autoSaveFounderCommentsMemo]);

  useEffect(() => {
    if (lastActualSaveTimeRef.current && !displaySaveTime) {
      setDisplaySaveTime(lastActualSaveTimeRef.current);
    }

    const displayUpdateInterval = setInterval(() => {
      if (lastActualSaveTimeRef.current) {
        setDisplaySaveTime(lastActualSaveTimeRef.current);
      }
    }, 60000);

    return () => {
      clearInterval(displayUpdateInterval);
    };
  }, [displaySaveTime]);

  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  const handleSaveFeedback = async () => {
    if (!escalationId || !document || !essay) return;

    try {
      setSaving(true);

      const comments = extractFounderComments(document);

      await EscalatedEssaysService.updateEscalatedEssay(escalationId, {
        founder_feedback: founderFeedback,
        founder_edited_content: document,
        status: essay?.status || 'in_review'
      });

      await EscalatedEssaysService.saveFounderComments(
        essay.essay_id,
        escalationId,
        comments
      );

      const saveTime = new Date();
      lastActualSaveTimeRef.current = saveTime;
      setDisplaySaveTime(saveTime);

      toast({
        title: 'Success',
        description: 'Feedback saved successfully.'
      });

      await loadEssay();
    } catch (error) {
      console.error('Error saving feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to save feedback. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMarkReviewed = async () => {
    if (!escalationId) return;

    try {
      setSaving(true);
      
      if (document) {
        await handleSaveFeedback();
      }

      await EscalatedEssaysService.markReviewed(escalationId);
      
      toast({
        title: 'Success',
        description: 'Essay marked as reviewed.'
      });

      await loadEssay();
    } catch (error) {
      console.error('Error marking as reviewed:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark as reviewed. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendBack = async () => {
    if (!escalationId || !founderFeedback.trim() || !essay) {
      toast({
        title: 'Validation Error',
        description: 'Please provide feedback before sending back to student.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);

      if (document) {
        const comments = extractFounderComments(document);

        await EscalatedEssaysService.saveFounderComments(
          essay.essay_id,
          escalationId,
          comments
        );

        await EscalatedEssaysService.sendBackToStudent(
          escalationId,
          founderFeedback,
          [],
          document
        );
      } else {
        await EscalatedEssaysService.sendBackToStudent(escalationId, founderFeedback);
      }

      toast({
        title: 'Success',
        description: 'Essay sent back to student.',
      });

      navigate('/ivysummit-portal');
    } catch (error) {
      console.error('Error sending back to student:', error);
      toast({
        title: 'Error',
        description: 'Failed to send back to student. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateAISummary = async () => {
    if (!escalationId || !essay || !document) return;

    try {
      setIsGeneratingSummary(true);
      
      await EscalatedEssaysService.generateFounderSummary(
        escalationId,
        document,
        essay.essay_prompt,
        essay.user_id
      );

      await loadEssay();

      toast({
        title: 'Success',
        description: 'AI summary generated successfully.',
      });
    } catch (error) {
      console.error('Error generating AI summary:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate AI summary. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!escalationId) return;

    try {
      setIsDeleting(true);
      await EscalatedEssaysService.deleteEscalatedEssay(escalationId);
      
      toast({
        title: 'Success',
        description: 'Essay deleted successfully.',
      });

      navigate('/ivysummit-portal');
    } catch (error) {
      console.error('Error deleting essay:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete essay. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'default' as const },
      in_review: { label: 'In Review', variant: 'secondary' as const },
      reviewed: { label: 'Reviewed', variant: 'outline' as const },
      sent_back: { label: 'Sent Back', variant: 'default' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const formatSchoolType = (applyingTo: string | null): string => {
    if (!applyingTo) return 'Not specified';
    
    const schoolTypeMap: Record<string, string> = {
      'undergraduate': 'Undergraduate Colleges',
      'mba': 'MBA',
      'llm': 'LLM',
      'phd': 'PhD',
      'masters': 'Masters'
    };
    
    return schoolTypeMap[applyingTo.toLowerCase()] || applyingTo;
  };

  if (loading) {
    return (
      <IvySummitGuard>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4EDE2' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading essay...</p>
          </div>
        </div>
      </IvySummitGuard>
    );
  }

  if (!essay || !document) {
    return (
      <IvySummitGuard>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4EDE2' }}>
          <Card className="max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Essay Not Found</h2>
                <p className="text-muted-foreground mb-4">The essay you're looking for doesn't exist.</p>
                <Button onClick={() => navigate('/ivysummit-portal')}>Back to List</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </IvySummitGuard>
    );
  }

  return (
    <IvySummitGuard>
      <div className="min-h-screen" style={{ backgroundColor: '#F4EDE2' }}>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/ivysummit-portal')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Button>

            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{essay.essay_title}</h1>
                  {getStatusBadge(essay.status)}
                </div>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{essay.student_name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>{essay.student_email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    <span>{formatSchoolType(essay.applying_to)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>{essay.word_count} words</span>
                  </div>
                </div>
              </div>
            </div>

            {essay.essay_prompt && (
              <div className="bg-white p-4 md:p-8 rounded-xl shadow-lg border border-gray-300 relative overflow-hidden group hover:shadow-xl transition-shadow duration-300 mb-6">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="flex-shrink-0 self-center sm:self-start sm:mt-1">
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-3 flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0">
                      <div className="flex items-center gap-2">
                        <span>{essay.essay_title}</span>
                      </div>
                      <div className="sm:ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full self-start">
                        Required
                      </div>
                    </h3>
                    <div className="prose prose-gray max-w-none">
                      <p className="text-gray-700 leading-relaxed m-0 text-base" style={{ fontFamily: 'Arial, sans-serif', whiteSpace: 'pre-wrap' }}>
                        {essay.essay_prompt}
                      </p>
                    </div>
                  </div>
                </div>
                
                {essay.word_limit && (
                  <div className="mt-4 md:mt-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          Word Limit: {essay.word_count || 0}/{essay.word_limit || 'Not specified'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI Summary Section */}
            <Card className="mb-6 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    AI Insights
                  </CardTitle>
                  {!essay.ai_summary && (
                    <Button
                      onClick={handleGenerateAISummary}
                      disabled={isGeneratingSummary}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {isGeneratingSummary ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Quick AI insights
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              {essay.ai_summary ? (
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Study Target</div>
                        <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded">{essay.ai_summary.study_target}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Goals & Background</div>
                        <div className="text-sm text-gray-700 bg-blue-50 p-3 rounded">{essay.ai_summary.goals_background}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-green-600 uppercase mb-1">Strengths</div>
                        <div className="text-sm text-gray-700 bg-green-50 p-3 rounded">{essay.ai_summary.strengths}</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs font-semibold text-red-600 uppercase mb-1">Weaknesses</div>
                        <div className="text-sm text-gray-700 bg-red-50 p-3 rounded">{essay.ai_summary.weaknesses}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-orange-600 uppercase mb-1">Grammar Mistakes</div>
                        <div className="text-sm text-gray-700 bg-orange-50 p-3 rounded">{essay.ai_summary.grammar_mistakes}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-purple-600 uppercase mb-1">Improvement Areas</div>
                        <div className="text-sm text-gray-700 bg-purple-50 p-3 rounded">{essay.ai_summary.improvement_areas}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              ) : (
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 text-blue-300" />
                    <p className="mb-2">No AI analysis available yet.</p>
                    <p className="text-sm">Click "Quick AI insights" to analyze the essay.</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Editor */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Essay Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FounderSemanticEditor
                documentId={document.id}
                essayId={essay.essay_id}
                escalationId={escalationId}
                title={essay.essay_title}
                initialContent={initialHtml}
                initialDocument={document}
                wordLimit={essay.word_limit ? parseInt(essay.word_limit) : undefined}
                onDocumentChange={handleDocumentChange}
                showCommentSidebar={true}
                readOnly={false}
                disableAutoSave={true}
              />
            </CardContent>
          </Card>

          {/* Overall Feedback */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Overall Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="feedback" className="mb-2">
                Provide your overall feedback for the student
              </Label>
              <Textarea
                id="feedback"
                value={founderFeedback}
                onChange={(e) => setFounderFeedback(e.target.value)}
                placeholder="Enter your feedback here..."
                rows={6}
                className="mb-4"
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            {isAutoSaving && (
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                Auto-saving comments...
              </span>
            )}
            {!isAutoSaving && displaySaveTime && (
              <span className="text-sm text-muted-foreground">
                Last saved: {displaySaveTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
            <Button
              onClick={handleSaveFeedback}
              disabled={saving || isAutoSaving}
              variant="outline"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Feedback
            </Button>
            <Button
              onClick={handleMarkReviewed}
              disabled={saving}
              variant="outline"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Reviewed
            </Button>
            <Button
              onClick={handleSendBack}
              disabled={saving || !founderFeedback.trim()}
              className="ml-auto"
            >
              <Send className="h-4 w-4 mr-2" />
              Send Back to Student
            </Button>
            <Button
              onClick={handleDeleteClick}
              disabled={saving || isDeleting}
              variant="outline"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  Delete Escalated Essay
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete <strong>"{essay?.essay_title}"</strong>? This action cannot be undone.
                  <br /><br />
                  This will permanently remove the escalated essay and all associated feedback and comments.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </IvySummitGuard>
  );
};

export default IvySummitEssayReview;

