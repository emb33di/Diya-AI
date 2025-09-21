/**
 * Semantic Essay Editor
 * 
 * A complete essay editor built on the new semantic document architecture.
 * Provides Google Docs-like commenting experience with stable AI integration.
 */

import React, { useState, useEffect } from 'react';
import { SemanticDocument, Annotation } from '@/types/semanticDocument';
import { semanticDocumentService } from '@/services/semanticDocumentService';
import { ExportService } from '@/services/exportService';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import SemanticEditor from './SemanticEditor';
import CommentOverlay from './CommentOverlay';
import AICommentsLoadingPane, { AI_COMMENTS_LOADING_STEPS } from './AICommentsLoadingPane';
import GrammarLoadingPane, { GRAMMAR_LOADING_STEPS } from './GrammarLoadingPane';
import DiyaScoreReport from './DiyaScoreReport';
import { ScoreReportService, AgentScores } from '@/services/scoreReportService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { 
  FileText, 
  MessageSquare, 
  Sparkles, 
  Download, 
  Upload,
  CheckCircle,
  AlertCircle,
  FileDown,
  FileText as FileTextIcon,
  CheckSquare,
  Sidebar,
  Star
} from 'lucide-react';

interface EssayPrompt {
  id: string;
  prompt: string;
  prompt_number?: string;
  is_required?: boolean;
  word_limit?: string;
  has_draft?: boolean;
  draft_status?: 'draft' | 'review' | 'final' | 'submitted';
  prompt_selection_type?: string;
  how_many?: string;
}

interface SemanticEssayEditorProps {
  essayId: string;
  title: string;
  prompt?: string;
  prompts?: EssayPrompt[];
  selectedPromptId?: string;
  onPromptChange?: (promptId: string) => void;
  wordLimit?: number;
  initialContent?: string;
  onTitleChange?: (newTitle: string) => void;
  onContentChange?: (content: string) => void;
  className?: string;
}

