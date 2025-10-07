import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GradientBackground from '@/components/GradientBackground';
import AuthenticationGuard from '@/components/AuthenticationGuard';

const Payments = () => {
  const navigate = useNavigate();

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
              <Button className="w-full" size="lg">
                <CreditCard className="h-4 w-4 mr-2" />
                Complete Payment
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
