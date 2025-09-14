import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for the waitlist table
export interface WaitlistEntry {
  id?: string
  email: string
  user_type: string
  year_of_study?: string
  school_name?: string
  school_id?: string
  hear_about_us?: string
  hear_about_other?: string
  created_at?: string
  updated_at?: string
}
