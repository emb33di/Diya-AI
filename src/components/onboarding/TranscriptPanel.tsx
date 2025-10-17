import React, { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Sparkles, User, X } from 'lucide-react';

export type TranscriptMessage = {
  id?: string;
  source: 'ai' | 'user';
  text: string;
  timestamp: Date;
};

export interface TranscriptPanelProps {
  variant: 'expanded' | 'compact';
  messages: TranscriptMessage[];
  onClear?: () => void;
  onClose?: () => void; // only used by expanded variant
  onToggle?: () => void; // for toggling visibility
  endRef?: RefObject<HTMLDivElement>;
  containerRef?: RefObject<HTMLDivElement>; // used by expanded variant
  conversationCompleted?: boolean; // used by compact header text
}

const TranscriptPanel: React.FC<TranscriptPanelProps> = ({
  variant,
  messages,
  onClear,
  onClose,
  onToggle,
  endRef,
  containerRef,
  conversationCompleted,
}) => {
  // Debug: Log when messages change
  React.useEffect(() => {
    console.log('📝 TranscriptPanel messages updated:', {
      variant,
      messageCount: messages.length,
      messages: messages.map(m => ({ source: m.source, textLength: m.text.length, id: m.id }))
    });
  }, [messages, variant]);

  if (variant === 'expanded') {
    return (
      <div className="lg:col-span-1 min-h-0" style={{ height: '80vh' }}>
        <div className="h-full bg-background/60 border rounded-xl p-2 md:p-3 flex flex-col min-h-0">
          <div className="mb-2 flex-shrink-0 flex items-center justify-between">
            <h4 className="text-xs font-medium text-muted-foreground">Live Conversation ({messages.length} messages)</h4>
            <div className="flex items-center gap-2">
              {onToggle && (
                <Button 
                  onClick={onToggle} 
                  variant="ghost" 
                  size="sm"
                  className="h-5 px-2 text-xs"
                >
                  Hide
                </Button>
              )}
              {onClose && (
                <Button 
                  onClick={onClose} 
                  variant="ghost" 
                  size="sm"
                  className="h-5 w-5 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 p-1 rounded-lg border min-h-0" ref={containerRef}>
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.source === 'ai' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[90%] p-1.5 md:p-2 rounded-lg ${msg.source === 'ai' ? 'bg-[#D07D00] text-white border border-[#D07D00]/20' : 'bg-secondary text-secondary-foreground'}`}>
                  <div className="flex items-center gap-1 mb-0.5">
                    {msg.source === 'ai' ? <Sparkles className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                    <span className="text-xs font-medium">{msg.source === 'ai' ? 'Diya' : 'You'}</span>
                    <span className="text-xs text-muted-foreground">{msg.timestamp.toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs md:text-sm leading-relaxed">{msg.text}</p>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
        </div>
      </div>
    );
  }

  // compact variant
  return (
    <div className="mt-6">
      <div className="mb-3">
        <h4 className="text-sm font-medium text-muted-foreground">
          {conversationCompleted ? 'Conversation Transcript' : 'Live Conversation'} ({messages.length} messages)
        </h4>
      </div>
      <div className="max-h-64 overflow-y-auto space-y-3 p-4 bg-muted/30 rounded-lg border">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.source === 'ai' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] p-3 rounded-lg ${msg.source === 'ai' ? 'bg-primary/30 text-primary-foreground border border-primary/20' : 'bg-secondary text-secondary-foreground'}`}>
              <div className="flex items-center gap-2 mb-1">
                {msg.source === 'ai' ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
                <span className="text-xs font-medium">
                  {msg.source === 'ai' ? 'Diya' : 'You'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {msg.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};

export default TranscriptPanel;
