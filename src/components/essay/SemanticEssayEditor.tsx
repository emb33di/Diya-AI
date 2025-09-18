/**
 * Semantic Essay Editor
 * 
 * A complete essay editor built on the new semantic document architecture.
 * Provides Google Docs-like commenting experience with stable AI integration.
 */

import React, { useState, useEffect } from 'react';
import { SemanticDocument, Annotation } from '@/types/semanticDocument';
import { semanticDocumentService } from '@/services/semanticDocumentService';
import { migrationUtils } from '@/utils/migrationUtils';
import { ExportService } from '@/services/exportService';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import SemanticEditor from './SemanticEditor';
import CommentOverlay from './CommentOverlay';
import AICommentsLoadingPane, { AI_COMMENTS_LOADING_STEPS } from './AICommentsLoadingPane';
import GrammarLoadingPane, { GRAMMAR_LOADING_STEPS } from './GrammarLoadingPane';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  SidebarClose
} from 'lucide-react';

interface SemanticEssayEditorProps {
  essayId: string;
  title: string;
  prompt?: string;
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
  const [migrationStatus, setMigrationStatus] = useState<{
    isMigrating: boolean;
    progress: number;
    message: string;
  }>({
    isMigrating: false,
    progress: 0,
    message: ''
  });

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

          const migrationResult = await migrationUtils.migrateEssay(
            essayId,
            initialContent,
            title
          );

