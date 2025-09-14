import React, { useState } from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Type,
  Bot,
  Plus
} from 'lucide-react';

interface TipTapToolbarProps {
  editor: Editor | null;
  className?: string;
  onAIFeedback?: () => void;
  aiFeedbackDisabled?: boolean;
}

// Custom hook to force re-render when editor state changes
const useEditorState = (editor: Editor | null) => {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  React.useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      forceUpdate();
    };

    editor.on('selectionUpdate', handleUpdate);
    editor.on('transaction', handleUpdate);

    return () => {
      editor.off('selectionUpdate', handleUpdate);
      editor.off('transaction', handleUpdate);
    };
  }, [editor]);
};

const TipTapToolbar: React.FC<TipTapToolbarProps> = ({ 
  editor, 
  className = '',
  onAIFeedback,
  aiFeedbackDisabled = false
}) => {
  // Force re-render when editor state changes
  useEditorState(editor);

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    disabled = false, 
    children, 
    title 
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      variant={isActive ? "default" : "ghost"}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`h-8 w-8 p-0 ${isActive ? 'bg-primary text-primary-foreground' : ''}`}
    >
      {children}
    </Button>
  );

  return (
    <div className={`flex items-center space-x-1 p-3 border-b bg-gray-50/50 rounded-t-lg mb-2 ${className}`}>
      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Y)"
      >
        <Redo className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-2" />

      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-2" />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().setParagraph().run()}
        isActive={editor.isActive('paragraph')}
        title="Normal Text"
      >
        <Type className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-2" />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-2" />

      {/* Blockquote */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-2" />

      {/* New Paragraph Button */}
      <ToolbarButton
        onClick={() => {
          // Create a new paragraph using TipTap's built-in command
          editor.chain().focus().splitBlock().run()
        }}
        title="New Paragraph (Create new paragraph)"
      >
        <Plus className="h-4 w-4" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-2" />

      {/* AI Feedback Button */}
      {onAIFeedback && (
        <ToolbarButton
          onClick={onAIFeedback}
          disabled={aiFeedbackDisabled}
          title="AI Essay Feedback"
        >
          <Bot className="h-4 w-4" />
        </ToolbarButton>
      )}

      {/* Word count display */}
      <div className="ml-auto text-xs text-gray-500 px-2">
        {editor.storage.characterCount?.words?.() || 0} words
      </div>
    </div>
  );
};

export default TipTapToolbar;
