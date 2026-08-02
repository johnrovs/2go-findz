# Buying Guide Basic Info — Visual Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the already-built Buying Guide Basic Info page to match a more detailed reference screenshot: two-column layout, helper text under every field, a wide Featured Image with change/remove controls, richer Introduction toolbar, toggle-switch/lock-icon TOC rows, and a Live Preview panel with a functional desktop/mobile toggle and numbered TOC entries.

**Architecture:** No new components and no architectural changes — this is a refinement pass over `BasicInfoStep`, `ImageUploader`, `IntroductionEditor`, `TocBuilder`, `LivePreview`, and `BuyingGuideForm`, all already built and merged-pending on this branch.

**Tech Stack:** Same as the rest of the stage — React 18.3, Tailwind CSS, `lucide-react` icons (no new icon package), Vitest + React Testing Library.

## Global Constraints

- `AdminSidebar` is explicitly out of scope — do not touch it. The reference's grouped nav sections point to pages (Traffic, Clicks, Commissions, Reports, Users, Integrations) that don't exist in this codebase.
- Real video/embed functionality in the Introduction toolbar is out of scope — the two new buttons are accessible, visually present, no-op stubs.
- Custom TOC entries keep their existing inline title + content editing exactly as already built — the lock icon applies only to the 5 structural rows.
- Full spec: `docs/superpowers/specs/2026-08-02-buying-guide-basic-info-visual-refinement-design.md`.

---

## Task 1: `ImageUploader` wide variant

**Files:**
- Modify: `frontend/src/components/ImageUploader.jsx`
- Test: `frontend/src/components/ImageUploader.test.jsx`

**Interfaces:**
- Produces: `<ImageUploader imageFileName onChange label? variant? helperText? />` — `variant` (`'square'` default, `'wide'` new), `helperText` (string, optional). Existing callers (`ProductForm.jsx`, `comparison-form/BasicInfoTab.jsx`) pass neither, so their rendering is unchanged.

- [ ] **Step 1: Write the failing tests**

Add to `frontend/src/components/ImageUploader.test.jsx` (inside the existing `describe` block, after the `'renders a custom label when provided'` test):

```jsx
  it('renders a wide 16:9 preview and helper text when variant is wide', () => {
    render(
      <ImageUploader
        imageFileName={null}
        onChange={vi.fn()}
        variant="wide"
        helperText="Recommended: 1200x630px (16:9), JPG, PNG or WebP. Max 5MB."
      />
    );
    expect(screen.getByText('Recommended: 1200x630px (16:9), JPG, PNG or WebP. Max 5MB.')).toBeInTheDocument();
    expect(screen.getByText('Upload Image')).toBeInTheDocument();
  });

  it('shows a Change Image label and remove button once an image is set in the wide variant', () => {
    render(<ImageUploader imageFileName="img_123.webp" onChange={vi.fn()} variant="wide" />);
    expect(screen.getByText('Change Image')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove image' })).toBeInTheDocument();
  });

  it('calls onChange with null when the remove button is clicked in the wide variant', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ImageUploader imageFileName="img_123.webp" onChange={onChange} variant="wide" />);

    await user.click(screen.getByRole('button', { name: 'Remove image' }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('keeps the square variant label as "Upload Image" even with an existing image', () => {
    render(<ImageUploader imageFileName="img_123.webp" onChange={vi.fn()} />);
    expect(screen.getByText('Upload Image')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove image' })).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/ImageUploader.test.jsx`
Expected: FAIL — `variant`/`helperText` don't exist yet, "Change Image"/"Remove image" never render.

- [ ] **Step 3: Implement**

Replace the full contents of `frontend/src/components/ImageUploader.jsx`:

