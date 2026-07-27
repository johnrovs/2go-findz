# Frontend Public Homepage (Stage 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete public storefront homepage — navbar, hero, social links, curated product teasers, the searchable/filterable/sortable/paginated catalog, supporting content sections, and footer — wired to the already-shipped backend public endpoints.

**Architecture:** Same conventions as Frontend Stage 1 (`components/ pages/ layouts/ hooks/ services/ utils/ context/`). URL-param-driven search state via `useSearchParams`. All network calls go through the existing shared `api` Axios instance. Full rationale and the visual design system in `docs/superpowers/specs/2026-07-26-frontend-public-homepage-design.md`.

**Tech Stack:** Same as Frontend Stage 1 (React JS/JSX, Vite, Tailwind, React Router DOM, Axios, Framer Motion, Lucide React, Vitest + React Testing Library).

## Global Constraints

- Everything from Frontend Stage 1's Global Constraints still applies (plain JS/JSX, npm, fixed folder structure, all backend calls through the shared `api` instance, normalized `{ message, fieldErrors }` error shape, accessible-by-default).
- **Color palette:** brand/primary `indigo` (600 default, 700 hover, 50 tint), neutrals `slate`, Trending badge `amber-100`/`amber-800`, Best Seller badge `emerald-100`/`emerald-800`, errors `red` (reserved for genuine errors only — never for manufactured urgency). No neon, no flashing/autoplay elements, no countdown timers, no full-width "SALE" banners.
- **Typography scale:** hero `text-4xl sm:text-5xl lg:text-6xl font-extrabold`, section headings `text-2xl sm:text-3xl font-bold`, card titles `text-base font-semibold`, body copy `text-sm text-slate-600 leading-relaxed`, price `text-lg font-bold text-slate-900` (never color-coded like a "deal").
- **Layout rhythm:** page container `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`; `py-16 sm:py-20` between major sections; cards `rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200`; product images locked to `aspect-square` with `object-cover`.
- Motion is restrained: `whileInView` fade/slide-up entrance on scroll, 200–300ms hover transitions. No looping/jarring animation.
- Product/settings image URLs are built via `utils/imageUrl.js` — no component ever hand-constructs an `/uploads/...` path itself.
- Search/filter/sort/page state lives in the URL (`useSearchParams`), never local-only component state, so results are bookmarkable/shareable and survive a refresh.
- The public product/category responses never include `commissionRate` — this is already enforced backend-side; the frontend simply never expects or reads that field.
- View tracking (`POST /api/public/views`) fires at most once per browser session (guarded by `sessionStorage`). Click tracking (`POST /api/public/products/{id}/click`) is best-effort/fire-and-forget — a tracking failure must never block or visibly break the "View on Amazon" link.
- The "View on Amazon" control is a real `<a>` element (`href`, `target="_blank"`, `rel="nofollow sponsored noopener noreferrer"`) — not a JS-only `window.open` button — so middle-click/keyboard/right-click "open in new tab" all work natively; click tracking fires from the `onClick` handler without `preventDefault()`, so it never blocks or delays the browser's native navigation.
- Never commit `.env`.

---

### Task 1: Public services + image URL utility

**Files:**
- Create: `frontend/src/services/productService.js`
- Create: `frontend/src/services/categoryService.js`
- Create: `frontend/src/services/settingsService.js`
- Create: `frontend/src/services/trackingService.js`
- Create: `frontend/src/utils/imageUrl.js`
- Test: `frontend/src/utils/imageUrl.test.js`
- Test: `frontend/src/services/trackingService.test.js`

**Interfaces:**
- Consumes: shared `api` Axios instance (Frontend Stage 1, `frontend/src/services/api.js`)
- Produces: `searchProducts(params): Promise<PageResponse>`, `getProductById(id): Promise<Product>`, `getCategories(): Promise<Category[]>`, `getSettings(): Promise<Settings>`, `recordView(): Promise<{ sessionId }>`, `recordClick(productId, sessionId): Promise<void>`, `getImageUrl(filename): string|null` — every later task's components/hooks call these, never `axios`/`fetch` directly.

- [ ] **Step 1: Write the failing tests**

`frontend/src/utils/imageUrl.test.js`:
```javascript
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getImageUrl } from './imageUrl.js';

describe('getImageUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('derives the backend origin from VITE_API_BASE_URL and appends /uploads/{filename}', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080/api');
    expect(getImageUrl('img_20260726_120000_001.jpg')).toBe(
      'http://localhost:8080/uploads/img_20260726_120000_001.jpg'
    );
  });

  it('handles a production-style base URL', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.2gofindz.com/api');
    expect(getImageUrl('logo.png')).toBe('https://api.2gofindz.com/uploads/logo.png');
  });

  it('returns null when filename is falsy', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080/api');
    expect(getImageUrl(null)).toBeNull();
    expect(getImageUrl(undefined)).toBeNull();
    expect(getImageUrl('')).toBeNull();
  });
});
```

`frontend/src/services/trackingService.test.js`:
```javascript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import api from './api.js';
import { recordView, recordClick } from './trackingService.js';

describe('trackingService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('recordView posts to /public/views and returns the session data', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({
      data: { success: true, message: 'View recorded.', data: { sessionId: 'abc-123' } },
    });

    const result = await recordView();

    expect(api.post).toHaveBeenCalledWith('/public/views');
    expect(result).toEqual({ sessionId: 'abc-123' });
  });

  it('recordClick posts to the product click endpoint with the session id', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true, message: 'Click recorded.', data: null } });

    await recordClick(42, 'abc-123');

    expect(api.post).toHaveBeenCalledWith('/public/products/42/click', { sessionId: 'abc-123' });
  });

  it('recordClick omits the body when there is no session id', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true, message: 'Click recorded.', data: null } });

    await recordClick(42, null);

    expect(api.post).toHaveBeenCalledWith('/public/products/42/click', undefined);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- imageUrl.test.js trackingService.test.js`
