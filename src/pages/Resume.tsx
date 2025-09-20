import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import OnboardingGuard from "@/components/OnboardingGuard";
import ProfileCompletionGuard from "@/components/ProfileCompletionGuard";
import GradientBackground from "@/components/GradientBackground";
import EnhancedLoadingPane from "@/components/EnhancedLoadingPane";
import MobileResponsiveWrapper from "@/components/MobileResponsiveWrapper";
import ResumeComparisonView from "@/components/ResumeComparisonView";
import DragDropUpload from "@/components/DragDropUpload";
import { 
  Upload, 
  FileText, 
  Download, 
  Eye, 
  Trash2, 
  Plus, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Star,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { structuredResumeService } from "@/services/structuredResumeService";
import { 
  StructuredResumeRecord, 
  ResumeFeedbackRecord, 
  ResumeProcessingState,
  ResumeViewState 
} from "@/types/resume";

const Resume = () => {
  const [resumeRecords, setResumeRecords] = useState<StructuredResumeRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewingResume, setViewingResume] = useState<ResumeViewState | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  // Loading pane state for AI processing
  const [showLoadingPane, setShowLoadingPane] = useState(false);
  const [currentProcessingStep, setCurrentProcessingStep] = useState(0);
  const [processingResumeId, setProcessingResumeId] = useState<string | null>(null);

  // Define processing steps for resume analysis
  const processingSteps = [
    {
      id: 'upload',
      label: 'Uploading Resume',
      description: 'Securely uploading your resume file',
      estimatedTime: 2
    },
    {
      id: 'extract',
      label: 'Extracting Content',
      description: 'AI is extracting structured data from your resume',
      estimatedTime: 15
    },
    {
      id: 'analyze',
      label: 'AI Analysis',
      description: 'Diya is analyzing your resume for college readiness',
      estimatedTime: 30
    },
    {
      id: 'feedback',
      label: 'Generating Feedback',
      description: 'Creating personalized recommendations and enhanced resume',
      estimatedTime: 20
    },
    {
      id: 'complete',
      label: 'Finalizing Results',
      description: 'Preparing your comprehensive feedback report',
      estimatedTime: 5
    }
  ];

  // Load resume records on component mount
  useEffect(() => {
    loadResumeRecords();
  }, []);

  // Check for processing resumes and show loading pane if needed
  useEffect(() => {
    const processingResume = resumeRecords.find(record => 
      record.extraction_status === 'processing' || 
      (record.extraction_status === 'completed' && !resumeRecords.some(r => r.id === record.id))
    );
    
    if (processingResume && !showLoadingPane) {
      // Resume is processing, show loading pane
      setProcessingResumeId(processingResume.id);
      setShowLoadingPane(true);
      setCurrentProcessingStep(1); // Start from extraction step
      
      // Simulate remaining steps
      const simulateRemainingSteps = async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        setCurrentProcessingStep(2);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        setCurrentProcessingStep(3);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        setCurrentProcessingStep(4);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        setCurrentProcessingStep(5);
      };
      
      simulateRemainingSteps();
    }
  }, [resumeRecords, showLoadingPane]);

  // Function to simulate processing steps
  const simulateProcessingSteps = async (resumeId: string) => {
    setProcessingResumeId(resumeId);
    setShowLoadingPane(true);
    setCurrentProcessingStep(0);

    // Step 1: Upload (already done)
    await new Promise(resolve => setTimeout(resolve, 1000));
    setCurrentProcessingStep(1);

    // Step 2: Extract content
    await new Promise(resolve => setTimeout(resolve, 2000));
    setCurrentProcessingStep(2);

    // Step 3: AI Analysis
    await new Promise(resolve => setTimeout(resolve, 3000));
    setCurrentProcessingStep(3);

    // Step 4: Generate feedback
    await new Promise(resolve => setTimeout(resolve, 2000));
    setCurrentProcessingStep(4);

    // Step 5: Complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    setCurrentProcessingStep(5);
  };

  // Function to handle loading pane completion
  const handleLoadingComplete = () => {
    setShowLoadingPane(false);
    setCurrentProcessingStep(0);
    setProcessingResumeId(null);
    
    // Reload resume records to show updated feedback
    loadResumeRecords();
    
    // Switch to the versions tab to show the results
    const versionsTab = document.querySelector('[value="versions"]') as HTMLElement;
    versionsTab?.click();
    
    toast({
      title: "Resume Analysis Complete! 🎉",
      description: "Your personalized feedback is ready! Check out your enhanced resume and detailed analysis.",
    });
  };

  const loadResumeRecords = async () => {
    try {
      const records = await structuredResumeService.getResumeRecords();
      setResumeRecords(records);
    } catch (error) {
      console.error('Failed to load resume records:', error);
      toast({
        title: "Error",
        description: "Failed to load resume records. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleFileSelect = (fileOrEvent: File | React.ChangeEvent<HTMLInputElement>) => {
    // Handle both File object (from drag/drop) and Event object (from file input)
    const file = fileOrEvent instanceof File ? fileOrEvent : fileOrEvent.target.files?.[0];
    
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or Word document.",
          variant: "destructive"
        });
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB.",
          variant: "destructive"
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);

    try {
      // Upload resume using the structured service
      const result = await structuredResumeService.uploadResume(selectedFile);

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Clear the selected file
      setSelectedFile(null);

      // Show success toast
      toast({
        title: "Resume Submitted Successfully! 🎉",
        description: "Your resume has been uploaded and AI analysis is starting...",
      });

      // Start the processing simulation with loading pane
      if (result.resume_record?.id) {
        await simulateProcessingSteps(result.resume_record.id);
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "There was an error uploading your resume. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = async (recordId: string) => {
    try {
      await structuredResumeService.deleteResumeRecord(recordId);
      toast({
        title: "Resume deleted",
        description: "The resume record has been deleted successfully.",
      });
      await loadResumeRecords();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete the resume record. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDownload = async (recordId: string, fileType: 'pdf' | 'docx') => {
    try {
      // Get or generate the file
      const fileData = await structuredResumeService.getResumeFileForDownload(recordId, fileType);
      
      // Create download link
      const url = window.URL.createObjectURL(fileData.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileData.filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download Started",
        description: `${fileType.toUpperCase()} file is being downloaded.`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Failed to download the resume file. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleView = async (record: StructuredResumeRecord) => {
    try {
      const recordWithFeedback = await structuredResumeService.getResumeRecordWithFeedback(record.id);
      
      if (recordWithFeedback) {
        setViewingResume({
          originalResume: recordWithFeedback.resume.structured_data,
          improvedResume: recordWithFeedback.feedback?.feedback_data.improved_resume_data || null,
          feedback: recordWithFeedback.feedback?.feedback_data || null,
          showComparison: true,
          resumeDataId: record.id
        });
      }
    } catch (error) {
      console.error('View error:', error);
      toast({
        title: "View failed",
        description: "Failed to load the resume for viewing. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCloseView = () => {
    setViewingResume(null);
  };

  const getStatusIcon = (status: 'processing' | 'completed' | 'error') => {
    switch (status) {
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: 'processing' | 'completed' | 'error') => {
    switch (status) {
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <OnboardingGuard pageName="Resume">
      <ProfileCompletionGuard pageName="Resume">
        <GradientBackground>
          <MobileResponsiveWrapper>
            <main className="container mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-display font-bold mb-2">Resume Review</h1>
              <p className="text-muted-foreground text-lg">
                Upload and manage your resume drafts with personalized feedback from Diya
              </p>
            </div>

            <Tabs defaultValue="upload" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload New Resume</TabsTrigger>
                <TabsTrigger value="versions">Resume Versions</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-6">
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Upload className="h-5 w-5" />
                      <span>Upload Resume</span>
                    </CardTitle>
                    <CardDescription>
                      Upload a PDF document to get feedback from Diya
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <DragDropUpload
                      onFileSelect={handleFileSelect}
                      selectedFile={selectedFile}
                      uploading={uploading}
                      onRemoveFile={() => setSelectedFile(null)}
                    />

                    <Button 
                      onClick={() => setShowConfirmDialog(true)} 
                      disabled={!selectedFile || uploading}
                      className="w-full"
                    >
                      {uploading ? "Uploading..." : "Submit Resume for Analysis"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="versions" className="space-y-6">
                <div className="grid gap-6">
                  {resumeRecords.length === 0 ? (
                    <Card className="shadow-lg">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No resumes uploaded yet</h3>
                        <p className="text-muted-foreground text-center mb-4">
                          Upload your first resume to get started with AI-powered feedback and enhancement
                        </p>
                        <Button onClick={() => {
                          // Switch to upload tab
                          const uploadTab = document.querySelector('[value="upload"]') as HTMLElement;
                          uploadTab?.click();
                        }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Upload Resume
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    resumeRecords.map((record) => (
                      <Card key={record.id} className="shadow-lg">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-5 w-5 text-primary" />
                              <div>
                                <CardTitle className="text-lg">
                                  {record.original_filename}
                                </CardTitle>
                                <CardDescription>
                                  Version {record.version} • {formatFileSize(record.original_file_size)} • {formatDate(record.upload_date)}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getStatusColor(record.extraction_status)}>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(record.extraction_status)}
                                  <span className="capitalize">{record.extraction_status}</span>
                                </div>
                              </Badge>
                              <Button size="sm" variant="outline" onClick={() => handleDownload(record.id, 'pdf')}>
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleView(record)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDelete(record.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        
                        {record.extraction_status === 'completed' && (
                          <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-medium text-green-700">Content Extracted Successfully</span>
                              </div>
                              <Button 
                                size="sm" 
                                onClick={() => handleView(record)}
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Analysis
                              </Button>
                            </div>
                            
                            {record.extraction_error && (
                              <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  Extraction completed with warnings: {record.extraction_error}
                                </AlertDescription>
                              </Alert>
                            )}
                          </CardContent>
                        )}

                        {record.extraction_status === 'processing' && (
                          <CardContent>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-yellow-500 animate-spin" />
                              <span className="text-sm text-muted-foreground">Extracting content from resume...</span>
                            </div>
                          </CardContent>
                        )}

                        {record.extraction_status === 'error' && (
                          <CardContent>
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                Failed to extract content: {record.extraction_error || 'Unknown error'}
                              </AlertDescription>
                            </Alert>
                          </CardContent>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
            </main>
          </MobileResponsiveWrapper>

      {/* Resume Analysis Modal */}
      <Dialog open={!!viewingResume} onOpenChange={handleCloseView}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden w-full mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Resume Analysis & Enhancement</span>
              <Button variant="ghost" size="sm" onClick={handleCloseView}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            {viewingResume && (
              <MobileResponsiveWrapper>
                <ResumeComparisonView
                  originalResume={viewingResume.originalResume}
                  improvedResume={viewingResume.improvedResume}
                  feedback={viewingResume.feedback!}
                  resumeDataId={viewingResume.resumeDataId}
                  onDownload={(fileType) => {
                    if (viewingResume.resumeDataId) {
                      handleDownload(viewingResume.resumeDataId, fileType);
                    }
                  }}
                  onViewResume={() => {
                    // For now, just show a message
                    toast({
                      title: "Full Resume View",
                      description: "Full resume view feature coming soon!",
                    });
                  }}
                />
              </MobileResponsiveWrapper>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <span>Confirm Resume Submission</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedFile && (
              <div className="p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)} • {selectedFile.type.split('/')[1].toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Are you ready to submit this resume for AI analysis? Diya will:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Extract and structure your resume content</li>
                <li>• Analyze strengths and areas for improvement</li>
                <li>• Generate personalized recommendations</li>
                <li>• Create an enhanced version of your resume</li>
              </ul>
            </div>
            
            <div className="flex space-x-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  setShowConfirmDialog(false);
                  await handleUpload();
                }}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Submit for Analysis
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Loading Pane for AI Processing */}
      <EnhancedLoadingPane
        isVisible={showLoadingPane}
        steps={processingSteps}
        currentStepIndex={currentProcessingStep}
        onComplete={handleLoadingComplete}
        onCancel={() => {
          setShowLoadingPane(false);
          setCurrentProcessingStep(0);
          setProcessingResumeId(null);
          toast({
            title: "Analysis Cancelled",
            description: "Resume analysis has been cancelled. You can try again later.",
            variant: "destructive"
          });
        }}
        showCancelButton={true}
        realTimeProgress={true}
      />
        </GradientBackground>
      </ProfileCompletionGuard>
    </OnboardingGuard>
  );
};

export default Resume;
