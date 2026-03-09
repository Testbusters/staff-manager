'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Heading2, Heading3, List, ListOrdered } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const BTN =
  'p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent active:bg-muted transition';
const BTN_ACTIVE = 'bg-muted text-foreground';
const SEP = 'w-px h-4 bg-border mx-1 self-center';

export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => onChange(e.getHTML()),
    editorProps: {
      attributes: {
        class:
          'min-h-[120px] px-3 py-2 text-sm text-foreground focus:outline-none',
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
    <div className="rounded-lg border border-border bg-muted overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 flex-wrap border-b border-border px-2 py-1.5">
        {/* Group 1: Bold, Italic */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
              className={`${BTN} ${editor.isActive('bold') ? BTN_ACTIVE : ''}`}
              aria-label="Grassetto"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Grassetto</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
              className={`${BTN} ${editor.isActive('italic') ? BTN_ACTIVE : ''}`}
              aria-label="Corsivo"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Corsivo</TooltipContent>
        </Tooltip>

        <span className={SEP} />

        {/* Group 2: Heading2, Heading3 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}
              className={`${BTN} ${editor.isActive('heading', { level: 2 }) ? BTN_ACTIVE : ''}`}
              aria-label="Titolo 2"
            >
              <Heading2 className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Titolo 2</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); }}
              className={`${BTN} ${editor.isActive('heading', { level: 3 }) ? BTN_ACTIVE : ''}`}
              aria-label="Titolo 3"
            >
              <Heading3 className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Titolo 3</TooltipContent>
        </Tooltip>

        <span className={SEP} />

        {/* Group 3: List, ListOrdered */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
              className={`${BTN} ${editor.isActive('bulletList') ? BTN_ACTIVE : ''}`}
              aria-label="Elenco puntato"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Elenco puntato</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
              className={`${BTN} ${editor.isActive('orderedList') ? BTN_ACTIVE : ''}`}
              aria-label="Elenco numerato"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Elenco numerato</TooltipContent>
        </Tooltip>
      </div>
      {/* Editor */}
      <EditorContent editor={editor} placeholder={placeholder} />
    </div>
  );
}
