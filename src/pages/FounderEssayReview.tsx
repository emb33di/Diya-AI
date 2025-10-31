/**
 * Founder Essay Review Page
 * 
 * Allows founder to review, comment on, and provide feedback for escalated essays.
 * Uses the same SemanticEditor experience as students.
 */

import React, { useState, useEffect } from 'react';
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
import { SemanticDocument, Annotation } from '@/types/semanticDocument';
import { semanticDocumentService } from '@/services/semanticDocumentService';
import { useToast } from '@/hooks/use-toast';
import FounderGuard from '@/components/FounderGuard';
import SemanticEditor from '@/components/essay/SemanticEditor';

const FounderEssayReview: React.FC = () => {
  const { escalationId } = useParams<{ escalationId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [essay, setEssay] = useState<EscalatedEssay | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [founderFeedback, setFounderFeedback] = useState('');
  const [document, setDocument] = useState<SemanticDocument | null>(null);
  const [initialHtml, setInitialHtml] = useState<string>('');
  const [aiCommentsSnapshot, setAiCommentsSnapshot] = useState<EscalatedEssayComment[]>([]);

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
      const contentToUse: SemanticDocument = data.founder_edited_content || data.essay_content;
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

  const handleDocumentChange = (updatedDocument: SemanticDocument) => {
    setDocument(updatedDocument);
  };

  const handleSaveFeedback = async () => {
    if (!escalationId || !document) return;

    try {
      setSaving(true);

      // Extract founder comments from document annotations (those with author === 'user')
      // These are comments the founder added in the editor
      const founderAnnotations = document.blocks.flatMap(block => 
        block.annotations.filter(ann => ann.author === 'user')
      );

      // Convert annotations to EscalatedEssayComment format
      const comments: EscalatedEssayComment[] = founderAnnotations.map(ann => ({
        id: ann.id,
        blockId: ann.targetBlockId || ann.id, // Fallback to annotation id if blockId not set
        type: ann.type,
        content: ann.content,
        position: ann.targetText ? {
          start: 0, // Position tracking would need to be implemented based on targetText
          end: 0
        } : undefined,
        created_at: ann.createdAt.toISOString()
      }));

      // Save feedback and comments
      await EscalatedEssaysService.updateEscalatedEssay(escalationId, {
        founder_feedback: founderFeedback,
        founder_comments: comments,
        founder_edited_content: document,
        status: essay?.status || 'in_review'
      });

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
        const founderAnnotations = document.blocks.flatMap(block => 
          block.annotations.filter(ann => ann.author === 'user')
        );

        const comments: EscalatedEssayComment[] = founderAnnotations.map(ann => ({
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
              <SemanticEditor
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
            <Button
              onClick={handleSaveFeedback}
              disabled={saving}
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
