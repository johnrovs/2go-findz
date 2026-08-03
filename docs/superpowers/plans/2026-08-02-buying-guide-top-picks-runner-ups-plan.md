# Buying Guide — Top Picks & Runner-Ups Step (Step 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Step 5 of the Buying Guide editor — a combined "Top Picks &
Runner-Ups" editor letting an administrator pick one Top Pick and up to
four Runner-Ups from the guide's products, write editorial content (Why We
Recommend It, Pros, Cons, Best For, a recommendation badge) for each, and
save/advance — while collapsing the workflow from nine steps to eight.

**Architecture:** `BuyingGuideRecommendationSection`/`Item` already exist
and are fully wired through `BuyingGuideRequest`/`Response` — this plan is
almost entirely frontend, the same shape Quick Picks and Comparison were
each in before their turn. Top Pick and Runner-Up are the same backend
record type (`recommendationType: TOP_PICK | RUNNER_UP`), so the frontend
manages one combined array and derives the two UI sections from it by
filtering.

**Tech Stack:** React 18, Tailwind CSS, TipTap (already a dependency, used
by `IntroductionEditor.jsx`), `@dnd-kit`, Vitest + React Testing Library,
Spring Boot / JUnit / MockMvc.

## Global Constraints

- `recommendationSections` is one array holding both the Top Pick (if any)
  and every Runner-Up, mirroring the single `@OneToMany` collection with
  one shared `@OrderColumn` on the backend entity — the Top Pick is always
  placed first in the array before any Runner-Ups, since array order
  becomes `display_order` for the whole collection on save.
- Every recommendation entry and every Pro/Con/Best-For item gets a
  client-generated `clientId` (`crypto.randomUUID()`) as its stable id for
  `@dnd-kit`/React keys — never the array index, never sent to the
  backend.
- Product cards never show "Prime" or "availability/in-stock" — no such
  fields exist on `Product`. `product.active === false` drives an inline
  "no longer active" warning wherever an already-selected recommendation's
  product is shown.
- No new confirmation-dialog components — every confirm uses the existing
  `ConfirmDialog.jsx` directly.
- No per-action network calls for Add/Remove/Reorder/Edit — exactly like
  Quick Picks and Comparison, all of this only mutates local state; the
  only network call is the existing form-level `submit()`, whose existing
  error handling already leaves typed content in place on failure (this is
  the "rollback" the spec asks for — no new machinery needed).
- Do not touch Buying Guide, FAQs, or SEO & Publish steps/pages.
- No backend schema/entity/DTO changes — only one small duplicate-product
  validation addition in Task 1, mirroring the Quick Picks/Comparison
  precedent.

---

### Task 1: Backend — reject a product recommended more than once

**Files:**
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/BuyingGuideServiceImpl.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java`

**Interfaces:**
- Consumes: existing `BuyingGuideRecommendationSectionRequest.productId()`.
- Produces: `InvalidBuyingGuideException` (400) when the same `productId`
  appears in more than one recommendation section (Top Pick + Runner-Up,
  or two Runner-Ups) — the existing "at most one Top Pick" check already
  catches Top-Pick-vs-Top-Pick duplicates; this catches every other
  combination.

- [ ] **Step 1: Write the failing test**

Add this test in `AdminBuyingGuideControllerTest.java`, directly after
`create_returns400_whenMoreThanOneTopPick`:

```java
@Test
void create_returns400_whenSameProductRecommendedTwice() throws Exception {
    String token = adminToken();
    Long guideCategoryId = createCategoryId(token, "Dup Recommendation Guide Category");
    Long productCategoryId = createCategoryId(token, "Dup Recommendation Product Category");
    Long productId = createProductId(token, productCategoryId, "Dup Recommendation Product");

    String requestJson = """
            {
              "title": "Dup Recommendation Guide", "slug": "dup-recommendation-guide",
              "excerpt": "Excerpt", "introduction": "Introduction", "coverImageFilename": null,
              "categoryId": %d, "seoTitle": null, "seoDescription": null, "active": true,
              "scheduledPublishAt": null, "recommendedProductIds": [%d],
              "quickRecommendations": [], "comparisonSpecs": [],
              "recommendationSections": [
                {"productId": %d, "recommendationType": "TOP_PICK", "sectionLabel": "Best Overall",
                 "whyRecommended": "Great.", "pros": [{"content": "Good"}],
                 "cons": [{"content": "Bad"}], "bestFor": [{"content": "Everyone"}]},
                {"productId": %d, "recommendationType": "RUNNER_UP", "sectionLabel": "Runner-Up",
                 "whyRecommended": "Also fine.", "pros": [{"content": "Good"}],
                 "cons": [{"content": "Bad"}], "bestFor": [{"content": "Everyone"}]}
              ],
              "faqs": [], "tocEntries": []
            }
            """.formatted(guideCategoryId, productId, productId, productId);

    mockMvc.perform(post("/api/admin/buying-guides")
                    .header("Authorization", "Bearer " + token)
                    .contentType(APPLICATION_JSON)
                    .content(requestJson))
            .andExpect(status().isBadRequest());
}
```

- [ ] **Step 2: Run test to verify it fails**

Run (with `DOCKER_HOST`/`TESTCONTAINERS_RYUK_DISABLED` exported per the
project's Testcontainers-under-Colima setup):
`mvn test -Dtest=AdminBuyingGuideControllerTest#create_returns400_whenSameProductRecommendedTwice`
Expected: FAIL — the request currently returns 200.

- [ ] **Step 3: Implement the minimal fix**

In `BuyingGuideServiceImpl.validateRequest()`, immediately after the
existing `if (topPickCount > 1) { ... }` block, add:

```java
Set<Long> recommendationProductIds = new LinkedHashSet<>();
for (BuyingGuideRecommendationSectionRequest section : request.recommendationSections()) {
    if (!recommendationProductIds.add(section.productId())) {
        throw new InvalidBuyingGuideException(
                "A product cannot be recommended more than once (as Top Pick or Runner-Up).");
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: PASS. Then run the full backend suite
(`mvn test`) to confirm no regressions (baseline was 142/142 before this
task).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/service/impl/BuyingGuideServiceImpl.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java
git commit -m "fix(buying-guides): reject a product recommended more than once"
```

---

### Task 2: `RecommendationBadgeField.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/RecommendationBadgeField.jsx`
- Test: `frontend/src/components/buying-guide-form/RecommendationBadgeField.test.jsx`

