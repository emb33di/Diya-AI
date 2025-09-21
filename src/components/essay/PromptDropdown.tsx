import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, ChevronDown, CheckCircle, Clock, ChevronRight } from 'lucide-react';

interface EssayPrompt {
  id: string;
  prompt: string;
  prompt_number?: string;
  is_required?: boolean;
  word_limit?: string;
  has_draft?: boolean;
  draft_status?: 'draft' | 'review' | 'final' | 'submitted';
  prompt_selection_type?: string;
  how_many?: string;
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
  
  // Categorize prompts
  const requiredPrompts = prompts.filter(p => p.is_required);
  const optionalPrompts = prompts.filter(p => !p.is_required);
  
  // Get selection text for optional prompts
  const getSelectionText = (prompts: EssayPrompt[]) => {
    if (prompts.length === 0) return '';
    
    const promptSelectionType = prompts[0]?.prompt_selection_type || 'choose_one';
    const howMany = prompts[0]?.how_many || '1';
    
    if (promptSelectionType === 'choose_one') {
      return `Choose 1 of ${prompts.length}`;
    } else if (promptSelectionType.startsWith('choose_')) {
      const number = promptSelectionType.split('_')[1];
      return `Choose ${number} of ${prompts.length}`;
    } else {
      return `Choose ${howMany} of ${prompts.length}`;
    }
  };
  
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
          <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">
            Essay Prompts
          </h3>
          
          <div className="space-y-6">
            {/* Required Essays Section */}
            {requiredPrompts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-medium text-red-600 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span>Required ({requiredPrompts.length})</span>
                  </h4>
                </div>
                
                <Select 
                  value={requiredPrompts.find(p => p.id === selectedPromptId)?.id || ''} 
                  onValueChange={onPromptChange}
                >
                  <SelectTrigger className="w-full bg-white border-gray-300 shadow-sm">
                    <SelectValue placeholder="Select required prompt">
                      {(() => {
                        const selectedPrompt = requiredPrompts.find(p => p.id === selectedPromptId);
                        return selectedPrompt ? (
                          <div className="flex items-center space-x-2">
                            <span className="truncate font-medium">
                              {selectedPrompt.prompt_number ? `Prompt ${selectedPrompt.prompt_number}` : 'Custom Prompt'}
                            </span>
                            {selectedPrompt.has_draft && (
                              <Badge variant="outline" className={`text-xs ${getStatusColor(selectedPrompt.draft_status)}`}>
                                {selectedPrompt.draft_status || 'Draft'}
                              </Badge>
                            )}
                          </div>
                        ) : null;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {requiredPrompts.map((prompt) => (
                      <SelectItem key={prompt.id} value={prompt.id}>
                        <div className="flex items-center space-x-2 w-full">
                          <span className="flex-1 truncate">
                            {prompt.prompt_number ? `Prompt ${prompt.prompt_number}` : 'Custom Prompt'}
                          </span>
                          <div className="flex items-center space-x-1 ml-2">
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
            )}
            
            {/* Optional Essays Section */}
            {optionalPrompts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-medium text-blue-600 flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>{getSelectionText(optionalPrompts)} ({optionalPrompts.length} prompts)</span>
                  </h4>
                </div>
                
                <Select 
                  value={optionalPrompts.find(p => p.id === selectedPromptId)?.id || ''} 
                  onValueChange={onPromptChange}
                >
                  <SelectTrigger className="w-full bg-white border-gray-300 shadow-sm">
                    <SelectValue placeholder={`Select from ${getSelectionText(optionalPrompts)}`}>
                      {(() => {
                        const selectedPrompt = optionalPrompts.find(p => p.id === selectedPromptId);
                        return selectedPrompt ? (
                          <div className="flex items-center space-x-2">
                            <span className="truncate font-medium">
                              {selectedPrompt.prompt_number ? `Prompt ${selectedPrompt.prompt_number}` : 'Custom Prompt'}
                            </span>
                            {selectedPrompt.has_draft && (
                              <Badge variant="outline" className={`text-xs ${getStatusColor(selectedPrompt.draft_status)}`}>
                                {selectedPrompt.draft_status || 'Draft'}
                              </Badge>
                            )}
                          </div>
                        ) : null;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {optionalPrompts.map((prompt) => (
                      <SelectItem key={prompt.id} value={prompt.id}>
                        <div className="flex items-center space-x-2 w-full">
                          <span className="flex-1 truncate">
                            {prompt.prompt_number ? `Prompt ${prompt.prompt_number}` : 'Custom Prompt'}
                          </span>
                          <div className="flex items-center space-x-1 ml-2">
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
            )}
          </div>
          
          {/* Selected Prompt Content */}
          {selectedPrompt && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed m-0 text-base" style={{ fontFamily: 'Arial, sans-serif', whiteSpace: 'pre-wrap' }}>
                  {selectedPrompt.prompt}
                </p>
              </div>
              
              {/* Word limit reminder */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Word Limit: {selectedPrompt.word_limit || 'No limit'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromptDropdown;
