import { supabase } from '@/integrations/supabase/client';

interface VerifyPaymentResult {
  success: boolean;
  message: string;
  verified?: boolean;
  session?: any;
}

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
 * Simple function to update user tier to Pro (alternative approach)
 * This can be called directly from the frontend if verification is handled on client side
 */
export const activateUserProTier = async (): Promise<VerifyPaymentResult> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return {
        success: false,
        message: 'No authenticated user found. Please log in.'
      };
    }

    console.log('Activating Pro tier for user:', user.id);

    // Update user tier to Pro directly in the database
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ 
        user_tier: 'Pro',
        updated_at: new Date().toISOString()
      } as any)
      .eq('user_id' as any, user.id);

    if (updateError) {
      console.error('Failed to update user tier:', updateError);
      return {
        success: false,
        message: `Failed to activate Pro tier: ${updateError.message}`
      };
    }

    // Clear cached profile to force refresh
    localStorage.removeItem('user_profile');

    console.log('Pro tier activated successfully');
    return {
      success: true,
      message: 'Pro tier activated successfully!'
    };

  } catch (error) {
    console.error('Error activating Pro tier:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to activate Pro tier'
    };
  }
};

