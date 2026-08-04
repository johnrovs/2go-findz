# Buying Guide — FAQs Step (Step 7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Step 7 ("FAQs") editor described in
`docs/superpowers/specs/2026-08-03-buying-guide-faqs-step-design.md`.

**Architecture:** `faqs` state in `BuyingGuideForm.jsx` currently has no
setter (`const [faqs] = useState(...)`) — no editor was ever built. This
task gives it a real setter plus client-side `clientId`s, builds a
production-grade editor (drag-and-drop, stable IDs, delete confirmation,
validation) matching the `BuyingGuideContentStep`/`ContentSectionEditorCard`
pattern from the prior phase, extends `LivePreview.jsx` with a real FAQ
accordion, and adds a tested, live-updating (but admin-preview-only)
`FAQPage` JSON-LD generator.

**Tech Stack:** React 18 (Vite), Tailwind, `@dnd-kit`, Vitest + RTL.

## Global Constraints

- No backend changes. `BuyingGuideFaq`, its DTOs, `HtmlSanitizer`, and
  `BuyingGuideServiceImpl`'s replace-all persistence already fully support
  this feature (see design doc "Backend reality").
- Question max length: 300 chars (matches backend `@Column(length = 300)` /
  `@Size` — mirrored client-side with a live counter).
- No per-FAQ enabled/structured-data toggle — the backend has no field for
  either. Every saved FAQ is implicitly enabled and structured-data-
  eligible.
- Structured data (`buildFaqJsonLd`) is built, unit-tested, and shown live
  in a read-only preview inside the FAQs step — **not** wired into
  `BuyingGuideDetailPage.jsx` (out of scope; that page has broader
  pre-existing gaps predating this task).
- Do not touch SEO & Publish or `BuyingGuideDetailPage.jsx`.
- Match established codebase conventions exactly: `@dnd-kit` sortable
  pattern with Move Up/Down keyboard fallback, `ConfirmDialog`/`EmptyState`
  reuse, always-editable inline inputs, stable `clientId`s (never array
  indexes), the "adjust state during render with a `null` sentinel"
  auto-expand-on-error pattern already proven in `BuyingGuideContentStep.jsx`.

---

### Task 1: `frontend/src/utils/faqJsonLd.js`

**Files:**
- Create: `frontend/src/utils/faqJsonLd.js`
- Create: `frontend/src/utils/faqJsonLd.test.js`

**Interfaces:**
- Produces: `buildFaqJsonLd(faqs: Array<{question: string, answer: string}>): object | null`
  — filters out any FAQ with a blank (trimmed) question or answer, returns
  `null` if none remain, otherwise returns a `FAQPage` schema object
  matching the exact shape already shipped in `ComparisonDetailPage.jsx`'s
  `buildJsonLd()`. Consumed by Task 4 (`BuyingGuideFaqsStep.jsx`).

- [ ] **Step 1: Write the failing tests**

```js
// frontend/src/utils/faqJsonLd.test.js
import { describe, expect, it } from 'vitest';
import { buildFaqJsonLd } from './faqJsonLd.js';

describe('buildFaqJsonLd', () => {
  it('returns null when there are no FAQs', () => {
    expect(buildFaqJsonLd([])).toBeNull();
  });

  it('returns null when every FAQ is blank', () => {
    expect(buildFaqJsonLd([{ question: '', answer: '' }])).toBeNull();
  });

  it('builds a valid FAQPage schema from complete FAQs', () => {
    const result = buildFaqJsonLd([{ question: 'Is it worth it?', answer: 'Yes.' }]);
    expect(result).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is it worth it?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes.' },
        },
      ],
    });
  });

  it('excludes FAQs with a blank question or answer', () => {
    const result = buildFaqJsonLd([
      { question: 'Complete?', answer: 'Yes.' },
      { question: '', answer: 'Orphan answer.' },
      { question: 'Orphan question?', answer: '' },
    ]);
    expect(result.mainEntity).toHaveLength(1);
    expect(result.mainEntity[0].name).toBe('Complete?');
  });

  it('trims whitespace from question and answer', () => {
    const result = buildFaqJsonLd([{ question: '  Trimmed?  ', answer: '  Trimmed answer.  ' }]);
    expect(result.mainEntity[0].name).toBe('Trimmed?');
    expect(result.mainEntity[0].acceptedAnswer.text).toBe('Trimmed answer.');
  });

  it('preserves multiple FAQs in their given order', () => {
    const result = buildFaqJsonLd([
      { question: 'First?', answer: 'A.' },
      { question: 'Second?', answer: 'B.' },
    ]);
    expect(result.mainEntity.map((entry) => entry.name)).toEqual(['First?', 'Second?']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/utils/faqJsonLd.test.js`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```js
// frontend/src/utils/faqJsonLd.js
export function buildFaqJsonLd(faqs) {
  const validFaqs = faqs
    .map((faq) => ({ question: faq.question.trim(), answer: faq.answer.trim() }))
    .filter((faq) => faq.question && faq.answer);

  if (validFaqs.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: validFaqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/utils/faqJsonLd.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/faqJsonLd.js frontend/src/utils/faqJsonLd.test.js
git commit -m "feat(buying-guides): add buildFaqJsonLd utility"
```

---

### Task 2: `DeleteFaqDialog.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/DeleteFaqDialog.jsx`
- Create: `frontend/src/components/buying-guide-form/DeleteFaqDialog.test.jsx`

**Interfaces:**
- Produces: `DeleteFaqDialog({ faq, onConfirm, onCancel })` — `faq` is
  either `null` (closed) or `{clientId, question, answer}` (open).
- Consumes: `ConfirmDialog` (`frontend/src/components/ConfirmDialog.jsx`).

- [ ] **Step 1: Write the failing tests**