**Interfaces:**
- Produces: `RecommendationBadgeField({ id, value, onChange, error })` — a
  labeled, always-editable text input (max 100 chars, matching the
  backend's `sectionLabel` limit). Used by Task 6 (Top Pick) and Task 7
  (Runner-Up cards).

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RecommendationBadgeField from './RecommendationBadgeField.jsx';

describe('RecommendationBadgeField', () => {
  it('renders the current value', () => {
    render(<RecommendationBadgeField id="badge-1" value="Best Overall" onChange={vi.fn()} error={null} />);
    expect(screen.getByLabelText('Recommendation Badge')).toHaveValue('Best Overall');
  });

  it('calls onChange as the admin types', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RecommendationBadgeField id="badge-1" value="Best Overall" onChange={onChange} error={null} />);

    await user.type(screen.getByLabelText('Recommendation Badge'), '!');

    expect(onChange).toHaveBeenCalledWith('Best Overall!');
  });

  it('shows an inline error when provided', () => {
    render(<RecommendationBadgeField id="badge-1" value="" onChange={vi.fn()} error="Recommendation badge is required." />);
    expect(screen.getByText('Recommendation badge is required.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/RecommendationBadgeField.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the implementation**

```jsx
function RecommendationBadgeField({ id, value, onChange, error }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-small font-medium text-body">
        Recommendation Badge
      </label>
      <input
        id={id}
        type="text"
        maxLength={100}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="e.g. Best Overall, Best Budget Alternative"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="w-full max-w-sm rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export default RecommendationBadgeField;
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/RecommendationBadgeField.jsx \
        frontend/src/components/buying-guide-form/RecommendationBadgeField.test.jsx
git commit -m "feat(buying-guides): add RecommendationBadgeField"
```

---

### Task 3: `RecommendationContentEditor.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/RecommendationContentEditor.jsx`
- Test: `frontend/src/components/buying-guide-form/RecommendationContentEditor.test.jsx`

**Interfaces:**
- Consumes: the same TipTap packages `IntroductionEditor.jsx` already
  uses (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`,
  `@tiptap/extension-underline`, `@tiptap/extension-text-align`) — all
  already installed dependencies.
- Produces: `RecommendationContentEditor({ id, value, onChange, error })`
  — rich-text HTML in/out, live word counter, no Image/Video/Embed buttons
  (unlike `IntroductionEditor.jsx`), adds Undo/Redo (`StarterKit` already
  includes the history extension, so `editor.chain().undo()/.redo()` work
  without extra packages).

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RecommendationContentEditor from './RecommendationContentEditor.jsx';

describe('RecommendationContentEditor', () => {
  it('renders the current content and word count', () => {
    render(
      <RecommendationContentEditor id="why-1" value="<p>Great sound and battery life.</p>" onChange={vi.fn()} error={null} />
    );
    expect(screen.getByText('Great sound and battery life.')).toBeInTheDocument();
    expect(screen.getByText('Words: 5')).toBeInTheDocument();
  });

  it('calls onChange when the admin types', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RecommendationContentEditor id="why-1" value="<p>Start</p>" onChange={onChange} error={null} />);

    await user.click(screen.getByText('Start'));
    await user.type(screen.getByText('Start'), '!');

    expect(onChange).toHaveBeenCalled();
  });

  it('shows an inline error when provided', () => {
    render(<RecommendationContentEditor id="why-1" value="" onChange={vi.fn()} error="At least 10 words are required." />);
    expect(screen.getByText('At least 10 words are required.')).toBeInTheDocument();
  });

  it('exposes bold, italic, underline, and undo/redo toolbar buttons', () => {
    render(<RecommendationContentEditor id="why-1" value="<p>Text</p>" onChange={vi.fn()} error={null} />);
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Italic' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Underline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Insert image' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/RecommendationContentEditor.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the implementation**

```jsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
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
  Undo2,
  Redo2,
} from 'lucide-react';

const EXTENSIONS = [
  StarterKit,
  Underline,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Link.configure({ openOnClick: false }),
];

function wordCount(html) {
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

function RecommendationContentEditor({ id, value, onChange, error }) {
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

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-small font-medium text-body">
        Why We Recommend It
      </label>
      <div id={id} className="rounded-btn border border-border">
        <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
          <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} label="Undo">
            <Undo2 size={16} />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} label="Redo">
            <Redo2 size={16} />
          </ToolbarButton>
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
        </div>
        <EditorContent
          editor={editor}
          className="prose max-w-none px-3 py-2 text-slate-900 [&_.ProseMirror]:min-h-[120px] [&_.ProseMirror]:outline-none"
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

export default RecommendationContentEditor;
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/RecommendationContentEditor.jsx \
        frontend/src/components/buying-guide-form/RecommendationContentEditor.test.jsx
git commit -m "feat(buying-guides): add RecommendationContentEditor"
```

---

### Task 4: `RecommendationListEditor.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/RecommendationListEditor.jsx`
- Test: `frontend/src/components/buying-guide-form/RecommendationListEditor.test.jsx`

**Interfaces:**
- Produces: `RecommendationListEditor({ title, items, addLabel, onChange,
  error })` — `items = [{clientId, content}]`. Reused for Pros
  (`addLabel="Pro"`), Cons (`addLabel="Con"`), and Best For
  (`addLabel="Item"`). `onChange` receives the full next `items` array on
  every mutation. `error`, if present, renders once below the list (the
  "at least one item" / "no blank items" message — per-item blank/dup
  prevention happens inline via `handleContentChange`, which simply
  refuses to let the array end up with zero effective validity; the actual
  block-on-Next check lives in `BuyingGuideForm.jsx`, matching how
  Comparison's per-cell errors are computed by the parent and passed down).

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RecommendationListEditor from './RecommendationListEditor.jsx';

const items = [
  { clientId: 'a', content: 'Great sound' },
  { clientId: 'b', content: 'Long battery life' },
];

describe('RecommendationListEditor', () => {
  it('renders the title, items, and Add button label', () => {
    render(<RecommendationListEditor title="Pros" items={items} addLabel="Pro" onChange={vi.fn()} error={null} />);
    expect(screen.getByRole('heading', { name: 'Pros' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Great sound')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Long battery life')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add Pro' })).toBeInTheDocument();
  });

  it('adds a new blank item when Add is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RecommendationListEditor title="Pros" items={items} addLabel="Pro" onChange={onChange} error={null} />);

    await user.click(screen.getByRole('button', { name: '+ Add Pro' }));

    const next = onChange.mock.calls[0][0];
    expect(next).toHaveLength(3);
    expect(next[2].content).toBe('');
  });

  it('calls onChange when an item is edited', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RecommendationListEditor title="Pros" items={items} addLabel="Pro" onChange={onChange} error={null} />);

    await user.type(screen.getByDisplayValue('Great sound'), '!');

    expect(onChange).toHaveBeenCalledWith([
      { clientId: 'a', content: 'Great sound!' },
      { clientId: 'b', content: 'Long battery life' },
    ]);
  });

  it('removes an item when its delete button is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RecommendationListEditor title="Pros" items={items} addLabel="Pro" onChange={onChange} error={null} />);

    await user.click(screen.getByRole('button', { name: 'Delete "Great sound"' }));

    expect(onChange).toHaveBeenCalledWith([{ clientId: 'b', content: 'Long battery life' }]);
  });

  it('moves an item up and down', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RecommendationListEditor title="Pros" items={items} addLabel="Pro" onChange={onChange} error={null} />);

    await user.click(screen.getByRole('button', { name: 'Move "Long battery life" up' }));

    expect(onChange).toHaveBeenCalledWith([
      { clientId: 'b', content: 'Long battery life' },
      { clientId: 'a', content: 'Great sound' },
    ]);
  });

  it('shows an inline error when provided', () => {
    render(<RecommendationListEditor title="Pros" items={[]} addLabel="Pro" onChange={vi.fn()} error="Add at least one pro." />);
    expect(screen.getByText('Add at least one pro.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/RecommendationListEditor.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the implementation**

```jsx
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import Button from '../Button.jsx';

function ListItemRow({ item, index, total, onContentChange, onMoveUp, onMoveDown, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.clientId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const label = item.content || `item ${index + 1}`;

  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Reorder "${label}"`}
        className="cursor-grab rounded-btn p-1 text-muted hover:bg-surface-secondary active:cursor-grabbing"
      >
        <GripVertical size={14} />
      </button>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-muted">
        {index + 1}
      </span>
      <input
        type="text"
        value={item.content}
        onChange={(event) => onContentChange(item.clientId, event.target.value)}
        aria-label={`Item ${index + 1}`}
        className="min-w-0 flex-1 rounded-btn border border-border px-2 py-1.5 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <button
        type="button"
        onClick={() => onMoveUp(index)}
        disabled={index === 0}
        aria-label={`Move "${label}" up`}
        className="rounded-btn p-1 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ArrowUp size={14} />
      </button>
      <button
        type="button"
        onClick={() => onMoveDown(index)}
        disabled={index === total - 1}
        aria-label={`Move "${label}" down`}
        className="rounded-btn p-1 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ArrowDown size={14} />
      </button>
      <button
        type="button"
        onClick={() => onRemove(item.clientId)}
        aria-label={`Delete "${label}"`}
        className="rounded-btn p-1 text-muted hover:bg-surface-secondary hover:text-danger"
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}

function RecommendationListEditor({ title, items, addLabel, onChange, error }) {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function handleAdd() {
    onChange([...items, { clientId: crypto.randomUUID(), content: '' }]);
  }

  function handleContentChange(clientId, content) {
    onChange(items.map((item) => (item.clientId === clientId ? { ...item, content } : item)));
  }

  function handleMoveUp(index) {
    if (index === 0) return;
    const next = [...items];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function handleMoveDown(index) {
    if (index === items.length - 1) return;
    const next = [...items];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  function handleRemove(clientId) {
    onChange(items.filter((item) => item.clientId !== clientId));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.clientId === active.id);
    const newIndex = items.findIndex((item) => item.clientId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...items];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onChange(next);
  }

  return (
    <div className="rounded-btn border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-small font-semibold text-heading">{title}</h4>
        <Button type="button" variant="secondary" size="sm" onClick={handleAdd}>
          <Plus size={14} />+ Add {addLabel}
        </Button>
      </div>

      {items.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((item) => item.clientId)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2" aria-label={title}>
              {items.map((item, index) => (
                <ListItemRow
                  key={item.clientId}
                  item={item}
                  index={index}
                  total={items.length}
                  onContentChange={handleContentChange}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  onRemove={handleRemove}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export default RecommendationListEditor;
```

Note: the Add button's visible text is `+ Add {addLabel}` via a leading
`<Plus>` icon *and* a literal `+` character in the label text — remove the
redundant icon so the accessible name matches the test exactly (`'+ Add
Pro'`). Use just the text, no icon, to keep the accessible name simple:

```jsx
<Button type="button" variant="secondary" size="sm" onClick={handleAdd}>
  + Add {addLabel}
</Button>
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/RecommendationListEditor.jsx \
        frontend/src/components/buying-guide-form/RecommendationListEditor.test.jsx
git commit -m "feat(buying-guides): add RecommendationListEditor"
```

---

### Task 5: `RecommendationProductPicker.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/RecommendationProductPicker.jsx`
- Test: `frontend/src/components/buying-guide-form/RecommendationProductPicker.test.jsx`

**Interfaces:**
- Consumes: `Modal.jsx`, `Button.jsx`, `EmptyState.jsx`, `getImageUrl`.
  Modeled directly on the existing `AddQuickPickDialog.jsx`.
- Produces: `RecommendationProductPicker({ isOpen, onClose, title,
  eligibleProducts, onSelect })`. Reused by both Task 6 (Top Pick
  Add/Change) and Task 8 (Runner-Up Add/Change) with a different `title`
  and `eligibleProducts` computed by the caller.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RecommendationProductPicker from './RecommendationProductPicker.jsx';

const products = [
  { id: 1, name: 'Soundcore Liberty 4 NC', brand: 'Soundcore', productPrice: '69.99', imageFileName: null, rating: 4.8, reviewCount: 12850 },
  { id: 2, name: 'TOZO NC9 Hybrid Active', brand: 'TOZO', productPrice: '39.99', imageFileName: null, rating: null, reviewCount: 0 },
];

describe('RecommendationProductPicker', () => {
  it('renders the title and every eligible product', () => {
    render(<RecommendationProductPicker isOpen={true} onClose={vi.fn()} title="Add Top Pick Product" eligibleProducts={products} onSelect={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Add Top Pick Product' })).toBeInTheDocument();
    expect(screen.getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
    expect(screen.getByText('TOZO NC9 Hybrid Active')).toBeInTheDocument();
  });

  it('filters by search', async () => {
    const user = userEvent.setup();
    render(<RecommendationProductPicker isOpen={true} onClose={vi.fn()} title="Add Top Pick Product" eligibleProducts={products} onSelect={vi.fn()} />);

    await user.type(screen.getByLabelText('Search eligible products'), 'tozo');

    expect(screen.queryByText('Soundcore Liberty 4 NC')).not.toBeInTheDocument();
    expect(screen.getByText('TOZO NC9 Hybrid Active')).toBeInTheDocument();
  });

  it('shows an empty state when there are no eligible products', () => {
    render(<RecommendationProductPicker isOpen={true} onClose={vi.fn()} title="Add Top Pick Product" eligibleProducts={[]} onSelect={vi.fn()} />);
    expect(screen.getByText('No eligible products')).toBeInTheDocument();
  });

  it('calls onSelect and onClose when a product is chosen', async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<RecommendationProductPicker isOpen={true} onClose={onClose} title="Add Top Pick Product" eligibleProducts={products} onSelect={onSelect} />);

    await user.click(screen.getAllByRole('button', { name: 'Select' })[0]);

    expect(onSelect).toHaveBeenCalledWith(products[0]);
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/RecommendationProductPicker.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the implementation**

```jsx
import { useState } from 'react';
import { Image as ImageIcon, Star } from 'lucide-react';
import Modal from '../Modal.jsx';
import Button from '../Button.jsx';
import EmptyState from '../EmptyState.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';

function RecommendationProductPicker({ isOpen, onClose, title, eligibleProducts, onSelect }) {
  const [search, setSearch] = useState('');

  const filtered = eligibleProducts.filter((product) =>
    product.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  function handleSelect(product) {
    onSelect(product);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search products..."
        aria-label="Search eligible products"
        className="mb-4 w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      />

      {eligibleProducts.length === 0 ? (
        <EmptyState
          title="No eligible products"
          description="Every product in this guide is already recommended, or none have been added yet in the Products step."
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No products found" description="Try a different search term." />
      ) : (
        <ul className="max-h-96 space-y-2 overflow-y-auto">
          {filtered.map((product) => {
            const imageUrl = getImageUrl(product.imageFileName);
            return (
              <li key={product.id} className="flex items-center justify-between gap-3 rounded-btn border border-border p-3">
                <div className="flex min-w-0 items-center gap-3">
                  {imageUrl ? (
                    <img src={imageUrl} alt={product.name} className="h-12 w-12 shrink-0 rounded-md object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100">
                      <ImageIcon className="h-5 w-5 text-slate-300" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-body">{product.name}</p>
                    <p className="truncate text-xs text-muted">
                      {product.brand || '—'} · ${Number(product.productPrice).toFixed(2)}
                      {product.rating != null && (
                        <>
                          {' '}
                          · <Star size={12} className="inline fill-star text-star" /> {product.rating} (
                          {product.reviewCount?.toLocaleString() ?? 0})
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={() => handleSelect(product)}>
                  Select
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6 flex justify-end">
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}

export default RecommendationProductPicker;
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/RecommendationProductPicker.jsx \
        frontend/src/components/buying-guide-form/RecommendationProductPicker.test.jsx
git commit -m "feat(buying-guides): add RecommendationProductPicker"
```

---

### Task 6: `TopPickSection.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/TopPickSection.jsx`
- Test: `frontend/src/components/buying-guide-form/TopPickSection.test.jsx`

**Interfaces:**
- Consumes: `RecommendationProductPicker` (Task 5), `RecommendationBadgeField`
  (Task 2), `RecommendationContentEditor` (Task 3), `RecommendationListEditor`
  (Task 4), `ConfirmDialog.jsx`, `EmptyState.jsx`.
- Produces: `TopPickSection({ topPick, eligibleProducts, onSelect, onRemove,
  onFieldChange, fieldErrors })`. `topPick` is either `null` or one
  recommendation entry: `{ clientId, product, sectionLabel, whyRecommended,
  pros, cons, bestFor }`. `onSelect(product)` replaces/sets the Top Pick's
  product only (editorial fields reset to blank on a genuinely new
  selection — see Step 3). `onFieldChange(field, value)` updates one of
  `sectionLabel`/`whyRecommended`/`pros`/`cons`/`bestFor` on the current Top
  Pick. `fieldErrors` is the flat error object from `BuyingGuideForm.jsx`,
  keyed the same way Task 12 constructs it (`badge-{clientId}`,
  `why-{clientId}`, `pros-{clientId}`, `cons-{clientId}`,
  `bestFor-{clientId}`).

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TopPickSection from './TopPickSection.jsx';

const products = [
  { id: 1, name: 'Soundcore Liberty 4 NC', brand: 'Soundcore', productPrice: '69.99', imageFileName: null, rating: 4.8, reviewCount: 12850, active: true },
];

const topPick = {
  clientId: 'tp-1',
  product: products[0],
  sectionLabel: 'Best Overall',
  whyRecommended: '<p>Great sound.</p>',
  pros: [{ clientId: 'p1', content: 'Great sound' }],
  cons: [{ clientId: 'c1', content: 'Pricey' }],
  bestFor: [{ clientId: 'b1', content: 'Daily commuters' }],
};

describe('TopPickSection', () => {
  it('shows the empty state and an Add button when there is no Top Pick', () => {
    render(<TopPickSection topPick={null} eligibleProducts={products} onSelect={vi.fn()} onRemove={vi.fn()} onFieldChange={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByText('No Top Pick selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Top Pick Product' })).toBeInTheDocument();
  });

  it('shows the product summary and editorial editor when a Top Pick exists', () => {
    render(<TopPickSection topPick={topPick} eligibleProducts={products} onSelect={vi.fn()} onRemove={vi.fn()} onFieldChange={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
    expect(screen.getByLabelText('Recommendation Badge')).toHaveValue('Best Overall');
    expect(screen.getByDisplayValue('Great sound')).toBeInTheDocument();
  });

  it('shows an active-warning when the product is no longer active', () => {
    const inactiveTopPick = { ...topPick, product: { ...products[0], active: false } };
    render(<TopPickSection topPick={inactiveTopPick} eligibleProducts={products} onSelect={vi.fn()} onRemove={vi.fn()} onFieldChange={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByText(/no longer active/i)).toBeInTheDocument();
  });

  it('selecting a product immediately when there is no existing Top Pick calls onSelect without confirming', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<TopPickSection topPick={null} eligibleProducts={products} onSelect={onSelect} onRemove={vi.fn()} onFieldChange={vi.fn()} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: 'Add Top Pick Product' }));
    await user.click(screen.getByRole('button', { name: 'Select' }));

    expect(onSelect).toHaveBeenCalledWith(products[0]);
  });

  it('replacing an existing Top Pick requires confirmation before calling onSelect', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const otherProduct = { id: 2, name: 'TOZO NC9', brand: 'TOZO', productPrice: '39.99', imageFileName: null, rating: 4.2, reviewCount: 500, active: true };
    render(
      <TopPickSection
        topPick={topPick}
        eligibleProducts={[...products, otherProduct]}
        onSelect={onSelect}
        onRemove={vi.fn()}
        onFieldChange={vi.fn()}
        fieldErrors={{}}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Change Product' }));
    await user.click(screen.getByRole('button', { name: 'Select' }));
    expect(onSelect).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Replace Product' }));
    expect(onSelect).toHaveBeenCalledWith(otherProduct);
  });

  it('removing the Top Pick requires confirmation before calling onRemove', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(<TopPickSection topPick={topPick} eligibleProducts={products} onSelect={vi.fn()} onRemove={onRemove} onFieldChange={vi.fn()} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: 'Remove Product' }));
    expect(onRemove).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onRemove).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/TopPickSection.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the implementation**

```jsx
import { useState } from 'react';
import { AlertTriangle, Award, Star } from 'lucide-react';
import Button from '../Button.jsx';
import EmptyState from '../EmptyState.jsx';
import ConfirmDialog from '../ConfirmDialog.jsx';
import RecommendationProductPicker from './RecommendationProductPicker.jsx';
import RecommendationBadgeField from './RecommendationBadgeField.jsx';
import RecommendationContentEditor from './RecommendationContentEditor.jsx';
import RecommendationListEditor from './RecommendationListEditor.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';

function TopPickSection({ topPick, eligibleProducts, onSelect, onRemove, onFieldChange, fieldErrors }) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);

  function handlePick(product) {
    if (topPick) {
      setPendingProduct(product);
    } else {
      onSelect(product);
    }
  }

  function handleConfirmReplace() {
    onSelect(pendingProduct);
    setPendingProduct(null);
  }

  function handleConfirmRemove() {
    onRemove();
    setIsRemoveConfirmOpen(false);
  }

  const imageUrl = topPick ? getImageUrl(topPick.product.imageFileName) : null;

  return (
    <div className="mb-6 rounded-card border border-border bg-white p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-card-title text-heading">Top Pick — Our #1 Recommendation</h3>
        {topPick && (
          <Button type="button" variant="secondary" size="sm" onClick={() => setIsPickerOpen(true)}>
            Change Product
          </Button>
        )}
      </div>
      <p className="mb-4 text-sm text-muted">
        Select the product that is your top pick and add your expert reasons, pros, cons, and who it's best for.
      </p>

      {!topPick ? (
        <EmptyState
          title="No Top Pick selected"
          description="Choose the strongest overall product from this guide."
        >
          <Button type="button" size="sm" onClick={() => setIsPickerOpen(true)} className="mt-4">
            Add Top Pick Product
          </Button>
        </EmptyState>
      ) : (
        <>
          <div className="mb-4 flex items-start justify-between gap-3 rounded-btn border border-border p-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100">
                {imageUrl && <img src={imageUrl} alt={topPick.product.name} className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-body">{topPick.product.name}</p>
                {topPick.product.brand && <p className="text-sm text-muted">{topPick.product.brand}</p>}
                <p className="mt-1 font-semibold text-heading">${Number(topPick.product.productPrice).toFixed(2)}</p>
                {topPick.product.rating != null && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-body">
                    <Star size={14} className="fill-star text-star" />
                    {topPick.product.rating}
                    <span className="text-muted">({topPick.product.reviewCount?.toLocaleString() ?? 0})</span>
                  </p>
                )}
                {topPick.product.active === false && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-warning">
                    <AlertTriangle size={14} />
                    This product is no longer active.
                  </p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                <Award size={12} />
                Top Pick
              </span>
              <Button type="button" variant="secondary" size="sm" onClick={() => setIsRemoveConfirmOpen(true)}>
                Remove Product
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <RecommendationBadgeField
              id={`top-pick-badge-${topPick.clientId}`}
              value={topPick.sectionLabel}
              onChange={(value) => onFieldChange('sectionLabel', value)}
              error={fieldErrors[`badge-${topPick.clientId}`]}
            />
            <RecommendationContentEditor
              id={`top-pick-why-${topPick.clientId}`}
              value={topPick.whyRecommended}
              onChange={(value) => onFieldChange('whyRecommended', value)}
              error={fieldErrors[`why-${topPick.clientId}`]}
            />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <RecommendationListEditor
                title="Pros"
                items={topPick.pros}
                addLabel="Pro"
                onChange={(items) => onFieldChange('pros', items)}
                error={fieldErrors[`pros-${topPick.clientId}`]}
              />
              <RecommendationListEditor
                title="Cons"
                items={topPick.cons}
                addLabel="Con"
                onChange={(items) => onFieldChange('cons', items)}
                error={fieldErrors[`cons-${topPick.clientId}`]}
              />
              <RecommendationListEditor
                title="Best For"
                items={topPick.bestFor}
                addLabel="Item"
                onChange={(items) => onFieldChange('bestFor', items)}
                error={fieldErrors[`bestFor-${topPick.clientId}`]}
              />
            </div>
          </div>
        </>
      )}

      <RecommendationProductPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        title={topPick ? 'Change Top Pick Product' : 'Add Top Pick Product'}
        eligibleProducts={eligibleProducts}
        onSelect={handlePick}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingProduct)}
        title="Replace Top Pick?"
        message="Replacing your Top Pick will discard its written content for the current product. This can't be undone once you save."
        confirmLabel="Replace Product"
        isDestructive
        onConfirm={handleConfirmReplace}
        onCancel={() => setPendingProduct(null)}
      />

      <ConfirmDialog
        isOpen={isRemoveConfirmOpen}
        title="Remove Top Pick?"
        message="This removes the Top Pick recommendation only — the product stays in Products, Quick Picks, and Comparison."
        confirmLabel="Remove"
        isDestructive
        onConfirm={handleConfirmRemove}
        onCancel={() => setIsRemoveConfirmOpen(false)}
      />
    </div>
  );
}

export default TopPickSection;
```

Note: `EmptyState.jsx` currently only accepts `title`/`description` props
(no `children`) — check its current signature before writing this task's
code. If it doesn't support `children`, render the `Add Top Pick Product`
button as a sibling directly after `<EmptyState .../>` instead (wrapped in
a centered `<div className="mt-4 flex justify-center">`), matching however
`ComparisonProductsPanel`/`ComparisonSpecificationsEditor` placed their own
`EmptyState` usages.

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/TopPickSection.jsx \
        frontend/src/components/buying-guide-form/TopPickSection.test.jsx
git commit -m "feat(buying-guides): add TopPickSection"
```

---

### Task 7: `RunnerUpEditorCard.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/RunnerUpEditorCard.jsx`
- Test: `frontend/src/components/buying-guide-form/RunnerUpEditorCard.test.jsx`

**Interfaces:**
- Consumes: `RecommendationBadgeField`, `RecommendationContentEditor`,
  `RecommendationListEditor`, `ConfirmDialog.jsx`, `useSortable` (same
  drag pattern as every other reorderable row in this app).
- Produces: `RunnerUpEditorCard({ runnerUp, index, total, onChangeProduct,
  onRemove, onFieldChange, fieldErrors, onMoveUp, onMoveDown })`. Renders
  as one `<li>` (parent supplies `<ul>`/`SortableContext`, same contract as
  `ComparisonSpecificationRow`). Starts collapsed; the header always shows
  summary info regardless of expand state — the editorial editor only
  renders when expanded.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RunnerUpEditorCard from './RunnerUpEditorCard.jsx';

const runnerUp = {
  clientId: 'ru-1',
  product: { id: 2, name: 'TOZO NC9 Hybrid Active', brand: 'TOZO', productPrice: '39.99', imageFileName: null, rating: 4.2, reviewCount: 500, active: true },
  sectionLabel: 'Best Budget Alternative',
  whyRecommended: '<p>Great value.</p>',
  pros: [{ clientId: 'p1', content: 'Affordable' }],
  cons: [{ clientId: 'c1', content: 'Fewer features' }],
  bestFor: [{ clientId: 'b1', content: 'Budget shoppers' }],
};

function renderCard(props = {}) {
  return render(
    <ul>
      <RunnerUpEditorCard
        runnerUp={runnerUp}
        index={0}
        total={1}
        onChangeProduct={vi.fn()}
        onRemove={vi.fn()}
        onFieldChange={vi.fn()}
        fieldErrors={{}}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        {...props}
      />
    </ul>
  );
}

describe('RunnerUpEditorCard', () => {
  it('shows the collapsed header summary', () => {
    renderCard();
    expect(screen.getByText('TOZO NC9 Hybrid Active')).toBeInTheDocument();
    expect(screen.getByText('Best Budget Alternative')).toBeInTheDocument();
    expect(screen.queryByLabelText('Why We Recommend It')).not.toBeInTheDocument();
  });

  it('expands to show the editorial editor', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /expand/i }));

    expect(screen.getByLabelText('Recommendation Badge')).toHaveValue('Best Budget Alternative');
    expect(screen.getByDisplayValue('Affordable')).toBeInTheDocument();
  });

  it('disables Move up on the first card and Move down on the last card', () => {
    renderCard({ index: 0, total: 1 });
    expect(screen.getByRole('button', { name: 'Move TOZO NC9 Hybrid Active up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move TOZO NC9 Hybrid Active down' })).toBeDisabled();
  });

  it('calls onRemove after confirming', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    renderCard({ onRemove });

    await user.click(screen.getByRole('button', { name: 'Remove Runner-Up' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(onRemove).toHaveBeenCalledWith('ru-1');
  });

  it('shows an active-warning when the product is no longer active', () => {
    renderCard({ runnerUp: { ...runnerUp, product: { ...runnerUp.product, active: false } } });
    expect(screen.getByText(/no longer active/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/RunnerUpEditorCard.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the implementation**

```jsx
import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown, ChevronUp, GripVertical, Star, Trash2 } from 'lucide-react';
import Button from '../Button.jsx';
import ConfirmDialog from '../ConfirmDialog.jsx';
import RecommendationBadgeField from './RecommendationBadgeField.jsx';
import RecommendationContentEditor from './RecommendationContentEditor.jsx';
import RecommendationListEditor from './RecommendationListEditor.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';

function RunnerUpEditorCard({ runnerUp, index, total, onChangeProduct, onRemove, onFieldChange, fieldErrors, onMoveUp, onMoveDown }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: runnerUp.clientId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRemoveConfirmOpen, setIsRemoveConfirmOpen] = useState(false);
  const imageUrl = getImageUrl(runnerUp.product.imageFileName);

  function handleConfirmRemove() {
    onRemove(runnerUp.clientId);
    setIsRemoveConfirmOpen(false);
  }

  return (
    <li ref={setNodeRef} style={style} className="rounded-btn border border-border bg-white">
      <div className="flex items-center gap-3 p-4">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${runnerUp.product.name}`}
          className="cursor-grab rounded-btn p-1 text-muted hover:bg-surface-secondary active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-muted">
          {index + 1}
        </span>
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            aria-label={`Move ${runnerUp.product.name} up`}
            className="rounded-btn p-1 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={index === total - 1}
            aria-label={`Move ${runnerUp.product.name} down`}
            className="rounded-btn p-1 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowDown size={14} />
          </button>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {runnerUp.sectionLabel || 'Untitled Badge'}
        </span>
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-slate-100">
          {imageUrl && <img src={imageUrl} alt={runnerUp.product.name} className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-body">{runnerUp.product.name}</p>
          <p className="truncate text-xs text-muted">
            {runnerUp.product.brand || '—'} · ${Number(runnerUp.product.productPrice).toFixed(2)}
            {runnerUp.product.rating != null && (
              <>
                {' '}
                · <Star size={12} className="inline fill-star text-star" /> {runnerUp.product.rating}
              </>
            )}
          </p>
          {runnerUp.product.active === false && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-warning">
              <AlertTriangle size={12} />
              This product is no longer active.
            </p>
          )}
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => onChangeProduct(runnerUp.clientId)}>
          Change Product
        </Button>
        <button
          type="button"
          onClick={() => setIsRemoveConfirmOpen(true)}
          aria-label="Remove Runner-Up"
          className="shrink-0 rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
        >
          <Trash2 size={16} />
        </button>
        <button
          type="button"
          onClick={() => setIsExpanded((open) => !open)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse Runner-Up details' : 'Expand Runner-Up details'}
          className="shrink-0 rounded-btn p-1.5 text-muted hover:bg-surface-secondary"
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-4 border-t border-border p-4">
          <RecommendationBadgeField
            id={`runner-up-badge-${runnerUp.clientId}`}
            value={runnerUp.sectionLabel}
            onChange={(value) => onFieldChange(runnerUp.clientId, 'sectionLabel', value)}
            error={fieldErrors[`badge-${runnerUp.clientId}`]}
          />
          <RecommendationContentEditor
            id={`runner-up-why-${runnerUp.clientId}`}
            value={runnerUp.whyRecommended}
            onChange={(value) => onFieldChange(runnerUp.clientId, 'whyRecommended', value)}
            error={fieldErrors[`why-${runnerUp.clientId}`]}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <RecommendationListEditor
              title="Pros"
              items={runnerUp.pros}
              addLabel="Pro"
              onChange={(items) => onFieldChange(runnerUp.clientId, 'pros', items)}
              error={fieldErrors[`pros-${runnerUp.clientId}`]}
            />
            <RecommendationListEditor
              title="Cons"
              items={runnerUp.cons}
              addLabel="Con"
              onChange={(items) => onFieldChange(runnerUp.clientId, 'cons', items)}
              error={fieldErrors[`cons-${runnerUp.clientId}`]}
            />
            <RecommendationListEditor
              title="Best For"
              items={runnerUp.bestFor}
              addLabel="Item"
              onChange={(items) => onFieldChange(runnerUp.clientId, 'bestFor', items)}
              error={fieldErrors[`bestFor-${runnerUp.clientId}`]}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isRemoveConfirmOpen}
        title="Remove Runner-Up?"
        message="This removes the Runner-Up recommendation only — the product stays in Products, Quick Picks, and Comparison."
        confirmLabel="Remove"
        isDestructive
        onConfirm={handleConfirmRemove}
        onCancel={() => setIsRemoveConfirmOpen(false)}
      />
    </li>
  );
}

export default RunnerUpEditorCard;
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/RunnerUpEditorCard.jsx \
        frontend/src/components/buying-guide-form/RunnerUpEditorCard.test.jsx
git commit -m "feat(buying-guides): add RunnerUpEditorCard"
```

---

### Task 8: `RunnerUpsSection.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/RunnerUpsSection.jsx`
- Test: `frontend/src/components/buying-guide-form/RunnerUpsSection.test.jsx`

**Interfaces:**
- Consumes: `RunnerUpEditorCard` (Task 7), `RecommendationProductPicker`
  (Task 5), `EmptyState.jsx`, `@dnd-kit` (same list pattern as
  `ComparisonSpecificationsEditor`).
- Produces: `RunnerUpsSection({ runnerUps, eligibleProducts, onAdd,
  onChangeProductRequest, onRemove, onFieldChange, onReorder, fieldErrors
  })`. `runnerUps` is the filtered `RUNNER_UP` subset in display order.
  `onChangeProductRequest(clientId)` is called when a card's "Change
  Product" is clicked — the picker for *which* card is being changed is
  owned here (tracking a `changingClientId` piece of state), since only
  one picker instance is needed regardless of how many cards exist.
  `MAX_RUNNER_UPS = 4`.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RunnerUpsSection from './RunnerUpsSection.jsx';

const product = (id, name) => ({ id, name, brand: 'Brand', productPrice: '19.99', imageFileName: null, rating: 4, reviewCount: 10, active: true });

function buildRunnerUp(id, name) {
  return {
    clientId: `ru-${id}`,
    product: product(id, name),
    sectionLabel: `Runner-Up ${id}`,
    whyRecommended: '<p>Good.</p>',
    pros: [{ clientId: 'p', content: 'Good' }],
    cons: [{ clientId: 'c', content: 'Meh' }],
    bestFor: [{ clientId: 'b', content: 'Everyone' }],
  };
}

describe('RunnerUpsSection', () => {
  it('shows the empty state and an Add button when there are no Runner-Ups', () => {
    render(<RunnerUpsSection runnerUps={[]} eligibleProducts={[product(1, 'A')]} onAdd={vi.fn()} onChangeProductRequest={vi.fn()} onRemove={vi.fn()} onFieldChange={vi.fn()} onReorder={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByText('No Runner-Ups added')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Runner-Up Product' })).toBeInTheDocument();
  });

  it('shows the current count and configured maximum', () => {
    render(<RunnerUpsSection runnerUps={[buildRunnerUp(1, 'A')]} eligibleProducts={[]} onAdd={vi.fn()} onChangeProductRequest={vi.fn()} onRemove={vi.fn()} onFieldChange={vi.fn()} onReorder={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByText('1 / 4 Runner-Ups')).toBeInTheDocument();
  });

  it('disables Add Runner-Up Product at the maximum', () => {
    const runnerUps = [1, 2, 3, 4].map((id) => buildRunnerUp(id, `Product ${id}`));
    render(<RunnerUpsSection runnerUps={runnerUps} eligibleProducts={[]} onAdd={vi.fn()} onChangeProductRequest={vi.fn()} onRemove={vi.fn()} onFieldChange={vi.fn()} onReorder={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByRole('button', { name: 'Add Runner-Up Product' })).toBeDisabled();
    expect(screen.getByText(/maximum of 4 runner-ups/i)).toBeInTheDocument();
  });

  it('adding a product calls onAdd', async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<RunnerUpsSection runnerUps={[]} eligibleProducts={[product(1, 'Eligible Product')]} onAdd={onAdd} onChangeProductRequest={vi.fn()} onRemove={vi.fn()} onFieldChange={vi.fn()} onReorder={vi.fn()} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: 'Add Runner-Up Product' }));
    await user.click(screen.getByRole('button', { name: 'Select' }));

    expect(onAdd).toHaveBeenCalledWith(product(1, 'Eligible Product'));
  });

  it('renders one card per Runner-Up', () => {
    render(<RunnerUpsSection runnerUps={[buildRunnerUp(1, 'First'), buildRunnerUp(2, 'Second')]} eligibleProducts={[]} onAdd={vi.fn()} onChangeProductRequest={vi.fn()} onRemove={vi.fn()} onFieldChange={vi.fn()} onReorder={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/RunnerUpsSection.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the implementation**

```jsx
import { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import Button from '../Button.jsx';
import EmptyState from '../EmptyState.jsx';
import RunnerUpEditorCard from './RunnerUpEditorCard.jsx';
import RecommendationProductPicker from './RecommendationProductPicker.jsx';

const MAX_RUNNER_UPS = 4;

function RunnerUpsSection({ runnerUps, eligibleProducts, onAdd, onChangeProductRequest, onRemove, onFieldChange, onReorder, fieldErrors }) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [changingClientId, setChangingClientId] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const isAtMax = runnerUps.length >= MAX_RUNNER_UPS;

  function openAddPicker() {
    setChangingClientId(null);
    setIsPickerOpen(true);
  }

  function openChangePicker(clientId) {
    setChangingClientId(clientId);
    setIsPickerOpen(true);
  }

  function handlePicked(product) {
    if (changingClientId) {
      onChangeProductRequest(changingClientId, product);
    } else {
      onAdd(product);
    }
  }

  function handleMoveUp(index) {
    if (index === 0) return;
    const next = [...runnerUps];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onReorder(next);
  }

  function handleMoveDown(index) {
    if (index === runnerUps.length - 1) return;
    const next = [...runnerUps];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onReorder(next);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = runnerUps.findIndex((r) => r.clientId === active.id);
    const newIndex = runnerUps.findIndex((r) => r.clientId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...runnerUps];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onReorder(next);
  }

  return (
    <div className="rounded-card border border-border bg-white p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-card-title text-heading">Runner-Ups — Strong Alternative Choices</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">
            {runnerUps.length} / {MAX_RUNNER_UPS} Runner-Ups
          </span>
          <Button type="button" size="sm" onClick={openAddPicker} disabled={isAtMax}>
            Add Runner-Up Product
          </Button>
        </div>
      </div>
      <p className="mb-4 text-sm text-muted">
        Add alternative products for readers with different budgets, priorities, or use cases.
      </p>
      {isAtMax && (
        <p className="mb-4 text-sm text-muted">You've reached the maximum of 4 Runner-Ups for this guide.</p>
      )}

      {runnerUps.length === 0 ? (
        <EmptyState
          title="No Runner-Ups added"
          description="Add alternative recommendations for readers who need a different price, feature, or use case."
        >
          <Button type="button" size="sm" onClick={openAddPicker} className="mt-4">
            Add Runner-Up Product
          </Button>
        </EmptyState>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={runnerUps.map((r) => r.clientId)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3" aria-label="Runner-Ups">
              {runnerUps.map((runnerUp, index) => (
                <RunnerUpEditorCard
                  key={runnerUp.clientId}
                  runnerUp={runnerUp}
                  index={index}
                  total={runnerUps.length}
                  onChangeProduct={openChangePicker}
                  onRemove={onRemove}
                  onFieldChange={onFieldChange}
                  fieldErrors={fieldErrors}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <RecommendationProductPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        title={changingClientId ? 'Change Runner-Up Product' : 'Add Runner-Up Product'}
        eligibleProducts={eligibleProducts}
        onSelect={handlePicked}
      />
    </div>
  );
}

export default RunnerUpsSection;
```

Note: as with Task 6, if `EmptyState.jsx` doesn't accept `children`, render
the button as a sibling after it instead.

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/RunnerUpsSection.jsx \
        frontend/src/components/buying-guide-form/RunnerUpsSection.test.jsx
git commit -m "feat(buying-guides): add RunnerUpsSection"
```

---

### Task 9: `TopPicksAndRunnerUpsStep.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/TopPicksAndRunnerUpsStep.jsx`
- Test: `frontend/src/components/buying-guide-form/TopPicksAndRunnerUpsStep.test.jsx`

**Interfaces:**
- Consumes: `TopPickSection` (Task 6), `RunnerUpsSection` (Task 8).
- Produces: `TopPicksAndRunnerUpsStep({ recommendationSections, onChange,
  recommendedProducts, fieldErrors })`. This is the component
  `BuyingGuideForm.jsx` renders directly for `activeStep === 5` (Task 12).
  Internally derives `topPick`/`runnerUps` from the combined
  `recommendationSections` array and constructs every handler needed by
  the two child sections, always calling `onChange` with the *full* next
  combined array (Top Pick first, then Runner-Ups in order — see Global
  Constraints).

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TopPicksAndRunnerUpsStep from './TopPicksAndRunnerUpsStep.jsx';

const products = [
  { id: 1, name: 'Soundcore Liberty 4 NC', brand: 'Soundcore', productPrice: '69.99', imageFileName: null, rating: 4.8, reviewCount: 12850, active: true },
  { id: 2, name: 'TOZO NC9 Hybrid Active', brand: 'TOZO', productPrice: '39.99', imageFileName: null, rating: 4.2, reviewCount: 500, active: true },
];

describe('TopPicksAndRunnerUpsStep', () => {
  it('renders the heading, Top Pick section, and Runner-Ups section', () => {
    render(<TopPicksAndRunnerUpsStep recommendationSections={[]} onChange={vi.fn()} recommendedProducts={products} fieldErrors={{}} />);
    expect(screen.getByRole('heading', { name: 'Top Picks & Runner-Ups' })).toBeInTheDocument();
    expect(screen.getByText('No Top Pick selected')).toBeInTheDocument();
    expect(screen.getByText('No Runner-Ups added')).toBeInTheDocument();
  });

  it('toggles the How it works panel', async () => {
    const user = userEvent.setup();
    render(<TopPicksAndRunnerUpsStep recommendationSections={[]} onChange={vi.fn()} recommendedProducts={products} fieldErrors={{}} />);
    expect(screen.queryByText(/only one product can be the active top pick/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /how it works/i }));

    expect(screen.getByText(/only one product can be the active top pick/i)).toBeInTheDocument();
  });

  it('selecting a Top Pick product calls onChange with a new TOP_PICK entry', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TopPicksAndRunnerUpsStep recommendationSections={[]} onChange={onChange} recommendedProducts={products} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: 'Add Top Pick Product' }));
    await user.click(screen.getAllByRole('button', { name: 'Select' })[0]);

    const next = onChange.mock.calls[0][0];
    expect(next).toHaveLength(1);
    expect(next[0].recommendationType).toBe('TOP_PICK');
    expect(next[0].product.id).toBe(1);
    expect(next[0].pros).toEqual([]);
  });

  it('the Runner-Up product picker excludes the current Top Pick', async () => {
    const topPickSection = {
      clientId: 'tp-1',
      product: products[0],
      recommendationType: 'TOP_PICK',
      sectionLabel: 'Best Overall',
      whyRecommended: '<p>Great.</p>',
      pros: [],
      cons: [],
      bestFor: [],
    };
    const user = userEvent.setup();
    render(<TopPicksAndRunnerUpsStep recommendationSections={[topPickSection]} onChange={vi.fn()} recommendedProducts={products} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: 'Add Runner-Up Product' }));

    expect(screen.queryByText('Soundcore Liberty 4 NC')).not.toBeInTheDocument();
    expect(screen.getByText('TOZO NC9 Hybrid Active')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/TopPicksAndRunnerUpsStep.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the implementation**

```jsx
import { useState } from 'react';
import { HelpCircle, Info } from 'lucide-react';
import TopPickSection from './TopPickSection.jsx';
import RunnerUpsSection from './RunnerUpsSection.jsx';

const HOW_IT_WORKS_POINTS = [
  'The Top Pick is the guide’s primary recommendation.',
  'Only one product can be the active Top Pick.',
  'Runner-Ups are alternative recommendations.',
  'Products must come from the Products tab.',
  'A product cannot be both the Top Pick and a Runner-Up.',
  'The order you set here determines the published display order.',
  'Changes update the live published preview.',
];

function buildRecommendation(product, recommendationType) {
  return {
    clientId: crypto.randomUUID(),
    product,
    recommendationType,
    sectionLabel: '',
    whyRecommended: '',
    pros: [],
    cons: [],
    bestFor: [],
  };
}

function TopPicksAndRunnerUpsStep({ recommendationSections, onChange, recommendedProducts, fieldErrors }) {
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  const topPick = recommendationSections.find((s) => s.recommendationType === 'TOP_PICK') ?? null;
  const runnerUps = recommendationSections.filter((s) => s.recommendationType === 'RUNNER_UP');
  const usedProductIds = new Set(recommendationSections.map((s) => s.product.id));

  function sortWithTopPickFirst(sections) {
    const nextTopPick = sections.find((s) => s.recommendationType === 'TOP_PICK');
    const nextRunnerUps = sections.filter((s) => s.recommendationType === 'RUNNER_UP');
    return nextTopPick ? [nextTopPick, ...nextRunnerUps] : nextRunnerUps;
  }

  function handleTopPickSelect(product) {
    const withoutOldTopPick = recommendationSections.filter((s) => s.recommendationType !== 'TOP_PICK');
    onChange(sortWithTopPickFirst([...withoutOldTopPick, buildRecommendation(product, 'TOP_PICK')]));
  }

  function handleTopPickRemove() {
    onChange(recommendationSections.filter((s) => s.recommendationType !== 'TOP_PICK'));
  }

  function handleTopPickFieldChange(field, value) {
    onChange(
      recommendationSections.map((s) => (s.recommendationType === 'TOP_PICK' ? { ...s, [field]: value } : s))
    );
  }

  function handleRunnerUpAdd(product) {
    onChange(sortWithTopPickFirst([...recommendationSections, buildRecommendation(product, 'RUNNER_UP')]));
  }

  function handleRunnerUpChangeProduct(clientId, product) {
    onChange(
      recommendationSections.map((s) => (s.clientId === clientId ? { ...buildRecommendation(product, 'RUNNER_UP'), clientId } : s))
    );
  }

  function handleRunnerUpRemove(clientId) {
    onChange(recommendationSections.filter((s) => s.clientId !== clientId));
  }

  function handleRunnerUpFieldChange(clientId, field, value) {
    onChange(recommendationSections.map((s) => (s.clientId === clientId ? { ...s, [field]: value } : s)));
  }

  function handleRunnerUpReorder(nextRunnerUps) {
    onChange(sortWithTopPickFirst([...(topPick ? [topPick] : []), ...nextRunnerUps]));
  }

  const topPickEligibleProducts = recommendedProducts.filter(
    (product) => !usedProductIds.has(product.id) || product.id === topPick?.product.id
  );
  const runnerUpEligibleProducts = recommendedProducts.filter((product) => !usedProductIds.has(product.id));

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-card-title text-heading">Top Picks & Runner-Ups</h2>
        <button
          type="button"
          aria-expanded={isHowItWorksOpen}
          aria-controls="top-picks-runner-ups-how-it-works"
          onClick={() => setIsHowItWorksOpen((open) => !open)}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <HelpCircle size={14} />
          How it works
        </button>
      </div>
      <p className="mb-4 text-sm text-muted">
        Select your top recommended product and add the best alternative choices. Explain why each product stands
        out, including its strengths, limitations, and ideal audience.
      </p>

      {isHowItWorksOpen && (
        <ul
          id="top-picks-runner-ups-how-it-works"
          className="mb-4 list-disc space-y-1 rounded-btn bg-surface-secondary p-4 pl-8 text-sm text-body"
        >
          {HOW_IT_WORKS_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}

      <TopPickSection
        topPick={topPick}
        eligibleProducts={topPickEligibleProducts}
        onSelect={handleTopPickSelect}
        onRemove={handleTopPickRemove}
        onFieldChange={handleTopPickFieldChange}
        fieldErrors={fieldErrors}
      />

      <RunnerUpsSection
        runnerUps={runnerUps}
        eligibleProducts={runnerUpEligibleProducts}
        onAdd={handleRunnerUpAdd}
        onChangeProductRequest={handleRunnerUpChangeProduct}
        onRemove={handleRunnerUpRemove}
        onFieldChange={handleRunnerUpFieldChange}
        onReorder={handleRunnerUpReorder}
        fieldErrors={fieldErrors}
      />

      <div className="mt-4 flex items-start gap-2 rounded-btn bg-primary/5 p-4 text-sm text-body">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <p>
          Tip: Your Top Pick is the primary recommendation. Runner-Ups give readers strong alternatives based on
          budget, features, and individual needs.
        </p>
      </div>
    </div>
  );
}

export default TopPicksAndRunnerUpsStep;
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: PASS (4/4).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/TopPicksAndRunnerUpsStep.jsx \
        frontend/src/components/buying-guide-form/TopPicksAndRunnerUpsStep.test.jsx
git commit -m "feat(buying-guides): add TopPicksAndRunnerUpsStep"
```

---

### Task 10: Extend `LivePreview.jsx` — Top Pick, Runner-Ups, and dynamic section numbering

**Files:**
- Modify: `frontend/src/components/buying-guide-form/LivePreview.jsx`
- Modify: `frontend/src/components/buying-guide-form/LivePreview.test.jsx`

**Interfaces:**
- Consumes: `isSupportedAmazonUrl` (existing), `getImageUrl` (existing).
- Produces: `LivePreview` gains `recommendationSections = []` prop
  (containing both Top Pick and Runner-Ups, same combined shape as
  everywhere else in this feature). Replaces the two hardcoded "1."/"2."
  literals with a shared dynamic numbering computed from `tocEntries` +
  which sections actually have content.

- [ ] **Step 1: Write the failing tests**

Add to `LivePreview.test.jsx`, after the existing Comparison Table tests:

```jsx
const topPickSection = {
  clientId: 'tp-1',
  product: { id: 1, name: 'Soundcore Liberty 4 NC', imageFileName: null, productPrice: '69.99', productLink: 'https://amazon.com/dp/a', rating: 4.8, reviewCount: 12850 },
  recommendationType: 'TOP_PICK',
  sectionLabel: 'Best Overall',
  whyRecommended: '<p>Great sound and battery life.</p>',
  pros: [{ clientId: 'p1', content: 'Great sound' }],
  cons: [{ clientId: 'c1', content: 'Pricey' }],
  bestFor: [{ clientId: 'b1', content: 'Daily commuters' }],
};

const runnerUpSection = {
  clientId: 'ru-1',
  product: { id: 2, name: 'TOZO NC9', imageFileName: null, productPrice: '39.99', productLink: 'https://amazon.com/dp/b', rating: 4.2, reviewCount: 500 },
  recommendationType: 'RUNNER_UP',
  sectionLabel: 'Best Budget Alternative',
  whyRecommended: '<p>Solid value for the price.</p>',
  pros: [{ clientId: 'p2', content: 'Affordable' }],
  cons: [{ clientId: 'c2', content: 'Fewer features' }],
  bestFor: [{ clientId: 'b2', content: 'Budget shoppers' }],
};

it('renders the Top Pick and Runner-Ups sections with content', () => {
  render(
    <LivePreview
      title="Best Earbuds"
      excerpt=""
      coverImageFilename={null}
      tocEntries={[]}
      settings={null}
      recommendationSections={[topPickSection, runnerUpSection]}
    />
  );

  expect(screen.getByText(/our top pick/i)).toBeInTheDocument();
  expect(screen.getByText('Best Overall')).toBeInTheDocument();
  expect(screen.getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
  expect(screen.getByText('Great sound')).toBeInTheDocument();
  expect(screen.getByText(/runner-ups/i)).toBeInTheDocument();
  expect(screen.getByText('Best Budget Alternative')).toBeInTheDocument();
  expect(screen.getByText('TOZO NC9')).toBeInTheDocument();
});

it('omits the Top Pick and Runner-Ups sections when there are none', () => {
  render(
    <LivePreview title="Best Earbuds" excerpt="" coverImageFilename={null} tocEntries={[]} settings={null} recommendationSections={[]} />
  );
  expect(screen.queryByText(/our top pick/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/runner-ups/i)).not.toBeInTheDocument();
});

it('numbers sections dynamically based on visible TOC order, skipping empty sections', () => {
  render(
    <LivePreview
      title="Best Earbuds"
      excerpt=""
      coverImageFilename={null}
      tocEntries={[
        { clientId: 'QUICK_RECOMMENDATIONS', sectionKey: 'QUICK_RECOMMENDATIONS', title: '', content: '', visible: false },
        { clientId: 'COMPARISON_TABLE', sectionKey: 'COMPARISON_TABLE', title: '', content: '', visible: true },
        { clientId: 'TOP_PICK', sectionKey: 'TOP_PICK', title: '', content: '', visible: true },
        { clientId: 'RUNNER_UPS', sectionKey: 'RUNNER_UPS', title: '', content: '', visible: true },
      ]}
      settings={null}
      quickRecommendations={[
        { product: { id: 9, name: 'Hidden Product', productPrice: '9.99', productLink: 'https://amazon.com/dp/z', imageFileName: null }, badgeName: 'Hidden' },
      ]}
      comparisonSpecs={[]}
      comparisonProducts={[]}
      recommendationSections={[topPickSection, runnerUpSection]}
    />
  );

  // Quick Recommendations is hidden in the TOC and Comparison has no specs, so
  // Top Pick becomes "1." and Runner-Ups becomes "2." even though they are the
  // third and fourth structural sections overall.
  expect(screen.getByText(/1\. our top pick/i)).toBeInTheDocument();
  expect(screen.getByText(/2\. runner-ups/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/LivePreview.test.jsx`
Expected: FAIL — no Top Pick/Runner-Ups sections rendered yet, numbering
still hardcoded.

- [ ] **Step 3: Write the implementation**

Add the import:

```jsx
import { Award, Check, Image as ImageIcon, Medal, Monitor, Smartphone, X } from 'lucide-react';
```

Add these helpers above the `LivePreview` function, alongside the existing
`renderComparisonCellValue`:

```jsx
function computeSectionNumbers({ tocEntries, hasQuickRecommendations, hasComparison, hasTopPick, hasRunnerUps }) {
  const contentBySectionKey = {
    QUICK_RECOMMENDATIONS: hasQuickRecommendations,
    COMPARISON_TABLE: hasComparison,
    TOP_PICK: hasTopPick,
    RUNNER_UPS: hasRunnerUps,
  };
  const orderedKeys = tocEntries
    .filter((entry) => entry.visible && entry.sectionKey && contentBySectionKey[entry.sectionKey])
    .map((entry) => entry.sectionKey);
  const numbers = {};
  orderedKeys.forEach((key, index) => {
    numbers[key] = index + 1;
  });
  return numbers;
}

function renderRecommendationCard(section, number) {
  const imageUrl = getImageUrl(section.product.imageFileName);
  const linkSupported = isSupportedAmazonUrl(section.product.productLink);
  const isTopPick = section.recommendationType === 'TOP_PICK';
  return (
    <div key={section.clientId} className={`rounded-btn border border-border p-3 ${isTopPick ? '' : 'mt-3'}`}>
      <div className="mb-2 flex items-center gap-2">
        {!isTopPick && <span className="text-xs font-semibold text-muted">#{number}</span>}
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          {isTopPick ? <Award size={12} /> : <Medal size={12} />}
          {section.sectionLabel || 'Untitled Badge'}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-surface-secondary">
          {imageUrl && <img src={imageUrl} alt={section.product.name} className="h-full w-full object-cover" />}
        </div>
        <div className="min-w-0">
          <a href={`#product-${section.product.id}`} className="truncate text-sm font-semibold text-heading hover:underline">
            {section.product.name}
          </a>
          {section.product.rating != null && (
            <p className="text-xs text-muted">
              ★ {section.product.rating} ({section.product.reviewCount?.toLocaleString() ?? 0})
            </p>
          )}
          <p className="text-sm font-semibold text-heading">${Number(section.product.productPrice).toFixed(2)}</p>
        </div>
      </div>
      {linkSupported ? (
        <a
          href={section.product.productLink}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="mt-2 block rounded-btn bg-amazon px-3 py-1.5 text-center text-sm font-semibold text-white hover:bg-amazon-hover"
        >
          View on Amazon
        </a>
      ) : (
        <span className="mt-2 block rounded-btn bg-slate-200 px-3 py-1.5 text-center text-sm font-semibold text-muted">
          Link unavailable
        </span>
      )}
      <div className="prose prose-sm mt-2 max-w-none text-body" dangerouslySetInnerHTML={{ __html: section.whyRecommended }} />
      {section.pros.length > 0 && (
        <ul className="mt-2 space-y-1">
          {section.pros.map((item) => (
            <li key={item.clientId} className="flex items-start gap-1 text-xs text-body">
              <Check size={12} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
              {item.content}
            </li>
          ))}
        </ul>
      )}
      {section.cons.length > 0 && (
        <ul className="mt-2 space-y-1">
          {section.cons.map((item) => (
            <li key={item.clientId} className="flex items-start gap-1 text-xs text-body">
              <X size={12} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
              {item.content}
            </li>
          ))}
        </ul>
      )}
      {section.bestFor.length > 0 && (
        <div className="mt-2">
          <span className="text-xs font-semibold text-heading">Best For</span>
          <ul className="list-disc pl-4 text-xs text-body">
            {section.bestFor.map((item) => (
              <li key={item.clientId}>{item.content}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

Update the function signature to accept `recommendationSections`:

```jsx
function LivePreview({
  title,
  excerpt,
  coverImageFilename,
  tocEntries,
  settings,
  quickRecommendations = [],
  comparisonSpecs = [],
  comparisonProducts = [],
  recommendationSections = [],
}) {
```

Inside the component body, after `visibleEntries` is computed, add:

```jsx
  const topPick = recommendationSections.find((s) => s.recommendationType === 'TOP_PICK') ?? null;
  const runnerUps = recommendationSections.filter((s) => s.recommendationType === 'RUNNER_UP');
  const sectionNumbers = computeSectionNumbers({
    tocEntries,
    hasQuickRecommendations: quickRecommendations.length > 0,
    hasComparison: comparisonSpecs.length > 0 && comparisonProducts.length > 0,
    hasTopPick: Boolean(topPick),
    hasRunnerUps: runnerUps.length > 0,
  });
```

Replace the two hardcoded numbering literals:

```jsx
<span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
  1. Quick Recommendations
</span>
```

becomes

```jsx
<span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
  {sectionNumbers.QUICK_RECOMMENDATIONS}. Quick Recommendations
</span>
```

and

```jsx
<span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
  2. Comparison Table
</span>
```

becomes

```jsx
<span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
  {sectionNumbers.COMPARISON_TABLE}. Comparison Table
</span>
```

Insert the new sections after the Comparison Table block and before
`<AffiliateDisclosure ... />`:

```jsx
{topPick && (
  <div className="mb-4">
    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
      {sectionNumbers.TOP_PICK}. Our Top Pick
    </span>
    {renderRecommendationCard(topPick, null)}
  </div>
)}

{runnerUps.length > 0 && (
  <div className="mb-4">
    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
      {sectionNumbers.RUNNER_UPS}. Runner-Ups
    </span>
    {runnerUps.map((section, index) => renderRecommendationCard(section, index + 1))}
  </div>
)}
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: PASS. Then run the whole
`LivePreview.test.jsx` file to confirm every pre-existing test (including
the Quick Recommendations/Comparison Table ones, which implicitly rely on
the new dynamic numbering now) still passes — the existing tests don't
pass `tocEntries` with those keys marked visible in most cases, so verify
whether any pre-existing assertion like `screen.getByText('1. Quick
Recommendations')` needs updating to account for `sectionNumbers` being
`undefined` when the corresponding TOC entry isn't present in the test's
`tocEntries` array. If `sectionNumbers.QUICK_RECOMMENDATIONS` is
`undefined` in a test that doesn't pass a matching TOC entry, the rendered
text becomes `"undefined. Quick Recommendations"`, breaking that
assertion — fix by updating those specific pre-existing test fixtures to
include the relevant visible TOC entry (matching what real usage via
`BuyingGuideForm.jsx` always provides, since `tocEntries` always contains
all five structural keys by default per `DEFAULT_TOC_ENTRIES`).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/LivePreview.jsx \
        frontend/src/components/buying-guide-form/LivePreview.test.jsx
git commit -m "feat(buying-guides): render Top Pick/Runner-Ups and compute section numbers dynamically"
```

---

### Task 11: `Stepper.jsx` — combine into eight steps

**Files:**
- Modify: `frontend/src/components/buying-guide-form/Stepper.jsx`
- Modify: `frontend/src/components/buying-guide-form/Stepper.test.jsx`

**Interfaces:**
- Produces: `STEPS` becomes an 8-entry array with `'Top Pick'` and
  `'Runner-Ups'` merged into `'Top Picks & Runner-Ups'`; `MAX_BUILT_STEP`
  becomes `5`.

- [ ] **Step 1: Write the failing test**

Replace the existing "enables Comparison once unlocked..." test's
assertions about what comes after Comparison, and add a new test, in
`Stepper.test.jsx`:

```jsx
it('enables Comparison once unlocked, but keeps every step after it disabled', () => {
  render(<Stepper activeStep={4} maxUnlockedStep={4} onStepClick={vi.fn()} />);
  expect(screen.getByRole('button', { name: /Comparison/ })).toBeEnabled();
  expect(screen.getByRole('button', { name: /Top Picks & Runner-Ups/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /SEO & Publish/ })).toBeDisabled();
});

it('enables Top Picks & Runner-Ups once unlocked, but keeps every step after it disabled', () => {
  render(<Stepper activeStep={5} maxUnlockedStep={5} onStepClick={vi.fn()} />);
  expect(screen.getByRole('button', { name: /Top Picks & Runner-Ups/ })).toBeEnabled();
  expect(screen.getByRole('button', { name: /Buying Guide/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /SEO & Publish/ })).toBeDisabled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/Stepper.test.jsx`
Expected: FAIL — `Top Picks & Runner-Ups` doesn't exist yet, Comparison's
"disabled after" assertion fails since `Top Pick`/`Runner-Ups` still exist
separately.

- [ ] **Step 3: Write the implementation**

```jsx
const STEPS = [
  'Basic Info',
  'Products',
  'Quick Picks',
  'Comparison',
  'Top Picks & Runner-Ups',
  'Buying Guide',
  'FAQs',
  'SEO & Publish',
];

const MAX_BUILT_STEP = 5;
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: PASS. Run the whole `Stepper.test.jsx`
file too, since the pre-existing "keeps Products disabled while still
locked"-style tests reference step labels by regex and should be
unaffected, but confirm.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/Stepper.jsx \
        frontend/src/components/buying-guide-form/Stepper.test.jsx
git commit -m "feat(buying-guides): combine Top Pick and Runner-Ups into one step"
```

---

### Task 12: Wire Top Picks & Runner-Ups into `BuyingGuideForm.jsx`

**Files:**
- Modify: `frontend/src/components/BuyingGuideForm.jsx`
- Modify: `frontend/src/components/BuyingGuideForm.test.jsx`

**Interfaces:**
- Consumes: `TopPicksAndRunnerUpsStep` (Task 9), extended `LivePreview`
  (Task 10), extended `Stepper` (Task 11).
- Produces: full end-to-end save/load of `recommendationSections`,
  validated Next/Previous navigation between Comparison (4) and Buying
  Guide (6, not yet built). Also fixes `handleComparisonNext` to use
  `stayOnPage: true` now that step 5 has a real render block — mirroring
  exactly the bug found and fixed for `handleQuickPicksNext` during the
  Comparison task.

- [ ] **Step 1: Write the failing tests**

Add this mock near the top of `BuyingGuideForm.test.jsx`, after the
`BuyingGuideComparisonStep.jsx` mock:

```jsx
vi.mock('./buying-guide-form/TopPicksAndRunnerUpsStep.jsx', () => ({
  default: ({ recommendationSections, onChange, recommendedProducts }) => (
    <div>
      <p>
        Top Picks &amp; Runner-Ups step ({recommendationSections.length} recommendations, {recommendedProducts.length} products)
      </p>
      <button
        type="button"
        onClick={() =>
          onChange([
            ...recommendationSections,
            {
              clientId: 'mock-top-pick',
              product: recommendedProducts[0],
              recommendationType: 'TOP_PICK',
              sectionLabel: 'Best Overall',
              whyRecommended: '<p>Great sound quality and long battery life for the price.</p>',
              pros: [{ clientId: 'mock-pro', content: 'Great sound' }],
              cons: [{ clientId: 'mock-con', content: 'Pricey' }],
              bestFor: [{ clientId: 'mock-best-for', content: 'Daily commuters' }],
            },
          ])
        }
      >
        Add mock Top Pick
      </button>
    </div>
  ),
}));
```

Then add these tests, after the existing "Next on Comparison blocks with an
error when no specifications have been added" test:

```jsx
it('Next on Comparison advances to Top Picks & Runner-Ups and unlocks it in the Stepper', async () => {
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

  expect(await screen.findByText('Top Picks & Runner-Ups step (0 recommendations, 1 products)')).toBeInTheDocument();
  const step5Button = screen.getByRole('button', { name: /Top Picks & Runner-Ups/ });
  expect(step5Button).toBeEnabled();
  expect(step5Button).toHaveAttribute('aria-current', 'step');
});

it('Previous on Top Picks & Runner-Ups returns to Comparison without losing state', async () => {
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
  await screen.findByText('Top Picks & Runner-Ups step (0 recommendations, 1 products)');

  await user.click(screen.getByRole('button', { name: 'Previous' }));

  expect(await screen.findByText(/comparison step \(1 specs/i)).toBeInTheDocument();
});

it('adding a Top Pick and saving includes it in the recommendationSections payload', async () => {
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

  await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  const payload = onSubmit.mock.calls.at(-1)[0];
  expect(payload.recommendationSections).toEqual([
    {
      productId: 99,
      recommendationType: 'TOP_PICK',
      sectionLabel: 'Best Overall',
      whyRecommended: '<p>Great sound quality and long battery life for the price.</p>',
      pros: [{ content: 'Great sound' }],
      cons: [{ content: 'Pricey' }],
      bestFor: [{ content: 'Daily commuters' }],
    },
  ]);
});

it('Next on Top Picks & Runner-Ups blocks with an error when no Top Pick has been selected', async () => {
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
  await screen.findByText('Top Picks & Runner-Ups step (0 recommendations, 1 products)');

  await user.click(screen.getByRole('button', { name: 'Next' }));

  expect(await screen.findByText(/select a top pick before continuing/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/BuyingGuideForm.test.jsx`
Expected: FAIL — step 5 has no render block, `handleComparisonNext`
doesn't stay on the page yet.

- [ ] **Step 3: Write the implementation**

Add the `mapRecommendationSectionsFromResponse` `clientId`s (both per
section and per item):

```jsx
function mapRecommendationSectionsFromResponse(recommendationSections) {
  return (recommendationSections ?? []).map((section) => ({
    clientId: crypto.randomUUID(),
    product: section.product,
    recommendationType: section.recommendationType,
    sectionLabel: section.sectionLabel,
    whyRecommended: section.whyRecommended,
    pros: section.pros.map((item) => ({ clientId: crypto.randomUUID(), content: item.content })),
    cons: section.cons.map((item) => ({ clientId: crypto.randomUUID(), content: item.content })),
    bestFor: section.bestFor.map((item) => ({ clientId: crypto.randomUUID(), content: item.content })),
  }));
}
```

Add the `TopPicksAndRunnerUpsStep` import near the other step imports:

```jsx
import TopPicksAndRunnerUpsStep from './buying-guide-form/TopPicksAndRunnerUpsStep.jsx';
```

Change the read-only `recommendationSections` state to a real setter, add
a `topPicksRunnerUpsErrors` state, next to the existing `comparisonErrors`
declaration:

```jsx
const [recommendationSections, setRecommendationSections] = useState(mapRecommendationSectionsFromResponse(guide?.recommendationSections));
const [topPicksRunnerUpsErrors, setTopPicksRunnerUpsErrors] = useState({});
```

Extend the existing "adjust state during render" reconciliation block to
also drop recommendations whose product left the guide:

```jsx
const recommendedProductIdsKey = recommendedProducts.map((product) => product.id).join(',');
const [syncedProductIdsKey, setSyncedProductIdsKey] = useState(recommendedProductIdsKey);
if (recommendedProductIdsKey !== syncedProductIdsKey) {
  setSyncedProductIdsKey(recommendedProductIdsKey);
  const recommendedProductIds = new Set(recommendedProducts.map((product) => product.id));
  setComparisonSpecs((prev) =>
    prev.map((spec) => {
      const existingByProductId = new Map(spec.values.map((v) => [v.productId, v.value]));
      return {
        ...spec,
        values: recommendedProducts.map((product) => ({
          productId: product.id,
          value: existingByProductId.get(product.id) ?? '',
        })),
      };
    })
  );
  setRecommendationSections((prev) => prev.filter((section) => recommendedProductIds.has(section.product.id)));
}
```

In `buildPayload`, replace the bare `recommendationSections,` line with:

```jsx
recommendationSections: recommendationSections.map(
  ({ product, recommendationType, sectionLabel, whyRecommended, pros, cons, bestFor }) => ({
    productId: product.id,
    recommendationType,
    sectionLabel: sectionLabel.trim(),
    whyRecommended,
    pros: pros.map(({ content }) => ({ content: content.trim() })),
    cons: cons.map(({ content }) => ({ content: content.trim() })),
    bestFor: bestFor.map(({ content }) => ({ content: content.trim() })),
  })
),
```

Fix `handleComparisonNext` — step 5 now exists, so this auto-save must stay
on the page, exactly mirroring `handleQuickPicksNext`'s existing pattern:

```jsx
function handleComparisonNext() {
  const errors = validateComparison();
  setComparisonErrors(errors);
  if (Object.keys(errors).length > 0) return;
  setMaxUnlockedStep((prev) => Math.max(prev, 5));
  setActiveStep(5);
  // Top Picks & Runner-Ups exists past this point, so this auto-save must not
  // navigate away like a Save as Draft/Publish click does.
  submit(false, { stayOnPage: true });
}
```

Add `countWords`, `validateTopPicksAndRunnerUps`, and
`handleTopPicksRunnerUpsNext` right after `handleComparisonNext`:

```jsx
function countWords(html) {
  const text = html.replace(/<[^>]*>/g, ' ').trim();
  return text ? text.split(/\s+/).length : 0;
}

function validateTopPicksAndRunnerUps() {
  const errors = {};
  const topPick = recommendationSections.find((s) => s.recommendationType === 'TOP_PICK');
  if (!topPick) {
    errors.topPickMissing = 'Select a Top Pick before continuing.';
    return errors;
  }
  recommendationSections.forEach((section) => {
    const key = section.clientId;
    if (!section.sectionLabel.trim()) {
      errors[`badge-${key}`] = 'Recommendation badge is required.';
    }
    const words = countWords(section.whyRecommended);
    if (words < 10) {
      errors[`why-${key}`] = 'Why We Recommend It needs at least 10 words.';
    } else if (words > 150) {
      errors[`why-${key}`] = 'Why We Recommend It must be 150 words or fewer.';
    }
    if (section.pros.length === 0 || section.pros.some((p) => !p.content.trim())) {
      errors[`pros-${key}`] = 'Add at least one Pro.';
    }
    if (section.cons.length === 0 || section.cons.some((c) => !c.content.trim())) {
      errors[`cons-${key}`] = 'Add at least one Con.';
    }
    if (section.bestFor.length === 0 || section.bestFor.some((b) => !b.content.trim())) {
      errors[`bestFor-${key}`] = 'Add at least one Best For item.';
    }
  });
  return errors;
}

function handleTopPicksRunnerUpsNext() {
  const errors = validateTopPicksAndRunnerUps();
  setTopPicksRunnerUpsErrors(errors);
  if (Object.keys(errors).length > 0) return;
  setMaxUnlockedStep((prev) => Math.max(prev, 6));
  // Buying Guide (step 6) is not built yet, so this is the current "last built
  // step" -- save and return to the list, matching the pattern every prior
  // step used before the step after it existed (see Comparison's own Next).
  submit(false);
}
```

Add `recommendationSections` to `previewProps`:

```jsx
const previewProps = {
  title: basicInfo.title,
  excerpt: basicInfo.excerpt,
  coverImageFilename: basicInfo.coverImageFilename,
  tocEntries,
  settings,
  quickRecommendations,
  comparisonSpecs,
  comparisonProducts: recommendedProducts,
  recommendationSections,
};
```

Add the `activeStep === 5` render block, right after the existing
`activeStep === 4` block:

```jsx
{activeStep === 5 && (
  <>
    <TopPicksAndRunnerUpsStep
      recommendationSections={recommendationSections}
      onChange={setRecommendationSections}
      recommendedProducts={recommendedProducts}
      fieldErrors={topPicksRunnerUpsErrors}
    />
    {topPicksRunnerUpsErrors.topPickMissing && (
      <p role="alert" className="mt-4 text-sm text-danger">
        {topPicksRunnerUpsErrors.topPickMissing}
      </p>
    )}
    <div className="mt-6 flex justify-between">
      <Button type="button" variant="secondary" onClick={() => setActiveStep(4)}>
        Previous
      </Button>
      <Button type="button" onClick={handleTopPicksRunnerUpsNext}>
        Next
      </Button>
    </div>
  </>
)}
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: PASS. Then run the whole frontend suite
(`npx vitest run`) to confirm no regressions across every file.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/BuyingGuideForm.jsx frontend/src/components/BuyingGuideForm.test.jsx
git commit -m "feat(buying-guides): wire Top Picks & Runner-Ups into the guide editor"
```

---

### Task 13: Verification, build, lint, manual browser check

**Files:** none (verification only).

- [ ] **Step 1: Full automated test suites**

```bash
cd frontend && npx vitest run
```
Expected: every test file passes, including all new/modified files from
Tasks 1–12.

```bash
cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" \
  && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test
```
Expected: all tests pass (baseline 142 + the new Task 1 test).

- [ ] **Step 2: Lint and production build**

```bash
cd frontend && npx eslint .
```
Expected: 0 errors (the two pre-existing `TocBuilder.jsx` warnings are
unrelated and may remain).

```bash
cd frontend && npm run build
```
Expected: build succeeds.

- [ ] **Step 3: Manual browser verification (chrome-devtools MCP)**

Using an existing guide with products/Quick Picks/Comparison already
filled in, walk through:

1. Load the guide, click through to Comparison, click Next — confirm it
   lands on "Top Picks & Runner-Ups" (step 5) without redirecting to the
   guide list (this is the exact bug class fixed for Quick Picks earlier —
   verify it didn't resurface for Comparison → step 5).
2. Confirm the Stepper shows exactly 8 steps, with "Top Picks &
   Runner-Ups" as one entry.
3. Add a Top Pick: click "Add Top Pick Product", pick one, confirm the
   product summary card renders (image/name/brand/price/rating), fill in
   the Recommendation Badge, Why We Recommend It, and at least one
   Pro/Con/Best For item each. Confirm Live Preview's "Our Top Pick"
   section updates immediately, including check/cross icons for Pros/Cons.
4. Click "Change Product" on the Top Pick, pick a different product,
   confirm the replace confirmation dialog appears and blocks the change
   until confirmed; confirm the editorial fields reset for the new
   product.
5. Add 2 Runner-Ups: click "Add Runner-Up Product" twice, fill in each
   one's badge/content/lists, confirm each renders as a collapsed card
   that expands/collapses correctly, and that the Top Pick's product is
   never offered in the Runner-Up picker.
6. Reorder the two Runner-Ups via Move Up/Down and via drag; confirm Live
   Preview's Runner-Ups order follows.
7. Try adding a 5th Runner-Up (add 2 more after step 5's two, for 4 total,
   then attempt a 5th) — confirm the Add button disables at 4 with an
   inline explanation.
8. Remove a Runner-Up, confirm the confirmation dialog appears, confirm
   removal updates the editor and Live Preview without affecting Products/
   Quick Picks/Comparison.
9. Leave Why We Recommend It under 10 words on the Top Pick, click Next —
   confirm it blocks with an inline error and does not advance.
10. Fill in everything validly, click Next — confirm it saves (check the
    network request/response) and the Stepper unlocks past step 5.
11. Reload the guide from scratch (hard reload) and confirm the Top Pick
    and Runner-Ups round-trip correctly into the editor and Live Preview,
    including badge text, editorial content, and Pros/Cons/Best For order.
12. Go back to Products, remove the product currently used as a Runner-Up,
    return to step 5 — confirm that Runner-Up's card disappeared from the
    editor (not a crash, not a stale/orphaned card).
13. Resize to a narrow mobile viewport (390px) and confirm: the stepper
    scrolls horizontally, Pros/Cons/Best For stack to one column, Runner-Up
    cards remain usable, Add buttons stay reachable, and there is no
    page-level horizontal overflow (check `document.documentElement
    .scrollWidth === window.innerWidth`). Also check the Preview modal's
    Top Pick/Runner-Ups sections render legibly at this width.
14. Check the browser console for any new errors (pre-existing React
    Router warnings and the pre-existing search-input id/name advisory are
    expected and unrelated).

Once every item above is verified — not before — report per the required
completion format, ending with the exact required sentence.
