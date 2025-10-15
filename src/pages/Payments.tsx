import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GradientBackground from '@/components/GradientBackground';
import AuthenticationGuard from '@/components/AuthenticationGuard';
import { RazorpayService } from '@/services/razorpayService';
import { useToast } from '@/hooks/use-toast';

const Payments = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<{
    hasCustomerId: boolean;
    customerId: string | null;
  } | null>(null);

  // Check payment status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await RazorpayService.getPaymentStatus();
        setPaymentStatus({
          hasCustomerId: status.hasCustomerId,
          customerId: status.customerId
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
      setPaymentStatus({
        hasCustomerId: true,
        customerId: customer_id
      });

      // Step 1.2: Create order (will be implemented next)
      toast({
        title: "Ready for Payment",
        description: "Payment integration is being set up...",
        variant: "default"
      });
      
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
              
              <Button 
                className="w-full" 
                size="lg"
                onClick={handlePaymentInitiation}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    {paymentStatus?.hasCustomerId ? 'Proceed to Payment' : 'Initialize Payment'}
                  </>
                )}
              </Button>
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
