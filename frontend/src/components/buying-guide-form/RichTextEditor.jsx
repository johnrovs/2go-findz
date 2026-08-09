import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { wordCount } from '../../utils/wordCount.js';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image as ImageIcon,
  Video,
  Link2,
  Undo2,
  Redo2,
} from 'lucide-react';

const BASE_EXTENSIONS = [
  StarterKit,
  Underline,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Link.configure({ openOnClick: false }),
];
const EXTENSIONS_WITH_IMAGE = [...BASE_EXTENSIONS, Image];

export { wordCount };

function ToolbarButton({ onClick, isActive, disabled, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={isActive}
      className={`rounded-btn p-1.5 hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40 ${isActive ? 'bg-primary/10 text-primary' : 'text-muted'}`}
    >
      {children}
    </button>
  );
}

function RichTextEditor({
  id,
  label,
  value,
  onChange,
  error,
  withUndoRedo = false,
  withImage = false,
  withVideoEmbedPlaceholders = false,
  compact = false,
}) {
  const editor = useEditor({
    extensions: withImage ? EXTENSIONS_WITH_IMAGE : BASE_EXTENSIONS,
    content: value,
    onUpdate: ({ editor: updatedEditor }) => onChange(updatedEditor.getHTML()),
  });

  if (!editor) return null;

  function handleSetLink() {
    const url = window.prompt('Enter a URL');
    if (!url) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  function handleAddImage() {
    const url = window.prompt('Enter an image URL');
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  }

  return (
    <div>
      {id ? (
        <label htmlFor={id} className="mb-1 block text-small font-medium text-body">
          {label}
        </label>
      ) : (
        <span className="mb-1 block text-small font-medium text-body">{label}</span>
      )}
      <div id={id} className="rounded-btn border border-border">
        <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
          {withUndoRedo && (
            <>
              <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} label="Undo">
                <Undo2 size={16} />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} label="Redo">
                <Redo2 size={16} />
              </ToolbarButton>
            </>
          )}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} label="Bold">
            <Bold size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} label="Italic">
            <Italic size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            label="Underline"
          >
            <UnderlineIcon size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            label="Bullet list"
          >
            <List size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            label="Numbered list"
          >
            <ListOrdered size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            label="Align left"
          >
            <AlignLeft size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            label="Align center"
          >
            <AlignCenter size={16} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            label="Align right"
          >
            <AlignRight size={16} />
          </ToolbarButton>
          <button type="button" onClick={handleSetLink} aria-label="Insert link" className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary">
            <LinkIcon size={16} />
          </button>
          {withImage && (
            <button
              type="button"
              onClick={handleAddImage}
              aria-label="Insert image"
              className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary"
            >
              <ImageIcon size={16} />
            </button>
          )}
          {withVideoEmbedPlaceholders && (
            <>
              {/* Visual-only for now; real video/embed support needs its own TipTap extension. */}
              <button type="button" aria-label="Insert video" className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary">
                <Video size={16} />
              </button>
              <button type="button" aria-label="Insert embed" className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary">
                <Link2 size={16} />
              </button>
            </>
          )}
        </div>
        <EditorContent
          editor={editor}
          className={
            compact
              ? 'prose max-w-none px-3 py-2 text-slate-900 [&_.ProseMirror]:min-h-[120px] [&_.ProseMirror]:outline-none'
              : 'prose max-w-none px-3 py-2 text-slate-900 [&_.ProseMirror]:min-h-[160px] [&_.ProseMirror]:outline-none'
          }
        />
      </div>
      <p className="mt-1 text-right text-sm text-muted">Words: {wordCount(value)}</p>
      {error && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export default RichTextEditor;
