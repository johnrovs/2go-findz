# Products Management Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Products Management page to match the reference image (colors, spacing, table, badges, buttons, pagination) while preserving every existing behavior, plus add a `StatusBadge` component, a "Sort by" preset dropdown, and a rows-per-page selector.

**Architecture:** `AdminSidebar`/`AdminTopbar` are untouched. `ProductsPage.jsx` is restyled and gains new controls backed by two small additive changes to shared components (`DataTable.jsx` gets an optional header-class override, `Pagination.jsx` gets an optional summary line) plus two new hook capabilities (`pageSize`, `setSort`) in `useAdminProductSearch.js`.

**Tech Stack:** React, Tailwind CSS, react-router-dom (`useSearchParams`), lucide-react.

## Global Constraints

- Every existing behavior (search, category/type/status filter, column-click sort, add/edit/delete) keeps working exactly as today — this is a restyle plus additions, not a rebuild.
- Status badges: show every applicable badge per row (Trending/Best Seller/Scheduled can co-occur); never collapse to one badge per row.
- Badge wording stays "Inactive" (not "Draft") on this page, matching the existing Status filter's own wording; a new "Published" badge (blue) fills the previously-blank case (active, no other flags).
- Admin avatar stays the initial-letter circle convention (no photo upload feature exists or is being added).
- The new "Sort by" dropdown and the existing sortable column headers write to the same `sortKey`/`sortDirection` URL params — both must always agree.
- Rows-per-page options: 10, 20, 50. Default stays 20 (unchanged from today).
- `DataTable.jsx` and `Pagination.jsx` changes must be additive/optional-prop-only — every other page using them keeps its current appearance with zero code changes.
- Spec reference: `docs/superpowers/specs/2026-08-14-products-page-redesign-design.md`.

---

### Task 1: `StatusBadge` component

**Files:**
- Create: `frontend/src/components/StatusBadge.jsx`
- Test: `frontend/src/components/StatusBadge.test.jsx`

**Interfaces:**
- Produces: default-exported `StatusBadge({ variant, children })` — `variant: 'trending' | 'bestSeller' | 'scheduled' | 'published' | 'inactive'`. Consumed by Task 6.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/StatusBadge.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StatusBadge from './StatusBadge.jsx';

describe('StatusBadge', () => {
  it('renders trending with the warning color classes', () => {
    render(<StatusBadge variant="trending">Trending</StatusBadge>);
    expect(screen.getByText('Trending')).toHaveClass('text-warning');
  });

  it('renders bestSeller with the success color classes', () => {
    render(<StatusBadge variant="bestSeller">Best Seller</StatusBadge>);
    expect(screen.getByText('Best Seller')).toHaveClass('text-success');
  });

  it('renders scheduled and published with the info color classes', () => {
    render(<StatusBadge variant="scheduled">Scheduled</StatusBadge>);
    expect(screen.getByText('Scheduled')).toHaveClass('text-info');

    render(<StatusBadge variant="published">Published</StatusBadge>);
    expect(screen.getByText('Published')).toHaveClass('text-info');
  });

  it('renders inactive with the muted color classes', () => {
    render(<StatusBadge variant="inactive">Inactive</StatusBadge>);
    expect(screen.getByText('Inactive')).toHaveClass('text-muted');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `frontend/`): `npm test -- StatusBadge`
Expected: FAIL — `src/components/StatusBadge.jsx` does not exist.

- [ ] **Step 3: Implement**

Create `frontend/src/components/StatusBadge.jsx`:

```jsx
const VARIANTS = {
  trending: 'bg-warning/10 text-warning',
  bestSeller: 'bg-success/10 text-success',
  scheduled: 'bg-info/10 text-info',
  published: 'bg-info/10 text-info',
  inactive: 'bg-surface-secondary text-muted',
};

function StatusBadge({ variant, children }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${VARIANTS[variant]}`}>{children}</span>
  );
}

export default StatusBadge;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- StatusBadge`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/StatusBadge.jsx frontend/src/components/StatusBadge.test.jsx
git commit -m "feat(admin-products): add StatusBadge component"
```

