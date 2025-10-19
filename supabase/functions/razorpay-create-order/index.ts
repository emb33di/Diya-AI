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

    console.log(`Creating Razorpay order for user: ${user.id}`)

    // Get request body
    const requestBody = await req.json()
    const { amount, currency = 'INR' } = requestBody

    // Validate amount
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount. Amount must be greater than 0.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Convert amount to paise (Razorpay expects amount in smallest currency unit)
    const amountInPaise = Math.round(amount * 100)

    // Get user profile to check for existing customer
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('razorpay_customer_id, razorpay_order_id')
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      console.error('Failed to fetch user profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile', details: profileError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if customer exists
    if (!profile.razorpay_customer_id) {
      return new Response(
        JSON.stringify({ error: 'Customer not found. Please create customer first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Creating order for customer: ${profile.razorpay_customer_id}, amount: ${amountInPaise} paise`)

    // Create Razorpay order
    const razorpayAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`)
    
    // Prepare customer details with validation
    const customerName = (profile.full_name || 'User').trim()
    const customerEmail = profile.email_address || user.email || `user-${user.id}@temp.meetdiya.com`
    const customerContact = `${profile.country_code || '+91'}${profile.phone_number || '9000090000'}`
    
    // Validate customer name (Razorpay requires 5-50 characters, English letters only)
    let validatedName = customerName
    if (validatedName.length < 5) {
      validatedName = validatedName.padEnd(5, ' ')
    } else if (validatedName.length > 50) {
      validatedName = validatedName.substring(0, 50)
    }
    
    // Generate short receipt (max 40 characters)
    const timestamp = Date.now().toString().slice(-8) // Last 8 digits
    const userIdShort = user.id.slice(-8) // Last 8 characters of user ID
    const receipt = `ord_${userIdShort}_${timestamp}` // Format: ord_12345678_87654321 (max 25 chars)
    
    const orderRequestBody = {
      amount: amountInPaise,
      currency: currency,
      receipt: receipt,
      customer_id: profile.razorpay_customer_id,
      customer_details: {
        name: validatedName,
        email: customerEmail,
        contact: customerContact
      },
      notes: {
        user_id: user.id,
        created_via: 'Diya AI Platform',
        created_at: new Date().toISOString(),
        product: 'Pro Subscription',
        amount_rupees: amount.toString()
      }
    }

    console.log('Razorpay order request:', {
      ...orderRequestBody,
      customer_id: profile.razorpay_customer_id.substring(0, 10) + '***' // Log partial customer ID for privacy
    })

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${razorpayAuth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderRequestBody)
    })

    if (!razorpayResponse.ok) {
      const errorData = await razorpayResponse.json()
      console.error('Razorpay API error:', errorData)
      throw new Error(`Razorpay API error: ${JSON.stringify(errorData)}`)
    }

    const razorpayData = await razorpayResponse.json()
    console.log(`Razorpay order created successfully: ${razorpayData.id}`)

    // Store order_id in database
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        razorpay_order_id: razorpayData.id,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to store order_id in database:', updateError)
      // Don't fail the request, but log the error
      // Order is created in Razorpay, we can retry storing it later
    }

    return new Response(
      JSON.stringify({ 
        order_id: razorpayData.id,
        amount: amountInPaise,
        currency: currency,
        customer_id: profile.razorpay_customer_id,
        message: 'Order created successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error creating Razorpay order:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

