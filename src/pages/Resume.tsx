import { useState, useEffect, useCallback, useRef } from "react";
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
import ResumePreview from "@/components/ResumePreview";
import DragDropUpload from "@/components/DragDropUpload";
import AddActivityDropdown from "@/components/AddActivityDropdown";
import ActivityEditor from "@/components/ActivityEditor";
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
  X,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { structuredResumeService } from "@/services/structuredResumeService";
import { resumeActivitiesService } from "@/services/resumeActivitiesService";
import { supabase } from "@/integrations/supabase/client";
import { 
  StructuredResumeRecord, 
  ResumeFeedbackRecord, 
  ResumeProcessingState,
  ResumeViewState 
} from "@/types/resume";
import { ResumeData as BackendResumeData } from "@/integrations/supabase/types";

// Define the activity data structure
interface ActivityData {
  id: string;
  title: string;
  position: string;
  fromDate: string;
  toDate: string;
  isCurrent: boolean;
  bullets: string[];
}

// Define the resume data structure
interface ResumeData {
  academic: ActivityData[];
  experience: ActivityData[];
  projects: ActivityData[];
  extracurricular: ActivityData[];
  volunteering: ActivityData[];
  skills: ActivityData[];
  interests: ActivityData[];
  languages: ActivityData[];
}

