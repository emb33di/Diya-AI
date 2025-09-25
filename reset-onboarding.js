import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oliclbcxukqddxlfxuuc.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function resetOnboarding() {
  const userId = '9f4789df-8a5f-42c0-aa67-f567c51bd2fa'
  
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({ 
        onboarding_complete: false,
        cumulative_onboarding_time: 0
      })
      .eq('user_id', userId)

    if (error) {
      console.error('Error resetting onboarding:', error)
      return
    }

    console.log('✅ Onboarding status reset for user:', userId)
    
    // Verify the change
    const { data, error: fetchError } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, onboarding_complete, cumulative_onboarding_time')
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      console.error('Error fetching updated profile:', fetchError)
      return
    }

    console.log('Updated profile:', data)
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

resetOnboarding()
