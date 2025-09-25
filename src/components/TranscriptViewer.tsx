import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Download, Play, Pause, FileText, AlertCircle } from 'lucide-react';
import { ConversationStorage, ConversationData } from '@/utils/conversationStorage';

interface TranscriptViewerProps {
  conversationId: string;
}

const TranscriptViewer: React.FC<TranscriptViewerProps> = ({ conversationId }) => {
  const [metadata, setMetadata] = useState<ConversationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const loadMetadata = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await ConversationStorage.getConversationMetadata(conversationId);
      setMetadata(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transcript');
    } finally {
      setLoading(false);
    }
  };

  const downloadTranscript = () => {
    if (!metadata?.transcript) return;
    
    const blob = new Blob([metadata.transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation_${conversationId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTranscript = (transcript: string) => {
    return transcript.split('\n').map((line, index) => {
      const isDia = line.startsWith('Diya:');
      const isUser = line.startsWith('You:');
      
      if (isDia || isUser) {
        const speaker = isDia ? 'Diya' : 'You';
        const message = line.substring(line.indexOf(':') + 1).trim();
        
        return (
          <div key={index} className={`flex ${isDia ? 'justify-start' : 'justify-end'} mb-3`}>
            <div className={`max-w-[80%] p-3 rounded-lg ${
              isDia 
                ? 'bg-primary/30 text-primary-foreground border border-primary/20' 
                : 'bg-secondary text-secondary-foreground'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs font-medium">{speaker}</span>
              </div>
              <p className="text-sm leading-relaxed">{message}</p>
            </div>
          </div>
        );
      }
      
      return (
        <div key={index} className="mb-2">
          <p className="text-sm text-muted-foreground">{line}</p>
        </div>
      );
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="w-4 h-4 mr-2" />
          View Transcript
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Conversation Transcript
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Metadata Summary */}
          {metadata && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conversation Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Conversation ID:</span>
                    <p className="text-muted-foreground">{metadata.conversation_id}</p>
                  </div>
                  <div>
                    <span className="font-medium">Date:</span>
                    <p className="text-muted-foreground">
                      {new Date(metadata.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {metadata.summary && (
                  <div>
                    <span className="font-medium">Summary:</span>
                    <p className="text-muted-foreground mt-1">{metadata.summary}</p>
                  </div>
                )}
                
                {metadata.audio_url && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Audio:</span>
                    <Button variant="outline" size="sm">
                      <Play className="w-4 h-4 mr-2" />
                      Play Recording
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Transcript Content */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Full Transcript</CardTitle>
                {metadata?.transcript && (
                  <Button onClick={downloadTranscript} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading transcript...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{error}</p>
                  <Button onClick={loadMetadata} className="mt-4">
                    Try Again
                  </Button>
                </div>
              ) : metadata?.transcript ? (
                <ScrollArea className="h-96">
                  <div className="space-y-4 p-4">
                    {formatTranscript(metadata.transcript)}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No transcript available</p>
                  <Button onClick={loadMetadata} className="mt-4">
                    Load Transcript
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TranscriptViewer; 