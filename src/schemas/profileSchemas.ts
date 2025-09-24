// JSON Schemas for AI Agent Profile Extraction
// These schemas define the structure for extracting profile data from outspeed transcripts
// based on the school type the user is applying to

export interface BaseProfileSchema {
  // Common fields across all school types
  personal_info: {
    full_name?: string;
    preferred_name?: string;
    email_address?: string;
    phone_number?: string;
    date_of_birth?: string;
    citizenship_status?: 'U.S. Citizen' | 'Permanent Resident' | 'International Student' | 'Other';
  };
  
  academic_background: {
    current_institution?: string;
    graduation_year?: number;
    gpa?: number;
    academic_interests?: string[];
    major_interests?: string[];
  };
  
  test_scores: {
    test_type?: string;
    test_score?: number;
    test_status?: 'taken' | 'planning_to_take' | 'not_taking';
  };
  
  extracurricular_activities: {
    activities?: string[];
    leadership_roles?: string[];
    achievements?: string[];
    community_service?: string[];
  };
  
  career_goals: {
    short_term_goals?: string[];
    long_term_aspirations?: string[];
    career_interests?: string[];
  };
  
  preferences: {
    geographic_preference?: string[];
    program_preferences?: string[];
    must_haves?: string[];
    deal_breakers?: string[];
  };
  
  financial_considerations: {
    budget_range?: string;
    financial_aid_importance?: 'Crucial' | 'Very Important' | 'Somewhat Important' | 'Not a factor';
    scholarship_interests?: string[];
  };
  
  additional_info: {
    personal_values?: string[];
    challenges_overcome?: string[];
    unique_experiences?: string[];
    questions_concerns?: string[];
  };
}

// Undergraduate College Application Schema
export interface UndergraduateProfileSchema extends BaseProfileSchema {
  academic_background: {
    high_school_name?: string;
    high_school_graduation_year?: number;
    gpa_unweighted?: number;
    gpa_weighted?: number;
    class_rank?: string;
    school_board?: string; // CBSE, ICSE, IB, A-Levels, AP, etc.
    year_of_study?: string; // 11th, 12th, Graduate
    class_10_score?: number;
    class_11_score?: number;
    class_12_half_yearly_score?: number;
    academic_interests?: string[];
    intended_majors?: string[];
    secondary_major_minor_interests?: string[];
  };
  
  test_scores: {
    sat_score?: number;
    act_score?: number;
    test_status?: 'taken' | 'planning_to_take' | 'not_taking';
  };
  
  preferences: {
    ideal_college_size?: 'Small (< 2,000 students)' | 'Medium (2,000 - 15,000 students)' | 'Large (> 15,000 students)';
    ideal_college_setting?: 'Urban' | 'Suburban' | 'Rural' | 'College Town';
    geographic_preference?: 'In-state' | 'Out-of-state' | 'Northeast' | 'West Coast' | 'No Preference';
    program_preferences?: string[];
    must_haves?: string[];
    deal_breakers?: string[];
  };
  
  financial_considerations: {
    college_budget?: '< $20,000' | '$20,000 - $35,000' | '$35,000 - $50,000' | '$50,000 - $70,000' | '> $70,000';
    financial_aid_importance?: 'Crucial' | 'Very Important' | 'Somewhat Important' | 'Not a factor';
    scholarship_interests?: string[];
  };
}

// MBA Application Schema
export interface MBAProfileSchema extends BaseProfileSchema {
  academic_background: {
    undergraduate_institution?: string;
    undergraduate_major?: string;
    undergraduate_graduation_year?: number;
    undergraduate_gpa?: number;
    academic_interests?: string[];
  };
  
  professional_experience: {
    years_of_experience?: number;
    current_role?: string;
    current_company?: string;
    industry?: string;
    work_experience_summary?: string[];
    leadership_experience?: string[];
    achievements?: string[];
  };
  
  test_scores: {
    gmat_score?: number;
    gre_score?: number;
    test_type?: 'GMAT' | 'GRE' | 'Not yet taken';
    test_status?: 'taken' | 'planning_to_take' | 'not_taking';
  };
  
  career_goals: {
    post_mba_goals?: string[];
    target_industry?: string[];
    target_function?: string[];
    career_switch_goals?: string[];
  };
  
  preferences: {
    program_type?: 'Full-time' | 'Part-time' | 'Executive' | 'Online';
    geographic_preference?: string[];
    school_preferences?: string[];
    must_haves?: string[];
    deal_breakers?: string[];
  };
  
  financial_considerations: {
    budget_range?: string;
    funding_sources?: string[]; // Personal savings, loans, employer sponsorship, scholarships
    financial_aid_importance?: 'Crucial' | 'Very Important' | 'Somewhat Important' | 'Not a factor';
    scholarship_interests?: string[];
  };
}

