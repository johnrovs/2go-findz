# Buying Guide Products Step Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Buying Guide editor's Products step (Step 2): a real, working catalog search/filter/pagination panel on the left, a drag-and-drop + keyboard-reorderable selected-products panel on the right, wired to the actual `recommendedProductIds` persistence field, with real Next/Previous step navigation replacing the current hardcoded single-step form.

**Architecture:** New local (non-URL) search/filter/pagination hook mirroring `useAdminProductSearch`'s fetch logic, feeding a new `ProductCatalogPanel`; a `SelectedProductsPanel` mirroring `TocBuilder.jsx`'s existing dnd-kit + Up/Down-button reorder pattern; both composed by a new `ProductsStep`; `BuyingGuideForm.jsx` gains real step-switching state and wires `Stepper` to it. No new backend work in this plan — it depends on `2026-08-02-product-sku-and-brand-filter-plan.md` being merged first (this plan's `ProductCatalogPanel` calls `getDistinctBrands()` and passes a `brand` search param, both added there).

**Tech Stack:** React 18.3, Vite, Tailwind, `@dnd-kit/core`/`@dnd-kit/sortable`/`@dnd-kit/utilities` (already a dependency), Vitest + RTL.

## Global Constraints

- Only Steps 1 (Basic Info) and 2 (Products) exist. `Stepper` must keep steps 3–9 permanently disabled regardless of unlock state.
- `recommendedProducts` stores full product objects (not bare IDs); `buildPayload` reduces to `recommendedProductIds: recommendedProducts.map((p) => p.id)` — array order is submit order, no separate position field.
- No confirmation dialog on removing a selected product (low-stakes, reversible — matches `EntityPicker`'s existing remove button).
- `LivePreview` is unchanged — same props, rendered as-is on both steps.
- No minimum-product-count validation gate and no "Next" button on the Products step — there's no Step 3 to advance to yet.

---

### Task 1: `useProductCatalogSearch` hook

**Files:**
- Create: `frontend/src/hooks/useProductCatalogSearch.js`
- Test: `frontend/src/hooks/useProductCatalogSearch.test.js`

**Interfaces:**
- Consumes: `searchProducts(params)` from `frontend/src/services/adminProductService.js` (existing).
- Produces: `{ products, totalPages, totalElements, isLoading, error, search, categoryId, brand, page, setSearch, setCategoryId, setBrand, setPage, reload }` — same shape family as `useAdminProductSearch`, but backed by local `useState`, not `useSearchParams`.

- [ ] **Step 1: Write the failing test**

```js
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as adminProductService from '../services/adminProductService.js';
import { useProductCatalogSearch } from './useProductCatalogSearch.js';

describe('useProductCatalogSearch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches products on mount with default paging', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({
      content: [{ id: 1, name: 'Blender' }],
      totalPages: 1,
      totalElements: 1,
    });

    const { result } = renderHook(() => useProductCatalogSearch());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(adminProductService.searchProducts).toHaveBeenCalledWith({ page: 0, size: 20, sort: 'createdAt,asc' });
    expect(result.current.products).toEqual([{ id: 1, name: 'Blender' }]);
    expect(result.current.totalPages).toBe(1);
  });

  it('includes search, categoryId, and brand params only when set, and resets to page 1', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
    const { result } = renderHook(() => useProductCatalogSearch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setPage(3));
    await waitFor(() => expect(result.current.page).toBe(3));

    act(() => result.current.setSearch('lamp'));
    await waitFor(() =>
      expect(adminProductService.searchProducts).toHaveBeenLastCalledWith({
        page: 0,
        size: 20,
        sort: 'createdAt,asc',
        search: 'lamp',
      })
    );
    expect(result.current.page).toBe(1);

    act(() => result.current.setCategoryId('5'));
    await waitFor(() =>
      expect(adminProductService.searchProducts).toHaveBeenLastCalledWith({
        page: 0,
        size: 20,
        sort: 'createdAt,asc',
        search: 'lamp',
        categoryId: '5',
      })
    );

    act(() => result.current.setBrand('Nike'));
    await waitFor(() =>
      expect(adminProductService.searchProducts).toHaveBeenLastCalledWith({
        page: 0,
        size: 20,
        sort: 'createdAt,asc',
        search: 'lamp',
        categoryId: '5',
        brand: 'Nike',
      })
    );
  });

  it('surfaces a fetch error and reload() clears and re-fetches', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockRejectedValueOnce(new Error('Network down'));
    const { result } = renderHook(() => useProductCatalogSearch());
    await waitFor(() => expect(result.current.error).toBe('Network down'));

    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.error).toBe(null));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/hooks/useProductCatalogSearch.test.js`
Expected: FAIL — module `./useProductCatalogSearch.js` doesn't exist.

- [ ] **Step 3: Implement**

```js
import { useEffect, useState } from 'react';
import { searchProducts } from '../services/adminProductService.js';

const PAGE_SIZE = 20;

export function useProductCatalogSearch() {
  const [search, setSearchValue] = useState('');
  const [categoryId, setCategoryIdValue] = useState('');
  const [brand, setBrandValue] = useState('');
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    const params = { page: page - 1, size: PAGE_SIZE, sort: 'createdAt,asc' };
    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;
    if (brand) params.brand = brand;

    searchProducts(params)
      .then((data) => {
        if (isCancelled) return;
        setProducts(data.content);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
      })
      .catch((err) => {
        if (isCancelled) return;
        setError(err.message ?? 'Failed to load products.');
      })
      .finally(() => {
        if (isCancelled) return;
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [search, categoryId, brand, page, refreshIndex]);

  return {
    products,
    totalPages,
    totalElements,
    isLoading,
    error,
    search,
    categoryId,
    brand,
    page,
    setSearch: (value) => {
      setSearchValue(value);
      setPage(1);
    },
    setCategoryId: (value) => {
      setCategoryIdValue(value);
      setPage(1);
    },
    setBrand: (value) => {
      setBrandValue(value);
      setPage(1);
    },
    setPage,
    reload: () => setRefreshIndex((n) => n + 1),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/hooks/useProductCatalogSearch.test.js`
Expected: PASS, all 3 cases.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useProductCatalogSearch.js frontend/src/hooks/useProductCatalogSearch.test.js
git commit -m "feat(buying-guides): add local product catalog search hook"
```

---

### Task 2: `ProductCatalogPanel.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/ProductCatalogPanel.jsx`
- Test: `frontend/src/components/buying-guide-form/ProductCatalogPanel.test.jsx`

**Interfaces:**
- Consumes: `useProductCatalogSearch()` (Task 1), `getDistinctBrands()` from `adminProductService.js` (already added by the dependency plan), `SearchInput`, `FilterDropdown`, `Pagination`, `LoadingSpinner`, `EmptyState`, `ErrorState`, `Button`, `getImageUrl` — all existing.
- Props: `ProductCatalogPanel({ selectedProducts, onAdd, categories })` — `selectedProducts: Array<{id}>`, `onAdd: (product) => void`, `categories: Array<{id, productCategoryName}>`.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ProductCatalogPanel from './ProductCatalogPanel.jsx';
import * as adminProductService from '../../services/adminProductService.js';

const categories = [{ id: 1, productCategoryName: 'Electronics' }];

function mockSearch(products) {
  vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({
    content: products,
    totalPages: 1,
    totalElements: products.length,
  });
}

describe('ProductCatalogPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminProductService, 'getDistinctBrands').mockResolvedValue(['Nike', 'Adidas']);
  });

  it('renders fetched products with an Add button', async () => {
    mockSearch([{ id: 1, name: 'Blender', brand: 'Nike', productPrice: '49.99', imageFileName: null }]);
    render(<ProductCatalogPanel selectedProducts={[]} onAdd={vi.fn()} categories={categories} />);

    expect(await screen.findByText('Blender')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();
  });

  it('disables and relabels Add for a product that is already selected', async () => {
    mockSearch([{ id: 1, name: 'Blender', brand: 'Nike', productPrice: '49.99', imageFileName: null }]);
    render(<ProductCatalogPanel selectedProducts={[{ id: 1, name: 'Blender' }]} onAdd={vi.fn()} categories={categories} />);

    expect(await screen.findByRole('button', { name: 'Added' })).toBeDisabled();
  });

  it('calls onAdd with the clicked product', async () => {
    mockSearch([{ id: 1, name: 'Blender', brand: 'Nike', productPrice: '49.99', imageFileName: null }]);
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<ProductCatalogPanel selectedProducts={[]} onAdd={onAdd} categories={categories} />);

    await user.click(await screen.findByRole('button', { name: 'Add' }));

    expect(onAdd).toHaveBeenCalledWith({ id: 1, name: 'Blender', brand: 'Nike', productPrice: '49.99', imageFileName: null });
  });

  it('shows an empty state when the search returns no results', async () => {
    mockSearch([]);
    render(<ProductCatalogPanel selectedProducts={[]} onAdd={vi.fn()} categories={categories} />);

    expect(await screen.findByText('No products found')).toBeInTheDocument();
  });

  it('shows an error state with retry on fetch failure', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockRejectedValue(new Error('Network down'));
    render(<ProductCatalogPanel selectedProducts={[]} onAdd={vi.fn()} categories={categories} />);

    expect(await screen.findByText('Network down')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('populates the Brand filter from getDistinctBrands', async () => {
    mockSearch([]);
    render(<ProductCatalogPanel selectedProducts={[]} onAdd={vi.fn()} categories={categories} />);

    await waitFor(() => expect(adminProductService.getDistinctBrands).toHaveBeenCalled());
    expect(await screen.findByRole('option', { name: 'Nike' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/ProductCatalogPanel.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
import { useEffect, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import SearchInput from '../SearchInput.jsx';
import FilterDropdown from '../FilterDropdown.jsx';
import Pagination from '../Pagination.jsx';
import LoadingSpinner from '../LoadingSpinner.jsx';
import EmptyState from '../EmptyState.jsx';
import ErrorState from '../ErrorState.jsx';
import Button from '../Button.jsx';
import { getDistinctBrands } from '../../services/adminProductService.js';
import { useProductCatalogSearch } from '../../hooks/useProductCatalogSearch.js';
import { getImageUrl } from '../../utils/imageUrl.js';

function ProductCatalogPanel({ selectedProducts, onAdd, categories }) {
  const catalog = useProductCatalogSearch();
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    getDistinctBrands()
      .then(setBrands)
      .catch(() => setBrands([]));
  }, []);

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map((category) => ({ value: String(category.id), label: category.productCategoryName })),
  ];
  const brandOptions = [{ value: '', label: 'All Brands' }, ...brands.map((brand) => ({ value: brand, label: brand }))];
  const selectedIds = new Set(selectedProducts.map((product) => product.id));

  return (
    <div>
      <h3 className="mb-3 text-small font-medium text-body">Product Catalog</h3>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="min-w-[200px] flex-1">
          <SearchInput value={catalog.search} onChange={catalog.setSearch} />
        </div>
        <FilterDropdown label="Category" value={catalog.categoryId} options={categoryOptions} onChange={catalog.setCategoryId} />
        <FilterDropdown label="Brand" value={catalog.brand} options={brandOptions} onChange={catalog.setBrand} />
      </div>

      {catalog.isLoading ? (
        <LoadingSpinner label="Loading products..." />
      ) : catalog.error ? (
        <ErrorState message={catalog.error} onRetry={catalog.reload} />
      ) : catalog.products.length === 0 ? (
        <EmptyState title="No products found" description="Try adjusting your search or filters." />
      ) : (
        <ul className="space-y-2">
          {catalog.products.map((product) => {
            const isSelected = selectedIds.has(product.id);
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
                    </p>
                  </div>
                </div>
                <Button type="button" variant="secondary" size="sm" disabled={isSelected} onClick={() => onAdd(product)}>
                  {isSelected ? 'Added' : 'Add'}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination page={catalog.page} totalPages={catalog.totalPages} onPageChange={catalog.setPage} />
    </div>
  );
}

export default ProductCatalogPanel;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/ProductCatalogPanel.test.jsx`
Expected: PASS, all 6 cases.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/ProductCatalogPanel.jsx frontend/src/components/buying-guide-form/ProductCatalogPanel.test.jsx
git commit -m "feat(buying-guides): add product catalog search panel"
```

---

### Task 3: `SelectedProductsPanel.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/SelectedProductsPanel.jsx`
- Test: `frontend/src/components/buying-guide-form/SelectedProductsPanel.test.jsx`

**Interfaces:**
- Props: `SelectedProductsPanel({ selectedProducts, onChange })` — `selectedProducts: Array<{id, name, imageFileName}>`, `onChange: (nextArray) => void`.
- Reorder pattern (drag handle via `@dnd-kit` `useSortable`, plus `ArrowUp`/`ArrowDown` buttons, plus `Trash2` remove) mirrors `TocBuilder.jsx`'s existing `TocRow`/`handleMoveUp`/`handleMoveDown`/`handleDragEnd` exactly.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SelectedProductsPanel from './SelectedProductsPanel.jsx';

const products = [
  { id: 1, name: 'Blender', imageFileName: null },
  { id: 2, name: 'Toaster', imageFileName: null },
  { id: 3, name: 'Kettle', imageFileName: null },
];

describe('SelectedProductsPanel', () => {
  it('shows an empty state with no products selected', () => {
    render(<SelectedProductsPanel selectedProducts={[]} onChange={vi.fn()} />);
    expect(screen.getByText('No products selected yet')).toBeInTheDocument();
  });

  it('renders selected products in order with a live count', () => {
    render(<SelectedProductsPanel selectedProducts={products} onChange={vi.fn()} />);
    expect(screen.getByText('3 products selected')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Selected products' });
    const items = list.querySelectorAll('li');
    expect(items[0]).toHaveTextContent('Blender');
    expect(items[1]).toHaveTextContent('Toaster');
    expect(items[2]).toHaveTextContent('Kettle');
  });

  it('uses singular wording for exactly one selected product', () => {
    render(<SelectedProductsPanel selectedProducts={[products[0]]} onChange={vi.fn()} />);
    expect(screen.getByText('1 product selected')).toBeInTheDocument();
  });

  it('reorders with the up/down buttons and respects boundaries', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SelectedProductsPanel selectedProducts={products} onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'Move Blender up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Kettle down' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Move Toaster up' }));
    expect(onChange).toHaveBeenCalledWith([products[1], products[0], products[2]]);
  });

  it('removes a product immediately with no confirmation', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SelectedProductsPanel selectedProducts={products} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Remove Toaster' }));

    expect(onChange).toHaveBeenCalledWith([products[0], products[2]]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/SelectedProductsPanel.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, GripVertical, Image as ImageIcon, Trash2 } from 'lucide-react';
import EmptyState from '../EmptyState.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';

function SelectedProductRow({ product, index, total, onMoveUp, onMoveDown, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: product.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const imageUrl = getImageUrl(product.imageFileName);

  return (
    <li ref={setNodeRef} style={style} className="flex items-center justify-between gap-3 rounded-btn border border-border bg-white p-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${product.name}`}
          className="cursor-grab rounded-btn p-1 text-muted hover:bg-surface-secondary active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>
        {imageUrl ? (
          <img src={imageUrl} alt={product.name} className="h-10 w-10 shrink-0 rounded-md object-cover" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100">
            <ImageIcon className="h-4 w-4 text-slate-300" />
          </div>
        )}
        <span className="truncate text-sm font-medium text-body">{product.name}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onMoveUp(index)}
          disabled={index === 0}
          aria-label={`Move ${product.name} up`}
          className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowUp size={16} />
        </button>
        <button
          type="button"
          onClick={() => onMoveDown(index)}
          disabled={index === total - 1}
          aria-label={`Move ${product.name} down`}
          className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowDown size={16} />
        </button>
        <button
          type="button"
          onClick={() => onRemove(product.id)}
          aria-label={`Remove ${product.name}`}
          className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-danger"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </li>
  );
}

