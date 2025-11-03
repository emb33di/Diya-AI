import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { session_id, user_id } = await req.json();

    if (!session_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: session_id and user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Stripe secret key from environment
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    if (!stripeSecretKey) {
      console.error('Stripe secret key not configured');
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify payment with Stripe
    console.log('Attempting to verify Stripe session:', session_id);
    
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${session_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Stripe API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to verify payment with Stripe',
          details: `Stripe returned ${response.status}: ${errorText}`,
          session_id: session_id.substring(0, 20) + '...'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const session = await response.json();
    console.log('Session verified:', JSON.stringify(session, null, 2));

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Payment not completed. Payment status: ' + session.payment_status 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false
        }
      }
    );

    // IDEMPOTENCY: if already Pro with this session, return success immediately
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('user_tier, stripe_checkout_session_id, escalation_slots')
      .eq('user_id', user_id)
      .maybeSingle();

    if (profile?.user_tier === 'Pro' && profile?.stripe_checkout_session_id === session_id) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Payment already processed',
          already_activated: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user tier to Pro, record session and audit fields
    const updateData: any = {
      user_tier: 'Pro',
      updated_at: new Date().toISOString(),
      stripe_checkout_session_id: session_id,
      upgraded_by: 'client-verification',
      upgraded_at: new Date().toISOString()
    };

    // Only set escalation_slots to 2 if it's currently NULL (new Pro user)
    // This preserves any admin manual adjustments
    if (profile?.escalation_slots === null || profile?.escalation_slots === undefined) {
      updateData.escalation_slots = 2;
    }

    const { error } = await supabaseClient
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', user_id);

    if (error) {
      console.error('Failed to update user tier:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Payment verified but failed to activate Pro tier: ' + error.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User tier updated to Pro for user: ${user_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payment verified and Pro tier activated',
        verified: true,
        payment_status: session.payment_status
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error verifying Stripe payment:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

