import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

export interface EndConfirmationModalProps {
  open: boolean;
  onKeepChatting: () => void;
  onEndAnyway: () => void;
}

const EndConfirmationModal: React.FC<EndConfirmationModalProps> = ({ open, onKeepChatting, onEndAnyway }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md relative" style={{ backgroundColor: '#F4EDE2' }}>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
            <Info className="w-8 h-8 text-orange-500" />
          </div>
          <CardTitle className="text-xl">Are you sure you want to end the call?</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-6">
            Diya cannot generate your school list and profile unless you complete the full onboarding conversation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
            <Button 
              size="lg" 
              variant="outline" 
              className="flex-1 sm:flex-initial" 
              onClick={onKeepChatting}
            >
              Keep Chatting
            </Button>
            <Button 
              size="lg" 
              className="flex-1 sm:flex-initial" 
              onClick={onEndAnyway}
            >
              End Anyway
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EndConfirmationModal;