          if (migrationResult.success) {
            setDocument(migrationResult.document);
            setMigrationStatus({
              isMigrating: false,
              progress: 100,
              message: `Migration completed: ${migrationResult.migratedComments} comments migrated`
            });
          } else {
            // Create new document if migration fails
            const newDocument = await semanticDocumentService.createDocument(
              title,
              essayId,
              'user', // TODO: Get actual user ID
              { prompt: prompt || '', wordLimit: wordLimit || 650 }
            );

            // Convert initial content to blocks (only for initial creation)
            const blocks = semanticDocumentService.convertHtmlToBlocks(initialContent, true);
            newDocument.blocks = blocks;
            
            await semanticDocumentService.saveDocument(newDocument);
            setDocument(newDocument);
            
            setMigrationStatus({
              isMigrating: false,
              progress: 100,
              message: 'Created new semantic document'
            });
          }
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
    setSelectedAnnotation(annotation);
  };

  // Handle save status changes
  const handleSaveStatusChange = (isAutoSaving: boolean, lastSaved: Date | null) => {
    setIsAutoSaving(isAutoSaving);
    setLastSaved(lastSaved);
  };

  // Generate AI comments
  const generateAIComments = async () => {
    if (!document) return;

    setIsGeneratingAIComments(true);
    setLoadingStep(0);

    try {
      // Simulate loading steps
      const stepDurations = [1000, 2000, 1500, 500]; // Duration for each step in ms
      
      // Step through each loading phase
      for (let i = 0; i < AI_COMMENTS_LOADING_STEPS.length; i++) {
        setLoadingStep(i);
        await new Promise(resolve => setTimeout(resolve, stepDurations[i]));
      }

      const response = await semanticDocumentService.generateAIComments({
        documentId: document.id,
        blocks: document.blocks,
        context: {
          prompt: document.metadata.prompt,
          wordLimit: document.metadata.wordLimit
        }
      });

      if (response.success) {
        // Reload document to get updated comments
        const updatedDocument = await semanticDocumentService.loadDocument(document.id);
        if (updatedDocument) {
          setDocument(updatedDocument);
        }
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
      // Simulate loading steps
      const stepDurations = [800, 1200, 600]; // Duration for each step in ms
      
      // Step through each loading phase
      for (let i = 0; i < GRAMMAR_LOADING_STEPS.length; i++) {
        setGrammarLoadingStep(i);
        await new Promise(resolve => setTimeout(resolve, stepDurations[i]));
      }

      const response = await semanticDocumentService.generateGrammarComments({
        documentId: document.id,
        blocks: document.blocks,
        context: {
          prompt: document.metadata.prompt,
          wordLimit: document.metadata.wordLimit
        }
      });

      if (response.success) {
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

    const htmlContent = semanticDocumentService.convertBlocksToHtml(document.blocks);
    
    await ExportService.exportToDOCX({
      title: document.title,
      content: htmlContent,
      prompt: prompt || document.metadata.prompt,
      wordLimit: wordLimit || document.metadata.wordLimit
    });
  };

  // Export document as PDF
  const exportAsPDF = async () => {
    if (!document) return;

    const htmlContent = semanticDocumentService.convertBlocksToHtml(document.blocks);
    
    await ExportService.exportToPDF({
      title: document.title,
      content: htmlContent,
      prompt: prompt || document.metadata.prompt,
      wordLimit: wordLimit || document.metadata.wordLimit
    });
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
        <Card>
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
                <div>
                  <h1 className="text-2xl font-bold">{document.title}</h1>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {stats && (stats.toneComments > 0 || stats.clarityComments > 0 || stats.strengthsComments > 0 || stats.weaknessesComments > 0) && (
                      <>
                        <span>•</span>
                        <div className="flex gap-1">
                          {stats.toneComments > 0 && (
                            <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                              {stats.toneComments} tone
                            </Badge>
                          )}
                          {stats.clarityComments > 0 && (
                            <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                              {stats.clarityComments} clarity
                            </Badge>
                          )}
                          {stats.strengthsComments > 0 && (
                            <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                              {stats.strengthsComments} strengths
                            </Badge>
                          )}
                          {stats.weaknessesComments > 0 && (
                            <Badge variant="outline" className="text-xs border-red-300 text-red-700">
                              {stats.weaknessesComments} improvements
                            </Badge>
                          )}
                        </div>
                      </>
                    )}
                    <span>•</span>
                    {isAutoSaving ? (
                      <>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span>Saving...</span>
                      </>
                    ) : lastSaved ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-xs text-green-600 ml-1 font-medium">(Instant Save)</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowCommentSidebar(!showCommentSidebar)}
                    variant="outline"
                    className={cn(
                      "border-purple-200 hover:bg-purple-50",
                      showCommentSidebar && "bg-purple-100 text-purple-700"
                    )}
                  >
                    {showCommentSidebar ? (
                      <SidebarClose className="h-4 w-4 mr-2" />
                    ) : (
                      <Sidebar className="h-4 w-4 mr-2" />
                    )}
                    Comments
                    {stats && stats.unresolvedComments > 0 && (
                      <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                        {stats.unresolvedComments}
                      </Badge>
                    )}
                  </Button>
                  <Button 
                    onClick={generateAIComments} 
                    disabled={isGeneratingAIComments}
                    variant="outline"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Comments
                  </Button>
                  <Button 
                    onClick={generateGrammarComments} 
                    disabled={isGeneratingGrammar}
                    variant="outline"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Grammar Check
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
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
                        <span>Essay Prompt</span>
                        <div className="sm:ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full self-start">
                          Required
                        </div>
                      </h3>
                      <div className="prose prose-gray max-w-none">
                        <p className="text-gray-700 leading-relaxed m-0" style={{ fontFamily: 'Times New Roman, serif', fontSize: '16px' }}>
                          {prompt || document.metadata.prompt}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Word limit reminder */}
                  <div className="mt-4 md:mt-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        Word limit: {wordLimit || document.metadata.wordLimit || 650} words
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Editor */}
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 min-h-[600px]">
                <SemanticEditor
                  documentId={document.id}
                  essayId={essayId}
                  title={document.title}
                  onDocumentChange={handleDocumentChange}
                  onAnnotationSelect={handleAnnotationSelect}
                  onSaveStatusChange={handleSaveStatusChange}
                  showCommentSidebar={showCommentSidebar}
                  selectedAnnotationId={selectedAnnotation?.id}
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
        onComplete={() => {
          setIsGeneratingGrammar(false);
          setGrammarLoadingStep(0);
        }}
      />
    </div>
  );
};

export default SemanticEssayEditor;
