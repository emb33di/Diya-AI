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
      resume_activities: {
        Row: {
          id: string
          user_id: string
          category: 'academic' | 'experience' | 'projects' | 'extracurricular' | 'volunteering' | 'skills' | 'interests' | 'languages'
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
          category: 'academic' | 'experience' | 'projects' | 'extracurricular' | 'volunteering' | 'skills' | 'interests' | 'languages'
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
          category: 'academic' | 'experience' | 'projects' | 'extracurricular' | 'volunteering' | 'skills' | 'interests' | 'languages'
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
