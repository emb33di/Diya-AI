import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { 
  EssayService, 
  Essay, 
  EssayContent,
  convertHTMLToBlocks,
  convertBlocksToHTML,
  countWordsInHTML,
  countCharactersInHTML
} from '@/services/essayService';
import { usePageVisibility } from './usePageVisibility';

export const useTipTapEssayEditor = (essayId: string | null) => {
  const [essay, setEssay] = useState<Essay | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();

  // Refs for debouncing and cleanup
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  const loadEssay = useCallback(async () => {
    if (!essayId) {
      setEssay(null);
      setHtmlContent('');
      setLastSaved(null);
      setHasUnsavedChanges(false);
      isInitialLoadRef.current = true;
      return;
    }

    setLoading(true);
    try {
      const essayData = await EssayService.getEssay(essayId);
      setEssay(essayData);
      
      // Convert blocks to HTML for TipTap
      const html = convertBlocksToHTML(essayData.content.blocks);
      setHtmlContent(html);
      
      setLastSaved(new Date(essayData.last_saved_at));
      setHasUnsavedChanges(false);
      isInitialLoadRef.current = false;
    } catch (error) {
      console.error('Error loading essay:', error);
      toast({
        title: "Error",
        description: "Failed to load essay",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [essayId, toast]);

  // Load essay on mount
  useEffect(() => {
    loadEssay();
  }, [loadEssay]);

  // Refresh essay data when page becomes visible (to catch any external changes)
  usePageVisibility(() => {
    if (essayId && !loading) {
      loadEssay();
    }
  });

  // Auto-save functionality
  const saveContent = useCallback(async (html: string) => {
    if (!essayId || !html) return;

    setSaving(true);
    try {
      // Convert HTML to blocks for storage
      const blocks = convertHTMLToBlocks(html);
      const wordCount = countWordsInHTML(html);
      const characterCount = countCharactersInHTML(html);
      
      const content: EssayContent = {
        blocks,
        metadata: {
          totalWordCount: wordCount,
          totalCharacterCount: characterCount,
          lastSaved: new Date().toISOString()
        }
      };

      await EssayService.saveEssayContent(essayId, content);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving essay:', error);
      toast({
        title: "Save Error",
        description: "Failed to save changes. Your work may be lost.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }, [essayId, toast]);

  // Debounced auto-save
  const debouncedSave = useCallback((html: string) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      saveContent(html);
    }, 2000); // Save after 2 seconds of inactivity
  }, [saveContent]);

  // Update HTML content with auto-save
  const updateHtmlContent = useCallback((newHtml: string) => {
    setHtmlContent(newHtml);
    
    // Don't trigger save on initial load
    if (!isInitialLoadRef.current) {
      setHasUnsavedChanges(true);
      debouncedSave(newHtml);
    }
  }, [debouncedSave]);

  // Force save (manual save)
  const forceSave = useCallback(() => {
    if (htmlContent && essayId) {
      // Clear any pending debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      saveContent(htmlContent);
    }
  }, [htmlContent, essayId, saveContent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Computed values
  const wordCount = countWordsInHTML(htmlContent);
  const characterCount = countCharactersInHTML(htmlContent);

  return {
    essay,
    htmlContent,
    loading,
    saving,
    lastSaved,
    hasUnsavedChanges,
    updateHtmlContent,
    forceSave,
    // Computed values
    wordCount,
    characterCount
  };
};