---

### Task 2: `Button` `accent` variant

**Files:**
- Modify: `frontend/src/components/Button.jsx`
- Test: `frontend/src/components/Button.test.jsx`

**Interfaces:**
- Produces: `variant="accent"` support on the existing `Button` component. Consumed by Task 6.

- [ ] **Step 1: Check the existing test file, then write the failing test**

Read `frontend/src/components/Button.test.jsx` first to match its existing style exactly (variant tests there already follow a consistent pattern — mirror it rather than inventing a new one). Add a test case alongside the existing variant tests:

```jsx
  it('renders the accent variant with the dashboard-orange background', () => {
    render(<Button variant="accent">Add Product</Button>);
    expect(screen.getByRole('button', { name: 'Add Product' })).toHaveClass('bg-dashboard-orange');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- Button`
Expected: FAIL — `accent` is not a recognized variant, `VARIANT_CLASSES.accent` is `undefined` so the class is missing.

- [ ] **Step 3: Implement**

In `Button.jsx`, add to `VARIANT_CLASSES`:

```js
accent: 'bg-dashboard-orange text-white shadow-card hover:opacity-90',
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- Button`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Button.jsx frontend/src/components/Button.test.jsx
git commit -m "feat(admin-products): add accent Button variant"
```

---

### Task 3: `useAdminProductSearch` — `pageSize` and `setSort`

**Files:**
- Modify: `frontend/src/hooks/useAdminProductSearch.js`
- Test: `frontend/src/pages/admin/ProductsPage.test.jsx` (hook is only exercised indirectly today, through this page — no dedicated hook test file exists; follow that existing convention rather than introducing a new one)

**Interfaces:**
- Produces: `pageSize` (number, from hook), `setPageSize(value)`, `setSort(sortKey, sortDirection)` — all returned from `useAdminProductSearch()`. Consumed by Task 6.

- [ ] **Step 1: Write the failing tests**

Add to `ProductsPage.test.jsx` (alongside the existing `it(...)` blocks, before the final closing `});`):

```jsx
  it('requests a different page size when the rows-per-page control changes', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Wireless Earbuds');

    await user.selectOptions(screen.getByLabelText('Rows per page'), '50');

    await waitFor(() =>
      expect(adminProductService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ size: 50 }))
    );
  });

  it('keeps the sort dropdown and column-click sorting in sync', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Wireless Earbuds');

    await user.selectOptions(screen.getByLabelText('Sort by'), 'productPrice,asc');

    await waitFor(() =>
      expect(adminProductService.searchProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: 'productPrice,asc' })
      )
    );
    expect(screen.getByLabelText('Sort by')).toHaveValue('productPrice,asc');

    await user.click(screen.getByRole('columnheader', { name: /Product/ }).querySelector('button'));

    await waitFor(() =>
      expect(adminProductService.searchProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: 'name,asc' })
      )
    );
    expect(screen.getByLabelText('Sort by')).toHaveValue('name,asc');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- ProductsPage`
Expected: FAIL — no "Rows per page" or "Sort by" labeled controls exist yet in `ProductsPage.jsx` (this task only touches the hook; these two new tests will pass once Task 6 renders the controls that call the hook's new methods — for now, confirm they fail with "Unable to find a label with the text of: Rows per page" / "Sort by", proving the hook alone isn't enough, which is expected — proceed to Task 6 before expecting these two specific tests to go green, but implement the hook here since Task 6 depends on it).

- [ ] **Step 3: Implement the hook changes**

In `useAdminProductSearch.js`, replace the `PAGE_SIZE` constant and its usage:

```js
const DEFAULT_PAGE_SIZE = 20;
```

Replace:

```js
  const page = Number(searchParams.get('page') ?? '1');
```

with:

```js
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('pageSize') ?? DEFAULT_PAGE_SIZE);
```

Replace the `params` object's `size` field:

```js
    const params = {
      page: page - 1,
      size: pageSize,
      sort: `${sortKey},${sortDirection}`,
    };
```

Add `pageSize` to the effect's dependency array:

```js
  }, [search, categoryId, filter, status, sortKey, sortDirection, page, pageSize, refreshIndex]);
