/**
 * Ivy Readiness Report
 * 
 * Free essay scoring feature for landing page users.
 * Shows first sentence of comments, blurs the rest, and provides grading.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SemanticDocument, Annotation, DocumentBlock } from '@/types/semanticDocument';
import { semanticDocumentService } from '@/services/semanticDocumentService';
import SemanticEditor from '@/components/essay/SemanticEditor';
import AICommentsLoadingPane, { AI_COMMENTS_LOADING_STEPS } from '@/components/essay/AICommentsLoadingPane';
import { 
  Sparkles, 
  Lock, 
  Star,
  TrendingUp,
  MessageSquare,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
      hasNotifiedRef.current = false;
    }
  }, [open]);

  // Notify webhook about feature usage
  const notifyFeatureUsage = async () => {
    try {
      // Call edge function to notify
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
        console.error('Failed to notify feature usage:', error);
      }
    } catch (error) {
      console.error('Error notifying feature usage:', error);
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
      // Big Picture: from metadata.qualityScore of big-picture agent (1-100 scale, convert to 1-10)
      // Tone: from metadata.qualityScore of tone agent (1-10 scale)
      // Clarity: from metadata.qualityScore of clarity agent (1-10 scale)
      
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

      // Extract scores
      // Big Picture: Convert from 1-100 scale to 1-10 scale
      let bigPictureScore: number;
      if (bigPictureComments.length > 0) {
        const rawScore = bigPictureComments[0].metadata!.qualityScore!;
        bigPictureScore = rawScore / 10; // Convert 1-100 to 1-10
        // Clamp to valid range (1-10)
        bigPictureScore = Math.max(1, Math.min(10, bigPictureScore));
        console.log(`[IvyReadinessReport] Big Picture score: ${rawScore}/100 = ${bigPictureScore}/10`);
      } else {
        bigPictureScore = 7.5; // Default fallback
        console.warn('[IvyReadinessReport] No big-picture comments found, using default score:', bigPictureScore);
      }
      
      // Tone: Already on 1-10 scale
      let toneScore: number;
      if (toneComments.length > 0) {
        toneScore = toneComments[0].metadata!.qualityScore!;
        // Clamp to valid range (1-10)
        toneScore = Math.max(1, Math.min(10, toneScore));
        console.log(`[IvyReadinessReport] Tone score: ${toneScore}/10`);
      } else {
        toneScore = 8.0; // Default fallback
        console.warn('[IvyReadinessReport] No tone comments found, using default score:', toneScore);
      }
      
      // Clarity: Already on 1-10 scale
      let clarityScore: number;
      if (clarityComments.length > 0) {
        clarityScore = clarityComments[0].metadata!.qualityScore!;
        // Clamp to valid range (1-10)
        clarityScore = Math.max(1, Math.min(10, clarityScore));
        console.log(`[IvyReadinessReport] Clarity score: ${clarityScore}/10`);
      } else {
        clarityScore = 7.8; // Default fallback
        console.warn('[IvyReadinessReport] No clarity comments found, using default score:', clarityScore);
      }

      // Round to 1 decimal place and set scores
      setGradingScores({
        bigPicture: Math.round(bigPictureScore * 10) / 10,
        tone: Math.round(toneScore * 10) / 10,
        clarity: Math.round(clarityScore * 10) / 10
      });

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
    navigate('/signup');
    onOpenChange(false);
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
                          {gradingScores.bigPicture}/10
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">Big Picture</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold" style={{ color: '#D07D00' }}>
                          {gradingScores.tone}/10
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">Tone</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold" style={{ color: '#D07D00' }}>
                          {gradingScores.clarity}/10
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">Clarity</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Essay Editor with Blurred Comments */}
              <Card>
                <CardHeader>
                  <CardTitle>Your Essay with AI Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <SemanticEditor
                    documentId={document.id}
                    essayId={document.metadata.essayId || ''}
                    title={document.title}
                    initialContent={document.blocks.map(b => b.content).join('\n')}
                    readOnly={true}
                    showCommentSidebar={true}
                    selectedAnnotationId={selectedAnnotation?.id}
                    onAnnotationSelect={setSelectedAnnotation}
                    blurComments={true}
                    onSignUp={handleSignUp}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IvyReadinessReport;

