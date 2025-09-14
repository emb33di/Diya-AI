import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import OnboardingGuard from "@/components/OnboardingGuard";
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
import { resumeService, ResumeVersion } from "@/services/resumeService";

// ResumeVersion interface is now imported from resumeService

const Resume = () => {
  const [resumeVersions, setResumeVersions] = useState<ResumeVersion[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewingResume, setViewingResume] = useState<ResumeVersion | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Load resume versions on component mount
  useEffect(() => {
    loadResumeVersions();
  }, []);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (resumeUrl) {
        window.URL.revokeObjectURL(resumeUrl);
      }
    };
  }, [resumeUrl]);

  const loadResumeVersions = async () => {
    try {
      const versions = await resumeService.getResumeVersions();
      setResumeVersions(versions);
    } catch (error) {
      console.error('Failed to load resume versions:', error);
      toast({
        title: "Error",
        description: "Failed to load resume versions. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload resume using the service
      const result = await resumeService.uploadResume(selectedFile);

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      setSelectedFile(null);
      setUploadProgress(100);

      toast({
        title: "Resume uploaded successfully",
        description: "Your resume is being processed for feedback.",
      });

      // Reload resume versions to show the new upload
      await loadResumeVersions();

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "There was an error uploading your resume. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
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

  const handleDelete = async (versionId: string) => {
    try {
      await resumeService.deleteResumeVersion(versionId);
      toast({
        title: "Resume deleted",
        description: "The resume version has been deleted successfully.",
      });
      await loadResumeVersions();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete the resume version. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDownload = async (versionId: string) => {
    try {
      const blob = await resumeService.downloadResume(versionId);
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resume_version_${versionId}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: "Failed to download the resume. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleView = async (version: ResumeVersion) => {
    try {
      setViewingResume(version);
      const blob = await resumeService.downloadResume(version.id);
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        setResumeUrl(url);
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
    if (resumeUrl) {
      window.URL.revokeObjectURL(resumeUrl);
      setResumeUrl(null);
    }
  };

  const getStatusIcon = (status: ResumeVersion['status']) => {
    switch (status) {
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: ResumeVersion['status']) => {
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
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-background via-primary/5 to-secondary/10 p-4 min-h-screen">
          <main className="container mx-auto px-6 py-8">
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
                    <div className="space-y-2">
                      <Label htmlFor="resume-upload">Choose File</Label>
                      <Input
                        id="resume-upload"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileSelect}
                        disabled={uploading}
                      />
                      <p className="text-sm text-muted-foreground">
                        Supported formats: PDF (Max 5MB)
                      </p>
                    </div>

                    {selectedFile && (
                      <div className="p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span className="font-medium">{selectedFile.name}</span>
                          <Badge variant="secondary">{formatFileSize(selectedFile.size)}</Badge>
                        </div>
                      </div>
                    )}

                    {uploading && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Uploading...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                      </div>
                    )}

                    <Button 
                      onClick={handleUpload} 
                      disabled={!selectedFile || uploading}
                      className="w-full"
                    >
                      {uploading ? "Uploading..." : "Upload Resume"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="versions" className="space-y-6">
                <div className="grid gap-6">
                  {resumeVersions.length === 0 ? (
                    <Card className="shadow-lg">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No resumes uploaded yet</h3>
                        <p className="text-muted-foreground text-center mb-4">
                          Upload your first resume to get started with AI-powered feedback
                        </p>
                        <Button onClick={() => document.getElementById('resume-upload')?.click()}>
                          <Plus className="h-4 w-4 mr-2" />
                          Upload Resume
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    resumeVersions.map((version) => (
                      <Card key={version.id} className="shadow-lg">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <FileText className="h-5 w-5 text-primary" />
                              <div>
                                <CardTitle className="text-lg">
                                  {version.filename}
                                </CardTitle>
                                <CardDescription>
                                  Version {version.version} • {formatFileSize(version.file_size)} • {formatDate(version.upload_date)}
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getStatusColor(version.status)}>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(version.status)}
                                  <span className="capitalize">{version.status}</span>
                                </div>
                              </Badge>
                              <Button size="sm" variant="outline" onClick={() => handleDownload(version.id)}>
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleView(version)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDelete(version.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        
                        {version.feedback && (
                          <CardContent className="space-y-6">
                            {/* Overall Scores */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Star className="h-4 w-4 text-yellow-500" />
                                  <span className="font-medium">Overall Score</span>
                                </div>
                                <div className="text-2xl font-bold text-primary">
                                  {version.feedback.overall_score}/100
                                </div>
                                <Progress value={version.feedback.overall_score} className="h-2" />
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <CheckCircle className="h-4 w-4 text-blue-500" />
                                  <span className="font-medium">College Readiness</span>
                                </div>
                                <div className="text-2xl font-bold text-blue-600">
                                  {version.feedback.college_readiness_score}/100
                                </div>
                                <Progress value={version.feedback.college_readiness_score} className="h-2" />
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <FileText className="h-4 w-4 text-green-500" />
                                  <span className="font-medium">Format Score</span>
                                </div>
                                <div className="text-2xl font-bold text-green-600">
                                  {Math.round((version.feedback.format_analysis?.structure_score + version.feedback.format_analysis?.readability_score + version.feedback.format_analysis?.visual_appeal_score) / 3)}/100
                                </div>
                                <Progress value={Math.round((version.feedback.format_analysis?.structure_score + version.feedback.format_analysis?.readability_score + version.feedback.format_analysis?.visual_appeal_score) / 3)} className="h-2" />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Strengths */}
                              <div className="space-y-2">
                                <h4 className="font-medium text-green-700">Strengths</h4>
                                <ul className="space-y-1">
                                  {version.feedback.strengths?.map((strength, index) => (
                                    <li key={index} className="text-sm text-green-600 flex items-start space-x-2">
                                      <CheckCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                      <span>{strength}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Weaknesses */}
                              <div className="space-y-2">
                                <h4 className="font-medium text-red-700">Areas for Improvement</h4>
                                <ul className="space-y-1">
                                  {version.feedback.weaknesses?.map((weakness, index) => (
                                    <li key={index} className="text-sm text-red-600 flex items-start space-x-2">
                                      <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                      <span>{weakness}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Academic & Extracurricular Analysis */}
                            {version.feedback.academic_analysis && (
                              <div className="space-y-4">
                                <h4 className="font-medium">Academic & Extracurricular Analysis</h4>
                                
                                {/* Academic Achievements */}
                                {version.feedback.academic_analysis.academic_achievements?.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-medium text-green-700 mb-2">Academic Achievements</h5>
                                    <div className="flex flex-wrap gap-1">
                                      {version.feedback.academic_analysis.academic_achievements.map((achievement, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs bg-green-100 text-green-800">
                                          {achievement}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Leadership Roles */}
                                {version.feedback.academic_analysis.leadership_roles?.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-medium text-blue-700 mb-2">Leadership Roles</h5>
                                    <div className="flex flex-wrap gap-1">
                                      {version.feedback.academic_analysis.leadership_roles.map((role, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                          {role}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Community Service */}
                                {version.feedback.academic_analysis.community_service?.length > 0 && (
                                  <div>
                                    <h5 className="text-sm font-medium text-purple-700 mb-2">Community Service</h5>
                                    <div className="flex flex-wrap gap-1">
                                      {version.feedback.academic_analysis.community_service.map((service, index) => (
                                        <Badge key={index} variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                                          {service}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Extracurricular Depth Score */}
                                <div>
                                  <h5 className="text-sm font-medium mb-1">Extracurricular Depth</h5>
                                  <div className="flex items-center space-x-2">
                                    <Progress value={version.feedback.academic_analysis.extracurricular_depth * 100} className="h-2 flex-1" />
                                    <span className="text-sm text-muted-foreground">
                                      {Math.round(version.feedback.academic_analysis.extracurricular_depth * 100)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Suggestions */}
                            <div className="space-y-2">
                              <h4 className="font-medium">Actionable Suggestions</h4>
                              <ul className="space-y-1">
                                {version.feedback.suggestions?.map((suggestion, index) => (
                                  <li key={index} className="text-sm text-muted-foreground flex items-start space-x-2">
                                    <span className="text-primary font-bold">{index + 1}.</span>
                                    <span>{suggestion}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>

      {/* Resume View Modal */}
      <Dialog open={!!viewingResume} onOpenChange={handleCloseView}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>View Resume: {viewingResume?.filename}</span>
              <Button variant="ghost" size="sm" onClick={handleCloseView}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            {viewingResume && resumeUrl && (
              <div className="h-full">
                {viewingResume.file_type === 'application/pdf' ? (
                  <iframe
                    src={resumeUrl}
                    className="w-full h-[70vh] border rounded"
                    title={`Resume: ${viewingResume.filename}`}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
                    <FileText className="h-16 w-16 text-muted-foreground" />
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-2">Word Document</h3>
                      <p className="text-muted-foreground mb-4">
                        Word documents cannot be displayed in the browser. Please download the file to view it.
                      </p>
                      <Button onClick={() => handleDownload(viewingResume.id)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Resume
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </OnboardingGuard>
  );
};

export default Resume;
