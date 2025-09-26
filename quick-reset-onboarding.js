#!/usr/bin/env node

/**
 * Quick onboarding reset script for testing
 * Usage: node quick-reset-onboarding.js [USER_ID]
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://oliclbcxukqddxlfxuuc.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  console.log('💡 Set it with: export SUPABASE_SERVICE_ROLE_KEY="your_key_here"')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function resetOnboarding(userId) {
  if (!userId) {
    console.error('❌ User ID is required')
    console.log('💡 Usage: node quick-reset-onboarding.js USER_ID')
    process.exit(1)
  }
  
  try {
    console.log(`🔄 Resetting onboarding for user: ${userId}`)
    
    // Reset onboarding status
    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        onboarding_complete: false,
        cumulative_onboarding_time: 0
      })
      .eq('user_id', userId)

    if (error) {
      console.error('❌ Error resetting onboarding:', error)
      return false
    }

    console.log('✅ Onboarding status reset successfully')
    
    // Verify the change
    const { data, error: fetchError } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, onboarding_complete, cumulative_onboarding_time')
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching updated profile:', fetchError)
      return false
    }

    console.log('📊 Updated profile:', data)
    return true
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

// Get user ID from command line argument
const userId = process.argv[2]
resetOnboarding(userId)
