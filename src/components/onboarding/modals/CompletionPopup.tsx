import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, CheckCircle } from 'lucide-react';

export interface CompletionPopupProps {
  open: boolean;
  onClose: () => void;
  onContinueProfile: () => void;
  onGoToDashboard: () => void;
}

const CompletionPopup: React.FC<CompletionPopupProps> = ({ open, onClose, onContinueProfile, onGoToDashboard }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl relative" style={{ backgroundColor: '#F4EDE2' }}>
        {/* Close button */}
        <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-8 w-8 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-green-500/10">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <CardTitle className="text-2xl">
            Thanks for chatting with Diya!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-lg mb-4">
            Your conversation has been processed and your profile information has been extracted.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Once you confirm your profile details, you'll be able to see your personalized school recommendations and continue with your application journey.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
            <Button size="lg" className="flex-1 sm:flex-initial" onClick={onContinueProfile}>
              Continue to Profile
            </Button>
            <Button size="lg" variant="outline" className="flex-1 sm:flex-initial" onClick={onGoToDashboard}>
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompletionPopup;
