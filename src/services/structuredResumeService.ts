import { supabase } from '@/integrations/supabase/client';
import { 
  StructuredResumeData, 
  StructuredResumeRecord, 
  ResumeFeedbackRecord, 
  ResumeGeneratedFileRecord,
  UploadResumeResponse,
  GenerateFeedbackResponse,
  GenerateResumeResponse
} from '@/types/resume';

class StructuredResumeService {
  /**
   * Upload a resume file and extract structured content
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
        .from('structured_resume_data')
        .select('version')
        .eq('user_id', user.id)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      // Handle case where no previous versions exist
      const nextVersion = latestVersion ? latestVersion.version + 1 : 1;
      
      console.log('Next version number:', nextVersion);

      // Create initial resume record with processing status
      const resumeRecord: Omit<StructuredResumeRecord, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.id,
        version: nextVersion,
        original_filename: file.name,
        original_file_type: file.type,
        original_file_size: file.size,
        structured_data: {} as StructuredResumeData, // Will be populated by extraction
        extraction_status: 'processing',
        upload_date: new Date().toISOString()
      };

      console.log('Inserting structured resume record:', resumeRecord);
      
      // Insert the record
      const { data: dbData, error: dbError } = await supabase
        .from('structured_resume_data')
        .insert(resumeRecord)
        .select()
        .single();

      if (dbError) {
        console.error('Database insert error:', dbError);
        return { success: false, error: `Database error: ${dbError.message}` };
      }

      console.log('Structured resume record created successfully:', dbData);

      // Trigger content extraction (async)
      this.extractResumeContent(dbData.id).catch(console.error);

      return { success: true, resume_record: dbData };
    } catch (error) {
      console.error('Upload resume error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Extract structured content from uploaded resume
   */
  async extractResumeContent(resumeDataId: string): Promise<void> {
    try {
      console.log('Starting content extraction for resume:', resumeDataId);
      
      const { data, error } = await supabase.functions.invoke('extract-resume-content', {
        body: { resume_data_id: resumeDataId }
      });

      if (error) {
        console.error('Extraction error:', error);
        // Update status to error
        await this.updateExtractionStatus(resumeDataId, 'error', error.message);
        return;
      }

      console.log('Content extraction completed:', data);
      
      // Trigger feedback generation if extraction was successful
      if (data.success) {
        this.generateFeedback(resumeDataId).catch(console.error);
      }
    } catch (error) {
      console.error('Extract resume content error:', error);
      await this.updateExtractionStatus(resumeDataId, 'error', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Generate AI feedback for structured resume data
   */
  async generateFeedback(resumeDataId: string): Promise<GenerateFeedbackResponse> {
    try {
      console.log('Generating feedback for resume:', resumeDataId);
      
      const { data, error } = await supabase.functions.invoke('generate-structured-resume-feedback', {
        body: { resume_data_id: resumeDataId }
      });

      if (error) {
        console.error('Feedback generation error:', error);
        return { success: false, error: error.message };
      }

      console.log('Feedback generation completed:', data);
      return data;
    } catch (error) {
      console.error('Generate feedback error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get all structured resume records for the current user
   */
  async getResumeRecords(): Promise<StructuredResumeRecord[]> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('structured_resume_data')
        .select('*')
        .eq('user_id', user.id)
        .order('version', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch resume records: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Get resume records error:', error);
      throw error;
    }
  }

  /**
   * Get a specific resume record with feedback
   */
  async getResumeRecordWithFeedback(resumeDataId: string): Promise<{
    resume: StructuredResumeRecord;
    feedback: ResumeFeedbackRecord | null;
  } | null> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Get resume record
      const { data: resumeData, error: resumeError } = await supabase
        .from('structured_resume_data')
        .select('*')
        .eq('id', resumeDataId)
        .eq('user_id', user.id)
        .single();

      if (resumeError) {
        if (resumeError.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(`Failed to fetch resume record: ${resumeError.message}`);
      }

      // Get feedback if exists
      const { data: feedbackData } = await supabase
        .from('resume_feedback')
        .select('*')
        .eq('resume_data_id', resumeDataId)
        .single();

      return {
        resume: resumeData,
        feedback: feedbackData
      };
    } catch (error) {
      console.error('Get resume record with feedback error:', error);
      throw error;
    }
  }

  /**
   * Delete a resume record and all associated data
   */
  async deleteResumeRecord(resumeDataId: string): Promise<boolean> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Delete all associated records (feedback and generated files)
      await supabase
        .from('resume_feedback')
        .delete()
        .eq('resume_data_id', resumeDataId)
        .eq('user_id', user.id);

      await supabase
        .from('resume_generated_files')
        .delete()
        .eq('resume_data_id', resumeDataId)
        .eq('user_id', user.id);

      // Delete the main resume record
      const { error: dbError } = await supabase
        .from('structured_resume_data')
        .delete()
        .eq('id', resumeDataId)
        .eq('user_id', user.id);

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      return true;
    } catch (error) {
      console.error('Delete resume record error:', error);
      throw error;
    }
  }

  /**
   * Generate PDF/DOCX file from structured resume data
   */
  async generateResumeFile(resumeDataId: string, fileType: 'pdf' | 'docx'): Promise<GenerateResumeResponse> {
    try {
      console.log(`Generating ${fileType} file for resume:`, resumeDataId);
      
      const { data, error } = await supabase.functions.invoke('generate-resume-file', {
        body: { 
          resume_data_id: resumeDataId,
          file_type: fileType
        }
      });

      if (error) {
        console.error('File generation error:', error);
        return { success: false, error: error.message };
      }

      console.log('File generation completed:', data);
      return data;
    } catch (error) {
      console.error('Generate resume file error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Download a generated resume file
   */
  async downloadGeneratedFile(fileId: string): Promise<Blob | null> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('resume_generated_files')
        .select('file_content, file_type')
        .eq('id', fileId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        throw new Error(`Download failed: ${error.message}`);
      }

      // Convert bytea to blob
      const blob = new Blob([data.file_content], { 
        type: data.file_type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      return blob;
    } catch (error) {
      console.error('Download generated file error:', error);
      throw error;
    }
  }

  /**
   * Get or generate a resume file for download
   */
  async getResumeFileForDownload(resumeDataId: string, fileType: 'pdf' | 'docx'): Promise<{
    fileId: string;
    blob: Blob;
    filename: string;
  }> {
    try {
      // Check if file already exists
      const { data: existingFile } = await supabase
        .from('resume_generated_files')
        .select('id, file_content, file_type')
        .eq('resume_data_id', resumeDataId)
        .eq('file_type', fileType)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (existingFile) {
        // File exists, return it
        const blob = new Blob([existingFile.file_content], { 
          type: fileType === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        });
        
        return {
          fileId: existingFile.id,
          blob,
          filename: `resume_enhanced.${fileType}`
        };
      }

      // File doesn't exist, generate it
      const generateResult = await this.generateResumeFile(resumeDataId, fileType);
      
      if (!generateResult.success) {
        throw new Error(generateResult.error || 'File generation failed');
      }

      // Get the newly generated file
      const { data: newFile, error: fetchError } = await supabase
        .from('resume_generated_files')
        .select('id, file_content, file_type')
        .eq('resume_data_id', resumeDataId)
        .eq('file_type', fileType)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (fetchError || !newFile) {
        throw new Error('Failed to retrieve generated file');
      }

      const blob = new Blob([newFile.file_content], { 
        type: fileType === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      return {
        fileId: newFile.id,
        blob,
        filename: `resume_enhanced.${fileType}`
      };
    } catch (error) {
      console.error('Get resume file for download error:', error);
      throw error;
    }
  }

  /**
   * Update extraction status
   */
  private async updateExtractionStatus(resumeDataId: string, status: 'processing' | 'completed' | 'error', error?: string): Promise<void> {
    try {
      const updateData: any = { extraction_status: status };
      if (error) {
        updateData.extraction_error = error;
      }

      await supabase
        .from('structured_resume_data')
        .update(updateData)
        .eq('id', resumeDataId);
    } catch (error) {
      console.error('Update extraction status error:', error);
    }
  }

  /**
   * Get processing status for a resume
   */
  async getProcessingStatus(resumeDataId: string): Promise<{
    extraction_status: 'processing' | 'completed' | 'error';
    feedback_status?: 'processing' | 'completed' | 'error';
    extraction_error?: string;
    feedback_error?: string;
  }> {
    try {
      const { data: resumeData, error: resumeError } = await supabase
        .from('structured_resume_data')
        .select('extraction_status, extraction_error')
        .eq('id', resumeDataId)
        .single();

      if (resumeError) {
        throw new Error(`Failed to fetch processing status: ${resumeError.message}`);
      }

      // Get feedback status if exists
      const { data: feedbackData } = await supabase
        .from('resume_feedback')
        .select('feedback_status, feedback_error')
        .eq('resume_data_id', resumeDataId)
        .single();

      return {
        extraction_status: resumeData.extraction_status,
        feedback_status: feedbackData?.feedback_status,
        extraction_error: resumeData.extraction_error,
        feedback_error: feedbackData?.feedback_error
      };
    } catch (error) {
      console.error('Get processing status error:', error);
      throw error;
    }
  }
}

export const structuredResumeService = new StructuredResumeService();