```

Add `pageSize` to the returned object and add the two new setters (alongside the existing `setPage`/`onSortChange`):

```js
    pageSize,
    setPageSize: (value) => updateParams({ pageSize: value }),
    setSort: (nextSortKey, nextSortDirection) => updateParams({ sortKey: nextSortKey, sortDirection: nextSortDirection }, { resetPage: false }),
```

- [ ] **Step 4: Commit**

This task's own new tests won't pass until Task 6 wires up the controls that call these hook methods — that's expected for a hook-only task with no UI yet. Verify no *existing* tests broke:

Run: `npm test -- ProductsPage`
Expected: the 8 pre-existing tests still PASS; the 2 new ones (added in Step 1) still FAIL for the reason explained in Step 2 — that's correct at this point in the plan.

```bash
git add frontend/src/hooks/useAdminProductSearch.js frontend/src/pages/admin/ProductsPage.test.jsx
git commit -m "feat(admin-products): add pageSize and setSort to useAdminProductSearch"
```

---

### Task 4: `Pagination` — optional summary line

**Files:**
- Modify: `frontend/src/components/Pagination.jsx`
- Test: `frontend/src/components/Pagination.test.jsx`

**Interfaces:**
- Produces: new optional `summary` prop (string) on `Pagination`. When provided, the summary text renders even if `totalPages <= 1` (previously the whole component returned `null` in that case — the "Showing X–Y of Z products" count needs to stay visible regardless of how many pages exist). Consumed by Task 6.

- [ ] **Step 1: Write the failing tests**

Add to `Pagination.test.jsx` (alongside the existing `it(...)` blocks, before the final closing `});`):

```jsx
  it('renders the summary text even when there is only one page', () => {
    render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} summary="Showing 1–2 of 2 products" />);
    expect(screen.getByText('Showing 1–2 of 2 products')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '1' })).not.toBeInTheDocument();
  });

  it('renders the summary text alongside the page nav when there are multiple pages', () => {
    render(<Pagination page={1} totalPages={3} onPageChange={vi.fn()} summary="Showing 1–20 of 50 products" />);
    expect(screen.getByText('Showing 1–20 of 50 products')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
  });

  it('still renders nothing with no summary and only one page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- Pagination`
Expected: FAIL — the first two new tests fail because `Pagination` returns `null` for `totalPages <= 1` regardless of `summary`, and doesn't render `summary` text at all in the `totalPages > 1` case either (no such prop is read today). The third test already passes (it's the pre-existing early-return behavior) — confirm it still does.

- [ ] **Step 3: Implement**

Replace `Pagination.jsx` in full:

```jsx
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SIBLING_COUNT = 1;

function getPageItems(page, totalPages) {
  const shown = new Set([1, totalPages]);
  for (let i = page - SIBLING_COUNT; i <= page + SIBLING_COUNT; i += 1) {
    if (i >= 1 && i <= totalPages) shown.add(i);
  }
  const sorted = Array.from(shown).sort((a, b) => a - b);

  const items = [];
  let previous = 0;
  sorted.forEach((number) => {
    if (previous && number - previous > 1) {
      items.push({ type: 'ellipsis', key: `ellipsis-${previous}` });
    }
    items.push({ type: 'page', key: number, number });
    previous = number;
  });
  return items;
}

function Pagination({ page, totalPages, onPageChange, activeClassName = 'bg-primary text-white', summary }) {
  const { t } = useTranslation('common');
  const showNav = totalPages > 1;
  if (!showNav && !summary) return null;

  const items = showNav ? getPageItems(page, totalPages) : [];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-8">
      {summary ? <p className="text-small text-muted">{summary}</p> : <span />}
      {showNav && (
        <nav aria-label={t('pagination.navigationAriaLabel')} className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label={t('pagination.previousPageAriaLabel')}
            className="rounded-btn p-2 text-muted hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>

          {items.map((item) =>
            item.type === 'ellipsis' ? (
              <span key={item.key} aria-hidden="true" className="px-1 text-sm text-muted">
                …
              </span>
            ) : (
              <button
                key={item.key}
                type="button"
                onClick={() => onPageChange(item.number)}
                aria-current={item.number === page ? 'page' : undefined}
                className={`h-9 w-9 rounded-btn text-sm font-medium transition ${
                  item.number === page ? activeClassName : 'text-body hover:bg-surface-secondary'
                }`}
              >
                {item.number}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label={t('pagination.nextPageAriaLabel')}
            className="rounded-btn p-2 text-muted hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>
        </nav>
      )}
    </div>
  );
}

export default Pagination;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- Pagination`
Expected: PASS (all 10 tests — the 7 pre-existing plus the 3 new ones).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Pagination.jsx frontend/src/components/Pagination.test.jsx
git commit -m "feat(admin-products): add optional summary line to Pagination"
```

---

### Task 5: `DataTable` — optional header class override and taller rows

**Files:**
- Modify: `frontend/src/components/DataTable.jsx`
- Test: `frontend/src/components/DataTable.test.jsx`

**Interfaces:**
- Produces: new optional `headerClassName` prop on `DataTable` (defaults to `'bg-primary'`, today's exact behavior — every other caller passing no prop is unaffected). Row cells' vertical padding grows from `py-3` to `py-4` for every `DataTable` user (deliberate, matches the spec's "row height grows" requirement globally since every admin table using this component benefits equally). Consumed by Task 6.

- [ ] **Step 1: Check the existing test file, then write the failing test**

Read `frontend/src/components/DataTable.test.jsx` first to match its existing rendering-helper pattern. Add a test case:

```jsx
  it('applies a custom headerClassName when provided, defaulting to bg-primary', () => {
    const { container, rerender } = render(
      <DataTable columns={columns} rows={rows} isLoading={false} emptyState={null} />
    );
    expect(container.querySelector('thead')).toHaveClass('bg-primary');

    rerender(
      <DataTable
        columns={columns}
        rows={rows}
        isLoading={false}
        emptyState={null}
        headerClassName="bg-[linear-gradient(90deg,#5B2CF2_0%,#6D35F5_55%,#5425E8_100%)]"
      />
    );
    expect(container.querySelector('thead')).toHaveClass('bg-[linear-gradient(90deg,#5B2CF2_0%,#6D35F5_55%,#5425E8_100%)]');
    expect(container.querySelector('thead')).not.toHaveClass('bg-primary');
  });
```

(Use whatever `columns`/`rows` fixtures the existing test file already defines at the top — don't redefine them.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- DataTable`
Expected: FAIL — `headerClassName` prop is not read; `<thead>` always has `bg-primary` regardless.

- [ ] **Step 3: Implement**

In `DataTable.jsx`, update the function signature and the `<thead>` className:

```jsx
function DataTable({ columns, rows, sortKey, sortDirection, onSortChange, isLoading, emptyState, headerClassName = 'bg-primary' }) {
```

```jsx
        <thead className={headerClassName}>
```

Change the `<td>` vertical padding:

```jsx
                <td key={column.key} className="px-4 py-4 text-sm text-body">
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- DataTable`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/DataTable.jsx frontend/src/components/DataTable.test.jsx
git commit -m "feat(admin-products): add headerClassName override and taller rows to DataTable"
```

---

### Task 6: Assemble the redesigned `ProductsPage`

**Files:**
- Modify: `frontend/src/pages/admin/ProductsPage.jsx`
- Modify: `frontend/src/pages/admin/ProductsPage.test.jsx`

**Interfaces:**
- Consumes: `StatusBadge` (Task 1), `Button` `accent` variant (Task 2), `pageSize`/`setPageSize`/`setSort` (Task 3), `Pagination`'s `summary` prop (Task 4), `DataTable`'s `headerClassName` prop (Task 5).

- [ ] **Step 1: Replace `ProductsPage.jsx` in full**

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import Button from '../../components/Button.jsx';
import DataTable from '../../components/DataTable.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import FilterDropdown from '../../components/FilterDropdown.jsx';
import Pagination from '../../components/Pagination.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { useToast } from '../../hooks/useToast.js';
import { useAdminProductSearch } from '../../hooks/useAdminProductSearch.js';
import { getImageUrl } from '../../utils/imageUrl.js';
import { deleteProduct } from '../../services/adminProductService.js';
import { getCategories } from '../../services/adminCategoryService.js';

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Products' },
  { value: 'trending', label: 'Trending' },
  { value: 'bestSeller', label: 'Best Sellers' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'createdAt,asc', label: 'Oldest first' },
  { value: 'name,asc', label: 'Name A–Z' },
  { value: 'productPrice,asc', label: 'Price: low to high' },
  { value: 'productPrice,desc', label: 'Price: high to low' },
];

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10' },
  { value: '20', label: '20' },
  { value: '50', label: '50' },
];

const TABLE_HEADER_GRADIENT = 'bg-[linear-gradient(90deg,#5B2CF2_0%,#6D35F5_55%,#5425E8_100%)]';

function ProductsPage() {
  const { showToast } = useToast();
  const productSearch = useAdminProductSearch();
  const [categories, setCategories] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  async function handleDeleteConfirm() {
    setIsDeleting(true);
    try {
      await deleteProduct(deleteTarget.id);
      showToast('Product deactivated successfully.');
      setDeleteTarget(null);
      productSearch.reload();
    } catch (err) {
      showToast(err.message ?? 'Failed to deactivate product.', 'error');
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  function handleClearFilters() {
    productSearch.setSearch('');
    productSearch.setCategoryId('');
    productSearch.setFilter('all');
    productSearch.setStatus('all');
  }

  function handleSortChange(value) {
    const [nextSortKey, nextSortDirection] = value.split(',');
    productSearch.setSort(nextSortKey, nextSortDirection);
  }

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map((category) => ({ value: String(category.id), label: category.productCategoryName })),
  ];

  const columns = [
    {
      key: 'imageFileName',
      label: 'Image',
      render: (row) => {
        const url = getImageUrl(row.imageFileName);
        return url ? (
          <img src={url} alt={row.name} className="h-12 w-12 rounded-md object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100">
            <ImageIcon className="h-5 w-5 text-slate-300" />
          </div>
        );
      },
    },
    { key: 'name', label: 'Product', sortable: true },
    { key: 'categoryName', label: 'Category' },
    { key: 'brand', label: 'Brand', render: (row) => row.brand || '—' },
    {
      key: 'productPrice',
      label: 'Price',
      sortable: true,
      render: (row) => `$${Number(row.productPrice).toFixed(2)}`,
    },
    {
      key: 'badges',
      label: 'Status',
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          {row.trending && <StatusBadge variant="trending">Trending</StatusBadge>}
          {row.bestSeller && <StatusBadge variant="bestSeller">Best Seller</StatusBadge>}
          {row.scheduledPublishAt && <StatusBadge variant="scheduled">Scheduled</StatusBadge>}
          {row.active && !row.trending && !row.bestSeller && !row.scheduledPublishAt && (
            <StatusBadge variant="published">Published</StatusBadge>
          )}
          {!row.active && <StatusBadge variant="inactive">Inactive</StatusBadge>}
        </div>
      ),
    },
    { key: 'createdAt', label: 'Created', sortable: true, render: (row) => formatDate(row.createdAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <Link
            to={`/admin/products/${row.id}`}
            aria-label={`Edit ${row.name}`}
            title="Edit"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-muted hover:border-primary hover:bg-primary/10 hover:text-primary"
          >
            <Pencil size={14} />
          </Link>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.name}`}
            title="Delete"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-muted hover:border-danger hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const rangeStart = productSearch.totalElements === 0 ? 0 : (productSearch.page - 1) * productSearch.pageSize + 1;
  const rangeEnd = Math.min(productSearch.page * productSearch.pageSize, productSearch.totalElements);
  const paginationSummary = `Showing ${rangeStart}–${rangeEnd} of ${productSearch.totalElements} products`;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[46px] font-extrabold leading-tight text-heading">Products</h1>
          <p className="mt-1 text-small text-muted">Manage, organize, and publish products across your storefront.</p>
        </div>
        <Button to="/admin/products/new" variant="accent" size="sm">
          <Plus size={16} />
          Add Product
        </Button>
      </div>

      <div className="rounded-card border border-slate-200 bg-white shadow-card">
        <div className="flex flex-wrap items-end gap-4 p-5">
          <div className="w-full min-w-[240px] flex-1 sm:w-auto">
            <SearchInput value={productSearch.search} onChange={productSearch.setSearch} />
          </div>
          <div className="w-full sm:w-auto">
            <FilterDropdown
              label="Category"
              value={productSearch.categoryId}
              options={categoryOptions}
              onChange={productSearch.setCategoryId}
            />
          </div>
          <div className="w-full sm:w-auto">
            <FilterDropdown label="Type" value={productSearch.filter} options={TYPE_OPTIONS} onChange={productSearch.setFilter} />
          </div>
          <div className="w-full sm:w-auto">
            <FilterDropdown
              label="Status"
              value={productSearch.status}
              options={STATUS_OPTIONS}
              onChange={productSearch.setStatus}
            />
          </div>
          <button
            type="button"
            onClick={handleClearFilters}
            className="w-full text-small font-medium text-primary hover:underline sm:w-auto"
          >
            Clear filters
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
          <p className="text-small text-muted">{productSearch.totalElements} products</p>
          <div className="w-full sm:w-auto">
            <FilterDropdown
              label="Sort by"
              value={`${productSearch.sortKey},${productSearch.sortDirection}`}
              options={SORT_OPTIONS}
              onChange={handleSortChange}
            />
          </div>
        </div>

        <div className="px-5 pb-5">
          {productSearch.error ? (
            <ErrorState message={productSearch.error} onRetry={productSearch.reload} />
          ) : (
            <>
              <DataTable
                columns={columns}
                rows={productSearch.products}
                sortKey={productSearch.sortKey}
                sortDirection={productSearch.sortDirection}
                onSortChange={productSearch.onSortChange}
                isLoading={productSearch.isLoading}
                headerClassName={TABLE_HEADER_GRADIENT}
                emptyState={
                  <EmptyState
                    title="No products found"
                    description="Try adjusting your search or filters, or add your first product."
                  />
                }
              />
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
                <Pagination page={productSearch.page} totalPages={productSearch.totalPages} onPageChange={productSearch.setPage} summary={paginationSummary} />
                <div className="w-full sm:w-auto">
                  <FilterDropdown
                    label="Rows per page"
                    value={String(productSearch.pageSize)}
                    options={PAGE_SIZE_OPTIONS}
                    onChange={(value) => productSearch.setPageSize(Number(value))}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Deactivate Product"
        message={
          deleteTarget
            ? `This will deactivate "${deleteTarget.name}" and remove it from the public catalog. You can reactivate it later from Edit.`
            : ''
        }
        confirmLabel="Deactivate"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default ProductsPage;
```

- [ ] **Step 2: Add the remaining new tests**

Add to `ProductsPage.test.jsx` (alongside the existing `it(...)` blocks, before the final closing `});` — the `pageSize`/sort-sync tests were already added in Task 3's Step 1):

```jsx
  it('shows a Published badge for an active product with no other flags', async () => {
    adminProductService.searchProducts.mockResolvedValue({
      content: [
        {
          id: 4,
          name: 'Plain Active Product',
          categoryName: 'Electronics',
          imageFileName: null,
          productPrice: 15.0,
          trending: false,
          bestSeller: false,
          active: true,
          createdAt: '2026-04-01T10:00:00',
        },
      ],
      totalPages: 1,
      totalElements: 1,
    });
    renderPage();

    expect(await screen.findByText('Published')).toBeInTheDocument();
  });

  it('clears all filters when Clear filters is clicked', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Wireless Earbuds');

    await user.type(screen.getByLabelText('Search products'), 'lamp');
    await waitFor(() =>
      expect(adminProductService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'lamp' }))
    );

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    await waitFor(() =>
      expect(adminProductService.searchProducts).toHaveBeenLastCalledWith(
        expect.not.objectContaining({ search: expect.anything() })
      )
    );
  });

  it('shows the pagination summary text with real counts', async () => {
    renderPage();
    await screen.findByText('Wireless Earbuds');

    expect(await screen.findByText('Showing 1–2 of 2 products')).toBeInTheDocument();
  });
