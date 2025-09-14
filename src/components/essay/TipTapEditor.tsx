import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Focus from '@tiptap/extension-focus';
import Underline from '@tiptap/extension-underline';
import TipTapToolbar from './TipTapToolbar';

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  showToolbar?: boolean;
}

const TipTapEditor: React.FC<TipTapEditorProps> = ({
  content,
  onChange,
  placeholder = 'Start writing your essay here...',
  className = '',
  editable = true,
  showToolbar = true
}) => {
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
        // Disable built-in strike (which might conflict with underline)
        strike: false,
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
    ],
    content: content === '' ? '<p></p>' : content,
    editable: editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: `prose prose-gray max-w-none focus:outline-none ${className}`,
        style: 'white-space: pre-wrap;',
      },
    },
  });

  // Update editor content when prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // Ensure empty content is properly handled for placeholder display
      const contentToSet = content === '' ? '<p></p>' : content;
      editor.commands.setContent(contentToSet, false);
    }
  }, [content, editor]);



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
    <div className="tiptap-wrapper">
      {/* Toolbar */}
      {showToolbar && <TipTapToolbar editor={editor} />}
      
      {/* Editor Content */}
      <EditorContent 
        editor={editor} 
        className={`tiptap-content ${className} ${showToolbar ? 'with-toolbar' : ''}`}
      />
    </div>
  );
};

export default TipTapEditor;
