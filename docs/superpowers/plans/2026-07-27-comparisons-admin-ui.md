# Comparisons Stage 2 (Admin Authoring UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the admin-facing frontend for Comparisons: a list page and a full tabbed authoring form covering basic info, per-product editorial data, the flexible grouped spec table, sections, FAQ, and related-content pickers.

**Architecture:** `ComparisonForm` owns all form state and renders six tab components over shared state slices, saving everything as one `ComparisonRequest`-shaped payload matching Stage 1's single-PUT backend. A generic `EntityPicker` component (extracted from the existing `ProductPicker`) powers both the existing recommended-products pickers and a new comparison picker, avoiding duplicated search/reorder logic.

**Tech Stack:** React, Vite, Tailwind CSS, React Router DOM, Vitest, React Testing Library, lucide-react icons.

## Global Constraints

- Never expose JPA entities or call the backend directly from components — always go through a `services/admin*.js` wrapper, matching every existing admin page.
- Business logic (validation, payload shaping) lives in `ComparisonForm`, not in the page wrapper or individual tabs.
- Every list/form page includes loading, empty, and error states, reusing `LoadingSpinner`/`EmptyState`/`ErrorState`/`ConfirmDialog` exactly as `BuyingGuidesPage`/`BuyingGuideForm` do — no new primitives.
- Follow strict TDD for every step: write the failing test, run it and confirm it fails, implement the minimal code to pass, run it and confirm it passes, run the full frontend suite, then commit.
- `ProductPicker`'s existing test file must continue passing unchanged after Task 2's refactor — it is the regression guard for the `EntityPicker` extraction.
- Dark mode is out of scope for this entire feature (all 4 stages).
- This stage is admin-only — no public page rendering, no SEO, no UX/performance polish (Stages 3-4).

---

### Task 1: `adminComparisonService.js`

**Files:**
- Create: `frontend/src/services/adminComparisonService.js`

**Interfaces:**
- Produces: `getComparisons()`, `getComparisonById(id)`, `createComparison(payload)`, `updateComparison(id, payload)`, `deleteComparison(id)` — consumed by every later task in this plan.

No dedicated test file for this task — it's a thin wrapper with no branching logic, matching the precedent set by `adminBuyingGuideService.js` (also untested directly, verified indirectly through the pages/forms that use it).

- [ ] **Step 1: Create the service file**

```js
import api from './api.js';

export async function getComparisons() {
  const response = await api.get('/admin/comparisons');
  return response.data.data;
}

export async function getComparisonById(id) {
  const response = await api.get(`/admin/comparisons/${id}`);
  return response.data.data;
}

export async function createComparison(payload) {
  const response = await api.post('/admin/comparisons', payload);
  return response.data.data;
}

export async function updateComparison(id, payload) {
  const response = await api.put(`/admin/comparisons/${id}`, payload);
  return response.data.data;
}

export async function deleteComparison(id) {
  await api.delete(`/admin/comparisons/${id}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/services/adminComparisonService.js
git commit -m "feat: add adminComparisonService"
```

---

### Task 2: Extract `EntityPicker`, refactor `ProductPicker`

**Files:**
- Create: `frontend/src/components/EntityPicker.jsx`
- Create: `frontend/src/components/EntityPicker.test.jsx`
- Modify: `frontend/src/components/ProductPicker.jsx`
- Test (must continue passing unchanged): `frontend/src/components/ProductPicker.test.jsx`

**Interfaces:**
- Produces: `EntityPicker({ label, inputId, searchPlaceholder, selectedItems, onChange, search, getItemLabel })` — generic ordered multi-select with search/add/reorder/remove. `search` MUST be a referentially-stable function (module-level, or `useCallback`-memoized by the caller) since it's a `useEffect` dependency; an inline arrow function recreated every render would cause redundant re-fetches on every parent re-render. Consumed by Task 3 (`ComparisonPicker`) and by the refactored `ProductPicker`.
- Produces: `ProductPicker({ selectedProducts, onChange, label = 'Recommended Products' })` — same external API as before, `label` is a new optional prop (default preserves existing `BuyingGuideForm` usage unchanged). Consumed by Task 4's `RelatedTab` (with `label="Related Products"`) and the existing `BuyingGuideForm` (unchanged).

- [ ] **Step 1: Write the failing `EntityPicker` test**

Create `frontend/src/components/EntityPicker.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import EntityPicker from './EntityPicker.jsx';

const itemA = { id: 1, name: 'Item A' };
const itemB = { id: 2, name: 'Item B' };

function getLabel(item) {
  return item.name;
}

function renderPicker(props) {
  return render(
    <EntityPicker
      label="Related Items"
      inputId="itemSearch"
      searchPlaceholder="Search items to add..."
      getItemLabel={getLabel}
      {...props}
    />
  );
}

