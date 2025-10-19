import { supabase } from '@/integrations/supabase/client';

// Declare Razorpay types for TypeScript
declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayCustomerResponse {
  customer_id: string;
  message: string;
  existing: boolean;
}

export interface RazorpayOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  message: string;
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image?: string;
  order_id: string;
  customer_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  method?: {
    netbanking?: boolean;
    wallet?: boolean;
    emi?: boolean;
    upi?: boolean;
    card?: boolean;
  };
  config?: {
    display?: {
      blocks?: any;
      sequence?: string[];
      preferences?: any;
    };
  };
  handler?: (response: RazorpayPaymentResponse) => void;
  onPaymentSuccess?: (response: RazorpayPaymentResponse) => void;
  onPaymentFailure?: (error: any) => void;
}

export interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface StorePaymentResponse {
  success: boolean;
  message: string;
  payment_id: string;
  order_id: string;
  stored_at: string;
}

export class RazorpayService {
  /**
   * Create or retrieve Razorpay customer ID for the current user
   * This is Step 1.1 of Razorpay integration
   */
  static async createCustomer(): Promise<RazorpayCustomerResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session. Please log in to continue.');
      }

      console.log('Creating Razorpay customer...');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/razorpay-create-customer`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create customer');
      }

      const data: RazorpayCustomerResponse = await response.json();
      console.log('Razorpay customer created/retrieved:', data.customer_id);
      
      return data;
      
    } catch (error) {
      console.error('Error creating Razorpay customer:', error);
      throw error;
    }
  }

  /**
   * Create a Razorpay order for payment
   * This is Step 1.2 of Razorpay integration
   */
  static async createOrder(amount: number, currency: string = 'INR'): Promise<RazorpayOrderResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session. Please log in to continue.');
      }

      console.log('Creating Razorpay order...');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/razorpay-create-order`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ amount, currency })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const data: RazorpayOrderResponse = await response.json();
      console.log('Razorpay order created:', data.order_id);
      
      return data;
      
    } catch (error) {
      console.error('Error creating Razorpay order:', error);
      throw error;
    }
  }

  /**
   * Open Razorpay checkout modal for payment
   * This is Step 1.3 of Razorpay integration
   */
  static async openCheckout(
    orderId: string,
    customerId: string,
    amount: number,
    currency: string = 'INR',
    onSuccess?: (response: RazorpayPaymentResponse) => void,
    onFailure?: (error: any) => void
  ): Promise<void> {
    try {
      // Load Razorpay script if not already loaded
      await this.loadRazorpayScript();

      // Get user profile for prefill data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('full_name, email_address, phone_number, country_code')
        .eq('user_id', user.id as any)
        .single();

      if (profileError) {
        console.error('Failed to fetch user profile:', profileError);
        throw new Error('Failed to fetch user profile');
      }

      // Prepare phone number with type safety
      const profileData = profile as any; // Type assertion for Supabase response
      const cleanPhone = (profileData?.phone_number || '').replace(/\D/g, '');
      const phoneNumber = cleanPhone ? `${profileData?.country_code || '+91'}${cleanPhone}` : '+919000090000';

      const options: RazorpayCheckoutOptions = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_1234567890', // Fallback for development
        amount: amount * 100, // Convert to paise
        currency: currency,
        name: 'Diya AI',
        description: 'Pro Subscription - Unlimited Access',
        image: `${window.location.origin}/DiyaLogo.svg`, // Your logo with proper protocol
        order_id: orderId,
        customer_id: customerId,
        prefill: {
          name: profileData?.full_name || 'User',
          email: profileData?.email_address || user.email || '',
          contact: phoneNumber
        },
        method: {
          netbanking: true,
          wallet: true,
          emi: true,
          upi: true,
          card: true
        },
        notes: {
          user_id: user.id,
          product: 'Pro Subscription',
          platform: 'Diya AI Web'
        },
        theme: {
          color: '#6366f1' // Indigo color matching your theme
        },
        modal: {
          ondismiss: () => {
            console.log('Payment modal dismissed');
          }
        },
        config: {
          display: {
            blocks: {
              banks: {
                name: 'Pay using Banks',
                instruments: [
                  {
                    method: 'netbanking',
                    banks: ['HDFC', 'ICICI', 'SBI', 'AXIS', 'KOTAK']
                  }
                ]
              },
              wallets: {
                name: 'Pay using Wallets',
                instruments: [
                  {
                    method: 'wallet',
                    wallets: ['paytm', 'phonepe', 'gpay']
                  }
                ]
              },
              upi: {
                name: 'Pay using UPI',
                instruments: [
                  {
                    method: 'upi'
                  }
                ]
              },
              cards: {
                name: 'Pay using Cards',
                instruments: [
                  {
                    method: 'card',
                    issuers: ['HDFC', 'ICICI', 'SBI']
                  }
                ]
              }
            },
            sequence: ['block.banks', 'block.wallets', 'block.upi', 'block.cards'],
            preferences: {
              show_default_blocks: true
            }
          }
        },
        handler: async (response: RazorpayPaymentResponse) => {
          console.log('Payment successful:', response);
          
          try {
            // Complete payment flow with signature verification
            const result = await RazorpayService.completePayment(
              response.razorpay_payment_id,
              response.razorpay_order_id,
              response.razorpay_signature,
              amount,
              currency
            );

            if (result.success && result.verified) {
              console.log('Payment completed and verified successfully');
              if (onSuccess) {
                onSuccess(response);
              }
            } else {
              console.error('Payment verification failed:', result.message);
              if (onFailure) {
                onFailure(new Error(result.message));
              }
            }
          } catch (error) {
            console.error('Error in payment completion:', error);
            if (onFailure) {
              onFailure(error);
            }
          }
        }
      };

      // Create Razorpay instance and open checkout
      const razorpay = new window.Razorpay(options);
      
      razorpay.on('payment.failed', (error: any) => {
        console.error('Payment failed:', error);
        if (onFailure) {
          onFailure(error);
        }
      });
      
      // Add additional event listeners for debugging
      razorpay.on('payment.authorized', (response: any) => {
        console.log('Payment authorized:', response);
      });
      
      razorpay.on('payment.captured', (response: any) => {
        console.log('Payment captured:', response);
      });

      razorpay.open();

    } catch (error) {
      console.error('Error opening Razorpay checkout:', error);
      if (onFailure) {
        onFailure(error);
      }
    }
  }

  /**
   * Load Razorpay script dynamically
   */
  private static async loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (window.Razorpay) {
        resolve();
        return;
      }

      // Check if script is already in DOM
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', reject);
        return;
      }

      // Create and load script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Store payment details in database after successful payment
   * This is Step 1.5 of Razorpay integration
   */
  static async storePayment(
    razorpay_payment_id: string,
    razorpay_order_id: string,
    razorpay_signature: string,
    payment_amount: number = 9999,
    payment_currency: string = 'INR'
  ): Promise<StorePaymentResponse> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session. Please log in to continue.');
      }

      console.log('Storing payment details...');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/razorpay-store-payment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            payment_amount,
            payment_currency
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to store payment details');
      }

      const data: StorePaymentResponse = await response.json();
      console.log('Payment details stored successfully:', data);
      
      return data;
      
    } catch (error) {
      console.error('Error storing payment details:', error);
      throw error;
    }
  }

  /**
   * Verify payment signature after successful payment
   * This is Step 1.6 of Razorpay integration
   */
  static async verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string
  ): Promise<{ verified: boolean; message: string; order_id?: string; payment_id?: string; verified_at?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session. Please log in to continue.');
      }

      console.log('Verifying payment signature...');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/razorpay-verify-payment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            order_id: orderId, 
            payment_id: paymentId, 
            signature 
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify payment');
      }

      const data = await response.json();
      console.log('Payment verification result:', data);
      
      return data;
      
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  }

  /**
   * Update user tier to Pro after successful payment verification
   * This is Step 1.7 of Razorpay integration
   */
  static async updateUserTierToPro(): Promise<{ success: boolean; message: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session. Please log in to continue.');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      console.log('Updating user tier to Pro...');

      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          user_tier: 'Pro' as any,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id as any);

      if (error) {
        console.error('Failed to update user tier:', error);
        return {
          success: false,
          message: `Failed to update user tier: ${error.message}`
        };
      }

      console.log('User tier updated to Pro successfully');
      return {
        success: true,
        message: 'User tier updated to Pro successfully'
      };

    } catch (error) {
      console.error('Error updating user tier:', error);
      return {
        success: false,
        message: `Error updating user tier: ${error.message}`
      };
    }
  }

  /**
   * Complete payment flow with signature verification and Pro upgrade
   * This combines Steps 1.5, 1.6, and 1.7 of Razorpay integration
   */
  static async completePayment(
    razorpay_payment_id: string,
    razorpay_order_id: string,
    razorpay_signature: string,
    payment_amount: number = 9999,
    payment_currency: string = 'INR'
  ): Promise<{
    success: boolean;
    verified: boolean;
    message: string;
    payment_id: string;
    order_id: string;
    stored_at?: string;
    verified_at?: string;
    user_tier_updated?: boolean;
  }> {
    try {
      console.log('Starting complete payment flow...');

      // Step 1: Verify payment signature first (Step 1.6)
      console.log('Step 1: Verifying payment signature...');
      const verificationResult = await this.verifyPayment(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (!verificationResult.verified) {
        return {
          success: false,
          verified: false,
          message: verificationResult.message,
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id
        };
      }

      console.log('Payment signature verified successfully');

      // Step 2: Store payment details (Step 1.5)
      console.log('Step 2: Storing payment details...');
      const storeResult = await this.storePayment(
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        payment_amount,
        payment_currency
      );

      if (!storeResult.success) {
        return {
          success: false,
          verified: true,
          message: `Signature verified but failed to store payment: ${storeResult.message}`,
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id
        };
      }

      console.log('Payment details stored successfully');

      // Step 3: Update user tier to Pro (Step 1.7)
      console.log('Step 3: Updating user tier to Pro...');
      const tierUpdateResult = await this.updateUserTierToPro();

      if (!tierUpdateResult.success) {
        console.warn('Payment completed but failed to update user tier:', tierUpdateResult.message);
        // Don't fail the entire flow, but log the warning
      }

      console.log('Complete payment flow finished successfully');

      return {
        success: true,
        verified: true,
        message: 'Payment completed, verified, and Pro subscription activated',
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        stored_at: storeResult.stored_at,
        verified_at: verificationResult.verified_at,
        user_tier_updated: tierUpdateResult.success
      };

    } catch (error) {
      console.error('Error in complete payment flow:', error);
      throw error;
    }
  }

  /**
   * Manually upgrade user to Pro if they have a completed payment
   * This is a utility function to fix cases where payment was successful but tier wasn't updated
   */
  static async manualProUpgrade(): Promise<{ success: boolean; message: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session. Please log in to continue.');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('No authenticated user');
      }

      console.log('Checking if user has completed payment for manual Pro upgrade...');

      // Check if user has a completed payment
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('razorpay_payment_id, payment_status, user_tier')
        .eq('user_id', user.id as any)
        .single();

      if (profileError) {
        console.error('Failed to fetch user profile:', profileError);
        return {
          success: false,
          message: `Failed to fetch user profile: ${profileError.message}`
        };
      }

      // Type assertion for Supabase response
      const profileData = profile as any;

      if (!profileData?.razorpay_payment_id || profileData?.payment_status !== 'completed') {
        return {
          success: false,
          message: 'No completed payment found. Please complete a payment first.'
        };
      }

      if (profileData?.user_tier === 'Pro') {
        return {
          success: true,
          message: 'User is already Pro tier'
        };
      }

      // Update user tier to Pro
      const tierUpdateResult = await this.updateUserTierToPro();
      
      if (tierUpdateResult.success) {
        console.log('Manual Pro upgrade completed successfully');
        return {
          success: true,
          message: 'Successfully upgraded to Pro tier based on completed payment'
        };
      } else {
        return tierUpdateResult;
      }

    } catch (error) {
      console.error('Error in manual Pro upgrade:', error);
      return {
        success: false,
        message: `Error in manual Pro upgrade: ${error.message}`
      };
    }
  }

  /**
   * Get user's payment status from database
   */
  static async getPaymentStatus(): Promise<{
    hasCustomerId: boolean;
    hasOrderId: boolean;
    hasPaymentId: boolean;
    paymentStatus: string | null;
    customerId: string | null;
    paymentAmount: number | null;
    paymentCurrency: string | null;
    paymentCompletedAt: string | null;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user');
      }

      // Type assertion needed until Supabase types are regenerated after migration
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('razorpay_customer_id, razorpay_order_id, razorpay_payment_id, payment_status, payment_amount, payment_currency, payment_completed_at')
        .eq('user_id', user.id as any)
        .maybeSingle() as any;

      if (error) {
        console.error('Error fetching payment status:', error);
        throw error;
      }

      return {
        hasCustomerId: !!profile?.razorpay_customer_id,
        hasOrderId: !!profile?.razorpay_order_id,
        hasPaymentId: !!profile?.razorpay_payment_id,
        paymentStatus: profile?.payment_status || null,
        customerId: profile?.razorpay_customer_id || null,
        paymentAmount: profile?.payment_amount || null,
        paymentCurrency: profile?.payment_currency || null,
        paymentCompletedAt: profile?.payment_completed_at || null
      };
      
    } catch (error) {
      console.error('Error fetching payment status:', error);
      throw error;
    }
  }
}

