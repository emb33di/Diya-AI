import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TestScore {
  id?: string;
  score: number;
  year_taken: number;
}

export const useTestScores = (testType: 'SAT' | 'ACT') => {
  const [scores, setScores] = useState<TestScore[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuthContext();

  const tableName = testType === 'SAT' ? 'sat_scores' : 'act_scores';

  const loadScores = useCallback(async () => {
    try {
      if (!user) return;

      const { data: scoresData, error } = await supabase
        .from(tableName)
        .select("*")
        .eq("user_id", user.id)
        .order("year_taken", { ascending: false });

      if (error) throw error;

      setScores(scoresData || []);
    } catch (error) {
      console.error(`Error loading ${testType} scores:`, error);
      toast({
        title: "Error",
        description: `Failed to load ${testType} scores. Please try again.`,
        variant: "destructive",
      });
    }
  }, [testType, tableName, toast]);

  const addScore = useCallback(async (newScore: TestScore) => {
    if (!newScore.score || !newScore.year_taken) {
      toast({
        title: "Error",
        description: `Please fill in all ${testType} score fields.`,
        variant: "destructive",
      });
      return;
    }

    try {
      if (!user) return;

      const { error } = await supabase
        .from(tableName)
        .insert({
          user_id: user.id,
          score: newScore.score,
          year_taken: newScore.year_taken,
        });

      if (error) throw error;

      loadScores();
      toast({
        title: `${testType} score added`,
        description: `${testType} score has been added successfully.`,
      });
    } catch (error) {
      console.error(`Error adding ${testType} score:`, error);
      toast({
        title: "Error",
        description: `Failed to add ${testType} score. Please try again.`,
        variant: "destructive",
      });
    }
  }, [testType, tableName, loadScores, toast]);

  const deleteScore = useCallback(async (scoreId: string) => {
    try {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq("id", scoreId);

      if (error) throw error;

      loadScores();
      toast({
        title: `${testType} score deleted`,
        description: `${testType} score has been deleted successfully.`,
      });
    } catch (error) {
      console.error(`Error deleting ${testType} score:`, error);
      toast({
        title: "Error",
        description: `Failed to delete ${testType} score. Please try again.`,
        variant: "destructive",
      });
    }
  }, [testType, tableName, loadScores, toast]);

  return {
    scores,
    loading,
    loadScores,
    addScore,
    deleteScore,
  };
};
