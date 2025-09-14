import { useState, useEffect } from 'react';
import { SchoolRecommendationService, SchoolRecommendation } from '../services/schoolRecommendationService';

export const BackendIntegration = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<SchoolRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Test connection on mount
  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const connected = await SchoolRecommendationService.testConnection();
      setIsConnected(connected);
      console.log('Service connection:', connected ? '✅ Success' : '❌ Failed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Connection error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRecommendations = async () => {
    const conversationId = "test_conversation_123";
    const userId = "test_user_456";
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await SchoolRecommendationService.generateSchoolRecommendations(conversationId, userId);
      
      if (response.success) {
        setRecommendations(response.recommendations);
        console.log('✅ Generated recommendations:', response.recommendations.length);
      } else {
        setError(response.message);
        console.log('❌ No recommendations:', response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Backend Integration Test</h1>
      
      {/* Connection Status */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Connection Status</h2>
        <div className="flex items-center space-x-2">
          <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span>{isConnected ? 'Connected' : 'Disconnected'} to Backend API</span>
        </div>
        {isLoading && <p className="text-sm text-gray-600 mt-2">Testing connection...</p>}
      </div>

      {/* Test Buttons */}
      <div className="mb-6 space-x-4">
        <button 
          onClick={testConnection}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Test Connection
        </button>
        
        <button 
          onClick={generateRecommendations}
          disabled={!isConnected || isLoading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Generate Recommendations
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
          <h3 className="font-semibold text-red-800">Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Recommendations Display */}
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">School Recommendations ({recommendations.length})</h2>
          
          {recommendations.map((rec, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">{rec.school}</h3>
                <span className={`px-2 py-1 rounded text-sm ${
                  rec.category === 'reach' ? 'bg-red-100 text-red-800' :
                  rec.category === 'target' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {rec.category}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                <div>Type: {rec.school_type}</div>
                <div>Ranking: {rec.school_ranking}</div>
                <div>Acceptance Rate: {rec.acceptance_rate}</div>
                <div>Location: {rec.city}, {rec.state}</div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm"><strong>Notes:</strong> {rec.notes}</p>
                <p className="text-sm"><strong>Student Thesis:</strong> {rec.student_thesis}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">Instructions</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Make sure you're authenticated with Supabase</li>
          <li>Click "Test Connection" to verify the service is accessible</li>
          <li>Click "Generate Recommendations" to test the school recommendation service</li>
          <li>Check the browser console for detailed logs</li>
        </ol>
      </div>
    </div>
  );
}; 