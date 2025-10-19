import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import RazorpayButton from '@/components/RazorpayButton';
import { useNavigate } from 'react-router-dom';
import GradientBackground from '@/components/GradientBackground';
import AuthenticationGuard from '@/components/AuthenticationGuard';
import { RazorpayService, RazorpayPaymentResponse } from '@/services/razorpayService';
import { useToast } from '@/hooks/use-toast';

const Payments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<{
    hasCustomerId: boolean;
    customerId: string | null;
    hasOrderId: boolean;
    orderId: string | null;
    hasPaymentId: boolean;
    paymentStatus: string | null;
  } | null>(null);

  // Check payment status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await RazorpayService.getPaymentStatus();
        setPaymentStatus({
          hasCustomerId: status.hasCustomerId,
          customerId: status.customerId,
          hasOrderId: status.hasOrderId,
          orderId: status.customerId, // This will be updated when order is created
          hasPaymentId: status.hasPaymentId,
          paymentStatus: status.paymentStatus
        });
      } catch (error) {
        console.error('Error checking payment status:', error);
      }
    };
    checkStatus();
  }, []);

  const handlePaymentInitiation = async () => {
    try {
      setLoading(true);
      
      // Step 1.1: Create/Get Razorpay customer
      const { customer_id, existing } = await RazorpayService.createCustomer();
      
      console.log('Razorpay Customer ID:', customer_id);
      
      toast({
        title: existing ? "Customer Found" : "Customer Created",
        description: existing 
          ? "Your Razorpay account is ready"
          : "Successfully created your Razorpay account",
      });

      // Update status
      setPaymentStatus(prev => ({
        ...prev,
        hasCustomerId: true,
        customerId: customer_id
      }));

      // Step 1.2: Create order
      const orderData = await RazorpayService.createOrder(9999, 'INR');
      
      console.log('Razorpay Order ID:', orderData.order_id);
      
      toast({
        title: "Order Created",
        description: `Order ${orderData.order_id} created successfully`,
        variant: "default"
      });

      // Update status to show order creation
      setPaymentStatus(prev => ({
        ...prev,
        hasOrderId: true,
        orderId: orderData.order_id
      }));

      // Step 1.3: Open Razorpay checkout
      await RazorpayService.openCheckout(
        orderData.order_id,
        customer_id,
        9999, // Amount in rupees
        'INR',
        handlePaymentSuccess,
        handlePaymentFailure
      );
      
    } catch (error: any) {
      console.error('Payment initiation failed:', error);
      toast({
        title: "Payment Initiation Failed",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle successful payment
  const handlePaymentSuccess = async (response: RazorpayPaymentResponse) => {
    try {
      console.log('Payment successful:', response);
      
      toast({
        title: "Payment Successful! 🎉",
        description: "Your Pro subscription is now active",
        variant: "default"
      });

      // Update payment status
      setPaymentStatus(prev => ({
        ...prev,
        hasPaymentId: true,
        paymentStatus: 'completed'
      }));

      // TODO: In Step 1.5, we'll store payment details to database
      // TODO: In Step 1.6, we'll verify payment signature
      // TODO: In Step 1.7, we'll verify payment status and update user tier

      // For now, redirect to success page or dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Error handling payment success:', error);
      toast({
        title: "Payment Processing Error",
        description: "Payment was successful but there was an error processing it. Please contact support.",
        variant: "destructive"
      });
    }
  };

  // Handle payment failure
  const handlePaymentFailure = (error: any) => {
    console.error('Payment failed:', error);
    
    toast({
      title: "Payment Failed",
      description: error.description || "Payment could not be completed. Please try again.",
      variant: "destructive"
    });

    // Update payment status
    setPaymentStatus(prev => ({
      ...prev,
      paymentStatus: 'failed'
    }));
  };

  return (
    <GradientBackground>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold mb-2">Payment</h1>
          <p className="text-muted-foreground">
            Complete your Pro subscription upgrade
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Pro Subscription
            </CardTitle>
            <CardDescription>
              Upgrade to Pro and unlock all premium features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">What's Included:</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• All features in Free, plus:</li>
                <li>• Unlimited access to Diya essay feedback and scoring</li>
                <li>• Unlimited access to Diya resume formatting and downloads</li>
                <li>• Access to the entire library of successful LORs, resumes, and essays</li>
                <li>• Access to weekly webinars and college guidance videos</li>
              </ul>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium">Pro Subscription</span>
                <span className="text-2xl font-bold">₹9,999</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                One-time payment
              </p>
            </div>

            <div className="space-y-4">
              {paymentStatus?.hasCustomerId && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Razorpay account ready</span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                    Customer ID: {paymentStatus.customerId?.substring(0, 20)}...
                  </p>
                </div>
              )}
              
              {paymentStatus?.hasOrderId && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Order created</span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                    Order ID: {paymentStatus.orderId?.substring(0, 20)}...
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                    Amount: ₹9,999
                  </p>
                </div>
              )}

              {paymentStatus?.paymentStatus === 'completed' && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Payment Successful!</span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                    Your Pro subscription is now active
                  </p>
                </div>
              )}

              {paymentStatus?.paymentStatus === 'failed' && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Payment Failed</span>
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                    Please try again or contact support
                  </p>
                </div>
              )}
              
              <RazorpayButton 
                className="w-full" 
                onClick={handlePaymentInitiation}
                loading={loading}
                disabled={paymentStatus?.paymentStatus === 'completed'}
              >
                {paymentStatus?.paymentStatus === 'completed' 
                  ? 'Payment Complete' 
                  : paymentStatus?.paymentStatus === 'failed'
                  ? 'Retry Payment'
                  : paymentStatus?.hasCustomerId && paymentStatus?.hasOrderId
                  ? 'Pay with Razorpay'
                  : paymentStatus?.hasCustomerId 
                  ? 'Create Order & Pay'
                  : 'Initialize Payment'
                }
              </RazorpayButton>
              <p className="text-xs text-center text-muted-foreground">
                Secure payment processing • Your payment information is encrypted
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Questions about billing? <Button 
              variant="link" 
              className="p-0 h-auto"
              onClick={() => window.open('mailto:info@meetdiya.com?subject=Billing Support', '_blank')}
            >
              Contact Support
            </Button>
          </p>
        </div>
      </div>
    </GradientBackground>
  );
};

export default Payments;
