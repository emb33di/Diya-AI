/**
 * Ivy Readiness Report
 * 
 * Free essay scoring feature for landing page users.
 * Shows first sentence of comments, blurs the rest, and provides grading.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SemanticDocument, Annotation, DocumentBlock } from '@/types/semanticDocument';
import { semanticDocumentService } from '@/services/semanticDocumentService';
import SemanticEditor from '@/components/essay/SemanticEditor';
import GuestEssayPreview from '@/components/essay/GuestEssayPreview';
import AICommentsLoadingPane, { AI_COMMENTS_LOADING_STEPS } from '@/components/essay/AICommentsLoadingPane';
import { 
  Sparkles, 
  Lock, 
  Star,
  TrendingUp,
  MessageSquare,
  CheckCircle,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { GuestEssayMigrationService } from '@/services/guestEssayMigrationService';

interface IvyReadinessReportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface GradingScores {
  bigPicture: number;
  tone: number;
  clarity: number;
}

const IvyReadinessReport: React.FC<IvyReadinessReportProps> = ({ open, onOpenChange }) => {
  const [schoolName, setSchoolName] = useState('');
  const [essayPrompt, setEssayPrompt] = useState('');
  const [essayText, setEssayText] = useState('');
  const [document, setDocument] = useState<SemanticDocument | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [gradingScores, setGradingScores] = useState<GradingScores | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [guestEssayId, setGuestEssayId] = useState<string | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const hasNotifiedRef = useRef(false);

  // Track feature usage with webhook
  useEffect(() => {
    if (open && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true;
      notifyFeatureUsage();
    }
  }, [open]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setSchoolName('');
      setEssayPrompt('');
      setEssayText('');
      setDocument(null);
      setIsAnalyzing(false);
      setHasAnalyzed(false);
      setGradingScores(null);
      setSelectedAnnotation(null);
      setGuestEssayId(null);
      hasNotifiedRef.current = false;
    }
  }, [open]);

  // Notify webhook about feature usage (optional - graceful failure if edge function doesn't exist)
  const notifyFeatureUsage = async () => {
    try {
      // Call edge function to notify (if it exists)
      // This is optional analytics - don't block the feature if it fails
      const { error } = await supabase.functions.invoke('notify-ivy-readiness-usage', {
        body: {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          referrer: window.document.referrer || 'direct',
          schoolName: schoolName || null,
          hasPrompt: !!essayPrompt
        }
      });

      if (error) {
        // Silently fail - this is just analytics
        console.debug('Feature usage notification failed (optional):', error.message);
      }
    } catch (error) {
      // Silently fail - this is just analytics
      console.debug('Feature usage notification error (optional):', error);
    }
  };

  // Initialize document from essay text
  const initializeDocument = () => {
    // Validate required fields
    if (!schoolName.trim()) {
      toast({
        title: "School name required",
        description: "Please enter the school name for your essay.",
        variant: "destructive",
      });
      return;
    }

    if (!essayPrompt.trim()) {
      toast({
        title: "Essay prompt required",
        description: "Please enter the essay prompt or question.",
        variant: "destructive",
      });
      return;
    }

    if (!essayText.trim()) {
      toast({
        title: "Please enter your essay",
        description: "You need to paste or type your essay to get it scored.",
        variant: "destructive",
      });
      return;
    }

    const blocks = semanticDocumentService.convertHtmlToBlocks(essayText);
    const newDocument: SemanticDocument = {
      id: crypto.randomUUID(),
      title: `${schoolName} Essay`,
      blocks,
      metadata: {
        essayId: crypto.randomUUID(),
        prompt: essayPrompt,
        wordLimit: 650,
        schoolName: schoolName
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setDocument(newDocument);
  };

  // Analyze essay and generate comments
  const analyzeEssay = async () => {
    if (!document) {
      initializeDocument();
      return;
    }

    setIsAnalyzing(true);
    setLoadingStep(0);

    try {
      // Start AI generation in parallel with loading animation
      const aiGenerationPromise = semanticDocumentService.generateAIComments({
        documentId: document.id,
        blocks: document.blocks,
        context: {
          prompt: document.metadata.prompt,
          wordLimit: document.metadata.wordLimit,
          targetSchools: document.metadata.schoolName ? [document.metadata.schoolName] : undefined
        },
        isAnonymous: true // Anonymous mode - skip auth and database storage
      });

      // Simulate loading steps - Total: 30 seconds
      const stepDurations = [8000, 12000, 8000, 2000]; // Duration for each step in ms
      
      // Step through each loading phase
      for (let i = 0; i < AI_COMMENTS_LOADING_STEPS.length; i++) {
        setLoadingStep(i);
        await new Promise(resolve => setTimeout(resolve, stepDurations[i]));
      }

      // Wait for AI generation to complete
      const response = await aiGenerationPromise;

      if (!response.success) {
        throw new Error(response.message || 'Failed to generate AI comments');
      }

      // Convert SemanticComment[] to Annotation[]
      const annotations: Annotation[] = response.comments.map(semanticComment => ({
        id: crypto.randomUUID(),
        type: semanticComment.type,
        author: 'ai' as const,
        content: semanticComment.comment,
        targetBlockId: semanticComment.targetBlockId,
        targetText: semanticComment.targetText,
        createdAt: new Date(),
        updatedAt: new Date(),
        resolved: false,
        metadata: semanticComment.metadata
      }));

      // Add comments to document
      const updatedBlocks = document.blocks.map(block => {
        const blockComments = annotations.filter(c => c.targetBlockId === block.id);
        return {
          ...block,
          annotations: [...(block.annotations || []), ...blockComments]
        };
      });

      setDocument({
        ...document,
        blocks: updatedBlocks
      });

      // Extract grading scores from comment metadata
      // Big Picture: from metadata.qualityScore of big-picture agent (1-100 scale)
      // Tone: from metadata.qualityScore of tone agent (1-10 scale, convert to 1-100)
      // Clarity: from metadata.qualityScore of clarity agent (1-10 scale, convert to 1-100)
      
      // Find comments with quality scores for each agent type
      // Note: All comments from the same agent have the same qualityScore (it's the overall score for that agent)
      const bigPictureComments = annotations.filter(a => 
        a.metadata?.agentType === 'big-picture' && 
        a.metadata?.qualityScore !== undefined && 
        a.metadata?.qualityScore !== null
      );
      const toneComments = annotations.filter(a => 
        a.metadata?.agentType === 'tone' && 
        a.metadata?.qualityScore !== undefined && 
        a.metadata?.qualityScore !== null
      );
      const clarityComments = annotations.filter(a => 
        a.metadata?.agentType === 'clarity' && 
        a.metadata?.qualityScore !== undefined && 
        a.metadata?.qualityScore !== null
      );

      // Extract scores - all on 1-100 scale
      // Big Picture: Already on 1-100 scale
      let bigPictureScore: number;
      if (bigPictureComments.length > 0) {
        bigPictureScore = bigPictureComments[0].metadata!.qualityScore!;
        // Clamp to valid range (1-100)
        bigPictureScore = Math.max(1, Math.min(100, bigPictureScore));
        console.log(`[IvyReadinessReport] Big Picture score: ${bigPictureScore}/100`);
      } else {
        bigPictureScore = 75; // Default fallback (out of 100)
        console.warn('[IvyReadinessReport] No big-picture comments found, using default score:', bigPictureScore);
      }
      
      // Tone: Convert from 1-10 scale to 1-100 scale
      let toneScore: number;
      if (toneComments.length > 0) {
        const rawScore = toneComments[0].metadata!.qualityScore!;
        toneScore = rawScore * 10; // Convert 1-10 to 1-100
        // Clamp to valid range (1-100)
        toneScore = Math.max(1, Math.min(100, toneScore));
        console.log(`[IvyReadinessReport] Tone score: ${rawScore}/10 = ${toneScore}/100`);
      } else {
        toneScore = 80; // Default fallback (out of 100)
        console.warn('[IvyReadinessReport] No tone comments found, using default score:', toneScore);
      }
      
      // Clarity: Convert from 1-10 scale to 1-100 scale
      let clarityScore: number;
      if (clarityComments.length > 0) {
        const rawScore = clarityComments[0].metadata!.qualityScore!;
        clarityScore = rawScore * 10; // Convert 1-10 to 1-100
        // Clamp to valid range (1-100)
        clarityScore = Math.max(1, Math.min(100, clarityScore));
        console.log(`[IvyReadinessReport] Clarity score: ${rawScore}/10 = ${clarityScore}/100`);
      } else {
        clarityScore = 78; // Default fallback (out of 100)
        console.warn('[IvyReadinessReport] No clarity comments found, using default score:', clarityScore);
      }

      // Round to whole numbers and set scores (out of 100)
      const finalScores = {
        bigPicture: Math.round(bigPictureScore),
        tone: Math.round(toneScore),
        clarity: Math.round(clarityScore)
      };
      setGradingScores(finalScores);

      // Save guest essay to database for migration after signup
      if (document && annotations.length > 0) {
        const essayContent = document.blocks.map(b => b.content).join('\n\n');
        const savedGuestEssayId = await GuestEssayMigrationService.saveGuestEssay({
          title: document.title,
          schoolName: document.metadata.schoolName || null,
          promptText: document.metadata.prompt || essayPrompt,
          wordLimit: document.metadata.wordLimit?.toString() || '650',
          essayContent: essayContent,
          semanticDocument: {
            ...document,
            blocks: updatedBlocks
          },
          semanticAnnotations: annotations,
          gradingScores: finalScores
        });

        if (savedGuestEssayId) {
          setGuestEssayId(savedGuestEssayId);
          console.log('[IvyReadinessReport] Guest essay saved:', savedGuestEssayId);
        } else {
          console.warn('[IvyReadinessReport] Failed to save guest essay');
        }
      }

      setHasAnalyzed(true);
      setLoadingStep(AI_COMMENTS_LOADING_STEPS.length);
    } catch (error) {
      console.error('Failed to analyze essay:', error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "We couldn't analyze your essay. Please try again.",
        variant: "destructive",
      });
      setIsAnalyzing(false);
    }
  };

  // Get first sentence of comment
  const getFirstSentence = (text: string): string => {
    const match = text.match(/^[^.!?]+[.!?]/);
    return match ? match[0] : text.split('.')[0] + '.';
  };

  // Get rest of comment (to be blurred)
  const getRestOfComment = (text: string): string => {
    const firstSentence = getFirstSentence(text);
    return text.substring(firstSentence.length).trim();
  };

  // Handle sign up click
  const handleSignUp = () => {
    // Pass guest_essay_id to signup flow via URL params and localStorage
    const signupUrl = guestEssayId 
      ? `/signup?guest_essay_id=${guestEssayId}`
      : '/signup';
    
    // Also store in localStorage as backup
    if (guestEssayId) {
      localStorage.setItem('pending_guest_essay_id', guestEssayId);
    }
    
    navigate(signupUrl);
    onOpenChange(false);
  };

  // Handle discard essay
  const handleDiscardEssay = async () => {
    if (!guestEssayId) {
      // If no guest essay ID, just reset the component
      resetComponent();
      return;
    }

    setIsDiscarding(true);
    try {
      const success = await GuestEssayMigrationService.deleteGuestEssay(guestEssayId);
      
      if (success) {
        toast({
          title: "Essay discarded",
          description: "Your preview essay has been deleted.",
        });
        resetComponent();
      } else {
        toast({
          title: "Error",
          description: "Failed to discard essay. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error discarding essay:', error);
      toast({
        title: "Error",
        description: "An error occurred while discarding the essay.",
        variant: "destructive",
      });
    } finally {
      setIsDiscarding(false);
      setShowDiscardDialog(false);
    }
  };

  // Reset component state
  const resetComponent = () => {
    setSchoolName('');
    setEssayPrompt('');
    setEssayText('');
    setDocument(null);
    setIsAnalyzing(false);
    setHasAnalyzed(false);
    setGradingScores(null);
    setSelectedAnnotation(null);
    setGuestEssayId(null);
    hasNotifiedRef.current = false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center">
            Ivy Readiness Report
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            Check if your essay is at the Ivy-League Level
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Essay Input Section */}
          {!document && (
            <Card>
              <CardHeader>
                <CardTitle>Enter Your Essay Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* School Name Input */}
                <div className="space-y-2">
                  <Label htmlFor="school-name">
                    School Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="school-name"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="e.g., Harvard University, Stanford University..."
                    className="text-base"
                    required
                  />
                </div>

                {/* Essay Prompt Input */}
                <div className="space-y-2">
                  <Label htmlFor="essay-prompt">
                    Essay Prompt <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="essay-prompt"
                    value={essayPrompt}
                    onChange={(e) => setEssayPrompt(e.target.value)}
                    placeholder="Paste the essay prompt or question here..."
                    className="min-h-[100px] text-base"
                    required
                  />
                </div>

                {/* Essay Content Input */}
                <div className="space-y-2">
                  <Label htmlFor="essay-content">
                    Your Essay <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="essay-content"
                    value={essayText}
                    onChange={(e) => setEssayText(e.target.value)}
                    placeholder="Paste your essay here to get it scored by our Harvard-grade AI..."
                    className="min-h-[300px] text-base"
                    required
                  />
                </div>

                <Button
                  onClick={initializeDocument}
                  disabled={!schoolName.trim() || !essayPrompt.trim() || !essayText.trim()}
                  className="w-full"
                  style={{ backgroundColor: '#D07D00' }}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Continue to Analysis
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Analysis Section */}
          {document && !hasAnalyzed && (
            <Card>
              <CardHeader>
                <CardTitle>Ready to Analyze</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={analyzeEssay}
                  disabled={isAnalyzing}
                  className="w-full"
                  style={{ backgroundColor: '#D07D00' }}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Essay'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Loading Pane */}
          {isAnalyzing && (
            <AICommentsLoadingPane
              isOpen={isAnalyzing}
              currentStep={loadingStep}
              onClose={() => {}}
            />
          )}

          {/* Results Section */}
          {hasAnalyzed && document && (
            <div className="space-y-6">
              {/* Header with Discard Button */}
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-sm">
                  Essay saved temporarily • Expires in 7 days
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDiscardDialog(true)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Discard Essay
                </Button>
              </div>

              {/* Grading Scores */}
              {gradingScores && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5" style={{ color: '#D07D00' }} />
                      Overall Scores
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold" style={{ color: '#D07D00' }}>
                          {gradingScores.bigPicture}/100
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">Big Picture</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold" style={{ color: '#D07D00' }}>
                          {gradingScores.tone}/100
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">Tone</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold" style={{ color: '#D07D00' }}>
                          {gradingScores.clarity}/100
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">Clarity</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Essay Preview with Blurred Comments (Guest-specific component) */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Essay with AI Feedback</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <GuestEssayPreview
                    document={document}
                    selectedAnnotationId={selectedAnnotation?.id}
                    onAnnotationSelect={setSelectedAnnotation}
                    onSignUp={handleSignUp}
                    className="min-h-[600px]"
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Discard Essay Confirmation Dialog */}
          <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Discard Essay
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to discard this essay? This action cannot be undone.
                  <br /><br />
                  Your preview essay and all AI feedback will be permanently deleted. If you want to save it, please sign up first.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDiscarding}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDiscardEssay}
                  disabled={isDiscarding}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDiscarding ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Discarding...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Discard Essay
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IvyReadinessReport;

