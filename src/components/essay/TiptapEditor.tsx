import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';

interface TiptapEditorProps {
  content: string;
  placeholder?: string;
  onUpdate?: (content: string) => void;
  onBlur?: () => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  onPaste?: (event: React.ClipboardEvent) => boolean;
  className?: string;
  style?: React.CSSProperties;
}

export interface TiptapEditorRef {
  focus: () => void;
  setSelectionRange: (start: number, end: number) => void;
  getSelectionStart: () => number;
  getSelectionEnd: () => number;
  setCursorAtPosition: (position: number) => void; // New method for precise positioning
  getContentLength: () => number; // Get the actual text content length
}

const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(
  ({ content, placeholder, onUpdate, onBlur, onKeyDown, onPaste, className, style }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          // Disable ALL formatting features for plain text editing
          heading: false,
          bulletList: false,
          orderedList: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
          bold: false,        // Disable bold
          italic: false,      // Disable italic
          strike: false,      // Disable strikethrough
          code: false,        // Disable inline code
        }),
        Placeholder.configure({
          placeholder: placeholder || '',
        }),
        CharacterCount,
      ],
      content,
      onUpdate: ({ editor }) => {
        onUpdate?.(editor.getText());
      },
      onBlur: () => {
        onBlur?.();
      },
      editorProps: {
        attributes: {
          class: className || '',
          style: style ? Object.entries(style).map(([key, value]) => `${key}: ${value}`).join('; ') : '',
        },
        handleKeyDown: (view, event) => {
          // Convert ProseMirror event to React event for compatibility
          const reactEvent = {
            ...event,
            preventDefault: () => event.preventDefault(),
            stopPropagation: () => event.stopPropagation(),
            key: event.key,
            metaKey: event.metaKey,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
          } as unknown as React.KeyboardEvent;
          
          onKeyDown?.(reactEvent);
          return false; // Let Tiptap handle the event
        },
        handlePaste: (view, event) => {
          // Convert ProseMirror event to React event for compatibility
          const reactEvent = {
            ...event,
            preventDefault: () => event.preventDefault(),
            stopPropagation: () => event.stopPropagation(),
            clipboardData: event.clipboardData,
          } as unknown as React.ClipboardEvent;
          
          const handled = onPaste?.(reactEvent) ?? false;
          return handled; // Only prevent Tiptap's default behavior if we handled it
        },
      },
    });

    useImperativeHandle(ref, () => ({
      focus: () => {
        editor?.commands.focus();
      },
      setSelectionRange: (start: number, end: number) => {
        if (editor) {
          const doc = editor.state.doc;
          const startPos = Math.min(start, doc.content.size);
          const endPos = Math.min(end, doc.content.size);
          editor.commands.setTextSelection({ from: startPos, to: endPos });
        }
      },
      getSelectionStart: () => {
        return editor?.state.selection.from || 0;
      },
      getSelectionEnd: () => {
        return editor?.state.selection.to || 0;
      },
      setCursorAtPosition: (position: number) => {
        if (editor) {
          const doc = editor.state.doc;
          const pos = Math.min(position, doc.content.size);
          editor.commands.setTextSelection({ from: pos, to: pos });
          editor.commands.focus();
        }
      },
      getContentLength: () => {
        return editor?.state.doc.content.size || 0;
      },
    }), [editor]);

    // Update content when prop changes
    React.useEffect(() => {
      if (editor && editor.getText() !== content) {
        editor.commands.setContent(content);
      }
    }, [content, editor]);

    if (!editor) {
      return null;
    }

    return (
      <EditorContent 
        editor={editor} 
        ref={editorRef}
        className="min-h-[2.5rem] resize-none border-none shadow-none focus-visible:ring-0 text-base w-full"
      />
    );
  }
);

TiptapEditor.displayName = 'TiptapEditor';

export default TiptapEditor;
