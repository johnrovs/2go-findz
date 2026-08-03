# Buying Guide — Comparison Step (Step 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Step 4 (Comparison) of the Buying Guide editor — an
administrator can add/edit/delete/reorder comparison specification rows,
enter a text value for every product × specification cell, reset to a small
default set, see it reflected live in the preview panel, and save/advance to
Top Pick — matching the reference screenshot as closely as the real backend
model allows.

**Architecture:** The backend (`BuyingGuide.comparisonSpecs` /
`BuyingGuideComparisonSpec` / `BuyingGuideComparisonValue`) already exists
and is fully wired through `BuyingGuideRequest`/`Response` — this plan is
almost entirely frontend, following the exact same shape Quick Picks was
before Step 3 existed. Comparison columns are always exactly
`recommendedProducts` (the Products-step list, same order) — there is no
independent comparison-product selection. Every spec's values are plain
strings; there is no value-type/unit field in the model.

**Tech Stack:** React 18, Tailwind CSS, `@dnd-kit` (already a dependency,
used identically to `QuickPickEditorRow`/`SelectedProductsPanel`), Vitest +
React Testing Library, Spring Boot / JUnit / MockMvc.

## Global Constraints

- Comparison columns = `recommendedProducts` exactly (no independent
  add/remove/reorder for comparison specifically) — reordering/adding/
  removing products only happens in the Products step (Step 2).
- Every comparison value is a plain text string (`@NotBlank`, max 500
  chars server-side) — no typed inputs, units, or formatting metadata are
  persisted.
- Spec rows use a client-generated `clientId` (`crypto.randomUUID()`) as
  their stable `id` for `@dnd-kit` and React keys — never the array index,
  and never anything sent to the backend (stripped in `buildPayload`).
- Do not touch Top Pick (Step 5) or any step after Comparison.
- Preserve Steps 1–3's existing design, behavior, and saved data exactly.
- No backend schema/entity/DTO changes — only the one small duplicate-name
  validation addition in Task 1, mirroring the existing Quick Picks
  badge-name check.

---

### Task 1: Backend — reject duplicate comparison specification names

