import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

export interface RefreshWarningModalProps {
  open: boolean;
  onStartNewCall: () => void;
  onGoToDashboard: () => void;
  onClose: () => void;
}

const RefreshWarningModal: React.FC<RefreshWarningModalProps> = ({ open, onStartNewCall, onGoToDashboard, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md relative" style={{ backgroundColor: '#F4EDE2' }}>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
            <Info className="w-8 h-8 text-orange-500" />
          </div>
          <CardTitle className="text-xl">Call Not Completed</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-4">
            It looks like you refreshed the page during your onboarding call. Your conversation with Diya was not completed.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            <strong>Important:</strong> If you don't complete the call, Diya cannot generate a school list and profile for you. Please start a new conversation to complete your onboarding.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
            <Button size="lg" className="flex-1 sm:flex-initial" onClick={onStartNewCall}>
              Start New Call
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

export default RefreshWarningModal;