Expected: FAIL — none of the files below exist yet.

- [ ] **Step 3: Write `imageUrl.js`**

```javascript
export function getImageUrl(filename) {
  if (!filename) return null;
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
  const origin = apiBaseUrl.replace(/\/api\/?$/, '');
  return `${origin}/uploads/${filename}`;
}
```

- [ ] **Step 4: Write the four service files**

`frontend/src/services/productService.js`:
```javascript
import api from './api.js';

export async function searchProducts(params) {
  const response = await api.get('/public/products', { params });
  return response.data.data;
}

export async function getProductById(id) {
  const response = await api.get(`/public/products/${id}`);
  return response.data.data;
}
```

`frontend/src/services/categoryService.js`:
```javascript
import api from './api.js';

export async function getCategories() {
  const response = await api.get('/public/categories');
  return response.data.data;
}
```

`frontend/src/services/settingsService.js`:
```javascript
import api from './api.js';

export async function getSettings() {
  const response = await api.get('/public/settings');
  return response.data.data;
}
```

`frontend/src/services/trackingService.js`:
```javascript
import api from './api.js';

export async function recordView() {
  const response = await api.post('/public/views');
  return response.data.data;
}

export async function recordClick(productId, sessionId) {
  await api.post(`/public/products/${productId}/click`, sessionId ? { sessionId } : undefined);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npm test -- imageUrl.test.js trackingService.test.js`
Expected: PASS

- [ ] **Step 6: Run the full suite to confirm no regressions**

