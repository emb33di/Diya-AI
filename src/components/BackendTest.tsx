import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { SchoolRecommendationService, SchoolRecommendation } from '../services/schoolRecommendationService';

interface BackendTestProps {
  conversationId?: string;
  userId?: string;
}

export const BackendTest: React.FC<BackendTestProps> = ({ 
  conversationId = "test_conversation_123", 
  userId = "test_user_456" 
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<SchoolRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Test backend connection on mount
  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const connected = await SchoolRecommendationService.testConnection();
      setIsConnected(connected);
      
      if (connected) {
        console.log('✅ Backend connected successfully');
      } else {
        console.log('❌ Backend connection failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Backend connection error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRecommendations = async () => {
    if (!conversationId || !userId) {
      setError('Missing conversation ID or user ID');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await SchoolRecommendationService.generateSchoolRecommendations(conversationId, userId);
      
      if (response.success) {
        setRecommendations(response.recommendations);
        console.log('✅ Generated recommendations:', response.recommendations.length);
      } else {
        setError(response.message);
        console.log('❌ No recommendations generated:', response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Recommendation generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getExistingRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await SchoolRecommendationService.getUserSchoolRecommendations(userId);
      
      if (response.success) {
        setRecommendations(response.recommendations);
        console.log('✅ Retrieved existing recommendations:', response.recommendations.length);
      } else {
        setError(response.message);
        console.log('❌ No existing recommendations:', response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Get recommendations error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Backend API Test</CardTitle>
          <CardDescription>
            Test the connection to the backend API server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Backend API Server
            </span>
          </div>

          {/* Test Buttons */}
          <div className="flex space-x-2">
            <Button 
              onClick={testConnection} 
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? "Testing..." : "Test Connection"}
            </Button>
            
            <Button 
              onClick={generateRecommendations} 
              disabled={!isConnected || isLoading}
            >
              {isLoading ? "Generating..." : "Generate Recommendations"}
            </Button>
            
            <Button 
              onClick={getExistingRecommendations} 
              disabled={!isConnected || isLoading}
              variant="outline"
            >
              {isLoading ? "Loading..." : "Get Existing"}
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Test Parameters */}
          <div className="text-sm text-muted-foreground">
            <p>Conversation ID: {conversationId}</p>
            <p>User ID: {userId}</p>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations Display */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>School Recommendations</CardTitle>
            <CardDescription>
              {recommendations.length} recommendations generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{rec.school}</h3>
                    <Badge variant={
                      rec.category === 'reach' ? 'destructive' :
                      rec.category === 'target' ? 'default' : 'secondary'
                    }>
                      {rec.category}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                    <div>Type: {rec.school_type}</div>
                    <div>Ranking: {rec.school_ranking}</div>
                    <div>Acceptance: {rec.acceptance_rate}</div>
                    <div>Location: {rec.city}, {rec.state}</div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm"><strong>Notes:</strong> {rec.notes}</p>
                    <p className="text-sm"><strong>Thesis:</strong> {rec.student_thesis}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 