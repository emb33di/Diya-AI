import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export interface LoadingModalProps {
  open: boolean;
  messages: string[];
  step: number; // current step index (0-based)
}

const LoadingModal: React.FC<LoadingModalProps> = ({ open, messages, step }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md relative" style={{ backgroundColor: '#F4EDE2' }}>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <CardTitle className="text-xl">Processing Your Conversation</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="space-y-4">
            <div className="space-y-2">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${
                    step > index
                      ? 'bg-green-500/10 text-green-600 border border-green-200'
                      : step === index
                      ? 'bg-primary/10 text-primary border border-primary/200'
                      : 'bg-muted/30 text-muted-foreground'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      step > index
                        ? 'bg-green-500 text-white'
                        : step === index
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step > index ? (
                      // Check icon placeholder (use current styles)
                      <span className="inline-block w-3 h-3 rounded-full bg-white" />
                    ) : step === index ? (
                      <span className="inline-block w-3 h-3 rounded-full bg-white" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                    )}
                  </div>
                  <span className="text-sm font-medium">{message}</span>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Progress value={(step / messages.length) * 100} className="w-full" />
              <p className="text-xs text-muted-foreground mt-2">
                Step {step} of {messages.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoadingModal;