Run: `cd frontend && npm test`
Expected: PASS (all Frontend Stage 1 tests + this task's)

- [ ] **Step 7: Commit**

```bash
git add frontend/src/services/productService.js frontend/src/services/categoryService.js \
        frontend/src/services/settingsService.js frontend/src/services/trackingService.js \
        frontend/src/services/trackingService.test.js frontend/src/utils/imageUrl.js \
        frontend/src/utils/imageUrl.test.js
git commit -m "feat: add public product/category/settings/tracking services and image URL utility"
```

---

### Task 2: `useProductSearch` hook

**Files:**
- Create: `frontend/src/hooks/useProductSearch.js`
- Test: `frontend/src/hooks/useProductSearch.test.jsx`

**Interfaces:**
- Consumes: `searchProducts` (Task 1)
- Produces: `useProductSearch(): { products, totalPages, totalElements, isLoading, error, search, categoryId, filter, sort, page, setSearch(value), setCategoryId(value), setFilter(value), setSort(value), setPage(value) }`. `filter` is one of `'all' | 'trending' | 'bestSeller'`. `sort` is one of `'oldest' | 'newest' | 'priceLowToHigh' | 'priceHighToLow' | 'nameAZ' | 'nameZA'`. Every later task's search/filter/catalog UI reads and calls these exact names.

- [ ] **Step 1: Write the failing test**

```jsx
import { renderHook, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useProductSearch } from './useProductSearch.js';
import * as productService from '../services/productService.js';

function wrapper({ children }) {
  return <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>;
}

describe('useProductSearch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches products on mount with the default (oldest-first) sort and no filters', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [{ id: 1, name: 'Product One' }],
      totalPages: 1,
      totalElements: 1,
    });

    const { result } = renderHook(() => useProductSearch(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(productService.searchProducts).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, size: 12, sort: 'createdAt,asc' })
    );
    expect(result.current.products).toEqual([{ id: 1, name: 'Product One' }]);
    expect(result.current.totalPages).toBe(1);
  });

  it('setSearch updates the search param and refetches, resetting to page 1', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [],
      totalPages: 0,
      totalElements: 0,
    });

    const { result } = renderHook(() => useProductSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setSearch('earbuds');
    });

    await waitFor(() => expect(result.current.search).toBe('earbuds'));
    expect(productService.searchProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'earbuds', page: 0 })
    );
  });

  it('setFilter("trending") sends trending=true and setFilter("all") clears it', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [],
      totalPages: 0,
      totalElements: 0,
    });

    const { result } = renderHook(() => useProductSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setFilter('trending');
    });
    await waitFor(() => expect(result.current.filter).toBe('trending'));
    expect(productService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ trending: true }));

    act(() => {
      result.current.setFilter('all');
    });
    await waitFor(() => expect(result.current.filter).toBe('all'));
    const lastCallParams = productService.searchProducts.mock.calls.at(-1)[0];
    expect(lastCallParams.trending).toBeUndefined();
    expect(lastCallParams.bestSeller).toBeUndefined();
  });

  it('setSort maps friendly sort values to the backend sort syntax', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [],
      totalPages: 0,
      totalElements: 0,
    });

    const { result } = renderHook(() => useProductSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setSort('priceLowToHigh');
    });

    await waitFor(() => expect(result.current.sort).toBe('priceLowToHigh'));
    expect(productService.searchProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: 'productPrice,asc' })
    );
  });

  it('setPage sends the zero-indexed page to the backend', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [],
      totalPages: 5,
      totalElements: 50,
    });

    const { result } = renderHook(() => useProductSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setPage(3);
    });

    await waitFor(() => expect(result.current.page).toBe(3));
    expect(productService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  });

  it('exposes an error message when the fetch fails', async () => {
    vi.spyOn(productService, 'searchProducts').mockRejectedValue({ message: 'Network error. Please try again.' });

    const { result } = renderHook(() => useProductSearch(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Network error. Please try again.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- useProductSearch.test.jsx`
Expected: FAIL — `useProductSearch.js` doesn't exist yet.

- [ ] **Step 3: Write `useProductSearch.js`**

```javascript
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchProducts } from '../services/productService.js';

const SORT_MAP = {
  oldest: 'createdAt,asc',
  newest: 'createdAt,desc',
  priceLowToHigh: 'productPrice,asc',
  priceHighToLow: 'productPrice,desc',
  nameAZ: 'name,asc',
  nameZA: 'name,desc',
};

const PAGE_SIZE = 12;

export function useProductSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const search = searchParams.get('search') ?? '';
  const categoryId = searchParams.get('category') ?? '';
  const filter = searchParams.get('filter') ?? 'all';
  const sort = searchParams.get('sort') ?? 'oldest';
  const page = Number(searchParams.get('page') ?? '1');

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    const params = {
      page: page - 1,
      size: PAGE_SIZE,
      sort: SORT_MAP[sort] ?? SORT_MAP.oldest,
    };
    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;
    if (filter === 'trending') params.trending = true;
    if (filter === 'bestSeller') params.bestSeller = true;

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
  }, [search, categoryId, filter, sort, page]);

  const updateParams = useCallback(
    (updates, { resetPage = true } = {}) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === '' || value === null || value === undefined) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      if (resetPage) {
        next.delete('page');
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  return {
    products,
    totalPages,
    totalElements,
    isLoading,
    error,
    search,
    categoryId,
    filter,
    sort,
    page,
    setSearch: (value) => updateParams({ search: value }),
    setCategoryId: (value) => updateParams({ category: value }),
    setFilter: (value) => updateParams({ filter: value === 'all' ? '' : value }),
    setSort: (value) => updateParams({ sort: value === 'oldest' ? '' : value }),
    setPage: (value) => updateParams({ page: value === 1 ? '' : value }, { resetPage: false }),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- useProductSearch.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useProductSearch.js frontend/src/hooks/useProductSearch.test.jsx
git commit -m "feat: add useProductSearch hook with URL-param-driven state"
```

---

### Task 3: `ProductCard`, `ProductGrid`, `SectionHeading`

**Files:**
- Create: `frontend/src/components/SectionHeading.jsx`
- Create: `frontend/src/components/ProductCard.jsx`
- Create: `frontend/src/components/ProductGrid.jsx`
- Test: `frontend/src/components/ProductCard.test.jsx`
- Test: `frontend/src/components/ProductGrid.test.jsx`

**Interfaces:**
- Consumes: `getImageUrl` (Task 1), `recordClick` (Task 1), `LoadingSpinner`/`EmptyState`/`ErrorState` (Frontend Stage 1)
- Produces: `<ProductCard product={Product} />`, `<ProductGrid products={Product[]} isLoading={bool} error={string|null} onRetry={fn?} />`, `<SectionHeading title description? />` — the main catalog and every curated-teaser section (Task 7) render through these.

**Note on test environment noise:** clicking a real `<a target="_blank">` in jsdom prints a benign `Not implemented: navigation (except hash changes)` warning to stderr — this is expected jsdom behavior (same category as the React Router future-flag warnings from Frontend Stage 1), not a test failure. Do not attempt to suppress or "fix" it.

- [ ] **Step 1: Write the failing tests**

`frontend/src/components/ProductCard.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ProductCard from './ProductCard.jsx';
import * as trackingService from '../services/trackingService.js';

const baseProduct = {
  id: 1,
  name: 'Wireless Earbuds',
  description: 'Compact wireless earbuds with noise cancellation.',
  categoryId: 2,
  categoryName: 'Electronics',
  imageFileName: 'img_20260726_120000_001.jpg',
  productPrice: '49.99',
  productLink: 'https://amazon.com/dp/example',
  trending: true,
  bestSeller: false,
  active: true,
  createdAt: '2026-07-20T10:00:00',
  updatedAt: '2026-07-20T10:00:00',
};

describe('ProductCard', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders product details and the trending badge only', () => {
    render(<ProductCard product={baseProduct} />);

    expect(screen.getByText('Wireless Earbuds')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('$49.99')).toBeInTheDocument();
    expect(screen.getByText('Trending')).toBeInTheDocument();
    expect(screen.queryByText('Best Seller')).not.toBeInTheDocument();
  });

  it('renders the "View on Amazon" link with the correct href and rel attributes', () => {
    render(<ProductCard product={baseProduct} />);

    const link = screen.getByRole('link', { name: /view on amazon/i });
    expect(link).toHaveAttribute('href', baseProduct.productLink);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'nofollow sponsored noopener noreferrer');
  });

  it('records a click with the stored session id when "View on Amazon" is clicked', async () => {
    sessionStorage.setItem('sessionId', 'test-session-abc');
    vi.spyOn(trackingService, 'recordClick').mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ProductCard product={baseProduct} />);

    await user.click(screen.getByRole('link', { name: /view on amazon/i }));

    expect(trackingService.recordClick).toHaveBeenCalledWith(baseProduct.id, 'test-session-abc');
  });

  it('renders a placeholder message when there is no product image', () => {
    render(<ProductCard product={{ ...baseProduct, imageFileName: null }} />);

    expect(screen.getByText('No image available')).toBeInTheDocument();
  });
});
```

`frontend/src/components/ProductGrid.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductGrid from './ProductGrid.jsx';

const product = {
  id: 1,
  name: 'Wireless Earbuds',
  description: 'Compact wireless earbuds.',
  categoryId: 2,
  categoryName: 'Electronics',
  imageFileName: null,
  productPrice: '49.99',
  productLink: 'https://amazon.com/dp/example',
  trending: false,
  bestSeller: false,
  active: true,
  createdAt: '2026-07-20T10:00:00',
};

describe('ProductGrid', () => {
  it('shows a loading spinner while loading', () => {
    render(<ProductGrid products={[]} isLoading error={null} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows an error state when there is an error', () => {
    render(<ProductGrid products={[]} isLoading={false} error="Failed to load products." />);
    expect(screen.getByText('Failed to load products.')).toBeInTheDocument();
  });

  it('shows an empty state when there are no products', () => {
    render(<ProductGrid products={[]} isLoading={false} error={null} />);
    expect(screen.getByText('No products found')).toBeInTheDocument();
  });

  it('renders a product card for each product', () => {
    render(<ProductGrid products={[product]} isLoading={false} error={null} />);
    expect(screen.getByText('Wireless Earbuds')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- ProductCard.test.jsx ProductGrid.test.jsx`
Expected: FAIL — none of the components exist yet.

- [ ] **Step 3: Write `SectionHeading.jsx`**

```jsx
function SectionHeading({ title, description }) {
  return (
    <div className="mb-8 text-center">
      <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">{description}</p>}
    </div>
  );
}

export default SectionHeading;
```

- [ ] **Step 4: Write `ProductCard.jsx`**

```jsx
import { motion } from 'framer-motion';
import { getImageUrl } from '../utils/imageUrl.js';
import { recordClick } from '../services/trackingService.js';

function formatDate(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function ProductCard({ product }) {
  const imageUrl = getImageUrl(product.imageFileName);

  function handleViewOnAmazon() {
    const sessionId = sessionStorage.getItem('sessionId');
    recordClick(product.id, sessionId).catch(() => {
      // Click tracking is best-effort; never block the link's native navigation on a tracking failure.
    });
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.3 }}
      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
            No image available
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1.5">
          {product.trending && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Trending
            </span>
          )}
          {product.bestSeller && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
              Best Seller
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-indigo-600">{product.categoryName}</span>
        <h3 className="text-base font-semibold text-slate-900">{product.name}</h3>
        <p className="line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">{product.description}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-lg font-bold text-slate-900">${Number(product.productPrice).toFixed(2)}</span>
          <span className="text-xs text-slate-400">Added {formatDate(product.createdAt)}</span>
        </div>
        <a
          href={product.productLink}
          onClick={handleViewOnAmazon}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="mt-2 inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          View on Amazon
        </a>
      </div>
    </motion.article>
  );
}

export default ProductCard;
```

- [ ] **Step 5: Write `ProductGrid.jsx`**

```jsx
import ProductCard from './ProductCard.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import EmptyState from './EmptyState.jsx';
import ErrorState from './ErrorState.jsx';

function ProductGrid({ products, isLoading, error, onRetry }) {
  if (isLoading) {
    return <LoadingSpinner label="Loading products..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (products.length === 0) {
    return <EmptyState title="No products found" description="Try adjusting your search or filters." />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default ProductGrid;
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd frontend && npm test -- ProductCard.test.jsx ProductGrid.test.jsx`
Expected: PASS

- [ ] **Step 7: Run the full suite to confirm no regressions**

Run: `cd frontend && npm test`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/SectionHeading.jsx frontend/src/components/ProductCard.jsx \
        frontend/src/components/ProductGrid.jsx frontend/src/components/ProductCard.test.jsx \
        frontend/src/components/ProductGrid.test.jsx
git commit -m "feat: add ProductCard, ProductGrid, and SectionHeading components"
```

---

### Task 4: `SearchInput`, `FilterDropdown`, `ProductFilters`, `Pagination`

**Files:**
- Create: `frontend/src/components/SearchInput.jsx`
- Create: `frontend/src/components/FilterDropdown.jsx`
- Create: `frontend/src/components/ProductFilters.jsx`
- Create: `frontend/src/components/Pagination.jsx`
- Test: `frontend/src/components/SearchInput.test.jsx`
- Test: `frontend/src/components/Pagination.test.jsx`

**Interfaces:**
- Consumes: nothing new
- Produces: `<SearchInput value={string} onChange={fn} />` (debounces internally, ~300ms), `<FilterDropdown label value options={{value,label}[]} onChange={fn} />`, `<ProductFilters filter onFilterChange categoryId categories onCategoryChange sort onSortChange />`, `<Pagination page totalPages onPageChange={fn} />` — Task 7's main catalog section wires all four directly to `useProductSearch`'s return values.

- [ ] **Step 1: Write the failing tests**

`frontend/src/components/SearchInput.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import SearchInput from './SearchInput.jsx';

describe('SearchInput', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onChange after the debounce delay, not on every keystroke', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    render(<SearchInput value="" onChange={onChange} />);

    await user.type(screen.getByLabelText('Search products'), 'ear');
    expect(onChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(onChange).toHaveBeenCalledWith('ear');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('reflects an externally-updated value (e.g. cleared via the URL)', () => {
    const { rerender } = render(<SearchInput value="earbuds" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Search products')).toHaveValue('earbuds');

    rerender(<SearchInput value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Search products')).toHaveValue('');
  });
});
```

`frontend/src/components/Pagination.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Pagination from './Pagination.jsx';

describe('Pagination', () => {
  it('renders nothing when there is only one page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a button per page and highlights the current page', () => {
    render(<Pagination page={2} totalPages={3} onPageChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
  });

  it('disables Previous on the first page and Next on the last page', () => {
    render(<Pagination page={1} totalPages={3} onPageChange={vi.fn()} />);
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    expect(screen.getByLabelText('Next page')).not.toBeDisabled();
  });

  it('calls onPageChange with the clicked page number', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<Pagination page={1} totalPages={3} onPageChange={onPageChange} />);

    await user.click(screen.getByRole('button', { name: '3' }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- SearchInput.test.jsx Pagination.test.jsx`
Expected: FAIL — none of the components exist yet.

- [ ] **Step 3: Write `SearchInput.jsx`**

```jsx
import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';

function SearchInput({ value, onChange, placeholder = 'Search products...' }) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleChange(event) {
    const next = event.target.value;
    setLocalValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(next), 300);
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label="Search products"
        className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

export default SearchInput;
```

- [ ] **Step 4: Write `FilterDropdown.jsx` and `ProductFilters.jsx`**

`frontend/src/components/FilterDropdown.jsx`:
```jsx
function FilterDropdown({ label, value, options, onChange }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default FilterDropdown;
```

`frontend/src/components/ProductFilters.jsx`:
```jsx
import FilterDropdown from './FilterDropdown.jsx';

const QUICK_FILTERS = [
  { value: 'all', label: 'All Products' },
  { value: 'trending', label: 'Trending' },
  { value: 'bestSeller', label: 'Best Sellers' },
];

const SORT_OPTIONS = [
  { value: 'oldest', label: 'Oldest Added' },
  { value: 'newest', label: 'Newest Added' },
  { value: 'priceLowToHigh', label: 'Price: Low to High' },
  { value: 'priceHighToLow', label: 'Price: High to Low' },
  { value: 'nameAZ', label: 'Product Name: A-Z' },
  { value: 'nameZA', label: 'Product Name: Z-A' },
];

function ProductFilters({ filter, onFilterChange, categoryId, categories, onCategoryChange, sort, onSortChange }) {
  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map((category) => ({ value: String(category.id), label: category.productCategoryName })),
  ];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Product filters">
        {QUICK_FILTERS.map((quickFilter) => (
          <button
            key={quickFilter.value}
            type="button"
            onClick={() => onFilterChange(quickFilter.value)}
            aria-pressed={filter === quickFilter.value}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === quickFilter.value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {quickFilter.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <FilterDropdown label="Category" value={categoryId} options={categoryOptions} onChange={onCategoryChange} />
        <FilterDropdown label="Sort by" value={sort} options={SORT_OPTIONS} onChange={onSortChange} />
      </div>
    </div>
  );
}

export default ProductFilters;
```

- [ ] **Step 5: Write `Pagination.jsx`**

```jsx
import { ChevronLeft, ChevronRight } from 'lucide-react';

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1 pt-8">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={18} />
      </button>

      {pageNumbers.map((pageNumber) => (
        <button
          key={pageNumber}
          type="button"
          onClick={() => onPageChange(pageNumber)}
          aria-current={pageNumber === page ? 'page' : undefined}
          className={`h-9 w-9 rounded-md text-sm font-medium transition ${
            pageNumber === page ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          {pageNumber}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}

export default Pagination;
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd frontend && npm test -- SearchInput.test.jsx Pagination.test.jsx`
Expected: PASS

- [ ] **Step 7: Run the full suite to confirm no regressions**

Run: `cd frontend && npm test`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/SearchInput.jsx frontend/src/components/FilterDropdown.jsx \
        frontend/src/components/ProductFilters.jsx frontend/src/components/Pagination.jsx \
        frontend/src/components/SearchInput.test.jsx frontend/src/components/Pagination.test.jsx
git commit -m "feat: add SearchInput, FilterDropdown, ProductFilters, and Pagination components"
```

---

### Task 5: `Navbar`, `HeroSection`, `SocialLinks`

**Files:**
- Create: `frontend/src/components/Navbar.jsx`
- Create: `frontend/src/components/HeroSection.jsx`
- Create: `frontend/src/components/SocialLinks.jsx`
- Test: `frontend/src/components/SocialLinks.test.jsx`
- Test: `frontend/src/components/HeroSection.test.jsx`

**Interfaces:**
- Consumes: nothing new
- Produces: `<Navbar />`, `<HeroSection headline description onExploreClick onTrendingClick />`, `<SocialLinks settings={Settings|null} />` — Task 7 wires these into `HomePage` using data from `settingsService.getSettings()`.

- [ ] **Step 1: Write the failing tests**

`frontend/src/components/SocialLinks.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SocialLinks from './SocialLinks.jsx';

describe('SocialLinks', () => {
  it('renders a link for each configured platform with correct target/rel', () => {
    render(
      <SocialLinks
        settings={{
          tiktokUrl: 'https://tiktok.com/@2gofindz',
          pinterestUrl: 'https://pinterest.com/2gofindz',
          instagramUrl: 'https://instagram.com/2gofindz',
          youtubeUrl: 'https://youtube.com/@2gofindz',
        }}
      />
    );

    const tiktokLink = screen.getByRole('link', { name: /tiktok/i });
    expect(tiktokLink).toHaveAttribute('href', 'https://tiktok.com/@2gofindz');
    expect(tiktokLink).toHaveAttribute('target', '_blank');
    expect(tiktokLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: /pinterest/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /instagram/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /youtube/i })).toBeInTheDocument();
  });

  it('omits links for platforms with no configured URL', () => {
    render(<SocialLinks settings={{ tiktokUrl: 'https://tiktok.com/@2gofindz' }} />);

    expect(screen.getByRole('link', { name: /tiktok/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /instagram/i })).not.toBeInTheDocument();
  });

  it('renders nothing when settings is null or has no social URLs', () => {
    const { container } = render(<SocialLinks settings={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

`frontend/src/components/HeroSection.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import HeroSection from './HeroSection.jsx';

describe('HeroSection', () => {
  it('renders the provided headline and description', () => {
    render(
      <HeroSection
        headline="Smart Finds. Better Buys."
        description="Curated picks."
        onExploreClick={vi.fn()}
        onTrendingClick={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: 'Smart Finds. Better Buys.' })).toBeInTheDocument();
    expect(screen.getByText('Curated picks.')).toBeInTheDocument();
  });

  it('calls the respective handlers when each CTA is clicked', async () => {
    const onExploreClick = vi.fn();
    const onTrendingClick = vi.fn();
    const user = userEvent.setup();
    render(
      <HeroSection
        headline="Headline"
        description="Description"
        onExploreClick={onExploreClick}
        onTrendingClick={onTrendingClick}
      />
    );

    await user.click(screen.getByRole('button', { name: /explore products/i }));
    expect(onExploreClick).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /view trending finds/i }));
    expect(onTrendingClick).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- SocialLinks.test.jsx HeroSection.test.jsx`
Expected: FAIL — none of the components exist yet.

- [ ] **Step 3: Write `Navbar.jsx`**

```jsx
import { Link } from 'react-router-dom';

function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="text-lg font-bold text-slate-900">
          2Go Findz
        </Link>
      </div>
    </header>
  );
}

export default Navbar;
```

- [ ] **Step 4: Write `HeroSection.jsx`**

```jsx
import { motion } from 'framer-motion';

function HeroSection({ headline, description, onExploreClick, onTrendingClick }) {
  return (
    <section className="bg-indigo-50 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl"
        >
          {headline}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mx-auto mt-6 max-w-2xl text-base text-slate-600 sm:text-lg"
        >
          {description}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <button
            type="button"
            onClick={onExploreClick}
            className="rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Explore Products
          </button>
          <button
            type="button"
            onClick={onTrendingClick}
            className="rounded-md border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            View Trending Finds
          </button>
        </motion.div>
      </div>
    </section>
  );
}

export default HeroSection;
```

- [ ] **Step 5: Write `SocialLinks.jsx`**

Lucide-React icons and inline custom SVGs are both sized via a `className` (not lucide's `size` prop) so both render consistently at the same size:

```jsx
import { Instagram, Youtube } from 'lucide-react';

function TikTokIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z" />
    </svg>
  );
}

function PinterestIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 0a12 12 0 0 0-4.37 23.17c-.06-.94-.11-2.38.02-3.4.12-.93.8-5.95.8-5.95s-.2-.41-.2-1.01c0-.94.55-1.65 1.23-1.65.58 0 .86.44.86.96 0 .59-.37 1.46-.57 2.28-.16.68.35 1.24 1.02 1.24 1.22 0 2.16-1.29 2.16-3.15 0-1.65-1.18-2.8-2.87-2.8-1.96 0-3.11 1.47-3.11 2.98 0 .59.23 1.22.51 1.57a.2.2 0 0 1 .05.2c-.05.22-.18.68-.2.78-.03.13-.11.16-.25.1-.94-.44-1.53-1.81-1.53-2.91 0-2.37 1.72-4.55 4.96-4.55 2.6 0 4.63 1.86 4.63 4.34 0 2.59-1.63 4.67-3.9 4.67-.76 0-1.48-.4-1.72-.86l-.47 1.78c-.17.65-.63 1.47-.94 1.97A12 12 0 1 0 12 0z" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { key: 'tiktokUrl', label: 'TikTok', Icon: TikTokIcon },
  { key: 'pinterestUrl', label: 'Pinterest', Icon: PinterestIcon },
  { key: 'instagramUrl', label: 'Instagram', Icon: Instagram },
  { key: 'youtubeUrl', label: 'YouTube', Icon: Youtube },
];

function SocialLinks({ settings }) {
  const links = SOCIAL_LINKS.filter((link) => settings?.[link.key]);

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {links.map(({ key, label, Icon }) => (
        <a
          key={key}
          href={settings[key]}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600"
        >
          <Icon className="h-[18px] w-[18px]" />
          {label}
        </a>
      ))}
    </div>
  );
}

export default SocialLinks;
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd frontend && npm test -- SocialLinks.test.jsx HeroSection.test.jsx`
Expected: PASS

- [ ] **Step 7: Run the full suite to confirm no regressions**

Run: `cd frontend && npm test`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/Navbar.jsx frontend/src/components/HeroSection.jsx \
        frontend/src/components/SocialLinks.jsx frontend/src/components/SocialLinks.test.jsx \
        frontend/src/components/HeroSection.test.jsx
git commit -m "feat: add Navbar, HeroSection, and SocialLinks components"
```

---

### Task 6: `CategoryCard`, `AffiliateDisclosure`, `Footer`

**Files:**
- Create: `frontend/src/components/CategoryCard.jsx`
- Create: `frontend/src/components/AffiliateDisclosure.jsx`
- Create: `frontend/src/components/Footer.jsx`
- Test: `frontend/src/components/CategoryCard.test.jsx`
- Test: `frontend/src/components/Footer.test.jsx`

**Interfaces:**
- Consumes: `SocialLinks` (Task 5)
- Produces: `<CategoryCard category={Category} onClick={fn(categoryId)} />`, `<AffiliateDisclosure text={string?} />`, `<Footer settings={Settings|null} />` — Task 7's Shop-by-Category section and page footer use these.

- [ ] **Step 1: Write the failing tests**

`frontend/src/components/CategoryCard.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CategoryCard from './CategoryCard.jsx';

describe('CategoryCard', () => {
  it('renders the category name', () => {
    render(<CategoryCard category={{ id: 1, productCategoryName: 'Electronics' }} onClick={vi.fn()} />);
    expect(screen.getByText('Electronics')).toBeInTheDocument();
  });

  it('calls onClick with the category id when clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<CategoryCard category={{ id: 7, productCategoryName: 'Home & Kitchen' }} onClick={onClick} />);

    await user.click(screen.getByRole('button', { name: 'Home & Kitchen' }));

    expect(onClick).toHaveBeenCalledWith(7);
  });
});
```

`frontend/src/components/Footer.test.jsx`:
```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Footer from './Footer.jsx';

describe('Footer', () => {
  it('renders the affiliate disclosure text from settings', () => {
    render(<Footer settings={{ affiliateDisclosure: 'Custom disclosure text.' }} />);
    expect(screen.getByText('Custom disclosure text.')).toBeInTheDocument();
  });

  it('falls back to the default disclosure text when settings has none', () => {
    render(<Footer settings={null} />);
    expect(
      screen.getByText(/as an amazon associate, 2go findz may earn from qualifying purchases/i)
    ).toBeInTheDocument();
  });

  it('renders a mailto link for the configured contact email', () => {
    render(<Footer settings={{ contactEmail: 'hello@2gofindz.com' }} />);
    expect(screen.getByRole('link', { name: 'hello@2gofindz.com' })).toHaveAttribute(
      'href',
      'mailto:hello@2gofindz.com'
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- CategoryCard.test.jsx Footer.test.jsx`
Expected: FAIL — none of the components exist yet.

- [ ] **Step 3: Write `CategoryCard.jsx`**

```jsx
import { motion } from 'framer-motion';

function CategoryCard({ category, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={() => onClick(category.id)}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <span className="text-base font-semibold text-slate-900">{category.productCategoryName}</span>
    </motion.button>
  );
}

export default CategoryCard;
```

- [ ] **Step 4: Write `AffiliateDisclosure.jsx` and `Footer.jsx`**

`frontend/src/components/AffiliateDisclosure.jsx`:
```jsx
function AffiliateDisclosure({ text }) {
  return (
    <p className="text-sm leading-relaxed text-slate-500">
      {text ||
        'As an Amazon Associate, 2Go Findz may earn from qualifying purchases. Product prices and availability may change at any time.'}
    </p>
  );
}

export default AffiliateDisclosure;
```

`frontend/src/components/Footer.jsx`:
```jsx
import SocialLinks from './SocialLinks.jsx';
import AffiliateDisclosure from './AffiliateDisclosure.jsx';

function Footer({ settings }) {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 text-center sm:px-6 lg:px-8">
        <span className="text-lg font-bold text-slate-900">2Go Findz</span>
        <SocialLinks settings={settings} />
        <AffiliateDisclosure text={settings?.affiliateDisclosure} />
        {settings?.contactEmail && (
          <a href={`mailto:${settings.contactEmail}`} className="text-sm text-indigo-600 hover:underline">
            {settings.contactEmail}
          </a>
        )}
        <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} 2Go Findz. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npm test -- CategoryCard.test.jsx Footer.test.jsx`
Expected: PASS

- [ ] **Step 6: Run the full suite to confirm no regressions**

Run: `cd frontend && npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/CategoryCard.jsx frontend/src/components/AffiliateDisclosure.jsx \
        frontend/src/components/Footer.jsx frontend/src/components/CategoryCard.test.jsx \
        frontend/src/components/Footer.test.jsx
git commit -m "feat: add CategoryCard, AffiliateDisclosure, and Footer components"
```

---

### Task 7: Full `HomePage` assembly — curated teasers, catalog, tracking, final wiring

**Files:**
- Modify: `frontend/src/pages/HomePage.jsx` (replace Frontend Stage 1's placeholder body entirely)
- Test: `frontend/src/pages/HomePage.test.jsx`

**Interfaces:**
- Consumes: every component/hook/service from Tasks 1–6
- Produces: the complete `/` route — nothing downstream in this stage consumes `HomePage` itself.

**Note:** `App.jsx` already routes `/` to `HomePage` (unchanged since Frontend Stage 1) — this task only replaces `HomePage.jsx`'s internal content, no routing change needed.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import HomePage from './HomePage.jsx';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';
import * as productService from '../services/productService.js';
import * as trackingService from '../services/trackingService.js';

const settings = {
  heroHeadline: 'Smart Finds. Better Buys. All in One Place.',
  heroDescription: 'Discover trending Amazon products.',
  affiliateDisclosure: 'As an Amazon Associate, 2Go Findz may earn from qualifying purchases.',
  tiktokUrl: 'https://tiktok.com/@2gofindz',
};

const categories = [{ id: 1, productCategoryName: 'Electronics' }];

const product = {
  id: 1,
  name: 'Wireless Earbuds',
  description: 'Compact wireless earbuds.',
  categoryId: 1,
  categoryName: 'Electronics',
  imageFileName: null,
  productPrice: '49.99',
  productLink: 'https://amazon.com/dp/example',
  trending: true,
  bestSeller: false,
  active: true,
  createdAt: '2026-07-20T10:00:00',
};

function renderHomePage() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <HomePage />
    </MemoryRouter>
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(settings);
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue(categories);
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [product],
      totalPages: 1,
      totalElements: 1,
    });
    vi.spyOn(trackingService, 'recordView').mockResolvedValue({ sessionId: 'session-abc' });
  });

  it('renders the hero headline from settings', async () => {
    renderHomePage();
    expect(await screen.findByRole('heading', { name: settings.heroHeadline })).toBeInTheDocument();
  });

  it('renders the shop-by-category section and the main catalog with fetched products', async () => {
    renderHomePage();

    expect(await screen.findByText('Electronics')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('Wireless Earbuds').length).toBeGreaterThan(0));
  });

  it('records a website view exactly once per session on mount', async () => {
    renderHomePage();

    await waitFor(() => expect(trackingService.recordView).toHaveBeenCalledTimes(1));
    expect(sessionStorage.getItem('sessionId')).toBe('session-abc');
  });

  it('does not record a second view when a session already exists', async () => {
    sessionStorage.setItem('sessionId', 'existing-session');
    renderHomePage();

    await screen.findByRole('heading', { name: settings.heroHeadline });
    expect(trackingService.recordView).not.toHaveBeenCalled();
  });

  it('renders the affiliate disclosure in the footer', async () => {
    renderHomePage();
    expect(await screen.findByText(settings.affiliateDisclosure)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- HomePage.test.jsx`
Expected: FAIL — the current placeholder `HomePage` renders none of this.

- [ ] **Step 3: Write the new `HomePage.jsx`**

```jsx
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import HeroSection from '../components/HeroSection.jsx';
import SocialLinks from '../components/SocialLinks.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import CategoryCard from '../components/CategoryCard.jsx';
import ProductFilters from '../components/ProductFilters.jsx';
import SearchInput from '../components/SearchInput.jsx';
import Pagination from '../components/Pagination.jsx';
import Footer from '../components/Footer.jsx';
import { useProductSearch } from '../hooks/useProductSearch.js';
import { getSettings } from '../services/settingsService.js';
import { getCategories } from '../services/categoryService.js';
import { searchProducts } from '../services/productService.js';
import { recordView } from '../services/trackingService.js';

function useTeaserProducts(params) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    searchProducts({ ...params, page: 0, size: 8 })
      .then((data) => {
        if (!isCancelled) setProducts(data.content);
      })
      .catch(() => {
        if (!isCancelled) setProducts([]);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });
    return () => {
      isCancelled = true;
    };
    // params is a stable literal passed by the caller at each call site; re-running this
    // effect only on mount is intentional for a homepage teaser section.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { products, isLoading };
}

function HomePage() {
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const productSearch = useProductSearch();
  const featured = useTeaserProducts({ sort: 'createdAt,desc' });
  const trending = useTeaserProducts({ trending: true, sort: 'createdAt,desc' });
  const bestSellers = useTeaserProducts({ bestSeller: true, sort: 'createdAt,desc' });

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!sessionStorage.getItem('sessionId')) {
      recordView()
        .then(({ sessionId }) => sessionStorage.setItem('sessionId', sessionId))
        .catch(() => {
          // View tracking is best-effort; never block page rendering on it.
        });
    }
  }, []);

  function scrollToCatalog() {
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  }

  function handleCategorySelect(categoryId) {
    productSearch.setCategoryId(String(categoryId));
    scrollToCatalog();
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <HeroSection
        headline={settings?.heroHeadline ?? 'Smart Finds. Better Buys. All in One Place.'}
        description={
          settings?.heroDescription ??
          'Discover trending Amazon products, everyday essentials, affordable finds, and must-have items carefully selected to help you shop smarter.'
        }
        onExploreClick={scrollToCatalog}
        onTrendingClick={() => {
          productSearch.setFilter('trending');
          scrollToCatalog();
        }}
      />

      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SocialLinks settings={settings} />
        </div>
      </section>

      {featured.products.length > 0 && (
        <section className="bg-slate-50 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading title="Featured Products" />
            <ProductGrid products={featured.products} isLoading={featured.isLoading} error={null} />
          </div>
        </section>
      )}

      {trending.products.length > 0 && (
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading title="Trending Finds" />
            <ProductGrid products={trending.products} isLoading={trending.isLoading} error={null} />
          </div>
        </section>
      )}

      {bestSellers.products.length > 0 && (
        <section className="bg-slate-50 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading title="Best Sellers" />
            <ProductGrid products={bestSellers.products} isLoading={bestSellers.isLoading} error={null} />
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading title="Shop by Category" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} onClick={handleCategorySelect} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="catalog" className="scroll-mt-20 bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Browse All Products" description="Search, filter, and sort our full catalog." />
          <div className="mb-6">
            <SearchInput value={productSearch.search} onChange={productSearch.setSearch} />
          </div>
          <div className="mb-8">
            <ProductFilters
              filter={productSearch.filter}
              onFilterChange={productSearch.setFilter}
              categoryId={productSearch.categoryId}
              categories={categories}
              onCategoryChange={productSearch.setCategoryId}
              sort={productSearch.sort}
              onSortChange={productSearch.setSort}
            />
          </div>
          <ProductGrid
            products={productSearch.products}
            isLoading={productSearch.isLoading}
            error={productSearch.error}
          />
          <Pagination page={productSearch.page} totalPages={productSearch.totalPages} onPageChange={productSearch.setPage} />
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <SectionHeading title="Why Shop with 2Go Findz" />
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Handpicked Selections</h3>
              <p className="mt-2 text-sm text-slate-600">
                Every product is carefully chosen to save you time and help you shop smarter.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Always Up to Date</h3>
              <p className="mt-2 text-sm text-slate-600">New trending finds and best sellers are added regularly.</p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Trusted Recommendations</h3>
              <p className="mt-2 text-sm text-slate-600">
                Transparent, honest picks — no gimmicks, just genuinely useful products.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-indigo-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <SectionHeading title="Follow Us for More Finds" description="Join our community for daily deals and new arrivals." />
          <SocialLinks settings={settings} />
        </div>
      </section>

      <Footer settings={settings} />
    </div>
  );
}

export default HomePage;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- HomePage.test.jsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/HomePage.jsx frontend/src/pages/HomePage.test.jsx
git commit -m "feat: assemble the full public homepage with catalog and view tracking"
```

---

### Task 8: Final verification

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything from Tasks 1–7
- Produces: nothing further downstream — this stage's final gate.

- [ ] **Step 1: Run the entire test suite**

Run: `cd frontend && npm test`
Expected: PASS — every test from Frontend Stage 1 plus Tasks 1 through 7 of this stage.

- [ ] **Step 2: Run lint**

Run: `cd frontend && npm run lint`
Expected: clean (0 errors, 0 warnings) — Frontend Stage 1's final review added ESLint; this stage must not introduce new violations.

- [ ] **Step 3: Run the production build**

Run: `cd frontend && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 4: Manual smoke check (requires the backend running locally)**

With the backend running (`cd backend && mvn spring-boot:run`, real local MySQL, per Backend Stage 1/2's setup) and the frontend dev server running (`cd frontend && npm run dev`), open `http://localhost:5173` in a browser and confirm:
- The hero renders with the seeded default headline/description (or whatever is currently configured in `system_settings`).
- If at least one active product exists, it appears in the catalog grid; searching/filtering/sorting updates the URL and the grid.
- The affiliate disclosure is visible in the footer.
- Opening the browser's network tab, confirm a `POST /api/public/views` fires once on load, and a `POST /api/public/products/{id}/click` fires when clicking "View on Amazon" (before the new tab opens).

If no products/categories exist yet in the local database, note that in the report rather than treating it as a failure — this stage doesn't seed data (that's a content/ops concern, not a code defect).

- [ ] **Step 5: Commit (if the smoke check surfaced any fixes)**

If Step 4 found nothing to fix, there is nothing to commit for this task — Task 7's commit is the final commit of this stage. If it did surface a small fix, apply it, re-run Steps 1-3, and commit:
```bash
git add -A
git commit -m "fix: address issue found during Frontend Stage 2 manual smoke check"
```
