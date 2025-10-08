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
import { EssayVersionService, EssayVersion } from '@/services/essayVersionService';
import { supabase } from '@/integrations/supabase/client';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { useToast } from '@/hooks/use-toast';
import SemanticEditor from './SemanticEditor';
import AICommentsLoadingPane, { AI_COMMENTS_LOADING_STEPS } from './AICommentsLoadingPane';
import GrammarLoadingPane, { GRAMMAR_LOADING_STEPS } from './GrammarLoadingPane';
import CommentSidebar from './CommentSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getDraftStatusLabel, getDraftStatusColor } from '@/utils/statusUtils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  FileText, 
  MessageSquare, 
  Sparkles, 
  CheckCircle,
  AlertCircle,
  FileDown,
  FileText as FileTextIcon,
  CheckSquare,
  Sidebar,
  Plus,
  Trash2,
  Crown,
  Lock,
} from 'lucide-react';
import PaywallGuard from '@/components/PaywallGuard';
import UpgradeModal from '@/components/UpgradeModal';
import { usePaywall } from '@/hooks/usePaywall';

interface EssayPrompt {
  id: string;
  prompt: string;
  prompt_number?: string;
  is_required?: boolean;
  word_limit?: string;
  has_draft?: boolean;
  draft_status?: 'not_started' | 'draft' | 'review' | 'final' | 'submitted';
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
  onDelete?: (essayId: string) => void;
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
  onDelete,
  className = ''
}) => {
  const [document, setDocument] = useState<SemanticDocument | null>(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [showCommentSidebar, setShowCommentSidebar] = useState(true);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileView, setMobileView] = useState<'essay' | 'comments'>('essay');
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
  const [hasAIComments, setHasAIComments] = useState(false);
  const [essayVersions, setEssayVersions] = useState<EssayVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<EssayVersion | null>(null);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { isPro } = usePaywall();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Toast for user feedback
  const { toast } = useToast();

  // Get current user
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Reload document when page becomes visible (handles tab switches, etc.)
  const handlePageVisible = async () => {
    if (document && essayId) {
      try {
        // Load the active version's document instead of the most recent document
        const activeVersion = await EssayVersionService.getActiveVersion(essayId);
        if (activeVersion) {
          const refreshedDocument = await semanticDocumentService.loadDocument(activeVersion.semantic_document_id);
          if (refreshedDocument && refreshedDocument.updatedAt > document.updatedAt) {
            setDocument(refreshedDocument);
          }
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
        // Check if there's an active version for this essay first
        const activeVersion = await EssayVersionService.getActiveVersion(essayId);
        let existingDocument = null;
        
        if (activeVersion) {
          // Load the document associated with the active version
          existingDocument = await semanticDocumentService.loadDocument(activeVersion.semantic_document_id);
          console.log('Found active version document for essay:', essayId, 'document ID:', existingDocument?.id);
        } else {
          // Fallback to the old method for backward compatibility
          existingDocument = await semanticDocumentService.loadDocumentByEssayId(essayId);
          console.log('Found existing document for essay:', essayId, 'document ID:', existingDocument?.id);
        }
        
        if (existingDocument) {
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
          
          // Create new semantic document
          setMigrationStatus({
            isMigrating: true,
            progress: 0,
            message: 'Creating new document...'
          });

          // Create new semantic document directly
          const blocks = semanticDocumentService.convertHtmlToBlocks(initialContent);
          const document: SemanticDocument = {
            id: crypto.randomUUID(),
            title,
            blocks,
            metadata: {
              essayId,
              version: 1,
              prompt: prompt || '',
              wordLimit: wordLimit || 650
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

  // Load essay versions when document is loaded
  useEffect(() => {
    if (document) {
      loadEssayVersions();
    }
  }, [document]);



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

  // Handle annotation resolve
  const handleAnnotationResolve = async (annotationId: string) => {
    if (!document) return;
    
    try {
      const success = semanticDocumentService.resolveAnnotation(document, annotationId, user?.id || 'anonymous');
      
      if (success) {
        // Update local state
        const updatedBlocks = document.blocks.map(block => ({
          ...block,
          annotations: block.annotations?.map(annotation => 
            annotation.id === annotationId 
              ? { ...annotation, resolved: true }
              : annotation
          ) || []
        }));
        
        const updatedDocument = { ...document, blocks: updatedBlocks };
        setDocument(updatedDocument);
        
        // Clear selection if this was the selected annotation
        if (selectedAnnotation?.id === annotationId) {
          setSelectedAnnotation(null);
        }
        
        toast({
          title: "Comment Resolved",
          description: "The comment has been marked as resolved.",
        });
      }
    } catch (error) {
      console.error('Failed to resolve annotation:', error);
      toast({
        title: "Error",
        description: "Failed to resolve comment. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle annotation delete
  const handleAnnotationDelete = async (annotationId: string) => {
    if (!document) return;
    
    try {
      const success = semanticDocumentService.deleteAnnotation(document, annotationId);
      
      if (success) {
        // Update local state
        const updatedBlocks = document.blocks.map(block => ({
          ...block,
          annotations: block.annotations?.filter(annotation => annotation.id !== annotationId) || []
        }));
        
        const updatedDocument = { ...document, blocks: updatedBlocks };
        setDocument(updatedDocument);
        
        // Clear selection if this was the selected annotation
        if (selectedAnnotation?.id === annotationId) {
          setSelectedAnnotation(null);
        }
        
        toast({
          title: "Comment Deleted",
          description: "The comment has been deleted.",
        });
      }
    } catch (error) {
      console.error('Failed to delete annotation:', error);
      toast({
        title: "Error",
        description: "Failed to delete comment. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle save status changes
  const handleSaveStatusChange = (isAutoSaving: boolean, lastSaved: Date | null) => {
    setIsAutoSaving(isAutoSaving);
    setLastSaved(lastSaved);
  };

  // Load essay versions
  const loadEssayVersions = async () => {
    try {
      const versions = await EssayVersionService.getEssayVersions(essayId);
      setEssayVersions(versions);
      
      // Find the active version
      const activeVersion = versions.find(v => v.is_active);
      setCurrentVersion(activeVersion || null);
    } catch (error) {
      console.error('Failed to load essay versions:', error);
    }
  };

  // Create a new version (fresh draft)
  const createNewVersion = async () => {
    if (!document) return;

    setIsCreatingVersion(true);
    
    try {
      // Get the next version number from the database
      const versions = await EssayVersionService.getEssayVersions(essayId);
      const nextVersionNumber = versions.length > 0 
        ? Math.max(...versions.map(v => v.version_number)) + 1 
        : 1;
      
      console.log('Creating Version', nextVersionNumber, '...');
      
      // Create new version
      const versionId = await EssayVersionService.createFreshDraftVersion(
        essayId,
        document,
        `Version ${nextVersionNumber}`,
        'Fresh draft without previous comments'
      );

      // Reload versions to get updated list
      await loadEssayVersions();

      // Switch to the new semantic document by loading the active version's document
      const activeVersion = await EssayVersionService.getActiveVersion(essayId);
      if (activeVersion) {
        const newDocument = await semanticDocumentService.loadDocument(activeVersion.semantic_document_id);
        if (newDocument) {
          setDocument(newDocument);
        }
      }

      toast({
        title: "New Version Created",
        description: "You can now continue editing without the previous comments.",
      });

    } catch (error) {
      console.error('Failed to create new version:', error);
      toast({
        title: "Error",
        description: "Failed to create new version. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingVersion(false);
    }
  };

  // Load a specific version (switch to it)
  const loadVersion = async (versionId: string) => {
    try {
      // Switch to the selected version using the atomic database function
      const success = await EssayVersionService.switchToVersion(essayId, versionId);
      
      if (!success) {
        toast({
          title: "Error",
          description: "Failed to switch to the selected version.",
          variant: "destructive",
        });
        return;
      }

      // Reload versions to get updated active version
      await loadEssayVersions();

      // Load the new active version's document
      const activeVersion = await EssayVersionService.getActiveVersion(essayId);
      if (activeVersion) {
        const newDocument = await semanticDocumentService.loadDocument(activeVersion.semantic_document_id);
        if (newDocument) {
          setDocument(newDocument);
          setCurrentVersion(activeVersion);
          
          toast({
            title: "Version Switched",
            description: `Now viewing ${activeVersion.version_name || `Version ${activeVersion.version_number}`}`,
          });
        }
      }

    } catch (error) {
      console.error('Failed to switch version:', error);
      toast({
        title: "Error",
        description: "Failed to switch to the selected version. Please try again.",
        variant: "destructive",
      });
    }
  };


  // Generate AI comments
  const generateAIComments = async () => {
    if (!document) return;

    setIsGeneratingAIComments(true);
    setLoadingStep(0);

    try {
      // Debug: log request payload summary
      try {
        console.log('[ESSAY_DEBUG] generateAIComments request', {
          documentId: document.id,
          blocksCount: document.blocks?.length,
          promptLength: document.metadata?.prompt ? String(document.metadata?.prompt).length : 0,
          wordLimit: document.metadata?.wordLimit
        });
      } catch (_) {}

      // Start AI generation in parallel with loading animation
      const aiGenerationPromise = semanticDocumentService.generateAIComments({
        documentId: document.id,
        blocks: document.blocks,
        context: {
          prompt: prompt || document.metadata.prompt || '',
          wordLimit: wordLimit || document.metadata.wordLimit || 650
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

      // Debug: log response shape
      try {
        console.log('[ESSAY_DEBUG] generateAIComments response', {
          success: response.success,
          message: response.message,
          commentsCount: Array.isArray(response.comments) ? response.comments.length : undefined,
          meta: response.metadata
        });
      } catch (_) {}

      if (response.success) {
        // Add a small delay to ensure database insert is complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reload document to get updated comments
        const updatedDocument = await semanticDocumentService.loadDocument(document.id);
        if (updatedDocument) {
          setDocument(updatedDocument);
        }
      }

      // Mark as complete
      setLoadingStep(AI_COMMENTS_LOADING_STEPS.length);
    } catch (error) {
      console.error('[ESSAY_ERROR] Failed to generate AI comments:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        essayId: essayId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot generate AI feedback for their essay'
      });
      // Extra debug hint for strengths agent failure signature
      try {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("Cannot read properties of undefined (reading '0')") || msg.includes('Invalid response from Gemini API')) {
          console.warn('[ESSAY_DEBUG] Potential strengths agent parsing issue detected. Please share logs above and server logs for ai_agent_strengths.');
        }
      } catch (_) {}
    }
    // Note: Don't auto-close the loading pane - let user click "See AI Comments" button
  };

  // Handle "See AI Comments" button click
  const handleSeeAIComments = () => {
    // Close the loading pane
    setIsGeneratingAIComments(false);
    setLoadingStep(0);
    
    // Refresh the page to show the newly generated comments
    window.location.reload();
  };

  // Handle "See Grammar Comments" button click
  const handleSeeGrammarComments = () => {
    // Close the loading pane
    setIsGeneratingGrammar(false);
    setGrammarLoadingStep(0);
    
    // Refresh the page to show the newly generated comments
    window.location.reload();
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
          prompt: prompt || document.metadata.prompt || '',
          wordLimit: wordLimit || document.metadata.wordLimit || 650
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
      console.error('[ESSAY_ERROR] Failed to generate grammar comments:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        essayId: essayId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot generate grammar feedback for their essay'
      });
    }
    // Note: Don't auto-close the loading pane - let user click "See Grammar Comments" button
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
      
      // Export successful
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
      
      await ExportService.exportToDOCX({
        title: document.title,
        content: htmlContent,
        prompt: prompt || document.metadata.prompt,
        wordLimit: wordLimit || document.metadata.wordLimit
      });
      
      // Export successful
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

  // Handle essay deletion
  const handleDeleteEssay = () => {
    if (onDelete) {
      onDelete(essayId);
    }
    setShowDeleteDialog(false);
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
          {/* Mobile Navigation */}
          <div className="lg:hidden mb-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setMobileView('essay')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  mobileView === 'essay'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <FileText className="h-4 w-4 inline mr-2" />
                Essay
              </button>
              <button
                onClick={() => setMobileView('comments')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  mobileView === 'comments'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MessageSquare className="h-4 w-4 inline mr-2" />
                Comments
                {document && document.blocks.some(block => block.annotations && block.annotations.length > 0) && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    {document.blocks.reduce((total, block) => total + (block.annotations?.length || 0), 0)}
                  </Badge>
                )}
              </button>
            </div>
          </div>

          <div className="flex gap-6 lg:gap-6 gap-0">
            {/* Main Content Area */}
            <div className={`flex-1 space-y-4 ${mobileView === 'comments' ? 'hidden lg:block' : ''}`}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 lg:px-0">
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
                          return getDraftStatusColor(status);
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
                                    <SelectTrigger className="w-auto min-w-[200px] bg-white border-gray-300 shadow-sm">
                                      <SelectValue placeholder="Select required prompt">
                                        {(() => {
                                          const selectedPrompt = requiredPrompts.find(p => p.id === selectedPromptId);
                                          return selectedPrompt ? (
                                            <div className="flex items-center space-x-2">
                                              <span className="truncate font-medium">
                                                {selectedPrompt.prompt_number ? `Prompt ${selectedPrompt.prompt_number}` : (selectedPrompt as any).title || 'Custom Prompt'}
                                              </span>
                                              {selectedPrompt.has_draft && (
                                                <Badge variant="outline" className={`text-xs ${getStatusColor(selectedPrompt.draft_status)}`}>
                                                  {getDraftStatusLabel(selectedPrompt.draft_status)}
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
                                              {prompt.prompt_number ? `Prompt ${prompt.prompt_number}` : (prompt as any).title || 'Custom Prompt'}
                                            </span>
                                            <div className="flex items-center space-x-1 ml-2">
                                              {prompt.has_draft && (
                                                <Badge variant="outline" className={`text-xs ${getStatusColor(prompt.draft_status)}`}>
                                                  {getDraftStatusLabel(prompt.draft_status)}
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
                                    <SelectTrigger className="w-auto min-w-[200px] bg-white border-gray-300 shadow-sm">
                                      <SelectValue placeholder={`${getSelectionText(optionalPrompts)}`}>
                                        {(() => {
                                          const selectedPrompt = optionalPrompts.find(p => p.id === selectedPromptId);
                                          return selectedPrompt ? (
                                            <div className="flex items-center space-x-2">
                                              <span className="truncate font-medium">
                                                {selectedPrompt.prompt_number ? `Prompt ${selectedPrompt.prompt_number}` : (selectedPrompt as any).title || 'Custom Prompt'}
                                              </span>
                                              {selectedPrompt.has_draft && (
                                                <Badge variant="outline" className={`text-xs ${getStatusColor(selectedPrompt.draft_status)}`}>
                                                  {getDraftStatusLabel(selectedPrompt.draft_status)}
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
                                              {prompt.prompt_number ? `Prompt ${prompt.prompt_number}` : (prompt as any).title || 'Custom Prompt'}
                                            </span>
                                            <div className="flex items-center space-x-1 ml-2">
                                              {prompt.has_draft && (
                                                <Badge variant="outline" className={`text-xs ${getStatusColor(prompt.draft_status)}`}>
                                                  {getDraftStatusLabel(prompt.draft_status)}
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
                  
                  {/* Delete button - only show for custom essays */}
                  {onDelete && (
                    <div className="absolute top-4 right-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDeleteDialog(true)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete essay"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
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
                        <p className="text-gray-700 leading-relaxed m-0 text-base" style={{ fontFamily: 'Arial, sans-serif', whiteSpace: 'pre-wrap' }}>
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
                        {/* Versions Dropdown */}
                        {essayVersions.length > 0 && (
                          <Select 
                            value={currentVersion?.id || ''} 
                            onValueChange={(versionId) => {
                              const version = essayVersions.find(v => v.id === versionId);
                              if (version && !version.is_active) {
                                loadVersion(versionId);
                              }
                            }}
                          >
                            <SelectTrigger className="w-auto min-w-[150px] bg-white border-gray-300 shadow-sm">
                              <SelectValue placeholder="Select version">
                                {currentVersion ? (
                                  <div className="flex items-center space-x-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                      currentVersion.is_active ? 'bg-blue-500' : 'bg-gray-400'
                                    }`} />
                                      <span className="truncate flex items-center space-x-1">
                                      <span>{currentVersion.version_name || `Version ${currentVersion.version_number}`}</span>
                                    </span>
                                  </div>
                                ) : null}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {essayVersions.map((version) => (
                                <SelectItem key={version.id} value={version.id}>
                                  <div className="flex items-center space-x-2 w-full">
                                    <div className={`w-2 h-2 rounded-full ${
                                      version.is_active ? 'bg-blue-500' : 'bg-gray-400'
                                    }`} />
                                    <div className="flex-1">
                                      <div className="font-medium flex items-center space-x-2">
                                        <span>{version.version_name || `Version ${version.version_number}`}</span>
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {version.version_description || 'Essay Version'}
                                      </div>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        
                        <Button 
                          onClick={createNewVersion} 
                          disabled={isCreatingVersion}
                          variant="outline"
                          size="sm"
                          className="border-purple-200 text-purple-700 hover:bg-purple-50"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {isCreatingVersion ? 'Creating...' : 'New Version'}
                        </Button>
                        <PaywallGuard 
                          featureKey="unlimited_essay_feedback"
                          fallback={
                            <Button 
                              onClick={() => setShowUpgrade(true)} 
                              disabled={isGeneratingAIComments}
                              variant="outline"
                              size="sm"
                              title="Pro users only"
                            >
                              <Sparkles className="h-4 w-4 mr-2" />
                              AI Comments
                              {isPro ? <Crown className="h-3 w-3 ml-2 text-primary" /> : <Lock className="h-3 w-3 ml-2 text-primary" />}
                            </Button>
                          }
                        >
                          <Button 
                            onClick={generateAIComments} 
                            disabled={isGeneratingAIComments}
                            variant="outline"
                            size="sm"
                            title="Pro users only"
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            AI Comments
                            {isPro ? <Crown className="h-3 w-3 ml-2 text-primary" /> : <Lock className="h-3 w-3 ml-2 text-primary" />}
                          </Button>
                        </PaywallGuard>
                        <PaywallGuard
                          featureKey="grammar_check"
                          fallback={
                            <Button 
                              onClick={() => setShowUpgrade(true)} 
                              disabled={isGeneratingGrammar}
                              variant="outline"
                              size="sm"
                              className="border-blue-200 text-blue-700 hover:bg-blue-50"
                              title="Pro users only"
                            >
                              <CheckSquare className="h-4 w-4 mr-2" />
                              Grammar Check
                              {isPro ? <Crown className="h-3 w-3 ml-2 text-primary" /> : <Lock className="h-3 w-3 ml-2 text-primary" />}
                            </Button>
                          }
                        >
                          <Button 
                            onClick={generateGrammarComments} 
                            disabled={isGeneratingGrammar}
                            variant="outline"
                            size="sm"
                            className="border-blue-200 text-blue-700 hover:bg-blue-50"
                            title="Pro users only"
                          >
                            <CheckSquare className="h-4 w-4 mr-2" />
                            Grammar Check
                            {isPro ? <Crown className="h-3 w-3 ml-2 text-primary" /> : <Lock className="h-3 w-3 ml-2 text-primary" />}
                          </Button>
                        </PaywallGuard>
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
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 lg:p-8 min-h-[600px] h-full mx-4 lg:mx-0 w-full overflow-hidden">
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

            {/* Mobile Comments View */}
            <div className={`lg:hidden ${mobileView === 'essay' ? 'hidden' : 'block'}`}>
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 h-full min-h-[600px] mx-4">
                <CommentSidebar
                  blocks={document.blocks}
                  onAnnotationResolve={handleAnnotationResolve}
                  onAnnotationDelete={handleAnnotationDelete}
                  onAnnotationSelect={handleAnnotationSelect}
                  selectedAnnotationId={selectedAnnotation?.id}
                  className="h-full border-0 rounded-lg"
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
        onSeeComments={handleSeeAIComments}
      />

      {/* Grammar Loading Pane */}
      <GrammarLoadingPane
        isVisible={isGeneratingGrammar}
        steps={GRAMMAR_LOADING_STEPS}
        currentStepIndex={grammarLoadingStep}
        noErrorsFound={noGrammarErrorsFound}
        onSeeGrammarComments={handleSeeGrammarComments}
      />

      {/* Delete Essay Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Delete Essay
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>"{title}"</strong>? This action cannot be undone.
              <br /><br />
              This will permanently remove the essay and all its content, including any AI feedback and comments.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteEssay}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Essay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        featureKey={isGeneratingGrammar ? 'grammar_check' : 'unlimited_essay_feedback'}
        title="Upgrade to Pro"
        description="AI Comments and Grammar Check are Pro features."
        checkoutPath="/checkout"
      />

    </div>
  );
};

export default SemanticEssayEditor;
