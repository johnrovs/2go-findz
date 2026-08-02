# Buying Guide Editor — Basic Info Step Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old flat `BuyingGuideForm.jsx` (6 fields, stale backend schema) with a full rewrite matching the reference navy/purple wizard design: a sticky `EditorHeader`, a 9-step `Stepper` (only Step 1 active), the actual Basic Info fields (title/slug/excerpt/category/featured image/rich-text introduction/status/publish date), a drag-and-drop table-of-contents builder, and a live preview panel — while correctly round-tripping the five backend collections and two SEO fields this page has no UI for yet, so saving Basic Info never silently deletes data a future step (or a direct API call) already put there.

**Architecture:** Follows `ComparisonForm.jsx`'s established pattern exactly: one top-level component (`BuyingGuideForm`) owns all state via `useState` (no form library), child components are pure presentational pieces receiving `values`/`onChange`, and one `handleSubmit`-equivalent builds the complete `BuyingGuideRequest` payload. New pieces (`TocBuilder`'s drag-and-drop, `IntroductionEditor`'s rich text) are additive, not replacements for this pattern.

**Tech Stack:** React 18.3, Tailwind CSS (no new utility classes — reuses existing `border-btn`/`text-danger`/etc. tokens), Vitest + React Testing Library, `@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-link` + `@tiptap/extension-image` + `@tiptap/extension-underline` + `@tiptap/extension-text-align` (new), `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` (new).

## Global Constraints

- Scope is **Step 1 (Basic Info) only**. Steps 2–9 render in the `Stepper` for visual match but are permanently disabled — no placeholder pages, no "coming soon" toasts.
- **Do not touch the Products tab or any other step's content.** Per the original request: stop after Basic Info is verified complete and wait for the next reference image before building anything else.
- No new dependencies beyond the seven `@tiptap/*`/`@dnd-kit/*` packages listed above — no form library, no date picker, no state-management library (matches every existing admin form).
- Every existing component this plan touches (`ImageUploader.jsx`) must stay backward-compatible with its other callers (`ProductForm.jsx`, `comparison-form/BasicInfoTab.jsx`) — verified by not breaking their existing tests.
- `ConfirmDialog.jsx` / `Modal.jsx` (existing) are reused as-is for the publish-confirm and delete-with-content-confirm and live-preview-modal needs — no new dialog components are built.
- Saving Basic Info on an **existing** guide must round-trip `quickRecommendations`, `comparisonSpecs`, `recommendationSections`, `faqs`, `recommendedProductIds`, `seoTitle`, `seoDescription` unchanged from what was loaded — never hardcode these to empty/null on save. For a **new** guide they naturally start empty/null.
- Full spec: `docs/superpowers/specs/2026-08-01-buying-guide-basic-info-page-design.md` (five corrections were made to it during plan research — reuse `ConfirmDialog`, preserve the five collections, add a header back-link, add missing TipTap extensions, reuse the real `AffiliateDisclosure` component instead of a hardcoded sentence, preserve `seoTitle`/`seoDescription`. All are already committed to the spec file and baked into this plan).

---

## Task 1: Add TipTap and dnd-kit dependencies

**Files:**
- Modify: `frontend/package.json`

**Interfaces:**
- Produces: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`, `@tiptap/extension-underline`, `@tiptap/extension-text-align`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` importable by every later task in this plan.

- [ ] **Step 1: Add the dependencies to `package.json`**

Insert into the `"dependencies"` block, keeping the existing alphabetical order:

```json
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@fontsource/inter": "^5.3.0",
    "@fontsource/space-grotesk": "^5.3.0",
    "@tiptap/extension-image": "^2.9.0",
    "@tiptap/extension-link": "^2.9.0",
    "@tiptap/extension-text-align": "^2.9.0",
    "@tiptap/extension-underline": "^2.9.0",
    "@tiptap/react": "^2.9.0",
    "@tiptap/starter-kit": "^2.9.0",
    "axios": "^1.7.0",
```

- [ ] **Step 2: Install**

