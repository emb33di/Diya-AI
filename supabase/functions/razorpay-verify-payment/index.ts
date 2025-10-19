import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!

/**
 * Generate HMAC SHA256 signature for Razorpay payment verification
 * This implements Step 1.6 of Razorpay integration
 */
async function generateSignature(orderId: string, paymentId: string, secret: string): Promise<string> {
  const crypto = globalThis.crypto
  
  // Create the message to sign: order_id + "|" + razorpay_payment_id
  const message = `${orderId}|${paymentId}`
  
  // Create HMAC key from secret
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  // Generate signature
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message)
  )
  
  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Verify Razorpay payment signature
 * This is Step 1.6 of Razorpay integration
 */
async function verifyPaymentSignature(
  orderId: string, 
  paymentId: string, 
  receivedSignature: string, 
  secret: string
): Promise<boolean> {
  try {
    // Generate signature using our server-side secret
    const generatedSignature = await generateSignature(orderId, paymentId, secret)
    
    // Compare signatures using constant-time comparison to prevent timing attacks
    if (generatedSignature.length !== receivedSignature.length) {
      return false
    }
    
    let result = 0
    for (let i = 0; i < generatedSignature.length; i++) {
      result |= generatedSignature.charCodeAt(i) ^ receivedSignature.charCodeAt(i)
    }
    
    return result === 0
  } catch (error) {
    console.error('Error verifying payment signature:', error)
    return false
  }
}

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

    console.log(`Verifying payment signature for user: ${user.id}`)

    // Get request body
    const requestBody = await req.json()
    const { 
      order_id, 
      payment_id, 
      signature 
    } = requestBody

    // Validate required fields
    if (!order_id || !payment_id || !signature) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          required: ['order_id', 'payment_id', 'signature']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate secret is available
    if (!razorpayKeySecret) {
      console.error('RAZORPAY_KEY_SECRET environment variable not set')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Verifying signature for order: ${order_id}, payment: ${payment_id}`)

    // Verify the payment signature
    const isVerified = await verifyPaymentSignature(
      order_id,
      payment_id, 
      signature,
      razorpayKeySecret
    )

    if (!isVerified) {
      console.log(`Payment signature verification failed for order: ${order_id}`)
      return new Response(
        JSON.stringify({ 
          verified: false,
          message: 'Payment signature verification failed. Payment may not be authentic.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Payment signature verified successfully for order: ${order_id}`)

    // Optional: Update payment status in database to 'verified'
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        payment_status: 'verified',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('razorpay_order_id', order_id)

    if (updateError) {
      console.error('Failed to update payment status:', updateError)
      // Don't fail the request, signature verification succeeded
    }

    return new Response(
      JSON.stringify({ 
        verified: true,
        message: 'Payment signature verified successfully. Payment is authentic.',
        order_id: order_id,
        payment_id: payment_id,
        verified_at: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error verifying payment signature:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
