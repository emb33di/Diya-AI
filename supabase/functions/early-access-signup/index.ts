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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { name, email, programType, biggestPainPoint, willingToPay } = await req.json()

    // Validate required fields
    if (!name || !email || !programType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user already exists
    const { data: existingUser, error: userCheckError } = await supabaseClient.auth.admin.getUserByEmail(email)
    
    if (userCheckError && userCheckError.message !== 'User not found') {
      console.error('Error checking existing user:', userCheckError)
      return new Response(
        JSON.stringify({ error: 'Failed to check existing user' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (existingUser.user) {
      return new Response(
        JSON.stringify({ error: 'User with this email already exists' }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create new user account
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password: Math.random().toString(36).slice(-12), // Generate random password
      email_confirm: true, // Auto-confirm email for early access users
      user_metadata: {
        full_name: name,
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' '),
        applying_to: programType,
        is_early_user: true,
        early_user_signup_date: new Date().toISOString(),
        biggest_pain_point: biggestPainPoint || null,
        willing_to_pay_2000: willingToPay === 'yes'
      }
    })

    if (authError) {
      console.error('Error creating user:', authError)
      return new Response(
        JSON.stringify({ error: 'Failed to create user account' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'User creation failed' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create user profile with early user settings
    const signupDate = new Date()
    const trialEndDate = new Date(signupDate.getTime() + (14 * 24 * 60 * 60 * 1000)) // 14 days

    const { error: profileError } = await supabaseClient
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        full_name: name,
        email_address: email,
        applying_to: programType,
        is_early_user: true,
        early_user_signup_date: signupDate.toISOString(),
        early_user_trial_end_date: trialEndDate.toISOString(),
        biggest_pain_point: biggestPainPoint || null,
        willing_to_pay_2000: willingToPay === 'yes',
        user_tier: 'pro', // Give them pro access during trial
        onboarding_complete: false,
        skipped_onboarding: false,
        profile_saved: false
      })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      // Clean up the auth user if profile creation fails
      await supabaseClient.auth.admin.deleteUser(authData.user.id)
      
      return new Response(
        JSON.stringify({ error: 'Failed to create user profile' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Send welcome email (optional - you can implement this later)
    // TODO: Send welcome email with login instructions

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Early access signup successful',
        userId: authData.user.id,
        trialEndDate: trialEndDate.toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