const Resume = () => {
  const [resumeRecords, setResumeRecords] = useState<StructuredResumeRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewingResume, setViewingResume] = useState<ResumeViewState | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    full_name?: string;
    email_address?: string;
    phone_number?: string;
  } | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { toast } = useToast();

  // Resume data state for block-based editor
  const [resumeData, setResumeData] = useState<ResumeData>({
    academic: [],
    experience: [],
    projects: [],
    extracurricular: [],
    volunteering: [],
    skills: [],
    interests: [],
    languages: []
  });

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
    loadResumeActivities();
    loadUserProfile();
  }, []);

  // Cleanup function to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clear any pending timeouts when component unmounts
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Auto-save when resume data changes (debounced) - DISABLED to prevent data loss
  // useEffect(() => {
  //   // Skip auto-save on initial load or if no data
  //   if (Object.values(resumeData).every(activities => activities.length === 0)) {
  //     return;
  //   }

  //   // Clear existing timeout
  //   if (autoSaveTimeoutRef.current) {
  //     clearTimeout(autoSaveTimeoutRef.current);
  //   }

  //   // Debounce auto-save by 3 seconds
  //   autoSaveTimeoutRef.current = setTimeout(() => {
  //     autoSaveResumeData();
  //   }, 3000);

  //   return () => {
  //     if (autoSaveTimeoutRef.current) {
  //       clearTimeout(autoSaveTimeoutRef.current);
  //     }
  //   };
  // }, [resumeData]); // Removed autoSaveResumeData from dependencies

  // Load resume activities from backend
  const loadResumeActivities = async () => {
    console.log('📥 [DEBUG] loadResumeActivities called');
    try {
      console.log('📡 [DEBUG] Calling resumeActivitiesService.getResumeData...');
      const backendData = await resumeActivitiesService.getResumeData();
      // Safe logging for backend data
      const safeBackendData = {
        academic: backendData.academic?.map(a => ({ id: a.id, title: a.title, position: a.position })) || [],
        experience: backendData.experience?.map(a => ({ id: a.id, title: a.title, position: a.position })) || [],
        projects: backendData.projects?.map(a => ({ id: a.id, title: a.title, position: a.position })) || [],
        extracurricular: backendData.extracurricular?.map(a => ({ id: a.id, title: a.title, position: a.position })) || [],
        volunteering: backendData.volunteering?.map(a => ({ id: a.id, title: a.title, position: a.position })) || [],
        skills: backendData.skills?.map(a => ({ id: a.id, title: a.title, position: a.position })) || [],
        interests: backendData.interests?.map(a => ({ id: a.id, title: a.title, position: a.position })) || [],
        languages: backendData.languages?.map(a => ({ id: a.id, title: a.title, position: a.position })) || []
      };
      console.log('📊 [DEBUG] Backend data received (safe):', JSON.stringify(safeBackendData, null, 2));
      
      // Convert backend data to frontend format
      const frontendData: ResumeData = {
        academic: backendData.academic.map(convertBackendToFrontend),
        experience: backendData.experience.map(convertBackendToFrontend),
        projects: backendData.projects.map(convertBackendToFrontend),
        extracurricular: backendData.extracurricular.map(convertBackendToFrontend),
        volunteering: backendData.volunteering.map(convertBackendToFrontend),
        skills: backendData.skills.map(convertBackendToFrontend),
        interests: backendData.interests.map(convertBackendToFrontend),
        languages: backendData.languages.map(convertBackendToFrontend)
      };
      
      // Safe logging for frontend data
      const safeFrontendData = {
        academic: frontendData.academic?.map(a => ({ id: a.id, title: a.title, position: a.position })) || [],
        experience: frontendData.experience?.map(a => ({ id: a.id, title: a.title, position: a.position })) || [],
        projects: frontendData.projects?.map(a => ({ id: a.id, title: a.title, position: a.position })) || [],
        extracurricular: frontendData.extracurricular?.map(a => ({ id: a.id, title: a.title, position: a.position })) || [],
        volunteering: frontendData.volunteering?.map(a => ({ id: a.id, title: a.title, position: a.position })) || [],
        skills: frontendData.skills?.map(a => ({ id: a.id, title: a.title, position: a.position })) || [],
        interests: frontendData.interests?.map(a => ({ id: a.id, title: a.title, position: a.position })) || [],
        languages: frontendData.languages?.map(a => ({ id: a.id, title: a.title, position: a.position })) || []
      };
      console.log('🔄 [DEBUG] Converted frontend data (safe):', JSON.stringify(safeFrontendData, null, 2));
      console.log('💾 [DEBUG] Setting resumeData state...');
      setResumeData(frontendData);
      console.log('✅ [DEBUG] loadResumeActivities completed successfully');
    } catch (error) {
      console.error('❌ [DEBUG] Failed to load resume activities:', error);
      toast({
        title: "Error",
        description: "Failed to load resume data. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Load user profile data
  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData, error } = await supabase
        .from('user_profiles')
        .select('full_name, email_address, phone_number')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to load user profile:', error);
        return;
      }

      if (profileData) {
        setUserProfile(profileData);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  // Convert backend data to frontend format
  const convertBackendToFrontend = (backendActivity: any): ActivityData => ({
    id: backendActivity.id, // Keep UUID as string
    title: backendActivity.title,
    position: backendActivity.position || '',
    fromDate: backendActivity.from_date || '',
    toDate: backendActivity.to_date || '',
    isCurrent: backendActivity.is_current || false,
    bullets: backendActivity.bullets?.map((bullet: any) => bullet.bullet_text) || ['']
  });

  // Convert frontend data to backend format
  const convertFrontendToBackend = (frontendActivity: ActivityData, category: string) => ({
    title: frontendActivity.title,
    position: frontendActivity.position || null,
    from_date: frontendActivity.fromDate || null,
    to_date: frontendActivity.toDate || null,
    is_current: frontendActivity.isCurrent || false,
    bullets: frontendActivity.bullets.filter(bullet => bullet.trim() !== '')
  });

  // Save resume data to backend (without resumeData dependency to prevent loops)
  const saveResumeData = useCallback(async (dataToSave?: ResumeData) => {
    console.log('💾 [DEBUG] saveResumeData called from Resume.tsx');
    
    // Safe logging to avoid circular reference issues
    const safeResumeData = {
      academic: resumeData.academic?.length || 0,
      experience: resumeData.experience?.length || 0,
      projects: resumeData.projects?.length || 0,
      extracurricular: resumeData.extracurricular?.length || 0,
      volunteering: resumeData.volunteering?.length || 0,
      skills: resumeData.skills?.length || 0,
      interests: resumeData.interests?.length || 0,
      languages: resumeData.languages?.length || 0
    };
    console.log('📊 [DEBUG] Current resumeData state (counts):', safeResumeData);
    
    const safeDataToSave = dataToSave ? {
      academic: dataToSave.academic?.length || 0,
      experience: dataToSave.experience?.length || 0,
      projects: dataToSave.projects?.length || 0,
      extracurricular: dataToSave.extracurricular?.length || 0,
      volunteering: dataToSave.volunteering?.length || 0,
      skills: dataToSave.skills?.length || 0,
      interests: dataToSave.interests?.length || 0,
      languages: dataToSave.languages?.length || 0
    } : null;
    console.log('📊 [DEBUG] dataToSave parameter (counts):', safeDataToSave);
    
    try {
      const data = dataToSave || resumeData;
      
      // Safe logging for the actual data being used
      const safeDataForLogging = {
        academic: data.academic?.map(a => ({ id: a.id, title: a.title, position: a.position })) || [],
        experience: data.experience?.map(a => ({ id: a.id, title: a.title, position: a.position })) || [],
        projects: data.projects?.map(a => ({ id: a.id, title: a.title, position: a.position })) || [],
        extracurricular: data.extracurricular?.map(a => ({ id: a.id, title: a.title, position: a.position })) || [],
        volunteering: data.volunteering?.map(a => ({ id: a.id, title: a.title, position: a.position })) || [],
        skills: data.skills?.map(a => ({ id: a.id, title: a.title, position: a.position })) || [],
        interests: data.interests?.map(a => ({ id: a.id, title: a.title, position: a.position })) || [],
        languages: data.languages?.map(a => ({ id: a.id, title: a.title, position: a.position })) || []
      };
      console.log('📊 [DEBUG] Using data (safe):', JSON.stringify(safeDataForLogging, null, 2));
      
      // Ensure all arrays exist and are arrays
      const safeData = {
        academic: Array.isArray(data.academic) ? data.academic : [],
        experience: Array.isArray(data.experience) ? data.experience : [],
        projects: Array.isArray(data.projects) ? data.projects : [],
        extracurricular: Array.isArray(data.extracurricular) ? data.extracurricular : [],
        volunteering: Array.isArray(data.volunteering) ? data.volunteering : [],
        skills: Array.isArray(data.skills) ? data.skills : [],
        interests: Array.isArray(data.interests) ? data.interests : [],
        languages: Array.isArray(data.languages) ? data.languages : []
      };
      
      console.log('🛡️ [DEBUG] Safe data after validation:', JSON.stringify(safeData, null, 2));
      
      const backendData: BackendResumeData = {
        academic: safeData.academic.map(activity => convertFrontendToBackend(activity, 'academic')),
        experience: safeData.experience.map(activity => convertFrontendToBackend(activity, 'experience')),
        projects: safeData.projects.map(activity => convertFrontendToBackend(activity, 'projects')),
        extracurricular: safeData.extracurricular.map(activity => convertFrontendToBackend(activity, 'extracurricular')),                                                                                                
        volunteering: safeData.volunteering.map(activity => convertFrontendToBackend(activity, 'volunteering')),                                                                                                         
        skills: safeData.skills.map(activity => convertFrontendToBackend(activity, 'skills')),
        interests: safeData.interests.map(activity => convertFrontendToBackend(activity, 'interests')),
        languages: safeData.languages.map(activity => convertFrontendToBackend(activity, 'languages'))
      };

      console.log('🔄 [DEBUG] Converted backend data:', JSON.stringify(backendData, null, 2));
      console.log('📤 [DEBUG] Calling resumeActivitiesService.saveResumeData...');
      
      await resumeActivitiesService.saveResumeData(backendData);
      
      console.log('✅ [DEBUG] resumeActivitiesService.saveResumeData completed successfully');
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save resume data:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save resume data. Please try again.",
        variant: "destructive"
      });
    }
  }, [toast]); // Removed resumeData dependency

  // Auto-save function with loading state and timeout ref
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveResumeData = useCallback(async () => {
    if (isAutoSaving) return; // Prevent multiple simultaneous saves
    
    setIsAutoSaving(true);
    try {
      await saveResumeData(); // Uses current resumeData state
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [saveResumeData, isAutoSaving]);

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

  // Function to preview the resume HTML
  const previewResume = () => {
    setShowPreviewDialog(true);
  };


  // Function to add a new activity to the resume data
  const addActivity = (category: string) => {
    const newActivity: ActivityData = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate temporary ID
      title: '',
      position: '',
      fromDate: '',
      toDate: '',
      isCurrent: false,
      bullets: ['']
    };

    setResumeData(prevData => ({
      ...prevData,
      [category]: [...prevData[category as keyof ResumeData], newActivity]
    }));
  };

  // Function to update an activity
  const updateActivity = useCallback((category: string, activityId: string, updatedActivity: Partial<ActivityData>) => {
    setResumeData(prevData => ({
      ...prevData,
      [category]: prevData[category as keyof ResumeData].map(activity =>
        activity.id === activityId ? { ...activity, ...updatedActivity } : activity
      )
    }));
    
    // Note: Auto-save removed to prevent circular dependency issues
    // User can manually save using the "Save Resume" button
  }, []);

  // Function to remove an activity
  const removeActivity = useCallback((category: string, activityId: string) => {
    setResumeData(prevData => ({
      ...prevData,
      [category]: prevData[category as keyof ResumeData].filter(activity => activity.id !== activityId)
    }));
  }, []);

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


            {/* Add Activity Dropdown and Action Buttons */}
            <div className="mb-6 flex items-center justify-between">
              <AddActivityDropdown onActivitySelect={(category) => {
                addActivity(category.toLowerCase());
              }} />
              <div className="flex items-center space-x-3">
                {/* Auto-save status indicator */}
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  {isAutoSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                      <span>Auto-saving...</span>
                    </>
                  ) : lastSaved ? (
                    <>
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span>Saved {lastSaved.toLocaleTimeString()}</span>
                    </>
                  ) : null}
                </div>
                
                <Button 
                  onClick={previewResume}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Eye className="h-4 w-4" />
                  <span>Preview & Download PDF</span>
                </Button>
                <Button 
                  onClick={saveResumeData}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Resume
                </Button>
              </div>
            </div>

            <Tabs defaultValue="upload" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload New Resume</TabsTrigger>
                <TabsTrigger value="versions">Resume Versions</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-6">
                {/* File Uploader - Commented Out */}
                {/* 
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
                */}
                
                {/* Block-based Resume Editor */}
                <div className="space-y-6">
                  {/* Display all activity categories */}
                  {Object.entries(resumeData).map(([category, activities]) => (
                    activities.length > 0 && (
                      <div key={category} className="space-y-4">
                        <h3 className="text-xl font-semibold capitalize">
                          {category === 'academic' ? 'Academic Experience' :
                           category === 'experience' ? 'Work Experience' :
                           category === 'projects' ? 'Projects' :
                           category === 'extracurricular' ? 'Extracurricular Activities' :
                           category === 'volunteering' ? 'Volunteer Experience' :
                           category === 'skills' ? 'Skills' :
                           category === 'interests' ? 'Interests' :
                           category === 'languages' ? 'Languages' : category}
                        </h3>
                        <div className="space-y-4">
                          {activities.map((activity) => (
                            <ActivityEditor
                              key={activity.id}
                              activity={activity}
                              category={category}
                              onUpdate={(activityId, updatedActivity) => 
                                updateActivity(category, activityId, updatedActivity)
                              }
                              onRemove={(activityId) => 
                                removeActivity(category, activityId)
                              }
                            />
                          ))}
                        </div>
                      </div>
                    )
                  ))}
                  
                  {/* Show message when no activities are added */}
                  {Object.values(resumeData).every(activities => activities.length === 0) && (
                    <Card className="shadow-lg">
                      <CardContent className="py-12">
                        <div className="text-center text-muted-foreground">
                          <p className="text-lg mb-2">Block-based Resume Editor</p>
                          <p className="text-sm">Use the "Add Activity" button above to start building your resume</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="versions" className="space-y-6">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    View AI analysis and feedback for your uploaded resumes. Use the Preview button above to generate and download PDFs.
                  </p>
                </div>
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
                              <Button size="sm" variant="outline" onClick={() => handleView(record)}>
                                <Eye className="h-4 w-4" />
                                <span className="ml-1">View Analysis</span>
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

      {/* Resume Preview Dialog */}
      <ResumePreview
        isOpen={showPreviewDialog}
        onClose={() => setShowPreviewDialog(false)}
        resumeData={resumeData}
        userProfile={userProfile}
      />
        </GradientBackground>
      </ProfileCompletionGuard>
    </OnboardingGuard>
  );
};

export default Resume;