function SelectedProductsPanel({ selectedProducts, onChange }) {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function handleMoveUp(index) {
    if (index === 0) return;
    const next = [...selectedProducts];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function handleMoveDown(index) {
    if (index === selectedProducts.length - 1) return;
    const next = [...selectedProducts];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  function handleRemove(id) {
    onChange(selectedProducts.filter((product) => product.id !== id));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = selectedProducts.findIndex((product) => product.id === active.id);
    const newIndex = selectedProducts.findIndex((product) => product.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = [...selectedProducts];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    onChange(next);
  }

  return (
    <div>
      <h3 className="mb-3 text-small font-medium text-body">
        {selectedProducts.length} product{selectedProducts.length === 1 ? '' : 's'} selected
      </h3>
      {selectedProducts.length === 0 ? (
        <EmptyState
          title="No products selected yet"
          description="Search the catalog on the left and click Add to select products for this guide."
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={selectedProducts.map((product) => product.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2" aria-label="Selected products">
              {selectedProducts.map((product, index) => (
                <SelectedProductRow
                  key={product.id}
                  product={product}
                  index={index}
                  total={selectedProducts.length}
                  onMoveUp={handleMoveUp}
                  onMoveDown={handleMoveDown}
                  onRemove={handleRemove}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

export default SelectedProductsPanel;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/SelectedProductsPanel.test.jsx`
Expected: PASS, all 5 cases.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/SelectedProductsPanel.jsx frontend/src/components/buying-guide-form/SelectedProductsPanel.test.jsx
git commit -m "feat(buying-guides): add drag-and-drop selected products panel"
```

---

### Task 4: `Stepper.jsx` — real navigation state

**Files:**
- Modify: `frontend/src/components/buying-guide-form/Stepper.jsx`
- Modify: `frontend/src/components/buying-guide-form/Stepper.test.jsx`

**Interfaces:**
- Produces: `Stepper({ activeStep, maxUnlockedStep, onStepClick })`. A step is enabled when `stepNumber <= maxUnlockedStep && stepNumber <= 2`. `aria-current="step"` is set when `stepNumber === activeStep`. `onStepClick(stepNumber)` fires on click of an enabled step.

- [ ] **Step 1: Write the failing test**

Replace the contents of `Stepper.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Stepper from './Stepper.jsx';

describe('Stepper', () => {
  it('marks the active step as current and enabled', () => {
    render(<Stepper activeStep={1} maxUnlockedStep={1} onStepClick={vi.fn()} />);
    const basicInfoButton = screen.getByRole('button', { name: /Basic Info/ });
    expect(basicInfoButton).toBeEnabled();
    expect(basicInfoButton).toHaveAttribute('aria-current', 'step');
  });

  it('enables Products once unlocked, but keeps every step after it disabled', () => {
    render(<Stepper activeStep={2} maxUnlockedStep={2} onStepClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Products/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Quick Picks/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /SEO & Publish/ })).toBeDisabled();
  });

  it('keeps Products disabled while still locked', () => {
    render(<Stepper activeStep={1} maxUnlockedStep={1} onStepClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Products/ })).toBeDisabled();
  });

  it('calls onStepClick with the clicked, enabled step number', async () => {
    const onStepClick = vi.fn();
    const user = userEvent.setup();
    render(<Stepper activeStep={2} maxUnlockedStep={2} onStepClick={onStepClick} />);

    await user.click(screen.getByRole('button', { name: /Basic Info/ }));

    expect(onStepClick).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/Stepper.test.jsx`
Expected: FAIL — `Stepper` still hardcodes step 1 as active with no props.

- [ ] **Step 3: Implement**

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

const MAX_BUILT_STEP = 2;

function Stepper({ activeStep, maxUnlockedStep, onStepClick }) {
  return (
    <nav aria-label="Buying guide steps" className="mb-6 overflow-x-auto">
      <ol className="flex min-w-max items-center gap-2">
        {STEPS.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === activeStep;
          const isEnabled = stepNumber <= maxUnlockedStep && stepNumber <= MAX_BUILT_STEP;
          return (
            <li key={label} className="flex items-center gap-2">
              <button
                type="button"
                disabled={!isEnabled}
                onClick={() => onStepClick(stepNumber)}
                aria-current={isActive ? 'step' : undefined}
                className={`flex items-center gap-2 rounded-btn px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-primary text-white'
                    : isEnabled
                      ? 'text-body hover:bg-surface-secondary'
                      : 'cursor-not-allowed text-muted opacity-60'
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

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/Stepper.test.jsx`
Expected: PASS, all 4 cases.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/Stepper.jsx frontend/src/components/buying-guide-form/Stepper.test.jsx
git commit -m "feat(buying-guides): wire Stepper to real step-navigation state"
```

---

### Task 5: `ProductsStep.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/ProductsStep.jsx`
- Test: `frontend/src/components/buying-guide-form/ProductsStep.test.jsx`

**Interfaces:**
- Consumes: `ProductCatalogPanel` (Task 2), `SelectedProductsPanel` (Task 3) — both mocked in this task's test, following this codebase's established "mock the child, not the library" pattern (see `BuyingGuideForm.test.jsx`'s mocks of `IntroductionEditor`/`PublishDatePicker`).
- Props: `ProductsStep({ selectedProducts, onSelectedProductsChange, categories })`.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ProductsStep from './ProductsStep.jsx';

vi.mock('./ProductCatalogPanel.jsx', () => ({
  default: ({ selectedProducts, onAdd }) => (
    <div>
      <p>Catalog ({selectedProducts.length} selected)</p>
      <button type="button" onClick={() => onAdd({ id: 99, name: 'New Product' })}>
        Add from catalog
      </button>
    </div>
  ),
}));

vi.mock('./SelectedProductsPanel.jsx', () => ({
  default: ({ selectedProducts, onChange }) => (
    <div>
      <p>Selected ({selectedProducts.length})</p>
      <button type="button" onClick={() => onChange([])}>
        Clear
      </button>
    </div>
  ),
}));

const categories = [{ id: 1, productCategoryName: 'Electronics' }];

describe('ProductsStep', () => {
  it('renders both panels with the current selection', () => {
    render(
      <ProductsStep selectedProducts={[{ id: 1, name: 'Blender' }]} onSelectedProductsChange={vi.fn()} categories={categories} />
    );
    expect(screen.getByText('Catalog (1 selected)')).toBeInTheDocument();
    expect(screen.getByText('Selected (1)')).toBeInTheDocument();
  });

  it('adding from the catalog panel calls onSelectedProductsChange with the product appended', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ProductsStep selectedProducts={[{ id: 1, name: 'Blender' }]} onSelectedProductsChange={onChange} categories={categories} />);

    await user.click(screen.getByRole('button', { name: 'Add from catalog' }));

    expect(onChange).toHaveBeenCalledWith([{ id: 1, name: 'Blender' }, { id: 99, name: 'New Product' }]);
  });

  it('changes from the selected panel call onSelectedProductsChange directly', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ProductsStep selectedProducts={[{ id: 1, name: 'Blender' }]} onSelectedProductsChange={onChange} categories={categories} />);

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onChange).toHaveBeenCalledWith([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/ProductsStep.test.jsx`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```jsx
import ProductCatalogPanel from './ProductCatalogPanel.jsx';
import SelectedProductsPanel from './SelectedProductsPanel.jsx';

function ProductsStep({ selectedProducts, onSelectedProductsChange, categories }) {
  function handleAdd(product) {
    onSelectedProductsChange([...selectedProducts, product]);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ProductCatalogPanel selectedProducts={selectedProducts} onAdd={handleAdd} categories={categories} />
      <SelectedProductsPanel selectedProducts={selectedProducts} onChange={onSelectedProductsChange} />
    </div>
  );
}

export default ProductsStep;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/buying-guide-form/ProductsStep.test.jsx`
Expected: PASS, all 3 cases.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide-form/ProductsStep.jsx frontend/src/components/buying-guide-form/ProductsStep.test.jsx
git commit -m "feat(buying-guides): add ProductsStep composing catalog and selected panels"
```

---

### Task 6: Wire it all into `BuyingGuideForm.jsx`

**Files:**
- Modify: `frontend/src/components/BuyingGuideForm.jsx`
- Modify: `frontend/src/components/BuyingGuideForm.test.jsx`

**Interfaces:**
- Consumes: `Stepper` (Task 4, new props), `ProductsStep` (Task 5), `Button` (existing, from `./Button.jsx`).
- `recommendedProductIds` (read-only `useState`) is replaced by `recommendedProducts`/`setRecommendedProducts` (full objects); `buildPayload`'s `recommendedProductIds:` line changes from the bare variable to `recommendedProducts.map((p) => p.id)` — output is unchanged for any already-passing test, since this is the same reduction the old code effectively already produced at init time.

- [ ] **Step 1: Write the failing tests**

Add to `BuyingGuideForm.test.jsx`, after the existing `vi.mock` calls at the top:

```jsx
vi.mock('./buying-guide-form/ProductsStep.jsx', () => ({
  default: ({ selectedProducts, onSelectedProductsChange }) => (
    <div>
      <p>Products step ({selectedProducts.length} selected)</p>
      <button
        type="button"
        onClick={() => onSelectedProductsChange([...selectedProducts, { id: 99, name: 'Mock Product' }])}
      >
        Add mock product
      </button>
    </div>
  ),
}));
```

Add new test cases inside the `describe('BuyingGuideForm', ...)` block:

```jsx
it('Next on Basic Info validates required fields before advancing', async () => {
  const user = userEvent.setup();
  renderForm();

  await user.click(screen.getByRole('button', { name: 'Next' }));

  expect(await screen.findByText('Title is required.')).toBeInTheDocument();
  expect(screen.getByLabelText('Title')).toBeInTheDocument();
});

it('Next on Basic Info advances to the Products step once valid, and unlocks it in the Stepper', async () => {
  const user = userEvent.setup();
  renderForm();
  await fillRequiredFields(user);

  await user.click(screen.getByRole('button', { name: 'Next' }));

  expect(await screen.findByText('Products step (0 selected)')).toBeInTheDocument();
  const productsStepButton = screen.getByRole('button', { name: /Products/ });
  expect(productsStepButton).toBeEnabled();
  expect(productsStepButton).toHaveAttribute('aria-current', 'step');
});

it('Previous on the Products step returns to Basic Info without losing entered data', async () => {
  const user = userEvent.setup();
  renderForm();
  await fillRequiredFields(user);
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await screen.findByText('Products step (0 selected)');

  await user.click(screen.getByRole('button', { name: 'Previous' }));

  expect(screen.getByLabelText('Title')).toHaveValue('Guide Title');
});

it('adding a product on the Products step flows into recommendedProductIds on save', async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  renderForm({ onSubmit });
  await fillRequiredFields(user);
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(await screen.findByRole('button', { name: 'Add mock product' }));

  await user.click(screen.getByRole('button', { name: 'Save as Draft' }));

  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  const payload = onSubmit.mock.calls[0][0];
  expect(payload.recommendedProductIds).toEqual([99]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/BuyingGuideForm.test.jsx`
Expected: FAIL — no "Next"/"Previous" buttons exist yet, `Stepper` isn't wired to real state.

- [ ] **Step 3: Implement**

In `BuyingGuideForm.jsx`, update imports:

```js
import Button from './Button.jsx';
import ProductsStep from './buying-guide-form/ProductsStep.jsx';
```

Replace the `recommendedProductIds` state line:

```js
const [recommendedProducts, setRecommendedProducts] = useState(guide?.recommendedProducts ?? []);
```

Add step-navigation state alongside the other `useState` declarations:

```js
const [activeStep, setActiveStep] = useState(1);
const [maxUnlockedStep, setMaxUnlockedStep] = useState(1);
```

Add a `handleNext` function near `submit`:

```js
function handleNext() {
  const errors = validate();
  setFieldErrors(errors);
  if (Object.keys(errors).length > 0) return;
  setMaxUnlockedStep((prev) => Math.max(prev, 2));
  setActiveStep(2);
}
```

In `buildPayload`, change the `recommendedProductIds,` line to:

```js
recommendedProductIds: recommendedProducts.map((product) => product.id),
```

Replace the `<Stepper />` and the `lg:w-[72%]` column's contents:

```jsx
<Stepper activeStep={activeStep} maxUnlockedStep={maxUnlockedStep} onStepClick={setActiveStep} />

<div className="flex flex-col gap-6 lg:flex-row">
  <div className="lg:w-[72%]">
    {activeStep === 1 && (
      <>
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
        <div className="mt-6 flex justify-end">
          <Button type="button" onClick={handleNext}>
            Next
          </Button>
        </div>
      </>
    )}
    {activeStep === 2 && (
      <>
        <ProductsStep
          selectedProducts={recommendedProducts}
          onSelectedProductsChange={setRecommendedProducts}
          categories={categories}
        />
        <div className="mt-6 flex justify-start">
          <Button type="button" variant="secondary" onClick={() => setActiveStep(1)}>
            Previous
          </Button>
        </div>
      </>
    )}
  </div>
  <div className="hidden lg:block lg:w-[28%]">
    <div className="sticky top-32">
      <LivePreview {...previewProps} />
    </div>
  </div>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/BuyingGuideForm.test.jsx`
Expected: PASS, all cases in the file (existing + 4 new).

- [ ] **Step 5: Run the full frontend suite**

Run: `cd frontend && npx vitest run`
Expected: PASS, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/BuyingGuideForm.jsx frontend/src/components/BuyingGuideForm.test.jsx
git commit -m "feat(buying-guides): wire Products step into the guide editor with Next/Previous navigation"
```

---

### Task 7: Manual verification and production build

**Files:** none (verification only)

- [ ] **Step 1: Run the full frontend and backend suites**

```bash
cd frontend && npx vitest run
cd ../backend && mvn test
```

Expected: PASS, 0 failures in both.

- [ ] **Step 2: Production build**

```bash
cd frontend && npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Lint**

```bash
cd frontend && npm run lint
```

Expected: no errors (fix any introduced by this plan's new files before proceeding).

- [ ] **Step 4: Manual browser verification (chrome-devtools MCP)**

Start both servers (`mvn spring-boot:run` in `backend/`, `npm run dev` in `frontend/`), then navigate to a Buying Guide editor (new or existing), and verify against the original reference image and spec:
- Basic Info's Next button validates required fields, then advances to Products and unlocks it in the Stepper.
- The catalog panel loads real products, search/Category/Brand filters and pagination all refetch correctly, Add adds a product and flips to "Added".
- The selected panel shows added products in order, drag-and-drop and the Up/Down buttons both reorder, Remove removes immediately.
- Previous returns to Basic Info with no data loss.
- Save as Draft / Publish from the Products step persists the selection; reloading the guide shows the same products in the same order (confirms `recommendedProductIds` round-trips through the real backend).
- Mobile/responsive layout: catalog and selected panels stack in a single column below `lg`.

- [ ] **Step 5: Report completion**

Once every item above is verified — not before — report:

"✅ The Buying Guides Products tab is complete and verified. Product search, filters, selection, removal, ordering, persistence, and navigation are now implemented."
