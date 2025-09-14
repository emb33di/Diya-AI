import { supabase } from '@/integrations/supabase/client';

export interface ResumeVersion {
  id: string;
  user_id: string;
  version: number;
  filename: string;
  file_path: string;
  file_size: number;
  file_type: string;
  upload_date: string;
  feedback?: {
    strengths: string[];
    weaknesses: string[];
    overall_score: number;
    suggestions: string[];
    college_readiness_score: number;
    academic_analysis: {
      academic_achievements: string[];
      leadership_roles: string[];
      community_service: string[];
      extracurricular_depth: number;
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
    generated_at?: string;
  };
  status: 'processing' | 'completed' | 'error';
  created_at: string;
  updated_at: string;
}

export interface UploadResumeResponse {
  success: boolean;
  resume_version?: ResumeVersion;
  error?: string;
}

export interface ResumeFeedbackResponse {
  success: boolean;
  feedback?: {
    strengths: string[];
    weaknesses: string[];
    overall_score: number;
    suggestions: string[];
    college_readiness_score: number;
    academic_analysis: {
      academic_achievements: string[];
      leadership_roles: string[];
      community_service: string[];
      extracurricular_depth: number;
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
  };
  error?: string;
}

class ResumeService {
  /**
   * Upload a resume file and create a new version
   */
  async uploadResume(file: File): Promise<UploadResumeResponse> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('User authentication error:', userError);
        return { success: false, error: 'User not authenticated' };
      }

      console.log('User authenticated:', user.id);

      // Get the next version number for this user
      const { data: latestVersion, error: versionError } = await supabase
        .from('resume_versions' as any)
        .select('version')
        .eq('user_id', user.id)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      // Handle case where no previous versions exist
      const nextVersion = latestVersion ? (latestVersion as any).version + 1 : 1;
      
      console.log('Next version number:', nextVersion);

      // Generate unique filename
      const fileExtension = file.name.split('.').pop();
      const timestamp = Date.now();
      const filename = `resume_v${nextVersion}_${timestamp}.${fileExtension}`;
      const filePath = `${user.id}/${filename}`;

      // Upload file to Supabase Storage
      console.log('Uploading file to storage:', filePath);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resume-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        return { success: false, error: `Upload failed: ${uploadError.message}` };
      }

      console.log('File uploaded successfully:', uploadData);

      // Create database record
      const resumeVersion: Omit<ResumeVersion, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.id,
        version: nextVersion,
        filename: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        upload_date: new Date().toISOString(),
        status: 'processing'
      };

      console.log('Inserting resume version:', resumeVersion);
      console.log('Current user ID:', user.id);
      
      // Try direct insert first
      const { data: dbData, error: dbError } = await supabase
        .from('resume_versions' as any)
        .insert(resumeVersion)
        .select()
        .single();

      if (dbError) {
        console.error('Database insert error:', dbError);
        // Clean up uploaded file if database insert fails
        await supabase.storage.from('resume-files').remove([filePath]);
        return { success: false, error: `Database error: ${dbError.message}` };
      }

      console.log('Resume version created successfully:', dbData);

      // Trigger feedback generation (async)
      this.generateFeedback((dbData as any).id).catch(console.error);

      return { success: true, resume_version: dbData as unknown as ResumeVersion };
    } catch (error) {
      console.error('Upload resume error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get all resume versions for the current user
   */
  async getResumeVersions(): Promise<ResumeVersion[]> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('resume_versions' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('version', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch resume versions: ${error.message}`);
      }

      return (data as unknown as ResumeVersion[]) || [];
    } catch (error) {
      console.error('Get resume versions error:', error);
      throw error;
    }
  }

  /**
   * Get a specific resume version
   */
  async getResumeVersion(versionId: string): Promise<ResumeVersion | null> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('resume_versions' as any)
        .select('*')
        .eq('id', versionId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(`Failed to fetch resume version: ${error.message}`);
      }

      return data as unknown as ResumeVersion;
    } catch (error) {
      console.error('Get resume version error:', error);
      throw error;
    }
  }

  /**
   * Delete a resume version
   */
  async deleteResumeVersion(versionId: string): Promise<boolean> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Get the resume version to get file path
      const resumeVersion = await this.getResumeVersion(versionId);
      if (!resumeVersion) {
        throw new Error('Resume version not found');
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('resume_versions' as any)
        .delete()
        .eq('id', versionId)
        .eq('user_id', user.id);

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      // Delete file from storage
      const { error: storageError } = await supabase.storage
        .from('resume-files')
        .remove([resumeVersion.file_path]);

      if (storageError) {
        console.warn('Failed to delete file from storage:', storageError);
        // Don't throw error here as the database record is already deleted
      }

      return true;
    } catch (error) {
      console.error('Delete resume version error:', error);
      throw error;
    }
  }

  /**
   * Download a resume file
   */
  async downloadResume(versionId: string): Promise<Blob | null> {
    try {
      const resumeVersion = await this.getResumeVersion(versionId);
      if (!resumeVersion) {
        throw new Error('Resume version not found');
      }

      const { data, error } = await supabase.storage
        .from('resume-files')
        .download(resumeVersion.file_path);

      if (error) {
        throw new Error(`Download failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Download resume error:', error);
      throw error;
    }
  }

  /**
   * Generate feedback for a resume using Supabase Edge Function
   */
  async generateFeedback(versionId: string): Promise<ResumeFeedbackResponse> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      console.log('Invoking edge function with:', { version_id: versionId, userId: user.id });
      
      const { data, error } = await supabase.functions.invoke('generate-resume-feedback', {
        body: { 
          version_id: versionId,
          userId: user.id
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error details:', error);
        throw new Error(`Feedback generation failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Generate feedback error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Update resume version status
   */
  async updateResumeStatus(versionId: string, status: ResumeVersion['status'], feedback?: any): Promise<boolean> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };

      if (feedback) {
        updateData.feedback = {
          ...feedback,
          generated_at: new Date().toISOString()
        };
      }

      const { error } = await supabase
        .from('resume_versions' as any)
        .update(updateData)
        .eq('id', versionId)
        .eq('user_id', user.id);

      if (error) {
        throw new Error(`Update failed: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Update resume status error:', error);
      throw error;
    }
  }
}

export const resumeService = new ResumeService();
