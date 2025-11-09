/**
 * Semantic Essay Editor
 * 
 * A complete essay editor built on the new semantic document architecture.
 * Provides Google Docs-like commenting experience with stable AI integration.
 */

import React, { useState, useEffect, startTransition, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SemanticDocument, Annotation } from '@/types/semanticDocument';
import { semanticDocumentService, FeedbackSession } from '@/services/semanticDocumentService';
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
  ArrowUp,
  Star,
} from 'lucide-react';
import PaywallGuard from '@/components/PaywallGuard';
import UpgradeModal from '@/components/UpgradeModal';
import { usePaywall } from '@/hooks/usePaywall';
import { EscalatedEssaysService } from '@/services/escalatedEssaysService';

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
  const [hasGrammarCheckRun, setHasGrammarCheckRun] = useState(false);
  const [hasGrammarCheckCompleted, setHasGrammarCheckCompleted] = useState(false);
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
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);
  const [hasFeedback, setHasFeedback] = useState(false);
  const [isCheckingFeedback, setIsCheckingFeedback] = useState(false);
  const { isPro } = usePaywall();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeFeatureKey, setUpgradeFeatureKey] = useState<string | null>(null);
  const [escalationStatus, setEscalationStatus] = useState<{
    used: number;
    remaining: number;
    max: number;
    canEscalate: boolean;
  } | null>(null);
  const [isLoadingEscalationStatus, setIsLoadingEscalationStatus] = useState(false);
  const [versionsWithAnnotations, setVersionsWithAnnotations] = useState<Set<string>>(new Set());
  const [feedbackSessions, setFeedbackSessions] = useState<FeedbackSession[]>([]);
  const [selectedFeedbackSession, setSelectedFeedbackSession] = useState<FeedbackSession | null>(null);
  const [filteredDocument, setFilteredDocument] = useState<SemanticDocument | null>(null);
  
  // Track if document has been initially loaded to prevent false positives in safety check
  const isDocumentInitializedRef = useRef(false);
  // Track if we're currently reloading to prevent infinite loops
  const isReloadingRef = useRef(false);
  // Track the last reload attempt to debounce rapid reloads
  const lastReloadAttemptRef = useRef<number>(0);

  // Toast for user feedback
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get current user
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Check if founder feedback is available for this essay
  useEffect(() => {
    const checkFeedback = async () => {
      if (!essayId) return;
      
      try {
        setIsCheckingFeedback(true);
        const escalation = await EscalatedEssaysService.getEscalationByEssayId(essayId);
        setHasFeedback(!!escalation);
      } catch (error) {
        // Silently fail - just means no feedback available
        setHasFeedback(false);
      } finally {
        setIsCheckingFeedback(false);
      }
    };

    checkFeedback();
  }, [essayId]);

  // Filter document annotations based on selected feedback session
  useEffect(() => {
    if (!document) {
      setFilteredDocument(null);
      return;
    }

    if (!selectedFeedbackSession) {
      // Show all annotations if no session is selected
      setFilteredDocument(document);
      return;
    }

    // Filter annotations to show only those from the selected session
    const filteredBlocks = document.blocks.map(block => ({
      ...block,
      annotations: (block.annotations || []).filter(annotation => {
        // Keep user annotations and AI annotations from the selected session
        if (annotation.author === 'user') {
          return true; // Always show user annotations
        }
        if (annotation.author === 'ai') {
          const createdAt = annotation.createdAt;
          return createdAt >= selectedFeedbackSession.startTime && 
                 createdAt <= selectedFeedbackSession.endTime;
        }
        return true;
      })
    }));

    setFilteredDocument({
      ...document,
      blocks: filteredBlocks
    });
  }, [document, selectedFeedbackSession]);

  // Fetch escalation status (for Pro users)
  useEffect(() => {
    const fetchEscalationStatus = async () => {
      if (!isPro) {
        setEscalationStatus(null);
        return;
      }

      try {
        setIsLoadingEscalationStatus(true);
        const status = await EscalatedEssaysService.getUserEscalationStatus();
        setEscalationStatus(status);
      } catch (error) {
        console.error('Failed to fetch escalation status:', error);
        setEscalationStatus(null);
      } finally {
        setIsLoadingEscalationStatus(false);
      }
    };

    fetchEscalationStatus();
  }, [isPro]);

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

  // Check for existing grammar comments when document loads
  useEffect(() => {
    if (document) {
      const hasGrammarComments = document.blocks.some(block => 
        block.annotations.some(annotation => 
          annotation.metadata?.agentType === 'grammar' || 
          annotation.metadata?.commentCategory === 'grammar'
        )
      );
      setHasGrammarCheckRun(hasGrammarComments);
    }
  }, [document]);

  // Load or create document on mount
  useEffect(() => {
    const initializeDocument = async () => {
      setIsLoading(true);
      isDocumentInitializedRef.current = false; // Reset initialization flag when loading new essay
      
      try {
        // Check if there's an active version for this essay first
        const activeVersion = await EssayVersionService.getActiveVersion(essayId);
        let existingDocument = null;
        
        if (activeVersion) {
          // Load the document associated with the active version
          existingDocument = await semanticDocumentService.loadDocument(activeVersion.semantic_document_id);
        } else {
          // Fallback to the old method for backward compatibility
          existingDocument = await semanticDocumentService.loadDocumentByEssayId(essayId);
        }
        
        if (existingDocument) {
          setDocument(existingDocument);
          isDocumentInitializedRef.current = true; // Mark as initialized after first load
          
          // Load feedback sessions
          const sessions = await semanticDocumentService.getFeedbackSessions(existingDocument.id);
          setFeedbackSessions(sessions);
          // If there are multiple sessions, default to showing all (no filter)
          if (sessions.length > 1) {
            setSelectedFeedbackSession(null); // null means show all
          } else if (sessions.length === 1) {
            setSelectedFeedbackSession(sessions[0]);
          }
          
          // Debug: Log what we loaded
          console.log('[ESSAY_LOAD] Document loaded successfully', {
            documentId: existingDocument.id,
            blocksCount: existingDocument.blocks.length,
            hasContent: existingDocument.blocks.some(b => b.content && b.content.trim().length > 0),
            versionId: activeVersion?.id,
            hasAIFeedback: activeVersion?.has_ai_feedback,
            feedbackSessions: sessions.length
          });
        } else {
          
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
    // If we're currently reloading, accept the update without safety checks
    if (isReloadingRef.current) {
      isReloadingRef.current = false; // Reset flag after accepting reloaded document
      setDocument(updatedDocument);
      
      // Convert back to HTML for parent component
      if (onContentChange) {
        const htmlContent = semanticDocumentService.convertBlocksToHtml(updatedDocument.blocks);
        onContentChange(htmlContent);
      }
      return;
    }

    // Safety check: If document becomes empty but we know it should have content, reload from DB
    // BUT: Only check AFTER initial load is complete to prevent infinite loops during initialization
    // AND: Debounce rapid reload attempts (max once per 2 seconds)
    if (isDocumentInitializedRef.current && document) {
      const hasContent = updatedDocument.blocks.some(block => block.content && block.content.trim().length > 0);
      const shouldHaveContent = document.blocks.some(block => block.content && block.content.trim().length > 0);
      
      if (!hasContent && shouldHaveContent && updatedDocument.id === document.id) {
        const now = Date.now();
        const timeSinceLastReload = now - lastReloadAttemptRef.current;
        
        // Debounce: only reload if it's been at least 2 seconds since last attempt
        if (timeSinceLastReload < 2000) {
          console.warn('[ESSAY_EDITOR] Skipping reload attempt - too soon after last reload', {
            timeSinceLastReload
          });
          return; // Don't update state with empty document, but don't trigger reload either
        }
        
        lastReloadAttemptRef.current = now;
        isReloadingRef.current = true; // Set flag to prevent loops
        
        console.warn('[ESSAY_EDITOR] Document state became empty but should have content. Reloading from database...', {
          documentId: updatedDocument.id,
          previousBlocksCount: document.blocks.length,
          newBlocksCount: updatedDocument.blocks.length
        });
        
        // Reload from database
        semanticDocumentService.loadDocument(updatedDocument.id).then(reloadedDoc => {
          if (reloadedDoc && reloadedDoc.blocks.some(b => b.content && b.content.trim().length > 0)) {
            setDocument(reloadedDoc);
          } else {
            isReloadingRef.current = false; // Reset if reload failed
          }
        }).catch(err => {
          console.error('[ESSAY_EDITOR] Failed to reload document after detecting empty state:', err);
          isReloadingRef.current = false; // Reset on error
        });
        
        return; // Don't update state with empty document
      }
    }
    
    setDocument(updatedDocument);
    
    // Convert back to HTML for parent component
    if (onContentChange) {
      const htmlContent = semanticDocumentService.convertBlocksToHtml(updatedDocument.blocks);
      onContentChange(htmlContent);
    }
  };

  // Handle annotation selection
  const handleAnnotationSelect = (annotation: Annotation | null) => {
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
      // Optimistic UI update - remove from local state immediately
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
      
      // Persist deletion to database
      await semanticDocumentService.persistAnnotationDeletion(annotationId);
      
      toast({
        title: "Comment Deleted",
        description: "The comment has been deleted.",
      });
    } catch (error) {
      console.error('Failed to delete annotation:', error);
      
      // Reload document to revert optimistic changes
      const reloadedDocument = await semanticDocumentService.loadDocument(document.id);
      if (reloadedDocument) {
        setDocument(reloadedDocument);
      }
      
      toast({
        title: "Error",
        description: "Failed to delete comment. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Reload document from database
  const handleDocumentReload = async () => {
    if (!document) return;
    
    try {
      const reloadedDocument = await semanticDocumentService.loadDocument(document.id);
      if (reloadedDocument) {
        setDocument(reloadedDocument);
      }
    } catch (error) {
      console.error('Failed to reload document:', error);
      toast({
        title: "Error",
        description: "Failed to reload document. Please try again.",
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
      
      // Check which versions have annotations (clean versions won't have any)
      const annotationChecks = await Promise.all(
        versions.map(async (version) => {
          try {
            const { data, error } = await (supabase as any)
              .from('semantic_annotations')
              .select('id')
              .eq('document_id', version.semantic_document_id)
              .limit(1);
            
            return {
              versionId: version.id,
              hasAnnotations: !error && data && data.length > 0
            };
          } catch (err) {
            console.warn(`Failed to check annotations for version ${version.id}:`, err);
            return { versionId: version.id, hasAnnotations: false };
          }
        })
      );
      
      // Create a set of version IDs that have annotations
      const versionsWithAnnoSet = new Set(
        annotationChecks
          .filter(check => check.hasAnnotations)
          .map(check => check.versionId)
      );
      setVersionsWithAnnotations(versionsWithAnnoSet);
      
      // Find the active version
      const activeVersion = versions.find(v => v.is_active);
      setCurrentVersion(activeVersion || null);
      
      // Check grammar check completion status for the active version
      if (activeVersion) {
        const grammarCompleted = await EssayVersionService.hasGrammarCheckCompleted(activeVersion.id);
        setHasGrammarCheckCompleted(grammarCompleted);
      } else {
        setHasGrammarCheckCompleted(false);
      }
    } catch (error) {
      console.error('Failed to load essay versions:', error);
    }
  };

  // Helper function to prepare document and get next version number
  const prepareForVersionCreation = async () => {
    if (!document) throw new Error('No document available');

    // Critical fix: Ensure all pending changes are saved before creating new version
    // BUT: Only save if document has actual content (prevents saving empty state from HMR)
    const hasContent = document.blocks.some(block => block.content && block.content.trim().length > 0);
    
    if (hasContent) {
      try {
        await semanticDocumentService.saveDocument(document);
        // Give autosave a moment to complete if it's in progress
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (saveError) {
        console.warn('Failed to save document before creating new version:', saveError);
        // If save was blocked by safety check (empty document), that's fine - we'll reload from DB
        if (saveError instanceof Error && saveError.message.includes('empty document over existing')) {
          console.log('[CREATE_VERSION] Current document state is empty, will reload from database');
        } else {
          // For other errors, log but continue
        }
      }
    } else {
      console.log('[CREATE_VERSION] Document appears empty, skipping save and reloading from database');
    }

    // Get the next version number from the database (for naming only)
    const versions = await EssayVersionService.getEssayVersions(essayId);
    const nextVersionNumber = versions.length > 0 
      ? Math.max(...versions.map(v => v.version_number)) + 1 
      : 1;

    // ALWAYS reload document from DB to ensure we have the absolute latest saved version
    // This is critical because the current state might be empty due to HMR
    let latestDocument = document;
    try {
      if (document.id) {
        const dbDocument = await semanticDocumentService.loadDocument(document.id);
        if (dbDocument) {
          latestDocument = dbDocument;
          console.log('[CREATE_VERSION] Reloaded document from database', {
            documentId: document.id,
            blocksCount: dbDocument.blocks.length,
            hasContent: dbDocument.blocks.some(b => b.content && b.content.trim().length > 0)
          });
        }
      } else {
        // If no document ID, try loading by essay ID
        const dbDocument = await semanticDocumentService.loadDocumentByEssayId(essayId);
        if (dbDocument) {
          latestDocument = dbDocument;
          console.log('[CREATE_VERSION] Reloaded document by essay ID from database', {
            essayId,
            blocksCount: dbDocument.blocks.length
          });
        }
      }
    } catch (reloadError) {
      console.warn('Failed to reload document before creating version, using current state:', reloadError);
    }

    // Verify we have content before creating version
    const finalHasContent = latestDocument.blocks.some(block => block.content && block.content.trim().length > 0);
    if (!finalHasContent) {
      throw new Error('Cannot create new version: document has no content. Please add content to your essay first.');
    }

    return { latestDocument, nextVersionNumber };
  };

  // Create a new version (clone text + comments, editable)
  const createNewVersionWithComments = async () => {
    if (!document) return;

    setIsCreatingVersion(true);
    
    try {
      const { latestDocument, nextVersionNumber } = await prepareForVersionCreation();

      // Create new version cloning text + comments, mark has_ai_feedback=false
      const versionId = await EssayVersionService.createClonedVersionWithComments(
        essayId,
        latestDocument,
        `Version ${nextVersionNumber}`,
        undefined // Remove the descriptive text
      );

      // Batch all updates together to minimize re-renders
      const [updatedVersions, activeVersion] = await Promise.all([
        EssayVersionService.getEssayVersions(essayId),
        EssayVersionService.getActiveVersion(essayId)
      ]);

      // Load the new document
      let newDocument = null;
      if (activeVersion) {
        newDocument = await semanticDocumentService.loadDocument(activeVersion.semantic_document_id);
      }

      // Update all state at once to prevent intermediate re-renders
      if (newDocument) {
        setEssayVersions(updatedVersions);
        setCurrentVersion(activeVersion);
        setDocument(newDocument);
      }

      // Reload versions to update annotations state
      await loadEssayVersions();

      toast({
        title: "New Version Created",
        description: "Version cloned with comments and highlights. You can edit now.",
      });

    } catch (error) {
      console.error('Failed to create new version:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create new version. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingVersion(false);
    }
  };

  // Create a new version with clean text only (no comments or highlighting)
  const createNewVersionClean = async () => {
    if (!document) return;

    setIsCreatingVersion(true);
    
    try {
      const { latestDocument, nextVersionNumber } = await prepareForVersionCreation();

      // Create new version with only text content, no annotations
      const versionId = await EssayVersionService.createCleanVersion(
        essayId,
        latestDocument,
        `Version ${nextVersionNumber}`,
        undefined
      );

      // Batch all updates together to minimize re-renders
      const [updatedVersions, activeVersion] = await Promise.all([
        EssayVersionService.getEssayVersions(essayId),
        EssayVersionService.getActiveVersion(essayId)
      ]);

      // Load the new document
      let newDocument = null;
      if (activeVersion) {
        newDocument = await semanticDocumentService.loadDocument(activeVersion.semantic_document_id);
      }

      // Update all state at once to prevent intermediate re-renders
      if (newDocument) {
        setEssayVersions(updatedVersions);
        setCurrentVersion(activeVersion);
        setDocument(newDocument);
      }

      // Reload versions to update annotations state
      await loadEssayVersions();

      toast({
        title: "New Version Created",
        description: "Clean version created with text only. No comments or highlighting.",
      });

    } catch (error) {
      console.error('Failed to create clean version:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create clean version. Please try again.",
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
          isDocumentInitializedRef.current = true; // Mark as initialized after loading new version
          startTransition(() => {
            setDocument(newDocument);
            setCurrentVersion(activeVersion);
          });
          
          toast({
            title: "Version Switched",
            description: `Now viewing ${activeVersion.version_name || `Version ${activeVersion.version_number}`}`,
          });

          // Force a full reload to ensure comments and sidebar state are fresh for the new version
          window.location.reload();
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


      if (response.success) {
        // Add a small delay to ensure database insert is complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reload document to get updated comments
        const updatedDocument = await semanticDocumentService.loadDocument(document.id);
        if (updatedDocument) {
          setDocument(updatedDocument);
          
          // Verify comments were actually loaded
          const totalComments = updatedDocument.blocks.reduce((sum, block) => sum + (block.annotations?.length || 0), 0);
          console.log('[ESSAY_DEBUG] Document reloaded after AI comments generation', {
            documentId: document.id,
            totalComments,
            commentsGenerated: response.comments?.length || 0,
            blocksWithComments: updatedDocument.blocks.filter(b => b.annotations && b.annotations.length > 0).length
          });
          
          if (totalComments === 0 && (response.comments?.length || 0) > 0) {
            console.warn('[ESSAY_DEBUG] Comments were generated but not found in reloaded document. Retrying reload...');
            // Retry reload after a longer delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            const retryDocument = await semanticDocumentService.loadDocument(document.id);
            if (retryDocument) {
              setDocument(retryDocument);
            }
          }
        } else {
          console.error('[ESSAY_ERROR] Failed to reload document after AI comments generation');
        }

        // Mark current active version as having AI feedback (read-only)
        try {
          const active = await EssayVersionService.getActiveVersion(essayId);
          if (active) {
            await EssayVersionService.setHasAIFeedback(active.id, true);
            // Refresh versions and currentVersion state
            await loadEssayVersions();
          }
        } catch (e) {
          console.warn('Failed to mark version has_ai_feedback:', e);
        }

        // Reload feedback sessions after generating new comments
        if (updatedDocument) {
          const sessions = await semanticDocumentService.getFeedbackSessions(updatedDocument.id);
          setFeedbackSessions(sessions);
        }
      } else {
        // Handle case where generation failed but we still want to show an error
        console.error('[ESSAY_ERROR] AI comments generation returned success=false', {
          message: response.message,
          commentsCount: response.comments?.length || 0
        });
        
        // Reset loading state
        setIsGeneratingAIComments(false);
        setLoadingStep(0);
        
        toast({
          title: "AI Comments Generation Failed",
          description: response.message || "Failed to generate AI comments. Please try again.",
          variant: "destructive"
        });
        return;
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
      
      // Reset loading state on error so user can try again
      setIsGeneratingAIComments(false);
      setLoadingStep(0);
      
      // Show error toast to user
      toast({
        title: "AI Comments Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate AI comments. Please try again.",
        variant: "destructive"
      });
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
        setHasGrammarCheckRun(true);
        
        // Add a small delay to ensure database insert is complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Reload document to get updated comments
        const updatedDocument = await semanticDocumentService.loadDocument(document.id);
        if (updatedDocument) {
          setDocument(updatedDocument);
        }
        
        // Refresh grammar check completion status
        if (currentVersion) {
          const grammarCompleted = await EssayVersionService.hasGrammarCheckCompleted(currentVersion.id);
          setHasGrammarCheckCompleted(grammarCompleted);
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

  // Export document as PDF using browser print functionality
  const exportAsPDF = async () => {
    if (!document) return;

    try {
      // Critical fix: Ensure we're using the latest document state from SemanticEditor
      // If SemanticEditor has pending changes, wait for autosave to complete
      // Reload from database to get the absolute latest version
      let latestDocument = document;
      
      try {
        if (document.id) {
          const dbDocument = await semanticDocumentService.loadDocument(document.id);
          if (dbDocument) {
            // Use the database version which should have all saved changes
            latestDocument = dbDocument;
          }
        }
      } catch (error) {
        console.warn('Failed to reload document for PDF export, using current state:', error);
        // Continue with current document state if reload fails
      }

      const htmlContent = semanticDocumentService.convertBlocksToHtml(latestDocument.blocks);
      
      // Create a new window with the HTML content and proper essay styling
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${document.title}</title>
            <style>
              .essay-page {
                background-color: #ffffff;
                font-family: "Times New Roman", Times, serif;
                font-size: 12pt;
                line-height: 1.5;
                color: #000000;
                width: 100%;
                max-width: 8.5in;
                min-height: 11in;
                padding: 1in;
                margin: 0 auto;
                box-sizing: border-box;
              }

              .essay-title {
                font-size: 18pt;
                font-weight: bold;
                text-align: center;
                margin-bottom: 24px;
                color: #000000;
              }

              .essay-prompt {
                font-size: 11pt;
                font-style: italic;
                margin-bottom: 24px;
                padding: 12px;
                background-color: #f8f9fa;
                border-left: 4px solid #007bff;
                color: #000000;
              }

              .essay-prompt-label {
                font-weight: bold;
                font-style: normal;
                margin-bottom: 8px;
                color: #000000;
              }

              .essay-content {
                text-align: justify;
                color: #000000;
              }

              .essay-content p {
                margin-bottom: 12px;
                text-indent: 0.5in;
              }

              .essay-content p:first-child {
                text-indent: 0;
              }

              @media print {
                body {
                  margin: 0;
                  padding: 0;
                  background: white;
                }
                
                .essay-page {
                  width: 8.5in;
                  height: 11in;
                  margin: 0;
                  padding: 1in;
                  box-shadow: none;
                }
                
                .essay-content p {
                  page-break-inside: avoid;
                }
              }
            </style>
          </head>
          <body>
            <div class="essay-page">
              <div class="essay-title">${latestDocument.title}</div>
              ${prompt || latestDocument.metadata.prompt ? `
                <div class="essay-prompt">
                  <div class="essay-prompt-label">Essay Prompt:</div>
                  ${prompt || latestDocument.metadata.prompt}
                </div>
              ` : ''}
              <div class="essay-content">
                ${htmlContent}
              </div>
            </div>
          </body>
          </html>
        `);
        printWindow.document.close();
        
        // Wait for content to load, then trigger print
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 500);
        };
      }
    } catch (error) {
      console.error('[ESSAY_ERROR] Failed to generate PDF document:', {
        userId: user?.id || 'unknown',
        userEmail: user?.email || 'unknown',
        essayId: essayId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: 'User cannot download their essay as PDF - print dialog failed'
      });
      toast({
        title: "PDF generation failed",
        description: "Failed to open print dialog. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle essay escalation to founder - shows confirmation modal
  const handleEscalateEssay = () => {
    // Check if limit reached
    if (escalationStatus && !escalationStatus.canEscalate) {
      toast({
        title: "Limit Reached",
        description: `You have reached your escalation limit of ${escalationStatus.max}. Your limit will reset on your next subscription cycle.`,
        variant: "destructive"
      });
      return;
    }

    if (!document) {
      toast({
        title: "Error",
        description: "No essay content to escalate. Please save your essay first.",
        variant: "destructive"
      });
      return;
    }

    // Show confirmation modal
    setShowEscalateDialog(true);
  };

  // Confirm and execute essay escalation
  const confirmEscalateEssay = async () => {
    if (!document) return;

    setIsEscalating(true);
    setShowEscalateDialog(false);

    try {
      // Get current prompt and word limit
      const currentPrompt = prompt || document.metadata?.prompt || null;
      const currentWordLimit = wordLimit ? String(wordLimit) : document.metadata?.wordLimit ? String(document.metadata.wordLimit) : null;

      // Escalate the essay
      const result = await EscalatedEssaysService.escalateEssay(
        essayId,
        document.title,
        document,
        currentPrompt,
        currentWordLimit,
        document.id
      );

      if (result.success) {
        // Refresh escalation status
        const status = await EscalatedEssaysService.getUserEscalationStatus();
        setEscalationStatus(status);

        toast({
          title: "Essay sent to your counselor!",
          description: "Your essay has been successfully sent to your counselor for review. You'll be notified when feedback is available.",
        });
      } else {
        throw new Error('Escalation failed');
      }
    } catch (error) {
      console.error('Failed to escalate essay:', error);
      toast({
        title: "Escalation Failed",
        description: error instanceof Error ? error.message : "Failed to escalate essay. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsEscalating(false);
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

  const selectedUpgradeKey = upgradeFeatureKey || (isGeneratingGrammar ? 'grammar_check' : 'unlimited_essay_feedback');
  const upgradeTitleMap: Record<string, string> = {
    'unlimited_essay_feedback': 'Unlock AI Comments',
    'grammar_check': 'Unlock Grammar Check',
    'expert-review': 'Unlock Expert Review',
  };
  const upgradeDescriptionMap: Record<string, string> = {
    'unlimited_essay_feedback': 'AI comments are a Pro feature. Upgrade to generate unlimited expert suggestions.',
    'grammar_check': 'Grammar Check is included with Pro. Upgrade to receive detailed grammar fixes instantly.',
    'expert-review': 'Expert review is only available for Pro members. Upgrade to escalate essays directly to the founder.',
  };

  const upgradeModalTitle = upgradeTitleMap[selectedUpgradeKey] || 'Upgrade to Pro';
  const upgradeModalDescription = upgradeDescriptionMap[selectedUpgradeKey] || 'Unlock premium features and take your application to the next level.';

  // Check if AI comments exist for the current version
  // This must be before any early returns to follow Rules of Hooks
  const hasAICommentsForCurrentVersion = useMemo(() => {
    // Primary check: version has_ai_feedback flag
    if (currentVersion?.has_ai_feedback) {
      return true;
    }
    
    // Fallback check: check if document has any AI annotations
    if (document) {
      const hasAIAnnotations = document.blocks.some(block => 
        block.annotations?.some(annotation => annotation.author === 'ai')
      );
      return hasAIAnnotations;
    }
    
    return false;
  }, [currentVersion, document]);

  if (isLoading || migrationStatus.isMigrating) {
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
        <div className="mt-2">
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
            <div className={`flex-1 space-y-2 ${mobileView === 'comments' ? 'hidden lg:block' : ''}`}>
              {/* Prompt Section */}
              {(prompt || document.metadata.prompt) && (
                <div className="bg-white p-4 md:p-8 rounded-xl shadow-lg border border-gray-300 relative overflow-hidden group hover:shadow-xl transition-shadow duration-300">
                  {/* Subtle accent line */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>
                  
                  {/* Top action buttons - Founder Review, Expert Feedback, and Delete */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <PaywallGuard 
                      featureKey="expert-review"
                      fallback={
                        <Button 
                          onClick={() => {
                            setUpgradeFeatureKey('expert-review');
                            setShowUpgrade(true);
                          }} 
                          variant="outline"
                          size="sm"
                          className="border-orange-200 text-orange-700 hover:bg-orange-50"
                          title="Pro users only"
                        >
                          <ArrowUp className="h-4 w-4 mr-2" />
                          Founder Review
                          <Lock className="h-3 w-3 ml-2 text-primary" />
                        </Button>
                      }
                    >
                      <Button 
                        onClick={handleEscalateEssay}
                        disabled={
                          isEscalating || 
                          !document || 
                          (escalationStatus && !escalationStatus.canEscalate)
                        }
                        variant="outline"
                        size="sm"
                        className="border-orange-200 text-orange-700 hover:bg-orange-50"
                        title={
                          escalationStatus && !escalationStatus.canEscalate
                            ? `You have reached your escalation limit of ${escalationStatus.max}`
                            : "Send this essay to your counselor for review"
                        }
                      >
                        <ArrowUp className="h-4 w-4 mr-2" />
                        {isEscalating ? 'Escalating...' : (
                          <>
                            Send to My Counselor
                          </>
                        )}
                        <Crown className="h-3 w-3 ml-2 text-primary" />
                      </Button>
                    </PaywallGuard>
                    {hasFeedback && (
                      <Button 
                        onClick={() => navigate(`/essays/${essayId}/expert-reviews`)}
                        variant="default"
                        size="sm"
                        className="text-white border-[#D07D00] hover:opacity-90"
                        style={{ backgroundColor: '#D07D00' }}
                        title="View expert review and feedback"
                      >
                        View Expert Feedback
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDeleteDialog(true)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete essay"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
                    <div className="flex-shrink-0 self-center sm:self-start sm:mt-1">
                      <div className="p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-3 flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0">
                        <div className="flex items-center gap-2">
                          <span>{document.title}</span>
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
                        <span className={`text-sm ${(() => {
                          const limit = wordLimit || document.metadata.wordLimit;
                          if (!limit || (typeof limit === 'string' && (limit === 'Not specified' || limit === 'No limit'))) return 'text-gray-600';
                          const limitNum = typeof limit === 'number' ? limit : parseInt(limit as any);
                          if (isNaN(limitNum)) return 'text-gray-600';
                          return getCurrentWordCount() > limitNum ? 'text-red-600 font-medium' : 'text-gray-600';
                        })()}`}>
                          Word Limit: {getCurrentWordCount()}/{wordLimit || document.metadata.wordLimit || 'Not specified'}
                        </span>
                        {Boolean(currentVersion?.has_ai_feedback) && (
                          <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded border border-green-200">
                            read-only
                          </span>
                        )}
                        {(() => {
                          const limit = wordLimit || document.metadata.wordLimit;
                          if (!limit || (typeof limit === 'string' && (limit === 'Not specified' || limit === 'No limit'))) return null;
                          const limitNum = typeof limit === 'number' ? limit : parseInt(limit as any);
                          if (isNaN(limitNum)) return null;
                          return getCurrentWordCount() > limitNum;
                        })() && (
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
                                      <span>
                                        {currentVersion.version_name || `Version ${currentVersion.version_number}`}
                                        {!versionsWithAnnotations.has(currentVersion.id) && (
                                          <span className="text-gray-500 ml-1">(Clean)</span>
                                        )}
                                      </span>
                                    </span>
                                  </div>
                                ) : null}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {essayVersions.map((version) => {
                                const isClean = !versionsWithAnnotations.has(version.id);
                                const versionName = version.version_name || `Version ${version.version_number}`;
                                
                                return (
                                  <SelectItem key={version.id} value={version.id}>
                                    <div className="flex items-center space-x-2 w-full">
                                      <div className={`w-2 h-2 rounded-full ${
                                        version.is_active ? 'bg-blue-500' : 'bg-gray-400'
                                      }`} />
                                      <div className="flex-1">
                                        <div className="font-medium flex items-center space-x-2">
                                          <span>
                                            {versionName}
                                            {isClean && (
                                              <span className="text-gray-500 ml-1">(Clean)</span>
                                            )}
                                          </span>
                                        </div>
                                        {/* Hide version description to remove 'Fresh draft without previous comments.' */}
                                        <div className="text-xs text-gray-500"></div>
                                      </div>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        )}

                        {/* Feedback Sessions Dropdown */}
                        {feedbackSessions.length > 1 && (
                          <Select 
                            value={selectedFeedbackSession?.id || 'all'} 
                            onValueChange={(sessionId) => {
                              if (sessionId === 'all') {
                                setSelectedFeedbackSession(null);
                              } else {
                                const session = feedbackSessions.find(s => s.id === sessionId);
                                setSelectedFeedbackSession(session || null);
                              }
                            }}
                          >
                            <SelectTrigger className="w-auto min-w-[180px] bg-white border-gray-300 shadow-sm">
                              <SelectValue placeholder="All feedback">
                                {selectedFeedbackSession ? (
                                  <div className="flex items-center space-x-2">
                                    <span className="truncate">
                                      {selectedFeedbackSession.sessionDate.toLocaleDateString()} {selectedFeedbackSession.sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      ({selectedFeedbackSession.annotationCount} comments)
                                    </span>
                                  </div>
                                ) : (
                                  <span>All Feedback</span>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">
                                <div className="flex items-center space-x-2 w-full">
                                  <span>All Feedback</span>
                                  <span className="text-xs text-gray-500">
                                    ({feedbackSessions.reduce((sum, s) => sum + s.annotationCount, 0)} total)
                                  </span>
                                </div>
                              </SelectItem>
                              {feedbackSessions.map((session) => (
                                <SelectItem key={session.id} value={session.id}>
                                  <div className="flex items-center space-x-2 w-full">
                                    <div className="flex-1">
                                      <div className="font-medium">
                                        {session.sessionDate.toLocaleDateString()} {session.sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                      ({session.annotationCount} comments)
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              disabled={isCreatingVersion}
                              variant="outline"
                              size="sm"
                              className="border-purple-200 text-purple-700 hover:bg-purple-50"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              {isCreatingVersion ? 'Creating...' : 'New Version'}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={createNewVersionWithComments}
                              disabled={!hasAICommentsForCurrentVersion}
                              className={!hasAICommentsForCurrentVersion ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              New Version with AI Comments
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={createNewVersionClean}>
                              <FileText className="h-4 w-4 mr-2" />
                              New Version Clean
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <PaywallGuard 
                          featureKey="unlimited_essay_feedback"
                          fallback={
                            <Button 
                              onClick={() => {
                                setUpgradeFeatureKey('unlimited_essay_feedback');
                                setShowUpgrade(true);
                              }} 
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
                              onClick={() => {
                                setUpgradeFeatureKey('grammar_check');
                                setShowUpgrade(true);
                              }} 
                              disabled={isGeneratingGrammar}
                              variant="outline"
                              size="sm"
                              className="border-blue-200 text-blue-700 hover:bg-blue-50"
                              title="Pro users only"
                            >
                              <CheckSquare className="h-4 w-4 mr-2" />
                              Grammar Check
                              <Lock className="h-3 w-3 ml-2 text-primary" />
                            </Button>
                          }
                        >
                          <Button 
                            onClick={generateGrammarComments} 
                            disabled={isGeneratingGrammar || hasGrammarCheckCompleted}
                            variant="outline"
                            size="sm"
                            className="border-blue-200 text-blue-700 hover:bg-blue-50"
                            title={hasGrammarCheckCompleted ? "Please create a new version to check grammar again" : "Pro users only"}
                          >
                            <CheckSquare className="h-4 w-4 mr-2" />
                            {hasGrammarCheckCompleted ? "Grammar Checked ✓" : "Grammar Check"}
                            <Crown className="h-3 w-3 ml-2 text-primary" />
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
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 lg:p-8 mx-4 lg:mx-0 w-full overflow-hidden h-[calc(100vh-260px)] max-h-[calc(100vh-260px)]">
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
                  readOnly={Boolean(currentVersion?.has_ai_feedback)}
                  hasGrammarCheckRun={hasGrammarCheckRun}
                />
              </div>
            </div>

            {/* Mobile Comments View */}
            <div className={`lg:hidden ${mobileView === 'essay' ? 'hidden' : 'block'}`}>
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 h-full min-h-[600px] mx-4">
                <CommentSidebar
                  key={document.id}
                  blocks={(filteredDocument || document).blocks}
                  documentId={document.id}
                  onAnnotationResolve={handleAnnotationResolve}
                  onAnnotationDelete={handleAnnotationDelete}
                  onAnnotationSelect={handleAnnotationSelect}
                  selectedAnnotationId={selectedAnnotation?.id}
                  onDocumentReload={handleDocumentReload}
                  className="h-full border-0 rounded-lg"
                  hasGrammarCheckRun={hasGrammarCheckRun}
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

      {/* Escalate Essay Confirmation Dialog */}
      <Dialog open={showEscalateDialog} onOpenChange={setShowEscalateDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUp className="h-5 w-5 text-orange-600" />
              Escalate Essay for Review
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to escalate this essay to Mihir for review?
              <br /><br />
              Click continue to send the current version of your essay to Mihir.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEscalateDialog(false)}
              disabled={isEscalating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={confirmEscalateEssay}
              disabled={isEscalating}
            >
              {isEscalating ? (
                <>
                  Escalating...
                </>
              ) : (
                <>
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Continue
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => {
          setShowUpgrade(false);
          setUpgradeFeatureKey(null);
        }}
        featureKey={selectedUpgradeKey}
        title={upgradeModalTitle}
        description={upgradeModalDescription}
      />

    </div>
  );
};

export default SemanticEssayEditor;
