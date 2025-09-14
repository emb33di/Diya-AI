/**
 * Backend API Service
 * Handles all communication with the backend API server
 */

// API Base URL - change this for production
const API_BASE_URL = 'http://localhost:8000';

// Types for API requests and responses
export interface BaseRequest {
  conversation_id: string;
  user_id: string;
}

export interface SchoolRecommendation {
  school: string;
  school_type: string;
  school_ranking: string;
  acceptance_rate: string;
  category: string;
  notes: string;
  student_thesis: string;
  city?: string;
  state?: string;
  climate?: string;
}

export interface SchoolRecommendationResponse {
  success: boolean;
  recommendations: SchoolRecommendation[];
  message: string;
  conversation_id: string;
  user_id: string;
}

export interface HealthResponse {
  status: string;
  message: string;
  agents: Record<string, boolean>;
  supabase_connected: boolean;
  google_api_configured: boolean;
}

export interface AgentStatusResponse {
  agents: Record<string, boolean>;
  total_agents: number;
  available_agents: number;
}

export interface TranscriptResponse {
  conversation_id: string;
  transcript: string;
  transcript_length: number;
}

export interface BrainstormingSummary {
  key_themes: string[];
  personal_stories: string[];
  essay_angles: string[];
  writing_prompts: string[];
  structure_suggestions: string[];
}

export interface BrainstormingResponse {
  success: boolean;
  summary?: BrainstormingSummary;
  message: string;
  conversation_id: string;
  user_id: string;
}

// Error handling
class BackendAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'BackendAPIError';
  }
}

/**
 * Backend API Service Class
 */
export class BackendAPI {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Make a request to the backend API
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new BackendAPIError(
          errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof BackendAPIError) {
        throw error;
      }
      throw new BackendAPIError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0
      );
    }
  }

  /**
   * Check backend health
   */
  async healthCheck(): Promise<HealthResponse> {
    return this.makeRequest<HealthResponse>('/');
  }

  /**
   * Get status of all agents
   */
  async getAgentStatus(): Promise<AgentStatusResponse> {
    return this.makeRequest<AgentStatusResponse>('/api/agents/status');
  }

  /**
   * Generate school recommendations from conversation
   */
  async generateSchoolRecommendations(
    conversationId: string,
    userId: string
  ): Promise<SchoolRecommendationResponse> {
    return this.makeRequest<SchoolRecommendationResponse>('/api/schools/recommendations', {
      method: 'POST',
      body: JSON.stringify({
        conversation_id: conversationId,
        user_id: userId,
      }),
    });
  }

  /**
   * Get existing school recommendations for a user
   */
  async getUserSchoolRecommendations(userId: string): Promise<SchoolRecommendationResponse> {
    return this.makeRequest<SchoolRecommendationResponse>(`/api/schools/recommendations/${userId}`);
  }

  /**
   * Get conversation transcript
   */
  async getConversationTranscript(conversationId: string): Promise<TranscriptResponse> {
    return this.makeRequest<TranscriptResponse>(`/api/conversations/${conversationId}/transcript`);
  }

  /**
   * Generate brainstorming summary from conversation
   */
  async generateBrainstormingSummary(
    conversationId: string,
    userId: string
  ): Promise<BrainstormingResponse> {
    return this.makeRequest<BrainstormingResponse>('/api/brainstorming', {
      method: 'POST',
      body: JSON.stringify({
        conversation_id: conversationId,
        user_id: userId,
      }),
    });
  }

  /**
   * Test backend connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health.status === 'healthy';
    } catch (error) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  }
}

// Create a singleton instance
export const backendAPI = new BackendAPI(); 