```jsx
// frontend/src/components/buying-guide-form/DeleteFaqDialog.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DeleteFaqDialog from './DeleteFaqDialog.jsx';

describe('DeleteFaqDialog', () => {
  it('is not visible when faq is null', () => {
    render(<DeleteFaqDialog faq={null} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('shows the FAQ question in the confirmation message', () => {
    render(
      <DeleteFaqDialog
        faq={{ clientId: 'f1', question: 'Is it worth it?', answer: 'Yes.' }}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/"Is it worth it\?"/)).toBeInTheDocument();
  });

  it('falls back to "Untitled question" when the question is blank', () => {
    render(
      <DeleteFaqDialog faq={{ clientId: 'f1', question: '', answer: 'Yes.' }} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText(/"Untitled question"/)).toBeInTheDocument();
  });

  it('calls onConfirm when Delete FAQ is clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(
      <DeleteFaqDialog
        faq={{ clientId: 'f1', question: 'Is it worth it?', answer: 'Yes.' }}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete FAQ' }));

    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(
      <DeleteFaqDialog
        faq={{ clientId: 'f1', question: 'Is it worth it?', answer: 'Yes.' }}
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

Run: `cd frontend && npx vitest run src/components/buying-guide-form/DeleteFaqDialog.test.jsx`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
// frontend/src/components/buying-guide-form/DeleteFaqDialog.jsx
import ConfirmDialog from '../ConfirmDialog.jsx';

function DeleteFaqDialog({ faq, onConfirm, onCancel }) {
  return (
    <ConfirmDialog
      isOpen={Boolean(faq)}
      title="Delete FAQ?"
      message={faq ? `"${faq.question || 'Untitled question'}" and its answer will be permanently deleted.` : ''}
      confirmLabel="Delete FAQ"
      isDestructive
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

export default DeleteFaqDialog;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/DeleteFaqDialog.test.jsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/DeleteFaqDialog.jsx \
        frontend/src/components/buying-guide-form/DeleteFaqDialog.test.jsx
git commit -m "feat(buying-guides): add DeleteFaqDialog"
```

---

### Task 3: `FaqEditorRow.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/FaqEditorRow.jsx`
- Create: `frontend/src/components/buying-guide-form/FaqEditorRow.test.jsx`

**Interfaces:**
- Produces: `FaqEditorRow({ faq, index, total, onFieldChange,
  onRequestDelete, onMoveUp, onMoveDown, isExpanded, onToggleExpanded,
  questionError, answerError })` — default export, renders as `<li>`
  (parent supplies `<ul>`/`SortableContext`).
  - `faq`: `{clientId, question, answer}`.
  - `onFieldChange(clientId, field, value)`, `onRequestDelete(faq)`,
    `onMoveUp(index)`, `onMoveDown(index)`, `onToggleExpanded(clientId)`.
- Consumes: `useSortable`/`CSS` from `@dnd-kit/sortable`/`@dnd-kit/utilities`
  (established pattern).

- [ ] **Step 1: Write the failing tests**

```jsx
// frontend/src/components/buying-guide-form/FaqEditorRow.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FaqEditorRow from './FaqEditorRow.jsx';

function renderRow(overrides = {}) {
  const faq = { clientId: 'f1', question: 'Is it worth it?', answer: 'Yes, absolutely.' };
  const props = {
    faq,
    index: 0,
    total: 2,
    onFieldChange: vi.fn(),
    onRequestDelete: vi.fn(),
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    isExpanded: false,
    onToggleExpanded: vi.fn(),
    questionError: undefined,
    answerError: undefined,
    ...overrides,
  };
  return { ...render(<ul><FaqEditorRow {...props} /></ul>), props };
}

describe('FaqEditorRow', () => {
  it('shows the position number and question', () => {
    renderRow();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Is it worth it?')).toBeInTheDocument();
  });

  it('shows a character counter for the question', () => {
    renderRow();
    expect(screen.getByText('15 / 300')).toBeInTheDocument();
  });

  it('does not render the answer field when collapsed', () => {
    renderRow({ isExpanded: false });
    expect(screen.queryByLabelText('Answer')).not.toBeInTheDocument();
  });

  it('renders the answer field when expanded', () => {
    renderRow({ isExpanded: true });
    expect(screen.getByDisplayValue('Yes, absolutely.')).toBeInTheDocument();
  });

  it('calls onFieldChange when the question is edited', async () => {
    const user = userEvent.setup();
    const { props } = renderRow();

    await user.type(screen.getByDisplayValue('Is it worth it?'), '!');

    expect(props.onFieldChange).toHaveBeenCalledWith('f1', 'question', 'Is it worth it?!');
  });

  it('calls onToggleExpanded when the expand/collapse button is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderRow();

    await user.click(screen.getByRole('button', { name: /expand is it worth it/i }));

    expect(props.onToggleExpanded).toHaveBeenCalledWith('f1');
  });

  it('calls onRequestDelete with the faq when delete is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderRow();

    await user.click(screen.getByRole('button', { name: /delete is it worth it/i }));

    expect(props.onRequestDelete).toHaveBeenCalledWith(props.faq);
  });

  it('disables Move up on the first item and Move down on the last item', () => {
    renderRow({ index: 0, total: 2 });
    expect(screen.getByRole('button', { name: /move is it worth it up/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /move is it worth it down/i })).toBeEnabled();
  });

  it('shows a question validation error', () => {
    renderRow({ questionError: 'Question is required.' });
    expect(screen.getByText('Question is required.')).toBeInTheDocument();
  });

  it('shows an answer validation error when expanded', () => {
    renderRow({ isExpanded: true, answerError: 'Answer is required.' });
    expect(screen.getByText('Answer is required.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/FaqEditorRow.test.jsx`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
// frontend/src/components/buying-guide-form/FaqEditorRow.jsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, GripVertical, Trash2 } from 'lucide-react';

const QUESTION_MAX_LENGTH = 300;

