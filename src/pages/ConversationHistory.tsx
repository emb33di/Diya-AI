import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ElevenLabsAPI } from '@/utils/elevenLabsAPI';
import { ConversationStorage } from '@/utils/conversationStorage';
import { fetchConversationHistory } from '@/utils/supabaseUtils';
import { MessageSquare, Clock, Download, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import TranscriptViewer from '@/components/TranscriptViewer';
import OnboardingGuard from '@/components/OnboardingGuard';

interface ConversationRecord {
  id: string;
  conversation_id: string;
  user_id: string;
  conversation_started_at: string;
  conversation_ended_at: string;
  metadata_retrieved: boolean;
  metadata_retrieved_at?: string;
  created_at: string;
}

const ConversationHistory = () => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrievingMetadata, setRetrievingMetadata] = useState<string | null>(null);

  useEffect(() => {
    // Initialize ElevenLabs API
    const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
    console.log('Initializing ElevenLabs API with key length:', apiKey?.length || 0);
    ElevenLabsAPI.initialize(apiKey);
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to view conversation history.",
          variant: "destructive"
        });
        return;
      }

      // Fetch conversation IDs from Supabase with timeout handling
      console.log('Fetching conversations from Supabase for user:', user.id);
      
      const { data: conversationRecords, error } = await fetchConversationHistory(user.id);
      
      if (error) {
        console.error('Error fetching conversations from Supabase:', error);
        toast({
          title: "Database Error",
          description: error,
          variant: "destructive"
        });
        setConversations([]);
        return;
      }
      
      console.log('Fetched conversations from Supabase:', conversationRecords);
      console.log('Number of conversations:', conversationRecords?.length || 0);
      
      if (conversationRecords && conversationRecords.length > 0) {
        setConversations(conversationRecords as ConversationRecord[]);
      } else {
        console.log('No conversations found in Supabase');
        setConversations([]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversation history.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const retrieveMetadata = async (conversationId: string) => {
    try {
      setRetrievingMetadata(conversationId);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to retrieve metadata.",
          variant: "destructive"
        });
        return;
      }

      console.log('Retrieving metadata for conversation:', conversationId);
      console.log('ElevenLabs API Key available:', !!import.meta.env.VITE_ELEVENLABS_API_KEY);
      
      // Retrieve and store metadata
      const success = await ConversationStorage.retrieveAndStoreMetadata(conversationId, user.id);
      
      if (success) {
        // Update the conversation record to mark as retrieved
        setConversations(prev => prev.map(conv => 
          conv.conversation_id === conversationId 
            ? { ...conv, metadata_retrieved: true, metadata_retrieved_at: new Date().toISOString() }
            : conv
        ));
        
        toast({
          title: "Metadata Retrieved",
          description: `Successfully retrieved metadata for conversation ${conversationId}`,
        });
      } else {
        toast({
          title: "Retrieval Error",
          description: `Failed to retrieve metadata for conversation ${conversationId}`,
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('Error retrieving metadata:', error);
      toast({
        title: "Retrieval Error",
        description: `Failed to retrieve metadata for conversation ${conversationId}`,
        variant: "destructive"
      });
    } finally {
      setRetrievingMetadata(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getConversationDuration = (startedAt: string, endedAt: string) => {
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading conversation history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <OnboardingGuard pageName="Conversation History">
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-background via-primary/5 to-secondary/10 p-4 min-h-screen">
        <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold">Conversation History</h1>
            <p className="text-muted-foreground">
              View and manage your conversation recordings with Diya
            </p>
          </div>

          {conversations.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Conversations Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start a conversation with Diya to see your history here.
                </p>
                <Button onClick={() => window.location.href = '/onboarding'}>
                  Start Conversation
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {conversations.map((conversation) => (
                <Card key={conversation.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        <div>
                          <CardTitle className="text-lg">
                            Conversation {conversation.conversation_id.slice(-8)}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(conversation.conversation_ended_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={conversation.metadata_retrieved ? "default" : "secondary"}>
                          {conversation.metadata_retrieved ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <AlertCircle className="w-3 h-3 mr-1" />
                          )}
                          {conversation.metadata_retrieved ? "Retrieved" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Duration: {getConversationDuration(conversation.conversation_started_at, conversation.conversation_ended_at)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          ID: {conversation.conversation_id}
                        </span>
                      </div>
                      {conversation.metadata_retrieved_at && (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">
                            Retrieved: {formatDate(conversation.metadata_retrieved_at)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => retrieveMetadata(conversation.conversation_id)}
                        disabled={retrievingMetadata === conversation.conversation_id || conversation.metadata_retrieved}
                        variant="outline"
                        size="sm"
                      >
                        {retrievingMetadata === conversation.conversation_id ? (
                          <>
                            <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                            Retrieving...
                          </>
                        ) : conversation.metadata_retrieved ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-2" />
                            Retrieved
                          </>
                        ) : (
                          <>
                            <Download className="w-3 h-3 mr-2" />
                            Retrieve Metadata
                          </>
                        )}
                      </Button>
                      <TranscriptViewer conversationId={conversation.conversation_id} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
    </OnboardingGuard>
  );
};

export default ConversationHistory;