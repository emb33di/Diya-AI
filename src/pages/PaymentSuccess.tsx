import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, Mail, Shield, Sparkles as StarIcon, Loader2 } from 'lucide-react';
import GradientBackground from '@/components/GradientBackground';
import AuthenticationGuard from '@/components/AuthenticationGuard';
import { verifyAndActivateStripePayment } from '@/services/stripePaymentService';
import { GuestEssayMigrationService } from '@/services/guestEssayMigrationService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'success' | 'error' | 'pending'>('pending');
  const [verificationMessage, setVerificationMessage] = useState('');
  const { toast } = useToast();

  const sessionId = searchParams.get('session_id');

  // Verify payment and activate Pro tier on mount
  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        console.log('No session ID in URL, skipping verification');
        setIsVerifying(false);
        setVerificationStatus('success'); // Still show success page even without session_id
        return;
      }

      try {
        console.log('Verifying payment with session:', sessionId);
        const result = await verifyAndActivateStripePayment(sessionId);
        
        if (result.success) {
          setVerificationStatus('success');
          setVerificationMessage(result.message);
          
          // Migrate all guest essays for this user after payment succeeds
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              console.log('Migrating guest essays for user:', user.id);
              const migrationResult = await GuestEssayMigrationService.migrateAllGuestEssaysForUser(user.id);
              if (migrationResult.migratedCount > 0) {
                console.log(`✅ Migrated ${migrationResult.migratedCount} guest essay(s)`);
                // Clear localStorage after successful migration
                localStorage.removeItem('pending_guest_essay_id');
                toast({
                  title: "Essays Migrated",
                  description: `Successfully migrated ${migrationResult.migratedCount} preview essay(s) to your account.`,
                });
              }
              if (migrationResult.errors.length > 0) {
                console.warn('Some essays failed to migrate:', migrationResult.errors);
              }
            }
          } catch (migrationError) {
            console.error('Error migrating guest essays:', migrationError);
            // Don't fail payment verification if migration fails
          }
          
          toast({
            title: "Payment Verified",
            description: "Your Pro subscription is now active!",
          });
        } else {
          setVerificationStatus('error');
          setVerificationMessage(result.message);
          toast({
            title: "Verification Error",
            description: result.message,
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        setVerificationStatus('error');
        setVerificationMessage('Failed to verify payment. The webhook will process your payment shortly. If you continue to see this message, please contact support.');
        toast({
          title: "Verification Error",
          description: "Payment verification failed. Your payment will be processed via webhook. Please refresh in a few moments or contact support if the issue persists.",
          variant: "destructive"
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, toast]);

  // Removed auto-redirect - user must manually click to go to dashboard

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  // Show loading state while verifying
  if (isVerifying) {
    return (
      <AuthenticationGuard>
        <GradientBackground>
          <div className="container mx-auto px-4 py-12 max-w-4xl">
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <h2 className="text-xl font-semibold">Verifying your payment...</h2>
              <p className="text-muted-foreground mt-2">Please wait while we activate your Pro subscription</p>
            </div>
          </div>
        </GradientBackground>
      </AuthenticationGuard>
    );
  }

  return (
    <AuthenticationGuard>
      <GradientBackground>
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
            {/* Success Icon */}
            <div className="mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                <div className="relative bg-gradient-to-br from-primary to-primary/80 rounded-full p-6">
                  <CheckCircle2 className="h-16 w-16 text-primary-foreground" />
                </div>
              </div>
            </div>

            {/* Success Message */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-display font-bold mb-4">
                Payment Successful!
              </h1>
              <p className="text-xl text-muted-foreground mb-2">
                Thank you for your purchase
              </p>
              <p className="text-muted-foreground">
                Your Pro subscription is now active
              </p>
            </div>

            {/* Features Card */}
            <Card className="w-full max-w-2xl mb-6 shadow-lg">
              <CardHeader className="text-center pb-3">
                <div className="flex items-center justify-center mb-2">
                  <StarIcon className="h-6 w-6 text-primary mr-2" />
                  <CardTitle className="text-2xl">Welcome to Pro!</CardTitle>
                </div>
                <CardDescription className="text-base">
                  You now have access to all premium features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start space-x-3 p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-sm">Unlimited Essay Feedback</p>
                        <p className="text-xs text-muted-foreground">
                          Get AI-powered feedback on all your essays
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-sm">Resume Downloads</p>
                        <p className="text-xs text-muted-foreground">
                          Download professionally formatted resumes
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-sm">Template Library</p>
                        <p className="text-xs text-muted-foreground">
                          Access successful essays and LORs
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-sm">Webinars & Videos</p>
                        <p className="text-xs text-muted-foreground">
                          Exclusive guidance and tutorials
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="w-full max-w-2xl space-y-4 mb-6">
              <Button 
                onClick={handleGoToDashboard}
                className="w-full h-12 text-lg"
                size="lg"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              <Button 
                onClick={() => navigate('/essays')}
                variant="outline"
                className="w-full h-12 text-base"
              >
                Start Your First Essay
              </Button>
            </div>

            {/* Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mb-6">
              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3">
                    <Mail className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm mb-1">Receipt Sent</p>
                      <p className="text-xs text-muted-foreground">
                        A confirmation email has been sent to your account
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3">
                    <Shield className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm mb-1">Secure Payment</p>
                      <p className="text-xs text-muted-foreground">
                        Your payment information is encrypted and secure
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Support */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Have questions or need help? We're here for you
              </p>
              <Button 
                variant="link" 
                className="text-primary"
                onClick={() => window.open('mailto:info@meetdiya.com?subject=Payment Question', '_blank')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </div>

            {/* No auto-redirect - user must manually navigate */}
          </div>
        </div>
      </GradientBackground>
    </AuthenticationGuard>
  );
};

export default PaymentSuccess;

