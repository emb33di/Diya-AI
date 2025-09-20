import { supabase } from '@/integrations/supabase/client';

export interface AgentScores {
  bigPicture?: number;
  tone?: number;
  clarity?: number;
}

export class ScoreReportService {
  /**
   * Fetch scores from all three agents for an essay using semantic annotations
   */
  static async getAgentScores(essayId: string): Promise<AgentScores> {
    try {
      // First, get the semantic document for this essay
      const { data: document, error: docError } = await supabase
        .from('semantic_documents')
        .select('id')
        .eq('metadata->>essayId', essayId)
        .single();

      if (docError || !document) {
        console.error('Error fetching semantic document:', docError);
        return {};
      }

      // Get semantic annotations with quality scores
      const { data: annotations, error } = await supabase
        .from('semantic_annotations')
        .select('metadata, created_at')
        .eq('document_id', document.id)
        .eq('author', 'ai')
        .in('metadata->>agentType', ['big-picture', 'tone', 'clarity'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching semantic annotations:', error);
        return {};
      }

      console.log('Raw annotations from database:', annotations);
      const scores: AgentScores = {};

      // Group annotations by agent type and get the most recent score for each
      const agentGroups = annotations?.reduce((acc, annotation) => {
        const agentType = annotation.metadata?.agentType;
        if (agentType && ['big-picture', 'tone', 'clarity'].includes(agentType)) {
          if (!acc[agentType]) {
            acc[agentType] = [];
          }
          acc[agentType].push(annotation);
        }
        return acc;
      }, {} as Record<string, any[]>) || {};

      // Extract scores for each agent type
      Object.entries(agentGroups).forEach(([agentType, agentAnnotations]) => {
        if (agentAnnotations.length > 0) {
          const latestAnnotation = agentAnnotations[0];
          const score = latestAnnotation.metadata?.qualityScore;
          
          console.log(`Agent ${agentType}:`, { score, annotation: latestAnnotation });
          
          if (score !== null && score !== undefined) {
            switch (agentType) {
              case 'big-picture':
                scores.bigPicture = score;
                break;
              case 'tone':
                scores.tone = score;
                break;
              case 'clarity':
                scores.clarity = score;
                break;
            }
          } else {
            // If no quality score found, provide a default based on agent type
            console.warn(`No quality score found for ${agentType} agent, using default`);
            switch (agentType) {
              case 'big-picture':
                scores.bigPicture = 75; // Default score
                break;
              case 'tone':
                scores.tone = 7; // Default score
                break;
              case 'clarity':
                scores.clarity = 6; // Default score
                break;
            }
          }
        }
      });

      console.log('Final scores:', scores);

      return scores;
    } catch (error) {
      console.error('Error fetching agent scores:', error);
      return {};
    }
  }

  /**
   * Check if AI comments exist for an essay using semantic annotations
   */
  static async hasAIComments(essayId: string): Promise<boolean> {
    try {
      // First, get the semantic document for this essay
      const { data: document, error: docError } = await supabase
        .from('semantic_documents')
        .select('id')
        .eq('metadata->>essayId', essayId)
        .single();

      if (docError || !document) {
        console.error('Error fetching semantic document:', docError);
        return false;
      }

      // Check for semantic annotations
      const { data, error } = await supabase
        .from('semantic_annotations')
        .select('id')
        .eq('document_id', document.id)
        .eq('author', 'ai')
        .limit(1);

      if (error) {
        console.error('Error checking for AI comments:', error);
        return false;
      }

      return !!data && data.length > 0;
    } catch (error) {
      console.error('Error checking for AI comments:', error);
      return false;
    }
  }

  /**
   * Get overall essay grade based on big picture score
   */
  static getOverallGrade(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Work';
    return 'Requires Attention';
  }

  /**
   * Get color class for score
   */
  static getScoreColor(score: number, maxScore: number): string {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 60) return 'text-yellow-500';
    return 'text-red-500';
  }
}
