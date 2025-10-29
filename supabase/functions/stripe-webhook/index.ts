import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * Verify Stripe webhook signature
 * Uses HMAC SHA256 to verify the webhook came from Stripe
 */
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Parse the signature header (format: t=timestamp,v1=signature)
    const elements = signature.split(',');
    const timestampMatch = elements.find(el => el.startsWith('t='));
    const signatureMatch = elements.find(el => el.startsWith('v1='));
    
    if (!timestampMatch || !signatureMatch) {
      console.error('Invalid signature format');
      return false;
    }

    const timestamp = parseInt(timestampMatch.split('=')[1]);
    const receivedSignature = signatureMatch.split('=')[1];

    // Validate timestamp to prevent replay attacks
    // Stripe recommends rejecting timestamps older than 5 minutes
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDifference = Math.abs(currentTime - timestamp);
    
    if (timeDifference > 300) { // 300 seconds = 5 minutes
      console.error(`Webhook timestamp too old: ${timeDifference}s difference. Possible replay attack.`);
      return false;
    }

    // Create the signed payload
    const signedPayload = `${timestamp}.${payload}`;

    // Import the secret key
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Generate signature
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(signedPayload)
    );

    // Convert to hex
    const generatedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time comparison
    if (generatedSignature.length !== receivedSignature.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < generatedSignature.length; i++) {
      result |= generatedSignature.charCodeAt(i) ^ receivedSignature.charCodeAt(i);
    }

    return result === 0;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

/**
 * Find user by email address
 * Checks user_profiles table which should have email_address populated
 */
async function findUserByEmail(
  supabase: ReturnType<typeof createClient>,
  email: string
): Promise<string | null> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Find user in user_profiles by email_address
    // The handle_new_user trigger should populate email_address when user signs up
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, email_address')
      .ilike('email_address', normalizedEmail) // Case-insensitive search
      .maybeSingle();

    if (profileError) {
      console.error('Error querying user_profiles:', profileError);
      return null;
    }

    if (profile?.user_id) {
      console.log(`✅ Found user ${profile.user_id} for email ${normalizedEmail}`);
      return profile.user_id;
    }

    console.warn(`⚠️ No user found in user_profiles with email: ${normalizedEmail}`);
    return null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
}

/**
 * Upgrade user to Pro tier
 */
async function upgradeUserToPro(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  sessionId: string,
  customerEmail: string | null
): Promise<{ success: boolean; message: string }> {
  try {
    // Check if user already has Pro tier (idempotency)
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('user_tier, stripe_checkout_session_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingProfile?.user_tier === 'Pro') {
      console.log(`User ${userId} already has Pro tier, skipping upgrade`);
      
      // Still update session_id if not set
      if (!existingProfile.stripe_checkout_session_id && sessionId) {
        await supabase
          .from('user_profiles')
          .update({ 
            stripe_checkout_session_id: sessionId,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
      }
      
      return { 
        success: true, 
        message: 'User already has Pro tier' 
      };
    }

    // Update user tier to Pro
    const updateData: any = {
      user_tier: 'Pro',
      updated_at: new Date().toISOString()
    };

    if (sessionId) {
      updateData.stripe_checkout_session_id = sessionId;
    }
    if (customerEmail) {
      updateData.stripe_customer_email = customerEmail.toLowerCase();
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to update user tier:', error);
      return {
        success: false,
        message: `Failed to upgrade user: ${error.message}`
      };
    }

    console.log(`✅ User ${userId} upgraded to Pro tier via webhook`);
    return {
      success: true,
      message: 'User upgraded to Pro tier successfully'
    };
  } catch (error) {
    console.error('Error upgrading user to Pro:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get webhook signing secret from environment
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get signature from headers
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('No Stripe signature found in headers');
      return new Response(
        JSON.stringify({ error: 'No signature provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Read raw body for signature verification
    const rawBody = await req.text();
    
    // Verify webhook signature
    const isValid = await verifyStripeSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.error('❌ Invalid webhook signature - possible security issue');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Webhook signature verified');

    // Parse the event
    const event = JSON.parse(rawBody);
    console.log(`📦 Received Stripe webhook event: ${event.type}`);

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false
        }
      }
    );

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        console.log('Processing checkout.session.completed:', {
          session_id: session.id,
          payment_status: session.payment_status,
          customer_email: session.customer_email || session.customer_details?.email
        });

        // Only process if payment was successful
        if (session.payment_status !== 'paid') {
          console.log(`Payment not completed, status: ${session.payment_status}`);
          return new Response(
            JSON.stringify({ 
              received: true,
              message: `Payment status is ${session.payment_status}, skipping upgrade`
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get customer email from session
        const customerEmail = session.customer_email || session.customer_details?.email || null;
        
        if (!customerEmail) {
          console.error('No customer email found in session');
          return new Response(
            JSON.stringify({ 
              received: true,
              error: 'No customer email found in checkout session'
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Find user by email
        const userId = await findUserByEmail(supabase, customerEmail);
        
        if (!userId) {
          console.warn(`⚠️ No user found with email: ${customerEmail}`);
          console.warn('Payment completed but user not found - may need manual activation');
          return new Response(
            JSON.stringify({ 
              received: true,
              warning: `No user found with email ${customerEmail}. Manual activation may be required.`,
              session_id: session.id
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Upgrade user to Pro
        const upgradeResult = await upgradeUserToPro(
          supabase,
          userId,
          session.id,
          customerEmail
        );

        if (upgradeResult.success) {
          console.log(`✅ Successfully processed payment for user ${userId}`);
          return new Response(
            JSON.stringify({
              received: true,
              processed: true,
              message: upgradeResult.message,
              user_id: userId,
              session_id: session.id
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.error(`❌ Failed to upgrade user: ${upgradeResult.message}`);
          return new Response(
            JSON.stringify({
              received: true,
              processed: false,
              error: upgradeResult.message,
              session_id: session.id
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'payment_intent.succeeded': {
        // Handle successful payment intent
        const paymentIntent = event.data.object;
        console.log('Payment intent succeeded:', paymentIntent.id);
        
        // You can add additional logic here if needed
        return new Response(
          JSON.stringify({ received: true, message: 'Payment intent processed' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
        return new Response(
          JSON.stringify({ 
            received: true, 
            message: `Event type ${event.type} not handled` 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

