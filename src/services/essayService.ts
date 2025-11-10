import { supabase } from '@/integrations/supabase/client';

// Utility functions for content conversion
export const convertHTMLToBlocks = (html: string): EssayBlock[] => {
  // For now, store HTML as a single block
  // Later we can parse HTML into proper blocks
  return [{
    id: `block_${Date.now()}`,
    type: 'paragraph',
    content: html,
    metadata: {
      wordCount: countWordsInHTML(html),
      lastModified: new Date().toISOString()
    }
  }];
};

export const convertBlocksToHTML = (blocks: EssayBlock[]): string => {
  if (!blocks || blocks.length === 0) return '<p></p>';
  
  // Check if all blocks are empty
  const hasContent = blocks.some(block => block.content && block.content.trim().length > 0);
  if (!hasContent) return '<p></p>';
  
  // If the first block contains HTML tags, return it as is
  const firstBlockContent = blocks[0]?.content || '';
  if (firstBlockContent.includes('<') && firstBlockContent.includes('>')) {
    return firstBlockContent;
  }
  // Otherwise, wrap plain text in paragraph tags
  return blocks.map(block => `<p>${block.content}</p>`).join('');
};

export const countWordsInHTML = (html: string): number => {
  // Strip HTML tags and count words
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').filter(word => word.length > 0).length : 0;
};

export const countCharactersInHTML = (html: string): number => {
  // Strip HTML tags and count characters
  const text = html.replace(/<[^>]*>/g, '');
  return text.length;
};

// Types
export interface EssayBlock {
  id: string;
  type: 'paragraph' | 'heading' | 'quote';
  content: string;
  metadata?: {
    wordCount?: number;
    lastModified?: string;
  };
}

export interface EssayContent {
  blocks: EssayBlock[];
  metadata: {
    totalWordCount: number;
    totalCharacterCount: number;
    lastSaved: string;
  };
}

export interface Essay {
  id: string;
  user_id: string;
  title: string;
  content: EssayContent;
  prompt_id?: string;
  school_name?: string;
  word_count: number;
  character_count: number;
  status: 'draft' | 'review' | 'final' | 'submitted';
  last_saved_at: string;
  created_at: string;
  updated_at: string;
  prompt_text?: string;
  word_limit?: string;
}

export interface CreateEssayData {
  title: string;
  prompt_id?: string;
  school_name?: string;
  initial_content?: string;
  prompt_text?: string;
  word_limit?: string;
}

export class EssayService {
  // Create new essay
  static async createEssay(data: CreateEssayData): Promise<Essay> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const initialContent: EssayContent = {
      blocks: data.initial_content ? [
        {
          id: `block_${Date.now()}`,
          type: 'paragraph',
          content: data.initial_content,
          metadata: {
            wordCount: data.initial_content.split(' ').filter(w => w.length > 0).length,
            lastModified: new Date().toISOString()
          }
        }
      ] : [
        {
          id: `block_${Date.now()}`,
          type: 'paragraph',
          content: '',
          metadata: {
            wordCount: 0,
            lastModified: new Date().toISOString()
          }
        }
      ],
      metadata: {
        totalWordCount: data.initial_content?.split(' ').filter(w => w.length > 0).length || 0,
        totalCharacterCount: data.initial_content?.length || 0,
        lastSaved: new Date().toISOString()
      }
    };

    const { data: essay, error } = await supabase
      .from('essays')
      .insert({
        user_id: user.id,
        title: data.title,
        content: initialContent,
        prompt_id: data.prompt_id,
        school_name: data.school_name,
        word_count: initialContent.metadata.totalWordCount,
        character_count: initialContent.metadata.totalCharacterCount,
        prompt_text: data.prompt_text,
        word_limit: data.word_limit
      })
      .select()
      .single();

    if (error) throw error;
    return essay;
  }

  // Get essay by ID
  static async getEssay(essayId: string): Promise<Essay> {
    const { data: essay, error } = await supabase
      .from('essays')
      .select('*')
      .eq('id', essayId)
      .single();

    if (error) throw error;
    return essay;
  }

  // Get all essays for current user
  static async getUserEssays(): Promise<Essay[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: essays, error } = await supabase
      .from('essays')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return essays || [];
  }

  // Get essays for a specific school
  static async getEssaysForSchool(schoolName: string): Promise<Essay[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: essays, error } = await supabase
      .from('essays')
      .select('*')
      .eq('user_id', user.id)
      .eq('school_name', schoolName)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return essays || [];
  }

  // Save essay content (auto-save)
  static async saveEssayContent(essayId: string, content: EssayContent): Promise<void> {
    const updatedContent = {
      ...content,
      metadata: {
        ...content.metadata,
        lastSaved: new Date().toISOString()
      }
    };

    const { error } = await supabase
      .from('essays')
      .update({
        content: updatedContent,
        word_count: updatedContent.metadata.totalWordCount,
        character_count: updatedContent.metadata.totalCharacterCount,
        last_saved_at: new Date().toISOString()
      })
      .eq('id', essayId);

    if (error) throw error;
  }

  // Update essay title
  static async updateEssayTitle(essayId: string, title: string): Promise<void> {
    const { error } = await supabase
      .from('essays')
      .update({ title })
      .eq('id', essayId);

    if (error) throw error;
  }

  // Update essay prompt text (for custom essays)
  static async updateEssayPrompt(essayId: string, promptText: string, wordLimit?: string): Promise<void> {
    const updateData: any = { prompt_text: promptText };
    if (wordLimit !== undefined) {
      updateData.word_limit = wordLimit;
    }
    
    const { error } = await supabase
      .from('essays')
      .update(updateData)
      .eq('id', essayId);

    if (error) throw error;
  }

  // Update essay status
  static async updateEssayStatus(essayId: string, status: Essay['status']): Promise<void> {
    const { error } = await supabase
      .from('essays')
      .update({ status })
      .eq('id', essayId);

    if (error) throw error;
  }

  // Delete essay
  static async deleteEssay(essayId: string): Promise<void> {
    const { error } = await supabase
      .from('essays')
      .delete()
      .eq('id', essayId);

    if (error) throw error;
  }

  // Get essay versions (revision history)
  static async getEssayVersions(essayId: string) {
    const { data: versions, error } = await supabase
      .from('essay_versions')
      .select('*')
      .eq('essay_id', essayId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return versions || [];
  }

  // Utility functions
  static calculateWordCount(content: EssayContent): number {
    return content.blocks.reduce((total, block) => {
      const words = block.content.split(' ').filter(word => word.trim().length > 0);
      return total + words.length;
    }, 0);
  }

  static calculateCharacterCount(content: EssayContent): number {
    return content.blocks.reduce((total, block) => total + block.content.length, 0);
  }

  static updateContentCounts(content: EssayContent): EssayContent {
    const updatedBlocks = content.blocks.map(block => ({
      ...block,
      metadata: {
        ...block.metadata,
        wordCount: block.content.split(' ').filter(w => w.length > 0).length,
        lastModified: new Date().toISOString()
      }
    }));

    return {
      blocks: updatedBlocks,
      metadata: {
        ...content.metadata,
        totalWordCount: this.calculateWordCount({ ...content, blocks: updatedBlocks }),
        totalCharacterCount: this.calculateCharacterCount({ ...content, blocks: updatedBlocks }),
        lastSaved: new Date().toISOString()
      }
    };
  }
}
