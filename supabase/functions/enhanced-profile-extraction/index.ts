import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface EnhancedProfileExtractionRequest {
  conversation_id: string;
  user_id: string;
  school_type?: string; // Will be determined from user profile if not provided
}

interface EnhancedProfileExtractionResponse {
  success: boolean;
  message: string;
  conversation_id: string;
  user_id: string;
  school_type?: string;
  extracted_profile?: any;
  confidence_score?: number;
  fields_extracted?: string[];
  fields_missing?: string[];
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Google Gemini API configuration
const GEMINI_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent'

// School type mapping
const SCHOOL_TYPE_MAPPING = {
  'undergraduate': 'undergraduate',
  'mba': 'mba', 
  'masters': 'masters',
  'phd': 'phd',
  'llm': 'llm' // LLM has its own schema with law-specific fields
} as const;

type SchoolType = keyof typeof SCHOOL_TYPE_MAPPING;

/**
 * Get user's school type from user_profiles table
 */
async function getUserSchoolType(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('applying_to')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.log('No applying_to found in user_profiles for user:', userId);
      return null;
    }

    return data.applying_to;
  } catch (error) {
    console.error('Error fetching user school type:', error);
    return null;
  }
}

/**
 * Get conversation transcript from database
 */
async function getConversationTranscript(conversationId: string, userId: string): Promise<string | null> {
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
function generateSchoolSpecificPrompt(schoolType: string, transcript: string): string {
  const basePrompt = `You are an expert college admissions counselor specializing in ${schoolType} applications. 
  Analyze the following conversation transcript and extract comprehensive profile information in the specified JSON format.

  CONVERSATION TRANSCRIPT:
  ${transcript}

  INSTRUCTIONS:
  1. Extract specific, concrete information mentioned in the conversation
  2. Focus on details relevant to ${schoolType} applications
  3. If information is not mentioned, use null or empty arrays
  4. Be precise and avoid making assumptions
  5. Extract exact quotes when possible for authenticity
  6. Pay special attention to personal stories, achievements, and goals
  7. Extract ALL fields listed in the JSON schema - be comprehensive
  8. For financial fields, infer from context (e.g., if scholarships mentioned, set looking_for_scholarships to "yes")`;

  switch (schoolType) {
    case 'undergraduate':
      return `${basePrompt}

      RESPONSE FORMAT (JSON only):
      {
        "personal_info": {
          "full_name": "string or null",
          "preferred_name": "string or null",
          "email_address": "string or null", 
          "country_code": "string or null (e.g., +1, +91, +44, etc.)",
          "applying_to": "undergraduate"
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
          "intended_majors": "string or null (comma-separated list)",
          "secondary_major_minor_interests": "string or null (comma-separated list)"
        },
        "test_scores": {
          "sat_score": "number or null",
          "act_score": "number or null"
        },
        "extracurricular_activities": {
          "activities": ["array of activities mentioned"],
          "leadership_roles": ["array of leadership positions"],
          "personal_projects": ["array of personal projects mentioned"]
        },
        "career_goals": {
          "career_interests": ["array of career fields of interest"]
        },
        "preferences": {
          "ideal_college_size": "Small (< 2,000 students) | Medium (2,000 - 15,000 students) | Large (> 15,000 students) or null",
          "ideal_college_setting": "Urban | Suburban | Rural | College Town or null",
          "geographic_preference": "In-state | Out-of-state | Northeast | West Coast | No Preference or null",
          "must_haves": ["array of essential features"],
          "deal_breakers": ["array of undesirable features"]
        },
        "financial_considerations": {
          "college_budget": "< $20,000 | $20,000 - $35,000 | $35,000 - $50,000 | $50,000 - $70,000 | > $70,000 or null",
          "financial_aid_importance": "Crucial | Very Important | Somewhat Important | Not a factor or null",
          "scholarship_interests": ["array of scholarship types"],
          "looking_for_scholarships": "yes | no | null",
          "looking_for_financial_aid": "yes | no | null"
        },
        "additional_info": {
          "application_concerns": ["array of application concerns"],
          "specific_questions": ["array of specific questions mentioned"]
        }
      }`;

    case 'mba':
      return `${basePrompt}

      RESPONSE FORMAT (JSON only):
      {
        "personal_info": {
          "full_name": "string or null",
          "preferred_name": "string or null",
          "email_address": "string or null",
          "country_code": "string or null (e.g., +1, +91, +44, etc.)",
          "applying_to": "mba"
        },
        "academic_background": {
          "college_name": "string or null",
          "college_graduation_year": "number or null",
          "college_gpa": "number or null",
          "undergraduate_cgpa": "number or null",
          "masters_field_of_focus": "string or null"
        },
        "test_scores": {
          "test_type": "GMAT | GRE | Not yet taken or null",
          "test_score": "number or null"
        },
        "extracurricular_activities": {
          "activities": ["array of activities mentioned"],
          "leadership_roles": ["array of leadership positions"],
          "personal_projects": ["array of personal projects mentioned"]
        },
        "career_goals": {
          "career_interests": ["array of career fields of interest"]
        },
        "preferences": {
          "ideal_college_size": "Small (< 2,000 students) | Medium (2,000 - 15,000 students) | Large (> 15,000 students) or null",
          "ideal_college_setting": "Urban | Suburban | Rural | College Town or null",
          "geographic_preference": "In-state | Out-of-state | Northeast | West Coast | No Preference or null",
          "must_haves": ["array of essential features"],
          "deal_breakers": ["array of undesirable features"]
        },
        "financial_considerations": {
          "college_budget": "< $20,000 | $20,000 - $35,000 | $35,000 - $50,000 | $50,000 - $70,000 | > $70,000 or null",
          "financial_aid_importance": "Crucial | Very Important | Somewhat Important | Not a factor or null",
          "scholarship_interests": ["array of scholarship types"],
          "looking_for_scholarships": "yes | no | null",
          "looking_for_financial_aid": "yes | no | null"
        },
        "additional_info": {
          "application_concerns": ["array of application concerns"],
          "specific_questions": ["array of specific questions mentioned"]
        }
      }`;

    case 'masters':
      return `${basePrompt}

      RESPONSE FORMAT (JSON only):
      {
        "personal_info": {
          "full_name": "string or null",
          "preferred_name": "string or null",
          "email_address": "string or null",
          "country_code": "string or null (e.g., +1, +91, +44, etc.)",
          "applying_to": "masters"
        },
        "academic_background": {
          "college_name": "string or null",
          "college_graduation_year": "number or null",
          "college_gpa": "number or null",
          "undergraduate_cgpa": "number or null",
          "masters_field_of_focus": "string or null"
        },
        "test_scores": {
          "test_type": "GRE | Not yet taken or null",
          "test_score": "number or null"
        },
        "extracurricular_activities": {
          "activities": ["array of activities mentioned"],
          "leadership_roles": ["array of leadership positions"],
          "personal_projects": ["array of personal projects mentioned"]
        },
        "career_goals": {
          "career_interests": ["array of career fields of interest"]
        },
        "preferences": {
          "ideal_college_size": "Small (< 2,000 students) | Medium (2,000 - 15,000 students) | Large (> 15,000 students) or null",
          "ideal_college_setting": "Urban | Suburban | Rural | College Town or null",
          "geographic_preference": "In-state | Out-of-state | Northeast | West Coast | No Preference or null",
          "must_haves": ["array of essential features"],
          "deal_breakers": ["array of undesirable features"]
        },
        "financial_considerations": {
          "college_budget": "< $20,000 | $20,000 - $35,000 | $35,000 - $50,000 | $50,000 - $70,000 | > $70,000 or null",
          "financial_aid_importance": "Crucial | Very Important | Somewhat Important | Not a factor or null",
          "scholarship_interests": ["array of scholarship types"],
          "looking_for_scholarships": "yes | no | null",
          "looking_for_financial_aid": "yes | no | null"
        },
        "additional_info": {
          "application_concerns": ["array of application concerns"],
          "specific_questions": ["array of specific questions mentioned"]
        }
      }`;

    case 'phd':
      return `${basePrompt}

      RESPONSE FORMAT (JSON only):
      {
        "personal_info": {
          "full_name": "string or null",
          "preferred_name": "string or null",
          "email_address": "string or null",
          "country_code": "string or null (e.g., +1, +91, +44, etc.)",
          "applying_to": "phd"
        },
        "academic_background": {
          "college_name": "string or null",
          "college_graduation_year": "number or null",
          "college_gpa": "number or null",
          "undergraduate_cgpa": "number or null",
          "masters_field_of_focus": "string or null"
        },
        "test_scores": {
          "test_type": "GRE | Not yet taken or null",
          "test_score": "number or null"
        },
        "extracurricular_activities": {
          "activities": ["array of activities mentioned"],
          "leadership_roles": ["array of leadership positions"],
          "personal_projects": ["array of personal projects mentioned"]
        },
        "career_goals": {
          "career_interests": ["array of career fields of interest"]
        },
        "preferences": {
          "ideal_college_size": "Small (< 2,000 students) | Medium (2,000 - 15,000 students) | Large (> 15,000 students) or null",
          "ideal_college_setting": "Urban | Suburban | Rural | College Town or null",
          "geographic_preference": "In-state | Out-of-state | Northeast | West Coast | No Preference or null",
          "must_haves": ["array of essential features"],
          "deal_breakers": ["array of undesirable features"]
        },
        "financial_considerations": {
          "college_budget": "< $20,000 | $20,000 - $35,000 | $35,000 - $50,000 | $50,000 - $70,000 | > $70,000 or null",
          "financial_aid_importance": "Crucial | Very Important | Somewhat Important | Not a factor or null",
          "scholarship_interests": ["array of scholarship types"],
          "looking_for_scholarships": "yes | no | null",
          "looking_for_financial_aid": "yes | no | null"
        },
        "additional_info": {
          "application_concerns": ["array of application concerns"],
          "specific_questions": ["array of specific questions mentioned"]
        }
      }`;

    case 'llm':
      return `${basePrompt}

      RESPONSE FORMAT (JSON only):
      {
        "personal_info": {
          "full_name": "string or null",
          "preferred_name": "string or null",
          "email_address": "string or null",
          "country_code": "string or null (e.g., +1, +91, +44, etc.)",
          "applying_to": "llm"
        },
        "academic_background": {
          "college_name": "string or null",
          "college_graduation_year": "number or null",
          "college_gpa": "number or null",
          "undergraduate_cgpa": "number or null",
          "masters_field_of_focus": "string or null"
        },
        "test_scores": {
          "test_type": "LSAT | GRE | Not yet taken or null",
          "test_score": "number or null"
        },
        "extracurricular_activities": {
          "activities": ["array of activities mentioned"],
          "leadership_roles": ["array of leadership positions"],
          "personal_projects": ["array of personal projects mentioned"]
        },
        "career_goals": {
          "career_interests": ["array of career fields of interest"]
        },
        "preferences": {
          "ideal_college_size": "Small (< 2,000 students) | Medium (2,000 - 15,000 students) | Large (> 15,000 students) or null",
          "ideal_college_setting": "Urban | Suburban | Rural | College Town or null",
          "geographic_preference": "In-state | Out-of-state | Northeast | West Coast | No Preference or null",
          "must_haves": ["array of essential features"],
          "deal_breakers": ["array of undesirable features"]
        },
        "financial_considerations": {
          "college_budget": "< $20,000 | $20,000 - $35,000 | $35,000 - $50,000 | $50,000 - $70,000 | > $70,000 or null",
          "financial_aid_importance": "Crucial | Very Important | Somewhat Important | Not a factor or null",
          "scholarship_interests": ["array of scholarship types"],
          "looking_for_scholarships": "yes | no | null",
          "looking_for_financial_aid": "yes | no | null"
        },
        "additional_info": {
          "application_concerns": ["array of application concerns"],
          "specific_questions": ["array of specific questions mentioned"]
        }
      }`;

    default:
      return basePrompt + '\n\nPlease extract relevant information in a structured JSON format.';
  }
}

/**
 * Call Gemini API to extract profile information
 */
async function callGeminiAPI(prompt: string): Promise<any> {
  if (!GEMINI_API_KEY) {
    throw new Error('Google API key not configured');
  }

  try {
    const response = await fetch(GEMINI_API_URL, {
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

    // Parse the JSON response with better error handling
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('Raw response:', generatedText);
      throw new Error(`Failed to parse JSON response: ${parseError.message}`);
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

/**
 * Deep clean extracted data
 */
function deepClean(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (Array.isArray(obj)) {
    const cleaned = obj.filter(item => item !== null && item !== undefined && item !== '').map(item => deepClean(item));
    return cleaned.length > 0 ? cleaned : [];
  }

  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = deepClean(value);
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
function calculateExtractionStats(profile: any): {
  confidence_score: number;
  fields_extracted: string[];
  fields_missing: string[];
} {
  const allFields = getAllFieldPaths(profile);
  const extractedFields = allFields.filter(field => hasValue(profile, field));
  const missingFields = allFields.filter(field => !hasValue(profile, field));
  
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
function getAllFieldPaths(obj: any, prefix = ''): string[] {
  const paths: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...getAllFieldPaths(value, currentPath));
    } else {
      paths.push(currentPath);
    }
  }
  
  return paths;
}

/**
 * Check if a field path has a meaningful value
 */
function hasValue(obj: any, path: string): boolean {
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
 * Flatten nested profile structure for database storage
 */
function flattenProfileForDatabase(profile: any, schoolType: string): Record<string, any> {
  const flattened: Record<string, any> = {};

  // Personal info - maps to all schema fields
  if (profile.personal_info) {
    flattened.full_name = profile.personal_info.full_name;
    // Note: preferred_name field was removed from database schema
    flattened.email_address = profile.personal_info.email_address;
    // Note: phone_number is excluded from extraction as per requirements
    flattened.country_code = profile.personal_info.country_code;
    // Cast to enum type to avoid type mismatch
    flattened.applying_to = profile.personal_info.applying_to as 'undergraduate' | 'mba' | 'llm' | 'phd' | 'masters';
  }

  // Academic background - maps to all schema fields based on school type
  if (profile.academic_background) {
    if (schoolType === 'undergraduate') {
      const bg = profile.academic_background;
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
      flattened.intended_majors = bg.intended_majors;
      flattened.secondary_major_minor_interests = bg.secondary_major_minor_interests;
    } else {
      // Graduate programs
      flattened.college_name = profile.academic_background.college_name;
      flattened.college_graduation_year = profile.academic_background.college_graduation_year;
      flattened.college_gpa = profile.academic_background.college_gpa;
      flattened.undergraduate_cgpa = profile.academic_background.undergraduate_cgpa;
      flattened.masters_field_of_focus = profile.academic_background.masters_field_of_focus;
    }
  }

  // Test scores - maps to all schema fields
  if (profile.test_scores) {
    if (schoolType === 'undergraduate') {
      flattened.sat_score = profile.test_scores.sat_score;
      flattened.act_score = profile.test_scores.act_score;
    } else {
      // Graduate programs
      flattened.test_type = profile.test_scores.test_type;
      flattened.test_score = profile.test_scores.test_score;
    }
  }

  // Extracurricular activities - maps to schema fields
  if (profile.extracurricular_activities) {
    flattened.extracurricular_activities = profile.extracurricular_activities.activities?.join(', ');
    flattened.leadership_roles = profile.extracurricular_activities.leadership_roles?.join(', ');
    flattened.personal_projects = profile.extracurricular_activities.personal_projects?.join(', ');
  }

  // Career goals - maps to schema fields
  if (profile.career_goals) {
    flattened.career_interests = profile.career_goals.career_interests?.join(', ');
  }

  // Preferences - maps to all schema fields
  if (profile.preferences) {
    flattened.ideal_college_size = profile.preferences.ideal_college_size;
    flattened.ideal_college_setting = profile.preferences.ideal_college_setting;
    flattened.geographic_preference = profile.preferences.geographic_preference;
    flattened.must_haves = profile.preferences.must_haves?.join(', ');
    flattened.deal_breakers = profile.preferences.deal_breakers?.join(', ');
  }

  // Financial considerations - maps to all schema fields
  if (profile.financial_considerations) {
    flattened.college_budget = profile.financial_considerations.college_budget;
    flattened.financial_aid_importance = profile.financial_considerations.financial_aid_importance;
    // Note: scholarship_interests field was removed from database schema
    flattened.looking_for_scholarships = profile.financial_considerations.looking_for_scholarships;
    flattened.looking_for_financial_aid = profile.financial_considerations.looking_for_financial_aid;
  }

  // Additional info - maps to schema fields
  if (profile.additional_info) {
    flattened.application_concerns = profile.additional_info.application_concerns?.join(', ');
    flattened.specific_questions = profile.additional_info.specific_questions?.join(', ');
  }

  return flattened;
}

/**
 * Save extracted profile to database
 */
async function saveProfileToDatabase(userId: string, extractedProfile: any, schoolType: string): Promise<boolean> {
  try {
    // Validate required fields
    if (!userId || !schoolType) {
      throw new Error('Missing required fields: userId and schoolType are required');
    }

    // Flatten the profile structure for database storage
    const flattenedProfile = flattenProfileForDatabase(extractedProfile, schoolType);
    
    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found"
      throw new Error(`Failed to check existing profile: ${fetchError.message}`);
    }

    // Map school type to database enum value
    const mappedSchoolType = schoolType === 'undergraduate' ? 'undergraduate' : schoolType;

    const profileRecord = {
      user_id: userId,
      applying_to: mappedSchoolType,
      ...flattenedProfile,
      ai_extracted: true,
      ai_extraction_date: new Date().toISOString(),
      // Don't set profile_saved here - only set it during initial onboarding completion
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { conversation_id, user_id, school_type }: EnhancedProfileExtractionRequest = await req.json()

    if (!conversation_id || !user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required fields: conversation_id, user_id',
          conversation_id: conversation_id || '',
          user_id: user_id || ''
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get user's school type if not provided
    let userSchoolType = school_type;
    if (!userSchoolType) {
      const fetchedSchoolType = await getUserSchoolType(user_id);
      if (!fetchedSchoolType) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Could not determine school type for user. Please ensure applying_to field is set in profile.',
            conversation_id,
            user_id
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      userSchoolType = fetchedSchoolType;
    }

    // Get conversation transcript
    const transcript = await getConversationTranscript(conversation_id, user_id);
    if (!transcript) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No transcript found for this conversation',
          conversation_id,
          user_id,
          school_type: userSchoolType
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate school-specific prompt
    const prompt = generateSchoolSpecificPrompt(userSchoolType, transcript);

    // Extract profile using AI
    const rawProfile = await callGeminiAPI(prompt);

    // Validate and clean extracted data
    const cleanedProfile = deepClean(rawProfile);

    // Calculate confidence score and field statistics
    const stats = calculateExtractionStats(cleanedProfile);

    // Save profile to database
    const savedSuccessfully = await saveProfileToDatabase(user_id, cleanedProfile, userSchoolType);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Profile information extracted and ${savedSuccessfully ? 'saved' : 'extraction completed (save failed)'} successfully`,
        conversation_id,
        user_id,
        school_type: userSchoolType,
        extracted_profile: cleanedProfile,
        confidence_score: stats.confidence_score,
        fields_extracted: stats.fields_extracted,
        fields_missing: stats.fields_missing
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in enhanced-profile-extraction:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        message: `Error extracting profile: ${error.message}`,
        conversation_id: '',
        user_id: ''
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
