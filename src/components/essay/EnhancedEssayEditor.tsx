import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  PenTool, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  Minimize2,
  Maximize2,
  Lightbulb,
  Sparkles,
  Edit3,
  Bot,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTipTapEssayEditor } from '@/hooks/useTipTapEssayEditor';
import CommentableTipTapEditor from './CommentableTipTapEditor';
import EssayCommentsPanel from './EssayCommentsPanel';
import LoadingPane from '@/components/ui/LoadingPane';
import { AICommentService } from '@/services/aiCommentService';
import { extractParagraphsFromDocument } from '@/utils/proseMirrorUtils';
import { CommentService, Comment } from '@/services/commentService';
import { EssayVersionService, EssayCheckpoint } from '@/services/essayVersionService';
import { EssayService } from '@/services/essayService';
import EssayVersionSelector from './EssayVersionSelector';
import FreshDraftModal from './FreshDraftModal';
import { supabase } from '@/integrations/supabase/client';
import './TipTapEditor.css';

interface EnhancedEssayEditorProps {
  essayId: string;
  title: string;
  prompt?: string;
  wordLimit?: number;
  onTitleChange?: (newTitle: string) => void;
}

const EnhancedEssayEditor: React.FC<EnhancedEssayEditorProps> = ({ 
  essayId, 
  title, 
  prompt, 
  wordLimit = 650,
  onTitleChange 
}) => {
  const {
    htmlContent,
    loading,
    saving,
    lastSaved,
    hasUnsavedChanges,
    updateHtmlContent,
    forceSave,
    wordCount,
    characterCount
  } = useTipTapEssayEditor(essayId);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDiyaHelpPanel, setShowDiyaHelpPanel] = useState(true);
  const [rightPanelMode, setRightPanelMode] = useState<'comments' | 'diya'>('diya');
  const [aiFeedbackGenerated, setAiFeedbackGenerated] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [currentCheckpoint, setCurrentCheckpoint] = useState<any>(null);
  
  // Version management state
  const [currentVersion, setCurrentVersion] = useState<EssayCheckpoint | null>(null);
  const [allVersions, setAllVersions] = useState<EssayCheckpoint[]>([]);
  const [showFreshDraftModal, setShowFreshDraftModal] = useState(false);
  const [showComments, setShowComments] = useState(true);
  
  // Loading pane state
  const [showLoadingPane, setShowLoadingPane] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  
  // Define loading steps for essay feedback (30 seconds total)
  const loadingSteps = [
    {
      id: 'analyzing-story',
      label: 'Analyzing your story',
      description: 'Understanding your narrative and themes'
    },
    {
      id: 'gentle-suggestions',
      label: 'Making gentle suggestions',
      description: 'Identifying areas for improvement with care'
    },
    {
      id: 'not-so-gentle-suggestions',
      label: 'Making not so gentle suggestions',
      description: 'Providing honest, constructive feedback'
    },
    {
      id: 'bringing-out-awesomeness',
      label: 'Bringing out your awesomeness',
      description: 'Highlighting your strengths and potential'
    }
  ];

  // Load comments for the essay
  const loadComments = async () => {
    try {
      const essayComments = await CommentService.getAllCommentsForEssay(essayId);
      setComments(essayComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  // Check if AI feedback has already been generated and load comments
  useEffect(() => {
    const checkExistingAIComments = async () => {
      try {
        // Load all versions first (this may activate a version if needed)
        await loadAllVersions();
        
        // Then load current version
        await loadCurrentVersion();
        
        // Check if current version has AI feedback
        const activeVersion = await EssayVersionService.getActiveVersion(essayId);
        const hasAIFeedback = activeVersion?.has_ai_feedback || false;
        setAiFeedbackGenerated(hasAIFeedback);
        
        // Load comments if they exist
        if (hasAIFeedback) {
          await loadComments();
        }
      } catch (error) {
        console.error('Error checking existing AI comments:', error);
      }
    };

    if (essayId) {
      checkExistingAIComments();
    }
  }, [essayId]);

  // Load current active version
  const loadCurrentVersion = async () => {
    try {
      const activeVersion = await EssayVersionService.getActiveVersion(essayId);
      
      if (!activeVersion) {
        console.log('No active version found, creating initial checkpoint');
        // If no active version exists, create one from the current essay content
        await ensureActiveCheckpoint();
        // Try to get the active version again
        const newActiveVersion = await EssayVersionService.getActiveVersion(essayId);
        setCurrentVersion(newActiveVersion);
      } else {
        setCurrentVersion(activeVersion);
      }
      
      // If we have a new version, hide comments by default
      if (activeVersion?.is_fresh_draft) {
        setShowComments(false);
      }
    } catch (error) {
      console.error('Error loading current version:', error);
    }
  };

  // Ensure essay has an active checkpoint
  const ensureActiveCheckpoint = async () => {
    try {
      // Get the essay content
      const essay = await EssayService.getEssay(essayId);
      
      // Create a fresh draft checkpoint from the current essay content
      await EssayVersionService.createFreshDraft({
        essayId,
        essayContent: essay.content.blocks.map(block => block.content).join('\n\n'),
        essayTitle: essay.title,
        essayPrompt: essay.prompt_id ? 'Essay prompt' : undefined, // We'd need to fetch the actual prompt
        versionName: 'Initial Version'
      });
      
      console.log('Created initial checkpoint for essay');
    } catch (error) {
      console.error('Error creating initial checkpoint:', error);
    }
  };

  // Load all versions for the essay
  const loadAllVersions = async () => {
    try {
      const versions = await EssayVersionService.getEssayVersions(essayId);
      setAllVersions(versions);
      
      // If there are versions but no active one, activate the latest
      if (versions.length > 0 && !versions.some(v => v.is_active)) {
        console.log('Found versions but no active one, activating the latest');
        const latestVersion = versions[0]; // Versions are ordered by version_number desc
        await EssayVersionService.switchToVersion(latestVersion.id);
        
        // Reload versions after switching
        const updatedVersions = await EssayVersionService.getEssayVersions(essayId);
        setAllVersions(updatedVersions);
      }
    } catch (error) {
      console.error('Error loading all versions:', error);
    }
  };

  // Calculate word limit status
  const getWordLimitStatus = () => {
    const percentage = (wordCount / wordLimit) * 100;
    if (percentage >= 100) return { color: 'destructive', icon: AlertCircle };
    if (percentage >= 90) return { color: 'warning', icon: AlertCircle };
    return { color: 'default', icon: CheckCircle2 };
  };

  const wordLimitStatus = getWordLimitStatus();

  // Check if essay has content (for brainstorm button)
  const hasContent = wordCount > 0;

  // Calculate minimum words needed for essay feedback (50% of word limit)
  const minWordsForFeedback = Math.ceil(wordLimit * 0.5);
  const canUseEssayFeedback = wordCount >= minWordsForFeedback;

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };


  // Handle brainstorm essay ideas
  const handleBrainstormIdeas = () => {
    // TODO: Implement brainstorm functionality
    console.log('Brainstorm essay ideas clicked');
  };

  // Version management handlers
  const handleVersionChange = async (version: EssayCheckpoint) => {
    setCurrentVersion(version);
    
    // Update the editor content with the version's content
    updateHtmlContent(version.essay_content);
    
    // Reload comments for this version
    await loadComments();
    
    // Show/hide comments based on version type
    setShowComments(!version.is_fresh_draft);
    
    // Update AI feedback state based on version
    setAiFeedbackGenerated(version.has_ai_feedback || false);
    
    // Reload all versions to update editable status
    await loadAllVersions();
  };

  // Determine if the current version is editable
  const isCurrentVersionEditable = () => {
    if (!currentVersion) {
      console.log('No current version found');
      return false;
    }
    
    // If there are no versions at all, allow editing (fallback for essays without checkpoints)
    if (allVersions.length === 0) {
      console.log('No versions found, allowing editing as fallback');
      return true;
    }
    
    // A version is editable if it's the active version AND there are no newer versions
    const hasNewerVersions = allVersions.some(version => 
      version.version_number > currentVersion.version_number
    );
    
    console.log('Version editability check:', {
      currentVersion: currentVersion.version_number,
      isActive: currentVersion.is_active,
      hasNewerVersions,
      totalVersions: allVersions.length,
      allVersionNumbers: allVersions.map(v => v.version_number)
    });
    
    return currentVersion.is_active && !hasNewerVersions;
  };

  const handleFreshDraft = () => {
    setShowFreshDraftModal(true);
  };

  const handleFreshDraftCreated = async (version: EssayCheckpoint) => {
    setCurrentVersion(version);
    setShowComments(false); // Hide comments for new version
    setAiFeedbackGenerated(false); // Reset AI feedback state for new version
    await Promise.all([
      loadCurrentVersion(), // Refresh current version
      loadAllVersions() // Refresh all versions list
    ]);
  };

  // Handle help improve essay
  const handleHelpImproveEssay = async () => {
    try {
      setIsGeneratingAI(true);
      setShowLoadingPane(true);
      setLoadingStepIndex(0);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if AI comments already exist for the current version
      if (currentVersion?.has_ai_feedback) {
        alert('AI feedback has already been generated for this version. Create a new version to get new feedback.');
        return;
      }

      // Get essay content (send HTML to backend for proper paragraph processing)
      const essayContent = htmlContent; // Send HTML content directly
      
      if (essayContent.length < 50) {
        alert('Please write at least 50 characters before requesting AI feedback.');
        return;
      }

      // Simulate progress through loading steps (30 seconds total, 7.5 seconds per step)
      const progressStep = (stepIndex: number) => {
        setLoadingStepIndex(stepIndex);
        return new Promise(resolve => setTimeout(resolve, 7500)); // 7.5 seconds per step
      };

      // Step 1: Analyzing your story
      await progressStep(0);
      
      // Step 2: Making gentle suggestions
      await progressStep(1);
      
      // Step 3: Making not so gentle suggestions
      await progressStep(2);
      
      // Step 4: Bringing out your awesomeness
      await progressStep(3);

      // Use orchestrator system directly (skip contextual anchoring for now)
      console.log('Using Multi-Agent Orchestrator system for AI comment generation...');
      const response = await AICommentService.generateAIComments({
        essayId,
        essayContent,
        essayPrompt: prompt,
        essayTitle: title,
        userId: user.id
      });
      
      if (response.success) {
        setAiFeedbackGenerated(true);
        setCurrentCheckpoint((response as any).checkpoint);
        // Load the newly generated comments
        await loadComments();
        await loadCurrentVersion(); // Refresh current version
        setShowComments(true); // Show comments for AI feedback version
        setRightPanelMode('comments'); // Switch to comments mode to show new feedback
        console.log('✅ Multi-Agent AI feedback generated successfully:', response.comments.length, 'comments');
      } else {
        throw new Error(response.message);
      }

      // Complete the loading
      setLoadingStepIndex(4);
    } catch (error) {
      console.error('Error generating AI feedback:', error);
      alert(`Failed to generate AI feedback: ${error.message}`);
    } finally {
      setIsGeneratingAI(false);
      setShowLoadingPane(false);
      setLoadingStepIndex(0);
    }
  };

  // Fullscreen view
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col" style={{
        background: 'linear-gradient(135deg, rgb(254, 253, 250) 0%, rgb(254, 252, 245) 50%, rgb(253, 250, 240) 100%)'
      }}>
        {/* Control buttons - floating in top right */}
        <div className="absolute top-4 right-4 z-20 flex items-center space-x-3">
          {/* Version Management */}
          <div className="bg-white rounded-lg shadow-lg p-2">
            <EssayVersionSelector
              essayId={essayId}
              currentVersion={currentVersion}
              allVersions={allVersions}
              onVersionChange={handleVersionChange}
              onFreshDraft={handleFreshDraft}
            />
          </div>
          
          {/* Exit Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
          >
            <Minimize2 className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Fullscreen Content Container */}
        <div className="flex-1 flex items-start justify-center pt-8 md:pt-12 px-4 md:px-8 overflow-auto relative z-10">                                                                                                            
          <div className="w-full max-w-[1400px] flex gap-6 justify-center">
            {/* Main Essay Area - Centered */}
            <div className="flex-1 max-w-none">
            
            {/* University/Essay Title at Top */}
            <div className="mb-6 md:mb-8 text-center">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{title}</h1>
              
              {/* Saved timestamp below title */}
              {lastSaved && !hasUnsavedChanges && (
                <div className="mb-3">
                  <span className="flex items-center justify-center space-x-2 text-green-600 text-sm">
                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                    <span>Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </span>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6 text-sm text-gray-600">
                <span className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>{wordCount}/{wordLimit} words</span>
                </span>
                <span className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                  <span>{characterCount} characters</span>
                </span>
                {hasUnsavedChanges && (
                  <span className="flex items-center space-x-2 text-orange-600">
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
                    <span>Saving...</span>
                  </span>
                )}
              </div>
            </div>
            
            {/* Prompt Section - Full Width */}
            {prompt && (
              <div className="bg-white p-4 md:p-8 rounded-xl shadow-lg border border-gray-300 relative overflow-hidden group hover:shadow-xl transition-shadow duration-300 mb-6 md:mb-8">
                {/* Subtle accent line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="flex-shrink-0 self-center sm:self-start sm:mt-1">
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                      <PenTool className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-3 flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0">
                      <span>Essay Prompt</span>
                      <div className="sm:ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full self-start">
                        Required
                      </div>
                    </h3>
                    <div className="prose prose-gray max-w-none">
                      <p className="text-gray-700 leading-relaxed text-base md:text-lg m-0">{prompt}</p>
                    </div>
                  </div>
                </div>
                
                {/* Word limit reminder */}
                <div className="mt-4 md:mt-6 pt-4 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 text-sm">
                    <span className="text-gray-500 flex items-center">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                      Remember to stay within the word limit
                    </span>
                    <span className="text-gray-600 font-medium">{wordLimit} words max</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Essay and Comments Row */}
            <div className="grid grid-cols-[1fr_320px] gap-6 mb-6 md:mb-8">
              {/* Essay Writing Area */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-300 min-h-[300px] flex flex-col">
                {/* Simple Header */}
                <div className="p-3 md:p-4 border-b bg-gray-50/30">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base md:text-lg font-medium text-gray-700">Your Essay</h2>
                    {!isCurrentVersionEditable() && (
                      <div className="flex items-center space-x-2 text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        <span>📖</span>
                        <span>Read-only</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Essay Content */}
                <div className="p-4 md:p-6">
                  <CommentableTipTapEditor
                    content={htmlContent}
                    onChange={updateHtmlContent}
                    essayId={essayId}
                    placeholder="Start writing your essay here...

Use this fullscreen mode for distraction-free writing. Your content will be automatically structured and saved."
                    className="w-full"
                    editable={isCurrentVersionEditable()}
                    showToolbar={isCurrentVersionEditable()}
                    onCommentHover={setHoveredCommentId}
                    onCommentSelect={setSelectedCommentId}
                    onCommentsChange={setComments}
                    selectedCommentId={selectedCommentId}
                  />
                </div>
              </div>
              
              {/* Comments Panel - Right Sidebar - Aligned with Essay Only */}
              {aiFeedbackGenerated && comments.length > 0 && (
                <div className="flex flex-col space-y-4">
                  {/* Current Checkpoint Info */}
                  {currentCheckpoint && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="text-sm font-medium">Checkpoint {currentCheckpoint.checkpointNumber}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {currentCheckpoint.totalComments} comments • Quality: {(currentCheckpoint.averageQualityScore * 100).toFixed(0)}%
                      </div>
                    </div>
                  )}
                  
                  <EssayCommentsPanel
                    essayId={essayId}
                    comments={comments}
                    onCommentsChange={setComments}
                    onCommentHover={setHoveredCommentId}
                    onCommentSelect={setSelectedCommentId}
                  />
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <Card className="h-full shadow-sm">
        <CardContent className="p-12 text-center h-full flex flex-col items-center justify-center">
          <Clock className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading essay...</p>
        </CardContent>
      </Card>
    );
  }

  if (!htmlContent && !loading) {
    return (
      <Card className="h-full shadow-sm">
        <CardContent className="p-12 text-center h-full flex flex-col items-center justify-center">
          <PenTool className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Essay not found</h3>
          <p className="text-muted-foreground">Unable to load the essay content.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`grid gap-6 h-full ${showDiyaHelpPanel ? 'grid-cols-12' : 'grid-cols-1'}`}>
      {/* Main Editor - responsive columns */}
      <div className={showDiyaHelpPanel ? 'col-span-8' : 'col-span-1'}>
        <Card className="h-full shadow-sm bg-background flex flex-col">
          {/* Header */}
          <CardHeader className="border-b bg-muted/30 pb-4 flex-shrink-0">
            <div className="space-y-4">
              <CardTitle className="flex items-center justify-between min-w-0">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <span className="text-lg truncate">{title}</span>
                  {!isCurrentVersionEditable() && (
                    <div className="flex items-center space-x-2 text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">
                      <span>📖</span>
                      <span>Read-only</span>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={toggleFullscreen}
                    className="flex items-center"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              
              {/* Save Status below title */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 min-w-0">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {hasUnsavedChanges && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>Saving...</span>
                    </div>
                  )}
                  
                  {lastSaved && !hasUnsavedChanges && (
                    <div className="flex items-center text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
                      <span>Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>
                
                {/* Version Management */}
                <div className="flex-shrink-0">
                  <EssayVersionSelector
                    essayId={essayId}
                    currentVersion={currentVersion}
                    allVersions={allVersions}
                    onVersionChange={handleVersionChange}
                    onFreshDraft={handleFreshDraft}
                  />
                </div>
              </div>
              
              {/* Prompt */}
              {prompt && (
                <div className="text-base leading-relaxed bg-muted p-3 rounded-lg">
                  <strong>Prompt:</strong> {prompt}
                </div>
              )}
              
              {/* Stats */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <span>{characterCount} characters</span>
                </div>
                
                <Badge 
                  variant={wordLimitStatus.color as any}
                  className="flex items-center space-x-1"
                >
                  <wordLimitStatus.icon className="h-3 w-3" />
                  <span>{wordCount}/{wordLimit} words</span>
                </Badge>
              </div>
            </div>
          </CardHeader>

          {/* Content */}
          <CardContent className="p-0 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <div className="p-8">
                <CommentableTipTapEditor
                  content={htmlContent}
                  onChange={updateHtmlContent}
                  essayId={essayId}
                  placeholder="Start writing your essay here...

Use formatting options to structure your essay. Your content will be automatically saved."
                  className="w-full"
                  editable={isCurrentVersionEditable()}
                  showToolbar={isCurrentVersionEditable()}
                  onCommentHover={setHoveredCommentId}
                  onCommentSelect={setSelectedCommentId}
                  onCommentsChange={setComments}
                  selectedCommentId={selectedCommentId}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - 4 columns, conditionally rendered */}
      {showDiyaHelpPanel && (
        <div className="col-span-4 h-full flex flex-col">
          {/* Panel Mode Toggle Menu */}
          <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
            <button
              onClick={() => setRightPanelMode('comments')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                rightPanelMode === 'comments'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Comments
            </button>
            <button
              onClick={() => setRightPanelMode('diya')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                rightPanelMode === 'diya'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Ask Diya
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-hidden">
            {rightPanelMode === 'comments' ? (
              aiFeedbackGenerated && comments.length > 0 ? (
                /* Comments Panel */
                <EssayCommentsPanel
                  essayId={essayId}
                  comments={comments}
                  essayContent={htmlContent}
                  onCommentsChange={setComments}
                  onCommentHover={setHoveredCommentId}
                  onCommentSelect={setSelectedCommentId}
                />
              ) : (
                /* No Comments Message */
                <Card className="shadow-sm h-full flex flex-col">
                  <CardContent className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                        <MessageSquare className="h-8 w-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No comments yet!</h3>
                        <p className="text-gray-600 text-sm">
                          Write your essay draft to let Diya work her magic.
                        </p>
                      </div>
                      <Button
                        onClick={handleHelpImproveEssay}
                        disabled={isGeneratingAI || htmlContent.length < 50}
                        className="mt-4"
                      >
                        {isGeneratingAI ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating Feedback...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Get AI Feedback
                          </>
                        )}
                      </Button>
                      {htmlContent.length < 50 && (
                        <p className="text-xs text-gray-500 mt-2">
                          Write more of your essay to let Diya provide the best feedback possible.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            ) : (
              /* Diya Help Panel */
              <Card className="shadow-sm h-full flex flex-col">
                <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-orange-100 pb-4">
                  <CardTitle className="text-2xl flex items-center justify-center space-x-3">
                    <Sparkles className="h-7 w-7 text-orange-600" />
                    <span className="text-orange-800 font-bold">Diya can help</span>
                  </CardTitle>
                </CardHeader>
              
              <CardContent className="p-6 flex flex-col space-y-6 flex-1 overflow-y-auto">
                <TooltipProvider delayDuration={300}>
                  {/* Brainstorm Essay Ideas Button */}
                  {hasContent ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button
                            onClick={handleBrainstormIdeas}
                            disabled={hasContent}
                            className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground border-0 flex items-center justify-center rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="text-sm font-semibold">Brainstorm</span>
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Brainstorming works best on blank sheets. Please remove any writing to start fresh with Diya!</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Button
                      onClick={handleBrainstormIdeas}
                      className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground border-0 flex items-center justify-center rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <span className="text-sm font-semibold">Brainstorm</span>
                    </Button>
                  )}

                  {/* Help Improve My Essay Button */}
                  {(!canUseEssayFeedback && !aiFeedbackGenerated && !isGeneratingAI) ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button
                            onClick={handleHelpImproveEssay}
                            disabled={aiFeedbackGenerated || isGeneratingAI || !canUseEssayFeedback}
                            className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground border-0 flex items-center justify-center rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="text-sm font-semibold">Essay Feedback</span>
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Please write more of your essay to let Diya do her magic! (Minimum {minWordsForFeedback} words)</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Button
                      onClick={handleHelpImproveEssay}
                      disabled={aiFeedbackGenerated || isGeneratingAI || !canUseEssayFeedback}
                      className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground border-0 flex items-center justify-center rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingAI ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          <span className="text-sm font-semibold">Generating AI Feedback...</span>
                        </>
                      ) : aiFeedbackGenerated ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          <span className="text-sm font-semibold">AI Feedback Complete</span>
                        </>
                      ) : (
                        <span className="text-sm font-semibold">Essay Feedback</span>
                      )}
                    </Button>
                  )}
                </TooltipProvider>

                {/* Help Text */}
                <div className="mt-4 p-5 bg-orange-50 rounded-lg border border-orange-100">
                  <h4 className="text-base font-bold text-orange-900 mb-4 text-center">How Diya can help:</h4>
                  <div className="space-y-4 text-sm text-orange-800 leading-relaxed">
                    <div className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-orange-200 text-orange-800 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                      <p>Diya Brainstorming is best when you are in very early stages of your essay and are figuring out themes and ideas.</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-orange-200 text-orange-800 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                      <p>Diya Essay Feedback is best when you have a draft ready of your essay and want to focus on making your story shine through your writing. Diya provides detailed comments on your essay and helps you improve specific parts of it.</p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-orange-200 text-orange-800 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                      <p>Remember, each feature can only be used once per essay so utilize when you're ready to go!</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            )}
          </div>
        </div>
      )}

      {/* Loading Pane */}
      <LoadingPane
        isVisible={showLoadingPane}
        steps={loadingSteps}
        currentStepIndex={loadingStepIndex}
        onComplete={() => {
          // Small delay to show completion state, then close
          setTimeout(() => {
            setShowLoadingPane(false);
            setLoadingStepIndex(0);
          }, 1500);
        }}
      />

      {/* New Version Modal */}
      <FreshDraftModal
        isOpen={showFreshDraftModal}
        onClose={() => setShowFreshDraftModal(false)}
        essayId={essayId}
        currentContent={htmlContent}
        essayTitle={title}
        essayPrompt={prompt}
        onFreshDraftCreated={handleFreshDraftCreated}
      />
    </div>
  );
};

export default EnhancedEssayEditor;
