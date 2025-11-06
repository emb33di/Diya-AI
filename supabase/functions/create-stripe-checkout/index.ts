import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating Stripe checkout session for user: ${user.id}`);

    // Get user profile to retrieve email
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('email_address')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use email from profile, fallback to user email
    const customerEmail = profile.email_address || user.email;
    if (!customerEmail) {
      return new Response(
        JSON.stringify({ error: 'No email found for user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body (optional parameters)
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      requestBody = {};
    }

    // Get Stripe secret key from environment
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error('STRIPE_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine price ID based on promo code usage or request body
    let priceId: string | undefined;
    
    // Handle both boolean true and string "true" for use_promo_price
    const usePromoPrice = requestBody?.use_promo_price === true || requestBody?.use_promo_price === 'true';
    
    console.log('[Edge Function] Received request:', {
      use_promo_price: requestBody?.use_promo_price,
      use_promo_price_type: typeof requestBody?.use_promo_price,
      usePromoPrice: usePromoPrice,
      has_price_id: !!requestBody?.price_id,
      price_id: requestBody?.price_id
    });
    
    // If use_promo_price is true, use the early access price ID
    if (usePromoPrice) {
      priceId = Deno.env.get('STRIPE_EA_PRICE_ID');
      if (!priceId) {
        console.error('STRIPE_EA_PRICE_ID not configured for promo pricing');
        return new Response(
          JSON.stringify({ 
            error: 'Promo price ID not configured',
            details: 'Please set STRIPE_EA_PRICE_ID in Supabase secrets for promo pricing'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('[Edge Function] Using promo price ID:', priceId);
    } else {
      // Use regular price ID from request body or environment variable
      priceId = requestBody?.price_id || Deno.env.get('STRIPE_PRICE_ID');
      console.log('[Edge Function] Using regular price ID:', priceId);
    }
    
    if (!priceId) {
      console.error('Missing price_id: not in request body and STRIPE_PRICE_ID not set in environment');
      return new Response(
        JSON.stringify({ 
          error: 'Price ID not provided and STRIPE_PRICE_ID not configured',
          details: 'Please set STRIPE_PRICE_ID in Supabase secrets or pass price_id in request body'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get origin from request to construct absolute URLs
    const url = new URL(req.url);
    const origin = requestBody.origin || url.origin || 'https://diya-ai.com';
    
    // Construct success and cancel URLs
    const successUrl = requestBody.success_url || `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
    // Default to subscription page (logged-in users manage subscription there)
    const cancelUrl = requestBody.cancel_url || `${origin}/subscription`;

    console.log(`Creating checkout session with:
      - Price ID: ${priceId}
      - Customer Email: ${customerEmail}
      - Success URL: ${successUrl}
      - Cancel URL: ${cancelUrl}`);

    // Build metadata with promo code tracking if applicable
    const metadata: Record<string, string> = {
      user_id: user.id,
      email: customerEmail,
    };
    
    if (usePromoPrice) {
      metadata.promo_code = 'early-access';
      metadata.is_promo = 'true';
    }

    // Create Stripe checkout session
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'payment',
        'success_url': successUrl,
        'cancel_url': cancelUrl,
        'customer_email': customerEmail,
        'client_reference_id': user.id,
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        ...Object.entries(metadata).reduce((acc, [key, value]) => {
          acc[`metadata[${key}]`] = value;
          return acc;
        }, {} as Record<string, string>),
      }),
    });

    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text();
      console.error('Stripe API error:', stripeResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create checkout session',
          details: `Stripe returned ${stripeResponse.status}: ${errorText}`,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const session = await stripeResponse.json();
    console.log('Checkout session created:', session.id);

    // Return the session URL
    return new Response(
      JSON.stringify({ 
        success: true,
        url: session.url,
        session_id: session.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

