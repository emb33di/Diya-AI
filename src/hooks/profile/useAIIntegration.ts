import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { OnboardingApiService } from '@/services/onboarding.api';

export interface ProfileFormData {
  // Personal Information
  full_name?: string;
  preferred_name?: string;
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
    localStorage.removeItem('ai_extracted_profile');
    
    toast({
      title: "AI Data Cleared",
      description: "All AI-populated fields have been cleared. You can fill out your profile manually."
    });
  }, [toast]);

  const convertAIProfileToFormData = useCallback((aiProfile: any): Partial<ProfileFormData> => {
    const formData: Partial<ProfileFormData> = {};
    
    // Personal info
    if (aiProfile.personal_info) {
      formData.full_name = aiProfile.personal_info.full_name;
      formData.preferred_name = aiProfile.personal_info.preferred_name;
      formData.email_address = aiProfile.personal_info.email_address;
      formData.phone_number = aiProfile.personal_info.phone_number;
    }
    
    // Academic background
    if (aiProfile.academic_background) {
      formData.high_school_name = aiProfile.academic_background.high_school_name;
      formData.high_school_graduation_year = aiProfile.academic_background.high_school_graduation_year;
      formData.school_board = aiProfile.academic_background.school_board as any;
      formData.year_of_study = aiProfile.academic_background.year_of_study as any;
      formData.class_10_score = aiProfile.academic_background.class_10_score;
      formData.class_11_score = aiProfile.academic_background.class_11_score;
      formData.class_12_half_yearly_score = aiProfile.academic_background.class_12_half_yearly_score;
      formData.undergraduate_cgpa = aiProfile.academic_background.undergraduate_gpa;
      formData.intended_majors = aiProfile.academic_background.intended_majors?.join(', ');
      formData.college_name = aiProfile.academic_background.undergraduate_institution;
      formData.college_graduation_year = aiProfile.academic_background.undergraduate_graduation_year;
      formData.college_gpa = aiProfile.academic_background.undergraduate_gpa;
      formData.masters_field_of_focus = aiProfile.academic_background.masters_field_of_focus;
    }
    
    // Test scores
    if (aiProfile.test_scores) {
      formData.test_type = aiProfile.test_scores.test_type as any;
      formData.test_score = aiProfile.test_scores.sat_score || aiProfile.test_scores.act_score || 
                          aiProfile.test_scores.gmat_score || aiProfile.test_scores.gre_score;
    }
    
    // Preferences
    if (aiProfile.preferences) {
      formData.ideal_college_size = aiProfile.preferences.ideal_college_size as any;
      formData.ideal_college_setting = aiProfile.preferences.ideal_college_setting as any;
      formData.must_haves = aiProfile.preferences.must_haves?.join(', ');
      formData.deal_breakers = aiProfile.preferences.deal_breakers?.join(', ');
    }
    
    // Financial considerations
    if (aiProfile.financial_considerations) {
      // Map scholarship interests to looking_for_scholarships
      if (aiProfile.financial_considerations.scholarship_interests && aiProfile.financial_considerations.scholarship_interests.length > 0) {
        formData.looking_for_scholarships = 'yes';
      }
      // Map financial aid importance to looking_for_financial_aid
      if (aiProfile.financial_considerations.financial_aid_importance && aiProfile.financial_considerations.financial_aid_importance !== 'Not a factor') {
        formData.looking_for_financial_aid = 'yes';
      }
    }
    
    // Extracurricular activities
    if (aiProfile.extracurricular_activities) {
      formData.extracurricular_activities = aiProfile.extracurricular_activities.activities?.join(', ');
      formData.leadership_roles = aiProfile.extracurricular_activities.leadership_roles?.join(', ');
    }
    
    // Additional info
    if (aiProfile.additional_info) {
      formData.personal_projects = aiProfile.additional_info.unique_experiences?.join(', ');
      formData.application_concerns = aiProfile.additional_info.questions_concerns?.join(', ');
    }
    
    return formData;
  }, []);

  const testEnhancedProfileExtraction = useCallback(async (form?: any) => {
    try {
      setIsTestingExtraction(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "No user found. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      // Get the user's most recent conversation
      const { data: conversations, error: convError } = await supabase
        .from('conversation_metadata')
        .select('conversation_id, transcript')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (convError || !conversations || conversations.length === 0) {
        toast({
          title: "No Conversation Found",
          description: "No conversation transcript found. Please complete onboarding first.",
          variant: "destructive",
        });
        return;
      }

      const conversationId = conversations[0].conversation_id;
      
      // Call the enhanced profile extraction function
      const response = await OnboardingApiService.extractProfileInformation(conversationId, user.id);
      
      console.log('🧪 TESTING ENHANCED PROFILE EXTRACTION:');
      console.log('📞 Conversation ID:', conversationId);
      console.log('👤 User ID:', user.id);
      console.log('📊 Response:', response);
      
      if (response.success && response.data) {
        const profileData = response.data;
        const extractedProfile = profileData.extracted_profile;
        const schoolType = profileData.school_type;
        const newAIPopulatedFields = new Set<string>();
        
        console.log('✅ Enhanced profile extraction test successful!');
        console.log('🤖 AI Response Details:', {
          success: profileData.success,
          confidence_score: profileData.confidence_score,
          school_type: profileData.school_type,
          fields_extracted: profileData.fields_extracted,
          fields_missing: profileData.fields_missing,
          extracted_profile: profileData.extracted_profile
        });
        
        console.log('🎓 Program Type Detected:', schoolType);
        
        // Map extracted data to form fields based on program type
        const formData: Partial<ProfileFormData> = {};
        
        // Personal info
        if (extractedProfile.personal_info) {
          if (extractedProfile.personal_info.full_name) {
            formData.full_name = extractedProfile.personal_info.full_name;
            newAIPopulatedFields.add('full_name');
          }
          if (extractedProfile.personal_info.preferred_name) {
            formData.preferred_name = extractedProfile.personal_info.preferred_name;
            newAIPopulatedFields.add('preferred_name');
          }
          if (extractedProfile.personal_info.email_address) {
            formData.email_address = extractedProfile.personal_info.email_address;
            newAIPopulatedFields.add('email_address');
          }
          if (extractedProfile.personal_info.phone_number) {
            formData.phone_number = extractedProfile.personal_info.phone_number;
            newAIPopulatedFields.add('phone_number');
          }
          if (extractedProfile.personal_info.country_code) {
            formData.country_code = extractedProfile.personal_info.country_code;
            newAIPopulatedFields.add('country_code');
          }
        }

        // Academic background - program-type aware mapping
        if (extractedProfile.academic_background) {
          if (schoolType === 'Undergraduate Colleges') {
            // Undergraduate-specific fields
            if (extractedProfile.academic_background.high_school_name) {
              formData.high_school_name = extractedProfile.academic_background.high_school_name;
              newAIPopulatedFields.add('high_school_name');
            }
            if (extractedProfile.academic_background.high_school_graduation_year) {
              formData.high_school_graduation_year = extractedProfile.academic_background.high_school_graduation_year;
              newAIPopulatedFields.add('high_school_graduation_year');
            }
            if (extractedProfile.academic_background.gpa_unweighted) {
              formData.gpa_unweighted = extractedProfile.academic_background.gpa_unweighted;
              newAIPopulatedFields.add('gpa_unweighted');
            }
            if (extractedProfile.academic_background.gpa_weighted) {
              formData.gpa_weighted = extractedProfile.academic_background.gpa_weighted;
              newAIPopulatedFields.add('gpa_weighted');
            }
            if (extractedProfile.academic_background.class_rank) {
              formData.class_rank = extractedProfile.academic_background.class_rank;
              newAIPopulatedFields.add('class_rank');
            }
            if (extractedProfile.academic_background.school_board) {
              formData.school_board = extractedProfile.academic_background.school_board as any;
              newAIPopulatedFields.add('school_board');
            }
            if (extractedProfile.academic_background.year_of_study) {
              formData.year_of_study = extractedProfile.academic_background.year_of_study as any;
              newAIPopulatedFields.add('year_of_study');
            }
            if (extractedProfile.academic_background.class_10_score) {
              formData.class_10_score = extractedProfile.academic_background.class_10_score;
              newAIPopulatedFields.add('class_10_score');
            }
            if (extractedProfile.academic_background.class_11_score) {
              formData.class_11_score = extractedProfile.academic_background.class_11_score;
              newAIPopulatedFields.add('class_11_score');
            }
            if (extractedProfile.academic_background.class_12_half_yearly_score) {
              formData.class_12_half_yearly_score = extractedProfile.academic_background.class_12_half_yearly_score;
              newAIPopulatedFields.add('class_12_half_yearly_score');
            }
            if (extractedProfile.academic_background.intended_majors) {
              formData.intended_majors = extractedProfile.academic_background.intended_majors;
              newAIPopulatedFields.add('intended_majors');
            }
            if (extractedProfile.academic_background.secondary_major_minor_interests) {
              formData.secondary_major_minor_interests = extractedProfile.academic_background.secondary_major_minor_interests;
              newAIPopulatedFields.add('secondary_major_minor_interests');
            }
          } else {
            // Graduate programs (MBA, Masters, PhD, LLM)
            if (extractedProfile.academic_background.college_name) {
              formData.college_name = extractedProfile.academic_background.college_name;
              newAIPopulatedFields.add('college_name');
            }
            if (extractedProfile.academic_background.college_graduation_year) {
              formData.college_graduation_year = extractedProfile.academic_background.college_graduation_year;
              newAIPopulatedFields.add('college_graduation_year');
            }
            if (extractedProfile.academic_background.college_gpa) {
              formData.college_gpa = extractedProfile.academic_background.college_gpa;
              newAIPopulatedFields.add('college_gpa');
            }
            if (extractedProfile.academic_background.undergraduate_cgpa) {
              formData.undergraduate_cgpa = extractedProfile.academic_background.undergraduate_cgpa;
              newAIPopulatedFields.add('undergraduate_cgpa');
            }
            if (extractedProfile.academic_background.masters_field_of_focus) {
              formData.masters_field_of_focus = extractedProfile.academic_background.masters_field_of_focus;
              newAIPopulatedFields.add('masters_field_of_focus');
            }
            // For graduate programs, also map intended_majors if available
            if (extractedProfile.academic_background.intended_majors) {
              formData.intended_majors = extractedProfile.academic_background.intended_majors;
              newAIPopulatedFields.add('intended_majors');
            }
          }
        }

        // Test scores - program-type aware mapping
        if (extractedProfile.test_scores) {
          if (schoolType === 'Undergraduate Colleges') {
            // Undergraduate-specific test scores
            if (extractedProfile.test_scores.sat_score) {
              formData.sat_score = extractedProfile.test_scores.sat_score;
              newAIPopulatedFields.add('sat_score');
            }
            if (extractedProfile.test_scores.act_score) {
              formData.act_score = extractedProfile.test_scores.act_score;
              newAIPopulatedFields.add('act_score');
            }
          } else {
            // Graduate programs (MBA, Masters, PhD, LLM)
            if (extractedProfile.test_scores.gmat_score) {
              formData.test_score = extractedProfile.test_scores.gmat_score;
              formData.test_type = 'GMAT';
              newAIPopulatedFields.add('test_score');
              newAIPopulatedFields.add('test_type');
            }
            if (extractedProfile.test_scores.gre_score) {
              formData.test_score = extractedProfile.test_scores.gre_score;
              formData.test_type = 'GRE';
              newAIPopulatedFields.add('test_score');
              newAIPopulatedFields.add('test_type');
            }
            // Generic test score mapping for graduate programs
            if (extractedProfile.test_scores.test_score) {
              formData.test_score = extractedProfile.test_scores.test_score;
              newAIPopulatedFields.add('test_score');
            }
            if (extractedProfile.test_scores.test_type) {
              formData.test_type = extractedProfile.test_scores.test_type as any;
              newAIPopulatedFields.add('test_type');
            }
            // LLM-specific test scores
            if (extractedProfile.test_scores.lsat_score) {
              formData.test_score = extractedProfile.test_scores.lsat_score;
              formData.test_type = 'LSAT';
              newAIPopulatedFields.add('test_score');
              newAIPopulatedFields.add('test_type');
            }
          }
        }

        // Career interests - program-type aware mapping
        if (extractedProfile.career_goals?.career_interests) {
          formData.career_interests = extractedProfile.career_goals.career_interests.join(', ');
          newAIPopulatedFields.add('career_interests');
        }

        // Preferences - program-type aware mapping
        if (extractedProfile.preferences) {
          if (extractedProfile.preferences.ideal_college_size) {
            formData.ideal_college_size = extractedProfile.preferences.ideal_college_size as any;
            newAIPopulatedFields.add('ideal_college_size');
          }
          if (extractedProfile.preferences.ideal_college_setting) {
            formData.ideal_college_setting = extractedProfile.preferences.ideal_college_setting as any;
            newAIPopulatedFields.add('ideal_college_setting');
          }
          if (extractedProfile.preferences.must_haves) {
            formData.must_haves = extractedProfile.preferences.must_haves.join(', ');
            newAIPopulatedFields.add('must_haves');
          }
          if (extractedProfile.preferences.deal_breakers) {
            formData.deal_breakers = extractedProfile.preferences.deal_breakers.join(', ');
            newAIPopulatedFields.add('deal_breakers');
          }
        }

        // Financial considerations
        if (extractedProfile.financial_considerations) {
          // Map scholarship interests to looking_for_scholarships
          if (extractedProfile.financial_considerations.scholarship_interests && extractedProfile.financial_considerations.scholarship_interests.length > 0) {
            formData.looking_for_scholarships = 'yes';
            newAIPopulatedFields.add('looking_for_scholarships');
          }
          // Map financial aid importance to looking_for_financial_aid
          if (extractedProfile.financial_considerations.financial_aid_importance) {
            if (extractedProfile.financial_considerations.financial_aid_importance !== 'Not a factor') {
              formData.looking_for_financial_aid = 'yes';
              newAIPopulatedFields.add('looking_for_financial_aid');
            }
          }
        }

        // Extracurricular activities
        if (extractedProfile.extracurricular_activities) {
          formData.extracurricular_activities = extractedProfile.extracurricular_activities.activities?.join(', ');
          formData.leadership_roles = extractedProfile.extracurricular_activities.leadership_roles?.join(', ');
          formData.personal_projects = extractedProfile.extracurricular_activities.personal_projects?.join(', ');
          if (extractedProfile.extracurricular_activities.activities?.length > 0) {
            newAIPopulatedFields.add('extracurricular_activities');
          }
          if (extractedProfile.extracurricular_activities.leadership_roles?.length > 0) {
            newAIPopulatedFields.add('leadership_roles');
          }
          if (extractedProfile.extracurricular_activities.personal_projects?.length > 0) {
            newAIPopulatedFields.add('personal_projects');
          }
        }

        // Additional info
        if (extractedProfile.additional_info) {
          formData.application_concerns = extractedProfile.additional_info.application_concerns?.join(', ');
          formData.specific_questions = extractedProfile.additional_info.specific_questions?.join(', ');
          if (extractedProfile.additional_info.application_concerns?.length > 0) {
            newAIPopulatedFields.add('application_concerns');
          }
          if (extractedProfile.additional_info.specific_questions?.length > 0) {
            newAIPopulatedFields.add('specific_questions');
          }
        }

        // Store the extracted data
        localStorage.setItem('ai_extracted_profile', JSON.stringify({
          profile: formData,
          populatedFields: Array.from(newAIPopulatedFields),
          schoolType,
          confidence: profileData.confidence_score
        }));

        setAIPopulatedFields(newAIPopulatedFields);

        console.log('📝 Form Data Mapped:', formData);
        console.log('🎯 Fields Populated:', Array.from(newAIPopulatedFields));
        console.log('📊 Total Fields Extracted:', newAIPopulatedFields.size);

        // If form is provided, populate the form fields
        if (form) {
          Object.keys(formData).forEach(key => {
            if (formData[key] !== undefined && formData[key] !== null && formData[key] !== '') {
              console.log(`🔧 Setting form field ${key}:`, formData[key]);
              form.setValue(key as keyof ProfileFormData, formData[key]);
            }
          });
        }

        toast({
          title: "AI Profile Extraction Complete",
          description: `Successfully extracted ${newAIPopulatedFields.size} fields from your conversation.`,
        });

        return { formData, populatedFields: newAIPopulatedFields };
      } else {
        toast({
          title: "Extraction Failed",
          description: "Failed to extract profile information. Please try again.",
          variant: "destructive",
        });
        return null;
      }
    } catch (error) {
      console.error('Error testing enhanced profile extraction:', error);
      toast({
        title: "Error",
        description: "An error occurred during profile extraction. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsTestingExtraction(false);
    }
  }, [toast]);

  return {
    aiPopulatedFields,
    isTestingExtraction,
    isAIPopulated,
    clearAIData,
    convertAIProfileToFormData,
    testEnhancedProfileExtraction,
    setAIPopulatedFields,
  };
};
