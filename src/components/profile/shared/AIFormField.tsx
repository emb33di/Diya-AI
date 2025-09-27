import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIFormFieldProps {
  children: React.ReactNode;
  fieldName: string;
  className?: string;
  isAIPopulated: (fieldName: string) => boolean;
}

export const AIFormField: React.FC<AIFormFieldProps> = ({ 
  children, 
  fieldName, 
  className = "",
  isAIPopulated
}) => {
  const isAI = isAIPopulated(fieldName);
  
  return (
    <div className={cn("relative", className)}>
      {children}
      {isAI && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-primary" />
        </div>
      )}
    </div>
  );
};
