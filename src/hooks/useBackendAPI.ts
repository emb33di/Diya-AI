import { useState, useCallback } from 'react';
import { SchoolRecommendationService, SchoolRecommendation, SchoolRecommendationResponse } from '../services/schoolRecommendationService';
import { useToast } from './use-toast';

export interface UseBackendAPIState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  recommendations: SchoolRecommendation[];
}

export const useBackendAPI = () => {
  const [state, setState] = useState<UseBackendAPIState>({
    isConnected: false,
    isLoading: false,
    error: null,
    recommendations: [],
  });

  const { toast } = useToast();

  // Test connection
  const testConnection = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const isConnected = await SchoolRecommendationService.testConnection();
      setState(prev => ({ ...prev, isConnected, isLoading: false }));
      
      if (isConnected) {
        toast({
          title: "Service Connected",
          description: "Successfully connected to the school recommendation service",
        });
      } else {
        toast({
          title: "Service Connection Failed",
          description: "Could not connect to the service. Please check your authentication.",
          variant: "destructive",
        });
      }
      
      return isConnected;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        isLoading: false, 
        error: errorMessage 
      }));
      
      toast({
        title: "Connection Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return false;
    }
  }, [toast]);

  // Generate school recommendations
  const generateSchoolRecommendations = useCallback(async (
    conversationId: string,
    userId: string
  ) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await SchoolRecommendationService.generateSchoolRecommendations(conversationId, userId);
      
      if (response.success) {
        setState(prev => ({
          ...prev,
          recommendations: response.recommendations,
          isLoading: false,
        }));
        
        toast({
          title: "Recommendations Generated",
          description: `Successfully generated ${response.recommendations.length} school recommendations`,
        });
        
        return response.recommendations;
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: response.message,
        }));
        
        toast({
          title: "No Recommendations",
          description: response.message,
          variant: "destructive",
        });
        
        return [];
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      return [];
    }
  }, [toast]);

  // Get existing recommendations
  const getUserRecommendations = useCallback(async (userId: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await SchoolRecommendationService.getUserSchoolRecommendations(userId);
      
      if (response.success) {
        setState(prev => ({
          ...prev,
          recommendations: response.recommendations,
          isLoading: false,
        }));
        
        return response.recommendations;
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: response.message,
        }));
        
        return [];
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      
      return [];
    }
  }, []);

  // Get conversation transcript
  const getConversationTranscript = useCallback(async (conversationId: string) => {
    try {
      const response = await SchoolRecommendationService.getConversationTranscript(conversationId);
      return response.transcript;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      toast({
        title: "Transcript Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return null;
    }
  }, [toast]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Clear recommendations
  const clearRecommendations = useCallback(() => {
    setState(prev => ({ ...prev, recommendations: [] }));
  }, []);

  return {
    ...state,
    testConnection,
    generateSchoolRecommendations,
    getUserRecommendations,
    getConversationTranscript,
    clearError,
    clearRecommendations,
  };
}; 