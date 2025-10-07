import React from 'react';
import { usePaywall } from '@/hooks/usePaywall';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Crown, Sparkles, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureKey?: string;
  title?: string;
  description?: string;
  checkoutPath?: string;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  featureKey,
  title = "Upgrade to Pro",
  description = "Unlock premium features and take your application to the next level",
  checkoutPath = "/pricing",
}) => {
  const { getFeatureInfo, getProFeatures, getFreeFeatures } = usePaywall();
  const navigate = useNavigate();

  const proFeatures = getProFeatures();
  const freeFeatures = getFreeFeatures();

  const handleUpgrade = () => {
    navigate(checkoutPath);
    onClose();
  };

  const feature = featureKey ? getFeatureInfo(featureKey) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center flex items-center justify-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {feature ? feature.description : description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Plan vs Pro Plan */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Free Plan */}
            <Card className="border-2">
              <CardHeader className="text-center">
                <CardTitle className="text-lg">Free</CardTitle>
                <CardDescription>Current Plan</CardDescription>
                <div className="text-2xl font-bold">₹0<span className="text-sm font-normal text-muted-foreground">/month</span></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {freeFeatures.slice(0, 4).map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature.name}</span>
                    </div>
                  ))}
                  {freeFeatures.length > 4 && (
                    <div className="text-xs text-muted-foreground">
                      +{freeFeatures.length - 4} more features
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="border-2 border-primary relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                  Recommended
                </div>
              </div>
              <CardHeader className="text-center">
                <CardTitle className="text-lg">Pro</CardTitle>
                <CardDescription>Everything in Free, plus:</CardDescription>
                <div className="text-2xl font-bold text-primary">₹2,999<span className="text-sm font-normal text-muted-foreground">/month</span></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {proFeatures.slice(0, 4).map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm">{feature.name}</span>
                    </div>
                  ))}
                  {proFeatures.length > 4 && (
                    <div className="text-xs text-muted-foreground">
                      +{proFeatures.length - 4} more features
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Call to Action */}
          <div className="text-center space-y-4">
            <div className="text-sm text-muted-foreground">
              Join thousands of students who have successfully improved their applications with Pro features
            </div>
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={handleUpgrade}
                size="lg"
                className="flex-1 max-w-xs"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Button>
              <Button 
                variant="outline" 
                onClick={onClose}
                size="lg"
                className="flex-1 max-w-xs"
              >
                <X className="h-4 w-4 mr-2" />
                Maybe Later
              </Button>
            </div>
          </div>

          {/* Additional Benefits */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-center">Why upgrade to Pro?</h4>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-primary">Unlimited Access</div>
                <div className="text-muted-foreground">No limits on AI feedback and downloads</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-primary">Premium Content</div>
                <div className="text-muted-foreground">Access to successful essays and resumes</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-primary">Expert Guidance</div>
                <div className="text-muted-foreground">Weekly webinars and college guidance</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
