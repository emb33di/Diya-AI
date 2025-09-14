import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Focus from '@tiptap/extension-focus';
import Underline from '@tiptap/extension-underline';
import { CommentExtension, commentStyles, debugTextMatching } from './extensions/CommentExtension';
import TipTapToolbar from './TipTapToolbar';
import { Comment, CommentService } from '@/services/commentService';
import { supabase } from '@/integrations/supabase/client';
import { addParagraphIdsToDocument, documentHasParagraphIds } from '@/utils/proseMirrorUtils';

interface CommentableTipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  essayId: string;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  showToolbar?: boolean;
  onAIFeedback?: () => void;
  aiFeedbackDisabled?: boolean;
  onCommentHover?: (commentId: string | null) => void;
  onCommentSelect?: (commentId: string | null) => void;
  onCommentsChange?: (comments: Comment[]) => void;
  selectedCommentId?: string | null;
}

const CommentableTipTapEditor: React.FC<CommentableTipTapEditorProps> = ({
  content,
  onChange,
  essayId,
  placeholder = 'Start writing your essay here...',
  className = '',
  editable = true,
  showToolbar = true,
  onAIFeedback,
  aiFeedbackDisabled = false,
  onCommentHover,
  onCommentSelect,
  onCommentsChange,
  selectedCommentId
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionRange, setSelectionRange] = useState<{ from: number; to: number } | null>(null);
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Configure built-in extensions
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        // Use the built-in history
        history: {
          depth: 100,
        },
        // Ensure bold and italic use proper toggle behavior
        bold: {
          HTMLAttributes: {
            class: 'font-bold',
          },
        },
        italic: {
          HTMLAttributes: {
            class: 'italic',
          },
        },
        // Disable built-in strike and underline (to avoid conflicts)
        strike: false,
        underline: false,
      }),
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      CharacterCount.configure({
        limit: 10000, // Set a reasonable character limit
      }),
      Focus.configure({
        className: 'has-focus',
        mode: 'all',
      }),
      CommentExtension,
    ],
    content: content === '' ? '<p></p>' : content,
    editable: editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      
      // Ensure paragraph IDs are maintained during updates
      const doc = editor.state.doc;
      if (!documentHasParagraphIds(doc)) {
        console.log('Re-adding paragraph IDs after document update...');
        const tr = editor.state.tr;
        const trWithIds = addParagraphIdsToDocument(doc, tr);
        editor.view.dispatch(trWithIds);
      }
    },
    onCreate: ({ editor }) => {
      // NEW: Add paragraph IDs to the document for contextual anchoring
      const doc = editor.state.doc;
      if (!documentHasParagraphIds(doc)) {
        console.log('Adding paragraph IDs to document for contextual anchoring...');
        const tr = editor.state.tr;
        const trWithIds = addParagraphIdsToDocument(doc, tr);
        editor.view.dispatch(trWithIds);
        console.log('✅ Paragraph IDs added to document');
      } else {
        console.log('Document already has paragraph IDs');
      }
    },
    editorProps: {
      attributes: {
        class: `prose prose-gray max-w-none focus:outline-none ${className}`,
        style: 'white-space: pre-wrap;',
      },
    },
  });

  // Load comments when essay changes
  useEffect(() => {
    if (essayId) {
      loadComments();
    }
  }, [essayId]);

  // Set up real-time subscription for comments
  useEffect(() => {
    if (!essayId) return;

    const channel = supabase
      .channel(`essay-comments-${essayId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'essay_comments',
          filter: `essay_id=eq.${essayId}`
        },
        (payload) => {
          console.log('Comment change detected:', payload);
          // Reload comments when any change occurs
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [essayId]);

  // Handle comment hover from panel
  useEffect(() => {
    if (onCommentHover) {
      onCommentHover(hoveredCommentId);
    }
  }, [hoveredCommentId, onCommentHover]);

  // Update comment highlighting when selection changes
  useEffect(() => {
    if (editor && comments.length > 0) {
      // Remove all existing highlights
      editor.commands.clearComments();
      
      // Re-add all comments with updated selection state
      comments.forEach(comment => {
        editor.commands.addComment({
          text: comment.comment_text,
          type: comment.comment_type,
          aiGenerated: comment.ai_generated,
          resolved: comment.resolved,
          anchorText: comment.anchor_text,
          textSelection: comment.text_selection,
          selected: selectedCommentId === comment.id
        });
      });
    }
  }, [selectedCommentId, comments, editor]);

  // Load comments from database
  const loadComments = async () => {
    try {
      const essayComments = await CommentService.getCommentsForEssay(essayId);
      setComments(essayComments);
      
      // Update editor with comments
      if (editor && essayComments.length > 0) {
        essayComments.forEach(comment => {
          editor.commands.addComment({
            text: comment.comment_text,
            type: comment.comment_type,
            aiGenerated: comment.ai_generated,
            resolved: comment.resolved,
            anchorText: comment.anchor_text,
            paragraphId: comment.paragraph_id, // NEW: Map paragraph_id to paragraphId
            textSelection: comment.text_selection,
            selected: selectedCommentId === comment.id
          });
        });
      }
      
      if (onCommentsChange) {
        onCommentsChange(essayComments);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  // Handle text selection
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const selectedText = editor.state.doc.textBetween(from, to);
        setSelectedText(selectedText);
        setSelectionRange({ from, to });
        
        // Update comment extension with selection
        editor.commands.setSelectedText(selectedText, { from, to });
      } else {
        setSelectedText('');
        setSelectionRange(null);
        editor.commands.clearSelection();
      }
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor]);

  // Handle comment clicks
  useEffect(() => {
    if (!editorRef.current) return;

    const handleCommentClick = (event: CustomEvent) => {
      const { commentId } = event.detail;
      console.log('Comment clicked:', commentId);
      
      // Update comment selection state in the editor
      if (editor && editor.commands.setCommentSelection) {
        editor.commands.setCommentSelection(commentId);
      }
      
      onCommentSelect?.(commentId);
    };

    editorRef.current.addEventListener('comment-click', handleCommentClick as EventListener);
    
    return () => {
      editorRef.current?.removeEventListener('comment-click', handleCommentClick as EventListener);
    };
  }, [onCommentSelect, editor]);

  // Handle comment selection changes from external sources (like comment panel)
  useEffect(() => {
    if (editor && editor.commands.setCommentSelection) {
      if (selectedCommentId) {
        editor.commands.setCommentSelection(selectedCommentId);
      } else {
        editor.commands.setCommentSelection(null);
      }
    }
  }, [selectedCommentId, editor]);

  // Handle comment selection cleared events from editor
  useEffect(() => {
    const handleCommentSelectionCleared = () => {
      onCommentSelect?.(null);
    };

    window.addEventListener('comment-selection-cleared', handleCommentSelectionCleared);
    
    return () => {
      window.removeEventListener('comment-selection-cleared', handleCommentSelectionCleared);
    };
  }, [onCommentSelect]);

  // Handle paragraph highlighting when comment is selected
  useEffect(() => {
    if (!editorRef.current || !selectedCommentId) {
      // Clear all paragraph highlights
      const paragraphs = editorRef.current?.querySelectorAll('.paragraph-highlighted');
      paragraphs?.forEach(p => p.classList.remove('paragraph-highlighted'));
      return;
    }

    // Find the selected comment
    const selectedComment = comments.find(c => c.id === selectedCommentId);
    if (!selectedComment || selectedComment.paragraph_index === null) {
      return;
    }

    // Clear previous highlights
    const paragraphs = editorRef.current?.querySelectorAll('.paragraph-highlighted');
    paragraphs?.forEach(p => p.classList.remove('paragraph-highlighted'));

    // Highlight the paragraph
    const editorElement = editorRef.current?.querySelector('.ProseMirror');
    if (editorElement) {
      const paragraphs = editorElement.querySelectorAll('p');
      const targetParagraph = paragraphs[selectedComment.paragraph_index];
      if (targetParagraph) {
        targetParagraph.classList.add('paragraph-highlighted');
        // Scroll to the paragraph
        targetParagraph.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedCommentId, comments]);

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Ensure empty content is properly handled for placeholder display
      const contentToSet = content === '' ? '<p></p>' : content;
      editor.commands.setContent(contentToSet, false);
    }
  }, [content, editor]);

  // Handle comment changes
  const handleCommentsChange = (newComments: Comment[]) => {
    setComments(newComments);
    if (onCommentsChange) {
      onCommentsChange(newComments);
    }
  };

  // Expose debug function for testing (accessible via browser console)
  useEffect(() => {
    if (editor && typeof window !== 'undefined') {
      (window as any).debugTextMatching = (anchorText: string) => {
        debugTextMatching(editor.state.doc, anchorText);
      };
      (window as any).debugCommentHighlighting = () => {
        console.log('🔍 Debug Comment Highlighting');
        console.log('Comments:', comments);
        comments.forEach(comment => {
          console.log(`Comment ${comment.id}:`, {
            anchorText: comment.anchorText,
            paragraphIndex: comment.paragraph_index,
            textSelection: comment.textSelection
          });
        });
      };
    }
  }, [editor, comments]);

  // Add comment from external source (like CommentPanel)
  const addComment = async (commentText: string, commentType: 'suggestion' | 'critique' | 'praise' | 'question') => {
    if (!selectedText || !selectionRange) return;

    try {
      // Convert ProseMirror positions to TipTap positions
      const textSelection = {
        start: { pos: selectionRange.from, path: [0, 0] },
        end: { pos: selectionRange.to, path: [0, 0] }
      };

      const newComment = await CommentService.createComment({
        essayId,
        textSelection,
        anchorText: selectedText,
        commentText,
        commentType
      });

      // Add comment to editor
      if (editor) {
        editor.commands.addComment({
          text: commentText,
          type: commentType,
          aiGenerated: false,
          resolved: false,
          anchorText: selectedText,
          paragraphId: newComment.paragraph_id, // NEW: Include paragraph_id if available
          textSelection
        });
      }

      // Update comments list
      const updatedComments = [...comments, newComment];
      handleCommentsChange(updatedComments);

      // Clear selection
      setSelectedText('');
      setSelectionRange(null);
      if (editor) {
        editor.commands.clearSelection();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);

  if (!editor) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded mb-2 w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="tiptap-wrapper" ref={editorRef}>
      {/* Add comment styles */}
      <style>{commentStyles}</style>
      
      {/* Add paragraph highlighting styles */}
      <style>{`
        .paragraph-highlighted {
          background-color: rgba(59, 130, 246, 0.1) !important;
          border-left: 4px solid #3b82f6 !important;
          padding-left: 12px !important;
          border-radius: 4px !important;
          transition: all 0.3s ease !important;
        }
        
        .paragraph-highlighted:hover {
          background-color: rgba(59, 130, 246, 0.15) !important;
        }
      `}</style>
      
      {/* Toolbar */}
      {showToolbar && (
        <TipTapToolbar 
          editor={editor} 
          onAIFeedback={onAIFeedback}
          aiFeedbackDisabled={aiFeedbackDisabled}
        />
      )}
      
      {/* Editor Content */}
      <EditorContent 
        editor={editor} 
        className={`tiptap-content ${className} ${showToolbar ? 'with-toolbar' : ''}`}
      />
      
      {/* Selection Info (for debugging) */}
      {selectedText && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
          Selected: "{selectedText}" ({selectionRange?.from}-{selectionRange?.to})
        </div>
      )}
    </div>
  );
};

export default CommentableTipTapEditor;
