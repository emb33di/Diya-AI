// AI Profile Extraction Service
// Processes outspeed transcripts and populates school-specific JSON schemas

import { 
  ProfileSchema, 
  UndergraduateProfileSchema, 
  MBAProfileSchema, 
  MastersProfileSchema, 
  PhDProfileSchema,
  SchoolType,
  SCHEMA_MAPPING 
} from '@/schemas/profileSchemas';
import { supabase } from '@/integrations/supabase/client';

export interface AIProfileExtractionRequest {
  conversation_id: string;
  user_id: string;
  school_type: SchoolType;
}

export interface AIProfileExtractionResponse {
  success: boolean;
  message: string;
  extracted_profile?: ProfileSchema;
  confidence_score?: number;
  fields_extracted?: string[];
  fields_missing?: string[];
}

export class AIProfileExtractionService {
  private static readonly GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

  /**
   * Main method to extract profile data from conversation transcript
   */
  static async extractProfileFromTranscript(request: AIProfileExtractionRequest): Promise<AIProfileExtractionResponse> {
    try {
      // Get conversation transcript
      const transcript = await this.getConversationTranscript(request.conversation_id, request.user_id);
      if (!transcript) {
        return {
          success: false,
          message: 'No transcript found for conversation'
        };
      }

      // Generate school-specific prompt
      const prompt = this.generateSchoolSpecificPrompt(request.school_type, transcript);

      // Extract profile using AI
      const extractedProfile = await this.callGeminiAPI(prompt, request.school_type);

      // Validate and clean extracted data
      const validatedProfile = this.validateAndCleanProfile(extractedProfile, request.school_type);

      // Calculate confidence score and field statistics
      const stats = this.calculateExtractionStats(validatedProfile);

      return {
        success: true,
        message: 'Profile extracted successfully',
        extracted_profile: validatedProfile,
        confidence_score: stats.confidence_score,
        fields_extracted: stats.fields_extracted,
        fields_missing: stats.fields_missing
      };

    } catch (error) {
      console.error('Error in AI profile extraction:', error);
      return {
        success: false,
        message: `Failed to extract profile: ${error.message}`
      };
    }
  }

  /**
   * Get conversation transcript from database
   */
  private static async getConversationTranscript(conversationId: string, userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('conversation_metadata')
        .select('transcript')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching transcript:', error);
        return null;
      }

