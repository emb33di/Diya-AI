import React from 'react';
import { FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface EssayPrompt {
  id: string;
  prompt: string;
  prompt_number?: string;
  is_required?: boolean;
  word_limit?: string;
  has_draft?: boolean;
  draft_status?: 'not_started' | 'draft' | 'review' | 'final' | 'submitted';
  prompt_selection_type?: string;
  how_many?: string;
  title?: string; // For custom prompts, this will be the essay title
}

interface PromptDropdownProps {
  prompts: EssayPrompt[];
  selectedPromptId?: string;
  onPromptChange: (promptId: string) => void;
  className?: string;
  lastSaved?: Date;
  isAutoSaving?: boolean;
}

const PromptDropdown: React.FC<PromptDropdownProps> = ({
  prompts,
  selectedPromptId,
  onPromptChange,
  className = '',
  lastSaved,
  isAutoSaving
}) => {
  const selectedPrompt = prompts.find(p => p.id === selectedPromptId);
  
  if (!selectedPrompt) {
    return (
      <Card className={`p-8 text-center bg-muted/30 max-w-2xl mx-auto ${className}`}>
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Select a Prompt</h3>
        <p className="text-sm text-muted-foreground">
          Choose a prompt from the dropdown above to view the essay question
        </p>
      </Card>
    );
  }
  
  return (
    <div className={`${className}`}>
      <div className="prose prose-gray max-w-none">
        <p className="text-gray-700 leading-relaxed m-0 text-base" style={{ fontFamily: 'Arial, sans-serif', whiteSpace: 'pre-wrap' }}>
          {selectedPrompt.prompt}
        </p>
      </div>
      
      {/* Word limit reminder */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Word Limit: {selectedPrompt.word_limit || 'Not specified'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PromptDropdown;