```jsx
import { useState } from 'react';
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl.js';
import { uploadImage } from '../services/adminImageService.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function ImageUploader({ imageFileName, onChange, label = 'Product Image', variant = 'square', helperText }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const previewUrl = getImageUrl(imageFileName);
  const isWide = variant === 'wide';

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPG, PNG, and WebP images are allowed.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('Image must be 5MB or smaller.');
      return;
    }

    setIsUploading(true);
    try {
      const { filename } = await uploadImage(file);
      onChange(filename);
    } catch (err) {
      setError(err.message ?? 'Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <span className="mb-1 block text-small font-medium text-body">{label}</span>
      <div className={isWide ? 'flex flex-col gap-3' : 'flex items-center gap-4'}>
        <div
          className={
            isWide
              ? 'relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-card border border-border bg-surface-secondary'
              : 'flex h-24 w-24 items-center justify-center overflow-hidden rounded-card border border-border bg-surface-secondary'
          }
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Product preview" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className={isWide ? 'h-10 w-10 text-slate-300' : 'h-8 w-8 text-slate-300'} />
          )}
          {isWide && previewUrl && (
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label="Remove image"
              className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-danger shadow hover:bg-white"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
        <div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-btn border border-border px-4 py-2 text-sm font-medium text-body hover:bg-slate-50">
            <Upload size={16} />
            {isUploading ? 'Uploading...' : isWide && previewUrl ? 'Change Image' : 'Upload Image'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
            />
          </label>
          {helperText && <p className="mt-2 text-xs text-muted">{helperText}</p>}
          {error && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ImageUploader;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/ImageUploader.test.jsx`
Expected: PASS, all 10 tests (6 existing + 4 new).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ImageUploader.jsx frontend/src/components/ImageUploader.test.jsx
git commit -m "feat(admin): add wide 16:9 variant with change/remove controls to ImageUploader"
```

---

## Task 2: `TocBuilder` icon and heading refinement

**Files:**
- Modify: `frontend/src/components/buying-guide-form/TocBuilder.jsx`
- Modify: `frontend/src/components/buying-guide-form/TocBuilder.test.jsx`

**Interfaces:**
- Unchanged externally: `<TocBuilder tocEntries onChange />` — same props, same `STRUCTURAL_LABELS`/`entryLabel` exports `LivePreview.jsx` depends on.
- The visibility toggle's accessible role changes from `button` to `switch` (still queryable by its `aria-label`, e.g. `getByRole('switch', { name: 'Hide Quick Recommendations' })`).

- [ ] **Step 1: Write the failing tests**

In `frontend/src/components/buying-guide-form/TocBuilder.test.jsx`, change the `'toggles visibility'` test's query from `getByRole('button', ...)` to `getByRole('switch', ...)`:

```jsx
  it('toggles visibility', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TocBuilder tocEntries={structuralEntries} onChange={onChange} />);

    await user.click(screen.getByRole('switch', { name: 'Hide Quick Recommendations' }));

    expect(onChange).toHaveBeenCalledWith([{ ...structuralEntries[0], visible: false }, structuralEntries[1]]);
  });
