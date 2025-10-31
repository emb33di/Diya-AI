/**
 * Founder Essay Review Page
 * 
 * Allows founder to review, comment on, and provide feedback for escalated essays.
 * Uses the same SemanticEditor experience as students.
 */

import React, { useState, useEffect, useRef } from 'react';
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
  Bot
} from 'lucide-react';
import { EscalatedEssaysService, EscalatedEssay, EscalatedEssayComment } from '@/services/escalatedEssaysService';
import { SemanticDocument, Annotation, AnnotationType } from '@/types/semanticDocument';
import { semanticDocumentService } from '@/services/semanticDocumentService';
import { useToast } from '@/hooks/use-toast';
import FounderGuard from '@/components/FounderGuard';
import FounderSemanticEditor from '@/components/essay/FounderSemanticEditor';

const FounderEssayReview: React.FC = () => {
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
  const [aiCommentsSnapshot, setAiCommentsSnapshot] = useState<EscalatedEssayComment[]>([]);
  const [displaySaveTime, setDisplaySaveTime] = useState<Date | null>(null);
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
      setAiCommentsSnapshot(data.ai_comments_snapshot || []);

      // Use founder_edited_content if available, otherwise use essay_content snapshot
      let contentToUse: SemanticDocument = data.founder_edited_content || data.essay_content;
      
      // If there are saved founder comments, inject them into the document
      if (data.founder_comments && data.founder_comments.length > 0) {
        // Convert founder_comments to annotations and attach to blocks
        const founderCommentsMap = new Map<string, Annotation[]>();
        
        data.founder_comments.forEach((comment: EscalatedEssayComment) => {
          if (!founderCommentsMap.has(comment.blockId)) {
            founderCommentsMap.set(comment.blockId, []);
          }
          
          const annotation: Annotation = {
            id: comment.id,
            type: comment.type as AnnotationType,
            author: 'mihir',
            content: comment.content,
            targetBlockId: comment.blockId,
            targetText: comment.position ? undefined : undefined,
            createdAt: new Date(comment.created_at || Date.now()),
            updatedAt: new Date(comment.created_at || Date.now()),
            resolved: false
          };
          
          founderCommentsMap.get(comment.blockId)!.push(annotation);
        });
        
        // Merge founder comments into document blocks
        contentToUse = {
          ...contentToUse,
          blocks: contentToUse.blocks.map(block => ({
            ...block,
            annotations: [
              ...(block.annotations || []).filter(ann => ann.author !== 'mihir'), // Remove existing mihir comments
              ...(founderCommentsMap.get(block.id) || []) // Add saved founder comments
            ]
          }))
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

  // Helper to extract founder comments (those with author === 'mihir')
  const extractFounderComments = (doc: SemanticDocument): EscalatedEssayComment[] => {
    const founderAnnotations = doc.blocks.flatMap(block => 
      block.annotations.filter(ann => ann.author === 'mihir')
    );

    return founderAnnotations.map(ann => ({
      id: ann.id,
      blockId: ann.targetBlockId || ann.id,
      type: ann.type,
      content: ann.content,
      position: ann.targetText ? {
        start: 0,
        end: 0
      } : undefined,
      created_at: ann.createdAt.toISOString()
    }));
  };

  // Auto-save founder comments every 2 seconds (memoized to have access to latest escalationId)
  const autoSaveFounderCommentsMemo = React.useCallback(async (doc: SemanticDocument) => {
    if (!escalationId || !doc) return;

    try {
      setIsAutoSaving(true);
      
      const comments = extractFounderComments(doc);

      // Save comments to escalated_essays (without changing status)
      await EscalatedEssaysService.updateEscalatedEssay(escalationId, {
        founder_comments: comments,
        founder_edited_content: doc,
        // Keep existing status - don't change it on auto-save
      });

      // Update the actual save time but don't update display state
      lastActualSaveTimeRef.current = new Date();
    } catch (error) {
      console.error('Error auto-saving founder comments:', error);
      // Don't show toast for auto-save errors to avoid annoying the founder
    } finally {
      setIsAutoSaving(false);
    }
  }, [escalationId]);

  const handleDocumentChange = (updatedDocument: SemanticDocument) => {
    // Convert any new 'user' comments to 'mihir' for founder
    const hasUserComments = updatedDocument.blocks.some(block =>
      block.annotations.some(ann => ann.author === 'user')
    );

    if (hasUserComments) {
      // Update all 'user' comments to 'mihir'
      const updatedBlocks = updatedDocument.blocks.map(block => ({
        ...block,
        annotations: block.annotations.map(ann => 
          ann.author === 'user' ? { ...ann, author: 'mihir' as const } : ann
        )
      }));
      
      updatedDocument = {
        ...updatedDocument,
        blocks: updatedBlocks,
        updatedAt: new Date()
      };
    }

    setDocument(updatedDocument);

    // Clear existing auto-save timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set up auto-save after 2 seconds of inactivity
    autoSaveTimeoutRef.current = setTimeout(() => {
      autoSaveFounderCommentsMemo(updatedDocument);
    }, 2000);
  };

  // Update display time gently every minute (without triggering auto-save UI updates)
  useEffect(() => {
    // Update display immediately if there's a save time and no display time yet
    if (lastActualSaveTimeRef.current && !displaySaveTime) {
      setDisplaySaveTime(lastActualSaveTimeRef.current);
    }

    // Set up interval to update display time every 60 seconds (1 minute)
    const displayUpdateInterval = setInterval(() => {
      if (lastActualSaveTimeRef.current) {
        setDisplaySaveTime(lastActualSaveTimeRef.current);
      }
    }, 60000); // 60 seconds = 1 minute

    return () => {
      clearInterval(displayUpdateInterval);
    };
  }, [displaySaveTime]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);


  const handleSaveFeedback = async () => {
    if (!escalationId || !document) return;

    try {
      setSaving(true);

      // Extract founder comments (those with author === 'mihir')
      const comments = extractFounderComments(document);

      // Save feedback and comments
      await EscalatedEssaysService.updateEscalatedEssay(escalationId, {
        founder_feedback: founderFeedback,
        founder_comments: comments,
        founder_edited_content: document,
        status: essay?.status || 'in_review'
      });

      // Update display time immediately when manually saved
      const saveTime = new Date();
      lastActualSaveTimeRef.current = saveTime;
      setDisplaySaveTime(saveTime);

      toast({
        title: 'Success',
        description: 'Feedback saved successfully.'
      });

      // Reload essay to get updated data
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
      
      // Save current feedback/comments before marking as reviewed
      if (document) {
        await handleSaveFeedback();
      }

      await EscalatedEssaysService.markReviewed(escalationId);
      
      toast({
        title: 'Success',
        description: 'Essay marked as reviewed.'
      });

      // Reload essay
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
    if (!escalationId || !founderFeedback.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide feedback before sending back to student.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);

      // Save feedback/comments/edits before sending back
      if (document) {
        const comments = extractFounderComments(document);

        await EscalatedEssaysService.sendBackToStudent(
          escalationId,
          founderFeedback,
          comments,
          document
        );
      } else {
        await EscalatedEssaysService.sendBackToStudent(escalationId, founderFeedback);
      }

      toast({
        title: 'Success',
        description: 'Essay sent back to student.',
      });

      // Navigate back to list
      navigate('/founder-portal');
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

  if (loading) {
    return (
      <FounderGuard>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4EDE2' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading essay...</p>
          </div>
        </div>
      </FounderGuard>
    );
  }

  if (!essay || !document) {
    return (
      <FounderGuard>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4EDE2' }}>
          <Card className="max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Essay Not Found</h2>
                <p className="text-muted-foreground mb-4">The essay you're looking for doesn't exist.</p>
                <Button onClick={() => navigate('/founder-portal')}>Back to List</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </FounderGuard>
    );
  }

  return (
    <FounderGuard>
      <div className="min-h-screen" style={{ backgroundColor: '#F4EDE2' }}>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate('/founder-portal')}
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
                    <FileText className="h-4 w-4" />
                    <span>{essay.word_count} words</span>
                  </div>
                </div>
              </div>
            </div>

            {essay.essay_prompt && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Essay Prompt</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{essay.essay_prompt}</p>
                </CardContent>
              </Card>
            )}

            {/* AI Comments Snapshot Info */}
            {aiCommentsSnapshot.length > 0 && (
              <Card className="mb-6 border-blue-200 bg-blue-50/50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Bot className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm">AI Comments Snapshot</span>
                        <Badge variant="outline" className="text-xs">
                          {aiCommentsSnapshot.length} comment{aiCommentsSnapshot.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        These are the AI comments that were present when the essay was escalated. 
                        They are shown as read-only for reference.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
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
                title={essay.essay_title}
                initialContent={initialHtml}
                wordLimit={essay.word_limit ? parseInt(essay.word_limit) : undefined}
                onDocumentChange={handleDocumentChange}
                showCommentSidebar={true}
                readOnly={false}
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
          </div>
        </div>
      </div>
    </FounderGuard>
  );
};

export default FounderEssayReview;
