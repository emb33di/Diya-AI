import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Reset onboarding status for the specific user
    const userId = '9f4789df-8a5f-42c0-aa67-f567c51bd2fa'
    
    const { error } = await supabaseClient
      .from('user_profiles')
      .update({ 
        onboarding_complete: false,
        cumulative_onboarding_time: 0
      })
      .eq('user_id', userId)

    if (error) {
      console.error('Error resetting onboarding:', error)
      throw new Error(`Failed to reset onboarding: ${error.message}`)
    }

    console.log('✅ Onboarding status reset for user:', userId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Onboarding status reset successfully',
        userId: userId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error resetting onboarding:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