function wordCount(text) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function FaqEditorRow({
  faq,
  index,
  total,
  onFieldChange,
  onRequestDelete,
  onMoveUp,
  onMoveDown,
  isExpanded,
  onToggleExpanded,
  questionError,
  answerError,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: faq.clientId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const label = faq.question || 'Untitled question';
  const questionFieldId = `faq-question-${faq.clientId}`;
  const answerFieldId = `faq-answer-${faq.clientId}`;

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
          <label htmlFor={questionFieldId} className="sr-only">
            Question
          </label>
          <input
            id={questionFieldId}
            type="text"
            maxLength={QUESTION_MAX_LENGTH}
            value={faq.question}
            onChange={(event) => onFieldChange(faq.clientId, 'question', event.target.value)}
            placeholder="Question"
            aria-invalid={Boolean(questionError)}
            aria-describedby={questionError ? `${questionFieldId}-error` : undefined}
            className="w-full rounded-btn border border-border px-2 py-1.5 text-sm font-medium text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="mt-1 flex items-center justify-between gap-2">
            {questionError ? (
              <p id={`${questionFieldId}-error`} role="alert" className="text-xs text-danger">
                {questionError}
              </p>
            ) : (
              <span />
            )}
            <span className="shrink-0 text-xs text-muted">
              {faq.question.length} / {QUESTION_MAX_LENGTH}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRequestDelete(faq)}
          aria-label={`Delete ${label}`}
          className="shrink-0 rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
        >
          <Trash2 size={16} />
        </button>
        <button
          type="button"
          onClick={() => onToggleExpanded(faq.clientId)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? `Collapse ${label}` : `Expand ${label}`}
          className="shrink-0 rounded-btn p-1.5 text-muted hover:bg-surface-secondary"
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-border p-4">
          <label htmlFor={answerFieldId} className="mb-1 block text-small font-medium text-body">
            Answer
          </label>
          <textarea
            id={answerFieldId}
            rows={4}
            value={faq.answer}
            onChange={(event) => onFieldChange(faq.clientId, 'answer', event.target.value)}
            aria-invalid={Boolean(answerError)}
            aria-describedby={answerError ? `${answerFieldId}-error` : undefined}
            className="w-full rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="mt-1 text-right text-sm text-muted">Words: {wordCount(faq.answer)}</p>
          {answerError && (
            <p id={`${answerFieldId}-error`} role="alert" className="mt-1 text-sm text-danger">
              {answerError}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export default FaqEditorRow;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/FaqEditorRow.test.jsx`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/FaqEditorRow.jsx \
        frontend/src/components/buying-guide-form/FaqEditorRow.test.jsx
git commit -m "feat(buying-guides): add FaqEditorRow"
```

---

### Task 4: `BuyingGuideFaqsStep.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/BuyingGuideFaqsStep.jsx`
- Create: `frontend/src/components/buying-guide-form/BuyingGuideFaqsStep.test.jsx`

**Interfaces:**
- Produces: `BuyingGuideFaqsStep({ faqs, onChange, fieldErrors })` —
  default export. `fieldErrors` keyed `question-${clientId}` /
  `answer-${clientId}` (Task 7 wires this from `BuyingGuideForm.jsx`'s
  `validateFaqs()`).
- Consumes: `FaqEditorRow` (Task 3), `DeleteFaqDialog` (Task 2),
  `buildFaqJsonLd` (Task 1), `Button`/`EmptyState` (existing shared
  components), `@dnd-kit` (established pattern).

- [ ] **Step 1: Write the failing tests**

```jsx
// frontend/src/components/buying-guide-form/BuyingGuideFaqsStep.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BuyingGuideFaqsStep from './BuyingGuideFaqsStep.jsx';

describe('BuyingGuideFaqsStep', () => {
  it('shows the empty state when there are no FAQs', () => {
    render(<BuyingGuideFaqsStep faqs={[]} onChange={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByText('No FAQs added yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Your First FAQ' })).toBeInTheDocument();
  });

  it('renders one row per FAQ with the count in the card heading', () => {
    const faqs = [
      { clientId: 'f1', question: 'Is it worth it?', answer: 'Yes.' },
      { clientId: 'f2', question: 'How long does it last?', answer: 'A long time.' },
    ];
    render(<BuyingGuideFaqsStep faqs={faqs} onChange={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByText('Frequently Asked Questions (2)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Is it worth it?')).toBeInTheDocument();
    expect(screen.getByDisplayValue('How long does it last?')).toBeInTheDocument();
  });

  it('Add Your First FAQ appends a new blank FAQ and auto-expands it', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<BuyingGuideFaqsStep faqs={[]} onChange={onChange} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: 'Add Your First FAQ' }));

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ question: '', answer: '' })]);
  });

  it('Add FAQ (header button) appends without disturbing existing FAQs', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const faqs = [{ clientId: 'f1', question: 'Existing?', answer: 'Yes.' }];
    render(<BuyingGuideFaqsStep faqs={faqs} onChange={onChange} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: 'Add FAQ' }));

    const nextFaqs = onChange.mock.calls[0][0];
    expect(nextFaqs).toHaveLength(2);
    expect(nextFaqs[0]).toEqual(faqs[0]);
  });

  it('disables Add FAQ once the maximum of 20 is reached', () => {
    const faqs = Array.from({ length: 20 }, (_, i) => ({ clientId: `f${i}`, question: `Q${i}?`, answer: `A${i}.` }));
    render(<BuyingGuideFaqsStep faqs={faqs} onChange={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByRole('button', { name: 'Add FAQ' })).toBeDisabled();
    expect(screen.getByText(/maximum of 20/i)).toBeInTheDocument();
  });

  it('editing a question updates only that FAQ', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const faqs = [
      { clientId: 'f1', question: 'Draft', answer: 'A.' },
      { clientId: 'f2', question: 'Other', answer: 'B.' },
    ];
    render(<BuyingGuideFaqsStep faqs={faqs} onChange={onChange} fieldErrors={{}} />);

    await user.type(screen.getByDisplayValue('Draft'), '!');

    const lastCall = onChange.mock.calls.at(-1)[0];
    expect(lastCall[0].question).toBe('Draft!');
    expect(lastCall[1]).toEqual(faqs[1]);
  });

  it('deletes an empty FAQ immediately without a confirmation dialog', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const faqs = [{ clientId: 'f1', question: '', answer: '' }];
    render(<BuyingGuideFaqsStep faqs={faqs} onChange={onChange} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: /delete untitled question/i }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('deleting a FAQ with content requires confirmation', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const faqs = [{ clientId: 'f1', question: 'Is it worth it?', answer: 'Yes.' }];
    render(<BuyingGuideFaqsStep faqs={faqs} onChange={onChange} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: /delete is it worth it/i }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete FAQ' }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('Move down reorders FAQs', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const faqs = [
      { clientId: 'f1', question: 'First?', answer: 'A.' },
      { clientId: 'f2', question: 'Second?', answer: 'B.' },
    ];
    render(<BuyingGuideFaqsStep faqs={faqs} onChange={onChange} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: /move first\? down/i }));

    expect(onChange).toHaveBeenCalledWith([faqs[1], faqs[0]]);
  });

  it('auto-expands the first FAQ with a validation error', () => {
    // Uses an answer error specifically, not a question error: the question error renders in
    // the always-visible collapsed header regardless of expand state, so it wouldn't actually
    // prove auto-expand works -- mirrors the same reasoning applied in BuyingGuideContentStep.
    const faqs = [{ clientId: 'f1', question: 'Untitled', answer: '' }];
    render(
      <BuyingGuideFaqsStep faqs={faqs} onChange={vi.fn()} fieldErrors={{ 'answer-f1': 'Answer is required.' }} />
    );
    expect(screen.getByText('Answer is required.')).toBeInTheDocument();
  });

  it('shows a structured data preview that updates with FAQ content', async () => {
    const user = userEvent.setup();
    const faqs = [{ clientId: 'f1', question: 'Is it worth it?', answer: 'Yes.' }];
    render(<BuyingGuideFaqsStep faqs={faqs} onChange={vi.fn()} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: /structured data preview/i }));

    expect(screen.getByText(/"@type": "FAQPage"/)).toBeInTheDocument();
    expect(screen.getByText(/"Is it worth it\?"/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/BuyingGuideFaqsStep.test.jsx`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
// frontend/src/components/buying-guide-form/BuyingGuideFaqsStep.jsx
import { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, ChevronUp, HelpCircle, Info, Plus } from 'lucide-react';
import Button from '../Button.jsx';
import EmptyState from '../EmptyState.jsx';
import FaqEditorRow from './FaqEditorRow.jsx';
import DeleteFaqDialog from './DeleteFaqDialog.jsx';
import { buildFaqJsonLd } from '../../utils/faqJsonLd.js';

const HOW_IT_WORKS_POINTS = [
  'Each FAQ has one question and one answer.',
  'FAQs appear in the published guide in the order shown here.',
  'Reordering the editor changes the published order.',
  'Questions should address genuine reader concerns; answers should be accurate and concise.',
  'Changes update the Live Preview immediately.',
  'Every saved FAQ is included in the structured data preview below.',
];

const MAX_FAQS = 20;
const RECOMMENDED_MIN_FAQS = 5;

let faqCounter = 0;
function nextFaqClientId() {
  faqCounter += 1;
  return `new-faq-${faqCounter}`;
}

function BuyingGuideFaqsStep({ faqs, onChange, fieldErrors }) {
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isStructuredDataOpen, setIsStructuredDataOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [deleteTarget, setDeleteTarget] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  // Adjusting state during render (see BuyingGuideContentStep.jsx for the full rationale):
  // the null sentinel ensures this fires correctly whether errors appear on a later render
  // or the component mounts with them already present.
  const [syncedFieldErrors, setSyncedFieldErrors] = useState(null);
  if (fieldErrors !== syncedFieldErrors) {
    setSyncedFieldErrors(fieldErrors);
    const firstInvalid = faqs.find((faq) => fieldErrors[`question-${faq.clientId}`] || fieldErrors[`answer-${faq.clientId}`]);
    if (firstInvalid) {
      setExpandedIds((prev) => new Set(prev).add(firstInvalid.clientId));
    }
  }

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
    const newFaq = { clientId: nextFaqClientId(), question: '', answer: '' };
    onChange([...faqs, newFaq]);
    setExpandedIds((prev) => new Set(prev).add(newFaq.clientId));
  }

  function handleFieldChange(clientId, field, value) {
    onChange(faqs.map((faq) => (faq.clientId === clientId ? { ...faq, [field]: value } : faq)));
  }

  function handleRequestDelete(faq) {
    if (faq.question.trim() || faq.answer.trim()) {
      setDeleteTarget(faq);
    } else {
      onChange(faqs.filter((f) => f.clientId !== faq.clientId));
    }
  }

  function handleConfirmDelete() {
    onChange(faqs.filter((f) => f.clientId !== deleteTarget.clientId));
    setDeleteTarget(null);
  }

  function handleMoveUp(index) {
    if (index === 0) return;
    const next = [...faqs];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function handleMoveDown(index) {
    if (index === faqs.length - 1) return;
    const next = [...faqs];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = faqs.findIndex((faq) => faq.clientId === active.id);
    const newIndex = faqs.findIndex((faq) => faq.clientId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...faqs];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onChange(next);
  }

  const atMax = faqs.length >= MAX_FAQS;
  const jsonLd = buildFaqJsonLd(faqs);

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-card-title text-heading">FAQs</h2>
          <button
            type="button"
            aria-expanded={isHowItWorksOpen}
            aria-controls="faqs-how-it-works"
            onClick={() => setIsHowItWorksOpen((open) => !open)}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <HelpCircle size={14} />
            How it works
          </button>
        </div>
        <Button type="button" size="sm" onClick={handleAdd} disabled={atMax}>
          <Plus size={16} />
          Add FAQ
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted">
        Add frequently asked questions to help readers make confident buying decisions.
      </p>

      {isHowItWorksOpen && (
        <ul
          id="faqs-how-it-works"
          className="mb-4 list-disc space-y-1 rounded-btn bg-surface-secondary p-4 pl-8 text-sm text-body"
        >
          {HOW_IT_WORKS_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}

      {atMax && (
        <p className="mb-4 text-sm text-muted">You've reached the maximum of {MAX_FAQS} FAQs. Remove one to add another.</p>
      )}

      {faqs.length === 0 ? (
        <>
          <EmptyState
            title="No FAQs added yet"
            description="Add questions your readers are likely to ask, along with clear, accurate answers."
          />
          <div className="mt-4 flex justify-center">
            <Button type="button" onClick={handleAdd}>
              <Plus size={16} />
              Add Your First FAQ
            </Button>
          </div>
        </>
      ) : (
        <div className="rounded-card border border-border bg-white p-5">
          <h3 className="text-card-title text-heading">Frequently Asked Questions ({faqs.length})</h3>
          <p className="mb-4 text-sm text-muted">Drag and drop to reorder FAQs.</p>
          {faqs.length < RECOMMENDED_MIN_FAQS && (
            <p className="mb-4 text-sm text-muted">
              Aim for {RECOMMENDED_MIN_FAQS}–10 FAQs for the best reader experience and search visibility.
            </p>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={faqs.map((faq) => faq.clientId)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-3" aria-label="FAQs">
                {faqs.map((faq, index) => (
                  <FaqEditorRow
                    key={faq.clientId}
                    faq={faq}
                    index={index}
                    total={faqs.length}
                    onFieldChange={handleFieldChange}
                    onRequestDelete={handleRequestDelete}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    isExpanded={expandedIds.has(faq.clientId)}
                    onToggleExpanded={toggleExpanded}
                    questionError={fieldErrors[`question-${faq.clientId}`]}
                    answerError={fieldErrors[`answer-${faq.clientId}`]}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-btn bg-primary/5 p-4 text-sm text-body">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <p>Tip: Add FAQs based on common questions your audience asks. This helps improve reader trust and search visibility.</p>
      </div>

      <div className="mt-4 rounded-card border border-border bg-white p-5">
        <button
          type="button"
          onClick={() => setIsStructuredDataOpen((open) => !open)}
          aria-expanded={isStructuredDataOpen}
          aria-controls="faq-structured-data-preview"
          className="flex w-full items-center justify-between text-left text-card-title text-heading"
        >
          Structured Data Preview (JSON-LD)
          {isStructuredDataOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {isStructuredDataOpen && (
          <pre id="faq-structured-data-preview" className="mt-3 overflow-x-auto rounded-btn bg-surface-secondary p-3 text-xs text-body">
            {jsonLd ? JSON.stringify(jsonLd, null, 2) : 'Add at least one complete FAQ to generate structured data.'}
          </pre>
        )}
      </div>

      <DeleteFaqDialog faq={deleteTarget} onConfirm={handleConfirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  );
}

export default BuyingGuideFaqsStep;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/BuyingGuideFaqsStep.test.jsx`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/BuyingGuideFaqsStep.jsx \
        frontend/src/components/buying-guide-form/BuyingGuideFaqsStep.test.jsx
git commit -m "feat(buying-guides): add BuyingGuideFaqsStep"
```

---

### Task 5: Extend `LivePreview.jsx`

**Files:**
- Modify: `frontend/src/components/buying-guide-form/LivePreview.jsx`
- Modify: `frontend/src/components/buying-guide-form/LivePreview.test.jsx`

**Interfaces:**
- `LivePreview` gains a new prop `faqs = []` (Task 7's `previewProps`
  passes it through — `FAQS` is already one of the 5 default structural
  `tocEntries`, no new TOC entry needed).
- `computeSectionNumbers()` gains a 6th key, `FAQS`, added to the existing
  `contentBySectionKey` map (unlike `BUYING_GUIDE`, `FAQS` already has a
  real `sectionKey` in `tocEntries`, so this is a simple map addition, not
  a new branch).

- [ ] **Step 1: Write the failing tests**

Add to the end of `frontend/src/components/buying-guide-form/LivePreview.test.jsx`,
inside the existing `describe('LivePreview', ...)` block (after the last
existing `it(...)`, before the closing `});`):

```jsx
  const faqOne = { clientId: 'faq-1', question: 'Is it worth it?', answer: 'Yes, absolutely worth it for the price.' };
  const faqTwo = { clientId: 'faq-2', question: 'How long does the battery last?', answer: 'About 8 hours per charge.' };

  it('renders the FAQs section as an accordion when FAQs exist', () => {
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[{ clientId: 'FAQS', sectionKey: 'FAQS', title: '', content: '', visible: true }]}
        settings={null}
        faqs={[faqOne]}
      />
    );

    expect(screen.getByText(/1\. frequently asked questions/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /is it worth it/i })).toBeInTheDocument();
  });

  it('omits the FAQs section when there are no FAQs', () => {
    render(<LivePreview title="Best Earbuds" excerpt="" coverImageFilename={null} tocEntries={[]} settings={null} faqs={[]} />);
    expect(screen.queryByText(/frequently asked questions/i)).not.toBeInTheDocument();
  });

  it('expands and collapses an FAQ answer independently via its own accordion button', async () => {
    const user = userEvent.setup();
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[{ clientId: 'FAQS', sectionKey: 'FAQS', title: '', content: '', visible: true }]}
        settings={null}
        faqs={[faqOne, faqTwo]}
      />
    );

    const trigger = screen.getByRole('button', { name: /is it worth it/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Yes, absolutely worth it for the price.')).not.toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Yes, absolutely worth it for the price.')).toBeInTheDocument();
    expect(screen.queryByText('About 8 hours per charge.')).not.toBeInTheDocument();
  });

  it('shows View all N questions when more than 5 FAQs exist, and expands the rest on click', async () => {
    const user = userEvent.setup();
    const faqs = Array.from({ length: 7 }, (_, i) => ({ clientId: `faq-${i}`, question: `Question ${i}?`, answer: `Answer ${i}.` }));
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[{ clientId: 'FAQS', sectionKey: 'FAQS', title: '', content: '', visible: true }]}
        settings={null}
        faqs={faqs}
      />
    );

    expect(screen.getByRole('button', { name: /question 4\?/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /question 5\?/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'View all 7 questions' }));

    expect(screen.getByRole('button', { name: /question 5\?/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show fewer questions' })).toBeInTheDocument();
  });

  it('does not show View all when 5 or fewer FAQs exist', () => {
    const faqs = Array.from({ length: 5 }, (_, i) => ({ clientId: `faq-${i}`, question: `Question ${i}?`, answer: `Answer ${i}.` }));
    render(<LivePreview title="Best Earbuds" excerpt="" coverImageFilename={null} tocEntries={[]} settings={null} faqs={faqs} />);
    expect(screen.queryByText(/view all/i)).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/LivePreview.test.jsx`
Expected: The 5 new tests FAIL; all pre-existing tests still PASS.

- [ ] **Step 3: Add the `ChevronDown` import and extend `computeSectionNumbers`**

Update the lucide-react import (add `ChevronDown`):

```js
import { Award, Check, ChevronDown, Image as ImageIcon, Medal, Monitor, Smartphone, X } from 'lucide-react';
```

Update `computeSectionNumbers`'s signature and `contentBySectionKey`:

```js
function computeSectionNumbers({
  tocEntries,
  hasQuickRecommendations,
  hasComparison,
  hasTopPick,
  hasRunnerUps,
  hasBuyingGuideContent,
  hasFaqs,
}) {
  const contentBySectionKey = {
    QUICK_RECOMMENDATIONS: hasQuickRecommendations,
    COMPARISON_TABLE: hasComparison,
    TOP_PICK: hasTopPick,
    RUNNER_UPS: hasRunnerUps,
    FAQS: hasFaqs,
  };
```

(The rest of the function body is unchanged.)

- [ ] **Step 4: Add the `FaqAccordionPreview` component**

Insert after the `BuyingGuideSectionPreviewCard` component (after its
closing `}`, before `function renderComparisonCellValue`):

```jsx
const FAQ_PREVIEW_LIMIT = 5;

function FaqAccordionPreview({ faqs }) {
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [showAll, setShowAll] = useState(false);
  const visibleFaqs = showAll ? faqs : faqs.slice(0, FAQ_PREVIEW_LIMIT);

  function toggle(clientId) {
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

  return (
    <div className="space-y-2">
      {visibleFaqs.map((faq, index) => {
        const isExpanded = expandedIds.has(faq.clientId);
        return (
          <div key={faq.clientId} className="rounded-btn border border-border p-3">
            <button
              type="button"
              onClick={() => toggle(faq.clientId)}
              aria-expanded={isExpanded}
              aria-controls={`faq-preview-answer-${faq.clientId}`}
              className="flex w-full items-center justify-between gap-2 text-left"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-heading">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-muted">
                  {index + 1}
                </span>
                {faq.question || 'Untitled question'}
              </span>
              <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            {isExpanded && (
              <p id={`faq-preview-answer-${faq.clientId}`} className="mt-2 whitespace-pre-line text-sm text-body">
                {faq.answer}
              </p>
            )}
          </div>
        );
      })}
      {faqs.length > FAQ_PREVIEW_LIMIT && (
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {showAll ? 'Show fewer questions' : `View all ${faqs.length} questions`}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Accept the `faqs` prop and pass `hasFaqs`**

Update the `LivePreview` function signature:

```js
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
  faqs = [],
}) {
```

Update the `sectionNumbers` call:

```js
  const sectionNumbers = computeSectionNumbers({
    tocEntries,
    hasQuickRecommendations: quickRecommendations.length > 0,
    hasComparison: comparisonSpecs.length > 0 && comparisonProducts.length > 0,
    hasTopPick: Boolean(topPick),
    hasRunnerUps: runnerUps.length > 0,
    hasBuyingGuideContent,
    hasFaqs: faqs.length > 0,
  });
```

- [ ] **Step 6: Render the FAQs section**

Insert right after the existing Buying Guide block (after its closing
`)}`), before `<AffiliateDisclosure ... />`:

```jsx
      {faqs.length > 0 && (
        <div className="mb-4">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
            {sectionNumbers.FAQS}. Frequently Asked Questions
          </span>
          <FaqAccordionPreview faqs={faqs} />
        </div>
      )}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/LivePreview.test.jsx`
Expected: PASS — all pre-existing tests plus the 5 new ones (26 total).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/buying-guide-form/LivePreview.jsx \
        frontend/src/components/buying-guide-form/LivePreview.test.jsx
git commit -m "feat(buying-guides): render FAQ accordion in LivePreview"
```

---

### Task 6: `Stepper.jsx` — unlock step 7

**Files:**
- Modify: `frontend/src/components/buying-guide-form/Stepper.jsx`
- Modify: `frontend/src/components/buying-guide-form/Stepper.test.jsx`

- [ ] **Step 1: Write the failing test**

Add after the existing "enables Buying Guide once unlocked..." test:

```jsx
  it('enables FAQs once unlocked, but keeps every step after it disabled', () => {
    render(<Stepper activeStep={7} maxUnlockedStep={7} onStepClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /FAQs/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /SEO & Publish/ })).toBeDisabled();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/Stepper.test.jsx`
Expected: FAIL — `MAX_BUILT_STEP` is still 6, so the "FAQs" button is disabled.

- [ ] **Step 3: Update `MAX_BUILT_STEP`**

```js
const MAX_BUILT_STEP = 7;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/Stepper.test.jsx`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/Stepper.jsx frontend/src/components/buying-guide-form/Stepper.test.jsx
git commit -m "feat(buying-guides): unlock the FAQs step in the Stepper"
```

---

### Task 7: Wire into `BuyingGuideForm.jsx`

**Files:**
- Modify: `frontend/src/components/BuyingGuideForm.jsx`
- Modify: `frontend/src/components/BuyingGuideForm.test.jsx`

**Interfaces:**
- Consumes: `BuyingGuideFaqsStep` (Task 4).
- `mapFaqsFromResponse` gains a `clientId: crypto.randomUUID()` per item
  (matching `mapRecommendationSectionsFromResponse`/`mapComparisonSpecsFromResponse`).
- `faqs` state gets a real setter: `const [faqs, setFaqs] = useState(...)`.
- New state: `faqsErrors` (object, same shape as `buyingGuideContentErrors`).
- New functions: `validateFaqs()`, `handleFaqsNext()`.
- Retrofits `handleBuyingGuideContentNext()` to add `setActiveStep(7)` and
  `stayOnPage: true`, now that step 7 has a real render block — mirrors
  the exact fix applied to every prior step's Next handler once the
  following step gained a render block.

- [ ] **Step 1: Write the failing tests**

Add the new mock after the existing `BuyingGuideContentStep.jsx` mock
(after its closing `}));`, before `const categories = ...`):

```jsx
vi.mock('./buying-guide-form/BuyingGuideFaqsStep.jsx', () => ({
  default: ({ faqs, onChange, fieldErrors }) => (
    <div>
      <p>FAQs step ({faqs.length} FAQs)</p>
      {Object.keys(fieldErrors).length > 0 && <p>FAQs have field errors</p>}
      <button
        type="button"
        onClick={() =>
          onChange([...faqs, { clientId: 'mock-faq', question: 'Is it worth it?', answer: 'Yes, absolutely.' }])
        }
      >
        Add mock FAQ
      </button>
      <button
        type="button"
        onClick={() => onChange([...faqs, { clientId: 'mock-blank-faq', question: '', answer: '' }])}
      >
        Add blank mock FAQ
      </button>
    </div>
  ),
}));
```

Add the following tests inside the `describe('BuyingGuideForm', ...)` block, after the last existing test ("Next on Buying Guide blocks with an error when a section has a blank title"):

```jsx
  it('Next on Buying Guide advances to FAQs and unlocks it in the Stepper', async () => {
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
    await user.click(await screen.findByRole('button', { name: 'Add mock section' }));

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('FAQs step (0 FAQs)')).toBeInTheDocument();
    const step7Button = screen.getByRole('button', { name: /FAQs$/ });
    expect(step7Button).toBeEnabled();
    expect(step7Button).toHaveAttribute('aria-current', 'step');
  });

  it('Previous on FAQs returns to Buying Guide without losing state', async () => {
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
    await user.click(await screen.findByRole('button', { name: 'Add mock section' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('FAQs step (0 FAQs)');

    await user.click(screen.getByRole('button', { name: 'Previous' }));

    expect(await screen.findByText('Buying Guide Content step (1 sections)')).toBeInTheDocument();
  });

  it('adding a FAQ and saving includes it in the faqs payload', async () => {
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
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock FAQ' }));

    await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls.at(-1)[0];
    expect(payload.faqs).toEqual([{ question: 'Is it worth it?', answer: 'Yes, absolutely.' }]);
  });

  it('Next on FAQs blocks with an error when a FAQ has a blank question', async () => {
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
    await user.click(await screen.findByRole('button', { name: 'Add mock section' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add blank mock FAQ' }));

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('FAQs have field errors')).toBeInTheDocument();
    expect(screen.getByText('FAQs step (1 FAQs)')).toBeInTheDocument();
  });

  it('Next on FAQs blocks with an error when there are no FAQs', async () => {
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
    await user.click(await screen.findByRole('button', { name: 'Add mock section' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('FAQs step (0 FAQs)');

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText(/add at least one faq/i)).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `cd frontend && npx vitest run src/components/BuyingGuideForm.test.jsx`
Expected: The 5 new tests FAIL; all pre-existing tests still PASS.

- [ ] **Step 3: Wire the step into `BuyingGuideForm.jsx`**

Add the import (after the existing `BuyingGuideContentStep` import):

```js
import BuyingGuideFaqsStep from './buying-guide-form/BuyingGuideFaqsStep.jsx';
```

Update `mapFaqsFromResponse` to add a `clientId`:

```js
function mapFaqsFromResponse(faqs) {
  return (faqs ?? []).map((faq) => ({ clientId: crypto.randomUUID(), question: faq.question, answer: faq.answer }));
}
```

Give `faqs` a real setter and add `faqsErrors` state (replace the existing
read-only line):

```js
  const [faqs, setFaqs] = useState(mapFaqsFromResponse(guide?.faqs));
  const [faqsErrors, setFaqsErrors] = useState({});
```

Update the `faqs` line in `buildPayload()` (replace the bare `faqs,`):

```js
      faqs: faqs.map(({ question, answer }) => ({ question: question.trim(), answer: answer.trim() })),
```

Retrofit `handleBuyingGuideContentNext` (replace its body):

```js
  function handleBuyingGuideContentNext() {
    const errors = validateBuyingGuideContent();
    setBuyingGuideContentErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setMaxUnlockedStep((prev) => Math.max(prev, 7));
    setActiveStep(7);
    // FAQs (step 7) now exists, so this auto-save must not navigate away like a Save as
    // Draft/Publish click does -- mirrors every prior step's Next handler once the step
    // after it existed.
    submit(false, { stayOnPage: true });
  }
```

Add `validateFaqs` and `handleFaqsNext` right after `handleBuyingGuideContentNext`:

```js
  function validateFaqs() {
    const errors = {};
    if (faqs.length === 0) {
      errors.faqsCount = 'Add at least one FAQ before continuing.';
      return errors;
    }
    const seenQuestions = new Set();
    faqs.forEach((faq) => {
      const trimmedQuestion = faq.question.trim();
      if (!trimmedQuestion) {
        errors[`question-${faq.clientId}`] = 'Question is required.';
      } else {
        const key = trimmedQuestion.toLowerCase();
        if (seenQuestions.has(key)) {
          errors[`question-${faq.clientId}`] = 'Two FAQs cannot use the same question.';
        } else {
          seenQuestions.add(key);
        }
      }
      if (!faq.answer.trim()) {
        errors[`answer-${faq.clientId}`] = 'Answer is required.';
      }
    });
    return errors;
  }

  function handleFaqsNext() {
    const errors = validateFaqs();
    setFaqsErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setMaxUnlockedStep((prev) => Math.max(prev, 8));
    // SEO & Publish (step 8) is not built yet, so this is the current "last built step" --
    // save and return to the list, matching the pattern every prior step used before the
    // step after it existed (see Buying Guide Content's own Next, before this task).
    submit(false);
  }
```

Add `faqs` to `previewProps`:

```js
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
    faqs,
  };
```

Add the render block for `activeStep === 7`, right after the existing
`activeStep === 6` block (after its closing `)}`, before the closing
`</div>` of the `lg:w-[72%]` column):

```jsx
          {activeStep === 7 && (
            <>
              <BuyingGuideFaqsStep faqs={faqs} onChange={setFaqs} fieldErrors={faqsErrors} />
              {faqsErrors.faqsCount && (
                <p role="alert" className="mt-4 text-sm text-danger">
                  {faqsErrors.faqsCount}
                </p>
              )}
              <div className="mt-6 flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setActiveStep(6)}>
                  Previous
                </Button>
                <Button type="button" onClick={handleFaqsNext}>
                  Next
                </Button>
              </div>
            </>
          )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/BuyingGuideForm.test.jsx`
Expected: PASS — all pre-existing tests plus the 5 new ones (44 total).
Specifically re-check the "round-trips ... faqs ..." and "sends empty
collections ..." tests, since `buildPayload()`'s `faqs` mapping changed —
both should still pass unmodified (trim on already-clean strings is a
no-op, and an empty array maps to an empty array).

- [ ] **Step 5: Run the whole frontend suite**

Run: `cd frontend && npx vitest run`
Expected: PASS across every file.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/BuyingGuideForm.jsx frontend/src/components/BuyingGuideForm.test.jsx
git commit -m "feat(buying-guides): wire the FAQs step into the guide editor"
```

---

### Task 8: Verification, lint, build, manual browser check

**Files:** none (verification only).

- [ ] **Step 1: Full frontend suite**

Run: `cd frontend && npx vitest run`
Expected: PASS, 0 failures. (Note: `src/pages/ComparisonDetailPage.test.jsx`
has a known pre-existing flaky `document.title` test-isolation issue under
the full parallel run, unrelated to this task — confirmed by running it in
isolation if it appears; do not attempt to fix it as part of this task.)

- [ ] **Step 2: ESLint**

Run: `cd frontend && npx eslint .`
Expected: 0 errors (existing `TocBuilder.jsx`/`RichTextEditor.jsx`
fast-refresh warnings are pre-existing and acceptable).

- [ ] **Step 3: Production build**

Run: `cd frontend && npm run build`
Expected: builds successfully.

- [ ] **Step 4: Backend regression guard**

Run (with `DOCKER_HOST`/`TESTCONTAINERS_RYUK_DISABLED` exported per this
project's Testcontainers/Colima setup): `cd backend && mvn test`
Expected: PASS, 0 failures — this task makes no backend changes.

- [ ] **Step 5: Manual browser verification**

Start both dev servers and, in a real browser (or chrome-devtools MCP),
verify against a guide that already has Products through Buying Guide
Content filled in:

1. Navigate to step 7 — "FAQs" header, "How it works", "+ Add FAQ" render;
   empty state shows on a guide with no FAQs yet.
2. Add a FAQ — auto-expands, Question input focused, appears in Live
   Preview once question+answer are filled in.
3. Add a second FAQ, drag-reorder them (and use Move Up/Down as the
   keyboard fallback) — order updates in both the editor and Live Preview.
4. Try Next with a blank question or with zero FAQs — blocked, inline
   error shown, offending FAQ auto-expands.
5. Try adding two FAQs with the exact same question (any case) — blocked
   with a duplicate-question error.
6. Delete an empty FAQ — no dialog. Delete a FAQ with content — confirmation
   dialog appears, Cancel preserves it, Delete removes it and renumbers
   the rest.
7. Fill in 5+ valid FAQs, confirm the "Aim for 5–10 FAQs" hint disappears
   once 5 are reached.
8. Add a 6th and 7th FAQ, open Live Preview, confirm "View all 7 questions"
   appears below the first 5, and clicking it reveals the rest and relabels
   to "Show fewer questions".
9. Click a question in Live Preview — expands its own answer independently
   without affecting other FAQs' expand state.
10. Open "Structured Data Preview (JSON-LD)" in the editor — confirm it
    shows a valid `FAQPage` JSON object containing only the FAQs with both
    a question and answer filled in, updating live as FAQs are edited.
11. Click Next with valid FAQs — saves, returns to the guide list (FAQs is
    still the last built step at this point).
12. Reload the guide, navigate back to step 7 — FAQs, order, and content
    all round-tripped correctly from the backend.
13. Confirm Basic Info's TOC list still shows "FAQs" as one of the five
    structural entries (no regression to `TocBuilder.jsx`), and that the
    Live Preview's FAQs numbered heading appears/disappears correctly when
    the FAQs entry's visibility toggle is switched off/on in Basic Info.
14. Resize to a narrow (375px) viewport — confirm no horizontal overflow
    on the FAQ list, structured-data preview block, or Live Preview
    accordion.

- [ ] **Step 6: Fix any issues found, re-run affected steps above**

Only proceed once every check passes.

---

## Explicitly out of scope for this plan

(Repeated from the design doc for the implementer's convenience.)

- Fixing `BuyingGuideDetailPage.jsx` or wiring `buildFaqJsonLd` into it.
- A second "include in structured data" / "enabled" toggle (no backend field).
- FAQ suggestions/AI generation (no suggestion system exists anywhere).
- SEO & Publish.