      return data?.transcript || null;
    } catch (error) {
      console.error('Error in getConversationTranscript:', error);
      return null;
    }
  }

  /**
   * Generate school-specific extraction prompt
   */
  private static generateSchoolSpecificPrompt(schoolType: SchoolType, transcript: string): string {
    const basePrompt = `You are an expert college admissions counselor specializing in ${schoolType} applications. 
    Analyze the following conversation transcript and extract comprehensive profile information in the specified JSON format.

    CONVERSATION TRANSCRIPT:
    ${transcript}

    INSTRUCTIONS:
    1. Extract specific, concrete information mentioned in the conversation
    2. Focus on details relevant to ${schoolType} applications
    3. If information is not mentioned, use null or empty arrays
    4. Be precise and avoid making assumptions
    5. Extract exact quotes when possible for authenticity`;

    switch (schoolType) {
      case 'Undergraduate Colleges':
        return `${basePrompt}

        RESPONSE FORMAT (JSON only):
        {
          "personal_info": {
            "full_name": "string or null",
            "email_address": "string or null",
            "phone_number": "string or null",
            "citizenship_status": "U.S. Citizen | Permanent Resident | International Student | Other or null"
          },
          "academic_background": {
            "high_school_name": "string or null",
            "high_school_graduation_year": "number or null",
            "gpa_unweighted": "number or null",
            "gpa_weighted": "number or null",
            "class_rank": "string or null",
            "school_board": "string or null (CBSE, ICSE, IB, A-Levels, AP, etc.)",
            "year_of_study": "string or null (11th, 12th, Graduate)",
            "class_10_score": "number or null",
            "class_11_score": "number or null",
            "class_12_half_yearly_score": "number or null",
            "academic_interests": ["array of subjects/fields mentioned"],
            "intended_majors": ["array of majors mentioned"],
            "secondary_major_minor_interests": ["array of secondary interests"]
          },
          "test_scores": {
            "sat_score": "number or null",
            "act_score": "number or null",
            "test_status": "taken | planning_to_take | not_taking or null"
          },
          "extracurricular_activities": {
            "activities": ["array of activities mentioned"],
            "leadership_roles": ["array of leadership positions"],
            "achievements": ["array of awards/achievements"],
            "community_service": ["array of volunteer work"]
          },
          "career_goals": {
            "short_term_goals": ["array of immediate goals"],
            "long_term_aspirations": ["array of future aspirations"],
            "career_interests": ["array of career fields of interest"]
          },
          "preferences": {
            "ideal_college_size": "Small (< 2,000 students) | Medium (2,000 - 15,000 students) | Large (> 15,000 students) or null",
            "ideal_college_setting": "Urban | Suburban | Rural | College Town or null",
            "geographic_preference": "In-state | Out-of-state | Northeast | West Coast | No Preference or null",
            "program_preferences": ["array of program preferences"],
            "must_haves": ["array of essential features"],
            "deal_breakers": ["array of undesirable features"]
          },
          "financial_considerations": {
            "college_budget": "< $20,000 | $20,000 - $35,000 | $35,000 - $50,000 | $50,000 - $70,000 | > $70,000 or null",
            "financial_aid_importance": "Crucial | Very Important | Somewhat Important | Not a factor or null",
            "scholarship_interests": ["array of scholarship types"]
          },
          "additional_info": {
            "personal_values": ["array of values mentioned"],
            "challenges_overcome": ["array of challenges discussed"],
            "unique_experiences": ["array of unique experiences"],
            "questions_concerns": ["array of questions or concerns"]
          }
        }`;

      case 'MBA':
        return `${basePrompt}

        RESPONSE FORMAT (JSON only):
        {
          "personal_info": {
            "full_name": "string or null",
            "email_address": "string or null",
            "phone_number": "string or null",
            "citizenship_status": "U.S. Citizen | Permanent Resident | International Student | Other or null"
          },
          "academic_background": {
            "undergraduate_institution": "string or null",
            "undergraduate_major": "string or null",
            "undergraduate_graduation_year": "number or null",
            "undergraduate_gpa": "number or null",
            "academic_interests": ["array of academic interests"]
          },
          "professional_experience": {
            "years_of_experience": "number or null",
            "current_role": "string or null",
            "current_company": "string or null",
            "industry": "string or null",
            "work_experience_summary": ["array of work experiences"],
            "leadership_experience": ["array of leadership roles"],
            "achievements": ["array of professional achievements"]
          },
          "test_scores": {
            "gmat_score": "number or null",
            "gre_score": "number or null",
            "test_type": "GMAT | GRE | Not yet taken or null",
            "test_status": "taken | planning_to_take | not_taking or null"
          },
          "career_goals": {
            "post_mba_goals": ["array of post-MBA goals"],
            "target_industry": ["array of target industries"],
            "target_function": ["array of target functions"],
            "career_switch_goals": ["array of career change goals"]
          },
          "preferences": {
            "program_type": "Full-time | Part-time | Executive | Online or null",
            "geographic_preference": ["array of location preferences"],
            "school_preferences": ["array of school preferences"],
            "must_haves": ["array of essential features"],
            "deal_breakers": ["array of undesirable features"]
          },
          "financial_considerations": {
            "budget_range": "string or null",
            "funding_sources": ["array of funding sources"],
            "financial_aid_importance": "Crucial | Very Important | Somewhat Important | Not a factor or null",
            "scholarship_interests": ["array of scholarship types"]
          },
          "additional_info": {
            "personal_values": ["array of values mentioned"],
            "challenges_overcome": ["array of challenges discussed"],
            "unique_experiences": ["array of unique experiences"],
            "questions_concerns": ["array of questions or concerns"]
          }
        }`;

      case 'Masters':
        return `${basePrompt}

        RESPONSE FORMAT (JSON only):
        {
          "personal_info": {
            "full_name": "string or null",
            "email_address": "string or null",
            "phone_number": "string or null",
            "citizenship_status": "U.S. Citizen | Permanent Resident | International Student | Other or null"
          },
          "academic_background": {
            "undergraduate_institution": "string or null",
            "undergraduate_major": "string or null",
            "undergraduate_graduation_year": "number or null",
            "undergraduate_gpa": "number or null",
            "masters_field_of_focus": "string or null",
            "academic_interests": ["array of academic interests"],
            "research_interests": ["array of research interests"]
          },
          "professional_experience": {
            "years_of_experience": "number or null",
            "current_role": "string or null",
            "current_company": "string or null",
            "industry": "string or null",
            "relevant_experience": ["array of relevant experiences"],
            "research_experience": ["array of research experiences"],
            "internships": ["array of internships"],
            "projects": ["array of projects"]
          },
          "test_scores": {
            "gre_score": "number or null",
            "test_type": "GRE | Not yet taken or null",
            "test_status": "taken | planning_to_take | not_taking or null",
            "english_proficiency": {
              "toefl_score": "number or null",
              "ielts_score": "number or null",
              "test_status": "taken | planning_to_take | not_taking or null"
            }
          },
          "career_goals": {
            "masters_motivation": ["array of motivations for masters"],
            "career_goals": ["array of career goals"],
            "research_goals": ["array of research goals"],
            "academic_goals": ["array of academic goals"]
          },
          "preferences": {
            "program_type": "Research-based | Coursework-based | Professional or null",
            "geographic_preference": ["array of location preferences"],
            "university_preferences": ["array of university preferences"],
            "must_haves": ["array of essential features"],
            "deal_breakers": ["array of undesirable features"]
          },
          "financial_considerations": {
            "budget_range": "string or null",
            "funding_sources": ["array of funding sources"],
            "financial_aid_importance": "Crucial | Very Important | Somewhat Important | Not a factor or null",
            "scholarship_interests": ["array of scholarship types"]
          },
          "additional_info": {
            "personal_values": ["array of values mentioned"],
            "challenges_overcome": ["array of challenges discussed"],
            "unique_experiences": ["array of unique experiences"],
            "questions_concerns": ["array of questions or concerns"]
          }
        }`;

      case 'PhD':
        return `${basePrompt}

        RESPONSE FORMAT (JSON only):
        {
          "personal_info": {
            "full_name": "string or null",
            "email_address": "string or null",
            "phone_number": "string or null",
            "citizenship_status": "U.S. Citizen | Permanent Resident | International Student | Other or null"
          },
          "academic_background": {
            "undergraduate_institution": "string or null",
            "undergraduate_major": "string or null",
            "undergraduate_graduation_year": "number or null",
            "undergraduate_gpa": "number or null",
            "masters_institution": "string or null",
            "masters_major": "string or null",
            "masters_graduation_year": "number or null",
            "masters_gpa": "number or null",
            "phd_field_of_focus": "string or null",
            "academic_interests": ["array of academic interests"],
            "research_interests": ["array of research interests"],
            "specific_research_questions": ["array of specific research questions"]
          },
          "research_experience": {
            "years_of_research": "number or null",
            "research_projects": ["array of research projects"],
            "publications": ["array of publications"],
            "conference_presentations": ["array of presentations"],
            "thesis_projects": ["array of thesis work"],
            "lab_experience": ["array of lab experiences"],
            "research_achievements": ["array of research achievements"]
          },
          "test_scores": {
            "gre_score": "number or null",
            "test_type": "GRE | Not yet taken or null",
            "test_status": "taken | planning_to_take | not_taking or null",
            "english_proficiency": {
              "toefl_score": "number or null",
              "ielts_score": "number or null",
              "test_status": "taken | planning_to_take | not_taking or null"
            }
          },
          "career_goals": {
            "phd_motivation": ["array of motivations for PhD"],
            "career_aspirations": "Academia | Industry Research | Government | Other or null",
            "research_goals": ["array of research goals"],
            "academic_goals": ["array of academic goals"],
            "long_term_vision": ["array of long-term vision"]
          },
          "advisor_preferences": {
            "potential_advisors": ["array of potential advisors mentioned"],
            "research_lab_preferences": ["array of lab preferences"],
            "university_preferences": ["array of university preferences"],
            "geographic_preference": ["array of location preferences"],
            "must_haves": ["array of essential features"],
            "deal_breakers": ["array of undesirable features"]
          },
          "financial_considerations": {
            "funding_expectations": "Fully funded | Partially funded | Self-funded or null",
            "assistantship_preferences": ["array of assistantship preferences"],
            "fellowship_interests": ["array of fellowship interests"],
            "financial_aid_importance": "Crucial | Very Important | Somewhat Important | Not a factor or null"
          },
          "additional_info": {
            "personal_values": ["array of values mentioned"],
            "challenges_overcome": ["array of challenges discussed"],
            "unique_experiences": ["array of unique experiences"],
            "questions_concerns": ["array of questions or concerns"]
          }
        }`;

      default:
        return basePrompt + '\n\nPlease extract relevant information in a structured JSON format.';
    }
  }

  /**
   * Call Gemini API to extract profile information
   */
  private static async callGeminiAPI(prompt: string, schoolType: SchoolType): Promise<any> {
    const GEMINI_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
    
    if (!GEMINI_API_KEY) {
      throw new Error('Google API key not configured');
    }

    try {
      const response = await fetch(this.GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.1, // Lower temperature for more consistent extraction
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096, // Increased for comprehensive profiles
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Google API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error('No content generated from Google API');
      }

      // Parse the JSON response
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      throw error;
    }
  }

  /**
   * Validate and clean extracted profile data
   */
  private static validateAndCleanProfile(rawProfile: any, schoolType: SchoolType): ProfileSchema {
    // Basic validation and cleaning
    const cleanedProfile = this.deepClean(rawProfile);
    
    // Add school type specific validation here if needed
    switch (schoolType) {
      case 'Undergraduate Colleges':
        return cleanedProfile as UndergraduateProfileSchema;
      case 'MBA':
        return cleanedProfile as MBAProfileSchema;
      case 'Masters':
        return cleanedProfile as MastersProfileSchema;
      case 'PhD':
        return cleanedProfile as PhDProfileSchema;
      default:
        return cleanedProfile as ProfileSchema;
    }
  }

  /**
   * Deep clean extracted data
   */
  private static deepClean(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (Array.isArray(obj)) {
      const cleaned = obj.filter(item => item !== null && item !== undefined && item !== '').map(item => this.deepClean(item));
      return cleaned.length > 0 ? cleaned : [];
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const cleanedValue = this.deepClean(value);
        if (cleanedValue !== null && cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
      return cleaned;
    }

    if (typeof obj === 'string') {
      const trimmed = obj.trim();
      return trimmed === '' ? null : trimmed;
    }

    return obj;
  }

  /**
   * Calculate extraction statistics
   */
  private static calculateExtractionStats(profile: ProfileSchema): {
    confidence_score: number;
    fields_extracted: string[];
    fields_missing: string[];
  } {
    const allFields = this.getAllFieldPaths(profile);
    const extractedFields = allFields.filter(field => this.hasValue(profile, field));
    const missingFields = allFields.filter(field => !this.hasValue(profile, field));
    
    const confidence_score = Math.round((extractedFields.length / allFields.length) * 100);

    return {
      confidence_score,
      fields_extracted: extractedFields,
      fields_missing: missingFields
    };
  }

  /**
   * Get all possible field paths for a profile
   */
  private static getAllFieldPaths(obj: any, prefix = ''): string[] {
    const paths: string[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        paths.push(...this.getAllFieldPaths(value, currentPath));
      } else {
        paths.push(currentPath);
      }
    }
    
    return paths;
  }

  /**
   * Check if a field path has a meaningful value
   */
  private static hasValue(obj: any, path: string): boolean {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (!current || typeof current !== 'object') {
        return false;
      }
      current = current[key];
    }
    
    if (current === null || current === undefined) {
      return false;
    }
    
    if (Array.isArray(current)) {
      return current.length > 0;
    }
    
    if (typeof current === 'string') {
      return current.trim() !== '';
    }
    
    return true;
  }

  /**
   * Save extracted profile to database
   */
  static async saveProfileToDatabase(userId: string, extractedProfile: ProfileSchema, schoolType: SchoolType): Promise<boolean> {
    try {
      // Flatten the profile structure for database storage
      const flattenedProfile = this.flattenProfileForDatabase(extractedProfile, schoolType);
      
      // Check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
        throw new Error(`Failed to check existing profile: ${fetchError.message}`);
      }

      const profileRecord = {
        user_id: userId,
        applying_to: schoolType,
        ...flattenedProfile,
        ai_extracted: true,
        ai_extraction_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update(profileRecord)
          .eq('user_id', userId);

        if (updateError) {
          throw new Error(`Failed to update profile: ${updateError.message}`);
        }
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert(profileRecord);

        if (insertError) {
          throw new Error(`Failed to create profile: ${insertError.message}`);
        }
      }

      return true;
    } catch (error) {
      console.error('Error saving profile to database:', error);
      return false;
    }
  }

  /**
   * Flatten nested profile structure for database storage
   */
  private static flattenProfileForDatabase(profile: ProfileSchema, schoolType: SchoolType): Record<string, any> {
    const flattened: Record<string, any> = {};

    // Personal info
    if (profile.personal_info) {
      flattened.full_name = profile.personal_info.full_name;
      flattened.email_address = profile.personal_info.email_address;
      flattened.phone_number = profile.personal_info.phone_number;
      flattened.citizenship_status = profile.personal_info.citizenship_status;
    }

    // Academic background - varies by school type
    if (profile.academic_background) {
      if (schoolType === 'Undergraduate Colleges') {
        const bg = profile.academic_background as UndergraduateProfileSchema['academic_background'];
        flattened.high_school_name = bg.high_school_name;
        flattened.high_school_graduation_year = bg.high_school_graduation_year;
        flattened.gpa_unweighted = bg.gpa_unweighted;
        flattened.gpa_weighted = bg.gpa_weighted;
        flattened.class_rank = bg.class_rank;
        flattened.school_board = bg.school_board;
        flattened.year_of_study = bg.year_of_study;
        flattened.class_10_score = bg.class_10_score;
        flattened.class_11_score = bg.class_11_score;
        flattened.class_12_half_yearly_score = bg.class_12_half_yearly_score;
        flattened.intended_majors = bg.intended_majors?.join(', ');
        flattened.secondary_major_minor_interests = bg.secondary_major_minor_interests?.join(', ');
      } else {
        // Graduate programs
        flattened.college_name = profile.academic_background.undergraduate_institution;
        flattened.college_graduation_year = profile.academic_background.undergraduate_graduation_year;
        flattened.college_gpa = profile.academic_background.undergraduate_gpa;
        if ('masters_field_of_focus' in profile.academic_background) {
          flattened.masters_field_of_focus = profile.academic_background.masters_field_of_focus;
        }
      }
      
      flattened.academic_interests = profile.academic_background.academic_interests?.join(', ');
    }

    // Test scores
    if (profile.test_scores) {
      if (schoolType === 'Undergraduate Colleges') {
        const scores = profile.test_scores as UndergraduateProfileSchema['test_scores'];
        flattened.sat_score = scores.sat_score;
        flattened.act_score = scores.act_score;
      } else if (schoolType === 'MBA') {
        const scores = profile.test_scores as MBAProfileSchema['test_scores'];
        flattened.test_type = scores.test_type;
        flattened.test_score = scores.gmat_score || scores.gre_score;
      } else {
        // Masters/PhD
        const scores = profile.test_scores as MastersProfileSchema['test_scores'] | PhDProfileSchema['test_scores'];
        flattened.test_type = scores.test_type;
        flattened.test_score = scores.gre_score;
      }
    }

    // Extracurricular activities
    if (profile.extracurricular_activities) {
      flattened.extracurricular_activities = profile.extracurricular_activities.activities?.join(', ');
      flattened.leadership_roles = profile.extracurricular_activities.leadership_roles?.join(', ');
    }

    // Career goals
    if (profile.career_goals) {
      flattened.career_interests = profile.career_goals.career_interests?.join(', ');
    }

    // Preferences
    if (profile.preferences) {
      if (schoolType === 'Undergraduate Colleges') {
        const prefs = profile.preferences as UndergraduateProfileSchema['preferences'];
        flattened.ideal_college_size = prefs.ideal_college_size;
        flattened.ideal_college_setting = prefs.ideal_college_setting;
        flattened.geographic_preference = prefs.geographic_preference;
      }
      
      flattened.must_haves = profile.preferences.must_haves?.join(', ');
      flattened.deal_breakers = profile.preferences.deal_breakers?.join(', ');
    }

    // Financial considerations
    if (profile.financial_considerations) {
      if (schoolType === 'Undergraduate Colleges') {
        const fin = profile.financial_considerations as UndergraduateProfileSchema['financial_considerations'];
        flattened.college_budget = fin.college_budget;
      }
      
      flattened.financial_aid_importance = profile.financial_considerations.financial_aid_importance;
      flattened.scholarship_interests = profile.financial_considerations.scholarship_interests;
    }

    // Additional info
    if (profile.additional_info) {
      flattened.personal_projects = profile.additional_info.unique_experiences?.join(', ');
      flattened.application_concerns = profile.additional_info.questions_concerns?.join(', ');
    }

    return flattened;
  }
}
