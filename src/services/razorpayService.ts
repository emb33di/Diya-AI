import { supabase } from '@/integrations/supabase/client';

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
   * This will be implemented in Step 1.2
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