Run: `cd frontend && npm install`
Expected: installs successfully, `node_modules/@tiptap` and `node_modules/@dnd-kit` are populated, `package-lock.json` updates.

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): add TipTap and dnd-kit dependencies for buying guide editor"
```

---

## Task 2: Add an optional `label` prop to `ImageUploader`

**Files:**
- Modify: `frontend/src/components/ImageUploader.jsx`
- Test: `frontend/src/components/ImageUploader.test.jsx`

**Interfaces:**
- Produces: `<ImageUploader imageFileName onChange label?>` — `label` defaults to `'Product Image'` (unchanged default behavior for `ProductForm.jsx`/`comparison-form/BasicInfoTab.jsx`, neither of which passes it).

- [ ] **Step 1: Write the failing test**

Add to `frontend/src/components/ImageUploader.test.jsx` (inside the existing `describe` block):

```jsx
  it('renders a custom label when provided', () => {
    render(<ImageUploader imageFileName={null} onChange={vi.fn()} label="Featured Image" />);
    expect(screen.getByText('Featured Image')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ImageUploader.test.jsx`
Expected: FAIL — "Featured Image" is never rendered (the label is hardcoded to "Product Image").

- [ ] **Step 3: Implement**

In `frontend/src/components/ImageUploader.jsx`, change the function signature and the label span:

```jsx
function ImageUploader({ imageFileName, onChange, label = 'Product Image' }) {
```

```jsx
      <span className="mb-1 block text-small font-medium text-body">{label}</span>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/ImageUploader.test.jsx`
Expected: PASS, all tests (including the pre-existing ones, unaffected since they never pass `label`).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ImageUploader.jsx frontend/src/components/ImageUploader.test.jsx
git commit -m "feat(admin): add optional label prop to ImageUploader"
```

---

## Task 3: Build `IntroductionEditor.jsx` (TipTap rich-text wrapper)

**Files:**
- Create: `frontend/src/components/buying-guide-form/IntroductionEditor.jsx`
- Test: `frontend/src/components/buying-guide-form/IntroductionEditor.test.jsx`

**Interfaces:**
- Consumes: nothing from earlier tasks besides the Task 1 dependencies.
- Produces: `<IntroductionEditor value={htmlString} onChange={(html) => void} error?={string} />`. `value` is only read at mount time (TipTap's `content` option is initial-only) — safe here because `BuyingGuideForm` (Task 9) never mounts this component before a loaded guide's data is available (`BuyingGuideFormPage` gates on `isLoading`), so there is no "loaded after mount" case to sync.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/buying-guide-form/IntroductionEditor.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import IntroductionEditor from './IntroductionEditor.jsx';

describe('IntroductionEditor', () => {
  it('renders existing content', () => {
    render(<IntroductionEditor value="<p>Hello world</p>" onChange={vi.fn()} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('shows a word count derived from the content', () => {
    render(<IntroductionEditor value="<p>Hello world</p>" onChange={vi.fn()} />);
    expect(screen.getByText('2 words')).toBeInTheDocument();
  });

  it('shows 0 words for empty content', () => {
    render(<IntroductionEditor value="" onChange={vi.fn()} />);
    expect(screen.getByText('0 words')).toBeInTheDocument();
  });

  it('shows a validation error when provided', () => {
    render(<IntroductionEditor value="" onChange={vi.fn()} error="Introduction is required." />);
    expect(screen.getByText('Introduction is required.')).toBeInTheDocument();
  });

  it('renders toolbar buttons with accessible labels', () => {
    render(<IntroductionEditor value="" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Italic' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Underline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bullet list' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Numbered list' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Align left' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert link' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert image' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/IntroductionEditor.test.jsx`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Implement**

Create `frontend/src/components/buying-guide-form/IntroductionEditor.jsx`:

```jsx
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
} from 'lucide-react';

const EXTENSIONS = [
  StarterKit,
  Underline,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Link.configure({ openOnClick: false }),
  Image,
];

function wordCount(html) {
  const text = html.replace(/<[^>]*>/g, ' ').trim();
  return text ? text.split(/\s+/).length : 0;
}

function ToolbarButton({ onClick, isActive, label, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      className={`rounded-btn p-1.5 hover:bg-surface-secondary ${isActive ? 'bg-primary/10 text-primary' : 'text-muted'}`}
    >
      {children}
    </button>
  );
}

function IntroductionEditor({ value, onChange, error }) {
  const editor = useEditor({
    extensions: EXTENSIONS,
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
      <span className="mb-1 block text-small font-medium text-body">Introduction</span>
      <div className="rounded-btn border border-border">
        <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
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
          <button type="button" onClick={handleAddImage} aria-label="Insert image" className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary">
            <ImageIcon size={16} />
          </button>
        </div>
        <EditorContent
          editor={editor}
          className="prose max-w-none px-3 py-2 text-slate-900 [&_.ProseMirror]:min-h-[160px] [&_.ProseMirror]:outline-none"
        />
      </div>
      <p className="mt-1 text-sm text-muted">{wordCount(value)} words</p>
      {error && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export default IntroductionEditor;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/IntroductionEditor.test.jsx`
Expected: PASS.

**If TipTap fails to mount in jsdom** (errors referencing `Range`, `getClientRects`, or `document.caretPositionFromPoint`): this is a known jsdom/ProseMirror gap. Do not fight it — replace the two content-mounting tests (`renders existing content`, word-count tests already read `value` directly so they're unaffected) with a `vi.mock('@tiptap/react', ...)` stub that renders a plain `<div>{value}</div>` and exposes a minimal fake `editor` object (`{ isActive: () => false, chain: () => ({ focus: () => ({ toggleBold: () => ({ run: () => {} }), ... }) }) }`) so the toolbar-button-presence tests still pass. Flag this fallback in the task's commit message if used.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/IntroductionEditor.jsx frontend/src/components/buying-guide-form/IntroductionEditor.test.jsx
git commit -m "feat(admin): add TipTap-based IntroductionEditor for buying guides"
```

---

## Task 4: Build `TocBuilder.jsx` (drag-and-drop table-of-contents builder)

**Files:**
- Create: `frontend/src/components/buying-guide-form/TocBuilder.jsx`
- Test: `frontend/src/components/buying-guide-form/TocBuilder.test.jsx`

**Interfaces:**
- Consumes: `ConfirmDialog` (`frontend/src/components/ConfirmDialog.jsx`, existing), `Button` (existing).
- Produces: `<TocBuilder tocEntries={Array<{clientId, sectionKey, title, content, visible}>} onChange={(next) => void} />`. Also exports `STRUCTURAL_LABELS` (the `sectionKey` → display-label map), reused by `LivePreview` (Task 6) to render the same labels without duplicating the map. Row entries: `sectionKey` is one of `'QUICK_RECOMMENDATIONS' | 'COMPARISON_TABLE' | 'TOP_PICK' | 'RUNNER_UPS' | 'FAQS' | null` (`null` = custom row, which then requires non-null `title`/`content` strings). `clientId` is a UI-only identity key (never sent to the backend — stripped before submit in Task 9).

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/buying-guide-form/TocBuilder.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TocBuilder from './TocBuilder.jsx';

const structuralEntries = [
  { clientId: 'QUICK_RECOMMENDATIONS', sectionKey: 'QUICK_RECOMMENDATIONS', title: '', content: '', visible: true },
  { clientId: 'FAQS', sectionKey: 'FAQS', title: '', content: '', visible: true },
];

describe('TocBuilder', () => {
  it('renders structural rows with derived labels and no delete button', () => {
    render(<TocBuilder tocEntries={structuralEntries} onChange={vi.fn()} />);
    expect(screen.getByText('Quick Recommendations')).toBeInTheDocument();
    expect(screen.getByText('FAQs')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Quick Recommendations' })).not.toBeInTheDocument();
  });

  it('adds a blank custom section', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TocBuilder tocEntries={structuralEntries} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Add Section' }));

    expect(onChange).toHaveBeenCalledWith([
      ...structuralEntries,
      expect.objectContaining({ sectionKey: null, title: '', content: '', visible: true }),
    ]);
  });

  it('edits a custom section title inline', async () => {
    const customEntries = [{ clientId: 'custom-1', sectionKey: null, title: '', content: '', visible: true }];
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TocBuilder tocEntries={customEntries} onChange={onChange} />);

    await user.type(screen.getByLabelText('Section title'), 'X');

    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ clientId: 'custom-1', title: 'X' })]);
  });

  it('deletes a custom section immediately when its content is blank', async () => {
    const customEntries = [{ clientId: 'custom-1', sectionKey: null, title: 'Empty', content: '', visible: true }];
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TocBuilder tocEntries={customEntries} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Remove Empty' }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('confirms before deleting a custom section that has content', async () => {
    const customEntries = [
      { clientId: 'custom-1', sectionKey: null, title: 'Warranty Info', content: 'Details here.', visible: true },
    ];
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TocBuilder tocEntries={customEntries} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Remove Warranty Info' }));
    expect(screen.getByText(/permanently delete it/)).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('toggles visibility', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TocBuilder tocEntries={structuralEntries} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Hide Quick Recommendations' }));

    expect(onChange).toHaveBeenCalledWith([{ ...structuralEntries[0], visible: false }, structuralEntries[1]]);
  });

  it('reorders rows with the up/down buttons', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TocBuilder tocEntries={structuralEntries} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Move FAQs up' }));

    expect(onChange).toHaveBeenCalledWith([structuralEntries[1], structuralEntries[0]]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/TocBuilder.test.jsx`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Implement**

Create `frontend/src/components/buying-guide-form/TocBuilder.jsx`:

```jsx
import { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Plus, X } from 'lucide-react';
import Button from '../Button.jsx';
import ConfirmDialog from '../ConfirmDialog.jsx';

export const STRUCTURAL_LABELS = {
  QUICK_RECOMMENDATIONS: 'Quick Recommendations',
  COMPARISON_TABLE: 'Comparison Table',
  TOP_PICK: 'Top Pick',
  RUNNER_UPS: 'Runner-Ups',
  FAQS: 'FAQs',
};

let customTocEntryCounter = 0;
function nextCustomClientId() {
  customTocEntryCounter += 1;
  return `new-custom-${customTocEntryCounter}`;
}

export function entryLabel(entry) {
  return entry.sectionKey ? STRUCTURAL_LABELS[entry.sectionKey] : entry.title || 'Untitled Section';
}

function TocRow({ entry, index, total, onToggleVisible, onEditCustom, onMoveUp, onMoveDown, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: entry.clientId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const label = entryLabel(entry);

  return (
    <li ref={setNodeRef} style={style} className="rounded-btn border border-border bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${label}`}
            className="cursor-grab rounded-btn p-1 text-muted hover:bg-surface-secondary active:cursor-grabbing"
          >
            <GripVertical size={16} />
          </button>
          {entry.sectionKey ? (
            <span className="truncate text-sm font-medium text-body">{label}</span>
          ) : (
            <input
              type="text"
              value={entry.title}
              onChange={(event) => onEditCustom(entry.clientId, { title: event.target.value })}
              placeholder="Section title"
              aria-label="Section title"
              className="w-full rounded-btn border border-border px-2 py-1.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            aria-label={`Move ${label} up`}
            className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp size={16} />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={index === total - 1}
            aria-label={`Move ${label} down`}
            className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowDown size={16} />
          </button>
          <button
            type="button"
            onClick={() => onToggleVisible(entry.clientId)}
            aria-label={entry.visible ? `Hide ${label}` : `Show ${label}`}
            aria-pressed={entry.visible}
            className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary"
          >
            {entry.visible ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          {!entry.sectionKey && (
            <button
              type="button"
              onClick={() => onDelete(entry)}
              aria-label={`Remove ${label}`}
              className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      {!entry.sectionKey && (
        <textarea
          value={entry.content}
          onChange={(event) => onEditCustom(entry.clientId, { content: event.target.value })}
          rows={3}
          placeholder="Section content"
          aria-label="Section content"
          className="mt-2 w-full rounded-btn border border-border px-2 py-1.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      )}
    </li>
  );
}

function TocBuilder({ tocEntries, onChange }) {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function handleAdd() {
    onChange([...tocEntries, { clientId: nextCustomClientId(), sectionKey: null, title: '', content: '', visible: true }]);
  }

  function handleEditCustom(clientId, changes) {
    onChange(tocEntries.map((entry) => (entry.clientId === clientId ? { ...entry, ...changes } : entry)));
  }

  function handleToggleVisible(clientId) {
    onChange(tocEntries.map((entry) => (entry.clientId === clientId ? { ...entry, visible: !entry.visible } : entry)));
  }

  function handleMoveUp(index) {
    if (index === 0) return;
    const next = [...tocEntries];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function handleMoveDown(index) {
    if (index === tocEntries.length - 1) return;
    const next = [...tocEntries];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  function handleRequestDelete(entry) {
    if (entry.content.trim()) {
      setDeleteTarget(entry);
    } else {
      onChange(tocEntries.filter((e) => e.clientId !== entry.clientId));
    }
  }

  function handleConfirmDelete() {
    onChange(tocEntries.filter((e) => e.clientId !== deleteTarget.clientId));
    setDeleteTarget(null);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tocEntries.findIndex((entry) => entry.clientId === active.id);
    const newIndex = tocEntries.findIndex((entry) => entry.clientId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...tocEntries];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onChange(next);
  }

  return (
    <div>
      <span className="mb-1 block text-small font-medium text-body">Table of Contents</span>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tocEntries.map((entry) => entry.clientId)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2" aria-label="Table of contents entries">
            {tocEntries.map((entry, index) => (
              <TocRow
                key={entry.clientId}
                entry={entry}
                index={index}
                total={tocEntries.length}
                onToggleVisible={handleToggleVisible}
                onEditCustom={handleEditCustom}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                onDelete={handleRequestDelete}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <Button type="button" variant="secondary" size="sm" onClick={handleAdd} className="mt-3">
        <Plus size={16} />
        Add Section
      </Button>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Remove Section"
        message={deleteTarget ? `"${entryLabel(deleteTarget)}" has content. This will permanently delete it.` : ''}
        confirmLabel="Remove"
        isDestructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default TocBuilder;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/TocBuilder.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/TocBuilder.jsx frontend/src/components/buying-guide-form/TocBuilder.test.jsx
git commit -m "feat(admin): add drag-and-drop TocBuilder for buying guide table of contents"
```

---

## Task 5: Build `Stepper.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/Stepper.jsx`
- Test: `frontend/src/components/buying-guide-form/Stepper.test.jsx`

**Interfaces:**
- Produces: `<Stepper />` — no props. Always shows step 1 ("Basic Info") active; steps 2–9 render `disabled`, so their `onClick` is natively a no-op.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/buying-guide-form/Stepper.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Stepper from './Stepper.jsx';

describe('Stepper', () => {
  it('marks Basic Info as the active, enabled step', () => {
    render(<Stepper />);
    const basicInfoButton = screen.getByRole('button', { name: /Basic Info/ });
    expect(basicInfoButton).toBeEnabled();
    expect(basicInfoButton).toHaveAttribute('aria-current', 'step');
  });

  it('disables every step after Basic Info', () => {
    render(<Stepper />);
    expect(screen.getByRole('button', { name: /Products/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /SEO & Publish/ })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/Stepper.test.jsx`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Implement**

Create `frontend/src/components/buying-guide-form/Stepper.jsx`:

```jsx
const STEPS = [
  'Basic Info',
  'Products',
  'Quick Picks',
  'Comparison',
  'Top Pick',
  'Runner-Ups',
  'Buying Guide',
  'FAQs',
  'SEO & Publish',
];

function Stepper() {
  return (
    <nav aria-label="Buying guide steps" className="mb-6 overflow-x-auto">
      <ol className="flex min-w-max items-center gap-2">
        {STEPS.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === 1;
          return (
            <li key={label} className="flex items-center gap-2">
              <button
                type="button"
                disabled={!isActive}
                aria-current={isActive ? 'step' : undefined}
                className={`flex items-center gap-2 rounded-btn px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-primary text-white' : 'cursor-not-allowed text-muted opacity-60'
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                    isActive ? 'bg-white text-primary' : 'bg-slate-200 text-muted'
                  }`}
                >
                  {stepNumber}
                </span>
                {label}
              </button>
              {stepNumber < STEPS.length && <span className="h-px w-4 bg-border" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Stepper;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/Stepper.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/Stepper.jsx frontend/src/components/buying-guide-form/Stepper.test.jsx
git commit -m "feat(admin): add Stepper for buying guide editor"
```

---

## Task 6: Build `LivePreview.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/LivePreview.jsx`
- Test: `frontend/src/components/buying-guide-form/LivePreview.test.jsx`

**Interfaces:**
- Consumes: `STRUCTURAL_LABELS` from `./TocBuilder.jsx` (Task 4), `AffiliateDisclosure` (`../AffiliateDisclosure.jsx`, existing), `getImageUrl` (`../../utils/imageUrl.js`, existing).
- Produces: `<LivePreview title excerpt coverImageFilename tocEntries settings />`. `settings` is the raw object returned by `getSettings()` (or `null` before it loads) — passed straight to `AffiliateDisclosure` as `text={settings?.affiliateDisclosure}`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/buying-guide-form/LivePreview.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LivePreview from './LivePreview.jsx';

const tocEntries = [
  { clientId: 'QUICK_RECOMMENDATIONS', sectionKey: 'QUICK_RECOMMENDATIONS', title: '', content: '', visible: true },
  { clientId: 'custom-1', sectionKey: null, title: 'Warranty Info', content: 'Details.', visible: true },
  { clientId: 'FAQS', sectionKey: 'FAQS', title: '', content: '', visible: false },
];

describe('LivePreview', () => {
  it('reflects typed-in title and excerpt without a save', () => {
    render(<LivePreview title="Best Blenders 2026" excerpt="A quick roundup." coverImageFilename={null} tocEntries={[]} settings={null} />);
    expect(screen.getByText('Best Blenders 2026')).toBeInTheDocument();
    expect(screen.getByText('A quick roundup.')).toBeInTheDocument();
  });

  it('lists only visible TOC entries, showing derived labels for structural rows', () => {
    render(<LivePreview title="Guide" excerpt="Excerpt" coverImageFilename={null} tocEntries={tocEntries} settings={null} />);
    const tocList = screen.getByRole('list', { name: 'Table of contents' });
    expect(within(tocList).getByText('Quick Recommendations')).toBeInTheDocument();
    expect(within(tocList).getByText('Warranty Info')).toBeInTheDocument();
    expect(within(tocList).queryByText('FAQs')).not.toBeInTheDocument();
  });

  it('renders the affiliate disclosure from settings', () => {
    render(
      <LivePreview
        title="Guide"
        excerpt="Excerpt"
        coverImageFilename={null}
        tocEntries={[]}
        settings={{ affiliateDisclosure: 'Custom disclosure text.' }}
      />
    );
    expect(screen.getByText('Custom disclosure text.')).toBeInTheDocument();
  });

  it('falls back to the default disclosure when settings have not loaded', () => {
    render(<LivePreview title="Guide" excerpt="Excerpt" coverImageFilename={null} tocEntries={[]} settings={null} />);
    expect(screen.getByText(/as an amazon associate/i)).toBeInTheDocument();
  });
});
```

Add `within` to the RTL import: `import { render, screen, within } from '@testing-library/react';`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/LivePreview.test.jsx`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Implement**

Create `frontend/src/components/buying-guide-form/LivePreview.jsx`:

```jsx
import { Image as ImageIcon } from 'lucide-react';
import AffiliateDisclosure from '../AffiliateDisclosure.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';
import { STRUCTURAL_LABELS } from './TocBuilder.jsx';

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function LivePreview({ title, excerpt, coverImageFilename, tocEntries, settings }) {
  const previewUrl = getImageUrl(coverImageFilename);
  const visibleEntries = tocEntries.filter((entry) => entry.visible);

  return (
    <div className="rounded-card border border-border bg-white p-5">
      <p className="mb-3 text-xs text-muted">Home / Buying Guides / {title || 'Untitled Guide'}</p>

      <div className="mb-4 flex h-40 items-center justify-center overflow-hidden rounded-image bg-surface-secondary">
        {previewUrl ? (
          <img src={previewUrl} alt={title || 'Buying guide preview'} className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-10 w-10 text-slate-300" />
        )}
      </div>

      <h2 className="mb-1 text-card-title text-heading">{title || 'Untitled Guide'}</h2>
      <p className="mb-4 text-xs text-muted">By 2Go Findz Team &middot; Updated {todayLabel()}</p>

      {excerpt && <p className="mb-4 text-sm text-body">{excerpt}</p>}

      {visibleEntries.length > 0 && (
        <div className="mb-4">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">Table of Contents</span>
          <ul className="space-y-1" aria-label="Table of contents">
            {visibleEntries.map((entry) => (
              <li key={entry.clientId} className="text-sm text-primary">
                {entry.sectionKey ? STRUCTURAL_LABELS[entry.sectionKey] : entry.title || 'Untitled Section'}
              </li>
            ))}
          </ul>
        </div>
      )}

      <AffiliateDisclosure text={settings?.affiliateDisclosure} />
    </div>
  );
}

export default LivePreview;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/LivePreview.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/LivePreview.jsx frontend/src/components/buying-guide-form/LivePreview.test.jsx
git commit -m "feat(admin): add LivePreview panel for buying guide editor"
```

---

## Task 7: Build `EditorHeader.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/EditorHeader.jsx`
- Test: `frontend/src/components/buying-guide-form/EditorHeader.test.jsx`

**Interfaces:**
- Consumes: `Button`, `ConfirmDialog` (existing).
- Produces: `<EditorHeader isEditMode status onPreview onSaveDraft onPublish onCancel isSubmitting />`. `status` is one of `'Draft' | 'Scheduled' | 'Published'`. `onPublish` is only invoked after the user confirms the `ConfirmDialog` this component owns — callers never need their own confirm step for it.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/buying-guide-form/EditorHeader.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import EditorHeader from './EditorHeader.jsx';

function renderHeader(overrides = {}) {
  return render(
    <EditorHeader
      isEditMode={false}
      status="Draft"
      onPreview={vi.fn()}
      onSaveDraft={vi.fn()}
      onPublish={vi.fn()}
      onCancel={vi.fn()}
      isSubmitting={false}
      {...overrides}
    />
  );
}

describe('EditorHeader', () => {
  it('shows "Add Buying Guide" and the current status when not editing', () => {
    renderHeader({ status: 'Draft' });
    expect(screen.getByRole('heading', { name: 'Add Buying Guide' })).toBeInTheDocument();
    expect(screen.getByText('Draft', { selector: 'span' })).toBeInTheDocument();
  });

  it('shows "Edit Buying Guide" when editing', () => {
    renderHeader({ isEditMode: true, status: 'Scheduled' });
    expect(screen.getByRole('heading', { name: 'Edit Buying Guide' })).toBeInTheDocument();
    expect(screen.getByText('Scheduled', { selector: 'span' })).toBeInTheDocument();
  });

  it('calls onCancel when the back link is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderHeader({ onCancel });

    await user.click(screen.getByRole('button', { name: /Buying Guides/ }));

    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onPreview and onSaveDraft directly, without a confirm step', async () => {
    const onPreview = vi.fn();
    const onSaveDraft = vi.fn();
    const user = userEvent.setup();
    renderHeader({ onPreview, onSaveDraft });

    await user.click(screen.getByRole('button', { name: 'Preview' }));
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    expect(onPreview).toHaveBeenCalled();
    expect(onSaveDraft).toHaveBeenCalled();
  });

  it('requires confirmation before calling onPublish', async () => {
    const onPublish = vi.fn();
    const user = userEvent.setup();
    renderHeader({ onPublish });

    await user.click(screen.getByRole('button', { name: 'Publish Guide' }));
    expect(onPublish).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Publish' }));
    expect(onPublish).toHaveBeenCalled();
  });

  it('disables all action buttons while submitting', () => {
    renderHeader({ isSubmitting: true });
    expect(screen.getByRole('button', { name: 'Preview' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Publishing...' })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/EditorHeader.test.jsx`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Implement**

Create `frontend/src/components/buying-guide-form/EditorHeader.jsx`:

```jsx
import { useState } from 'react';
import { ChevronDown, Eye } from 'lucide-react';
import Button from '../Button.jsx';
import ConfirmDialog from '../ConfirmDialog.jsx';

const STATUS_STYLES = {
  Draft: 'bg-slate-100 text-slate-600',
  Scheduled: 'bg-warning/10 text-warning',
  Published: 'bg-success/10 text-success',
};

function EditorHeader({ isEditMode, status, onPreview, onSaveDraft, onPublish, onCancel, isSubmitting }) {
  const [isConfirmingPublish, setIsConfirmingPublish] = useState(false);

  function handleConfirmPublish() {
    setIsConfirmingPublish(false);
    onPublish();
  }

  return (
    // top-14 approximates AdminTopbar's rendered height; confirm and adjust with
    // getComputedStyle during the Task 11 browser verification pass.
    <div className="sticky top-14 z-20 -mx-6 mb-6 border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button type="button" onClick={onCancel} className="mb-1 text-sm font-medium text-muted hover:text-primary">
            &larr; Buying Guides
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-card-title text-heading">{isEditMode ? 'Edit Buying Guide' : 'Add Buying Guide'}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>{status}</span>
          </div>
          <p className="text-sm text-muted">Manage your buying guide&apos;s basic information, content, and settings.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onPreview} disabled={isSubmitting}>
            <Eye size={16} />
            Preview
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onSaveDraft} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save as Draft'}
          </Button>
          <div className="flex">
            <Button
              type="button"
              size="sm"
              onClick={() => setIsConfirmingPublish(true)}
              disabled={isSubmitting}
              className="rounded-r-none"
            >
              {isSubmitting ? 'Publishing...' : 'Publish Guide'}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              aria-label="More publish options"
              className="rounded-l-none border-l border-white/20 px-2"
            >
              <ChevronDown size={16} />
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmingPublish}
        title="Publish this guide?"
        message="This makes the guide live immediately, overriding its current status and any scheduled date."
        confirmLabel="Publish"
        isLoading={isSubmitting}
        onConfirm={handleConfirmPublish}
        onCancel={() => setIsConfirmingPublish(false)}
      />
    </div>
  );
}

export default EditorHeader;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/EditorHeader.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/EditorHeader.jsx frontend/src/components/buying-guide-form/EditorHeader.test.jsx
git commit -m "feat(admin): add sticky EditorHeader for buying guide editor"
```

---

## Task 8: Build `BasicInfoStep.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/BasicInfoStep.jsx`
- Test: `frontend/src/components/buying-guide-form/BasicInfoStep.test.jsx`

**Interfaces:**
- Consumes: `ImageUploader` (Task 2's `label` prop), `IntroductionEditor` (Task 3), `TocBuilder` (Task 4).
- Produces: `<BasicInfoStep values onChange categories fieldErrors tocEntries onTocEntriesChange introduction onIntroductionChange />`. `values` shape: `{title, slug, excerpt, coverImageFilename, categoryId, status, scheduledPublishAt}`. `onChange(field, value)` is a single dispatcher, matching `ComparisonForm`'s `handleBasicInfoChange` pattern — this component never special-cases `title`/`slug`/`status` interactions itself; that cross-field logic lives in the parent (Task 9).

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/buying-guide-form/BasicInfoStep.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BasicInfoStep from './BasicInfoStep.jsx';

vi.mock('./IntroductionEditor.jsx', () => ({
  default: ({ value, onChange, error }) => (
    <div>
      <textarea aria-label="Introduction" value={value} onChange={(event) => onChange(event.target.value)} />
      {error && <p>{error}</p>}
    </div>
  ),
}));

const categories = [{ id: 1, productCategoryName: 'Kitchen' }];
const baseValues = {
  title: '',
  slug: '',
  excerpt: '',
  coverImageFilename: null,
  categoryId: '',
  status: 'Draft',
  scheduledPublishAt: '',
};

function renderStep(overrides = {}) {
  return render(
    <BasicInfoStep
      values={{ ...baseValues, ...overrides.values }}
      onChange={overrides.onChange ?? vi.fn()}
      categories={categories}
      fieldErrors={overrides.fieldErrors ?? {}}
      tocEntries={overrides.tocEntries ?? []}
      onTocEntriesChange={overrides.onTocEntriesChange ?? vi.fn()}
      introduction={overrides.introduction ?? ''}
      onIntroductionChange={overrides.onIntroductionChange ?? vi.fn()}
    />
  );
}

describe('BasicInfoStep', () => {
  it('renders the featured-image label instead of the default product label', () => {
    renderStep();
    expect(screen.getByText('Featured Image')).toBeInTheDocument();
  });

  it('shows the remaining excerpt character count', () => {
    renderStep({ values: { excerpt: 'Hello' } });
    expect(screen.getByText('245 characters remaining')).toBeInTheDocument();
  });

  it('populates the category select from the categories prop', () => {
    renderStep();
    expect(screen.getByRole('option', { name: 'Kitchen' })).toBeInTheDocument();
  });

  it('only shows the Publish Date field when Status is Scheduled', () => {
    renderStep({ values: { status: 'Scheduled' } });
    expect(screen.getByLabelText('Publish Date')).toBeInTheDocument();
  });

  it('hides the Publish Date field when Status is Draft', () => {
    renderStep({ values: { status: 'Draft' } });
    expect(screen.queryByLabelText('Publish Date')).not.toBeInTheDocument();
  });

  it('shows field-level validation errors', () => {
    renderStep({ fieldErrors: { title: 'Title is required.' } });
    expect(screen.getByText('Title is required.')).toBeInTheDocument();
  });

  it('calls onChange when the title field is edited', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderStep({ onChange });

    await user.type(screen.getByLabelText('Title'), 'X');

    expect(onChange).toHaveBeenCalledWith('title', 'X');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/BasicInfoStep.test.jsx`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Implement**

Create `frontend/src/components/buying-guide-form/BasicInfoStep.jsx`:

```jsx
import ImageUploader from '../ImageUploader.jsx';
import IntroductionEditor from './IntroductionEditor.jsx';
import TocBuilder from './TocBuilder.jsx';

function BasicInfoStep({ values, onChange, categories, fieldErrors, tocEntries, onTocEntriesChange, introduction, onIntroductionChange }) {
  const excerptRemaining = 250 - values.excerpt.length;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <ImageUploader
          imageFileName={values.coverImageFilename}
          onChange={(value) => onChange('coverImageFilename', value)}
          label="Featured Image"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="title" className="mb-1 block text-small font-medium text-body">
          Title
        </label>
        <input
          id="title"
          type="text"
          maxLength={200}
          value={values.title}
          onChange={(event) => onChange('title', event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.title)}
          aria-describedby={fieldErrors.title ? 'title-error' : undefined}
        />
        {fieldErrors.title && (
          <p id="title-error" className="mt-1 text-sm text-danger">
            {fieldErrors.title}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="slug" className="mb-1 block text-small font-medium text-body">
          Slug
        </label>
        <input
          id="slug"
          type="text"
          maxLength={220}
          value={values.slug}
          onChange={(event) => onChange('slug', event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.slug)}
          aria-describedby={fieldErrors.slug ? 'slug-error' : undefined}
        />
        <p className="mt-1 text-xs text-muted">/buying-guides/{values.slug || '...'}</p>
        {fieldErrors.slug && (
          <p id="slug-error" className="mt-1 text-sm text-danger">
            {fieldErrors.slug}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="excerpt" className="mb-1 block text-small font-medium text-body">
          Excerpt
        </label>
        <textarea
          id="excerpt"
          rows={3}
          maxLength={250}
          value={values.excerpt}
          onChange={(event) => onChange('excerpt', event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.excerpt)}
          aria-describedby={fieldErrors.excerpt ? 'excerpt-error' : undefined}
        />
        <p className="mt-1 text-xs text-muted">{excerptRemaining} characters remaining</p>
        {fieldErrors.excerpt && (
          <p id="excerpt-error" className="mt-1 text-sm text-danger">
            {fieldErrors.excerpt}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="categoryId" className="mb-1 block text-small font-medium text-body">
          Category
        </label>
        <select
          id="categoryId"
          value={values.categoryId}
          onChange={(event) => onChange('categoryId', event.target.value)}
          className="w-full rounded-btn border border-border bg-white px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-invalid={Boolean(fieldErrors.categoryId)}
          aria-describedby={fieldErrors.categoryId ? 'categoryId-error' : undefined}
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.productCategoryName}
            </option>
          ))}
        </select>
        {fieldErrors.categoryId && (
          <p id="categoryId-error" className="mt-1 text-sm text-danger">
            {fieldErrors.categoryId}
          </p>
        )}
      </div>

      <div className="mb-6">
        <IntroductionEditor value={introduction} onChange={onIntroductionChange} error={fieldErrors.introduction} />
      </div>

      <div className="mb-6">
        <TocBuilder tocEntries={tocEntries} onChange={onTocEntriesChange} />
      </div>

      <div className="mb-4">
        <label htmlFor="status" className="mb-1 block text-small font-medium text-body">
          Status
        </label>
        <select
          id="status"
          value={values.status}
          onChange={(event) => onChange('status', event.target.value)}
          className="w-full rounded-btn border border-border bg-white px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="Draft">Draft</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Published">Published</option>
        </select>
      </div>

      {values.status === 'Scheduled' && (
        <div className="mb-4">
          <label htmlFor="scheduledPublishAt" className="mb-1 block text-small font-medium text-body">
            Publish Date
          </label>
          <input
            id="scheduledPublishAt"
            type="datetime-local"
            value={values.scheduledPublishAt}
            onChange={(event) => onChange('scheduledPublishAt', event.target.value)}
            className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            aria-invalid={Boolean(fieldErrors.scheduledPublishAt)}
            aria-describedby={fieldErrors.scheduledPublishAt ? 'scheduledPublishAt-error' : undefined}
          />
          {fieldErrors.scheduledPublishAt && (
            <p id="scheduledPublishAt-error" className="mt-1 text-sm text-danger">
              {fieldErrors.scheduledPublishAt}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default BasicInfoStep;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/BasicInfoStep.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/BasicInfoStep.jsx frontend/src/components/buying-guide-form/BasicInfoStep.test.jsx
git commit -m "feat(admin): add BasicInfoStep composing buying guide Basic Info fields"
```

---

## Task 9: Rewrite `BuyingGuideForm.jsx`

**Files:**
- Modify (full rewrite): `frontend/src/components/BuyingGuideForm.jsx`
- Modify (full rewrite): `frontend/src/components/BuyingGuideForm.test.jsx`

**Interfaces:**
- Consumes: `EditorHeader` (Task 7), `Stepper` (Task 5), `BasicInfoStep` (Task 8), `LivePreview` (Task 6), `Modal` (`./Modal.jsx`, existing), `getSettings` (`../services/settingsService.js`, existing).
- Produces: `<BuyingGuideForm guide categories onSubmit onCancel />` — same external contract `BuyingGuideFormPage.jsx` already uses, plus a new required `categories` prop (Task 10 supplies it). `onSubmit(payload)` receives a complete `BuyingGuideRequest`-shaped object: `{title, slug, excerpt, introduction, coverImageFilename, categoryId, seoTitle, seoDescription, active, scheduledPublishAt, recommendedProductIds, quickRecommendations, comparisonSpecs, recommendationSections, faqs, tocEntries}` (`tocEntries` entries have no `clientId`).

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `frontend/src/components/BuyingGuideForm.test.jsx`:

```jsx
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BuyingGuideForm from './BuyingGuideForm.jsx';
import * as settingsService from '../services/settingsService.js';

vi.mock('./buying-guide-form/IntroductionEditor.jsx', () => ({
  default: ({ value, onChange, error }) => (
    <div>
      <textarea aria-label="Introduction" value={value} onChange={(event) => onChange(event.target.value)} />
      {error && <p>{error}</p>}
    </div>
  ),
}));

const categories = [{ id: 1, productCategoryName: 'Kitchen' }];

function renderForm(props = {}) {
  return render(<BuyingGuideForm guide={null} categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} {...props} />);
}

async function fillRequiredFields(user) {
  await user.type(screen.getByLabelText('Title'), 'Guide Title');
  await user.type(screen.getByLabelText('Excerpt'), 'Excerpt text.');
  await user.selectOptions(screen.getByLabelText('Category'), '1');
  await user.type(screen.getByLabelText('Introduction'), 'Full introduction text.');
}

describe('BuyingGuideForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ affiliateDisclosure: 'Disclosure.' });
  });

  it('renders the Basic Info fields directly, with no tabs', () => {
    renderForm();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Slug')).toBeInTheDocument();
    expect(screen.getByLabelText('Excerpt')).toBeInTheDocument();
  });

  it('starts a new guide with the five structural TOC entries, all visible', () => {
    renderForm();
    const tocList = screen.getByRole('list', { name: 'Table of contents entries' });
    expect(within(tocList).getByText('Quick Recommendations')).toBeInTheDocument();
    expect(within(tocList).getByText('Comparison Table')).toBeInTheDocument();
    expect(within(tocList).getByText('Top Pick')).toBeInTheDocument();
    expect(within(tocList).getByText('Runner-Ups')).toBeInTheDocument();
    expect(within(tocList).getByText('FAQs')).toBeInTheDocument();
  });

  it('auto-derives the slug from the title until the slug is hand-edited', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Title'), 'Best Kitchen Gadgets');
    expect(screen.getByLabelText('Slug')).toHaveValue('best-kitchen-gadgets');

    await user.clear(screen.getByLabelText('Slug'));
    await user.type(screen.getByLabelText('Slug'), 'custom-slug');
    await user.type(screen.getByLabelText('Title'), '!');

    expect(screen.getByLabelText('Slug')).toHaveValue('custom-slug');
  });

  it('shows validation errors when Save as Draft is clicked with empty required fields', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    expect(await screen.findByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByText('Slug is required.')).toBeInTheDocument();
    expect(screen.getByText('Excerpt is required.')).toBeInTheDocument();
    expect(screen.getByText('Category is required.')).toBeInTheDocument();
    expect(screen.getByText('Introduction is required.')).toBeInTheDocument();
  });

  it('reveals and requires a future Publish Date only when Status is Scheduled', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText('Status'), 'Scheduled');
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    expect(await screen.findByText('Publish date is required.')).toBeInTheDocument();
  });

  it('submits active:true and a null scheduledPublishAt when Status is Published', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm({ onSubmit });

    await fillRequiredFields(user);
    await user.selectOptions(screen.getByLabelText('Status'), 'Published');
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.active).toBe(true);
    expect(payload.scheduledPublishAt).toBeNull();
  });

  it('Save as Draft persists whatever Status is currently set, without forcing Draft', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm({ onSubmit });

    await fillRequiredFields(user);
    await user.selectOptions(screen.getByLabelText('Status'), 'Scheduled');
    await user.type(screen.getByLabelText('Publish Date'), '2099-01-01T10:00');
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.active).toBe(false);
    expect(payload.scheduledPublishAt).toBe('2099-01-01T10:00:00');
  });

  it('Publish Guide overrides Status to active:true after confirmation, regardless of the dropdown', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm({ onSubmit });

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Publish Guide' }));
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.active).toBe(true);
    expect(payload.scheduledPublishAt).toBeNull();
  });

  it('calls onCancel from the header back link', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderForm({ onCancel });

    await user.click(screen.getByRole('button', { name: /Buying Guides/ }));

    expect(onCancel).toHaveBeenCalled();
  });

  it('pre-fills every Basic Info field when editing an existing guide', () => {
    const guide = {
      id: 7,
      title: 'Existing Guide',
      slug: 'existing-guide',
      excerpt: 'Existing excerpt.',
      introduction: '<p>Intro</p>',
      coverImageFilename: 'img_existing.webp',
      categoryId: 1,
      seoTitle: null,
      seoDescription: null,
      active: true,
      scheduledPublishAt: null,
      recommendedProducts: [],
      quickRecommendations: [],
      comparisonSpecs: [],
      recommendationSections: [],
      faqs: [],
      tocEntries: [
        { id: 1, sectionKey: 'QUICK_RECOMMENDATIONS', title: null, content: null, visible: true },
        { id: 2, sectionKey: 'COMPARISON_TABLE', title: null, content: null, visible: true },
        { id: 3, sectionKey: 'TOP_PICK', title: null, content: null, visible: true },
        { id: 4, sectionKey: 'RUNNER_UPS', title: null, content: null, visible: true },
        { id: 5, sectionKey: 'FAQS', title: null, content: null, visible: true },
      ],
    };
    render(<BuyingGuideForm guide={guide} categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText('Title')).toHaveValue('Existing Guide');
    expect(screen.getByLabelText('Slug')).toHaveValue('existing-guide');
    expect(screen.getByRole('heading', { name: 'Edit Buying Guide' })).toBeInTheDocument();
    expect(screen.getByText('Published', { selector: 'span' })).toBeInTheDocument();
  });

  it('round-trips quickRecommendations, comparisonSpecs, recommendationSections, faqs, recommendedProductIds, and SEO fields unchanged on save', async () => {
    const guide = {
      id: 7,
      title: 'Existing Guide',
      slug: 'existing-guide',
      excerpt: 'Existing excerpt.',
      introduction: '<p>Intro</p>',
      coverImageFilename: null,
      categoryId: 1,
      seoTitle: 'Existing SEO Title',
      seoDescription: 'Existing SEO description.',
      active: false,
      scheduledPublishAt: null,
      recommendedProducts: [{ id: 42, name: 'Blender' }],
      quickRecommendations: [{ id: 1, product: { id: 42, name: 'Blender' }, badgeName: 'Best Overall' }],
      comparisonSpecs: [
        { id: 1, specificationName: 'Weight', values: [{ id: 1, product: { id: 42, name: 'Blender' }, specificationValue: '2kg' }] },
      ],
      recommendationSections: [
        {
          id: 1,
          product: { id: 42, name: 'Blender' },
          recommendationType: 'TOP_PICK',
          sectionLabel: 'Best Overall',
          whyRecommended: 'Powerful motor.',
          pros: [{ id: 1, content: 'Fast' }],
          cons: [{ id: 2, content: 'Loud' }],
          bestFor: [{ id: 3, content: 'Smoothies' }],
        },
      ],
      faqs: [{ id: 1, question: 'Is it dishwasher safe?', answer: 'Yes.' }],
      tocEntries: [
        { id: 1, sectionKey: 'QUICK_RECOMMENDATIONS', title: null, content: null, visible: true },
        { id: 2, sectionKey: 'COMPARISON_TABLE', title: null, content: null, visible: true },
        { id: 3, sectionKey: 'TOP_PICK', title: null, content: null, visible: true },
        { id: 4, sectionKey: 'RUNNER_UPS', title: null, content: null, visible: true },
        { id: 5, sectionKey: 'FAQS', title: null, content: null, visible: true },
      ],
    };
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<BuyingGuideForm guide={guide} categories={categories} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.recommendedProductIds).toEqual([42]);
    expect(payload.quickRecommendations).toEqual([{ productId: 42, badgeName: 'Best Overall' }]);
    expect(payload.comparisonSpecs).toEqual([{ specificationName: 'Weight', values: [{ productId: 42, value: '2kg' }] }]);
    expect(payload.recommendationSections).toEqual([
      {
        productId: 42,
        recommendationType: 'TOP_PICK',
        sectionLabel: 'Best Overall',
        whyRecommended: 'Powerful motor.',
        pros: [{ content: 'Fast' }],
        cons: [{ content: 'Loud' }],
        bestFor: [{ content: 'Smoothies' }],
      },
    ]);
    expect(payload.faqs).toEqual([{ question: 'Is it dishwasher safe?', answer: 'Yes.' }]);
    expect(payload.seoTitle).toBe('Existing SEO Title');
    expect(payload.seoDescription).toBe('Existing SEO description.');
  });

  it('sends empty collections and null SEO fields for a brand-new guide', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm({ onSubmit });

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.recommendedProductIds).toEqual([]);
    expect(payload.quickRecommendations).toEqual([]);
    expect(payload.comparisonSpecs).toEqual([]);
    expect(payload.recommendationSections).toEqual([]);
    expect(payload.faqs).toEqual([]);
    expect(payload.seoTitle).toBeNull();
    expect(payload.seoDescription).toBeNull();
  });

  it('strips the internal clientId from every TOC entry before submitting', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm({ onSubmit });

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.tocEntries).toHaveLength(5);
    payload.tocEntries.forEach((entry) => expect(entry).not.toHaveProperty('clientId'));
  });

  it('shows a server-side field error and re-enables the button on a failed submit', async () => {
    const onSubmit = vi.fn().mockRejectedValue({ fieldErrors: { slug: 'Slug is already in use.' } });
    const user = userEvent.setup();
    renderForm({ onSubmit });

    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    expect(await screen.findByText('Slug is already in use.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save as Draft' })).toBeEnabled();
  });

  it('opens the live preview modal from the header Preview button', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Title'), 'Preview Me');
    await user.click(screen.getByRole('button', { name: 'Preview' }));

    expect(screen.getByRole('heading', { name: 'Preview' })).toBeInTheDocument();
    expect(screen.getAllByText('Preview Me').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/BuyingGuideForm.test.jsx`
Expected: FAIL — old component doesn't match any of this.

- [ ] **Step 3: Implement**

Replace the full contents of `frontend/src/components/BuyingGuideForm.jsx`:

```jsx
import { useEffect, useState } from 'react';
import EditorHeader from './buying-guide-form/EditorHeader.jsx';
import Stepper from './buying-guide-form/Stepper.jsx';
import BasicInfoStep from './buying-guide-form/BasicInfoStep.jsx';
import LivePreview from './buying-guide-form/LivePreview.jsx';
import Modal from './Modal.jsx';
import { getSettings } from '../services/settingsService.js';

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function deriveStatus(guide) {
  if (!guide) return 'Draft';
  if (guide.active) return 'Published';
  if (guide.scheduledPublishAt) return 'Scheduled';
  return 'Draft';
}

function mapQuickRecommendationsFromResponse(quickRecommendations) {
  return (quickRecommendations ?? []).map((r) => ({ productId: r.product.id, badgeName: r.badgeName }));
}

function mapComparisonSpecsFromResponse(comparisonSpecs) {
  return (comparisonSpecs ?? []).map((spec) => ({
    specificationName: spec.specificationName,
    values: spec.values.map((v) => ({ productId: v.product.id, value: v.specificationValue })),
  }));
}

function mapRecommendationSectionsFromResponse(recommendationSections) {
  return (recommendationSections ?? []).map((section) => ({
    productId: section.product.id,
    recommendationType: section.recommendationType,
    sectionLabel: section.sectionLabel,
    whyRecommended: section.whyRecommended,
    pros: section.pros.map((item) => ({ content: item.content })),
    cons: section.cons.map((item) => ({ content: item.content })),
    bestFor: section.bestFor.map((item) => ({ content: item.content })),
  }));
}

function mapFaqsFromResponse(faqs) {
  return (faqs ?? []).map((faq) => ({ question: faq.question, answer: faq.answer }));
}

function mapTocEntriesFromResponse(tocEntries) {
  return (tocEntries ?? []).map((entry) => ({
    clientId: entry.sectionKey ?? `custom-${entry.id}`,
    sectionKey: entry.sectionKey,
    title: entry.title ?? '',
    content: entry.content ?? '',
    visible: entry.visible,
  }));
}

const DEFAULT_TOC_ENTRIES = ['QUICK_RECOMMENDATIONS', 'COMPARISON_TABLE', 'TOP_PICK', 'RUNNER_UPS', 'FAQS'].map((sectionKey) => ({
  clientId: sectionKey,
  sectionKey,
  title: '',
  content: '',
  visible: true,
}));

function BuyingGuideForm({ guide, categories, onSubmit, onCancel }) {
  const [basicInfo, setBasicInfo] = useState({
    title: guide?.title ?? '',
    slug: guide?.slug ?? '',
    excerpt: guide?.excerpt ?? '',
    coverImageFilename: guide?.coverImageFilename ?? null,
    categoryId: guide?.categoryId !== undefined ? String(guide.categoryId) : '',
    status: deriveStatus(guide),
    scheduledPublishAt: guide?.scheduledPublishAt ? guide.scheduledPublishAt.slice(0, 16) : '',
    isSlugDirty: Boolean(guide),
  });
  const [introduction, setIntroduction] = useState(guide?.introduction ?? '');
  const [tocEntries, setTocEntries] = useState(guide ? mapTocEntriesFromResponse(guide.tocEntries) : DEFAULT_TOC_ENTRIES);
  const [recommendedProductIds] = useState((guide?.recommendedProducts ?? []).map((p) => p.id));
  const [quickRecommendations] = useState(mapQuickRecommendationsFromResponse(guide?.quickRecommendations));
  const [comparisonSpecs] = useState(mapComparisonSpecsFromResponse(guide?.comparisonSpecs));
  const [recommendationSections] = useState(mapRecommendationSectionsFromResponse(guide?.recommendationSections));
  const [faqs] = useState(mapFaqsFromResponse(guide?.faqs));
  const [seoTitle] = useState(guide?.seoTitle ?? null);
  const [seoDescription] = useState(guide?.seoDescription ?? null);
  const [settings, setSettings] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  function handleBasicInfoChange(field, value) {
    setBasicInfo((prev) => {
      if (field === 'title') {
        const next = { ...prev, title: value };
        if (!prev.isSlugDirty) next.slug = slugify(value);
        return next;
      }
      if (field === 'slug') {
        return { ...prev, slug: value, isSlugDirty: true };
      }
      if (field === 'status') {
        return { ...prev, status: value, scheduledPublishAt: value === 'Scheduled' ? prev.scheduledPublishAt : '' };
      }
      return { ...prev, [field]: value };
    });
  }

  function validate() {
    const errors = {};
    if (!basicInfo.title.trim()) errors.title = 'Title is required.';
    if (!basicInfo.slug.trim()) {
      errors.slug = 'Slug is required.';
    } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(basicInfo.slug.trim())) {
      errors.slug = 'Slug must be lowercase letters, numbers, and hyphens only.';
    }
    if (!basicInfo.excerpt.trim()) errors.excerpt = 'Excerpt is required.';
    if (!basicInfo.categoryId) errors.categoryId = 'Category is required.';
    if (!introduction.replace(/<[^>]*>/g, '').trim()) errors.introduction = 'Introduction is required.';
    if (basicInfo.status === 'Scheduled') {
      if (!basicInfo.scheduledPublishAt) {
        errors.scheduledPublishAt = 'Publish date is required.';
      } else if (new Date(basicInfo.scheduledPublishAt) <= new Date()) {
        errors.scheduledPublishAt = 'Publish date must be in the future.';
      }
    }
    tocEntries
      .filter((entry) => !entry.sectionKey)
      .forEach((entry, index) => {
        if (!entry.title.trim() || !entry.content.trim()) {
          errors[`tocEntry-${index}`] = 'Every custom section needs a title and content.';
        }
      });
    return errors;
  }

  function buildPayload(forcePublish) {
    const { active, scheduledPublishAt } = forcePublish
      ? { active: true, scheduledPublishAt: null }
      : basicInfo.status === 'Published'
        ? { active: true, scheduledPublishAt: null }
        : basicInfo.status === 'Scheduled'
          ? { active: false, scheduledPublishAt: `${basicInfo.scheduledPublishAt}:00` }
          : { active: false, scheduledPublishAt: null };

    return {
      title: basicInfo.title.trim(),
      slug: basicInfo.slug.trim(),
      excerpt: basicInfo.excerpt.trim(),
      introduction,
      coverImageFilename: basicInfo.coverImageFilename,
      categoryId: Number(basicInfo.categoryId),
      seoTitle,
      seoDescription,
      active,
      scheduledPublishAt,
      recommendedProductIds,
      quickRecommendations,
      comparisonSpecs,
      recommendationSections,
      faqs,
      tocEntries: tocEntries.map(({ clientId, ...entry }) => entry),
    };
  }

  async function submit(forcePublish) {
    setFormError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(buildPayload(forcePublish));
    } catch (error) {
      setFieldErrors(error.fieldErrors ?? {});
      if (!error.fieldErrors) {
        setFormError(error.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const previewProps = {
    title: basicInfo.title,
    excerpt: basicInfo.excerpt,
    coverImageFilename: basicInfo.coverImageFilename,
    tocEntries,
    settings,
  };

  return (
    <div>
      {formError && (
        <p role="alert" className="mb-4 rounded-btn bg-danger/10 px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}

      <EditorHeader
        isEditMode={Boolean(guide)}
        status={basicInfo.status}
        onPreview={() => setIsPreviewOpen(true)}
        onSaveDraft={() => submit(false)}
        onPublish={() => submit(true)}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
      />

      <Stepper />

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-[72%]">
          <BasicInfoStep
            values={basicInfo}
            onChange={handleBasicInfoChange}
            categories={categories}
            fieldErrors={fieldErrors}
            tocEntries={tocEntries}
            onTocEntriesChange={setTocEntries}
            introduction={introduction}
            onIntroductionChange={setIntroduction}
          />
        </div>
        <div className="hidden lg:block lg:w-[28%]">
          <div className="sticky top-32">
            <LivePreview {...previewProps} />
          </div>
        </div>
      </div>

      <Modal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} title="Preview">
        <LivePreview {...previewProps} />
      </Modal>
    </div>
  );
}

export default BuyingGuideForm;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/BuyingGuideForm.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/BuyingGuideForm.jsx frontend/src/components/BuyingGuideForm.test.jsx
git commit -m "feat(admin): rewrite BuyingGuideForm for the Basic Info editor step"
```

---

## Task 10: Wire `BuyingGuideFormPage.jsx` to the new form

**Files:**
- Modify: `frontend/src/pages/admin/BuyingGuideFormPage.jsx`
- Modify (full rewrite): `frontend/src/pages/admin/BuyingGuideFormPage.test.jsx`

**Interfaces:**
- Consumes: `BuyingGuideForm` (Task 9, now requiring `categories`), `getCategories` (`../../services/adminCategoryService.js`, existing).

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `frontend/src/pages/admin/BuyingGuideFormPage.test.jsx`:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BuyingGuideFormPage from './BuyingGuideFormPage.jsx';
import { ToastProvider } from '../../context/ToastContext.jsx';
import * as adminBuyingGuideService from '../../services/adminBuyingGuideService.js';
import * as adminCategoryService from '../../services/adminCategoryService.js';
import * as settingsService from '../../services/settingsService.js';

vi.mock('../../components/buying-guide-form/IntroductionEditor.jsx', () => ({
  default: ({ value, onChange }) => (
    <textarea aria-label="Introduction" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

function renderPage(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <Routes>
          <Route path="/admin/buying-guides/new" element={<BuyingGuideFormPage />} />
          <Route path="/admin/buying-guides/:id" element={<BuyingGuideFormPage />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('BuyingGuideFormPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminCategoryService, 'getCategories').mockResolvedValue([{ id: 1, productCategoryName: 'Kitchen' }]);
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ affiliateDisclosure: 'Disclosure.' });
  });

  it('renders the create form with an empty title', () => {
    renderPage(['/admin/buying-guides/new']);
    expect(screen.getByLabelText('Title')).toHaveValue('');
  });

  it('loads and pre-fills the edit form', async () => {
    vi.spyOn(adminBuyingGuideService, 'getBuyingGuideById').mockResolvedValue({
      id: 7,
      title: 'Existing Guide',
      slug: 'existing-guide',
      excerpt: 'Existing excerpt.',
      introduction: '<p>Intro</p>',
      coverImageFilename: null,
      categoryId: 1,
      seoTitle: null,
      seoDescription: null,
      active: true,
      scheduledPublishAt: null,
      recommendedProducts: [],
      quickRecommendations: [],
      comparisonSpecs: [],
      recommendationSections: [],
      faqs: [],
      tocEntries: [],
    });
    renderPage(['/admin/buying-guides/7']);

    expect(await screen.findByLabelText('Title')).toHaveValue('Existing Guide');
  });

  it('creates a guide and submits via adminBuyingGuideService on Save as Draft', async () => {
    vi.spyOn(adminBuyingGuideService, 'createBuyingGuide').mockResolvedValue({ id: 1 });
    const user = userEvent.setup();
    renderPage(['/admin/buying-guides/new']);

    await user.type(screen.getByLabelText('Title'), 'New Guide');
    await user.type(screen.getByLabelText('Excerpt'), 'New excerpt.');
    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await user.type(screen.getByLabelText('Introduction'), 'Intro text.');
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    await waitFor(() => expect(adminBuyingGuideService.createBuyingGuide).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/pages/admin/BuyingGuideFormPage.test.jsx`
Expected: FAIL — page doesn't fetch categories or pass them down yet; old form's fields don't match.

- [ ] **Step 3: Implement**

Replace the full contents of `frontend/src/pages/admin/BuyingGuideFormPage.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BuyingGuideForm from '../../components/BuyingGuideForm.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { useToast } from '../../hooks/useToast.js';
import { getBuyingGuideById, createBuyingGuide, updateBuyingGuide } from '../../services/adminBuyingGuideService.js';
import { getCategories } from '../../services/adminCategoryService.js';

function BuyingGuideFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEditMode = Boolean(id);

  const [guide, setGuide] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!isEditMode) return;
    // Resetting loading/error state at the start of each fetch is the standard
    // reset-before-async-work pattern; it can't cascade since neither value
    // is a dependency of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);
    getBuyingGuideById(id)
      .then(setGuide)
      .catch((err) => setError(err.message ?? 'Failed to load buying guide.'))
      .finally(() => setIsLoading(false));
  }, [id, isEditMode]);

  async function handleSubmit(payload) {
    if (isEditMode) {
      await updateBuyingGuide(id, payload);
      showToast('Buying guide updated successfully.');
    } else {
      await createBuyingGuide(payload);
      showToast('Buying guide created successfully.');
    }
    navigate('/admin/buying-guides');
  }

  if (isLoading) return <LoadingSpinner label="Loading buying guide..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <BuyingGuideForm
      guide={guide}
      categories={categories}
      onSubmit={handleSubmit}
      onCancel={() => navigate('/admin/buying-guides')}
    />
  );
}

export default BuyingGuideFormPage;
```

Note: the page's old `<h1>` heading is intentionally removed — `EditorHeader` (inside `BuyingGuideForm`) now owns that heading, so keeping both would render two competing titles.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/pages/admin/BuyingGuideFormPage.test.jsx`
Expected: PASS.

- [ ] **Step 5: Run the full frontend test suite**

Run: `cd frontend && npx vitest run`
Expected: PASS — every test in the project, including the untouched `ProductForm.test.jsx`/`comparison-form/BasicInfoTab`-adjacent tests that exercise `ImageUploader` with its default label.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/admin/BuyingGuideFormPage.jsx frontend/src/pages/admin/BuyingGuideFormPage.test.jsx
git commit -m "feat(admin): wire BuyingGuideFormPage to the rewritten editor and categories fetch"
```

---

## Task 11: Manual browser verification

Not a TDD task — a visual/interaction pass the automated suite can't cover (per CLAUDE.md's "test the golden path... in a browser before reporting the task as complete" and the `run` skill's "drive it, don't just launch it").

- [ ] **Step 1: Start both dev servers** (backend `./mvnw spring-boot:run` from `backend/`, frontend `npm run dev` from `frontend/`) and open the admin Buying Guides section in a real browser (chrome-devtools MCP tools, per this session's established pattern).

- [ ] **Step 2: Measure and correct `EditorHeader`'s sticky offset.** Use `evaluate_script` to read `AdminTopbar`'s actual rendered height (`getBoundingClientRect().height`) and adjust the `top-14` class on `EditorHeader.jsx` if it doesn't match — confirm with `getComputedStyle`, not just a screenshot, mirroring the reskin work's Tailwind-cache debugging approach.

- [ ] **Step 3: Exercise the golden path**: create a new guide (fill Title/Slug auto-fill/Excerpt/Category/Featured Image upload/Introduction rich text incl. each toolbar button/TOC add+edit+delete+reorder-by-drag+reorder-by-button/Status switching including the Publish Date reveal), Save as Draft, confirm the toast and redirect, then open it again in edit mode and confirm every field round-tripped.

- [ ] **Step 4: Exercise Publish Guide** on a Scheduled guide and confirm the `ConfirmDialog` appears and that confirming sets it live (`active:true`) regardless of the dropdown's state.

- [ ] **Step 5: Confirm the data-preservation fix works end-to-end.** Using `mysql` MCP tooling (or the admin API directly), set `quick_recommendations`/`comparison_specs`/`faqs` rows for a test guide, then edit and Save as Draft that guide through the Basic Info page, and verify via the database (or `GET /admin/buying-guides/{id}`) that those rows are untouched.

- [ ] **Step 6: Check responsive/mobile.** Resize to a mobile viewport, confirm the `LivePreview` panel hides and the header's Preview button opens it as a modal instead; confirm the `Stepper` scrolls horizontally without breaking layout.

- [ ] **Step 7: Report and fix.** Fix anything found; if a fix changes code from what a completed task above specified, re-run that task's test file afterward and note the deviation when reporting completion.

---

## Task 12: Finish the development branch

**REQUIRED SUB-SKILL:** Use superpowers:finishing-a-development-branch — run the full test suite (frontend `npx vitest run`; backend unaffected by this plan, so a quick sanity `./mvnw test` is optional but recommended since Task 11 may have touched no backend files), then present the merge/PR/keep menu and follow the user's choice.

After this branch is merged, the completion message required by the original request must be sent verbatim, and no work should begin on the Products tab or any other step without a new reference image:

> ✅ The Buying Guides Basic Info page changes are complete and verified. Please upload the reference image for the Products tab, and I will modify that tab next.

---

## Self-Review

**Spec coverage:** Every section of `docs/superpowers/specs/2026-08-01-buying-guide-basic-info-page-design.md` maps to a task — Component Tree (Tasks 3–10), Field-by-Field Behavior (Task 8/9), TOC Builder (Task 4), Live Preview Panel (Task 6), Stepper (Task 5), Header Actions (Task 7/9), Validation (Task 9), the five corrections made during research (ConfirmDialog reuse in Tasks 4/7, collection/SEO-field preservation in Task 9, back link in Task 7, TipTap extensions in Task 1/3, AffiliateDisclosure reuse in Task 6). Explicitly Out of Scope items (Steps 2–9, autosave, dropdown menu contents, SEO inputs) have no corresponding task, as intended.

**Placeholder scan:** No task contains "TBD"/"add validation"/"similar to Task N" — every step has literal, complete code. The one conditional fallback (Task 3's jsdom/TipTap mounting risk) is a documented contingency with concrete replacement code, not an unresolved placeholder.

**Type/signature consistency:** `TocBuilder`'s entry shape (`{clientId, sectionKey, title, content, visible}`) is identical across Tasks 4, 6, 8, 9. `STRUCTURAL_LABELS`/`entryLabel` are defined once (Task 4) and imported, not redefined, in Task 6. `BasicInfoStep`'s `values` shape (`title, slug, excerpt, coverImageFilename, categoryId, status, scheduledPublishAt`) matches what Task 9's `basicInfo` state produces exactly (`isSlugDirty` is intentionally internal to Task 9's state and never passed down). `EditorHeader`'s prop names (`isEditMode, status, onPreview, onSaveDraft, onPublish, onCancel, isSubmitting`) match Task 9's usage exactly.

**Cross-component test ambiguity:** Task 9's tests query `Table of contents entries` (`TocBuilder`'s list) vs `Table of contents` (`LivePreview`'s list, only reachable via the Preview modal, not asserted against by label text there) and use `{selector: 'span'}` for the status badge — both because `TocBuilder` and `LivePreview` render overlapping text (`"Quick Recommendations"`, `"Published"`) simultaneously once composed in the full form, unlike their isolated Task 4/6 test files.

**A known, pre-existing, out-of-scope bug surfaced during research:** the public `BuyingGuideDetailPage.jsx` still reads `guide.content`, a field the backend stopped returning back in the Stage 1 backend rewrite — the public buying guide page is currently broken for any guide saved through the new admin flow. This plan does not fix it (out of scope — the public page needs the recommended-products/comparison/FAQ rendering that Steps 2–9 will add), but it should be flagged to the user as a separate, pre-existing issue.
