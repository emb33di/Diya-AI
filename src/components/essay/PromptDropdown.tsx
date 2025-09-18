import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, ChevronDown, CheckCircle, Clock } from 'lucide-react';

interface EssayPrompt {
  id: string;
  prompt: string;
  prompt_number?: string;
  is_required?: boolean;
  word_limit?: string;
  has_draft?: boolean;
  draft_status?: 'draft' | 'review' | 'final' | 'submitted';
}

interface PromptDropdownProps {
  prompts: EssayPrompt[];
  selectedPromptId?: string;
  onPromptChange: (promptId: string) => void;
  className?: string;
}

const PromptDropdown: React.FC<PromptDropdownProps> = ({
  prompts,
  selectedPromptId,
  onPromptChange,
  className = ''
}) => {
  const selectedPrompt = prompts.find(p => p.id === selectedPromptId);
  
  // Calculate required essay breakdown
  const requiredPrompts = prompts.filter(p => p.is_required);
  const requiredWithDrafts = requiredPrompts.filter(p => p.has_draft);
  const requiredBreakdown = `${requiredWithDrafts.length}/${requiredPrompts.length} required`;
  
  // Get status color for draft status
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'review': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'final': return 'bg-green-50 text-green-700 border-green-200';
      case 'submitted': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };
  
  return (
    <div className={`bg-white p-4 md:p-8 rounded-xl shadow-lg border border-gray-300 relative overflow-hidden group hover:shadow-xl transition-shadow duration-300 ${className}`}>
      {/* Subtle accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>
      
      <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="flex-shrink-0 self-center sm:self-start sm:mt-1">
          <div className="p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-100">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
        </div>
        
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-3">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
              <h3 className="text-base md:text-lg font-semibold text-gray-800">
                Essay Prompt
              </h3>
              
              {/* Required Essay Breakdown */}
              {requiredPrompts.length > 0 && (
                <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 self-start">
                  {requiredBreakdown}
                </Badge>
              )}
            </div>
            
            {/* Prompt Selection Dropdown */}
            <div className="flex items-center space-x-2">
              <Select value={selectedPromptId || ''} onValueChange={onPromptChange}>
                <SelectTrigger className="w-full sm:w-64 bg-white border-gray-300 shadow-sm">
                  <SelectValue placeholder="Select a prompt">
                    {selectedPrompt && (
                      <div className="flex items-center space-x-2">
                        <span className="truncate">
                          {selectedPrompt.prompt_number ? `Prompt ${selectedPrompt.prompt_number}` : 'Custom Prompt'}
                        </span>
                        {selectedPrompt.is_required && (
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                            Required
                          </Badge>
                        )}
                        {selectedPrompt.has_draft && (
                          <Badge variant="outline" className={`text-xs ${getStatusColor(selectedPrompt.draft_status)}`}>
                            {selectedPrompt.draft_status || 'Draft'}
                          </Badge>
                        )}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {prompts.map((prompt) => (
                    <SelectItem key={prompt.id} value={prompt.id}>
                      <div className="flex items-center space-x-2 w-full">
                        <span className="flex-1 truncate">
                          {prompt.prompt_number ? `Prompt ${prompt.prompt_number}` : 'Custom Prompt'}
                        </span>
                        <div className="flex items-center space-x-1 ml-2">
                          {prompt.is_required && (
                            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                              Required
                            </Badge>
                          )}
                          {prompt.has_draft && (
                            <Badge variant="outline" className={`text-xs ${getStatusColor(prompt.draft_status)}`}>
                              {prompt.draft_status || 'Draft'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Selected Prompt Content */}
          {selectedPrompt && (
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed m-0" style={{ fontFamily: 'Times New Roman, serif', fontSize: '16px' }}>
                {selectedPrompt.prompt}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Word limit reminder */}
      {selectedPrompt && (
        <div className="mt-4 md:mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Word Limit: {selectedPrompt.word_limit || 'No limit'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptDropdown;