// Masters Application Schema
export interface MastersProfileSchema extends BaseProfileSchema {
  academic_background: {
    undergraduate_institution?: string;
    undergraduate_major?: string;
    undergraduate_graduation_year?: number;
    undergraduate_gpa?: number;
    masters_field_of_focus?: string;
    academic_interests?: string[];
    research_interests?: string[];
  };
  
  professional_experience: {
    years_of_experience?: number;
    current_role?: string;
    current_company?: string;
    industry?: string;
    relevant_experience?: string[];
    research_experience?: string[];
    internships?: string[];
    projects?: string[];
  };
  
  test_scores: {
    gre_score?: number;
    test_type?: 'GRE' | 'Not yet taken';
    test_status?: 'taken' | 'planning_to_take' | 'not_taking';
    english_proficiency?: {
      toefl_score?: number;
      ielts_score?: number;
      test_status?: 'taken' | 'planning_to_take' | 'not_taking';
    };
  };
  
  career_goals: {
    masters_motivation?: string[];
    career_goals?: string[];
    research_goals?: string[];
    academic_goals?: string[];
  };
  
  preferences: {
    program_type?: 'Research-based' | 'Coursework-based' | 'Professional';
    geographic_preference?: string[];
    university_preferences?: string[];
    must_haves?: string[];
    deal_breakers?: string[];
  };
  
  financial_considerations: {
    budget_range?: string;
    funding_sources?: string[]; // Personal savings, loans, assistantships, scholarships
    financial_aid_importance?: 'Crucial' | 'Very Important' | 'Somewhat Important' | 'Not a factor';
    scholarship_interests?: string[];
  };
}

// PhD Application Schema
export interface PhDProfileSchema extends BaseProfileSchema {
  academic_background: {
    undergraduate_institution?: string;
    undergraduate_major?: string;
    undergraduate_graduation_year?: number;
    undergraduate_gpa?: number;
    masters_institution?: string;
    masters_major?: string;
    masters_graduation_year?: number;
    masters_gpa?: number;
    phd_field_of_focus?: string;
    academic_interests?: string[];
    research_interests?: string[];
    specific_research_questions?: string[];
  };
  
  research_experience: {
    years_of_research?: number;
    research_projects?: string[];
    publications?: string[];
    conference_presentations?: string[];
    thesis_projects?: string[];
    lab_experience?: string[];
    research_achievements?: string[];
  };
  
  test_scores: {
    gre_score?: number;
    test_type?: 'GRE' | 'Not yet taken';
    test_status?: 'taken' | 'planning_to_take' | 'not_taking';
    english_proficiency?: {
      toefl_score?: number;
      ielts_score?: number;
      test_status?: 'taken' | 'planning_to_take' | 'not_taking';
    };
  };
  
  career_goals: {
    phd_motivation?: string[];
    career_aspirations?: 'Academia' | 'Industry Research' | 'Government' | 'Other';
    research_goals?: string[];
    academic_goals?: string[];
    long_term_vision?: string[];
  };
  
  advisor_preferences: {
    potential_advisors?: string[];
    research_lab_preferences?: string[];
    university_preferences?: string[];
    geographic_preference?: string[];
    must_haves?: string[];
    deal_breakers?: string[];
  };
  
  financial_considerations: {
    funding_expectations?: 'Fully funded' | 'Partially funded' | 'Self-funded';
    assistantship_preferences?: string[];
    fellowship_interests?: string[];
    financial_aid_importance?: 'Crucial' | 'Very Important' | 'Somewhat Important' | 'Not a factor';
  };
}

// Union type for all profile schemas
export type ProfileSchema = 
  | UndergraduateProfileSchema 
  | MBAProfileSchema 
  | MastersProfileSchema 
  | PhDProfileSchema;

// Type guards to determine which schema to use
export function isUndergraduateSchema(schema: ProfileSchema): schema is UndergraduateProfileSchema {
  return 'high_school_name' in schema.academic_background;
}

export function isMBASchema(schema: ProfileSchema): schema is MBAProfileSchema {
  return 'professional_experience' in schema;
}

export function isMastersSchema(schema: ProfileSchema): schema is MastersProfileSchema {
  return 'masters_field_of_focus' in schema.academic_background && !('professional_experience' in schema);
}

export function isPhDSchema(schema: ProfileSchema): schema is PhDProfileSchema {
  return 'phd_field_of_focus' in schema.academic_background && 'research_experience' in schema;
}

// Schema mapping based on applying_to field
export const SCHEMA_MAPPING = {
  'Undergraduate Colleges': 'undergraduate',
  'MBA': 'mba',
  'Masters': 'masters',
  'PhD': 'phd',
  'LLM': 'masters' // LLM uses masters schema with law-specific fields
} as const;

export type SchoolType = keyof typeof SCHEMA_MAPPING;
export type SchemaType = typeof SCHEMA_MAPPING[SchoolType];