```

- [ ] **Step 3: Run the full frontend suite**

Run: `npm test` (from `frontend/`)
Expected: PASS, 0 failures — including all 8 pre-existing `ProductsPage` tests, the 2 added in Task 3, and the 3 added here.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/ProductsPage.jsx frontend/src/pages/admin/ProductsPage.test.jsx
git commit -m "feat(admin-products): redesign the Products Management page"
```

---

### Task 7: Full verification and manual screenshot comparison

**Files:** none (verification only).

- [ ] **Step 1: Run the full frontend suite**

Run: `npm test` (from `frontend/`)
Expected: PASS, 0 failures.

- [ ] **Step 2: Run frontend lint**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Run the frontend production build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Manual verification**

Start both servers (or reuse already-running instances), log in as admin, navigate to `/admin/products`, and confirm against the reference image: heading size/weight/subtitle, orange Add Product button, filter row + Clear filters, results count + Sort by dropdown, purple-gradient table header, Product/Category/Brand/Price/Status/Created/Actions columns in order, multi-badge Status cells (including the new Published badge on plain-active products and multi-badge rows like a Trending Best Seller), circular outline Edit/Delete buttons with correct hover colors, pagination summary text + page nav + Rows-per-page dropdown at the bottom. Then exercise real interactions: search, each filter, the Sort by dropdown, a column-header click (confirm the dropdown updates to match), changing rows-per-page, paging forward/back, Add Product navigation, Edit navigation, and a Delete → confirm → deactivate cycle. Resize to tablet and mobile widths and confirm the filter row stacks and the table scrolls horizontally without breaking. Check the browser console for errors throughout.

