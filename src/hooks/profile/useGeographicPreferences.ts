import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GeographicPreference {
  id?: string;
  preference: string;
}

export const useGeographicPreferences = () => {
  const [preferences, setPreferences] = useState<GeographicPreference[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadPreferences = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: preferencesData, error } = await supabase
        .from("geographic_preferences")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPreferences(preferencesData || []);
    } catch (error) {
      console.error("Error loading geographic preferences:", error);
      toast({
        title: "Error",
        description: "Failed to load geographic preferences. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const addPreference = useCallback(async (preference: string) => {
    if (!preference) {
      toast({
        title: "Error",
        description: "Please select a geographic preference.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("geographic_preferences")
        .insert({
          user_id: user.id,
          preference: preference,
        });

      if (error) throw error;

      loadPreferences();
      toast({
        title: "Geographic preference added",
        description: "Geographic preference has been added successfully.",
      });
    } catch (error) {
      console.error("Error adding geographic preference:", error);
      toast({
        title: "Error",
        description: "Failed to add geographic preference. Please try again.",
        variant: "destructive",
      });
    }
  }, [loadPreferences, toast]);

  const deletePreference = useCallback(async (preferenceId: string) => {
    try {
      const { error } = await supabase
        .from("geographic_preferences")
        .delete()
        .eq("id", preferenceId);

      if (error) throw error;

      loadPreferences();
      toast({
        title: "Geographic preference deleted",
        description: "Geographic preference has been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting geographic preference:", error);
      toast({
        title: "Error",
        description: "Failed to delete geographic preference. Please try again.",
        variant: "destructive",
      });
    }
  }, [loadPreferences, toast]);

  return {
    preferences,
    loading,
    loadPreferences,
    addPreference,
    deletePreference,
  };
};
