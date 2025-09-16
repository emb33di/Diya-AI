import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { EssayService, Essay, EssayContent, EssayBlock } from '@/services/essayService';
import { usePageVisibility } from './usePageVisibility';

export const useEssayEditor = (essayId: string | null) => {
  const [essay, setEssay] = useState<Essay | null>(null);
  const [content, setContent] = useState<EssayContent | null>(null);
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
      setContent(null);
      setLastSaved(null);
      setHasUnsavedChanges(false);
      isInitialLoadRef.current = true;
      return;
    }

    setLoading(true);
    try {
      const essayData = await EssayService.getEssay(essayId);
      setEssay(essayData);
      setContent(essayData.content);
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
  const saveContent = useCallback(async (contentToSave: EssayContent) => {
    if (!essayId || !contentToSave) return;

    setSaving(true);
    try {
      await EssayService.saveEssayContent(essayId, contentToSave);
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
  const debouncedSave = useCallback((contentToSave: EssayContent) => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout
    saveTimeoutRef.current = setTimeout(() => {
      saveContent(contentToSave);
    }, 2000); // Save after 2 seconds of inactivity
  }, [saveContent]);

  // Update content with auto-save
  const updateContent = useCallback((newContent: EssayContent) => {
    setContent(newContent);
    
    // Don't trigger save on initial load
    if (!isInitialLoadRef.current) {
      setHasUnsavedChanges(true);
      debouncedSave(newContent);
    }
  }, [debouncedSave]);

  // Update specific block
  const updateBlock = useCallback((blockId: string, newContent: string) => {
    if (!content) return;

    const updatedBlocks = content.blocks.map(block => {
      if (block.id === blockId) {
        return {
          ...block,
          content: newContent,
          metadata: {
            ...block.metadata,
            wordCount: newContent.split(' ').filter(word => word.trim().length > 0).length,
            lastModified: new Date().toISOString()
          }
        };
      }
      return block;
    });

    const totalWordCount = updatedBlocks.reduce((total, block) => 
      total + (block.metadata?.wordCount || 0), 0);
    const totalCharacterCount = updatedBlocks.reduce((total, block) => 
      total + block.content.length, 0);

    const updatedContent: EssayContent = {
      blocks: updatedBlocks,
      metadata: {
        totalWordCount,
        totalCharacterCount,
        lastSaved: content.metadata.lastSaved // Keep original until actually saved
      }
    };

    updateContent(updatedContent);
  }, [content, updateContent]);

  // Add new block
  const addBlock = useCallback((afterBlockId?: string, blockType: EssayBlock['type'] = 'paragraph') => {
    if (!content) return null;

    const newBlock: EssayBlock = {
      id: `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: blockType,
      content: '',
      metadata: {
        wordCount: 0,
        lastModified: new Date().toISOString()
      }
    };

    let newBlocks;
    if (afterBlockId) {
      const insertIndex = content.blocks.findIndex(b => b.id === afterBlockId) + 1;
      newBlocks = [
        ...content.blocks.slice(0, insertIndex),
        newBlock,
        ...content.blocks.slice(insertIndex)
      ];
    } else {
      newBlocks = [...content.blocks, newBlock];
    }

    const updatedContent: EssayContent = {
      blocks: newBlocks,
      metadata: {
        ...content.metadata,
        lastSaved: content.metadata.lastSaved
      }
    };

    updateContent(updatedContent);
    return newBlock.id;
  }, [content, updateContent]);

  // Remove block
  const removeBlock = useCallback((blockId: string) => {
    if (!content || content.blocks.length <= 1) return; // Keep at least one block

    const updatedBlocks = content.blocks.filter(block => block.id !== blockId);
    
    const totalWordCount = updatedBlocks.reduce((total, block) => 
      total + (block.metadata?.wordCount || 0), 0);
    const totalCharacterCount = updatedBlocks.reduce((total, block) => 
      total + block.content.length, 0);

    const updatedContent: EssayContent = {
      blocks: updatedBlocks,
      metadata: {
        totalWordCount,
        totalCharacterCount,
        lastSaved: content.metadata.lastSaved
      }
    };

    updateContent(updatedContent);
  }, [content, updateContent]);

  // Change block type
  const changeBlockType = useCallback((blockId: string, newType: EssayBlock['type']) => {
    if (!content) return;

    const updatedBlocks = content.blocks.map(block => {
      if (block.id === blockId) {
        return {
          ...block,
          type: newType,
          metadata: {
            ...block.metadata,
            lastModified: new Date().toISOString()
          }
        };
      }
      return block;
    });

    const updatedContent: EssayContent = {
      blocks: updatedBlocks,
      metadata: {
        ...content.metadata,
        lastSaved: content.metadata.lastSaved
      }
    };

    updateContent(updatedContent);
  }, [content, updateContent]);

  // Force save (manual save)
  const forceSave = useCallback(() => {
    if (content && essayId) {
      // Clear any pending debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      saveContent(content);
    }
  }, [content, essayId, saveContent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    essay,
    content,
    loading,
    saving,
    lastSaved,
    hasUnsavedChanges,
    updateBlock,
    addBlock,
    removeBlock,
    changeBlockType,
    forceSave,
    // Computed values
    wordCount: content?.metadata.totalWordCount || 0,
    characterCount: content?.metadata.totalCharacterCount || 0
  };
};
