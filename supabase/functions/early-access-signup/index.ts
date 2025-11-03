import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.39.4";

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
    // Create Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false
        }
      }
    )

    const { name, email, password, programType, biggestPainPoint, willingToPay } = await req.json()

    // Debug logging
    console.log('Received data:', { name, email, programType, biggestPainPoint, willingToPay })
    console.log('willingToPay type:', typeof willingToPay)
    console.log('willingToPay value:', willingToPay)

    // Ensure willingToPay is a string value
    let willingToPayValue = willingToPay
    if (typeof willingToPay === 'boolean') {
      willingToPayValue = willingToPay ? 'yes' : 'no'
      console.log('Converted boolean to string:', willingToPayValue)
    }

    // Validate required fields
    if (!name || !email || !password || !programType) {
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

    // Try to create user with provided password - if user exists, we'll handle the error
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password: password, // Use the password provided by the user
      email_confirm: true, // Auto-confirm email for early access users
      user_metadata: {
        full_name: name,
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' '),
        applying_to: programType,
        is_early_user: true,
        early_user_signup_date: new Date().toISOString(),
        biggest_pain_point: biggestPainPoint || null,
        willing_to_pay_2000: willingToPayValue
      }
    })

    // Check if user already exists
    if (authError && authError.message.includes('already registered')) {
      return new Response(
        JSON.stringify({ error: 'User with this email already exists' }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

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

    // Check if user profile already exists
    const { data: existingProfile, error: profileCheckError } = await supabaseClient
      .from('user_profiles')
      .select('id')
      .eq('user_id', authData.user.id)
      .limit(1)

    if (profileCheckError) {
      console.error('Error checking existing profile:', profileCheckError)
      return new Response(
        JSON.stringify({ error: 'Failed to check existing profile' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // If profile already exists, update it with early user fields
    if (existingProfile && existingProfile.length > 0) {
      // Check current escalation_slots to avoid overwriting admin adjustments
      const { data: currentProfile } = await supabaseClient
        .from('user_profiles')
        .select('escalation_slots')
        .eq('user_id', authData.user.id)
        .single();

      const updateData: any = {
        full_name: name,
        email_address: email,
        applying_to: programType,
        is_early_user: true,
        early_user_signup_date: new Date().toISOString(),
        early_user_trial_end_date: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)).toISOString(),
        biggest_pain_point: biggestPainPoint || null,
        willing_to_pay_2000: willingToPayValue,
        user_tier: 'Pro', // Give them pro access during trial
      };

      // Only set escalation_slots to 2 if it's currently NULL (new Pro user)
      // This preserves any admin manual adjustments
      if (currentProfile?.escalation_slots === null || currentProfile?.escalation_slots === undefined) {
        updateData.escalation_slots = 2;
      }

      const { error: updateError } = await supabaseClient
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', authData.user.id)

      if (updateError) {
        console.error('Error updating existing profile:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update user profile' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Early access signup successful - profile updated',
          userId: authData.user.id
        }),
        { 
          status: 200, 
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
        willing_to_pay_2000: willingToPayValue,
        user_tier: 'Pro', // Give them pro access during trial
        escalation_slots: 2, // New Pro users get 2 escalation slots
        onboarding_complete: false,
        skipped_onboarding: false,
        profile_saved: false
      })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      
      // Handle duplicate key error specifically
      if (profileError.code === '23505') {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'User profile already exists',
            userId: authData.user.id
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to create user profile' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Send welcome email to early access user
    try {
      const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-early-access-welcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          email,
          firstName: name.split(' ')[0], // Extract first name
          programType,
          trialEndDate: trialEndDate.toISOString()
        })
      });

      if (emailResponse.ok) {
        console.log('Early access welcome email sent successfully');
      } else {
        console.warn('Failed to send early access welcome email, but user was created');
      }
    } catch (emailError) {
      console.warn('Error sending early access welcome email:', emailError);
    }

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