```

Add a new test after it:

```jsx
  it('shows a lock icon on structural rows but not on custom rows', () => {
    const mixedEntries = [
      structuralEntries[0],
      { clientId: 'custom-1', sectionKey: null, title: 'Custom', content: '', visible: true },
    ];
    const { container } = render(<TocBuilder tocEntries={mixedEntries} onChange={vi.fn()} />);
    const rows = container.querySelectorAll('li');
    expect(rows[0].querySelector('.lucide-lock')).not.toBeNull();
    expect(rows[1].querySelector('.lucide-lock')).toBeNull();
  });

  it('shows the customize-sections subtitle next to the heading', () => {
    render(<TocBuilder tocEntries={structuralEntries} onChange={vi.fn()} />);
    expect(screen.getByText('(Customize the sections that appear in your guide)')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/TocBuilder.test.jsx`
Expected: FAIL — `getByRole('switch', ...)` finds nothing (still a plain button), lock icon and subtitle don't exist yet.

- [ ] **Step 3: Implement**

In `frontend/src/components/buying-guide-form/TocBuilder.jsx`, change the icon import line:

```jsx
import { ArrowDown, ArrowUp, GripVertical, Lock, Plus, Trash2 } from 'lucide-react';
```

Replace the `TocRow` function's body with:

```jsx
function TocRow({ entry, index, total, onToggleVisible, onEditCustom, onMoveUp, onMoveDown, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: entry.clientId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const label = entryLabel(entry);
  const isStructural = Boolean(entry.sectionKey);

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
          {isStructural && <Lock size={14} className="shrink-0 text-muted" aria-hidden="true" />}
          {isStructural ? (
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
        <div className="flex shrink-0 items-center gap-2">
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
            role="switch"
            aria-checked={entry.visible}
            aria-label={entry.visible ? `Hide ${label}` : `Show ${label}`}
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
          {!isStructural && (
            <button
              type="button"
              onClick={() => onDelete(entry)}
              aria-label={`Remove ${label}`}
              className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
      {!isStructural && (
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
```

In the `TocBuilder` function, replace the heading line:

```jsx
      <span className="mb-1 block text-small font-medium text-body">Table of Contents</span>
```

with:

```jsx
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-small font-medium text-body">Table of Contents</span>
        <span className="text-xs text-muted">(Customize the sections that appear in your guide)</span>
      </div>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/TocBuilder.test.jsx`
Expected: PASS, all 9 tests (7 existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/TocBuilder.jsx frontend/src/components/buying-guide-form/TocBuilder.test.jsx
git commit -m "feat(admin): switch TocBuilder to toggle-switch/trash/lock iconography"
```

---

## Task 3: `IntroductionEditor` toolbar additions and word count reformat

**Files:**
- Modify: `frontend/src/components/buying-guide-form/IntroductionEditor.jsx`
- Modify: `frontend/src/components/buying-guide-form/IntroductionEditor.test.jsx`

**Interfaces:** Unchanged: `<IntroductionEditor value onChange error? />`.

- [ ] **Step 1: Write the failing tests**

In `frontend/src/components/buying-guide-form/IntroductionEditor.test.jsx`, update the word-count assertions and add toolbar assertions:

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
    expect(screen.getByText('Words: 2')).toBeInTheDocument();
  });

  it('shows 0 words for empty content', () => {
    render(<IntroductionEditor value="" onChange={vi.fn()} />);
    expect(screen.getByText('Words: 0')).toBeInTheDocument();
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
    expect(screen.getByRole('button', { name: 'Insert video' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert embed' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/IntroductionEditor.test.jsx`
Expected: FAIL — `'Words: 2'`/`'Words: 0'` don't exist yet (still `'2 words'`/`'0 words'`), "Insert video"/"Insert embed" buttons don't exist.

- [ ] **Step 3: Implement**

In `frontend/src/components/buying-guide-form/IntroductionEditor.jsx`, change the icon import:

```jsx
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
} from 'lucide-react';
```

After the "Insert image" button, add:

```jsx
          <button type="button" onClick={handleAddImage} aria-label="Insert image" className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary">
            <ImageIcon size={16} />
          </button>
          {/* Visual-only for now; real video/embed support needs its own TipTap extension. */}
          <button type="button" aria-label="Insert video" className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary">
            <Video size={16} />
          </button>
          <button type="button" aria-label="Insert embed" className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary">
            <Link2 size={16} />
          </button>
```

Replace the word count line:

```jsx
      <p className="mt-1 text-sm text-muted">{wordCount(value)} words</p>
```

with:

```jsx
      <p className="mt-1 text-right text-sm text-muted">Words: {wordCount(value)}</p>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/IntroductionEditor.test.jsx`
Expected: PASS, all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/IntroductionEditor.jsx frontend/src/components/buying-guide-form/IntroductionEditor.test.jsx
git commit -m "feat(admin): add video/embed toolbar stubs and reformat word count in IntroductionEditor"
```

---

## Task 4: `LivePreview` device toggle and numbered TOC

**Files:**
- Modify: `frontend/src/components/buying-guide-form/LivePreview.jsx`
- Modify: `frontend/src/components/buying-guide-form/LivePreview.test.jsx`

**Interfaces:** Unchanged externally: `<LivePreview title excerpt coverImageFilename tocEntries settings />`.

- [ ] **Step 1: Write the failing test**

Add to `frontend/src/components/buying-guide-form/LivePreview.test.jsx` (add `userEvent` import and a new test):

```jsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('constrains the panel width when toggled to mobile', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <LivePreview title="Guide" excerpt="Excerpt" coverImageFilename={null} tocEntries={[]} settings={null} />
    );
    expect(container.firstChild).not.toHaveClass('max-w-[375px]');

    await user.click(screen.getByRole('button', { name: 'Preview on mobile' }));

    expect(container.firstChild).toHaveClass('max-w-[375px]');

    await user.click(screen.getByRole('button', { name: 'Preview on desktop' }));

    expect(container.firstChild).not.toHaveClass('max-w-[375px]');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/LivePreview.test.jsx`
Expected: FAIL on the new "constrains the panel width..." test — "Preview on mobile" button doesn't exist yet.

- [ ] **Step 3: Implement**

Replace the full contents of `frontend/src/components/buying-guide-form/LivePreview.jsx`:

```jsx
import { useState } from 'react';
import { Image as ImageIcon, Monitor, Smartphone } from 'lucide-react';
import AffiliateDisclosure from '../AffiliateDisclosure.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';
import { STRUCTURAL_LABELS } from './TocBuilder.jsx';

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function LivePreview({ title, excerpt, coverImageFilename, tocEntries, settings }) {
  const [device, setDevice] = useState('desktop');
  const previewUrl = getImageUrl(coverImageFilename);
  const visibleEntries = tocEntries.filter((entry) => entry.visible);

  return (
    <div className={`rounded-card border border-border bg-white p-5 ${device === 'mobile' ? 'mx-auto max-w-[375px]' : ''}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs text-muted">Home / Buying Guides / {title || 'Untitled Guide'}</p>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            aria-label="Preview on desktop"
            aria-pressed={device === 'desktop'}
            className={`rounded-btn p-1.5 ${device === 'desktop' ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface-secondary'}`}
          >
            <Monitor size={16} />
          </button>
          <button
            type="button"
            onClick={() => setDevice('mobile')}
            aria-label="Preview on mobile"
            aria-pressed={device === 'mobile'}
            className={`rounded-btn p-1.5 ${device === 'mobile' ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-surface-secondary'}`}
          >
            <Smartphone size={16} />
          </button>
        </div>
      </div>

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
            {visibleEntries.map((entry, index) => (
              <li key={entry.clientId} className="flex items-center gap-2 text-sm text-primary">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <span>{entry.sectionKey ? STRUCTURAL_LABELS[entry.sectionKey] : entry.title || 'Untitled Section'}</span>
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
Expected: PASS, all 5 tests. The label span being a separate element from the numbered-circle span keeps `getByText('Quick Recommendations')` etc. resolving to exactly one element (the circle's own text is `"1"`/`"2"`/etc., never colliding with the label text).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/LivePreview.jsx frontend/src/components/buying-guide-form/LivePreview.test.jsx
git commit -m "feat(admin): add desktop/mobile toggle and numbered TOC to LivePreview"
```

---

## Task 5: `BasicInfoStep` two-column layout and helper text

**Files:**
- Modify: `frontend/src/components/buying-guide-form/BasicInfoStep.jsx`
- Modify: `frontend/src/components/buying-guide-form/BasicInfoStep.test.jsx`

**Interfaces:**
- Consumes: Task 1's `ImageUploader` `variant`/`helperText` props; Task 2's `TocBuilder` (already includes its own subtitle — `BasicInfoStep` does not duplicate it).
- Unchanged externally: `<BasicInfoStep values onChange categories fieldErrors tocEntries onTocEntriesChange introduction onIntroductionChange />`.

- [ ] **Step 1: Write the failing tests**

Replace the full contents of `frontend/src/components/buying-guide-form/BasicInfoStep.test.jsx`:

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
  it('renders a Basic Information heading', () => {
    renderStep();
    expect(screen.getByRole('heading', { name: 'Basic Information' })).toBeInTheDocument();
  });

  it('renders the featured-image label instead of the default product label', () => {
    renderStep();
    expect(screen.getByText('Featured Image')).toBeInTheDocument();
  });

  it('shows the excerpt character count as used / max', () => {
    renderStep({ values: { excerpt: 'Hello' } });
    expect(screen.getByText('5 / 250')).toBeInTheDocument();
  });

  it('populates the category select from the categories prop', () => {
    renderStep();
    expect(screen.getByRole('option', { name: 'Kitchen' })).toBeInTheDocument();
  });

  it('always renders the Publish Date field regardless of Status', () => {
    renderStep({ values: { status: 'Draft' } });
    expect(screen.getByLabelText('Publish Date')).toBeInTheDocument();
  });

  it('shows helper text under each field', () => {
    renderStep();
    expect(screen.getByText('Use a clear, keyword-rich title.')).toBeInTheDocument();
    expect(screen.getByText('A short description for search results and social sharing.')).toBeInTheDocument();
    expect(screen.getByText('Select the main category.')).toBeInTheDocument();
    expect(screen.getByText('Set the current status.')).toBeInTheDocument();
    expect(screen.getByText('Set when the guide will be published.')).toBeInTheDocument();
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
Expected: FAIL — no "Basic Information" heading, excerpt counter still shows "245 characters remaining", Publish Date conditionally hidden, no helper text.

- [ ] **Step 3: Implement**

Replace the full contents of `frontend/src/components/buying-guide-form/BasicInfoStep.jsx`:

```jsx
import ImageUploader from '../ImageUploader.jsx';
import IntroductionEditor from './IntroductionEditor.jsx';
import TocBuilder from './TocBuilder.jsx';

function BasicInfoStep({ values, onChange, categories, fieldErrors, tocEntries, onTocEntriesChange, introduction, onIntroductionChange }) {
  const excerptCount = values.excerpt.length;

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
      <h2 className="text-card-title text-heading lg:col-span-2">Basic Information</h2>

      <div>
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
        <p className="mt-1 text-xs text-muted">Use a clear, keyword-rich title.</p>
        {fieldErrors.title && (
          <p id="title-error" className="mt-1 text-sm text-danger">
            {fieldErrors.title}
          </p>
        )}
      </div>

      <div>
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
        <p className="mt-1 text-xs text-muted">URL: /buying-guides/{values.slug || '...'}</p>
        {fieldErrors.slug && (
          <p id="slug-error" className="mt-1 text-sm text-danger">
            {fieldErrors.slug}
          </p>
        )}
      </div>

      <div className="lg:col-span-2">
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
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-muted">A short description for search results and social sharing.</p>
          <p className="text-xs text-muted">{excerptCount} / 250</p>
        </div>
        {fieldErrors.excerpt && (
          <p id="excerpt-error" className="mt-1 text-sm text-danger">
            {fieldErrors.excerpt}
          </p>
        )}
      </div>

      <div>
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
        <p className="mt-1 text-xs text-muted">Select the main category.</p>
        {fieldErrors.categoryId && (
          <p id="categoryId-error" className="mt-1 text-sm text-danger">
            {fieldErrors.categoryId}
          </p>
        )}
      </div>

      <div>
        <ImageUploader
          imageFileName={values.coverImageFilename}
          onChange={(value) => onChange('coverImageFilename', value)}
          label="Featured Image"
          variant="wide"
          helperText="Recommended: 1200x630px (16:9), JPG, PNG or WebP. Max 5MB."
        />
      </div>

      <div className="lg:col-span-2">
        <IntroductionEditor value={introduction} onChange={onIntroductionChange} error={fieldErrors.introduction} />
      </div>

      <div className="lg:col-span-2">
        <TocBuilder tocEntries={tocEntries} onChange={onTocEntriesChange} />
      </div>

      <div>
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
        <p className="mt-1 text-xs text-muted">Set the current status.</p>
      </div>

      <div>
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
        <p className="mt-1 text-xs text-muted">Set when the guide will be published.</p>
        {fieldErrors.scheduledPublishAt && (
          <p id="scheduledPublishAt-error" className="mt-1 text-sm text-danger">
            {fieldErrors.scheduledPublishAt}
          </p>
        )}
      </div>
    </div>
  );
}

export default BasicInfoStep;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/BasicInfoStep.test.jsx`
Expected: PASS, all 8 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/BasicInfoStep.jsx frontend/src/components/buying-guide-form/BasicInfoStep.test.jsx
git commit -m "feat(admin): two-column layout and helper text for BasicInfoStep"
```

---

## Task 6: `BuyingGuideForm` — stop clearing Publish Date on Status change

**Files:**
- Modify: `frontend/src/components/BuyingGuideForm.jsx`
- Modify: `frontend/src/components/BuyingGuideForm.test.jsx`

**Interfaces:** Unchanged externally.

- [ ] **Step 1: Write the failing test**

In `frontend/src/components/BuyingGuideForm.test.jsx`, rename the test at (currently) line 79 from `'reveals and requires a future Publish Date only when Status is Scheduled'` to `'requires a future Publish Date only when Status is Scheduled'` (body unchanged):

```jsx
  it('requires a future Publish Date only when Status is Scheduled', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText('Status'), 'Scheduled');
    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    expect(await screen.findByText('Publish date is required.')).toBeInTheDocument();
  });
```

Add a new test directly after it:

```jsx
  it('does not clear a picked Publish Date when Status changes away from Scheduled', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText('Status'), 'Scheduled');
    await user.type(screen.getByLabelText('Publish Date'), '2099-01-01T10:00');
    await user.selectOptions(screen.getByLabelText('Status'), 'Draft');

    expect(screen.getByLabelText('Publish Date')).toHaveValue('2099-01-01T10:00');
  });
```

- [ ] **Step 2: Run tests to verify the new test fails**

Run: `cd frontend && npx vitest run src/components/BuyingGuideForm.test.jsx`
Expected: FAIL on the new test — the current `status`-branch in `handleBasicInfoChange` clears `scheduledPublishAt` back to `''` when switching to `'Draft'`.

- [ ] **Step 3: Implement**

In `frontend/src/components/BuyingGuideForm.jsx`, in `handleBasicInfoChange`, remove the `status`-specific branch:

```jsx
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
      return { ...prev, [field]: value };
    });
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/BuyingGuideForm.test.jsx`
Expected: PASS, all 17 tests (16 existing, renamed one intact, 1 new).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/BuyingGuideForm.jsx frontend/src/components/BuyingGuideForm.test.jsx
git commit -m "fix(admin): stop clearing Publish Date when Status changes away from Scheduled"
```

---

## Task 7: Full suite, mirror to main checkout, manual browser verification

Not a TDD task — final verification before returning to finishing the branch.

- [ ] **Step 1: Run the full frontend test suite**

Run: `cd frontend && npx vitest run`
Expected: PASS — every test in the project, backend untouched by this plan.

- [ ] **Step 2: Mirror the six changed files onto the main checkout** (same live-verification pattern already used earlier in this stage — the frontend dev server serves the main checkout, not this worktree):

```bash
for f in \
  frontend/src/components/ImageUploader.jsx \
  frontend/src/components/ImageUploader.test.jsx \
  frontend/src/components/buying-guide-form/TocBuilder.jsx \
  frontend/src/components/buying-guide-form/TocBuilder.test.jsx \
  frontend/src/components/buying-guide-form/IntroductionEditor.jsx \
  frontend/src/components/buying-guide-form/IntroductionEditor.test.jsx \
  frontend/src/components/buying-guide-form/LivePreview.jsx \
  frontend/src/components/buying-guide-form/LivePreview.test.jsx \
  frontend/src/components/buying-guide-form/BasicInfoStep.jsx \
  frontend/src/components/buying-guide-form/BasicInfoStep.test.jsx \
  frontend/src/components/BuyingGuideForm.jsx \
  frontend/src/components/BuyingGuideForm.test.jsx \
; do
  cp ".claude/worktrees/buying-guide-basic-info-page/$f" "$f"
done
```

- [ ] **Step 3: Reload the running dev server and compare against the reference image.** Confirm: two-column layout renders at desktop width and stacks to one column on mobile; Featured Image shows the 16:9 preview with Change Image/remove controls; Status and Publish Date render side by side regardless of Status value; TOC rows show the toggle switch, trash icon, and lock icon (structural rows only); Introduction toolbar shows the two new icons; Live Preview's desktop/mobile toggle visibly narrows the panel and its TOC entries are numbered.

- [ ] **Step 4: Fix anything found**, re-running that task's test file afterward, and note any deviation when reporting completion.

---

## Self-Review

**Spec coverage:** Every section of `docs/superpowers/specs/2026-08-02-buying-guide-basic-info-visual-refinement-design.md` maps to a task — layout/grid (Task 5), field helper text (Task 5), Featured Image wide variant (Task 1), Status/Publish Date always-paired (Tasks 5 + 6), Introduction toolbar (Task 3), TOC iconography (Task 2), Live Preview device toggle and numbered TOC (Task 4). The three explicitly-out-of-scope items (sidebar restructuring, real video/embed, locking custom TOC rows) have no corresponding task, as intended.

**Placeholder scan:** No task contains "TBD"/"style similarly"/unwritten code — every step has complete, literal file contents or literal diffs.

**Type/signature consistency:** `ImageUploader`'s new `variant`/`helperText` props (Task 1) are consumed with the exact same names in `BasicInfoStep` (Task 5). `TocBuilder`'s external props and `STRUCTURAL_LABELS`/`entryLabel` exports (Task 2) are unchanged, so `LivePreview` (Task 4) and `BuyingGuideForm` need no import changes. The `LivePreview` TOC list's label now renders in its own `<span>` (not a bare text node) specifically so `getByText(label)` in both `LivePreview.test.jsx` and any consuming test keeps matching exactly one element once the numbered circle is a sibling — verified against the existing `within(tocList).getByText(...)` assertions.

**Cross-task ordering:** Task 5 depends on Tasks 1 and 2 already landing (it passes `variant`/`helperText` to `ImageUploader` and renders `TocBuilder`, which already owns its own subtitle after Task 2 — `BasicInfoStep` does not duplicate the "Table of Contents" heading). Tasks 1–4 are otherwise independent leaf-component changes and could run in any relative order.
