import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

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

    console.log(`Storing payment details for user: ${user.id}`)

    // Get request body
    const requestBody = await req.json()
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      payment_amount,
      payment_currency = 'INR'
    } = requestBody

    // Validate required fields
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required payment fields',
          required: ['razorpay_payment_id', 'razorpay_order_id', 'razorpay_signature']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Storing payment: ${razorpay_payment_id} for order: ${razorpay_order_id}`)

    // Store payment details in database
    const { data: updateData, error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        razorpay_payment_id: razorpay_payment_id,
        payment_status: 'completed',
        payment_completed_at: new Date().toISOString(),
        payment_amount: payment_amount || 9999, // Default to Pro subscription amount
        payment_currency: payment_currency,
        razorpay_signature: razorpay_signature,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()

    if (updateError) {
      console.error('Failed to store payment details:', updateError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to store payment details', 
          details: updateError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Payment details stored successfully for user: ${user.id}`)

    // TODO: In Step 1.7, we'll also update user tier from 'Free' to 'Pro'
    // For now, we'll just store the payment details

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Payment details stored successfully',
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        stored_at: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error storing payment details:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
