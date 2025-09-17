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
import SemanticEditor from './SemanticEditor';
import CommentOverlay from './CommentOverlay';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  MessageSquare, 
  Sparkles, 
  Download, 
  Upload,
  Settings,
  BarChart3,
  CheckCircle,
  AlertCircle
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
  const [isLoading, setIsLoading] = useState(true);
  const [migrationStatus, setMigrationStatus] = useState<{
    isMigrating: boolean;
    progress: number;
    message: string;
  }>({
    isMigrating: false,
    progress: 0,
    message: ''
  });

  // Load or create document on mount
  useEffect(() => {
    const initializeDocument = async () => {
      setIsLoading(true);
      
      try {
        // Check if semantic document already exists
        const existingDocument = await semanticDocumentService.loadDocument(essayId);
        
        if (existingDocument) {
          setDocument(existingDocument);
        } else {
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

            // Convert initial content to blocks
            const blocks = semanticDocumentService.convertHtmlToBlocks(initialContent);
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

  // Generate AI comments
  const generateAIComments = async () => {
    if (!document) return;

    try {
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
    } catch (error) {
      console.error('Failed to generate AI comments:', error);
    }
  };

  // Export document as HTML
  const exportAsHTML = () => {
    if (!document) return;

    const htmlContent = semanticDocumentService.convertBlocksToHtml(document.blocks);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${document.title}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get document statistics
  const getDocumentStats = () => {
    if (!document) return null;

    const allAnnotations = semanticDocumentService.getAllAnnotations(document);
    const aiAnnotations = allAnnotations.filter(a => a.author === 'ai');
    const userAnnotations = allAnnotations.filter(a => a.author === 'user');
    const resolvedAnnotations = allAnnotations.filter(a => a.resolved);

    return {
      totalBlocks: document.blocks.length,
      totalComments: allAnnotations.length,
      aiComments: aiAnnotations.length,
      userComments: userAnnotations.length,
      resolvedComments: resolvedAnnotations.length,
      unresolvedComments: allAnnotations.length - resolvedAnnotations.length
    };
  };

  if (isLoading || migrationStatus.isMigrating) {
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
      <Tabs defaultValue="editor" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="editor" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="comments" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Comments
            {stats && stats.unresolvedComments > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                {stats.unresolvedComments}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="mt-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{document.title}</h1>
                <p className="text-sm text-gray-500">
                  {stats?.totalBlocks} blocks • {stats?.totalComments} comments
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={generateAIComments} variant="outline">
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Comments
                </Button>
                <Button onClick={exportAsHTML} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export HTML
                </Button>
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
                      <p className="text-gray-700 leading-relaxed text-base md:text-lg m-0">
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
            <SemanticEditor
              documentId={document.id}
              essayId={essayId}
              title={document.title}
              onDocumentChange={handleDocumentChange}
              onAnnotationSelect={handleAnnotationSelect}
            />
          </div>
        </TabsContent>

        <TabsContent value="comments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                All Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {document.blocks.map(block => (
                  <div key={block.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm text-gray-600">
                        Block {block.position + 1} ({block.type})
                      </h4>
                      <Badge variant="outline">
                        {block.annotations.length} comments
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-500 mb-3 line-clamp-2">
                      {block.content.substring(0, 100)}...
                    </div>
                    
                    {block.annotations.length > 0 ? (
                      <div className="space-y-2">
                        {block.annotations.map(annotation => (
                          <div
                            key={annotation.id}
                            className={`p-3 rounded-lg border-l-4 ${
                              annotation.type === 'suggestion' ? 'border-l-green-500 bg-green-50' :
                              annotation.type === 'critique' ? 'border-l-red-500 bg-red-50' :
                              annotation.type === 'praise' ? 'border-l-purple-500 bg-purple-50' :
                              annotation.type === 'question' ? 'border-l-yellow-500 bg-yellow-50' :
                              'border-l-blue-500 bg-blue-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {annotation.type}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {annotation.author === 'ai' ? 'AI' : 'User'}
                                </Badge>
                                {annotation.resolved && (
                                  <Badge variant="outline" className="text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Resolved
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <p className="mt-2 text-sm">{annotation.content}</p>
                            
                            {annotation.targetText && (
                              <div className="mt-2 p-2 bg-white rounded border text-xs text-gray-600">
                                <strong>Target:</strong> "{annotation.targetText}"
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No comments yet</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Document Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.totalBlocks}</div>
                    <div className="text-sm text-gray-500">Total Blocks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.totalComments}</div>
                    <div className="text-sm text-gray-500">Total Comments</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{stats.aiComments}</div>
                    <div className="text-sm text-gray-500">AI Comments</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{stats.userComments}</div>
                    <div className="text-sm text-gray-500">User Comments</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.resolvedComments}</div>
                    <div className="text-sm text-gray-500">Resolved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{stats.unresolvedComments}</div>
                    <div className="text-sm text-gray-500">Unresolved</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Document Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Title
                  </label>
                  <input
                    type="text"
                    value={document.title}
                    onChange={(e) => {
                      const updatedDocument = { ...document, title: e.target.value };
                      setDocument(updatedDocument);
                      onTitleChange?.(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Word Limit
                  </label>
                  <input
                    type="number"
                    value={document.metadata.wordLimit || 650}
                    onChange={(e) => {
                      const updatedDocument = {
                        ...document,
                        metadata: { ...document.metadata, wordLimit: parseInt(e.target.value) }
                      };
                      setDocument(updatedDocument);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Essay Prompt
                  </label>
                  <textarea
                    value={document.metadata.prompt || ''}
                    onChange={(e) => {
                      const updatedDocument = {
                        ...document,
                        metadata: { ...document.metadata, prompt: e.target.value }
                      };
                      setDocument(updatedDocument);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SemanticEssayEditor;
