import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { sessionManager } from '@/lib/supabase/session-manager'

export interface UserProfile {
  id: string
  full_name: string | null
  email_address: string | null
  onboarding_complete: boolean
  skipped_onboarding: boolean
  profile_saved: boolean
  user_tier: string | null
  is_founder?: boolean
  is_counselor?: boolean
  counselor_name?: string | null
}

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  isFounder: boolean
  isCounselor: boolean
  counselorName: string | null
  onboardingCompleted: boolean
  profileSaved: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle() as { data: UserProfile | null; error: any }

      if (error) throw error
      if (data) setProfile(data)
    } catch (err) {
      console.error('Error fetching profile:', err)
    }
  }

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id)
  }

  const signOut = async () => {
    sessionManager.stopAutoRefresh()
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        // Validate and potentially refresh session
        const isValid = await sessionManager.validateSession()
        
        if (!mounted) return

        if (isValid) {
          const { data: { session } } = await supabase.auth.getSession()
          const sessionUser = session?.user ?? null
          setUser(sessionUser)
          if (sessionUser) {
            await fetchProfile(sessionUser.id)
            // Start automatic session refresh
            sessionManager.startAutoRefresh()
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      const sessionUser = session?.user ?? null
      setUser(sessionUser)
      
      if (sessionUser) {
        await fetchProfile(sessionUser.id)
        // Start auto-refresh on sign in
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          sessionManager.startAutoRefresh()
        }
      } else {
        setProfile(null)
        // Stop auto-refresh on sign out
        if (event === 'SIGNED_OUT') {
          sessionManager.stopAutoRefresh()
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
      sessionManager.stopAutoRefresh()
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      isFounder: profile?.is_founder ?? false,
      isCounselor: profile?.is_counselor ?? false,
      counselorName: profile?.counselor_name ?? null,
      onboardingCompleted: profile?.onboarding_complete ?? false,
      profileSaved: profile?.profile_saved ?? false,
      refreshProfile,
      signOut,
    }),
    [user, profile, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuthContext = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within an AuthProvider')
  return ctx
}
