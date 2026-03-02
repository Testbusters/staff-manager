'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const BTN =
  'px-2 py-1 text-xs rounded text-gray-400 hover:text-gray-200 hover:bg-gray-700 active:bg-gray-600 transition';
const BTN_ACTIVE = 'bg-gray-600 text-gray-100';

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
    ],
    content: value,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class:
          'min-h-[120px] px-3 py-2 text-sm text-gray-200 focus:outline-none',
      },
    },
  });

  // Sync external value changes (edit mode load)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 overflow-hidden">
      {/* Toolbar */}
      <div className="flex gap-1 flex-wrap border-b border-gray-700 px-2 py-1.5">
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
          className={`${BTN} ${editor.isActive('bold') ? BTN_ACTIVE : ''}`}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
          className={`${BTN} ${editor.isActive('italic') ? BTN_ACTIVE : ''}`}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}
          className={`${BTN} ${editor.isActive('heading', { level: 2 }) ? BTN_ACTIVE : ''}`}
        >
          H2
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); }}
          className={`${BTN} ${editor.isActive('heading', { level: 3 }) ? BTN_ACTIVE : ''}`}
        >
          H3
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
          className={`${BTN} ${editor.isActive('bulletList') ? BTN_ACTIVE : ''}`}
        >
          •
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
          className={`${BTN} ${editor.isActive('orderedList') ? BTN_ACTIVE : ''}`}
        >
          1.
        </button>
      </div>
      {/* Editor */}
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
}
