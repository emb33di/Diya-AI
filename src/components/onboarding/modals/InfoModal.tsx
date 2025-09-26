import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info, X } from 'lucide-react';

export interface InfoModalProps {
  open: boolean;
  onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl relative" style={{ backgroundColor: '#F4EDE2' }}>
        {/* Close button */}
        <Button variant="ghost" size="sm" className="absolute top-2 right-2 h-8 w-8 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
            <Info className="w-8 h-8 text-blue-500" />
          </div>
          <CardTitle className="text-2xl">When to Skip Onboarding</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="space-y-4 text-left">
            <p className="text-muted-foreground">Skip onboarding if you already have your school list and deadlines finalized, and simply want to work on your essays and finalize your application with Diya.</p>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-semibold">
                <strong>Recommended for students close to deadlines!</strong>
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-medium">You should skip onboarding if:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>You have already researched and selected your target schools</li>
                <li>You know your application deadlines and requirements</li>
                <li>You want to focus on essay writing and application refinement</li>
                <li>You're in the final stages of your college application process</li>
              </ul>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-medium">You should complete onboarding if:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>You're still exploring different colleges and programs</li>
                <li>You need help identifying schools that match your profile</li>
                <li>You want personalized school recommendations based on your preferences</li>
                <li>You're early in the college application process</li>
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <Button onClick={onClose} className="w-full">
              Got it
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InfoModal;
