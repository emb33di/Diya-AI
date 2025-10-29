import { supabase } from '@/integrations/supabase/client';

interface VerifyPaymentResult {
  success: boolean;
  message: string;
  verified?: boolean;
  session?: any;
}

/**
 * Create a Stripe Checkout session via Supabase Edge Function and redirect
 * @param options Optional overrides like price_id, success_url, cancel_url
 */
export const createCheckoutSession = async (
  options?: {
    price_id?: string;
    success_url?: string;
    cancel_url?: string;
    origin?: string;
  }
): Promise<{ success: boolean; url?: string; message?: string }> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'Please log in to continue.' };
    }

    const origin = options?.origin || window.location.origin;

    const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
      body: {
        price_id: options?.price_id,
        success_url: options?.success_url,
        cancel_url: options?.cancel_url,
        origin,
      }
    });

    if (error) {
      console.error('Error creating checkout session:', error);
      return { success: false, message: error.message || 'Failed to create checkout session' };
    }

    if (!data?.url) {
      return { success: false, message: 'No checkout URL returned from server' };
    }

    // Redirect to Stripe Checkout
    window.location.href = data.url as string;
    return { success: true, url: data.url };
  } catch (err) {
    console.error('Checkout session error:', err);
    return { success: false, message: err instanceof Error ? err.message : 'Unexpected error' };
  }
};

/**
 * Verify a Stripe payment session and update user tier to Pro
 * @param sessionId - The Stripe checkout session ID from the URL
 */
export const verifyAndActivateStripePayment = async (
  sessionId: string
): Promise<VerifyPaymentResult> => {
  try {
    // First, verify with Stripe that the payment was successful
    // Then update the user's tier in the database
    
    console.log('Verifying payment for session:', sessionId);

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        message: 'No authenticated user found. Please log in.'
      };
    }

    console.log('Found user:', user.id);

    // Call the Supabase Edge Function to verify and activate
    const { data, error } = await supabase.functions.invoke('verify-stripe-payment', {
      body: {
        session_id: sessionId,
        user_id: user.id
      }
    });

    if (error) {
      console.error('Error calling verify function:', error);
      return {
        success: false,
        message: error.message || 'Failed to verify payment'
      };
    }

    if (data?.success) {
      // Reload the user profile to reflect the new tier
      // The useAuth hook will automatically refresh on the next render
      return {
        success: true,
        message: 'Payment verified successfully. Your Pro subscription is now active!',
        verified: true
      };
    }

    return {
      success: false,
      message: data?.message || 'Payment verification failed'
    };

  } catch (error) {
    console.error('Error verifying payment:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify payment'
    };
  }
};

/**
 * NOTE: Removed activateUserProTier() fallback function for security reasons.
 * 
 * The webhook system is reliable and will process payments automatically.
 * If client verification fails, the webhook will activate Pro tier within minutes.
 * This prevents unverified upgrades that bypass payment validation.
 */

