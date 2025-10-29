import React, { useState } from 'react';
import { usePaywall } from '@/hooks/usePaywall';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Sparkles, Check, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GradientBackground from '@/components/GradientBackground';
import AuthenticationGuard from '@/components/AuthenticationGuard';

const Subscription = () => {
  const { userTier, isPro, isFree, getProFeatures, getFreeFeatures } = usePaywall();
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleUpgrade = () => {
    // Navigate to Stripe payment link
    window.location.href = 'https://buy.stripe.com/test_00w28r60e5mL8EJ10wgMw02';
  };

  const freeFeatures = getFreeFeatures();
  const proFeatures = getProFeatures();

  if (loading) {
    return (
      <GradientBackground>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Subscription</h1>
          <p className="text-muted-foreground">
            Manage your subscription and unlock premium features
          </p>
        </div>

        {/* Current Subscription Status */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Current Plan
                  <Badge 
                    variant={isPro ? "default" : "secondary"}
                    className={isPro ? "bg-primary" : ""}
                  >
                    {userTier}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {isPro 
                    ? "You have access to all premium features"
                    : "Upgrade to Pro to unlock premium features"
                  }
                </CardDescription>
              </div>
              {isPro && (
                <div className="flex items-center gap-2 text-primary">
                  <Crown className="h-5 w-5" />
                  <span className="font-medium">Pro Member</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isFree && (
              <div className="flex gap-4 items-center">
                <Button 
                  onClick={handleUpgrade}
                  className="flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Upgrade to Pro
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <p className="text-sm text-muted-foreground">
                  Unlock unlimited access to all features
                </p>
              </div>
            )}
            {isPro && (
              <div className="text-sm text-muted-foreground">
                <p>Thank you for being a Pro member! You have access to all premium features.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feature Comparison */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Features */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                Free Features
              </CardTitle>
              <CardDescription>
                Available with your current plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {freeFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">{feature.name}</p>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Pro Features */}
          <Card className={isFree ? "border-primary/20" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                Pro Features
                {isFree && (
                  <Badge variant="outline" className="text-primary border-primary">
                    Upgrade Required
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {isPro ? "Unlocked with your Pro subscription" : "Unlock with Pro subscription"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {proFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                      isPro ? "text-primary" : "text-muted-foreground"
                    }`} />
                    <div>
                      <p className={`font-medium text-sm ${
                        isPro ? "" : "text-muted-foreground"
                      }`}>
                        {feature.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {isFree && (
                <div className="mt-6 pt-4 border-t">
                  <Button 
                    onClick={handleUpgrade}
                    className="w-full flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Upgrade to Pro
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <Card className="mt-8">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Need Help?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Have questions about your subscription or need assistance with billing?
              </p>
              <div className="flex justify-center">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('mailto:info@meetdiya.com?subject=Subscription Support', '_blank')}
                >
                  Contact Support
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </GradientBackground>
  );
};

export default Subscription;