describe('EntityPicker', () => {
  it('searches and adds an item to the selection', async () => {
    const search = vi.fn().mockResolvedValue([itemA]);
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderPicker({ selectedItems: [], onChange, search });

    await user.type(screen.getByLabelText('Related Items'), 'item a');
    await user.click(await screen.findByRole('button', { name: 'Item A' }));

    expect(onChange).toHaveBeenCalledWith([itemA]);
  });

  it('does not add the same item twice', async () => {
    const search = vi.fn().mockResolvedValue([itemA]);
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderPicker({ selectedItems: [itemA], onChange, search });

    await user.type(screen.getByLabelText('Related Items'), 'item a');
    await user.click(await screen.findByRole('button', { name: 'Item A' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes a selected item', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderPicker({ selectedItems: [itemA, itemB], onChange, search: vi.fn() });

    await userEvent.setup().click(screen.getByRole('button', { name: 'Remove Item A' }));

    expect(onChange).toHaveBeenCalledWith([itemB]);
  });

  it('reorders selected items with the move up/down buttons', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderPicker({ selectedItems: [itemA, itemB], onChange, search: vi.fn() });

    await user.click(screen.getByRole('button', { name: 'Move Item B up' }));

    expect(onChange).toHaveBeenCalledWith([itemB, itemA]);
  });

  it('disables move-up for the first item and move-down for the last item', () => {
    renderPicker({ selectedItems: [itemA, itemB], onChange: vi.fn(), search: vi.fn() });

    expect(screen.getByRole('button', { name: 'Move Item A up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Item B down' })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- EntityPicker.test.jsx`
Expected: FAIL — `EntityPicker.jsx` does not exist yet.

- [ ] **Step 3: Create `EntityPicker.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, X } from 'lucide-react';

function EntityPicker({ label, inputId, searchPlaceholder, selectedItems, onChange, search, getItemLabel }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      // Resetting to the empty state when the query clears is the standard
      // reset-on-external-change pattern; it can't cascade since `query` itself isn't touched here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return undefined;
    }

    let isCancelled = false;
    setIsSearching(true);
    search(trimmed)
      .then((items) => {
        if (!isCancelled) setResults(items);
      })
      .catch(() => {
        if (!isCancelled) setResults([]);
      })
      .finally(() => {
        if (!isCancelled) setIsSearching(false);
      });

    return () => {
      isCancelled = true;
    };
    // `search` must be a referentially-stable function provided by the caller (module-level or
    // useCallback-memoized) -- see this component's Interfaces contract in the implementation plan.
  }, [query, search]);

  function handleAdd(item) {
    if (selectedItems.some((selected) => selected.id === item.id)) return;
    onChange([...selectedItems, item]);
    setQuery('');
  }

  function handleRemove(id) {
    onChange(selectedItems.filter((item) => item.id !== id));
  }

  function handleMoveUp(index) {
    if (index === 0) return;
    const next = [...selectedItems];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function handleMoveDown(index) {
    if (index === selectedItems.length - 1) return;
    const next = [...selectedItems];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={searchPlaceholder}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {isSearching && <p className="mt-1 text-sm text-slate-400">Searching...</p>}
      {!isSearching && results.length > 0 && (
        <ul className="mt-1 rounded-md border border-slate-200 bg-white shadow-sm">
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleAdd(item)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {getItemLabel(item)}
              </button>
            </li>
          ))}
        </ul>
      )}

      <ul className="mt-3 space-y-2">
        {selectedItems.map((item, index) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
          >
            <span className="text-sm text-slate-700">{getItemLabel(item)}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                aria-label={`Move ${getItemLabel(item)} up`}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleMoveDown(index)}
                disabled={index === selectedItems.length - 1}
                aria-label={`Move ${getItemLabel(item)} down`}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                aria-label={`Remove ${getItemLabel(item)}`}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
              >
                <X size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default EntityPicker;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm test -- EntityPicker.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Confirm the existing `ProductPicker` test passes as a baseline**

Run: `cd frontend && npm test -- ProductPicker.test.jsx`
Expected: PASS (5 tests, unchanged from before this task) — this is the pre-refactor baseline.

- [ ] **Step 6: Refactor `ProductPicker.jsx` to delegate to `EntityPicker`**

Replace the full contents of `frontend/src/components/ProductPicker.jsx`:

```jsx
import EntityPicker from './EntityPicker.jsx';
import { searchProducts } from '../services/adminProductService.js';

function searchProductsForPicker(query) {
  return searchProducts({ search: query, size: 5 }).then((data) => data.content);
}

function getProductLabel(product) {
  return product.name;
}

function ProductPicker({ selectedProducts, onChange, label = 'Recommended Products' }) {
  return (
    <EntityPicker
      label={label}
      inputId="productSearch"
      searchPlaceholder="Search products to add..."
      selectedItems={selectedProducts}
      onChange={onChange}
      search={searchProductsForPicker}
      getItemLabel={getProductLabel}
    />
  );
}

export default ProductPicker;
```

- [ ] **Step 7: Run the `ProductPicker` test again to verify it still passes unchanged**

Run: `cd frontend && npm test -- ProductPicker.test.jsx`
Expected: PASS (5 tests) — same count and same assertions as Step 5, now passing against the refactored wrapper. This confirms the extraction didn't change `ProductPicker`'s external behavior.

- [ ] **Step 8: Run the full frontend suite**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus `EntityPicker.test.jsx`'s 5 new tests.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/EntityPicker.jsx frontend/src/components/EntityPicker.test.jsx \
        frontend/src/components/ProductPicker.jsx
git commit -m "refactor: extract EntityPicker from ProductPicker"
```

---

### Task 3: `ComparisonPicker`

**Files:**
- Create: `frontend/src/components/ComparisonPicker.jsx`
- Create: `frontend/src/components/ComparisonPicker.test.jsx`

**Interfaces:**
- Consumes: `EntityPicker` (Task 2), `getComparisons` from `adminComparisonService.js` (Task 1).
- Produces: `ComparisonPicker({ selectedComparisons, onChange, excludeId })` — `excludeId` filters the comparison currently being edited out of search results (a comparison can't relate to itself). Consumed by Task 4's `RelatedTab`.

There is no backend search-by-title endpoint for comparisons (Stage 1's admin `GET /api/admin/comparisons` returns the full unpaginated list). `ComparisonPicker` fetches the full list once on mount and filters client-side — reasonable since comparisons are curated editorial content, not high-volume like products.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/ComparisonPicker.test.jsx`:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ComparisonPicker from './ComparisonPicker.jsx';
import * as adminComparisonService from '../services/adminComparisonService.js';

const comparisonA = { id: 1, title: 'Best Blenders' };
const comparisonB = { id: 2, title: 'Best Standing Desks' };

describe('ComparisonPicker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads comparisons and adds a matching one to the selection', async () => {
    vi.spyOn(adminComparisonService, 'getComparisons').mockResolvedValue([comparisonA, comparisonB]);
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ComparisonPicker selectedComparisons={[]} onChange={onChange} excludeId={null} />);

    await waitFor(() => expect(adminComparisonService.getComparisons).toHaveBeenCalled());
    await user.type(screen.getByLabelText('Related Comparisons'), 'blenders');
    await user.click(await screen.findByRole('button', { name: 'Best Blenders' }));

    expect(onChange).toHaveBeenCalledWith([comparisonA]);
  });

  it('excludes the comparison currently being edited from search results', async () => {
    vi.spyOn(adminComparisonService, 'getComparisons').mockResolvedValue([comparisonA, comparisonB]);
    const user = userEvent.setup();
    render(<ComparisonPicker selectedComparisons={[]} onChange={vi.fn()} excludeId={1} />);

    await waitFor(() => expect(adminComparisonService.getComparisons).toHaveBeenCalled());
    await user.type(screen.getByLabelText('Related Comparisons'), 'best');

    expect(screen.queryByRole('button', { name: 'Best Blenders' })).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Best Standing Desks' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- ComparisonPicker.test.jsx`
Expected: FAIL — `ComparisonPicker.jsx` does not exist yet.

- [ ] **Step 3: Create `ComparisonPicker.jsx`**

```jsx
import { useCallback, useEffect, useState } from 'react';
import EntityPicker from './EntityPicker.jsx';
import { getComparisons } from '../services/adminComparisonService.js';

function getComparisonLabel(comparison) {
  return comparison.title;
}

function ComparisonPicker({ selectedComparisons, onChange, excludeId }) {
  const [allComparisons, setAllComparisons] = useState([]);

  useEffect(() => {
    getComparisons()
      .then(setAllComparisons)
      .catch(() => setAllComparisons([]));
  }, []);

  const search = useCallback(
    (query) => {
      const lower = query.toLowerCase();
      return Promise.resolve(
        allComparisons.filter(
          (comparison) => comparison.id !== excludeId && comparison.title.toLowerCase().includes(lower)
        )
      );
    },
    [allComparisons, excludeId]
  );

  return (
    <EntityPicker
      label="Related Comparisons"
      inputId="comparisonSearch"
      searchPlaceholder="Search comparisons to add..."
      selectedItems={selectedComparisons}
      onChange={onChange}
      search={search}
      getItemLabel={getComparisonLabel}
    />
  );
}

export default ComparisonPicker;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm test -- ComparisonPicker.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the full frontend suite**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus these 2.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ComparisonPicker.jsx frontend/src/components/ComparisonPicker.test.jsx
git commit -m "feat: add ComparisonPicker"
```

---

### Task 4: `ComparisonForm` (6 tabs + shell)

**Files:**
- Create: `frontend/src/components/comparison-form/BasicInfoTab.jsx`
- Create: `frontend/src/components/comparison-form/ProductsTab.jsx`
- Create: `frontend/src/components/comparison-form/SpecTableTab.jsx`
- Create: `frontend/src/components/comparison-form/SectionsTab.jsx`
- Create: `frontend/src/components/comparison-form/FaqTab.jsx`
- Create: `frontend/src/components/comparison-form/RelatedTab.jsx`
- Create: `frontend/src/components/ComparisonForm.jsx`
- Test: `frontend/src/components/ComparisonForm.test.jsx`

**Interfaces:**
- Consumes: `ImageUploader` (existing), `ProductPicker`/`ComparisonPicker` (Tasks 2-3), `searchProducts` from `adminProductService.js` (existing).
- Produces: `ComparisonForm({ comparison, categories, onSubmit, onCancel })` (default export, matches `BuyingGuideForm`'s prop shape) — `onSubmit` receives a full `ComparisonRequest`-shaped payload. Consumed by Task 5's `ComparisonFormPage`.

The six tab components are not independently reusable — they only make sense as pieces of `ComparisonForm`, so this task's test coverage lives entirely in `ComparisonForm.test.jsx`, exercising them through real tab navigation. This also correctly tests the spec-table auto-sync behavior, which is implemented in `ComparisonForm` itself (not in any individual tab) since it needs to coordinate between the `products` and `specRows` state slices.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/ComparisonForm.test.jsx`:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ComparisonForm from './ComparisonForm.jsx';
import * as adminProductService from '../services/adminProductService.js';
import * as adminComparisonService from '../services/adminComparisonService.js';

const categories = [{ id: 1, productCategoryName: 'Electronics' }];
const productA = { id: 10, name: 'Wireless Earbuds' };
const productB = { id: 20, name: 'Smart Watch' };

function renderForm(props = {}) {
  return render(
    <ComparisonForm comparison={null} categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} {...props} />
  );
}

describe('ComparisonForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the Basic Info tab by default', () => {
    renderForm();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('URL Slug (optional)')).toBeInTheDocument();
  });

  it('switches to the Products tab and shows the product search', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Products' }));

    expect(screen.getByLabelText('Compared Products')).toBeInTheDocument();
  });

  it('shows validation errors when submitted with empty required fields', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Add Comparison' }));

    expect(await screen.findByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByText('Description is required.')).toBeInTheDocument();
    expect(screen.getByText('Category is required.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Products' }));
    expect(screen.getByText('A comparison must include at least 2 products.')).toBeInTheDocument();
  });

  it('adds a product to the Products tab via search', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({ content: [productA] });
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Products' }));
    await user.type(screen.getByLabelText('Compared Products'), 'earbuds');
    await user.click(await screen.findByRole('button', { name: 'Wireless Earbuds' }));

    expect(screen.getByText('Wireless Earbuds')).toBeInTheDocument();
    expect(screen.getByLabelText('Recommendation')).toBeInTheDocument();
  });

  it('shows a pros/cons validation error when only one is filled in for a product', async () => {
    vi.spyOn(adminProductService, 'searchProducts')
      .mockResolvedValueOnce({ content: [productA] })
      .mockResolvedValueOnce({ content: [productB] });
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('Title'), 'Test Comparison');
    await user.type(screen.getByLabelText('Description'), 'A test description.');
    await user.selectOptions(screen.getByLabelText('Category'), '1');

    await user.click(screen.getByRole('button', { name: 'Products' }));
    await user.type(screen.getByLabelText('Compared Products'), 'earbuds');
    await user.click(await screen.findByRole('button', { name: 'Wireless Earbuds' }));
    await user.type(screen.getByLabelText('Compared Products'), 'watch');
    await user.click(await screen.findByRole('button', { name: 'Smart Watch' }));

    await user.type(screen.getAllByLabelText('Pros')[0], 'Great sound');

    await user.click(screen.getByRole('button', { name: 'Add Comparison' }));

    expect(await screen.findByText('Pros and cons must both be provided, or both left blank.')).toBeInTheDocument();
  });

  it('auto-syncs the spec table when a product is added, adding a value column', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({ content: [productA] });
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Products' }));
    await user.type(screen.getByLabelText('Compared Products'), 'earbuds');
    await user.click(await screen.findByRole('button', { name: 'Wireless Earbuds' }));

    await user.click(screen.getByRole('button', { name: 'Spec Table' }));
    await user.click(screen.getByRole('button', { name: 'Add Row' }));

    expect(screen.getByLabelText('Wireless Earbuds')).toBeInTheDocument();
  });

  it('removes a spec table value column when its product is removed', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({ content: [productA] });
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Products' }));
    await user.type(screen.getByLabelText('Compared Products'), 'earbuds');
    await user.click(await screen.findByRole('button', { name: 'Wireless Earbuds' }));

    await user.click(screen.getByRole('button', { name: 'Spec Table' }));
    await user.click(screen.getByRole('button', { name: 'Add Row' }));
    expect(screen.getByLabelText('Wireless Earbuds')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Products' }));
    await user.click(screen.getByRole('button', { name: 'Remove Wireless Earbuds' }));

    await user.click(screen.getByRole('button', { name: 'Spec Table' }));
    expect(screen.queryByLabelText('Wireless Earbuds')).not.toBeInTheDocument();
  });

  it('adds a section and a FAQ entry', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Sections' }));
    await user.click(screen.getByRole('button', { name: 'Add Section' }));
    expect(screen.getByLabelText('Heading')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'FAQ' }));
    await user.click(screen.getByRole('button', { name: 'Add FAQ' }));
    expect(screen.getByLabelText('Question')).toBeInTheDocument();
  });

  it('adds a related product and a related comparison in the Related tab', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({ content: [productB] });
    vi.spyOn(adminComparisonService, 'getComparisons').mockResolvedValue([{ id: 99, title: 'Best Blenders' }]);
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Related' }));
    await waitFor(() => expect(adminComparisonService.getComparisons).toHaveBeenCalled());

    await user.type(screen.getByLabelText('Related Products'), 'watch');
    await user.click(await screen.findByRole('button', { name: 'Smart Watch' }));

    await user.type(screen.getByLabelText('Related Comparisons'), 'blenders');
    await user.click(await screen.findByRole('button', { name: 'Best Blenders' }));

    expect(screen.getByText('Smart Watch')).toBeInTheDocument();
    expect(screen.getByText('Best Blenders')).toBeInTheDocument();
  });

  it('submits the expected payload when all required fields are valid', async () => {
    vi.spyOn(adminProductService, 'searchProducts')
      .mockResolvedValueOnce({ content: [productA] })
      .mockResolvedValueOnce({ content: [productB] });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderForm({ onSubmit });

    await user.type(screen.getByLabelText('Title'), 'Test Comparison');
    await user.type(screen.getByLabelText('Description'), 'A test description.');
    await user.selectOptions(screen.getByLabelText('Category'), '1');

    await user.click(screen.getByRole('button', { name: 'Products' }));
    await user.type(screen.getByLabelText('Compared Products'), 'earbuds');
    await user.click(await screen.findByRole('button', { name: 'Wireless Earbuds' }));
    await user.type(screen.getByLabelText('Compared Products'), 'watch');
    await user.click(await screen.findByRole('button', { name: 'Smart Watch' }));

    await user.type(screen.getAllByLabelText('Recommendation')[0], 'Great pick.');
    await user.type(screen.getAllByLabelText('Best For')[0], 'Everyone');
    await user.type(screen.getAllByLabelText('Main Strength')[0], 'Sound');
    await user.type(screen.getAllByLabelText('Main Weakness')[0], 'Price');
    await user.type(screen.getAllByLabelText('Recommendation')[1], 'Great budget pick.');
    await user.type(screen.getAllByLabelText('Best For')[1], 'Budget shoppers');
    await user.type(screen.getAllByLabelText('Main Strength')[1], 'Price');
    await user.type(screen.getAllByLabelText('Main Weakness')[1], 'Sound');

    await user.click(screen.getByRole('button', { name: 'Add Comparison' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.title).toBe('Test Comparison');
    expect(payload.products).toHaveLength(2);
    expect(payload.products[0].productId).toBe(10);
    expect(payload.products[0].recommendation).toBe('Great pick.');
    expect(payload.specRows).toEqual([]);
    expect(payload.sections).toEqual([]);
    expect(payload.faqs).toEqual([]);
    expect(payload.relatedComparisonIds).toEqual([]);
    expect(payload.relatedProductIds).toEqual([]);
  });

  it('pre-fills all tabs when editing an existing comparison', () => {
    const comparison = {
      id: 5,
      title: 'Existing Comparison',
      slug: 'existing-comparison',
      description: 'Existing description.',
      coverImageFilename: null,
      categoryId: 1,
      seoTitle: '',
      seoDescription: '',
      published: true,
      products: [
        {
          id: 1,
          product: { id: 10, name: 'Wireless Earbuds' },
          badge: 'Best Overall',
          recommendation: 'Great pick.',
          bestFor: 'Everyone',
          mainStrength: 'Sound',
          mainWeakness: 'Price',
          pros: 'Loud',
          cons: 'Pricey',
          editorsScore: 8.5,
        },
        {
          id: 2,
          product: { id: 20, name: 'Smart Watch' },
          badge: null,
          recommendation: 'Great budget pick.',
          bestFor: 'Budget shoppers',
          mainStrength: 'Price',
          mainWeakness: 'Sound',
          pros: null,
          cons: null,
          editorsScore: null,
        },
      ],
      specRows: [],
      sections: [],
      faqs: [],
      relatedComparisons: [],
      relatedProducts: [],
    };

    render(<ComparisonForm comparison={comparison} categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByLabelText('Title')).toHaveValue('Existing Comparison');
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- ComparisonForm.test.jsx`
Expected: FAIL — none of the tab components or `ComparisonForm.jsx` exist yet.

- [ ] **Step 3: Create `comparison-form/BasicInfoTab.jsx`**

```jsx
import ImageUploader from '../ImageUploader.jsx';

function BasicInfoTab({ values, onChange, categories, fieldErrors }) {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <ImageUploader
          imageFileName={values.coverImageFilename}
          onChange={(value) => onChange('coverImageFilename', value)}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
          Title
        </label>
        <input
          id="title"
          type="text"
          maxLength={200}
          value={values.title}
          onChange={(event) => onChange('title', event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.title)}
          aria-describedby={fieldErrors.title ? 'title-error' : undefined}
        />
        {fieldErrors.title && (
          <p id="title-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.title}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="slug" className="mb-1 block text-sm font-medium text-slate-700">
          URL Slug (optional)
        </label>
        <input
          id="slug"
          type="text"
          maxLength={220}
          value={values.slug}
          onChange={(event) => onChange('slug', event.target.value)}
          placeholder="Leave blank to auto-generate from the title"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.slug)}
          aria-describedby={fieldErrors.slug ? 'slug-error' : undefined}
        />
        {fieldErrors.slug && (
          <p id="slug-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.slug}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="description"
          rows={3}
          maxLength={500}
          value={values.description}
          onChange={(event) => onChange('description', event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.description)}
          aria-describedby={fieldErrors.description ? 'description-error' : undefined}
        />
        {fieldErrors.description && (
          <p id="description-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.description}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="categoryId" className="mb-1 block text-sm font-medium text-slate-700">
          Category
        </label>
        <select
          id="categoryId"
          value={values.categoryId}
          onChange={(event) => onChange('categoryId', event.target.value)}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          <p id="categoryId-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.categoryId}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="seoTitle" className="mb-1 block text-sm font-medium text-slate-700">
          SEO Title (optional)
        </label>
        <input
          id="seoTitle"
          type="text"
          maxLength={200}
          value={values.seoTitle}
          onChange={(event) => onChange('seoTitle', event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="mb-6">
        <label htmlFor="seoDescription" className="mb-1 block text-sm font-medium text-slate-700">
          SEO Description (optional)
        </label>
        <textarea
          id="seoDescription"
          rows={2}
          maxLength={300}
          value={values.seoDescription}
          onChange={(event) => onChange('seoDescription', event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="mb-2">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={values.published}
            onChange={(event) => onChange('published', event.target.checked)}
          />
          Published
        </label>
      </div>
    </div>
  );
}

export default BasicInfoTab;
```

- [ ] **Step 4: Create `comparison-form/ProductsTab.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { searchProducts } from '../../services/adminProductService.js';

function ProductsTab({ products, onChange, fieldErrors }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return undefined;
    }

    let isCancelled = false;
    setIsSearching(true);
    searchProducts({ search: trimmed, size: 5 })
      .then((data) => {
        if (!isCancelled) setResults(data.content);
      })
      .catch(() => {
        if (!isCancelled) setResults([]);
      })
      .finally(() => {
        if (!isCancelled) setIsSearching(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [query]);

  function handleAdd(product) {
    if (products.some((p) => p.productId === product.id)) return;
    onChange([
      ...products,
      {
        productId: product.id,
        name: product.name,
        badge: '',
        recommendation: '',
        bestFor: '',
        mainStrength: '',
        mainWeakness: '',
        pros: '',
        cons: '',
        editorsScore: '',
      },
    ]);
    setQuery('');
  }

  function handleRemove(productId) {
    onChange(products.filter((p) => p.productId !== productId));
  }

  function handleMoveUp(index) {
    if (index === 0) return;
    const next = [...products];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function handleMoveDown(index) {
    if (index === products.length - 1) return;
    const next = [...products];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  function handleFieldChange(index, field, value) {
    const next = [...products];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  }

  return (
    <div>
      <label htmlFor="productSearch" className="mb-1 block text-sm font-medium text-slate-700">
        Compared Products
      </label>
      <input
        id="productSearch"
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search products to add..."
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {isSearching && <p className="mt-1 text-sm text-slate-400">Searching...</p>}
      {!isSearching && results.length > 0 && (
        <ul className="mt-1 rounded-md border border-slate-200 bg-white shadow-sm">
          {results.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => handleAdd(product)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {product.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {fieldErrors.products && <p className="mt-1 text-sm text-red-600">{fieldErrors.products}</p>}

      <ul className="mt-4 space-y-4">
        {products.map((product, index) => (
          <li key={product.productId} className="rounded-md border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">{product.name}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  aria-label={`Move ${product.name} up`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === products.length - 1}
                  aria-label={`Move ${product.name} down`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(product.productId)}
                  aria-label={`Remove ${product.name}`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor={`badge-${product.productId}`} className="mb-1 block text-xs font-medium text-slate-700">
                  Badge
                </label>
                <input
                  id={`badge-${product.productId}`}
                  type="text"
                  value={product.badge}
                  onChange={(event) => handleFieldChange(index, 'badge', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor={`editorsScore-${product.productId}`} className="mb-1 block text-xs font-medium text-slate-700">
                  Editor's Score
                </label>
                <input
                  id={`editorsScore-${product.productId}`}
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={product.editorsScore}
                  onChange={(event) => handleFieldChange(index, 'editorsScore', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`recommendation-${product.productId}`} className="mb-1 block text-xs font-medium text-slate-700">
                  Recommendation
                </label>
                <input
                  id={`recommendation-${product.productId}`}
                  type="text"
                  value={product.recommendation}
                  onChange={(event) => handleFieldChange(index, 'recommendation', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor={`bestFor-${product.productId}`} className="mb-1 block text-xs font-medium text-slate-700">
                  Best For
                </label>
                <input
                  id={`bestFor-${product.productId}`}
                  type="text"
                  value={product.bestFor}
                  onChange={(event) => handleFieldChange(index, 'bestFor', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor={`mainStrength-${product.productId}`} className="mb-1 block text-xs font-medium text-slate-700">
                  Main Strength
                </label>
                <input
                  id={`mainStrength-${product.productId}`}
                  type="text"
                  value={product.mainStrength}
                  onChange={(event) => handleFieldChange(index, 'mainStrength', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor={`mainWeakness-${product.productId}`} className="mb-1 block text-xs font-medium text-slate-700">
                  Main Weakness
                </label>
                <input
                  id={`mainWeakness-${product.productId}`}
                  type="text"
                  value={product.mainWeakness}
                  onChange={(event) => handleFieldChange(index, 'mainWeakness', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor={`pros-${product.productId}`} className="mb-1 block text-xs font-medium text-slate-700">
                  Pros
                </label>
                <textarea
                  id={`pros-${product.productId}`}
                  rows={2}
                  value={product.pros}
                  onChange={(event) => handleFieldChange(index, 'pros', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor={`cons-${product.productId}`} className="mb-1 block text-xs font-medium text-slate-700">
                  Cons
                </label>
                <textarea
                  id={`cons-${product.productId}`}
                  rows={2}
                  value={product.cons}
                  onChange={(event) => handleFieldChange(index, 'cons', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            {fieldErrors[`product-${index}-prosCons`] && (
              <p className="mt-2 text-sm text-red-600">{fieldErrors[`product-${index}-prosCons`]}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ProductsTab;
```

- [ ] **Step 5: Create `comparison-form/SpecTableTab.jsx`**

```jsx
import { Plus, Trash2 } from 'lucide-react';

const TIER_OPTIONS = ['BEST', 'GOOD', 'STANDARD'];

function SpecTableTab({ specRows, onChange, products }) {
  function handleAddRow() {
    onChange([
      ...specRows,
      {
        groupLabel: '',
        rowLabel: '',
        values: products.map((product) => ({ productId: product.productId, value: '', tier: 'STANDARD' })),
      },
    ]);
  }

  function handleRemoveRow(index) {
    onChange(specRows.filter((_, i) => i !== index));
  }

  function handleRowFieldChange(index, field, value) {
    const next = [...specRows];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  }

  function handleValueChange(rowIndex, productId, field, value) {
    const next = [...specRows];
    const row = next[rowIndex];
    const nextValues = row.values.map((v) => (v.productId === productId ? { ...v, [field]: value } : v));
    next[rowIndex] = { ...row, values: nextValues };
    onChange(next);
  }

  if (products.length === 0) {
    return <p className="text-sm text-slate-500">Add products in the Products tab before building the spec table.</p>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleAddRow}
        className="mb-4 flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        <Plus size={16} />
        Add Row
      </button>

      <div className="space-y-4">
        {specRows.map((row, rowIndex) => (
          <div key={rowIndex} className="rounded-md border border-slate-200 p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={`groupLabel-${rowIndex}`} className="mb-1 block text-xs font-medium text-slate-700">
                    Group Label
                  </label>
                  <input
                    id={`groupLabel-${rowIndex}`}
                    type="text"
                    value={row.groupLabel}
                    onChange={(event) => handleRowFieldChange(rowIndex, 'groupLabel', event.target.value)}
                    placeholder="e.g. Performance"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label htmlFor={`rowLabel-${rowIndex}`} className="mb-1 block text-xs font-medium text-slate-700">
                    Row Label
                  </label>
                  <input
                    id={`rowLabel-${rowIndex}`}
                    type="text"
                    value={row.rowLabel}
                    onChange={(event) => handleRowFieldChange(rowIndex, 'rowLabel', event.target.value)}
                    placeholder="e.g. Battery Life"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveRow(rowIndex)}
                aria-label={`Remove row ${row.rowLabel || rowIndex + 1}`}
                className="mt-6 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {products.map((product) => {
                const value = row.values.find((v) => v.productId === product.productId) ?? {
                  value: '',
                  tier: 'STANDARD',
                };
                return (
                  <div key={product.productId} className="flex items-end gap-2">
                    <div className="flex-1">
                      <label
                        htmlFor={`value-${rowIndex}-${product.productId}`}
                        className="mb-1 block text-xs font-medium text-slate-700"
                      >
                        {product.name}
                      </label>
                      <input
                        id={`value-${rowIndex}-${product.productId}`}
                        type="text"
                        value={value.value}
                        onChange={(event) =>
                          handleValueChange(rowIndex, product.productId, 'value', event.target.value)
                        }
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <select
                      aria-label={`${product.name} tier`}
                      value={value.tier}
                      onChange={(event) => handleValueChange(rowIndex, product.productId, 'tier', event.target.value)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {TIER_OPTIONS.map((tier) => (
                        <option key={tier} value={tier}>
                          {tier}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SpecTableTab;
```

- [ ] **Step 6: Create `comparison-form/SectionsTab.jsx`**

```jsx
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

function SectionsTab({ sections, onChange }) {
  function handleAdd() {
    onChange([...sections, { heading: '', body: '' }]);
  }

  function handleRemove(index) {
    onChange(sections.filter((_, i) => i !== index));
  }

  function handleFieldChange(index, field, value) {
    const next = [...sections];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  }

  function handleMoveUp(index) {
    if (index === 0) return;
    const next = [...sections];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function handleMoveDown(index) {
    if (index === sections.length - 1) return;
    const next = [...sections];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleAdd}
        className="mb-4 flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        <Plus size={16} />
        Add Section
      </button>

      <div className="space-y-4">
        {sections.map((section, index) => (
          <div key={index} className="rounded-md border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">Section {index + 1}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  aria-label={`Move section ${index + 1} up`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === sections.length - 1}
                  aria-label={`Move section ${index + 1} down`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  aria-label={`Remove section ${index + 1}`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="mb-3">
              <label htmlFor={`heading-${index}`} className="mb-1 block text-xs font-medium text-slate-700">
                Heading
              </label>
              <input
                id={`heading-${index}`}
                type="text"
                value={section.heading}
                onChange={(event) => handleFieldChange(index, 'heading', event.target.value)}
                placeholder="e.g. Buying Tips"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor={`body-${index}`} className="mb-1 block text-xs font-medium text-slate-700">
                Body
              </label>
              <textarea
                id={`body-${index}`}
                rows={4}
                value={section.body}
                onChange={(event) => handleFieldChange(index, 'body', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SectionsTab;
```

- [ ] **Step 7: Create `comparison-form/FaqTab.jsx`**

```jsx
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

function FaqTab({ faqs, onChange }) {
  function handleAdd() {
    onChange([...faqs, { question: '', answer: '' }]);
  }

  function handleRemove(index) {
    onChange(faqs.filter((_, i) => i !== index));
  }

  function handleFieldChange(index, field, value) {
    const next = [...faqs];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
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

  return (
    <div>
      <button
        type="button"
        onClick={handleAdd}
        className="mb-4 flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        <Plus size={16} />
        Add FAQ
      </button>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div key={index} className="rounded-md border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">FAQ {index + 1}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  aria-label={`Move FAQ ${index + 1} up`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === faqs.length - 1}
                  aria-label={`Move FAQ ${index + 1} down`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  aria-label={`Remove FAQ ${index + 1}`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="mb-3">
              <label htmlFor={`question-${index}`} className="mb-1 block text-xs font-medium text-slate-700">
                Question
              </label>
              <input
                id={`question-${index}`}
                type="text"
                value={faq.question}
                onChange={(event) => handleFieldChange(index, 'question', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor={`answer-${index}`} className="mb-1 block text-xs font-medium text-slate-700">
                Answer
              </label>
              <textarea
                id={`answer-${index}`}
                rows={3}
                value={faq.answer}
                onChange={(event) => handleFieldChange(index, 'answer', event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FaqTab;
```

- [ ] **Step 8: Create `comparison-form/RelatedTab.jsx`**

```jsx
import ProductPicker from '../ProductPicker.jsx';
import ComparisonPicker from '../ComparisonPicker.jsx';

function RelatedTab({
  relatedProducts,
  onRelatedProductsChange,
  relatedComparisons,
  onRelatedComparisonsChange,
  excludeComparisonId,
}) {
  return (
    <div className="space-y-8">
      <ProductPicker selectedProducts={relatedProducts} onChange={onRelatedProductsChange} label="Related Products" />
      <ComparisonPicker
        selectedComparisons={relatedComparisons}
        onChange={onRelatedComparisonsChange}
        excludeId={excludeComparisonId}
      />
    </div>
  );
}

export default RelatedTab;
```

- [ ] **Step 9: Create `ComparisonForm.jsx`**

```jsx
import { useState } from 'react';
import BasicInfoTab from './comparison-form/BasicInfoTab.jsx';
import ProductsTab from './comparison-form/ProductsTab.jsx';
import SpecTableTab from './comparison-form/SpecTableTab.jsx';
import SectionsTab from './comparison-form/SectionsTab.jsx';
import FaqTab from './comparison-form/FaqTab.jsx';
import RelatedTab from './comparison-form/RelatedTab.jsx';

const TABS = [
  { key: 'basic', label: 'Basic Info' },
  { key: 'products', label: 'Products' },
  { key: 'spec', label: 'Spec Table' },
  { key: 'sections', label: 'Sections' },
  { key: 'faq', label: 'FAQ' },
  { key: 'related', label: 'Related' },
];

function tabHasError(tabKey, fieldErrors) {
  if (tabKey === 'basic') {
    return Boolean(fieldErrors.title || fieldErrors.description || fieldErrors.categoryId || fieldErrors.slug);
  }
  if (tabKey === 'products') {
    return Boolean(fieldErrors.products) || Object.keys(fieldErrors).some((key) => key.startsWith('product-'));
  }
  if (tabKey === 'related') {
    return Boolean(fieldErrors.relatedComparisons || fieldErrors.relatedProducts);
  }
  return false;
}

function mapProductsFromResponse(comparisonProducts) {
  return (comparisonProducts ?? []).map((cp) => ({
    productId: cp.product.id,
    name: cp.product.name,
    badge: cp.badge ?? '',
    recommendation: cp.recommendation ?? '',
    bestFor: cp.bestFor ?? '',
    mainStrength: cp.mainStrength ?? '',
    mainWeakness: cp.mainWeakness ?? '',
    pros: cp.pros ?? '',
    cons: cp.cons ?? '',
    editorsScore: cp.editorsScore !== null && cp.editorsScore !== undefined ? String(cp.editorsScore) : '',
  }));
}

function mapSpecRowsFromResponse(comparisonSpecRows) {
  return (comparisonSpecRows ?? []).map((row) => ({
    groupLabel: row.groupLabel,
    rowLabel: row.rowLabel,
    values: row.values.map((v) => ({ productId: v.productId, value: v.value, tier: v.tier })),
  }));
}

function mapSectionsFromResponse(comparisonSections) {
  return (comparisonSections ?? []).map((s) => ({ heading: s.heading, body: s.body }));
}

function mapFaqsFromResponse(comparisonFaqs) {
  return (comparisonFaqs ?? []).map((f) => ({ question: f.question, answer: f.answer }));
}

function ComparisonForm({ comparison, categories, onSubmit, onCancel }) {
  const [activeTab, setActiveTab] = useState('basic');
  const [basicInfo, setBasicInfo] = useState({
    title: comparison?.title ?? '',
    slug: comparison?.slug ?? '',
    description: comparison?.description ?? '',
    coverImageFilename: comparison?.coverImageFilename ?? null,
    categoryId: comparison?.categoryId !== undefined ? String(comparison.categoryId) : '',
    seoTitle: comparison?.seoTitle ?? '',
    seoDescription: comparison?.seoDescription ?? '',
    published: comparison?.published ?? true,
  });
  const [products, setProducts] = useState(mapProductsFromResponse(comparison?.products));
  const [specRows, setSpecRows] = useState(mapSpecRowsFromResponse(comparison?.specRows));
  const [sections, setSections] = useState(mapSectionsFromResponse(comparison?.sections));
  const [faqs, setFaqs] = useState(mapFaqsFromResponse(comparison?.faqs));
  const [relatedComparisons, setRelatedComparisons] = useState(comparison?.relatedComparisons ?? []);
  const [relatedProducts, setRelatedProducts] = useState(comparison?.relatedProducts ?? []);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleBasicInfoChange(field, value) {
    setBasicInfo((prev) => ({ ...prev, [field]: value }));
  }

  function handleProductsChange(newProducts) {
    setProducts(newProducts);
    setSpecRows((prevRows) =>
      prevRows.map((row) => {
        const existingByProductId = new Map(row.values.map((v) => [v.productId, v]));
        const nextValues = newProducts.map(
          (p) => existingByProductId.get(p.productId) ?? { productId: p.productId, value: '', tier: 'STANDARD' }
        );
        return { ...row, values: nextValues };
      })
    );
  }

  function validate() {
    const errors = {};
    if (!basicInfo.title.trim()) errors.title = 'Title is required.';
    if (!basicInfo.description.trim()) errors.description = 'Description is required.';
    if (!basicInfo.categoryId) errors.categoryId = 'Category is required.';
    if (basicInfo.slug.trim() && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(basicInfo.slug.trim())) {
      errors.slug = 'Slug must be lowercase letters, numbers, and hyphens only.';
    }
    if (products.length < 2) {
      errors.products = 'A comparison must include at least 2 products.';
    }
    products.forEach((product, index) => {
      const prosBlank = !product.pros.trim();
      const consBlank = !product.cons.trim();
      if (prosBlank !== consBlank) {
        errors[`product-${index}-prosCons`] = 'Pros and cons must both be provided, or both left blank.';
      }
    });
    if (relatedComparisons.length > 8) {
      errors.relatedComparisons = 'You can select at most 8 related comparisons.';
    }
    if (relatedProducts.length > 8) {
      errors.relatedProducts = 'You can select at most 8 related products.';
    }
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstErrorTab = TABS.map((tab) => tab.key).find((tabKey) => tabHasError(tabKey, errors));
      if (firstErrorTab) setActiveTab(firstErrorTab);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: basicInfo.title.trim(),
        slug: basicInfo.slug.trim(),
        description: basicInfo.description.trim(),
        coverImageFilename: basicInfo.coverImageFilename,
        categoryId: Number(basicInfo.categoryId),
        seoTitle: basicInfo.seoTitle.trim() || null,
        seoDescription: basicInfo.seoDescription.trim() || null,
        published: basicInfo.published,
        products: products.map((p) => ({
          productId: p.productId,
          badge: p.badge.trim() || null,
          recommendation: p.recommendation.trim(),
          bestFor: p.bestFor.trim(),
          mainStrength: p.mainStrength.trim(),
          mainWeakness: p.mainWeakness.trim(),
          pros: p.pros.trim() || null,
          cons: p.cons.trim() || null,
          editorsScore: p.editorsScore === '' ? null : Number(p.editorsScore),
        })),
        specRows: specRows.map((row) => ({
          groupLabel: row.groupLabel.trim(),
          rowLabel: row.rowLabel.trim(),
          values: row.values.map((v) => ({ productId: v.productId, value: v.value.trim(), tier: v.tier })),
        })),
        sections: sections.map((s) => ({ heading: s.heading.trim(), body: s.body.trim() })),
        faqs: faqs.map((f) => ({ question: f.question.trim(), answer: f.answer.trim() })),
        relatedComparisonIds: relatedComparisons.map((c) => c.id),
        relatedProductIds: relatedProducts.map((p) => p.id),
      });
    } catch (error) {
      setFieldErrors(error.fieldErrors ?? {});
      if (!error.fieldErrors) {
        setFormError(error.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {formError && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}

      <div className="mb-6 border-b border-slate-200">
        <nav className="flex flex-wrap gap-1" aria-label="Comparison form sections">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              aria-current={activeTab === tab.key ? 'true' : undefined}
              className={`rounded-t-md px-4 py-2 text-sm font-medium ${
                activeTab === tab.key
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {tabHasError(tab.key, fieldErrors) && (
                <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-red-500" aria-label="Has errors" />
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="mb-6">
        {activeTab === 'basic' && (
          <BasicInfoTab
            values={basicInfo}
            onChange={handleBasicInfoChange}
            categories={categories}
            fieldErrors={fieldErrors}
          />
        )}
        {activeTab === 'products' && (
          <ProductsTab products={products} onChange={handleProductsChange} fieldErrors={fieldErrors} />
        )}
        {activeTab === 'spec' && <SpecTableTab specRows={specRows} onChange={setSpecRows} products={products} />}
        {activeTab === 'sections' && <SectionsTab sections={sections} onChange={setSections} />}
        {activeTab === 'faq' && <FaqTab faqs={faqs} onChange={setFaqs} />}
        {activeTab === 'related' && (
          <RelatedTab
            relatedProducts={relatedProducts}
            onRelatedProductsChange={setRelatedProducts}
            relatedComparisons={relatedComparisons}
            onRelatedComparisonsChange={setRelatedComparisons}
            excludeComparisonId={comparison?.id ?? null}
          />
        )}
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : comparison ? 'Save Changes' : 'Add Comparison'}
        </button>
      </div>
    </form>
  );
}

export default ComparisonForm;
```

- [ ] **Step 10: Run the test to verify it passes**

Run: `cd frontend && npm test -- ComparisonForm.test.jsx`
Expected: PASS (11 tests)

- [ ] **Step 11: Run the full frontend suite**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus these 11.

- [ ] **Step 12: Commit**

```bash
git add frontend/src/components/comparison-form/BasicInfoTab.jsx \
        frontend/src/components/comparison-form/ProductsTab.jsx \
        frontend/src/components/comparison-form/SpecTableTab.jsx \
        frontend/src/components/comparison-form/SectionsTab.jsx \
        frontend/src/components/comparison-form/FaqTab.jsx \
        frontend/src/components/comparison-form/RelatedTab.jsx \
        frontend/src/components/ComparisonForm.jsx \
        frontend/src/components/ComparisonForm.test.jsx
git commit -m "feat: add ComparisonForm with tabbed authoring UI"
```

---

### Task 5: `ComparisonFormPage`

**Files:**
- Create: `frontend/src/pages/admin/ComparisonFormPage.jsx`
- Test: `frontend/src/pages/admin/ComparisonFormPage.test.jsx`

**Interfaces:**
- Consumes: `ComparisonForm` (Task 4), `getComparisonById`/`createComparison`/`updateComparison` (Task 1), `getCategories` from `adminCategoryService.js` (existing).
- Produces: `ComparisonFormPage()` (default export, no props, reads `:id` via `useParams()`). Used by Task 7 (route wiring).

`ComparisonForm.test.jsx` (Task 4) already thoroughly covers the submit-payload-shape and validation behavior, so this page's tests focus on page-specific concerns only: routing/loading wiring, not re-verifying the full form-fill-and-submit flow.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/pages/admin/ComparisonFormPage.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ComparisonFormPage from './ComparisonFormPage.jsx';
import { ToastProvider } from '../../context/ToastContext.jsx';
import * as adminComparisonService from '../../services/adminComparisonService.js';
import * as adminCategoryService from '../../services/adminCategoryService.js';

function renderPage(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <Routes>
          <Route path="/admin/comparisons/new" element={<ComparisonFormPage />} />
          <Route path="/admin/comparisons/:id" element={<ComparisonFormPage />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('ComparisonFormPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminCategoryService, 'getCategories').mockResolvedValue([
      { id: 1, productCategoryName: 'Electronics' },
    ]);
  });

  it('renders the create form with an empty title', () => {
    renderPage(['/admin/comparisons/new']);
    expect(screen.getByRole('heading', { name: 'Add Comparison' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('');
  });

  it('loads and pre-fills the edit form', async () => {
    vi.spyOn(adminComparisonService, 'getComparisonById').mockResolvedValue({
      id: 7,
      title: 'Existing Comparison',
      slug: 'existing-comparison',
      description: 'Existing description.',
      coverImageFilename: null,
      categoryId: 1,
      seoTitle: '',
      seoDescription: '',
      published: true,
      products: [],
      specRows: [],
      sections: [],
      faqs: [],
      relatedComparisons: [],
      relatedProducts: [],
    });
    renderPage(['/admin/comparisons/7']);

    expect(await screen.findByRole('heading', { name: 'Edit Comparison' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Existing Comparison');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- ComparisonFormPage.test.jsx`
Expected: FAIL — `ComparisonFormPage.jsx` does not exist yet.

- [ ] **Step 3: Create `ComparisonFormPage.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ComparisonForm from '../../components/ComparisonForm.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { useToast } from '../../hooks/useToast.js';
import { getComparisonById, createComparison, updateComparison } from '../../services/adminComparisonService.js';
import { getCategories } from '../../services/adminCategoryService.js';

function ComparisonFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEditMode = Boolean(id);

  const [comparison, setComparison] = useState(null);
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
    getComparisonById(id)
      .then(setComparison)
      .catch((err) => setError(err.message ?? 'Failed to load comparison.'))
      .finally(() => setIsLoading(false));
  }, [id, isEditMode]);

  async function handleSubmit(payload) {
    if (isEditMode) {
      await updateComparison(id, payload);
      showToast('Comparison updated successfully.');
    } else {
      await createComparison(payload);
      showToast('Comparison created successfully.');
    }
    navigate('/admin/comparisons');
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        {isEditMode ? 'Edit Comparison' : 'Add Comparison'}
      </h1>

      {isLoading ? (
        <LoadingSpinner label="Loading comparison..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <ComparisonForm
          comparison={comparison}
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/admin/comparisons')}
        />
      )}
    </div>
  );
}

export default ComparisonFormPage;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- ComparisonFormPage.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the full frontend suite**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus these 2.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/admin/ComparisonFormPage.jsx frontend/src/pages/admin/ComparisonFormPage.test.jsx
git commit -m "feat: add admin ComparisonFormPage"
```

---

### Task 6: `ComparisonsPage` (admin list)

**Files:**
- Create: `frontend/src/pages/admin/ComparisonsPage.jsx`
- Test: `frontend/src/pages/admin/ComparisonsPage.test.jsx`

**Interfaces:**
- Consumes: `getComparisons`/`deleteComparison` (Task 1), `DataTable`/`ConfirmDialog`/`ErrorState`/`EmptyState` (existing).
- Produces: `ComparisonsPage()` (default export, no props). Used by Task 7 (route wiring).

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/pages/admin/ComparisonsPage.test.jsx`:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ComparisonsPage from './ComparisonsPage.jsx';
import { ToastProvider } from '../../context/ToastContext.jsx';
import * as adminComparisonService from '../../services/adminComparisonService.js';

const comparison = {
  id: 1,
  title: 'Best Portable Blenders Compared',
  categoryName: 'Kitchen',
  coverImageFilename: null,
  published: true,
  createdAt: '2026-07-20T10:00:00',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ComparisonsPage />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('ComparisonsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the list of comparisons', async () => {
    vi.spyOn(adminComparisonService, 'getComparisons').mockResolvedValue([comparison]);
    renderPage();

    expect(await screen.findByText('Best Portable Blenders Compared')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('shows an empty state when there are no comparisons', async () => {
    vi.spyOn(adminComparisonService, 'getComparisons').mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('No comparisons found')).toBeInTheDocument();
  });

  it('deletes a comparison via the confirm dialog', async () => {
    vi.spyOn(adminComparisonService, 'getComparisons').mockResolvedValue([comparison]);
    vi.spyOn(adminComparisonService, 'deleteComparison').mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Best Portable Blenders Compared');
    await user.click(screen.getByRole('button', { name: 'Delete Best Portable Blenders Compared' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(adminComparisonService.deleteComparison).toHaveBeenCalledWith(1));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- ComparisonsPage.test.jsx`
Expected: FAIL — `ComparisonsPage.jsx` does not exist yet.

- [ ] **Step 3: Create `ComparisonsPage.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, GitCompare } from 'lucide-react';
import DataTable from '../../components/DataTable.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';
import { useToast } from '../../hooks/useToast.js';
import { getComparisons, deleteComparison } from '../../services/adminComparisonService.js';

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function ComparisonsPage() {
  const { showToast } = useToast();
  const [comparisons, setComparisons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function loadComparisons() {
    setIsLoading(true);
    setError(null);
    getComparisons()
      .then(setComparisons)
      .catch((err) => setError(err.message ?? 'Failed to load comparisons.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    // loadComparisons resets loading/error state synchronously before fetching; this is
    // the standard reset-before-async-work pattern and can't cascade since neither value
    // is a dependency of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadComparisons();
  }, []);

  async function handleDeleteConfirm() {
    setIsDeleting(true);
    try {
      await deleteComparison(deleteTarget.id);
      showToast('Comparison deleted successfully.');
      setDeleteTarget(null);
      loadComparisons();
    } catch (err) {
      showToast(err.message ?? 'Failed to delete comparison.', 'error');
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  const columns = [
    {
      key: 'coverImageFilename',
      label: 'Cover',
      render: (row) => {
        const url = getImageUrl(row.coverImageFilename);
        return url ? (
          <img src={url} alt={row.title} className="h-12 w-12 rounded-md object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100">
            <GitCompare className="h-5 w-5 text-slate-300" />
          </div>
        );
      },
    },
    { key: 'title', label: 'Title' },
    { key: 'categoryName', label: 'Category' },
    {
      key: 'published',
      label: 'Status',
      render: (row) => (
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            row.published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {row.published ? 'Published' : 'Draft'}
        </span>
      ),
    },
    { key: 'createdAt', label: 'Created', render: (row) => formatDate(row.createdAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <Link
            to={`/admin/comparisons/${row.id}`}
            aria-label={`Edit ${row.title}`}
            className="inline-flex rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
          >
            <Pencil size={16} />
          </Link>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.title}`}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Comparisons</h1>
        <Link
          to="/admin/comparisons/new"
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} />
          Add Comparison
        </Link>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadComparisons} />
      ) : (
        <DataTable
          columns={columns}
          rows={comparisons}
          isLoading={isLoading}
          emptyState={
            <EmptyState title="No comparisons found" description="Add your first comparison to get started." />
          }
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Comparison"
        message={deleteTarget ? `This will permanently delete "${deleteTarget.title}".` : ''}
        confirmLabel="Delete"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default ComparisonsPage;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- ComparisonsPage.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the full frontend suite**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus these 3.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/admin/ComparisonsPage.jsx frontend/src/pages/admin/ComparisonsPage.test.jsx
git commit -m "feat: add admin ComparisonsPage list"
```

---

### Task 7: Wire admin routes and `AdminSidebar` link

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/AdminSidebar.jsx`

**Interfaces:**
- Consumes: `ComparisonsPage` (Task 6), `ComparisonFormPage` (Task 5).
- Produces: `/admin/comparisons`, `/admin/comparisons/new`, `/admin/comparisons/:id` routes, plus the sidebar entry. No dedicated test — covered by Tasks 5/6's own tests plus this task's full-suite verification, matching how routing wiring was handled in every prior stage.

- [ ] **Step 1: Modify `App.jsx`**

Add the imports (alongside the other admin page imports):

```jsx
import ComparisonsPage from './pages/admin/ComparisonsPage.jsx';
import ComparisonFormPage from './pages/admin/ComparisonFormPage.jsx';
```

Add the three routes (inside the existing `AdminLayout` route group, after `/admin/buying-guides/:id`):

```jsx
                    <Route path="/admin/buying-guides/:id" element={<BuyingGuideFormPage />} />
                    <Route path="/admin/comparisons" element={<ComparisonsPage />} />
                    <Route path="/admin/comparisons/new" element={<ComparisonFormPage />} />
                    <Route path="/admin/comparisons/:id" element={<ComparisonFormPage />} />
```

- [ ] **Step 2: Modify `AdminSidebar.jsx`**

Add `GitCompare` to the `lucide-react` import and add a new entry to `NAV_ITEMS` (after "Buying Guides", before "System Settings"):

```jsx
import { LayoutDashboard, Package, Tags, BookOpen, GitCompare, Settings, LogOut } from 'lucide-react';
```

```jsx
const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Product Categories', icon: Tags },
  { to: '/admin/buying-guides', label: 'Buying Guides', icon: BookOpen },
  { to: '/admin/comparisons', label: 'Comparisons', icon: GitCompare },
  { to: '/admin/settings', label: 'System Settings', icon: Settings },
];
```

- [ ] **Step 3: Run the full frontend suite to confirm no regressions**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus all tests from Tasks 2 through 6.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx frontend/src/components/AdminSidebar.jsx
git commit -m "feat: wire admin comparison routes and sidebar link"
```

---

### Task 8: Final verification

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything from Tasks 1-7
- Produces: nothing further downstream — this stage's final gate.

- [ ] **Step 1: Run the entire frontend test suite**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus all tests from Tasks 2 through 6.

- [ ] **Step 2: Run frontend lint**

Run: `cd frontend && npm run lint`
Expected: clean (0 errors, 0 warnings). If lint flags something unanticipated (e.g. an exhaustive-deps warning), apply the established pattern from prior stages: a one-line `eslint-disable-next-line` with justification only if the rule is genuinely a false positive for that effect's shape — never add one preemptively where lint doesn't actually flag it.

- [ ] **Step 3: Run the frontend production build**

Run: `cd frontend && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 4: Manual smoke check against the live backend**

Requires the backend dev server running (Stage 1's admin/public comparison endpoints). If it's not already running: `cd backend && set -a && source .env && set +a && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && java -jar target/backend-0.1.0.jar` (rebuild first with `mvn clean package -DskipTests` if `target/backend-0.1.0.jar` is stale). Restart it if it was already running before this stage's work, per the established stale-server gotcha from prior stages — though since Stage 2 is frontend-only, no schema/backend changes exist to make this necessary here; a running Stage-1 backend is sufficient as-is.

Using the frontend dev server (`npm run dev`) and a browser: confirm an admin can create a comparison — fill in Basic Info, add 2+ products with editorial fields, add a spec table row and confirm columns match the products, add a section and an FAQ, add a related product and a related comparison, publish, and save; confirm the new comparison appears in the admin list with the correct status badge; confirm editing it loads and preserves everything across all tabs; confirm deleting it removes it from the list; confirm the "Comparisons" link appears in the admin sidebar.

- [ ] **Step 5: Commit (if the smoke check surfaced any fixes)**

If Step 4 found nothing to fix, there is nothing to commit for this task — Task 7's commit is the final commit of this stage. If it did surface a small fix, apply it, re-run Steps 1-3, and commit:
```bash
git add -A
git commit -m "fix: address issue found during Comparisons admin UI manual smoke check"
```

---

## Stage 2 Completion

After Task 8, use the `superpowers:finishing-a-development-branch` skill: run the full frontend suite one more time, then present the merge/push/keep-local choice — matching how every prior stage in this project ended.

Stages 3-4 (public Comparison page rendering, SEO + UX/performance polish) are separate plans, each starting with its own brainstorm→spec→plan cycle once this stage is merged/pushed.

