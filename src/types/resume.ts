// Structured Resume Data Types

export interface StructuredResumeData {
  // Personal Information
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    linkedinUrl?: string;
    portfolioUrl?: string;
    githubUrl?: string;
  };

  // Professional Summary/Objective
  summary: string;

  // Education
  education: Array<{
    institution: string;
    degree: string;
    fieldOfStudy: string;
    graduationDate: string;
    gpa?: string;
    honors?: string[];
    relevantCoursework?: string[];
    location: string;
  }>;

  // Work Experience
  workExperience: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    isCurrentPosition: boolean;
    location: string;
    description: string;
    achievements: string[];
    skills: string[];
  }>;

  // Projects
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    startDate: string;
    endDate: string;
    url?: string;
    githubUrl?: string;
    achievements: string[];
  }>;

  // Skills
  skills: {
    technical: string[];
    languages: string[];
    soft: string[];
    certifications: string[];
  };

  // Extracurricular Activities
  extracurriculars: Array<{
    organization: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
    achievements: string[];
  }>;

  // Volunteer Experience
  volunteerExperience: Array<{
    organization: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
    hours?: number;
    achievements: string[];
  }>;

  // Awards and Honors
  awards: Array<{
    title: string;
    organization: string;
    date: string;
    description: string;
  }>;

  // Publications (if any)
  publications: Array<{
    title: string;
    publication: string;
    date: string;
    url?: string;
    authors: string[];
  }>;

  // Languages
  languages: Array<{
    language: string;
    proficiency: 'Native' | 'Fluent' | 'Conversational' | 'Basic';
  }>;

  // Additional Information
  additionalInfo?: {
    interests: string[];
    references: string;
    availability: string;
    other: string;
  };
}

// Database Models
export interface StructuredResumeRecord {
  id: string;
  user_id: string;
  version: number;
  original_filename: string;
  original_file_type: string;
  original_file_size: number;
  structured_data: StructuredResumeData;
  extraction_status: 'processing' | 'completed' | 'error';
  extraction_error?: string;
  upload_date: string;
  created_at: string;
  updated_at: string;
}

export interface ResumeFeedbackRecord {
  id: string;
  resume_data_id: string;
  user_id: string;
  feedback_data: ResumeFeedbackData;
  feedback_status: 'processing' | 'completed' | 'error';
  feedback_error?: string;
  created_at: string;
  updated_at: string;
}

export interface ResumeGeneratedFileRecord {
  id: string;
  resume_data_id: string;
  user_id: string;
  file_type: 'pdf' | 'docx';
  file_content: Buffer;
  file_size: number;
  generation_status: 'processing' | 'completed' | 'error';
  generation_error?: string;
  created_at: string;
  updated_at: string;
}

// AI Feedback Types
export interface ResumeFeedbackData {
  // Overall Assessment
  overall_score: number;
  college_readiness_score: number;
  
  // Strengths and Weaknesses
  strengths: string[];
  weaknesses: string[];
  
  // Detailed Analysis
  academic_analysis: {
    academic_achievements: string[];
    leadership_roles: string[];
    community_service: string[];
    extracurricular_depth: number; // 0-1 scale
  };
  
  format_analysis: {
    structure_score: number;
    readability_score: number;
    visual_appeal_score: number;
  };
  
  content_analysis: {
    experience_quality: number;
    skills_demonstration: number;
    impact_quantification: number;
  };
  
  // Suggestions
  suggestions: string[];
  
  // Specific Recommendations
  recommendations: {
    content_improvements: string[];
    format_improvements: string[];
    skill_additions: string[];
    experience_enhancements: string[];
  };
  
  // Improved Resume Data (AI-enhanced version)
  improved_resume_data?: StructuredResumeData;
}

// Service Response Types
export interface UploadResumeResponse {
  success: boolean;
  resume_record?: StructuredResumeRecord;
  error?: string;
}

export interface GenerateFeedbackResponse {
  success: boolean;
  feedback?: ResumeFeedbackRecord;
  error?: string;
}

export interface GenerateResumeResponse {
  success: boolean;
  file_record?: ResumeGeneratedFileRecord;
  error?: string;
}

// UI State Types
export interface ResumeProcessingState {
  isProcessing: boolean;
  currentStep: number;
  totalSteps: number;
  stepDescription: string;
  error?: string;
}

export interface ResumeViewState {
  originalResume: StructuredResumeData | null;
  improvedResume: StructuredResumeData | null;
  feedback: ResumeFeedbackData | null;
  showComparison: boolean;
  resumeDataId?: string;
}
