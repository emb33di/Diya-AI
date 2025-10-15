import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')!
const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Creating Razorpay customer for user: ${user.id}`)

    // Get user profile to extract name and phone
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('full_name, email_address, phone_number, country_code, razorpay_customer_id')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.error('Failed to fetch user profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile', details: profileError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if customer already exists
    if (profile.razorpay_customer_id) {
      console.log(`Customer already exists: ${profile.razorpay_customer_id}`)
      return new Response(
        JSON.stringify({ 
          customer_id: profile.razorpay_customer_id,
          message: 'Customer already exists',
          existing: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prepare phone number (combine country_code and phone_number)
    // Remove any non-digit characters from phone number
    const cleanPhone = (profile.phone_number || '').replace(/\D/g, '')
    const phoneNumber = cleanPhone ? `${profile.country_code || '+91'}${cleanPhone}` : '+919000090000'
    
    console.log(`Creating customer with phone: ${phoneNumber}`)

    // Validate name (Razorpay requires 5-50 characters)
    let customerName = profile.full_name || 'User'
    if (customerName.length < 5) {
      customerName = customerName.padEnd(5, ' ')
    } else if (customerName.length > 50) {
      customerName = customerName.substring(0, 50)
    }

    // Create Razorpay customer
    const razorpayAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`)
    const requestBody = {
      name: customerName,
      email: profile.email_address || user.email || `user-${user.id}@temp.meetdiya.com`,
      contact: phoneNumber,
      fail_existing: "0",
      notes: {
        user_id: user.id,
        created_via: 'Diya AI Platform',
        created_at: new Date().toISOString()
      }
    }

    console.log('Razorpay API request:', {
      ...requestBody,
      contact: phoneNumber.substring(0, 5) + '***' // Log partial phone for privacy
    })

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${razorpayAuth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!razorpayResponse.ok) {
      const errorData = await razorpayResponse.json()
      console.error('Razorpay API error:', errorData)
      throw new Error(`Razorpay API error: ${JSON.stringify(errorData)}`)
    }

    const razorpayData = await razorpayResponse.json()
    console.log(`Razorpay customer created successfully: ${razorpayData.id}`)

    // Store customer_id in database
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        razorpay_customer_id: razorpayData.id,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to store customer_id in database:', updateError)
      // Don't fail the request, but log the error
      // Customer is created in Razorpay, we can retry storing it later
    }

    return new Response(
      JSON.stringify({ 
        customer_id: razorpayData.id,
        message: 'Customer created successfully',
        existing: false
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating Razorpay customer:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

