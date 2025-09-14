import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus } from 'lucide-react';

interface CreateEssayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEssayCreated: (essay: any) => void;
  selectedSchool?: string;
}

export const CreateEssayModal: React.FC<CreateEssayModalProps> = ({
  isOpen,
  onClose,
  onEssayCreated,
  selectedSchool
}) => {
  const [essayName, setEssayName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [wordLimit, setWordLimit] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!essayName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an essay name",
        variant: "destructive"
      });
      return;
    }

    if (!prompt.trim()) {
      toast({
        title: "Error", 
        description: "Please enter a prompt",
        variant: "destructive"
      });
      return;
    }

    if (!selectedSchool) {
      toast({
        title: "Error",
        description: "Please select a school first",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    
    try {
      // Create the essay with custom data
      const essayData = {
        title: essayName.trim(),
        school_name: selectedSchool,
        prompt_text: prompt.trim(),
        word_limit: wordLimit.trim() || 'No limit',
        initial_content: ''
      };

      // Call the parent's essay creation function
      await onEssayCreated(essayData);

      // Reset form
      setEssayName('');
      setPrompt('');
      setWordLimit('');
      
      toast({
        title: "Success",
        description: "Custom essay created successfully"
      });

      onClose();
    } catch (error) {
      console.error('Error creating custom essay:', error);
      toast({
        title: "Error",
        description: "Failed to create custom essay",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setEssayName('');
      setPrompt('');
      setWordLimit('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Custom Essay
          </DialogTitle>
          <DialogDescription>
            Create a new essay with your own prompt and specifications.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="essay-name">Essay Name *</Label>
            <Input
              id="essay-name"
              placeholder="e.g., Personal Statement, Why This School, etc."
              value={essayName}
              onChange={(e) => setEssayName(e.target.value)}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">Essay Prompt *</Label>
            <Textarea
              id="prompt"
              placeholder="Enter the essay prompt or question..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isCreating}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="word-limit">Word Limit (Optional)</Label>
            <Input
              id="word-limit"
              placeholder="e.g., 500, 650, No limit"
              value={wordLimit}
              onChange={(e) => setWordLimit(e.target.value)}
              disabled={isCreating}
            />
          </div>

          {selectedSchool && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>School:</strong> {selectedSchool}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Essay
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
