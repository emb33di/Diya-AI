import React, { useState } from 'react';
import { usePaywall } from '@/hooks/usePaywall';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Crown, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createCheckoutSession } from '@/services/stripePaymentService';

interface PaywallGuardProps {
  children: React.ReactNode;
  featureKey: string;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

const PaywallGuard: React.FC<PaywallGuardProps> = ({
  children,
  featureKey,
  fallback,
  showUpgradePrompt = true,
}) => {
  const { hasAccess, getFeatureInfo, getUpgradeMessage, isPro, loading } = usePaywall();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const navigate = useNavigate();

  // Show loading state while checking access
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user has access, show the protected content
  if (hasAccess(featureKey)) {
    return <>{children}</>;
  }

  // If custom fallback is provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default paywall UI
  const feature = getFeatureInfo(featureKey);
  const upgradeMessage = getUpgradeMessage(featureKey);

  const handleUpgrade = async () => {
    await createCheckoutSession();
  };

  return (
    <>
      <div className="relative">
        {/* Blurred content */}
        <div className="filter blur-sm pointer-events-none opacity-50">
          {children}
        </div>
        
        {/* Paywall overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-md mx-4 border-primary/20 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Pro Feature</CardTitle>
              <CardDescription>
                {feature?.description || upgradeMessage}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Upgrade to Pro to unlock this feature and many more
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleUpgrade}
                    className="flex-1"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Upgrade to Pro
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowUpgradeModal(false)}
                    className="flex-1"
                  >
                    Maybe Later
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default PaywallGuard;
