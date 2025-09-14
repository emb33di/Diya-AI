import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RefreshCw, FileText, Bot } from 'lucide-react';
import { EssayVersionService } from '@/services/essayVersionService';
import { useToast } from '@/components/ui/use-toast';

interface FreshDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  essayId: string;
  currentContent: string;
  essayTitle?: string;
  essayPrompt?: string;
  onFreshDraftCreated: (version: any) => void;
}

const FreshDraftModal: React.FC<FreshDraftModalProps> = ({
  isOpen,
  onClose,
  essayId,
  currentContent,
  essayTitle,
  essayPrompt,
  onFreshDraftCreated
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleCreateFreshDraft = async () => {
    try {
      setIsCreating(true);
      
      // Auto-create version without asking for name
      const freshDraft = await EssayVersionService.createFreshDraft({
        essayId,
        essayContent: currentContent,
        essayTitle,
        essayPrompt
        // No versionName - will be auto-generated
      });

      onFreshDraftCreated(freshDraft);
      
      toast({
        title: "New Version Created",
        description: "You can now continue editing without AI comments"
      });
      
      onClose();
    } catch (error) {
      console.error('Error creating new version:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create new version";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            <span>Create New Version</span>
          </DialogTitle>
          <DialogDescription>
            Create a new version of your essay without AI comments so you can continue editing freely.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning about older drafts becoming read-only */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
            <div className="flex items-center space-x-2 text-sm font-medium text-amber-800">
              <RefreshCw className="h-4 w-4" />
              <span>Important:</span>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              Older versions of this essay will become <strong>read-only</strong> and cannot be edited. 
              You can still view them and switch between versions, but only the new version will be editable.
            </p>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <div className="flex items-center space-x-2 text-sm font-medium">
              <FileText className="h-4 w-4" />
              <span>What happens next:</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li>• A new version will be created with your current essay content</li>
              <li>• All AI comments will be hidden from this version</li>
              <li>• You can continue editing without seeing previous feedback</li>
              <li>• Previous versions become read-only (view-only)</li>
              <li>• You can always switch back to view previous versions</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateFreshDraft}
              disabled={isCreating}
              className="flex items-center space-x-2"
            >
              {isCreating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  <span>Create New Version</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FreshDraftModal;