**Files:**
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/BuyingGuideServiceImpl.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java`

**Interfaces:**
- Consumes: existing `BuyingGuideComparisonSpecRequest.specificationName()`.
- Produces: `InvalidBuyingGuideException` (400) on a case-insensitive
  duplicate name, same behavior class as the existing quick-pick
  badge-name check.

- [ ] **Step 1: Write the failing test**

Add this test in `AdminBuyingGuideControllerTest.java`, directly after the
existing `create_returns400_whenComparisonSpecMissingValueForAProduct`
test:

```java
@Test
void create_returns400_whenComparisonSpecificationsShareAName() throws Exception {
    String token = adminToken();
    Long guideCategoryId = createCategoryId(token, "Duplicate Spec Name Guide Category");
    Long productCategoryId = createCategoryId(token, "Duplicate Spec Name Product Category");
    Long productId = createProductId(token, productCategoryId, "Duplicate Spec Name Product");

    String requestJson = """
            {
              "title": "Duplicate Spec Name Guide", "slug": "duplicate-spec-name-guide",
              "excerpt": "Excerpt", "introduction": "Introduction", "coverImageFilename": null,
              "categoryId": %d, "seoTitle": null, "seoDescription": null, "active": true,
              "scheduledPublishAt": null, "recommendedProductIds": [%d],
              "quickRecommendations": [],
              "comparisonSpecs": [
                {"specificationName": "Battery Life", "values": [{"productId": %d, "value": "40 Hrs"}]},
                {"specificationName": "battery life", "values": [{"productId": %d, "value": "35 Hrs"}]}
              ],
              "recommendationSections": [], "faqs": [], "tocEntries": []
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
`mvn test -Dtest=AdminBuyingGuideControllerTest#create_returns400_whenComparisonSpecificationsShareAName`
Expected: FAIL — request currently returns 200 (two specs with the same
name are both accepted, each individually satisfies the product-coverage
check).

- [ ] **Step 3: Implement the minimal fix**

In `BuyingGuideServiceImpl.validateRequest()`, immediately after the
existing per-spec product-coverage loop (the `for (BuyingGuideComparisonSpecRequest spec : request.comparisonSpecs())`
block that throws `"...must have exactly one value for every product..."`),
add:

```java
Set<String> comparisonSpecNames = new LinkedHashSet<>();
for (BuyingGuideComparisonSpecRequest spec : request.comparisonSpecs()) {
    if (!comparisonSpecNames.add(spec.specificationName().trim().toLowerCase())) {
        throw new InvalidBuyingGuideException(
                "Two comparison specifications cannot use the same name: \"" + spec.specificationName() + "\".");
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: PASS. Then run the full backend suite
(`mvn test`) to confirm no regressions (baseline was 141/141 before this
task).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/service/impl/BuyingGuideServiceImpl.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java
git commit -m "fix(buying-guides): reject duplicate comparison specification names"
```

---

### Task 2: `ComparisonProductsPanel.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/ComparisonProductsPanel.jsx`
- Test: `frontend/src/components/buying-guide-form/ComparisonProductsPanel.test.jsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `ComparisonProductsPanel({ recommendedProducts, onManageProducts })`
  — a read-only default export, `recommendedProducts` is the same shape
  already used by `ProductsStep`/`QuickPickEditorRow` (`{ id, name,
  imageFileName, ... }`), `onManageProducts` is a no-arg callback. Later
  tasks (`BuyingGuideComparisonStep`) render this directly.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ComparisonProductsPanel from './ComparisonProductsPanel.jsx';

const products = [
  { id: 1, name: 'Soundcore Liberty 4 NC', imageFileName: null },
  { id: 2, name: 'TOZO NC9 Hybrid Active', imageFileName: null },
];

describe('ComparisonProductsPanel', () => {
  it('shows the product count in the heading and renders every product', () => {
    render(<ComparisonProductsPanel recommendedProducts={products} onManageProducts={vi.fn()} />);
    expect(screen.getByText('Products in This Comparison (2)')).toBeInTheDocument();
    expect(screen.getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
    expect(screen.getByText('TOZO NC9 Hybrid Active')).toBeInTheDocument();
  });

  it('shows an empty state when no products are selected', () => {
    render(<ComparisonProductsPanel recommendedProducts={[]} onManageProducts={vi.fn()} />);
    expect(screen.getByText('No products yet')).toBeInTheDocument();
  });

  it('calls onManageProducts when the manage button is clicked', async () => {
    const onManageProducts = vi.fn();
    const user = userEvent.setup();
    render(<ComparisonProductsPanel recommendedProducts={products} onManageProducts={onManageProducts} />);

    await user.click(screen.getByRole('button', { name: /manage in products step/i }));

    expect(onManageProducts).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/ComparisonProductsPanel.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the implementation**

```jsx
import { Image as ImageIcon } from 'lucide-react';
import Button from '../Button.jsx';
import EmptyState from '../EmptyState.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';

function ComparisonProductsPanel({ recommendedProducts, onManageProducts }) {
  return (
    <div className="mb-6 rounded-card border border-border bg-white p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-card-title text-heading">
          Products in This Comparison ({recommendedProducts.length})
        </h3>
        <Button type="button" variant="secondary" size="sm" onClick={onManageProducts}>
          Manage in Products step
        </Button>
      </div>
      <p className="mb-4 text-sm text-muted">
        These are the products selected in the Products step. Add, remove, or reorder them there.
      </p>

      {recommendedProducts.length === 0 ? (
        <EmptyState
          title="No products yet"
          description="Add products in the Products step before building a comparison."
        />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2" aria-label="Products in this comparison">
          {recommendedProducts.map((product, index) => {
            const imageUrl = getImageUrl(product.imageFileName);
            return (
              <div key={product.id} className="w-32 shrink-0 rounded-btn border border-border p-3 text-center">
                <span className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-muted">
                  {index + 1}
                </span>
                <div className="mx-auto mb-2 h-16 w-16 overflow-hidden rounded-md bg-slate-100">
                  {imageUrl ? (
                    <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-slate-300" />
                    </div>
                  )}
                </div>
                <p className="truncate text-xs font-medium text-body">{product.name}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ComparisonProductsPanel;
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/ComparisonProductsPanel.jsx \
        frontend/src/components/buying-guide-form/ComparisonProductsPanel.test.jsx
git commit -m "feat(buying-guides): add ComparisonProductsPanel"
```

---

### Task 3: `ComparisonSpecificationRow.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/ComparisonSpecificationRow.jsx`
- Test: `frontend/src/components/buying-guide-form/ComparisonSpecificationRow.test.jsx`

**Interfaces:**
- Consumes: nothing from earlier tasks (verified safe to test standalone
  outside a `DndContext`, same as `QuickPickEditorRow` — `@dnd-kit`'s
  `useSortable` returns inert defaults without a provider).
- Produces: `ComparisonSpecificationRow({ spec, index, total, products,
  nameError, valueErrors, onNameChange, onValueChange, onMoveUp,
  onMoveDown, onRemove })`. `spec` shape: `{ clientId, specificationName,
  values: [{ productId, value }] }`. `valueErrors` is a plain object keyed
  by `productId`. Must render as an `<li>` (parent supplies the
  `<ul>`/`SortableContext`) — later tasks (`ComparisonSpecificationsEditor`)
  map an array of these inside a `<ul>`.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ComparisonSpecificationRow from './ComparisonSpecificationRow.jsx';

const products = [
  { id: 1, name: 'Soundcore Liberty 4 NC' },
  { id: 2, name: 'TOZO NC9 Hybrid Active' },
];

const spec = {
  clientId: 'spec-1',
  specificationName: 'Battery Life',
  values: [
    { productId: 1, value: '50 Hrs' },
    { productId: 2, value: '40 Hrs' },
  ],
};

function renderRow(props = {}) {
  return render(
    <ul>
      <ComparisonSpecificationRow
        spec={spec}
        index={0}
        total={1}
        products={products}
        nameError={null}
        valueErrors={{}}
        onNameChange={vi.fn()}
        onValueChange={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        onRemove={vi.fn()}
        {...props}
      />
    </ul>
  );
}

describe('ComparisonSpecificationRow', () => {
  it('renders the specification name and every product value', () => {
    renderRow();
    expect(screen.getByLabelText('Specification Name')).toHaveValue('Battery Life');
    expect(screen.getByLabelText('Soundcore Liberty 4 NC')).toHaveValue('50 Hrs');
    expect(screen.getByLabelText('TOZO NC9 Hybrid Active')).toHaveValue('40 Hrs');
  });

  it('calls onNameChange when the specification name changes', async () => {
    const onNameChange = vi.fn();
    const user = userEvent.setup();
    renderRow({ onNameChange });

    await user.type(screen.getByLabelText('Specification Name'), '!');

    expect(onNameChange).toHaveBeenCalledWith('spec-1', 'Battery Life!');
  });

  it('calls onValueChange with the spec id, product id, and new value', async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    renderRow({ onValueChange });

    await user.type(screen.getByLabelText('Soundcore Liberty 4 NC'), '!');

    expect(onValueChange).toHaveBeenCalledWith('spec-1', 1, '50 Hrs!');
  });

  it('shows an inline name error when provided', () => {
    renderRow({ nameError: 'Specification name is required.' });
    expect(screen.getByText('Specification name is required.')).toBeInTheDocument();
  });

  it('shows an inline value error for the affected product only', () => {
    renderRow({ valueErrors: { 1: 'A value is required.' } });
    expect(screen.getByText('A value is required.')).toBeInTheDocument();
  });

  it('disables Move up on the first row and Move down on the last row', () => {
    renderRow({ index: 0, total: 1 });
    expect(screen.getByRole('button', { name: 'Move Battery Life up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Battery Life down' })).toBeDisabled();
  });

  it('calls onRemove with the spec client id', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    renderRow({ onRemove });

    await user.click(screen.getByRole('button', { name: 'Delete Battery Life specification' }));

    expect(onRemove).toHaveBeenCalledWith('spec-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/ComparisonSpecificationRow.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the implementation**

```jsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';

function ComparisonSpecificationRow({
  spec,
  index,
  total,
  products,
  nameError,
  valueErrors,
  onNameChange,
  onValueChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: spec.clientId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const nameInputId = `comparison-spec-name-${spec.clientId}`;
  const rowLabel = spec.specificationName || 'specification';

  return (
    <li ref={setNodeRef} style={style} className="flex items-stretch gap-3">
      <div className="flex w-10 shrink-0 flex-col items-center justify-center gap-2 self-stretch rounded-btn bg-slate-50 py-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-semibold text-muted shadow-sm">
          {index + 1}
        </span>
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${rowLabel}`}
          className="cursor-grab rounded-btn p-1 text-muted hover:bg-surface-secondary active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            aria-label={`Move ${rowLabel} up`}
            className="rounded-btn p-1 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={index === total - 1}
            aria-label={`Move ${rowLabel} down`}
            className="rounded-btn p-1 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowDown size={14} />
          </button>
        </div>
      </div>

      <div className="min-w-0 flex-1 rounded-btn border border-border bg-white p-4">
        <div className="mb-3">
          <label htmlFor={nameInputId} className="mb-1 block text-small font-medium text-body">
            Specification Name
          </label>
          <input
            id={nameInputId}
            type="text"
            maxLength={100}
            value={spec.specificationName}
            onChange={(event) => onNameChange(spec.clientId, event.target.value)}
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? `${nameInputId}-error` : undefined}
            className="w-full max-w-sm rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {nameError && (
            <p id={`${nameInputId}-error`} role="alert" className="mt-1 text-sm text-danger">
              {nameError}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const cell = spec.values.find((v) => v.productId === product.id);
            const cellValue = cell?.value ?? '';
            const cellError = valueErrors[product.id];
            const valueInputId = `comparison-spec-value-${spec.clientId}-${product.id}`;
            return (
              <div key={product.id}>
                <label htmlFor={valueInputId} className="mb-1 block text-xs font-medium text-muted">
                  {product.name}
                </label>
                <input
                  id={valueInputId}
                  type="text"
                  value={cellValue}
                  onChange={(event) => onValueChange(spec.clientId, product.id, event.target.value)}
                  aria-invalid={Boolean(cellError)}
                  aria-describedby={cellError ? `${valueInputId}-error` : undefined}
                  className="w-full rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {cellError && (
                  <p id={`${valueInputId}-error`} role="alert" className="mt-1 text-xs text-danger">
                    {cellError}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onRemove(spec.clientId)}
        aria-label={`Delete ${rowLabel} specification`}
        className="shrink-0 self-start rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}

export default ComparisonSpecificationRow;
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: PASS (7/7).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/ComparisonSpecificationRow.jsx \
        frontend/src/components/buying-guide-form/ComparisonSpecificationRow.test.jsx
git commit -m "feat(buying-guides): add ComparisonSpecificationRow"
```

---

### Task 4: `ResetComparisonDialog.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/ResetComparisonDialog.jsx`
- Test: `frontend/src/components/buying-guide-form/ResetComparisonDialog.test.jsx`

**Interfaces:**
- Consumes: `Modal.jsx` (`{ isOpen, onClose, title, children }`), `Button.jsx`.
- Produces: `ResetComparisonDialog({ isOpen, onClose, onConfirm })` — no-arg
  callbacks. Later tasks (`ComparisonSpecificationsEditor`) own the
  `isOpen` state and call `onConfirm` to actually replace the specs.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ResetComparisonDialog from './ResetComparisonDialog.jsx';

describe('ResetComparisonDialog', () => {
  it('renders nothing when closed', () => {
    render(<ResetComparisonDialog isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onConfirm when Reset Comparison is clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    render(<ResetComparisonDialog isOpen={true} onClose={vi.fn()} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Reset Comparison' }));

    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<ResetComparisonDialog isOpen={true} onClose={onClose} onConfirm={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/ResetComparisonDialog.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the implementation**

```jsx
import Modal from '../Modal.jsx';
import Button from '../Button.jsx';

function ResetComparisonDialog({ isOpen, onClose, onConfirm }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reset Comparison?">
      <p className="mb-4 text-sm text-body">
        This replaces your current specifications and their values with a small default set. This can&apos;t be
        undone once you save.
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="danger" onClick={onConfirm}>
          Reset Comparison
        </Button>
      </div>
    </Modal>
  );
}

export default ResetComparisonDialog;
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/ResetComparisonDialog.jsx \
        frontend/src/components/buying-guide-form/ResetComparisonDialog.test.jsx
git commit -m "feat(buying-guides): add ResetComparisonDialog"
```

---

### Task 5: `ComparisonSpecificationsEditor.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/ComparisonSpecificationsEditor.jsx`
- Test: `frontend/src/components/buying-guide-form/ComparisonSpecificationsEditor.test.jsx`

**Interfaces:**
- Consumes: `ComparisonSpecificationRow` (Task 3), `ResetComparisonDialog`
  (Task 4), `EmptyState`, `Button`.
- Produces: `ComparisonSpecificationsEditor({ comparisonSpecs,
  recommendedProducts, fieldErrors, onChange })`. `onChange` receives the
  full next `comparisonSpecs` array on every mutation (add/edit/reorder/
  remove/reset) — same "controlled array" pattern as
  `QuickPickEditorList`/`SelectedProductsPanel`. Later tasks
  (`BuyingGuideComparisonStep`) render this directly;
  `BuyingGuideForm.jsx` ultimately owns the state via
  `setComparisonSpecs`.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ComparisonSpecificationsEditor from './ComparisonSpecificationsEditor.jsx';

const products = [
  { id: 1, name: 'Soundcore Liberty 4 NC', productPrice: '69.99', rating: 4.8, reviewCount: 12850 },
  { id: 2, name: 'TOZO NC9 Hybrid Active', productPrice: '39.99', rating: null, reviewCount: null },
];

const specs = [
  {
    clientId: 'spec-1',
    specificationName: 'Battery Life',
    values: [
      { productId: 1, value: '50 Hrs' },
      { productId: 2, value: '40 Hrs' },
    ],
  },
];

describe('ComparisonSpecificationsEditor', () => {
  it('shows an empty state when there are no products', () => {
    render(<ComparisonSpecificationsEditor comparisonSpecs={[]} recommendedProducts={[]} fieldErrors={{}} onChange={vi.fn()} />);
    expect(screen.getByText('No products to compare')).toBeInTheDocument();
  });

  it('shows an empty state when there are products but no specs yet', () => {
    render(<ComparisonSpecificationsEditor comparisonSpecs={[]} recommendedProducts={products} fieldErrors={{}} onChange={vi.fn()} />);
    expect(screen.getByText('No specifications yet')).toBeInTheDocument();
  });

  it('renders existing spec rows', () => {
    render(<ComparisonSpecificationsEditor comparisonSpecs={specs} recommendedProducts={products} fieldErrors={{}} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Specification Name')).toHaveValue('Battery Life');
  });

  it('adds a new empty spec row covering every current product when Add Specification is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ComparisonSpecificationsEditor comparisonSpecs={[]} recommendedProducts={products} fieldErrors={{}} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /add specification/i }));

    const next = onChange.mock.calls[0][0];
    expect(next).toHaveLength(1);
    expect(next[0].specificationName).toBe('');
    expect(next[0].values).toEqual([
      { productId: 1, value: '' },
      { productId: 2, value: '' },
    ]);
  });

  it('replaces specs with a default set pre-filled from product data after confirming Reset', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ComparisonSpecificationsEditor comparisonSpecs={specs} recommendedProducts={products} fieldErrors={{}} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /reset to default/i }));
    await user.click(screen.getByRole('button', { name: 'Reset Comparison' }));

    const next = onChange.mock.calls[0][0];
    expect(next.map((spec) => spec.specificationName)).toEqual(['Price', 'Customer Reviews', 'Best For']);
    expect(next[0].values).toEqual([
      { productId: 1, value: '$69.99' },
      { productId: 2, value: '$39.99' },
    ]);
    expect(next[1].values).toEqual([
      { productId: 1, value: '4.8 (12,850)' },
      { productId: 2, value: '' },
    ]);
  });

  it('removes a spec row when Delete is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ComparisonSpecificationsEditor comparisonSpecs={specs} recommendedProducts={products} fieldErrors={{}} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Delete Battery Life specification' }));

    expect(onChange).toHaveBeenCalledWith([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/ComparisonSpecificationsEditor.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the implementation**

```jsx
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Info, Plus, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import Button from '../Button.jsx';
import EmptyState from '../EmptyState.jsx';
import ComparisonSpecificationRow from './ComparisonSpecificationRow.jsx';
import ResetComparisonDialog from './ResetComparisonDialog.jsx';

function buildEmptySpec(recommendedProducts) {
  return {
    clientId: crypto.randomUUID(),
    specificationName: '',
    values: recommendedProducts.map((product) => ({ productId: product.id, value: '' })),
  };
}

function buildDefaultComparisonSpecs(recommendedProducts) {
  return [
    {
      clientId: crypto.randomUUID(),
      specificationName: 'Price',
      values: recommendedProducts.map((product) => ({
        productId: product.id,
        value: `$${Number(product.productPrice).toFixed(2)}`,
      })),
    },
    {
      clientId: crypto.randomUUID(),
      specificationName: 'Customer Reviews',
      values: recommendedProducts.map((product) => ({
        productId: product.id,
        value: product.rating != null ? `${product.rating} (${(product.reviewCount ?? 0).toLocaleString()})` : '',
      })),
    },
    {
      clientId: crypto.randomUUID(),
      specificationName: 'Best For',
      values: recommendedProducts.map((product) => ({ productId: product.id, value: '' })),
    },
  ];
}

function ComparisonSpecificationsEditor({ comparisonSpecs, recommendedProducts, fieldErrors, onChange }) {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function handleAddSpecification() {
    onChange([...comparisonSpecs, buildEmptySpec(recommendedProducts)]);
  }

  function handleNameChange(clientId, name) {
    onChange(comparisonSpecs.map((spec) => (spec.clientId === clientId ? { ...spec, specificationName: name } : spec)));
  }

  function handleValueChange(clientId, productId, value) {
    onChange(
      comparisonSpecs.map((spec) =>
        spec.clientId === clientId
          ? { ...spec, values: spec.values.map((v) => (v.productId === productId ? { ...v, value } : v)) }
          : spec
      )
    );
  }

  function handleMoveUp(index) {
    if (index === 0) return;
    const next = [...comparisonSpecs];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function handleMoveDown(index) {
    if (index === comparisonSpecs.length - 1) return;
    const next = [...comparisonSpecs];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  function handleRemove(clientId) {
    onChange(comparisonSpecs.filter((spec) => spec.clientId !== clientId));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = comparisonSpecs.findIndex((spec) => spec.clientId === active.id);
    const newIndex = comparisonSpecs.findIndex((spec) => spec.clientId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...comparisonSpecs];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onChange(next);
  }

  function handleResetConfirm() {
    onChange(buildDefaultComparisonSpecs(recommendedProducts));
    setIsResetDialogOpen(false);
  }

  const noProducts = recommendedProducts.length === 0;

  return (
    <div className="rounded-card border border-border bg-white p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-card-title text-heading">Comparison Specifications</h3>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setIsResetDialogOpen(true)} disabled={noProducts}>
            <RotateCcw size={16} />
            Reset to Default
          </Button>
          <Button type="button" size="sm" onClick={handleAddSpecification} disabled={noProducts}>
            <Plus size={16} />
            Add Specification
          </Button>
        </div>
      </div>
      <p className="mb-4 text-sm text-muted">Drag and drop to reorder rows.</p>

      {noProducts ? (
        <EmptyState
          title="No products to compare"
          description="Add products in the Products step before building a comparison."
        />
      ) : comparisonSpecs.length === 0 ? (
        <EmptyState
          title="No specifications yet"
          description="Add a specification to start building your comparison table."
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={comparisonSpecs.map((spec) => spec.clientId)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-3" aria-label="Comparison specifications">
              {comparisonSpecs.map((spec, index) => {
                const valueErrors = {};
                recommendedProducts.forEach((product) => {
                  const key = `spec-value-${spec.clientId}-${product.id}`;
                  if (fieldErrors[key]) valueErrors[product.id] = fieldErrors[key];
                });
                return (
                  <ComparisonSpecificationRow
                    key={spec.clientId}
                    spec={spec}
                    index={index}
                    total={comparisonSpecs.length}
                    products={recommendedProducts}
                    nameError={fieldErrors[`spec-name-${spec.clientId}`]}
                    valueErrors={valueErrors}
                    onNameChange={handleNameChange}
                    onValueChange={handleValueChange}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                    onRemove={handleRemove}
                  />
                );
              })}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-btn bg-primary/5 p-4 text-sm text-body">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <p>Tip: Changes you make here will automatically update the comparison table on the published guide.</p>
      </div>

      <ResetComparisonDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleResetConfirm}
      />
    </div>
  );
}

export default ComparisonSpecificationsEditor;
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/ComparisonSpecificationsEditor.jsx \
        frontend/src/components/buying-guide-form/ComparisonSpecificationsEditor.test.jsx
git commit -m "feat(buying-guides): add ComparisonSpecificationsEditor"
```

---

### Task 6: `BuyingGuideComparisonStep.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/BuyingGuideComparisonStep.jsx`
- Test: `frontend/src/components/buying-guide-form/BuyingGuideComparisonStep.test.jsx`

**Interfaces:**
- Consumes: `ComparisonProductsPanel` (Task 2), `ComparisonSpecificationsEditor` (Task 5).
- Produces: `BuyingGuideComparisonStep({ comparisonSpecs, onChange,
  recommendedProducts, fieldErrors, onManageProducts })`. This is the
  component `BuyingGuideForm.jsx` renders directly for `activeStep === 4`
  (Task 9), the same role `BuyingGuideQuickPicksStep` plays for step 3.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BuyingGuideComparisonStep from './BuyingGuideComparisonStep.jsx';

const products = [{ id: 1, name: 'Soundcore Liberty 4 NC', productPrice: '69.99', imageFileName: null }];

describe('BuyingGuideComparisonStep', () => {
  it('renders the heading, products panel, and specifications editor', () => {
    render(
      <BuyingGuideComparisonStep
        comparisonSpecs={[]}
        onChange={vi.fn()}
        recommendedProducts={products}
        fieldErrors={{}}
        onManageProducts={vi.fn()}
      />
    );
    expect(screen.getByRole('heading', { name: 'Product Comparison' })).toBeInTheDocument();
    expect(screen.getByText('Products in This Comparison (1)')).toBeInTheDocument();
    expect(screen.getByText('No specifications yet')).toBeInTheDocument();
  });

  it('toggles the How it works panel', async () => {
    const user = userEvent.setup();
    render(
      <BuyingGuideComparisonStep
        comparisonSpecs={[]}
        onChange={vi.fn()}
        recommendedProducts={products}
        fieldErrors={{}}
        onManageProducts={vi.fn()}
      />
    );
    expect(screen.queryByText(/each product appears as a column/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /how it works/i }));

    expect(screen.getByText(/each product appears as a column/i)).toBeInTheDocument();
  });

  it('forwards onManageProducts to the products panel', async () => {
    const onManageProducts = vi.fn();
    const user = userEvent.setup();
    render(
      <BuyingGuideComparisonStep
        comparisonSpecs={[]}
        onChange={vi.fn()}
        recommendedProducts={products}
        fieldErrors={{}}
        onManageProducts={onManageProducts}
      />
    );

    await user.click(screen.getByRole('button', { name: /manage in products step/i }));

    expect(onManageProducts).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/BuyingGuideComparisonStep.test.jsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write the implementation**

```jsx
import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import ComparisonProductsPanel from './ComparisonProductsPanel.jsx';
import ComparisonSpecificationsEditor from './ComparisonSpecificationsEditor.jsx';

const HOW_IT_WORKS_POINTS = [
  'Comparison products always match the products selected in the Products tab.',
  'Each product appears as a column in the published comparison table.',
  'Each specification you add appears as a row.',
  'The order you set here is the order that appears on the published guide.',
  'Changes here update the Live Preview immediately.',
];

function BuyingGuideComparisonStep({ comparisonSpecs, onChange, recommendedProducts, fieldErrors, onManageProducts }) {
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-card-title text-heading">Product Comparison</h2>
        <button
          type="button"
          aria-expanded={isHowItWorksOpen}
          aria-controls="comparison-how-it-works"
          onClick={() => setIsHowItWorksOpen((open) => !open)}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <HelpCircle size={14} />
          How it works
        </button>
      </div>
      <p className="mb-4 text-sm text-muted">
        Select products and customize the specifications to compare. Add, edit, reorder, or remove specifications as
        needed.
      </p>

      {isHowItWorksOpen && (
        <ul
          id="comparison-how-it-works"
          className="mb-4 list-disc space-y-1 rounded-btn bg-surface-secondary p-4 pl-8 text-sm text-body"
        >
          {HOW_IT_WORKS_POINTS.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}

      <ComparisonProductsPanel recommendedProducts={recommendedProducts} onManageProducts={onManageProducts} />
      <ComparisonSpecificationsEditor
        comparisonSpecs={comparisonSpecs}
        recommendedProducts={recommendedProducts}
        fieldErrors={fieldErrors}
        onChange={onChange}
      />
    </div>
  );
}

export default BuyingGuideComparisonStep;
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/BuyingGuideComparisonStep.jsx \
        frontend/src/components/buying-guide-form/BuyingGuideComparisonStep.test.jsx
git commit -m "feat(buying-guides): add BuyingGuideComparisonStep"
```

---

### Task 7: Extend `LivePreview.jsx` with the Comparison Table section

**Files:**
- Modify: `frontend/src/components/buying-guide-form/LivePreview.jsx`
- Modify: `frontend/src/components/buying-guide-form/LivePreview.test.jsx`

**Interfaces:**
- Consumes: `getImageUrl` (existing), new `lucide-react` icons `Check`/`X`.
- Produces: `LivePreview` gains two new optional props,
  `comparisonSpecs = []` and `comparisonProducts = []` (kept distinct from
  the existing `quickRecommendations` prop's embedded `.product` shape —
  `comparisonProducts` is the plain `recommendedProducts` array). Renders
  nothing when either is empty. Task 9 wires `BuyingGuideForm.jsx`'s
  `previewProps` to pass both.

- [ ] **Step 1: Write the failing test**

Add to `LivePreview.test.jsx`, after the existing Quick Recommendations
tests:

```jsx
it('renders the Comparison Table section with formatted values', () => {
  render(
    <LivePreview
      title="Best Earbuds"
      excerpt=""
      coverImageFilename={null}
      tocEntries={[]}
      settings={null}
      comparisonProducts={[
        { id: 1, name: 'Soundcore Liberty 4 NC', imageFileName: null },
        { id: 2, name: 'TOZO NC9 Hybrid Active', imageFileName: null },
      ]}
      comparisonSpecs={[
        {
          clientId: 'spec-1',
          specificationName: 'Active Noise Cancellation',
          values: [
            { productId: 1, value: 'Yes' },
            { productId: 2, value: 'No' },
          ],
        },
      ]}
    />
  );

  expect(screen.getByText('2. Comparison Table')).toBeInTheDocument();
  const table = screen.getByRole('table');
  expect(within(table).getByText('Active Noise Cancellation')).toBeInTheDocument();
  expect(within(table).getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
  expect(within(table).getByText('Yes')).toHaveClass('sr-only');
  expect(within(table).getByText('No')).toHaveClass('sr-only');
});

it('omits the Comparison Table section when there are no specs', () => {
  render(
    <LivePreview
      title="Best Earbuds"
      excerpt=""
      coverImageFilename={null}
      tocEntries={[]}
      settings={null}
      comparisonProducts={[{ id: 1, name: 'Soundcore Liberty 4 NC', imageFileName: null }]}
      comparisonSpecs={[]}
    />
  );
  expect(screen.queryByText(/comparison table/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/LivePreview.test.jsx`
Expected: FAIL — no Comparison Table section rendered yet.

- [ ] **Step 3: Write the implementation**

Add the import:

```jsx
import { Check, Image as ImageIcon, Monitor, Smartphone, X } from 'lucide-react';
```

Add this helper above the `LivePreview` function:

```jsx
function renderComparisonCellValue(rawValue) {
  const value = (rawValue ?? '').trim();
  if (!value) return <span aria-hidden="true">&mdash;</span>;
  const lower = value.toLowerCase();
  if (lower === 'yes') {
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <Check size={16} aria-hidden="true" />
        <span className="sr-only">Yes</span>
      </span>
    );
  }
  if (lower === 'no') {
    return (
      <span className="inline-flex items-center gap-1 text-danger">
        <X size={16} aria-hidden="true" />
        <span className="sr-only">No</span>
      </span>
    );
  }
  return value;
}
```

Update the function signature to accept the two new props:

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
}) {
```

Insert this block right after the existing `quickRecommendations.length > 0 && (...)` block and before `<AffiliateDisclosure ... />`:

```jsx
{comparisonSpecs.length > 0 && comparisonProducts.length > 0 && (
  <div className="mb-4 overflow-x-auto">
    <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
      2. Comparison Table
    </span>
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">
        Comparison of {comparisonProducts.map((product) => product.name).join(', ')}
      </caption>
      <thead>
        <tr>
          <th scope="col" className="border-b border-border p-2 text-left text-xs font-semibold text-muted">
            Feature
          </th>
          {comparisonProducts.map((product) => {
            const imageUrl = getImageUrl(product.imageFileName);
            return (
              <th key={product.id} scope="col" className="border-b border-border p-2 text-center">
                <div className="mx-auto mb-1 h-10 w-10 overflow-hidden rounded-md bg-surface-secondary">
                  {imageUrl && <img src={imageUrl} alt="" className="h-full w-full object-cover" />}
                </div>
                <span className="text-xs font-semibold text-heading">{product.name}</span>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {comparisonSpecs.map((spec) => (
          <tr key={spec.clientId}>
            <th scope="row" className="border-b border-border p-2 text-left text-xs font-medium text-body">
              {spec.specificationName || 'Untitled Specification'}
            </th>
            {comparisonProducts.map((product) => {
              const cell = spec.values.find((v) => v.productId === product.id);
              return (
                <td key={product.id} className="border-b border-border p-2 text-center text-xs text-body">
                  {renderComparisonCellValue(cell?.value)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: PASS. Then run the whole
`LivePreview.test.jsx` file to confirm the pre-existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/LivePreview.jsx \
        frontend/src/components/buying-guide-form/LivePreview.test.jsx
git commit -m "feat(buying-guides): render Comparison Table in Live Preview"
```

---

### Task 8: `Stepper.jsx` — unlock Comparison

**Files:**
- Modify: `frontend/src/components/buying-guide-form/Stepper.jsx`
- Modify: `frontend/src/components/buying-guide-form/Stepper.test.jsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `MAX_BUILT_STEP` becomes `4` (was `3`).

- [ ] **Step 1: Write the failing test**

Add to `Stepper.test.jsx`, after the existing "enables Quick Picks..." test:

```jsx
it('enables Comparison once unlocked, but keeps every step after it disabled', () => {
  render(<Stepper activeStep={4} maxUnlockedStep={4} onStepClick={vi.fn()} />);
  expect(screen.getByRole('button', { name: /Comparison/ })).toBeEnabled();
  expect(screen.getByRole('button', { name: /Top Pick/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /SEO & Publish/ })).toBeDisabled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/Stepper.test.jsx`
Expected: FAIL — Comparison stays disabled (`MAX_BUILT_STEP` is still 3).

- [ ] **Step 3: Write the implementation**

In `Stepper.jsx`, change:

```jsx
const MAX_BUILT_STEP = 3;
```

to:

```jsx
const MAX_BUILT_STEP = 4;
```

- [ ] **Step 4: Run test to verify it passes**

Same command as Step 2. Expected: PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/Stepper.jsx \
        frontend/src/components/buying-guide-form/Stepper.test.jsx
git commit -m "feat(buying-guides): unlock the Comparison step in the Stepper"
```

---

### Task 9: Wire Comparison into `BuyingGuideForm.jsx`

**Files:**
- Modify: `frontend/src/components/BuyingGuideForm.jsx`
- Modify: `frontend/src/components/BuyingGuideForm.test.jsx`

**Interfaces:**
- Consumes: `BuyingGuideComparisonStep` (Task 6), extended `LivePreview`
  (Task 7), extended `Stepper` (Task 8).
- Produces: full end-to-end save/load of `comparisonSpecs`, validated
  Next/Previous navigation between Quick Picks (3) and Top Pick (5) — Top
  Pick itself is not built, so `maxUnlockedStep` simply advances to 5
  without a step 5 render block existing yet (matches how step 4 currently
  has no render block before this task).

- [ ] **Step 1: Write the failing tests**

Add this mock near the top of `BuyingGuideForm.test.jsx`, after the
existing `BuyingGuideQuickPicksStep.jsx` mock:

```jsx
vi.mock('./buying-guide-form/BuyingGuideComparisonStep.jsx', () => ({
  default: ({ comparisonSpecs, onChange, recommendedProducts, onManageProducts }) => (
    <div>
      <p>Comparison step ({comparisonSpecs.length} specs, {recommendedProducts.length} products)</p>
      <button
        type="button"
        onClick={() =>
          onChange([
            ...comparisonSpecs,
            {
              clientId: 'mock-spec',
              specificationName: 'Battery Life',
              values: recommendedProducts.map((p) => ({ productId: p.id, value: '40 Hrs' })),
            },
          ])
        }
      >
        Add mock spec
      </button>
      <button type="button" onClick={onManageProducts}>
        Go to Products
      </button>
    </div>
  ),
}));
```

Then add these tests, after the existing "Next on Quick Picks blocks with
an error when no quick picks have been added" test:

```jsx
it('Next on Quick Picks advances to Comparison and unlocks it in the Stepper', async () => {
  const user = userEvent.setup();
  renderForm();
  await fillRequiredFields(user);
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));

  await user.click(screen.getByRole('button', { name: 'Next' }));

  expect(await screen.findByText('Comparison step (0 specs, 1 products)')).toBeInTheDocument();
  const comparisonButton = screen.getByRole('button', { name: /Comparison/ });
  expect(comparisonButton).toBeEnabled();
  expect(comparisonButton).toHaveAttribute('aria-current', 'step');
});

it('Previous on Comparison returns to Quick Picks without losing state', async () => {
  const user = userEvent.setup();
  renderForm();
  await fillRequiredFields(user);
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await screen.findByText('Comparison step (0 specs, 1 products)');

  await user.click(screen.getByRole('button', { name: 'Previous' }));

  expect(await screen.findByText('Quick Picks step (1 added)')).toBeInTheDocument();
});

it('the manage-products link on Comparison jumps to the Products step', async () => {
  const user = userEvent.setup();
  renderForm();
  await fillRequiredFields(user);
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(await screen.findByRole('button', { name: 'Go to Products' }));

  expect(await screen.findByText('Products step (1 selected)')).toBeInTheDocument();
});

it('adding a comparison spec and saving includes it in the comparisonSpecs payload', async () => {
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

  await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  const payload = onSubmit.mock.calls[0][0];
  expect(payload.comparisonSpecs).toEqual([
    { specificationName: 'Battery Life', values: [{ productId: 99, value: '40 Hrs' }] },
  ]);
});

it('Next on Comparison blocks with an error when no specifications have been added', async () => {
  const user = userEvent.setup();
  renderForm();
  await fillRequiredFields(user);
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await screen.findByText('Comparison step (0 specs, 1 products)');

  await user.click(screen.getByRole('button', { name: 'Next' }));

  expect(await screen.findByText(/add at least one specification/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/BuyingGuideForm.test.jsx`
Expected: FAIL — Step 4 has no render block, `Next` on Quick Picks does not
reveal a Comparison step, `comparisonSpecs` has no setter.

- [ ] **Step 3: Write the implementation**

In `mapComparisonSpecsFromResponse`, add a `clientId` to every mapped spec:

```jsx
function mapComparisonSpecsFromResponse(comparisonSpecs) {
  return (comparisonSpecs ?? []).map((spec) => ({
    clientId: crypto.randomUUID(),
    specificationName: spec.specificationName,
    values: spec.values.map((v) => ({ productId: v.product.id, value: v.specificationValue })),
  }));
}
```

Add the `BuyingGuideComparisonStep` import near the other step imports:

```jsx
import BuyingGuideComparisonStep from './buying-guide-form/BuyingGuideComparisonStep.jsx';
```

Change the read-only `comparisonSpecs` state to a real setter, and add a
`comparisonErrors` state, right next to the existing `quickPicksErrors`
declaration:

```jsx
const [comparisonSpecs, setComparisonSpecs] = useState(mapComparisonSpecsFromResponse(guide?.comparisonSpecs));
const [comparisonErrors, setComparisonErrors] = useState({});
```

Add a reconciliation effect below the existing `useEffect` that loads
settings (needs `useEffect` already imported at the top of the file):

```jsx
const recommendedProductIdsKey = recommendedProducts.map((product) => product.id).join(',');

useEffect(() => {
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
  // recommendedProducts is intentionally summarized to its id list: the effect only needs to
  // re-run when membership actually changes, not on every new array reference from a reorder.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [recommendedProductIdsKey]);
```

In `buildPayload`, replace the bare `comparisonSpecs,` line with:

```jsx
comparisonSpecs: comparisonSpecs.map(({ specificationName, values }) => ({
  specificationName: specificationName.trim(),
  values: values.map(({ productId, value }) => ({ productId, value: value.trim() })),
})),
```

Add `validateComparison` and `handleComparisonNext` right after the
existing `handleQuickPicksNext` function:

```jsx
function validateComparison() {
  const errors = {};
  if (comparisonSpecs.length === 0) {
    errors.specsCount = 'Add at least one specification before continuing.';
    return errors;
  }
  const seenNames = new Set();
  comparisonSpecs.forEach((spec) => {
    const trimmedName = spec.specificationName.trim();
    if (!trimmedName) {
      errors[`spec-name-${spec.clientId}`] = 'Specification name is required.';
    } else {
      const key = trimmedName.toLowerCase();
      if (seenNames.has(key)) {
        errors[`spec-name-${spec.clientId}`] = 'Two specifications cannot use the same name.';
      } else {
        seenNames.add(key);
      }
    }
    spec.values.forEach((value) => {
      if (!value.value.trim()) {
        errors[`spec-value-${spec.clientId}-${value.productId}`] = 'A value is required.';
      }
    });
  });
  return errors;
}

function handleComparisonNext() {
  const errors = validateComparison();
  setComparisonErrors(errors);
  if (Object.keys(errors).length > 0) return;
  setMaxUnlockedStep((prev) => Math.max(prev, 5));
  submit(false);
}
```

Add `comparisonSpecs` and `recommendedProducts` to `previewProps`:

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
};
```

Add the `activeStep === 4` render block, right after the existing
`activeStep === 3` block:

```jsx
{activeStep === 4 && (
  <>
    <BuyingGuideComparisonStep
      comparisonSpecs={comparisonSpecs}
      onChange={setComparisonSpecs}
      recommendedProducts={recommendedProducts}
      fieldErrors={comparisonErrors}
      onManageProducts={() => setActiveStep(2)}
    />
    {comparisonErrors.specsCount && (
      <p role="alert" className="mt-4 text-sm text-danger">
        {comparisonErrors.specsCount}
      </p>
    )}
    <div className="mt-6 flex justify-between">
      <Button type="button" variant="secondary" onClick={() => setActiveStep(3)}>
        Previous
      </Button>
      <Button type="button" onClick={handleComparisonNext}>
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
git commit -m "feat(buying-guides): wire Comparison step into the guide editor"
```

---

### Task 10: Verification, build, lint, manual browser check

**Files:** none (verification only).

- [ ] **Step 1: Full automated test suites**

```bash
cd frontend && npx vitest run
```
Expected: every test file passes, including all new/modified files from
Tasks 1–9.

```bash
cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" \
  && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test
```
Expected: all tests pass (baseline 141 + the new Task 1 test).

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

Using an existing guide that already has products selected in Step 2 (or
add a couple), walk through:

1. Load the guide, click through Basic Info → Products → Quick Picks →
   Comparison. Confirm "Products in This Comparison (N)" matches the
   Products-step count and product order exactly.
2. Add 2–3 specification rows with names and per-product values. Confirm
   Live Preview's "2. Comparison Table" updates immediately with matching
   rows/columns/order.
3. Type "Yes"/"No" into a value cell and confirm the Live Preview renders
   a check/cross icon instead of the literal text.
4. Reorder a spec row via the Move Up/Down buttons and via drag, confirm
   the Live Preview row order follows.
5. Click "Reset to Default" → Cancel (nothing changes) → Reset to Default →
   Reset Comparison (confirm), and verify Price/Customer Reviews/Best For
   rows appear with Price and Customer Reviews pre-filled from real
   product data.
6. Delete a row, confirm it disappears from both the editor and Live
   Preview.
7. Click "Manage in Products step", confirm it navigates to Step 2 with
   the same selection intact.
8. Go back to Products, add a new product, return to Comparison — confirm
   every existing spec row now shows an empty cell for the new product
   (not a crash, not a stale/missing column).
9. Leave one value cell blank and click Next — confirm it blocks with an
   inline error and does not advance the Stepper.
10. Fill every cell, click Next — confirm it saves (check the network
    request/response) and the Stepper unlocks/advances.
11. Reload the guide from scratch (hard reload) and confirm the saved
    comparison data round-trips correctly into the editor and Live
    Preview.
12. Resize to a narrow mobile viewport (390px) and confirm the Comparison
    Table in Live Preview scrolls horizontally inside its own container
    without ever causing the whole page to overflow horizontally, and that
    the editor's rows remain usable (no illegible squashed text, touch
    targets reachable).
13. Check the browser console for any new errors (pre-existing React
    Router warnings are expected and unrelated).

Once every item above is verified — not before — report per the required
completion format, ending with the exact required sentence.
