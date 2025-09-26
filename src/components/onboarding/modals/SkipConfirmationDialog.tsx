import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

export interface SkipConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

const SkipConfirmationDialog: React.FC<SkipConfirmationDialogProps> = ({ open, onOpenChange, onConfirm, onCancel }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-orange-500" />
            Skip Onboarding?
          </DialogTitle>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Are you sure you want to skip the onboarding conversation? This will mark onboarding as complete and redirect you to your school list.
            </p>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-orange-800">Please note:</p>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• You will need to build your own school list manually</li>
                <li>• Diya won't have knowledge about your profile, so application reviews may have limited insights</li>
              </ul>
            </div>
          </div>
        </DialogHeader>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Skip Onboarding
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SkipConfirmationDialog;
