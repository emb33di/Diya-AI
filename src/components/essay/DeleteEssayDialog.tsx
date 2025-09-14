import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteEssayDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  essayTitle: string;
  isDeleting?: boolean;
}

export const DeleteEssayDialog: React.FC<DeleteEssayDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  essayTitle,
  isDeleting = false
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Essay
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>"{essayTitle}"</strong>? This action cannot be undone.
            <br /><br />
            This will permanently remove the essay and all its content, including any AI feedback and comments.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Essay
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
