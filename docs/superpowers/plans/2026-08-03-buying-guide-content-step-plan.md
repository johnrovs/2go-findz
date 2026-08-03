# Buying Guide — Content Step (Step 6) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Step 6 ("Buying Guide") section-based rich-text content
editor described in
`docs/superpowers/specs/2026-08-03-buying-guide-content-step-design.md`.

**Architecture:** Step 6 is a dedicated, richer editor for the custom
(`sectionKey === null`) entries already inside the `tocEntries` array that
`BuyingGuideForm.jsx`/`TocBuilder.jsx` manage today — not a new backend
model. A shared `RichTextEditor` is extracted from the two existing
near-duplicate TipTap wrappers and reused for the new step. `LivePreview.jsx`
gains real rendering for custom section content (previously dropped
entirely) with client-side-only anchor links.

**Tech Stack:** React 18 (Vite), Tailwind, `@dnd-kit` (already used
throughout this form), TipTap (already used for two other editors),
Vitest + React Testing Library.

## Global Constraints

- No backend changes. `BuyingGuideTocEntry`, its DTOs, `HtmlSanitizer`, and
  `BuyingGuideServiceImpl`'s replace-all persistence already fully support
  this feature (see design doc "Backend reality").
- Section title max length: 150 chars (`@Column(length = 150)` /
  `@Size(max = 150)` on the backend — matches `RecommendationBadgeField`'s
  100-char convention scaled to the backend's actual column size).
- `IntroductionEditor.jsx` and `RecommendationContentEditor.jsx` must keep
  their exact current external props and rendered behavior after being
  refactored to use the new shared `RichTextEditor` — their existing test
  files (`IntroductionEditor.test.jsx`, `RecommendationContentEditor.test.jsx`)
  must pass unmodified.
- Anchors are client-side/preview-only — nothing new is sent to the backend.
- Do not touch FAQs, SEO & Publish, or the real public-facing
  `BuyingGuideDetailPage.jsx` (documented as out of scope in the design doc).
- Match established codebase conventions exactly: `@dnd-kit` sortable
  pattern with Move Up/Down keyboard fallback, `ConfirmDialog`/`EmptyState`
  reuse, always-editable inline inputs (no click-to-edit toggle), stable
  `clientId`s (never array indexes) for list identity.

---

### Task 1: Extract `frontend/src/utils/slugify.js`

**Files:**
- Create: `frontend/src/utils/slugify.js`
- Create: `frontend/src/utils/slugify.test.js`
- Modify: `frontend/src/components/BuyingGuideForm.jsx:14-20` (remove the
  local `slugify` function, import the extracted one instead)

**Interfaces:**
- Produces: `slugify(text: string): string` — lowercases, trims, replaces
  runs of non-alphanumeric characters with `-`, strips leading/trailing
  `-`. `uniqueSlug(text: string, usedSlugs: Set<string>): string` — calls
  `slugify`, falls back to `'section'` if the result is empty, then
  appends `-2`, `-3`, ... until the candidate isn't in `usedSlugs`, adds
  the final candidate to `usedSlugs`, and returns it. Task 6 (`LivePreview.jsx`)
  consumes `uniqueSlug` for anchor generation.

- [ ] **Step 1: Write the failing tests**

```js
// frontend/src/utils/slugify.test.js
import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug } from './slugify.js';

describe('slugify', () => {
  it('lowercases and hyphenates a title', () => {
    expect(slugify('How We Tested')).toBe('how-we-tested');
  });

  it('strips non-alphanumeric characters', () => {
    expect(slugify("What's the Best Budget Pick?")).toBe('what-s-the-best-budget-pick');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  --Extra Spaces--  ')).toBe('extra-spaces');
  });

  it('returns an empty string for input with no alphanumeric characters', () => {
    expect(slugify('!!!')).toBe('');
  });
});

describe('uniqueSlug', () => {
  it('returns the plain slug the first time it is used', () => {
    const used = new Set();
    expect(uniqueSlug('How We Tested', used)).toBe('how-we-tested');
  });

  it('appends a numeric suffix on collision', () => {
    const used = new Set(['how-we-tested']);
    expect(uniqueSlug('How We Tested', used)).toBe('how-we-tested-2');
  });

  it('keeps incrementing the suffix past the first collision', () => {
    const used = new Set(['how-we-tested', 'how-we-tested-2']);
    expect(uniqueSlug('How We Tested', used)).toBe('how-we-tested-3');
  });

  it('adds the returned slug to the used set', () => {
    const used = new Set();
    uniqueSlug('How We Tested', used);
    expect(used.has('how-we-tested')).toBe(true);
  });

  it('falls back to "section" when the title has no alphanumeric characters', () => {
    const used = new Set();
    expect(uniqueSlug('???', used)).toBe('section');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/utils/slugify.test.js`
Expected: FAIL with "Failed to resolve import ./slugify.js" (module doesn't exist yet).

- [ ] **Step 3: Write the implementation**

```js
// frontend/src/utils/slugify.js
export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function uniqueSlug(text, usedSlugs) {
  const base = slugify(text) || 'section';
  let candidate = base;
  let suffix = 2;
  while (usedSlugs.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  usedSlugs.add(candidate);
  return candidate;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/utils/slugify.test.js`
Expected: PASS, 9 tests.

- [ ] **Step 5: Refactor `BuyingGuideForm.jsx` to use the extracted helper**

Replace the local function (lines 14-20):

```js
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

with an import at the top of the file (after the existing imports):

```js
import { slugify } from '../utils/slugify.js';
```

- [ ] **Step 6: Run the full BuyingGuideForm test suite to confirm no regression**

Run: `cd frontend && npx vitest run src/components/BuyingGuideForm.test.jsx`
Expected: PASS, all existing tests including "auto-derives the slug from the title until the slug is hand-edited".

- [ ] **Step 7: Commit**

```bash
git add frontend/src/utils/slugify.js frontend/src/utils/slugify.test.js frontend/src/components/BuyingGuideForm.jsx
git commit -m "refactor(buying-guides): extract shared slugify utility"
```

---

### Task 2: Extract shared `RichTextEditor.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/RichTextEditor.jsx`
- Create: `frontend/src/components/buying-guide-form/RichTextEditor.test.jsx`
- Modify: `frontend/src/components/buying-guide-form/IntroductionEditor.jsx` (full rewrite, thinner)
- Modify: `frontend/src/components/buying-guide-form/RecommendationContentEditor.jsx` (full rewrite, thinner)

**Interfaces:**
- Produces: `RichTextEditor({ id?, label, value, onChange, error, withUndoRedo?, withImage?, withVideoEmbedPlaceholders?, compact? })`
  — default export. Also a **named** export `wordCount(html: string): number`,
  reused by Task 6 (`LivePreview.jsx`) instead of duplicating a 4th copy of
  the same one-liner.
- Consumes: nothing new — same TipTap packages (`@tiptap/react`,
  `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`,
  `@tiptap/extension-underline`, `@tiptap/extension-text-align`) already
  used by both editors being refactored.

- [ ] **Step 1: Write the failing tests**

```jsx
// frontend/src/components/buying-guide-form/RichTextEditor.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RichTextEditor, { wordCount } from './RichTextEditor.jsx';

describe('wordCount', () => {
  it('counts words in plain HTML', () => {
    expect(wordCount('<p>Hello world</p>')).toBe(2);
  });

  it('returns 0 for empty content', () => {
    expect(wordCount('')).toBe(0);
  });
});

describe('RichTextEditor', () => {
  it('renders existing content', () => {
    render(<RichTextEditor label="Section Content" value="<p>Hello world</p>" onChange={vi.fn()} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('shows a word count derived from the content', () => {
    render(<RichTextEditor label="Section Content" value="<p>Hello world</p>" onChange={vi.fn()} />);
    expect(screen.getByText('Words: 2')).toBeInTheDocument();
  });

  it('shows 0 words for empty content', () => {
    render(<RichTextEditor label="Section Content" value="" onChange={vi.fn()} />);
    expect(screen.getByText('Words: 0')).toBeInTheDocument();
  });

  it('shows a validation error when provided', () => {
    render(<RichTextEditor label="Section Content" value="" onChange={vi.fn()} error="Content is required." />);
    expect(screen.getByText('Content is required.')).toBeInTheDocument();
  });

  it('renders the label as plain text when no id is provided', () => {
    const { container } = render(<RichTextEditor label="Section Content" value="" onChange={vi.fn()} />);
    expect(screen.queryByText('Section Content')?.tagName).toBe('SPAN');
    expect(container.querySelector('label')).not.toBeInTheDocument();
  });

  it('renders an associated label when an id is provided', () => {
    render(<RichTextEditor id="why-1" label="Why We Recommend It" value="" onChange={vi.fn()} />);
    expect(screen.getByText('Why We Recommend It').tagName).toBe('LABEL');
  });

  it('always renders the base formatting toolbar', () => {
    render(<RichTextEditor label="Section Content" value="" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Italic' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Underline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bullet list' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Numbered list' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Align left' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert link' })).toBeInTheDocument();
  });

  it('omits Undo/Redo, Insert image, and Insert video/embed by default', () => {
    render(<RichTextEditor label="Section Content" value="" onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Redo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Insert image' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Insert video' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Insert embed' })).not.toBeInTheDocument();
  });

  it('renders Undo/Redo when withUndoRedo is set', () => {
    render(<RichTextEditor label="Section Content" value="" onChange={vi.fn()} withUndoRedo />);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeInTheDocument();
  });

  it('renders Insert image when withImage is set', () => {
    render(<RichTextEditor label="Section Content" value="" onChange={vi.fn()} withImage />);
    expect(screen.getByRole('button', { name: 'Insert image' })).toBeInTheDocument();
  });

  it('renders Insert video and Insert embed when withVideoEmbedPlaceholders is set', () => {
    render(<RichTextEditor label="Section Content" value="" onChange={vi.fn()} withVideoEmbedPlaceholders />);
    expect(screen.getByRole('button', { name: 'Insert video' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert embed' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/RichTextEditor.test.jsx`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
// frontend/src/components/buying-guide-form/RichTextEditor.jsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
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

export function wordCount(html) {
  const text = html.replace(/<[^>]*>/g, ' ').trim();
  return text ? text.split(/\s+/).length : 0;
}

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/RichTextEditor.test.jsx`
Expected: PASS, 14 tests.

- [ ] **Step 5: Refactor `IntroductionEditor.jsx` to a thin wrapper**

Replace the entire file:

```jsx
// frontend/src/components/buying-guide-form/IntroductionEditor.jsx
import RichTextEditor from './RichTextEditor.jsx';

function IntroductionEditor({ value, onChange, error }) {
  return (
    <RichTextEditor label="Introduction" value={value} onChange={onChange} error={error} withImage withVideoEmbedPlaceholders />
  );
}

export default IntroductionEditor;
```

- [ ] **Step 6: Refactor `RecommendationContentEditor.jsx` to a thin wrapper**

Replace the entire file:

```jsx
// frontend/src/components/buying-guide-form/RecommendationContentEditor.jsx
import RichTextEditor from './RichTextEditor.jsx';

function RecommendationContentEditor({ id, value, onChange, error }) {
  return <RichTextEditor id={id} label="Why We Recommend It" value={value} onChange={onChange} error={error} withUndoRedo compact />;
}

export default RecommendationContentEditor;
```

- [ ] **Step 7: Run both editors' existing test suites to confirm zero regression**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/IntroductionEditor.test.jsx src/components/buying-guide-form/RecommendationContentEditor.test.jsx`
Expected: PASS — every existing test in both files, unmodified.

- [ ] **Step 8: Run the full frontend suite as an extra guard**

Run: `cd frontend && npx vitest run`
Expected: PASS — nothing else imports these two editors in a way that would break (`BasicInfoStep.jsx`, `TopPickSection.jsx`, `RunnerUpEditorCard.jsx` all consume them by their existing prop contracts, which are unchanged).

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/buying-guide-form/RichTextEditor.jsx \
        frontend/src/components/buying-guide-form/RichTextEditor.test.jsx \
        frontend/src/components/buying-guide-form/IntroductionEditor.jsx \
        frontend/src/components/buying-guide-form/RecommendationContentEditor.jsx
git commit -m "refactor(buying-guides): extract shared RichTextEditor from Introduction/Recommendation editors"
```

---

### Task 3: `DeleteContentSectionDialog.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/DeleteContentSectionDialog.jsx`
- Create: `frontend/src/components/buying-guide-form/DeleteContentSectionDialog.test.jsx`

**Interfaces:**
- Produces: `DeleteContentSectionDialog({ section, onConfirm, onCancel })` —
  `section` is either `null` (dialog closed) or a `{clientId, title, content, ...}`
  custom entry (dialog open). Default export.
- Consumes: `ConfirmDialog` (`frontend/src/components/ConfirmDialog.jsx`) —
  `{isOpen, title, message, confirmLabel, isDestructive, onConfirm, onCancel}`.

- [ ] **Step 1: Write the failing tests**

```jsx
// frontend/src/components/buying-guide-form/DeleteContentSectionDialog.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DeleteContentSectionDialog from './DeleteContentSectionDialog.jsx';

describe('DeleteContentSectionDialog', () => {
  it('is not visible when section is null', () => {
    render(<DeleteContentSectionDialog section={null} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('shows the section title in the confirmation message', () => {
    render(
      <DeleteContentSectionDialog
        section={{ clientId: 'c1', title: 'How We Tested', content: '<p>Text</p>' }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/"How We Tested"/)).toBeInTheDocument();
  });

  it('falls back to "Untitled Section" when the title is blank', () => {
    render(
      <DeleteContentSectionDialog section={{ clientId: 'c1', title: '', content: '<p>Text</p>' }} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText(/"Untitled Section"/)).toBeInTheDocument();
  });

  it('calls onConfirm when Delete Section is clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <DeleteContentSectionDialog
        section={{ clientId: 'c1', title: 'How We Tested', content: '<p>Text</p>' }}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete Section' }));

    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <DeleteContentSectionDialog
        section={{ clientId: 'c1', title: 'How We Tested', content: '<p>Text</p>' }}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/DeleteContentSectionDialog.test.jsx`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
// frontend/src/components/buying-guide-form/DeleteContentSectionDialog.jsx
import ConfirmDialog from '../ConfirmDialog.jsx';

function DeleteContentSectionDialog({ section, onConfirm, onCancel }) {
  return (
    <ConfirmDialog
      isOpen={Boolean(section)}
      title="Delete Section?"
      message={
        section
          ? `"${section.title || 'Untitled Section'}" has content. This will permanently delete the section and its content.`
          : ''
      }
      confirmLabel="Delete Section"
      isDestructive
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

export default DeleteContentSectionDialog;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/DeleteContentSectionDialog.test.jsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/DeleteContentSectionDialog.jsx \
        frontend/src/components/buying-guide-form/DeleteContentSectionDialog.test.jsx
git commit -m "feat(buying-guides): add DeleteContentSectionDialog"
```

---

### Task 4: `ContentSectionEditorCard.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/ContentSectionEditorCard.jsx`
- Create: `frontend/src/components/buying-guide-form/ContentSectionEditorCard.test.jsx`

**Interfaces:**
- Produces: `ContentSectionEditorCard({ entry, index, total, onFieldChange,
  onToggleVisible, onRequestDelete, onMoveUp, onMoveDown, isExpanded,
  onToggleExpanded, titleError, contentError })` — default export, renders
  as an `<li>` (parent supplies `<ul>`/`SortableContext`), matching the
  `RunnerUpEditorCard`/`TocRow` convention.
  - `entry`: `{clientId, sectionKey: null, title, content, visible}`.
  - `onFieldChange(clientId, field, value)`, `onToggleVisible(clientId)`,
    `onRequestDelete(entry)`, `onMoveUp(index)`, `onMoveDown(index)`,
    `onToggleExpanded(clientId)`.
  - `titleError`/`contentError`: strings or `undefined`.
- Consumes: `RichTextEditor` (Task 2), `useSortable`/`CSS` from
  `@dnd-kit/sortable`/`@dnd-kit/utilities` (established pattern).

- [ ] **Step 1: Write the failing tests**

```jsx
// frontend/src/components/buying-guide-form/ContentSectionEditorCard.test.jsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ContentSectionEditorCard from './ContentSectionEditorCard.jsx';

function renderCard(overrides = {}) {
  const entry = { clientId: 'c1', sectionKey: null, title: 'How We Tested', content: '<p>We tested every product.</p>', visible: true };
  const props = {
    entry,
    index: 0,
    total: 2,
    onFieldChange: vi.fn(),
    onToggleVisible: vi.fn(),
    onRequestDelete: vi.fn(),
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    isExpanded: false,
    onToggleExpanded: vi.fn(),
    titleError: undefined,
    contentError: undefined,
    ...overrides,
  };
  return { ...render(<ul><ContentSectionEditorCard {...props} /></ul>), props };
}

describe('ContentSectionEditorCard', () => {
  it('shows the position number and title', () => {
    renderCard();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('How We Tested')).toBeInTheDocument();
  });

  it('does not render the rich text editor when collapsed', () => {
    renderCard({ isExpanded: false });
    expect(screen.queryByText(/words:/i)).not.toBeInTheDocument();
  });

  it('renders the rich text editor when expanded', () => {
    renderCard({ isExpanded: true });
    expect(screen.getByText(/we tested every product/i)).toBeInTheDocument();
  });

  it('calls onFieldChange when the title is edited', async () => {
    const user = userEvent.setup();
    const { props } = renderCard();

    await user.type(screen.getByDisplayValue('How We Tested'), '!');

    expect(props.onFieldChange).toHaveBeenCalledWith('c1', 'title', 'How We Tested!');
  });

  it('calls onToggleExpanded when the expand/collapse button is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderCard();

    await user.click(screen.getByRole('button', { name: /expand how we tested/i }));

    expect(props.onToggleExpanded).toHaveBeenCalledWith('c1');
  });

  it('calls onToggleVisible when the visibility switch is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderCard();

    await user.click(screen.getByRole('switch'));

    expect(props.onToggleVisible).toHaveBeenCalledWith('c1');
  });

  it('calls onRequestDelete with the entry when delete is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderCard();

    await user.click(screen.getByRole('button', { name: /delete how we tested/i }));

    expect(props.onRequestDelete).toHaveBeenCalledWith(props.entry);
  });

  it('disables Move up on the first item and Move down on the last item', () => {
    renderCard({ index: 0, total: 2 });
    expect(screen.getByRole('button', { name: /move how we tested up/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /move how we tested down/i })).toBeEnabled();
  });

  it('shows a title validation error', () => {
    renderCard({ titleError: 'Section title is required.' });
    expect(screen.getByText('Section title is required.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/ContentSectionEditorCard.test.jsx`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
// frontend/src/components/buying-guide-form/ContentSectionEditorCard.jsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, GripVertical, Trash2 } from 'lucide-react';
import RichTextEditor from './RichTextEditor.jsx';

function ContentSectionEditorCard({
  entry,
  index,
  total,
  onFieldChange,
  onToggleVisible,
  onRequestDelete,
  onMoveUp,
  onMoveDown,
  isExpanded,
  onToggleExpanded,
  titleError,
  contentError,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: entry.clientId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const label = entry.title || 'Untitled Section';
  const titleFieldId = `content-section-title-${entry.clientId}`;
  const contentFieldId = `content-section-body-${entry.clientId}`;

  return (
    <li ref={setNodeRef} style={style} className="rounded-btn border border-border bg-white">
      <div className="flex items-center gap-3 p-4">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${label}`}
          className="cursor-grab rounded-btn p-1 text-muted hover:bg-surface-secondary active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {index + 1}
        </span>
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            aria-label={`Move ${label} up`}
            className="rounded-btn p-1 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={index === total - 1}
            aria-label={`Move ${label} down`}
            className="rounded-btn p-1 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowDown size={14} />
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor={titleFieldId} className="sr-only">
            Section title
          </label>
          <input
            id={titleFieldId}
            type="text"
            maxLength={150}
            value={entry.title}
            onChange={(event) => onFieldChange(entry.clientId, 'title', event.target.value)}
            placeholder="Section title"
            aria-invalid={Boolean(titleError)}
            aria-describedby={titleError ? `${titleFieldId}-error` : undefined}
            className="w-full rounded-btn border border-border px-2 py-1.5 text-sm font-medium text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {titleError && (
            <p id={`${titleFieldId}-error`} role="alert" className="mt-1 text-xs text-danger">
              {titleError}
            </p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={entry.visible}
          aria-label={entry.visible ? `Hide ${label} from the published guide` : `Show ${label} in the published guide`}
          onClick={() => onToggleVisible(entry.clientId)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
            entry.visible ? 'bg-primary' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              entry.visible ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <button
          type="button"
          onClick={() => onRequestDelete(entry)}
          aria-label={`Delete ${label}`}
          className="shrink-0 rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
        >
          <Trash2 size={16} />
        </button>
        <button
          type="button"
          onClick={() => onToggleExpanded(entry.clientId)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? `Collapse ${label}` : `Expand ${label}`}
          className="shrink-0 rounded-btn p-1.5 text-muted hover:bg-surface-secondary"
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-border p-4">
          <RichTextEditor
            id={contentFieldId}
            label="Section Content"
            value={entry.content}
            onChange={(value) => onFieldChange(entry.clientId, 'content', value)}
            error={contentError}
            withImage
          />
        </div>
      )}
    </li>
  );
}

export default ContentSectionEditorCard;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/ContentSectionEditorCard.test.jsx`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/ContentSectionEditorCard.jsx \
        frontend/src/components/buying-guide-form/ContentSectionEditorCard.test.jsx
git commit -m "feat(buying-guides): add ContentSectionEditorCard"
```

---

### Task 5: `BuyingGuideContentStep.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/BuyingGuideContentStep.jsx`
- Create: `frontend/src/components/buying-guide-form/BuyingGuideContentStep.test.jsx`

**Interfaces:**
- Produces: `BuyingGuideContentStep({ tocEntries, onChange, fieldErrors })`
  — default export. `tocEntries`/`onChange` are the **full** array/setter
  already lifted in `BuyingGuideForm.jsx` (same props `BasicInfoStep`
  passes to `TocBuilder`) — this component internally filters to
  `sectionKey === null` entries and always writes back the full array so
  structural entries are never touched. `fieldErrors` keyed
  `title-${clientId}` / `content-${clientId}` (Task 8 wires this from
  `BuyingGuideForm.jsx`'s new `validateBuyingGuideContent()`).
- Consumes: `ContentSectionEditorCard` (Task 4), `DeleteContentSectionDialog`
  (Task 3), `Button`/`EmptyState` (existing shared components), `@dnd-kit`
  (established pattern).

- [ ] **Step 1: Write the failing tests**

```jsx
// frontend/src/components/buying-guide-form/BuyingGuideContentStep.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BuyingGuideContentStep from './BuyingGuideContentStep.jsx';

const structuralEntries = [
  { clientId: 'QUICK_RECOMMENDATIONS', sectionKey: 'QUICK_RECOMMENDATIONS', title: '', content: '', visible: true },
  { clientId: 'FAQS', sectionKey: 'FAQS', title: '', content: '', visible: true },
];

describe('BuyingGuideContentStep', () => {
  it('shows the empty state when there are no custom sections', () => {
    render(<BuyingGuideContentStep tocEntries={structuralEntries} onChange={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByText('No buying guide sections yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Your First Section' })).toBeInTheDocument();
  });

  it('does not render structural entries as editable cards', () => {
    render(<BuyingGuideContentStep tocEntries={structuralEntries} onChange={vi.fn()} fieldErrors={{}} />);
    expect(screen.queryByLabelText('Section title')).not.toBeInTheDocument();
  });

  it('renders one card per custom section, preserving structural entries untouched', () => {
    const tocEntries = [
      ...structuralEntries,
      { clientId: 'c1', sectionKey: null, title: 'How We Tested', content: '<p>Details.</p>', visible: true },
    ];
    render(<BuyingGuideContentStep tocEntries={tocEntries} onChange={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByDisplayValue('How We Tested')).toBeInTheDocument();
  });

  it('Add Section appends a new custom entry after the existing ones and auto-expands it', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<BuyingGuideContentStep tocEntries={structuralEntries} onChange={onChange} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: 'Add Your First Section' }));

    expect(onChange).toHaveBeenCalledWith([
      ...structuralEntries,
      expect.objectContaining({ sectionKey: null, title: '', content: '', visible: true }),
    ]);
  });

  it('Add Section (header button) appends without disturbing structural entries', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const tocEntries = [...structuralEntries, { clientId: 'c1', sectionKey: null, title: 'Existing', content: '<p>x</p>', visible: true }];
    render(<BuyingGuideContentStep tocEntries={tocEntries} onChange={onChange} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: 'Add Section' }));

    const nextEntries = onChange.mock.calls[0][0];
    expect(nextEntries).toHaveLength(4);
    expect(nextEntries[0]).toEqual(structuralEntries[0]);
    expect(nextEntries[1]).toEqual(structuralEntries[1]);
  });

  it('editing a section title updates only that entry, leaving structural entries untouched', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const tocEntries = [...structuralEntries, { clientId: 'c1', sectionKey: null, title: 'Draft', content: '<p>x</p>', visible: true }];
    render(<BuyingGuideContentStep tocEntries={tocEntries} onChange={onChange} fieldErrors={{}} />);

    await user.type(screen.getByDisplayValue('Draft'), '!');

    const lastCall = onChange.mock.calls.at(-1)[0];
    expect(lastCall[0]).toEqual(structuralEntries[0]);
    expect(lastCall[1]).toEqual(structuralEntries[1]);
    expect(lastCall[2].title).toBe('Draft!');
  });

  it('deletes an empty section immediately without a confirmation dialog', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const tocEntries = [...structuralEntries, { clientId: 'c1', sectionKey: null, title: 'Empty', content: '', visible: true }];
    render(<BuyingGuideContentStep tocEntries={tocEntries} onChange={onChange} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: /delete empty/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(structuralEntries);
  });

  it('deleting a section with content requires confirmation', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const tocEntries = [...structuralEntries, { clientId: 'c1', sectionKey: null, title: 'Full', content: '<p>Real content.</p>', visible: true }];
    render(<BuyingGuideContentStep tocEntries={tocEntries} onChange={onChange} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: /delete full/i }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete Section' }));
    expect(onChange).toHaveBeenCalledWith(structuralEntries);
  });

  it('Move down reorders custom entries relative to each other without moving structural entries', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const tocEntries = [
      structuralEntries[0],
      { clientId: 'c1', sectionKey: null, title: 'First', content: '<p>x</p>', visible: true },
      { clientId: 'c2', sectionKey: null, title: 'Second', content: '<p>y</p>', visible: true },
      structuralEntries[1],
    ];
    render(<BuyingGuideContentStep tocEntries={tocEntries} onChange={onChange} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: /move first down/i }));

    expect(onChange).toHaveBeenCalledWith([
      structuralEntries[0],
      tocEntries[2],
      tocEntries[1],
      structuralEntries[1],
    ]);
  });

  it('auto-expands the first section with a validation error', () => {
    // Uses a content error specifically, not a title error: the title error renders in the
    // always-visible collapsed header regardless of expand state, so it wouldn't actually
    // prove auto-expand works. The content error only renders inside RichTextEditor, which
    // only mounts when isExpanded is true -- so this genuinely exercises the auto-expand path.
    const tocEntries = [
      ...structuralEntries,
      { clientId: 'c1', sectionKey: null, title: 'Untitled', content: '', visible: true },
    ];
    render(
      <BuyingGuideContentStep tocEntries={tocEntries} onChange={vi.fn()} fieldErrors={{ 'content-c1': 'Section content is required.' }} />
    );
    expect(screen.getByText('Section content is required.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/BuyingGuideContentStep.test.jsx`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
// frontend/src/components/buying-guide-form/BuyingGuideContentStep.jsx
import { useEffect, useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { HelpCircle, Info, Plus } from 'lucide-react';
import Button from '../Button.jsx';
import EmptyState from '../EmptyState.jsx';
import ContentSectionEditorCard from './ContentSectionEditorCard.jsx';
import DeleteContentSectionDialog from './DeleteContentSectionDialog.jsx';

const HOW_IT_WORKS_POINTS = [
  'Each section has a title and rich-text content.',
  'Sections appear in the published guide in the order shown here.',
  'Expand a section to edit its content; collapse it to tidy up the list.',
  'Changes update the Live Preview immediately.',
  'Adding, renaming, reordering, or deleting a section here also updates the Table of Contents in Basic Info.',
];

let sectionCounter = 0;
function nextSectionClientId() {
  sectionCounter += 1;
  return `new-content-section-${sectionCounter}`;
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').trim();
}

function BuyingGuideContentStep({ tocEntries, onChange, fieldErrors }) {
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const customEntries = tocEntries.filter((entry) => !entry.sectionKey);

  useEffect(() => {
    const firstInvalid = customEntries.find(
      (entry) => fieldErrors[`title-${entry.clientId}`] || fieldErrors[`content-${entry.clientId}`]
    );
    if (firstInvalid) {
      setExpandedIds((prev) => new Set(prev).add(firstInvalid.clientId));
    }
    // Only re-run when the error set changes -- expanding on every tocEntries edit would
    // fight the admin's own manual collapse/expand clicks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldErrors]);

  function toggleExpanded(clientId) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  }

  function handleAdd() {
    const newEntry = { clientId: nextSectionClientId(), sectionKey: null, title: '', content: '', visible: true };
    onChange([...tocEntries, newEntry]);
    setExpandedIds((prev) => new Set(prev).add(newEntry.clientId));
  }

  function handleFieldChange(clientId, field, value) {
    onChange(tocEntries.map((entry) => (entry.clientId === clientId ? { ...entry, [field]: value } : entry)));
  }

  function handleToggleVisible(clientId) {
    onChange(tocEntries.map((entry) => (entry.clientId === clientId ? { ...entry, visible: !entry.visible } : entry)));
  }

  function handleRequestDelete(entry) {
    if (stripHtml(entry.content)) {
      setDeleteTarget(entry);
    } else {
      onChange(tocEntries.filter((e) => e.clientId !== entry.clientId));
    }
  }

  function handleConfirmDelete() {
    onChange(tocEntries.filter((e) => e.clientId !== deleteTarget.clientId));
    setDeleteTarget(null);
  }

  // Custom entries can be interleaved with structural ones in tocEntries (TocBuilder allows
  // dragging any entry anywhere). Reordering here must only change custom entries' order
  // relative to EACH OTHER, refilling the same array slots they already occupy, so structural
  // entries never move and this step never needs to know/care about their positions.
  function moveCustomEntry(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= customEntries.length) return;
    const customSlots = [];
    tocEntries.forEach((entry, i) => {
      if (!entry.sectionKey) customSlots.push(i);
    });
    const reorderedCustom = [...customEntries];
    const [moved] = reorderedCustom.splice(fromIndex, 1);
    reorderedCustom.splice(toIndex, 0, moved);
    const next = [...tocEntries];
    customSlots.forEach((slotIndex, i) => {
      next[slotIndex] = reorderedCustom[i];
    });
    onChange(next);
  }

  function handleMoveUp(index) {
    moveCustomEntry(index, index - 1);
  }

  function handleMoveDown(index) {
    moveCustomEntry(index, index + 1);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = customEntries.findIndex((entry) => entry.clientId === active.id);
    const newIndex = customEntries.findIndex((entry) => entry.clientId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    moveCustomEntry(oldIndex, newIndex);
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-card-title text-heading">Buying Guide Content</h2>
          <button
            type="button"
            aria-expanded={isHowItWorksOpen}
            aria-controls="buying-guide-content-how-it-works"
            onClick={() => setIsHowItWorksOpen((open) => !open)}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <HelpCircle size={14} />
            How it works
          </button>
        </div>
        <Button type="button" size="sm" onClick={handleAdd}>
          <Plus size={16} />
          Add Section
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted">
        Add helpful information, tips, and expert advice to help your readers make the best buying decision.
      </p>

      {isHowItWorksOpen && (
        <ul
          id="buying-guide-content-how-it-works"
          className="mb-4 list-disc space-y-1 rounded-btn bg-surface-secondary p-4 pl-8 text-sm text-body"
        >
          {HOW_IT_WORKS_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}

      {customEntries.length === 0 ? (
        <>
          <EmptyState
            title="No buying guide sections yet"
            description="Add helpful sections like how you tested products, what to look for, or buying tips for your readers."
          />
          <div className="mt-4 flex justify-center">
            <Button type="button" onClick={handleAdd}>
              <Plus size={16} />
              Add Your First Section
            </Button>
          </div>
        </>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={customEntries.map((entry) => entry.clientId)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3" aria-label="Buying guide sections">
              {customEntries.map((entry, index) => (
                <ContentSectionEditorCard
                  key={entry.clientId}
                  entry={entry}
                  index={index}
                  total={customEntries.length}
                  onFieldChange={handleFieldChange}
                  onToggleVisible={handleToggleVisible}
                  onRequestDelete={handleRequestDelete}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  isExpanded={expandedIds.has(entry.clientId)}
                  onToggleExpanded={toggleExpanded}
                  titleError={fieldErrors[`title-${entry.clientId}`]}
                  contentError={fieldErrors[`content-${entry.clientId}`]}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-btn bg-primary/5 p-4 text-sm text-body">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <p>Tip: Use sections to organize your buying guide content. Drag and drop to reorder the sections.</p>
      </div>

      <DeleteContentSectionDialog section={deleteTarget} onConfirm={handleConfirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}

export default BuyingGuideContentStep;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/BuyingGuideContentStep.test.jsx`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/BuyingGuideContentStep.jsx \
        frontend/src/components/buying-guide-form/BuyingGuideContentStep.test.jsx
git commit -m "feat(buying-guides): add BuyingGuideContentStep"
```

---

### Task 6: Extend `LivePreview.jsx`

**Files:**
- Modify: `frontend/src/components/buying-guide-form/LivePreview.jsx`
- Modify: `frontend/src/components/buying-guide-form/LivePreview.test.jsx`

**Interfaces:**
- `LivePreview` already receives `tocEntries` as a prop (no new prop
  needed — `BuyingGuideForm.jsx`'s `previewProps` already includes it).
- Consumes: `uniqueSlug` (Task 1), `wordCount` (Task 2, named export from
  `RichTextEditor.jsx`).
- Produces: `computeSectionNumbers()` gains a 5th key, `BUYING_GUIDE`, and
  a new `hasBuyingGuideContent` parameter (internal helper, not exported —
  matches its current visibility).

- [ ] **Step 1: Write the failing tests**

Add to the end of `frontend/src/components/buying-guide-form/LivePreview.test.jsx`,
inside the existing `describe('LivePreview', ...)` block (after the last
existing `it(...)`, before the closing `});`):

```jsx
  const customSectionEntry = {
    clientId: 'custom-1',
    sectionKey: null,
    title: 'How We Tested',
    content: '<p>We tested every product for a full week in real-world conditions to see how it performed.</p>',
    visible: true,
  };

  it('renders the Buying Guide section with custom section content', () => {
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[customSectionEntry]}
        settings={null}
      />
    );

    expect(screen.getByText(/1\. buying guide/i)).toBeInTheDocument();
    // The section's title renders twice (once as the TOC link, once as the card heading) --
    // getAllByText avoids the "multiple matches" throw getByText would raise here.
    expect(screen.getAllByText('How We Tested').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/we tested every product/i)).toBeInTheDocument();
  });

  // NOTE: the preview's breadcrumb ("Home / Buying Guides / {title}") always contains the
  // substring "Buying Guide" (as part of "Buying Guides"), so every assertion below anchors
  // on a leading number + period ("1. Buying Guide") to target only the dynamic section
  // heading -- a bare /buying guide/i would false-match the breadcrumb on every render.

  it('omits the Buying Guide section when there are no custom sections with content', () => {
    render(<LivePreview title="Best Earbuds" excerpt="" coverImageFilename={null} tocEntries={[]} settings={null} />);
    expect(screen.queryByText(/\d+\.\s*buying guide/i)).not.toBeInTheDocument();
  });

  it('omits the Buying Guide section when a custom entry is hidden', () => {
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[{ ...customSectionEntry, visible: false }]}
        settings={null}
      />
    );
    expect(screen.queryByText(/\d+\.\s*buying guide/i)).not.toBeInTheDocument();
  });

  it('groups multiple custom sections under one dynamically-numbered Buying Guide heading, numbered locally', () => {
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[
          { ...customSectionEntry, clientId: 'custom-1', title: 'How We Tested' },
          { ...customSectionEntry, clientId: 'custom-2', title: 'What to Look For' },
        ]}
        settings={null}
      />
    );

    expect(screen.getAllByText(/\d+\.\s*buying guide/i)).toHaveLength(1);
    // Each title also renders twice (TOC link + card heading) -- see note above.
    expect(screen.getAllByText('How We Tested').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('What to Look For').length).toBeGreaterThanOrEqual(1);
  });

  it('numbers Buying Guide after other present dynamic sections', () => {
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[
          { clientId: 'COMPARISON_TABLE', sectionKey: 'COMPARISON_TABLE', title: '', content: '', visible: true },
          customSectionEntry,
        ]}
        settings={null}
        comparisonProducts={[{ id: 1, name: 'Product A', imageFileName: null }]}
        comparisonSpecs={[{ clientId: 'spec-1', specificationName: 'Weight', values: [{ productId: 1, value: '1kg' }] }]}
      />
    );

    expect(screen.getByText('1. Comparison Table')).toBeInTheDocument();
    expect(screen.getByText(/2\. buying guide/i)).toBeInTheDocument();
  });

  it('shows a Read more toggle for long section content and expands on click', async () => {
    const user = userEvent.setup();
    const longContent = `<p>${Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ')}</p>`;
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[{ ...customSectionEntry, content: longContent }]}
        settings={null}
      />
    );

    const readMoreButton = screen.getByRole('button', { name: 'Read more' });
    expect(readMoreButton).toBeInTheDocument();

    await user.click(readMoreButton);

    expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument();
  });

  it('does not show a Read more toggle for short section content', () => {
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[customSectionEntry]}
        settings={null}
      />
    );
    expect(screen.queryByRole('button', { name: 'Read more' })).not.toBeInTheDocument();
  });

  it('gives a custom TOC entry a real anchor link to its own section', () => {
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[customSectionEntry]}
        settings={null}
      />
    );
    const tocList = screen.getByRole('list', { name: 'Table of contents' });
    const link = within(tocList).getByRole('link', { name: 'How We Tested' });
    expect(link).toHaveAttribute('href', '#how-we-tested');
  });

  it('still lists each custom entry by its own title in the TOC, not a combined label', () => {
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[
          { ...customSectionEntry, clientId: 'custom-1', title: 'How We Tested' },
          { ...customSectionEntry, clientId: 'custom-2', title: 'What to Look For' },
        ]}
        settings={null}
      />
    );
    const tocList = screen.getByRole('list', { name: 'Table of contents' });
    expect(within(tocList).getByText('How We Tested')).toBeInTheDocument();
    expect(within(tocList).getByText('What to Look For')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/LivePreview.test.jsx`
Expected: The 9 new tests FAIL (Buying Guide section doesn't render yet); all pre-existing tests still PASS.

- [ ] **Step 3: Add the new imports and `computeSectionNumbers` extension**

At the top of `LivePreview.jsx`, add two imports (after the existing `getImageUrl` import):

```js
import { uniqueSlug } from '../../utils/slugify.js';
import { wordCount } from './RichTextEditor.jsx';
```

Replace `computeSectionNumbers` (lines 13-28):

```js
function computeSectionNumbers({
  tocEntries,
  hasQuickRecommendations,
  hasComparison,
  hasTopPick,
  hasRunnerUps,
  hasBuyingGuideContent,
}) {
  const contentBySectionKey = {
    QUICK_RECOMMENDATIONS: hasQuickRecommendations,
    COMPARISON_TABLE: hasComparison,
    TOP_PICK: hasTopPick,
    RUNNER_UPS: hasRunnerUps,
  };
  const numbers = {};
  let nextNumber = 1;
  let buyingGuideNumbered = false;
  tocEntries.forEach((entry) => {
    if (entry.sectionKey) {
      if (entry.visible && contentBySectionKey[entry.sectionKey]) {
        numbers[entry.sectionKey] = nextNumber;
        nextNumber += 1;
      }
      return;
    }
    if (!buyingGuideNumbered && hasBuyingGuideContent && entry.visible) {
      numbers.BUYING_GUIDE = nextNumber;
      nextNumber += 1;
      buyingGuideNumbered = true;
    }
  });
  return numbers;
}
```

- [ ] **Step 4: Add the `BuyingGuideSectionPreviewCard` component**

Insert after `renderComparisonCellValue` (after line 129, before `function LivePreview({`):

```jsx
const CONTENT_PREVIEW_WORD_LIMIT = 40;

function BuyingGuideSectionPreviewCard({ entry, number, anchorId }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = wordCount(entry.content) > CONTENT_PREVIEW_WORD_LIMIT;

  return (
    <div id={anchorId} className={`rounded-btn border border-border p-3 ${number > 1 ? 'mt-3' : ''}`}>
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-muted">
          {number}
        </span>
        <span className="text-sm font-semibold text-heading">{entry.title || 'Untitled Section'}</span>
      </div>
      <div
        className={`prose prose-sm max-w-none text-body ${!isExpanded && isLong ? 'line-clamp-4' : ''}`}
        dangerouslySetInnerHTML={{ __html: entry.content }}
      />
      {isLong && (
        <button
          type="button"
          onClick={() => setIsExpanded((open) => !open)}
          className="mt-1 text-xs font-semibold text-primary hover:underline"
        >
          {isExpanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Derive `customSections`/anchors and extend the `sectionNumbers` call**

Inside the `LivePreview` function body, after the existing `const runnerUps = ...` line and before the existing `const sectionNumbers = computeSectionNumbers({...})` call, insert:

```js
  const customSections = tocEntries.filter(
    (entry) => !entry.sectionKey && entry.visible && entry.title.trim() && entry.content.replace(/<[^>]*>/g, '').trim()
  );
  const hasBuyingGuideContent = customSections.length > 0;
  const usedAnchorSlugs = new Set();
  const customSectionsWithAnchors = customSections.map((entry) => ({
    entry,
    anchorId: uniqueSlug(entry.title, usedAnchorSlugs),
  }));
  const anchorsByClientId = new Map(customSectionsWithAnchors.map(({ entry, anchorId }) => [entry.clientId, anchorId]));
```

Then update the existing `sectionNumbers` call to pass the new parameter:

```js
  const sectionNumbers = computeSectionNumbers({
    tocEntries,
    hasQuickRecommendations: quickRecommendations.length > 0,
    hasComparison: comparisonSpecs.length > 0 && comparisonProducts.length > 0,
    hasTopPick: Boolean(topPick),
    hasRunnerUps: runnerUps.length > 0,
    hasBuyingGuideContent,
  });
```

- [ ] **Step 6: Give custom TOC entries a real anchor link**

Replace the existing TOC `<ul>` map (lines 197-206):

```jsx
            {visibleEntries.map((entry, index) => (
              <li key={entry.clientId} className="flex items-center gap-2 text-sm text-primary">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <span>{entry.sectionKey ? STRUCTURAL_LABELS[entry.sectionKey] : entry.title || 'Untitled Section'}</span>
              </li>
            ))}
```

with:

```jsx
            {visibleEntries.map((entry, index) => {
              const label = entry.sectionKey ? STRUCTURAL_LABELS[entry.sectionKey] : entry.title || 'Untitled Section';
              const anchorId = entry.sectionKey ? null : anchorsByClientId.get(entry.clientId);
              return (
                <li key={entry.clientId} className="flex items-center gap-2 text-sm text-primary">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  {anchorId ? (
                    <a href={`#${anchorId}`} className="hover:underline">
                      {label}
                    </a>
                  ) : (
                    <span>{label}</span>
                  )}
                </li>
              );
            })}
```

(Note: this only adds a real link for custom entries with an anchor — the TOC list still shows every visible entry by its own individual label exactly as before; structural entries and content-less/hidden custom entries render as plain text, unchanged.)

- [ ] **Step 7: Render the Buying Guide section**

Insert the new block right after the existing Runner-Ups block (after the closing `)}` that follows the `{runnerUps.length > 0 && (...)}` block, before `<AffiliateDisclosure ... />`):

```jsx
      {hasBuyingGuideContent && (
        <div className="mb-4">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
            {sectionNumbers.BUYING_GUIDE}. Buying Guide
          </span>
          {customSectionsWithAnchors.map(({ entry, anchorId }, index) => (
            <BuyingGuideSectionPreviewCard key={entry.clientId} entry={entry} number={index + 1} anchorId={anchorId} />
          ))}
        </div>
      )}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/LivePreview.test.jsx`
Expected: PASS — all pre-existing tests plus the 9 new ones (22 total).

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/buying-guide-form/LivePreview.jsx \
        frontend/src/components/buying-guide-form/LivePreview.test.jsx
git commit -m "feat(buying-guides): render Buying Guide section content and anchors in LivePreview"
```

---

### Task 7: `Stepper.jsx` — unlock step 6

**Files:**
- Modify: `frontend/src/components/buying-guide-form/Stepper.jsx`
- Modify: `frontend/src/components/buying-guide-form/Stepper.test.jsx`

- [ ] **Step 1: Write the failing test**

Add after the existing "enables Top Picks & Runner-Ups once unlocked..." test:

```jsx
  it('enables Buying Guide once unlocked, but keeps every step after it disabled', () => {
    render(<Stepper activeStep={6} maxUnlockedStep={6} onStepClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Buying Guide/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /FAQs/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /SEO & Publish/ })).toBeDisabled();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/Stepper.test.jsx`
Expected: FAIL — `MAX_BUILT_STEP` is still 5, so the "Buying Guide" button is disabled.

- [ ] **Step 3: Update `MAX_BUILT_STEP`**

```js
const MAX_BUILT_STEP = 6;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/Stepper.test.jsx`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/Stepper.jsx frontend/src/components/buying-guide-form/Stepper.test.jsx
git commit -m "feat(buying-guides): unlock the Buying Guide step in the Stepper"
```

---

### Task 8: Wire into `BuyingGuideForm.jsx`

**Files:**
- Modify: `frontend/src/components/BuyingGuideForm.jsx`
- Modify: `frontend/src/components/BuyingGuideForm.test.jsx`

**Interfaces:**
- Consumes: `BuyingGuideContentStep` (Task 5).
- New local state: `buyingGuideContentErrors` (object, same shape as
  `comparisonErrors`/`topPicksRunnerUpsErrors`).
- New functions: `validateBuyingGuideContent()`, `handleBuyingGuideContentNext()`.
- Retrofits `handleTopPicksRunnerUpsNext()` to add `setActiveStep(6)` and
  `stayOnPage: true`, now that step 6 has a real render block — mirrors
  the exact fix already applied to `handleQuickPicksNext`/`handleComparisonNext`
  each time a following step gained a render block.

- [ ] **Step 1: Write the failing tests**

Add the new mock after the existing `TopPicksAndRunnerUpsStep.jsx` mock
(after line 111, before `const categories = ...`):

```jsx
vi.mock('./buying-guide-form/BuyingGuideContentStep.jsx', () => ({
  default: ({ tocEntries, onChange, fieldErrors }) => {
    const customCount = tocEntries.filter((entry) => !entry.sectionKey).length;
    return (
      <div>
        <p>Buying Guide Content step ({customCount} sections)</p>
        {Object.keys(fieldErrors).length > 0 && <p>Buying Guide Content has field errors</p>}
        <button
          type="button"
          onClick={() =>
            onChange([
              ...tocEntries,
              {
                clientId: 'mock-section',
                sectionKey: null,
                title: 'How We Tested',
                content: '<p>We tested every product for a full week in real-world conditions.</p>',
                visible: true,
              },
            ])
          }
        >
          Add mock section
        </button>
        <button
          type="button"
          onClick={() =>
            onChange([...tocEntries, { clientId: 'mock-blank-section', sectionKey: null, title: '', content: '', visible: true }])
          }
        >
          Add blank mock section
        </button>
      </div>
    );
  },
}));
```

Add the following tests inside the `describe('BuyingGuideForm', ...)` block, after the last existing test ("Next on Top Picks & Runner-Ups blocks with an error when no Top Pick has been selected"):

```jsx
  it('Next on Top Picks & Runner-Ups advances to Buying Guide and unlocks it in the Stepper', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock Top Pick' }));

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Buying Guide Content step (0 sections)')).toBeInTheDocument();
    const step6Button = screen.getByRole('button', { name: /Buying Guide$/ });
    expect(step6Button).toBeEnabled();
    expect(step6Button).toHaveAttribute('aria-current', 'step');
  });

  it('Previous on Buying Guide returns to Top Picks & Runner-Ups without losing state', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock Top Pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Buying Guide Content step (0 sections)');

    await user.click(screen.getByRole('button', { name: 'Previous' }));

    expect(await screen.findByText(/top picks & runner-ups step \(1 recommendations/i)).toBeInTheDocument();
  });

  it('adding a section and saving includes it in the tocEntries payload', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm({ onSubmit });
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock Top Pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock section' }));

    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls.at(-1)[0];
    const customEntry = payload.tocEntries.find((entry) => entry.sectionKey === null);
    expect(customEntry).toEqual({
      sectionKey: null,
      title: 'How We Tested',
      content: '<p>We tested every product for a full week in real-world conditions.</p>',
      visible: true,
    });
  });

  it('Next on Buying Guide blocks with an error when a section has a blank title', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock Top Pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add blank mock section' }));

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Buying Guide Content has field errors')).toBeInTheDocument();
    expect(screen.getByText('Buying Guide Content step (1 sections)')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd frontend && npx vitest run src/components/BuyingGuideForm.test.jsx`
Expected: The 4 new tests FAIL; all pre-existing tests still PASS.

- [ ] **Step 3: Wire the step into `BuyingGuideForm.jsx`**

Add the import (after the existing `TopPicksAndRunnerUpsStep` import):

```js
import BuyingGuideContentStep from './buying-guide-form/BuyingGuideContentStep.jsx';
```

Add new state (after the existing `const [topPicksRunnerUpsErrors, setTopPicksRunnerUpsErrors] = useState({});`):

```js
  const [buyingGuideContentErrors, setBuyingGuideContentErrors] = useState({});
```

Retrofit `handleTopPicksRunnerUpsNext` (replace its body):

```js
  function handleTopPicksRunnerUpsNext() {
    const errors = validateTopPicksAndRunnerUps();
    setTopPicksRunnerUpsErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setMaxUnlockedStep((prev) => Math.max(prev, 6));
    setActiveStep(6);
    // Buying Guide (step 6) now exists, so this auto-save must not navigate away like a
    // Save as Draft/Publish click does -- mirrors handleQuickPicksNext/handleComparisonNext.
    submit(false, { stayOnPage: true });
  }
```

Add `validateBuyingGuideContent` and `handleBuyingGuideContentNext` right after `handleTopPicksRunnerUpsNext`:

```js
  function validateBuyingGuideContent() {
    const errors = {};
    const seenTitles = new Set();
    tocEntries
      .filter((entry) => !entry.sectionKey)
      .forEach((entry) => {
        const trimmedTitle = entry.title.trim();
        if (!trimmedTitle) {
          errors[`title-${entry.clientId}`] = 'Section title is required.';
        } else {
          const key = trimmedTitle.toLowerCase();
          if (seenTitles.has(key)) {
            errors[`title-${entry.clientId}`] = 'Two sections cannot use the same title.';
          } else {
            seenTitles.add(key);
          }
        }
        if (!entry.content.replace(/<[^>]*>/g, '').trim()) {
          errors[`content-${entry.clientId}`] = 'Section content is required.';
        }
      });
    return errors;
  }

  function handleBuyingGuideContentNext() {
    const errors = validateBuyingGuideContent();
    setBuyingGuideContentErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setMaxUnlockedStep((prev) => Math.max(prev, 7));
    // FAQs (step 7) is not built yet, so this is the current "last built step" -- save and
    // return to the list, matching the pattern every prior step used before the step after
    // it existed (see Top Picks & Runner-Ups' own Next, before this task).
    submit(false);
  }
```

Add the render block for `activeStep === 6`, right after the existing `activeStep === 5` block (after its closing `)}`, before the closing `</div>` of the `lg:w-[72%]` column):

```jsx
          {activeStep === 6 && (
            <>
              <BuyingGuideContentStep tocEntries={tocEntries} onChange={setTocEntries} fieldErrors={buyingGuideContentErrors} />
              {Object.keys(buyingGuideContentErrors).length > 0 && (
                <p role="alert" className="mt-4 text-sm text-danger">
                  One or more sections need attention before continuing.
                </p>
              )}
              <div className="mt-6 flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setActiveStep(5)}>
                  Previous
                </Button>
                <Button type="button" onClick={handleBuyingGuideContentNext}>
                  Next
                </Button>
              </div>
            </>
          )}
```

(No change needed to `previewProps` — `tocEntries` is already included there.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/BuyingGuideForm.test.jsx`
Expected: PASS — all pre-existing tests plus the 4 new ones (39 total).

- [ ] **Step 5: Run the whole frontend suite**

Run: `cd frontend && npx vitest run`
Expected: PASS across every file — this is the first point every piece from Tasks 1-8 runs together.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/BuyingGuideForm.jsx frontend/src/components/BuyingGuideForm.test.jsx
git commit -m "feat(buying-guides): wire the Buying Guide content step into the guide editor"
```

---

### Task 9: Verification, lint, build, manual browser check

**Files:** none (verification only).

- [ ] **Step 1: Full frontend suite**

Run: `cd frontend && npx vitest run`
Expected: PASS, 0 failures.

- [ ] **Step 2: ESLint**

Run: `cd frontend && npx eslint .`
Expected: 0 errors (pre-existing `TocBuilder.jsx`-unrelated warnings, if any, are acceptable — matches the baseline already on `master`).

- [ ] **Step 3: Production build**

Run: `cd frontend && npm run build`
Expected: builds successfully.

- [ ] **Step 4: Backend regression guard**

Run (with `DOCKER_HOST`/`TESTCONTAINERS_RYUK_DISABLED` exported per this
project's Testcontainers/Colima setup):
`cd backend && mvn test`
Expected: PASS, 0 failures — this task makes no backend changes, so this
step exists purely to confirm nothing was accidentally broken.

- [ ] **Step 5: Manual browser verification**

Start both dev servers and, in a real browser (or chrome-devtools MCP),
verify against a guide that already has Products/Quick Picks/Comparison/
Top Picks & Runner-Ups filled in:

1. Basic Info's TOC list still shows "Buying Guide" alongside the other
   four structural labels (no regression to `TocBuilder.jsx`).
2. Navigate to step 6 — "Buying Guide Content" header, "How it works",
   "+ Add Section" render; empty state shows on a guide with no custom
   sections yet.
3. Add a section — auto-expands, title input focused, appears in Live
   Preview immediately once title+content are filled in.
4. Add a second section, drag-reorder them (and use Move Up/Down as the
   keyboard fallback) — order updates in both the editor and Live Preview.
5. Collapse/expand independently — content is preserved, multiple can be
   open at once.
6. Toggle a section's visibility off — it disappears from Live Preview
   without losing its content; toggle back on to confirm content intact.
7. Try Next with a blank-titled section — blocked, inline error shown,
   section auto-expands.
8. Delete an empty section — no dialog. Delete a section with content —
   confirmation dialog appears, Cancel preserves it, Delete removes it.
9. Fill in valid sections, click Next — saves, returns to the guide list
   (Buying Guide is still the last built step at this point).
10. Reload the guide, navigate back to step 6 — sections, order, and
    visibility all round-tripped correctly from the backend.
11. In Live Preview, confirm the TOC list shows each custom section by its
    own title (not a combined "Buying Guide" label), and clicking one
    scrolls to its card under the dynamically-numbered "N. BUYING GUIDE"
    heading.
12. Add a long section (fill with enough text to exceed ~40 words) —
    confirm "Read more"/"Show less" toggles the preview clamp without
    losing content.
13. Resize to a narrow (375px) viewport — confirm no horizontal overflow
    on the section list, toolbar, or Live Preview.
14. Confirm `IntroductionEditor` (Basic Info) and `RecommendationContentEditor`
    (Top Picks & Runner-Ups) still render and behave identically to before
    this task (toolbar buttons, word count, error display) — the shared
    `RichTextEditor` refactor from Task 2 must be invisible to existing
    steps.

- [ ] **Step 6: Fix any issues found, re-run affected steps above**

Only proceed once every check passes.

---

## Explicitly out of scope for this plan

(Repeated from the design doc for the implementer's convenience.)

- Fixing `BuyingGuideDetailPage.jsx` (the real public guide page not
  consuming `tocEntries` at all) — pre-existing, unrelated bug.
- Persisted/backend anchor ids.
- A second "include in Table of Contents" toggle.
- Category-based section templates.
- FAQs and SEO & Publish steps.
