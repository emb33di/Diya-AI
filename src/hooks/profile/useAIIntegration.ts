import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { OnboardingApiService } from '@/services/onboarding.api';

export interface ProfileFormData {
  // Personal Information
  full_name?: string;
  email_address?: string;
  country_code?: string;
  phone_number?: string;
  applying_to?: string;
  masters_field_of_focus?: string;
  
  // Academic Profile
  high_school_name?: string;
  high_school_graduation_year?: number;
  school_board?: string;
  year_of_study?: string;
  class_10_score?: number;
  class_11_score?: number;
  class_12_half_yearly_score?: number;
  undergraduate_cgpa?: number;
  intended_majors?: string;
  college_name?: string;
  college_graduation_year?: number;
  college_gpa?: number;
  test_type?: string;
  test_score?: number;
  
  // Additional Academic Fields
  gpa_unweighted?: number;
  gpa_weighted?: number;
  class_rank?: string;
  secondary_major_minor_interests?: string;
  sat_score?: number;
  act_score?: number;
  career_interests?: string;
  geographic_preference?: string;
  
  // College Preferences
  ideal_college_size?: string;
  ideal_college_setting?: string;
  must_haves?: string;
  deal_breakers?: string;
  
  // Financial Information
  looking_for_scholarships?: string;
  looking_for_financial_aid?: string;
  
  // Additional Undergraduate Prompt Fields
  extracurricular_activities?: string;
  leadership_roles?: string;
  personal_projects?: string;
  application_concerns?: string;
  specific_questions?: string;
}

export const useAIIntegration = () => {
  const [aiPopulatedFields, setAIPopulatedFields] = useState<Set<string>>(new Set());
  const [isTestingExtraction, setIsTestingExtraction] = useState(false);
  const { toast } = useToast();

  const isAIPopulated = useCallback((fieldName: string) => {
    return aiPopulatedFields.has(fieldName);
  }, [aiPopulatedFields]);

  const clearAIData = useCallback(() => {
    setAIPopulatedFields(new Set());
    
    toast({
      title: "AI Data Cleared",
      description: "All AI-populated fields have been cleared. You can fill out your profile manually."
    });
  }, [toast]);

  const testEnhancedProfileExtraction = useCallback(async (form?: any) => {
    try {
      console.log('🚀 Starting Enhanced Profile Extraction Process...');
      setIsTestingExtraction(true);
      
      console.log('👤 Step 1: Getting authenticated user...');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('❌ Step 1 Failed: No user found');
        toast({
          title: "Error",
          description: "No user found. Please log in again.",
          variant: "destructive",
        });
        return;
      }
      console.log('✅ Step 1 Complete: User authenticated', { userId: user.id });

      console.log('📞 Step 2: Fetching user conversation transcript...');
      // Get the user's most recent conversation
      const { data: conversations, error: convError } = await supabase
        .from('conversation_metadata')
        .select('conversation_id, transcript')
        .eq('user_id', user.id as any)
        .order('created_at', { ascending: false })
        .limit(1);

      if (convError || !conversations || conversations.length === 0) {
        console.log('❌ Step 2 Failed: No conversation found', { convError, conversationsCount: conversations?.length });
        toast({
          title: "No Conversation Found",
          description: "No conversation transcript found. Please complete onboarding first.",
          variant: "destructive",
        });
        return;
      }

      const conversation = conversations[0] as any;
      const conversationId = conversation?.conversation_id;
      console.log('✅ Step 2 Complete: Conversation found', { 
        conversationId, 
        transcriptLength: conversation?.transcript?.length || 0 
      });
      
      console.log('🤖 Step 3: Calling enhanced profile extraction API...');
      console.log('📊 Request Details:', {
        conversationId,
        userId: user.id,
        apiEndpoint: `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enhanced-profile-extraction`
      });
      
      // Call the enhanced profile extraction function that reads transcript, creates JSON schema, and fills profiles table
      const response = await OnboardingApiService.extractProfileInformation(conversationId, user.id);
      
      console.log('📊 Step 3 Response:', {
        success: response.success,
        hasData: !!response.data,
        error: response.error
      });
      
      if (response.success && response.data) {
        const profileData = response.data;
        
        console.log('✅ Step 3 Complete: Enhanced profile extraction successful!');
        console.log('🤖 AI Response Details:', {
          success: profileData.success,
          confidence_score: profileData.confidence_score,
          school_type: profileData.school_type,
          fields_extracted: profileData.fields_extracted,
          fields_missing: profileData.fields_missing
        });
        
        console.log('🎉 Enhanced Profile Extraction Process Complete!');
        console.log('📊 Final Summary:', {
          confidenceScore: profileData.confidence_score,
          schoolType: profileData.school_type,
          fieldsExtracted: profileData.fields_extracted?.length || 0,
          fieldsMissing: profileData.fields_missing?.length || 0
        });

        toast({
          title: "AI Profile Extraction Complete",
          description: `Successfully extracted and saved profile data to database. The profile form will now load the updated data.`,
        });

        return { success: true, message: "Profile extraction completed successfully" };
      } else {
        console.log('❌ Step 3 Failed: Enhanced profile extraction failed', {
          success: response.success,
          error: response.error
        });
        toast({
          title: "Extraction Failed",
          description: response.error || "Failed to extract profile information. Please try again.",
          variant: "destructive",
        });
        return null;
      }
    } catch (error) {
      console.error('💥 Enhanced Profile Extraction Process Failed:', error);
      console.error('🔍 Error Details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast({
        title: "Error",
        description: "An error occurred during profile extraction. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      console.log('🏁 Enhanced Profile Extraction Process Finished');
      setIsTestingExtraction(false);
    }
  }, [toast]);

  return {
    aiPopulatedFields,
    isTestingExtraction,
    isAIPopulated,
    clearAIData,
    testEnhancedProfileExtraction,
    setAIPopulatedFields,
  };
};
