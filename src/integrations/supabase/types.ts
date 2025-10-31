export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          date_of_birth: string | null
          email_address: string | null
          phone_number: string | null
          street_address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          citizenship_status: string | null
          high_school_name: string | null
          high_school_graduation_year: number | null
          gpa_unweighted: number | null
          gpa_weighted: number | null
          class_rank: string | null
          sat_score: number | null
          act_score: number | null
          intended_majors: string | null
          secondary_major_minor_interests: string | null
          career_interests: string | null
          ideal_college_size: string | null
          ideal_college_setting: string | null
          geographic_preference: string | null
          must_haves: string | null
          deal_breakers: string | null
          college_budget: string | null
          financial_aid_importance: string | null
          scholarship_interests: string[] | null
          applying_to: string | null
          onboarding_complete: boolean
          skipped_onboarding: boolean
          cumulative_onboarding_time: number
          user_tier: string | null
          is_founder: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          date_of_birth?: string | null
          email_address?: string | null
          phone_number?: string | null
          street_address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          citizenship_status?: string | null
          high_school_name?: string | null
          high_school_graduation_year?: number | null
          gpa_unweighted?: number | null
          gpa_weighted?: number | null
          class_rank?: string | null
          sat_score?: number | null
          act_score?: number | null
          intended_majors?: string | null
          secondary_major_minor_interests?: string | null
          career_interests?: string | null
          ideal_college_size?: string | null
          ideal_college_setting?: string | null
          geographic_preference?: string | null
          must_haves?: string | null
          deal_breakers?: string | null
          college_budget?: string | null
          financial_aid_importance?: string | null
          scholarship_interests?: string[] | null
          applying_to?: string | null
          onboarding_complete?: boolean
          skipped_onboarding?: boolean
          cumulative_onboarding_time?: number
          user_tier?: string | null
          is_founder?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          date_of_birth?: string | null
          email_address?: string | null
          phone_number?: string | null
          street_address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          citizenship_status?: string | null
          high_school_name?: string | null
          high_school_graduation_year?: number | null
          gpa_unweighted?: number | null
          gpa_weighted?: number | null
          class_rank?: string | null
          sat_score?: number | null
          act_score?: number | null
          intended_majors?: string | null
          secondary_major_minor_interests?: string | null
          career_interests?: string | null
          ideal_college_size?: string | null
          ideal_college_setting?: string | null
          geographic_preference?: string | null
          must_haves?: string | null
          deal_breakers?: string | null
          college_budget?: string | null
          financial_aid_importance?: string | null
          scholarship_interests?: string[] | null
          applying_to?: string | null
          onboarding_complete?: boolean
          skipped_onboarding?: boolean
          cumulative_onboarding_time?: number
          user_tier?: string | null
          is_founder?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      conversation_metadata: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          summary: string | null
          transcript: string | null
          audio_url: string | null
          session_number: number | null
          duration_seconds: number | null
          message_count: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          summary?: string | null
          transcript?: string | null
          audio_url?: string | null
          session_number?: number | null
          duration_seconds?: number | null
          message_count?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          summary?: string | null
          transcript?: string | null
          audio_url?: string | null
          session_number?: number | null
          duration_seconds?: number | null
          message_count?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_metadata_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      conversation_messages: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          source: string
          text: string
          timestamp: string
          message_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          source: string
          text: string
          timestamp?: string
          message_order: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          source?: string
          text?: string
          timestamp?: string
          message_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      conversation_tracking: {
        Row: {
          id: string
          conversation_id: string
          user_id: string
          conversation_started_at: string | null
          conversation_ended_at: string | null
          metadata_retrieved: boolean | null
          metadata_retrieved_at: string | null
          conversation_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          user_id: string
          conversation_started_at?: string | null
          conversation_ended_at?: string | null
          metadata_retrieved?: boolean | null
          metadata_retrieved_at?: string | null
          conversation_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          user_id?: string
          conversation_started_at?: string | null
          conversation_ended_at?: string | null
          metadata_retrieved?: boolean | null
          metadata_retrieved_at?: string | null
          conversation_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_tracking_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      escalated_essays: {
        Row: {
          id: string
          essay_id: string
          user_id: string
          essay_title: string
          essay_content: Json
          essay_prompt: string | null
          word_limit: string | null
          word_count: number
          character_count: number
          ai_comments_snapshot: Json
          semantic_document_id: string | null
          status: 'pending' | 'in_review' | 'reviewed' | 'sent_back'
          founder_feedback: string | null
          founder_edited_content: Json | null
          founder_comments: Json
          escalated_at: string
          reviewed_at: string | null
          sent_back_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          essay_id: string
          user_id: string
          essay_title: string
          essay_content: Json
          essay_prompt?: string | null
          word_limit?: string | null
          word_count?: number
          character_count?: number
          ai_comments_snapshot?: Json
          semantic_document_id?: string | null
          status?: 'pending' | 'in_review' | 'reviewed' | 'sent_back'
          founder_feedback?: string | null
          founder_edited_content?: Json | null
          founder_comments?: Json
          escalated_at?: string
          reviewed_at?: string | null
          sent_back_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          essay_id?: string
          user_id?: string
          essay_title?: string
          essay_content?: Json
          essay_prompt?: string | null
          word_limit?: string | null
          word_count?: number
          character_count?: number
          ai_comments_snapshot?: Json
          semantic_document_id?: string | null
          status?: 'pending' | 'in_review' | 'reviewed' | 'sent_back'
          founder_feedback?: string | null
          founder_edited_content?: Json | null
          founder_comments?: Json
          escalated_at?: string
          reviewed_at?: string | null
          sent_back_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalated_essays_essay_id_fkey"
            columns: ["essay_id"]
            referencedRelation: "essays"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalated_essays_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalated_essays_semantic_document_id_fkey"
            columns: ["semantic_document_id"]
            referencedRelation: "semantic_documents"
            referencedColumns: ["id"]
          }
        ]
      }
      resume_activities: {
        Row: {
          id: string
          user_id: string
          category: 'academic' | 'experience' | 'projects' | 'extracurricular' | 'volunteering' | 'skills' | 'interests' | 'languages' | 'leadership'
          title: string
          position: string | null
          location: string | null
          from_date: string | null
          to_date: string | null
          is_current: boolean
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category: 'academic' | 'experience' | 'projects' | 'extracurricular' | 'volunteering' | 'skills' | 'interests' | 'languages' | 'leadership'
          title: string
          position?: string | null
          location?: string | null
          from_date?: string | null
          to_date?: string | null
          is_current?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category?: 'academic' | 'experience' | 'projects' | 'extracurricular' | 'volunteering' | 'skills' | 'interests' | 'languages'
          title?: string
          position?: string | null
          location?: string | null
          from_date?: string | null
          to_date?: string | null
          is_current?: boolean
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_activities_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      resume_activity_bullets: {
        Row: {
          id: string
          activity_id: string
          bullet_text: string
          bullet_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          activity_id: string
          bullet_text: string
          bullet_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          activity_id?: string
          bullet_text?: string
          bullet_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_activity_bullets_activity_id_fkey"
            columns: ["activity_id"]
            referencedRelation: "resume_activities"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      resume_activities_with_bullets: {
        Row: {
          id: string
          user_id: string
          category: 'academic' | 'experience' | 'projects' | 'extracurricular' | 'volunteering' | 'skills' | 'interests' | 'languages' | 'leadership'
          title: string
          position: string | null
          location: string | null
          from_date: string | null
          to_date: string | null
          is_current: boolean
          display_order: number
          created_at: string
          updated_at: string
          bullets: Json
        }
        Relationships: [
          {
            foreignKeyName: "resume_activities_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for user profiles
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']

// Helper types for conversation tracking
export type ConversationTracking = Database['public']['Tables']['conversation_tracking']['Row']
export type ConversationTrackingInsert = Database['public']['Tables']['conversation_tracking']['Insert']
export type ConversationTrackingUpdate = Database['public']['Tables']['conversation_tracking']['Update']

// Helper types for resume data
export type ResumeActivity = Database['public']['Tables']['resume_activities']['Row']
export type ResumeActivityInsert = Database['public']['Tables']['resume_activities']['Insert']
export type ResumeActivityUpdate = Database['public']['Tables']['resume_activities']['Update']

export type ResumeActivityBullet = Database['public']['Tables']['resume_activity_bullets']['Row']
export type ResumeActivityBulletInsert = Database['public']['Tables']['resume_activity_bullets']['Insert']
export type ResumeActivityBulletUpdate = Database['public']['Tables']['resume_activity_bullets']['Update']

export type ResumeActivityWithBullets = Database['public']['Views']['resume_activities_with_bullets']['Row']

// Type for the bullets array in the view
export interface ResumeBullet {
  id: string
  bullet_text: string
  bullet_order: number
}

// Type for the complete resume data structure
export interface ResumeData {
  academic: ResumeActivityWithBullets[]
  experience: ResumeActivityWithBullets[]
  projects: ResumeActivityWithBullets[]
  extracurricular: ResumeActivityWithBullets[]
  volunteering: ResumeActivityWithBullets[]
  skills: ResumeActivityWithBullets[]
  interests: ResumeActivityWithBullets[]
  languages: ResumeActivityWithBullets[]
}
