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
  handler?: (response: RazorpayPaymentResponse) => void;
  onPaymentSuccess?: (response: RazorpayPaymentResponse) => void;
  onPaymentFailure?: (error: any) => void;
}

export interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
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
        image: '/DiyaLogo.svg', // Your logo
        order_id: orderId,
        customer_id: customerId,
        prefill: {
          name: profileData?.full_name || 'User',
          email: profileData?.email_address || user.email || '',
          contact: phoneNumber
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
        handler: (response: RazorpayPaymentResponse) => {
          console.log('Payment successful:', response);
          if (onSuccess) {
            onSuccess(response);
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
   * Verify payment signature after successful payment
   * This will be implemented in Step 1.6
   */
  static async verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string
  ): Promise<{ verified: boolean; message: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session. Please log in to continue.');
      }

      console.log('Verifying payment...');

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
   * Get user's payment status from database
   */
  static async getPaymentStatus(): Promise<{
    hasCustomerId: boolean;
    hasOrderId: boolean;
    hasPaymentId: boolean;
    paymentStatus: string | null;
    customerId: string | null;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user');
      }

      // Type assertion needed until Supabase types are regenerated after migration
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('razorpay_customer_id, razorpay_order_id, razorpay_payment_id, payment_status')
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
        customerId: profile?.razorpay_customer_id || null
      };
      
    } catch (error) {
      console.error('Error fetching payment status:', error);
      throw error;
    }
  }
}