- [ ] **Step 5: Write the completion note**

Summarize in the final report: what shipped (visual redesign of the Products page matching the reference, StatusBadge component, Sort by dropdown, rows-per-page selector, Pagination summary text), the four reference-vs-reality conflicts that were resolved with the user before implementation (multi-badge status, Inactive-not-Draft wording, initial-letter avatar, dual sort controls) and why, confirmation that `AdminSidebar`/`AdminTopbar` were intentionally left unchanged, test/lint/build results.

---

## Self-Review Notes

- **Spec coverage:** Section A (reuse/new-pieces list) — Tasks 1, 2, 5. Section B (heading/subtitle/accent button/card shell/Clear filters) — Task 6. Section C (table gradient header, Product column rename, StatusBadge integration, circular actions) — Tasks 5, 6. Section D (Sort dropdown, rows-per-page, pagination summary) — Tasks 3, 4, 6. Section E (responsive stacking, testing) — Task 6 (responsive classes), Task 7 (manual + automated verification). All covered.
- **Placeholder scan:** no TBD/TODO; every step has real, complete code, including the full replaced `ProductsPage.jsx`.
- **Type consistency:** `StatusBadge({ variant, children })` variant names (`trending`/`bestSeller`/`scheduled`/`published`/`inactive`) match identically between Task 1's definition and Task 6's usage. `pageSize`/`setPageSize`/`setSort` names and signatures match between Task 3's hook changes and Task 6's call sites (`productSearch.pageSize`, `productSearch.setPageSize(Number(value))`, `productSearch.setSort(nextSortKey, nextSortDirection)`). `Pagination`'s `summary` prop matches between Task 4's definition and Task 6's `<Pagination ... summary={paginationSummary} />` call. `DataTable`'s `headerClassName` prop matches between Task 5's definition and Task 6's `<DataTable ... headerClassName={TABLE_HEADER_GRADIENT} />` call.
- **Sequencing note:** Task 3 intentionally leaves 2 new tests red (they need Task 6's UI to pass) — flagged explicitly in Task 3 Step 2/4 so it isn't mistaken for a mistake when executing the plan in order.