const SemanticEssayEditor: React.FC<SemanticEssayEditorProps> = ({
  essayId,
  title,
  prompt,
  prompts = [],
  selectedPromptId,
  onPromptChange,
  wordLimit = 650,
  initialContent = '',
  onTitleChange,
  onContentChange,
  className = ''
}) => {
  const [document, setDocument] = useState<SemanticDocument | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [showCommentSidebar, setShowCommentSidebar] = useState(true);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingAIComments, setIsGeneratingAIComments] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isGeneratingGrammar, setIsGeneratingGrammar] = useState(false);
  const [grammarLoadingStep, setGrammarLoadingStep] = useState(0);
  const [noGrammarErrorsFound, setNoGrammarErrorsFound] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{
    isMigrating: boolean;
    progress: number;
    message: string;
  }>({
    isMigrating: false,
    progress: 0,
    message: ''
  });
  const [bigPictureScore, setBigPictureScore] = useState<number | null>(null);
  const [hasAIComments, setHasAIComments] = useState(false);
  const [showScoreReport, setShowScoreReport] = useState(false);
  const [agentScores, setAgentScores] = useState<AgentScores>({});

  // Toast for user feedback
  const { toast } = useToast();

  // Reload document when page becomes visible (handles tab switches, etc.)
  const handlePageVisible = async () => {
    if (document && essayId) {
      try {
        console.log('Page became visible, refreshing document data...');
        const refreshedDocument = await semanticDocumentService.loadDocumentByEssayId(essayId);
        if (refreshedDocument && refreshedDocument.updatedAt > document.updatedAt) {
          console.log('Document was updated externally, refreshing...');
          setDocument(refreshedDocument);
        }
      } catch (error) {
        console.warn('Failed to refresh document on page visibility:', error);
      }
    }
  };

  usePageVisibility(handlePageVisible);

  // Load or create document on mount
  useEffect(() => {
    const initializeDocument = async () => {
      setIsLoading(true);
      
      try {
        // Check if semantic document already exists for this essay
        const existingDocument = await semanticDocumentService.loadDocumentByEssayId(essayId);
        
        if (existingDocument) {
          console.log('Found existing document for essay:', essayId, 'document ID:', existingDocument.id);
          setDocument(existingDocument);
        } else {
          console.log('No existing document found for essay:', essayId, 'creating new one');
          
          // Check if there's any localStorage backup we should preserve
          const localStorageKeys = Object.keys(localStorage).filter(key => key.startsWith('semantic-doc-'));
          console.log('Existing localStorage backups:', localStorageKeys);
          
          // Try to recover from localStorage backups
          let recoveredDocument = null;
          for (const key of localStorageKeys) {
            try {
              const backup = localStorage.getItem(key);
              if (backup) {
                const parsedBackup = JSON.parse(backup);
                if (parsedBackup.metadata?.essayId === essayId && parsedBackup.blocks?.length > 0) {
                  console.log('Found localStorage backup with content for essay:', essayId);
                  recoveredDocument = parsedBackup;
                  break;
                }
              }
            } catch (e) {
              console.error('Failed to parse localStorage backup:', key, e);
            }
          }
          
          if (recoveredDocument) {
            console.log('Recovering document from localStorage:', recoveredDocument.id);
            try {
              // Save the recovered document to the database
              await semanticDocumentService.saveDocument(recoveredDocument);
              setDocument(recoveredDocument);
              setMigrationStatus({
                isMigrating: false,
                progress: 100,
                message: 'Recovered document from local backup'
              });
              return;
            } catch (error) {
              console.error('Failed to save recovered document:', error);
              // Continue with normal flow if recovery fails
            }
          }
          
          // Need to migrate from legacy system
          setMigrationStatus({
            isMigrating: true,
            progress: 0,
            message: 'Migrating from legacy system...'
          });

          // Create new semantic document directly
          const blocks = semanticDocumentService.convertHtmlToBlocks(initialContent);
          const document: SemanticDocument = {
            id: crypto.randomUUID(),
            title,
            blocks,
            metadata: {
              essayId,
              version: 1
            },
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Save the document
          await semanticDocumentService.saveDocument(document);
          setDocument(document);
          setMigrationStatus({
            isMigrating: false,
            progress: 100,
            message: 'Document created successfully'
          });

        }
      } catch (error) {
        console.error('Failed to initialize document:', error);
        setMigrationStatus({
          isMigrating: false,
          progress: 0,
          message: 'Failed to initialize document'
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeDocument();
  }, [essayId, title, initialContent]);

  // Fetch big picture score when essay changes
  useEffect(() => {
    fetchBigPictureScore();
  }, [essayId]);

  // Handle score report actions
  const handleViewComments = () => {
    // Force a re-render to show the comments
    setShowCommentSidebar(true);
    // Optionally scroll to comments section
    const commentsElement = window.document.querySelector('.comment-sidebar');
    if (commentsElement) {
      commentsElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCloseScoreReport = () => {
    setShowScoreReport(false);
  };

  // Handle document changes
  const handleDocumentChange = (updatedDocument: SemanticDocument) => {
    setDocument(updatedDocument);
    
    // Convert back to HTML for parent component
    if (onContentChange) {
      const htmlContent = semanticDocumentService.convertBlocksToHtml(updatedDocument.blocks);
      onContentChange(htmlContent);
    }
  };

  // Handle annotation selection
  const handleAnnotationSelect = (annotation: Annotation | null) => {
    console.log('SemanticEssayEditor: handleAnnotationSelect called with:', {
      annotation,
      annotationId: annotation?.id,
      annotationType: typeof annotation?.id,
      previousSelectedId: selectedAnnotation?.id
    });
    setSelectedAnnotation(annotation);
  };

  // Handle save status changes
  const handleSaveStatusChange = (isAutoSaving: boolean, lastSaved: Date | null) => {
    setIsAutoSaving(isAutoSaving);
    setLastSaved(lastSaved);
  };

  // Fetch big picture score from semantic annotations
  const fetchBigPictureScore = async () => {
    if (!essayId) return;
    
    try {
      // Use the ScoreReportService to get scores from semantic annotations with timeout
      const scores = await Promise.race([
        ScoreReportService.getAgentScores(essayId),
        new Promise<AgentScores>((_, reject) => 
          setTimeout(() => reject(new Error('Score fetch timeout')), 8000)
        )
      ]);
      
      if (scores.bigPicture !== undefined) {
        setBigPictureScore(scores.bigPicture);
        setHasAIComments(true);
      } else {
        // Check if there are any AI comments at all using semantic annotations
        try {
          const hasComments = await Promise.race([
            ScoreReportService.hasAIComments(essayId),
            new Promise<boolean>((_, reject) => 
              setTimeout(() => reject(new Error('Comments check timeout')), 5000)
            )
          ]);
          setHasAIComments(hasComments);
        } catch (commentError) {
          console.error('Error checking AI comments:', commentError);
          setHasAIComments(false);
        }
      }
    } catch (error) {
      console.error('Error fetching big picture score:', error);
      // Don't set hasAIComments to true if there's an error
      setHasAIComments(false);
    }
  };

  // Generate AI comments
  const generateAIComments = async () => {
    if (!document) return;

    setIsGeneratingAIComments(true);
    setLoadingStep(0);

    try {
      // Start AI generation in parallel with loading animation
      const aiGenerationPromise = semanticDocumentService.generateAIComments({
        documentId: document.id,
        blocks: document.blocks,
        context: {
          prompt: document.metadata.prompt,
          wordLimit: document.metadata.wordLimit
        }
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

      if (response.success) {
        // Add a small delay to ensure database insert is complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reload document to get updated comments
        const updatedDocument = await semanticDocumentService.loadDocument(document.id);
        if (updatedDocument) {
          setDocument(updatedDocument);
        }
        // Fetch updated big picture score
        await fetchBigPictureScore();
        
        // Fetch all agent scores and show score report
        const scores = await ScoreReportService.getAgentScores(essayId);
        setAgentScores(scores);
        setShowScoreReport(true);
      }

      // Mark as complete
      setLoadingStep(AI_COMMENTS_LOADING_STEPS.length);
    } catch (error) {
      console.error('Failed to generate AI comments:', error);
    } finally {
      // Reset after a short delay to show completion
      setTimeout(() => {
        setIsGeneratingAIComments(false);
        setLoadingStep(0);
      }, 1000);
    }
  };

  // Generate grammar comments
  const generateGrammarComments = async () => {
    if (!document) return;

    setIsGeneratingGrammar(true);
    setGrammarLoadingStep(0);

    try {
      // Start grammar generation in parallel with loading animation
      const grammarGenerationPromise = semanticDocumentService.generateGrammarComments({
        documentId: document.id,
        blocks: document.blocks,
        context: {
          prompt: document.metadata.prompt,
          wordLimit: document.metadata.wordLimit
        }
      });

      // Simulate loading steps - Total: 15 seconds
      const stepDurations = [5000, 8000, 2000]; // Duration for each step in ms
      
      // Step through each loading phase
      for (let i = 0; i < GRAMMAR_LOADING_STEPS.length; i++) {
        setGrammarLoadingStep(i);
        await new Promise(resolve => setTimeout(resolve, stepDurations[i]));
      }

      // Wait for grammar generation to complete
      const response = await grammarGenerationPromise;

      if (response.success) {
        // Check if no grammar comments were generated
        const hasGrammarComments = response.comments && response.comments.length > 0;
        setNoGrammarErrorsFound(!hasGrammarComments);
        
        // Add a small delay to ensure database insert is complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reload document to get updated comments
        const updatedDocument = await semanticDocumentService.loadDocument(document.id);
        if (updatedDocument) {
          setDocument(updatedDocument);
        }
      }

      // Mark as complete
      setGrammarLoadingStep(GRAMMAR_LOADING_STEPS.length);
    } catch (error) {
      console.error('Failed to generate grammar comments:', error);
    } finally {
      // Reset after a short delay to show completion
      setTimeout(() => {
        setIsGeneratingGrammar(false);
        setGrammarLoadingStep(0);
      }, 1000);
    }
  };

  // Export document as DOCX
  const exportAsDOCX = async () => {
    if (!document) return;

    try {
      const htmlContent = semanticDocumentService.convertBlocksToHtml(document.blocks);
      
      await ExportService.exportToDOCX({
        title: document.title,
        content: htmlContent,
        prompt: prompt || document.metadata.prompt,
        wordLimit: wordLimit || document.metadata.wordLimit
      });
      
      toast({
        title: "Export Successful",
        description: "Your essay has been exported as a DOCX file.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your essay. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Export document as PDF
  const exportAsPDF = async () => {
    if (!document) return;

    try {
      const htmlContent = semanticDocumentService.convertBlocksToHtml(document.blocks);
      
      await ExportService.exportToPDF({
        title: document.title,
        content: htmlContent,
        prompt: prompt || document.metadata.prompt,
        wordLimit: wordLimit || document.metadata.wordLimit
      });
      
      toast({
        title: "Export Successful",
        description: "Your essay has been exported as a PDF file.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "There was an error exporting your essay. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Calculate word count from document blocks
  const getCurrentWordCount = () => {
    if (!document) return 0;
    return document.blocks.reduce((total, block) => {
      const words = block.content.split(' ').filter(word => word.trim().length > 0);
      return total + words.length;
    }, 0);
  };

  // Get document statistics
  const getDocumentStats = () => {
    if (!document) return null;

    const allAnnotations = semanticDocumentService.getAllAnnotations(document);
    const aiAnnotations = allAnnotations.filter(a => a.author === 'ai');
    const userAnnotations = allAnnotations.filter(a => a.author === 'user');
    const resolvedAnnotations = allAnnotations.filter(a => a.resolved);

    // Count specialized agent comments
    const toneComments = aiAnnotations.filter(a => a.metadata?.agentType === 'tone').length;
    const clarityComments = aiAnnotations.filter(a => a.metadata?.agentType === 'clarity').length;
    const strengthsComments = aiAnnotations.filter(a => a.metadata?.agentType === 'strengths').length;
    const weaknessesComments = aiAnnotations.filter(a => a.metadata?.agentType === 'weaknesses').length;

    return {
      totalBlocks: document.blocks.length,
      totalComments: allAnnotations.length,
      aiComments: aiAnnotations.length,
      userComments: userAnnotations.length,
      resolvedComments: resolvedAnnotations.length,
      unresolvedComments: allAnnotations.length - resolvedAnnotations.length,
      toneComments,
      clarityComments,
      strengthsComments,
      weaknessesComments
    };
  };

  // Debug logging for loading states (only log when there are issues)
  if (isLoading || migrationStatus.isMigrating) {
    console.log('SemanticEssayEditor render - isLoading:', isLoading, 'isMigrating:', migrationStatus.isMigrating, 'document:', !!document);
  }
  

  if (isLoading || migrationStatus.isMigrating) {
    console.log('Showing loading screen due to:', { isLoading, isMigrating: migrationStatus.isMigrating, message: migrationStatus.message });
    return (
      <div className={`semantic-essay-editor ${className}`}>
        <Card style={{ backgroundColor: '#F4EDE2' }}>
          <CardContent className="p-8 text-center">
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <div>
                <h3 className="text-lg font-medium">
                  {migrationStatus.isMigrating ? 'Migrating Document' : 'Loading Document'}
                </h3>
                <p className="text-gray-500 mt-2">{migrationStatus.message}</p>
                {migrationStatus.isMigrating && (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${migrationStatus.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {migrationStatus.progress}% complete
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!document) {
    return (
      <div className={`semantic-essay-editor ${className}`}>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-600">Failed to Load Document</h3>
            <p className="text-gray-500 mt-2">
              There was an error loading the essay document. Please try refreshing the page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = getDocumentStats();

  return (
    <div className={`semantic-essay-editor ${className}`}>
      <div className="w-full">
        <div className="mt-6">
          <div className="flex gap-6">
            {/* Main Content Area */}
            <div className="flex-1 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  {/* Prompt Selection */}
                  {prompts.length > 0 ? (
                    <div className="space-y-4">
                      {/* Categorize prompts */}
                      {(() => {
                        const requiredPrompts = prompts.filter(p => p.is_required);
                        const optionalPrompts = prompts.filter(p => !p.is_required);
                        
                        // Get selection text for optional prompts
                        const getSelectionText = (prompts: EssayPrompt[]) => {
                          if (prompts.length === 0) return '';
                          
                          const promptSelectionType = prompts[0]?.prompt_selection_type || 'choose_one';
                          const howMany = prompts[0]?.how_many || '1';
                          
                          if (promptSelectionType === 'choose_one') {
                            return `Choose 1 of ${prompts.length}`;
                          } else if (promptSelectionType.startsWith('choose_')) {
                            const number = promptSelectionType.split('_')[1];
                            return `Choose ${number} of ${prompts.length}`;
                          } else {
                            return `Choose ${howMany} of ${prompts.length}`;
                          }
                        };
                        
                        // Get status color for draft status
                        const getStatusColor = (status?: string) => {
                          switch (status) {
                            case 'draft': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
                            case 'review': return 'bg-blue-50 text-blue-700 border-blue-200';
                            case 'final': return 'bg-green-50 text-green-700 border-green-200';
                            case 'submitted': return 'bg-gray-50 text-gray-700 border-gray-200';
                            default: return 'bg-gray-50 text-gray-700 border-gray-200';
                          }
                        };
                        
                        return (
                          <div className="space-y-4">
                            {/* Headers Row */}
                            <div className="flex space-x-4">
                              {requiredPrompts.length > 0 && (
                                <div className="flex-1">
                                  <h4 className="text-sm font-medium text-red-600 flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <span className="whitespace-nowrap">Required ({requiredPrompts.length})</span>
                                  </h4>
                                </div>
                              )}
                              {optionalPrompts.length > 0 && (
                                <div className="flex-1">
                                  <h4 className="text-sm font-medium text-blue-600 flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span className="whitespace-nowrap">{getSelectionText(optionalPrompts)} ({optionalPrompts.length} prompts)</span>
                                  </h4>
                                </div>
                              )}
                            </div>
                            
                            {/* Dropdowns Row */}
                            <div className="flex space-x-4">
                              {/* Required Essays Dropdown */}
                              {requiredPrompts.length > 0 && (
                                <div className="flex-1">
                                  <Select 
                                    value={requiredPrompts.find(p => p.id === selectedPromptId)?.id || ''} 
                                    onValueChange={onPromptChange || (() => {})}
                                  >
                                    <SelectTrigger className="w-full bg-white border-gray-300 shadow-sm">
                                      <SelectValue placeholder="Select required prompt">
                                        {(() => {
                                          const selectedPrompt = requiredPrompts.find(p => p.id === selectedPromptId);
                                          return selectedPrompt ? (
                                            <div className="flex items-center space-x-2">
                                              <span className="truncate font-medium">
                                                {selectedPrompt.prompt_number ? `Prompt ${selectedPrompt.prompt_number}` : 'Custom Prompt'}
                                              </span>
                                              {selectedPrompt.has_draft && (
                                                <Badge variant="outline" className={`text-xs ${getStatusColor(selectedPrompt.draft_status)}`}>
                                                  {selectedPrompt.draft_status || 'Draft'}
                                                </Badge>
                                              )}
                                            </div>
                                          ) : null;
                                        })()}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      {requiredPrompts.map((prompt) => (
                                        <SelectItem key={prompt.id} value={prompt.id}>
                                          <div className="flex items-center space-x-2 w-full">
                                            <span className="flex-1 truncate">
                                              {prompt.prompt_number ? `Prompt ${prompt.prompt_number}` : 'Custom Prompt'}
                                            </span>
                                            <div className="flex items-center space-x-1 ml-2">
                                              {prompt.has_draft && (
                                                <Badge variant="outline" className={`text-xs ${getStatusColor(prompt.draft_status)}`}>
                                                  {prompt.draft_status || 'Draft'}
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              
                              {/* Optional Essays Dropdown */}
                              {optionalPrompts.length > 0 && (
                                <div className="flex-1">
                                  <Select 
                                    value={optionalPrompts.find(p => p.id === selectedPromptId)?.id || ''} 
                                    onValueChange={onPromptChange || (() => {})}
                                  >
                                    <SelectTrigger className="w-full bg-white border-gray-300 shadow-sm">
                                      <SelectValue placeholder={`Select from ${getSelectionText(optionalPrompts)}`}>
                                        {(() => {
                                          const selectedPrompt = optionalPrompts.find(p => p.id === selectedPromptId);
                                          return selectedPrompt ? (
                                            <div className="flex items-center space-x-2">
                                              <span className="truncate font-medium">
                                                {selectedPrompt.prompt_number ? `Prompt ${selectedPrompt.prompt_number}` : 'Custom Prompt'}
                                              </span>
                                              {selectedPrompt.has_draft && (
                                                <Badge variant="outline" className={`text-xs ${getStatusColor(selectedPrompt.draft_status)}`}>
                                                  {selectedPrompt.draft_status || 'Draft'}
                                                </Badge>
                                              )}
                                            </div>
                                          ) : null;
                                        })()}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      {optionalPrompts.map((prompt) => (
                                        <SelectItem key={prompt.id} value={prompt.id}>
                                          <div className="flex items-center space-x-2 w-full">
                                            <span className="flex-1 truncate">
                                              {prompt.prompt_number ? `Prompt ${prompt.prompt_number}` : 'Custom Prompt'}
                                            </span>
                                            <div className="flex items-center space-x-1 ml-2">
                                              {prompt.has_draft && (
                                                <Badge variant="outline" className={`text-xs ${getStatusColor(prompt.draft_status)}`}>
                                                  {prompt.draft_status || 'Draft'}
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <h1 className="text-2xl font-bold">{document.title}</h1>
                  )}
                </div>
                
                
              </div>

              {/* Prompt Section */}
              {(prompt || document.metadata.prompt) && (
                <div className="bg-white p-4 md:p-8 rounded-xl shadow-lg border border-gray-300 relative overflow-hidden group hover:shadow-xl transition-shadow duration-300">
                  {/* Subtle accent line */}
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
                          <span>Essay Prompt</span>
                          {(lastSaved || isAutoSaving) && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              {isAutoSaving ? (
                                <>
                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                  <span>Saving...</span>
                                </>
                              ) : lastSaved ? (
                                <>
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span>Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </>
                              ) : null}
                            </div>
                          )}
                        </div>
                        <div className="sm:ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full self-start">
                          Required
                        </div>
                      </h3>
                      <div className="prose prose-gray max-w-none">
                        <p className="text-gray-700 leading-relaxed m-0 text-base" style={{ fontFamily: 'Arial, sans-serif' }}>
                          {prompt || document.metadata.prompt}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Word limit reminder and action buttons */}
                  <div className="mt-4 md:mt-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${getCurrentWordCount() > (wordLimit || document.metadata.wordLimit || 650) ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          Word Limit: {getCurrentWordCount()}/{wordLimit || document.metadata.wordLimit || 650}
                        </span>
                        {getCurrentWordCount() > (wordLimit || document.metadata.wordLimit || 650) && (
                          <span className="text-xs text-red-500 font-medium bg-red-50 px-2 py-1 rounded">
                            Needs cutting!
                          </span>
                        )}
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button 
                          onClick={generateAIComments} 
                          disabled={isGeneratingAIComments}
                          variant="outline"
                          size="sm"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          AI Comments
                        </Button>
                        <Button 
                          onClick={generateGrammarComments} 
                          disabled={isGeneratingGrammar}
                          variant="outline"
                          size="sm"
                          className="border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          <CheckSquare className="h-4 w-4 mr-2" />
                          Grammar Check
                        </Button>
                        {!showCommentSidebar && (
                          <Button 
                            onClick={() => setShowCommentSidebar(true)}
                            variant="outline"
                            size="sm"
                            className="border-green-200 text-green-700 hover:bg-green-50"
                          >
                            <Sidebar className="h-4 w-4 mr-2" />
                            Show Comments
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <FileDown className="h-4 w-4 mr-2" />
                              Export
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={exportAsDOCX}>
                              <FileTextIcon className="h-4 w-4 mr-2" />
                              Export as DOCX
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={exportAsPDF}>
                              <FileText className="h-4 w-4 mr-2" />
                              Export as PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Editor */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 min-h-[600px] h-full">
                <SemanticEditor
                  documentId={document.id}
                  essayId={essayId}
                  title={document.title}
                  wordLimit={wordLimit}
                  onDocumentChange={handleDocumentChange}
                  onAnnotationSelect={handleAnnotationSelect}
                  onSaveStatusChange={handleSaveStatusChange}
                  showCommentSidebar={showCommentSidebar}
                  selectedAnnotationId={selectedAnnotation?.id}
                  onHideSidebar={() => setShowCommentSidebar(false)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Comments Loading Pane */}
      <AICommentsLoadingPane
        isVisible={isGeneratingAIComments}
        steps={AI_COMMENTS_LOADING_STEPS}
        currentStepIndex={loadingStep}
        onComplete={() => {
          setIsGeneratingAIComments(false);
          setLoadingStep(0);
        }}
      />

      {/* Grammar Loading Pane */}
      <GrammarLoadingPane
        isVisible={isGeneratingGrammar}
        steps={GRAMMAR_LOADING_STEPS}
        currentStepIndex={grammarLoadingStep}
        noErrorsFound={noGrammarErrorsFound}
        onComplete={() => {
          setIsGeneratingGrammar(false);
          setGrammarLoadingStep(0);
          setNoGrammarErrorsFound(false); // Reset for next time
        }}
      />

      {/* Diya Score Report */}
      <DiyaScoreReport
        isVisible={showScoreReport}
        scores={agentScores}
        onViewComments={handleViewComments}
        onClose={handleCloseScoreReport}
      />
    </div>
  );
};

export default SemanticEssayEditor;
