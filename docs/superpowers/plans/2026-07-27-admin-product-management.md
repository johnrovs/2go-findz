# Frontend Admin Stage 2: Product Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `ProductsPage` placeholder with a paginated, filterable, searchable, sortable admin product list, and split the already-scaffolded `/admin/products/new` and `/admin/products/:id` routes off to a new `ProductFormPage` with full CRUD and image upload.

**Architecture:** `ProductsPage` (list) uses a new `useAdminProductSearch()` hook — URL-param-driven state mirroring the public `useProductSearch()` hook's conventions — feeding the existing `DataTable`/`ConfirmDialog` (Category Management stage) and `Pagination`/`SearchInput`/`FilterDropdown` (Public Homepage stage). `ProductFormPage` (create/edit) wraps a new `ProductForm`, which uses a new `ImageUploader` that uploads immediately on file selection. All product/image network access goes through new `adminProductService.js`/`adminImageService.js` built on the shared `api` Axios instance.

**Tech Stack:** Same as prior stages — React JS/JSX, Vite, Tailwind, React Router DOM, Axios, Lucide React, Vitest + React Testing Library. No new dependencies.

## Global Constraints

- Full design detail: `docs/superpowers/specs/2026-07-27-admin-product-management-design.md`. Master spec: `docs/PROJECT_SPEC.md` §"4. Product Management".
- Plain JS/JSX (no TypeScript), fixed folder structure (`components/`, `pages/admin/`, `services/`, `hooks/`).
- All backend calls go through the existing shared `api` Axios instance — never direct `axios`/`fetch`. Errors normalize to `{ message, fieldErrors }` via the existing `normalizeError` in `api.js`.
- Toasts use the existing `useToast()` hook → `{ showToast(message, type = 'success') }`.
- `ProductRequest` validation rules (verified directly from the backend DTO — not paraphrased): `name` required, max 200 chars; `description` required; `categoryId` required; `imageFileName` **optional**, max 255 chars; `productPrice` required, `>= 0.00`; `productLink` required, must match `^https://.+`; `trending`/`bestSeller`/`active` required booleans.
- `ProductResponse` shape: `{ id, name, description, categoryId, categoryName, imageFileName, productPrice, productLink, trending, bestSeller, active, createdAt, updatedAt }`.
- Admin product list endpoint: `GET /api/admin/products` — query params `search, categoryId, trending, bestSeller, active, minPrice, maxPrice` + Spring `Pageable` (`page`, `size`, `sort=field,direction`); default size 20, default sort `createdAt,asc`. Returns `Page<ProductResponse>` (`{ content, totalPages, totalElements, ... }`).
- Delete (`DELETE /api/admin/products/{id}`) is a **soft delete** (`productService.softDelete(id)` sets `active = false`) — it is reversible via editing the product's Active checkbox. Confirmation copy and styling must reflect that (not phrased or styled as an irreversible destructive action).
- Image upload: `POST /api/admin/images`, multipart field name `file` → `{ filename }`. Client-side validation before upload: MIME type must be `image/jpeg`, `image/png`, or `image/webp`; size must be ≤ 5MB.
- Color palette matches prior stages: primary actions `indigo-600`/`indigo-700`, neutrals `slate`, Trending badge `amber-100`/`amber-800`, Best Seller badge `emerald-100`/`emerald-800` (same classes as the public `ProductCard`), Inactive badge `slate-100`/`slate-600`.
- Reused as-is, no modifications needed: `DataTable`, `ConfirmDialog` (`frontend/src/components/`, Category Management stage), `Pagination`, `SearchInput`, `FilterDropdown` (`frontend/src/components/`, Public Homepage stage), `adminCategoryService.getCategories()` (Category Management stage), `utils/imageUrl.js`'s `getImageUrl(filename)`.
- TDD throughout: write the failing test, confirm RED, implement, confirm GREEN, run the full suite, commit — every task.
- Accessible by default: labeled form inputs, `aria-invalid`/`aria-describedby` on validation errors, upload errors announced via `role="alert"`.
- Never commit `.env`.

---

### Task 1: `adminProductService`

**Files:**
- Create: `frontend/src/services/adminProductService.js`
- Test: `frontend/src/services/adminProductService.test.js`

**Interfaces:**
- Consumes: shared `api` Axios instance (`frontend/src/services/api.js`).
- Produces: `searchProducts(params): Promise<PageResponse>`, `getProductById(id): Promise<Product>`, `createProduct(payload): Promise<Product>`, `updateProduct(id, payload): Promise<Product>`, `deleteProduct(id): Promise<void>`. Consumed by `useAdminProductSearch` (Task 4) and `ProductFormPage` (Task 7).

- [ ] **Step 1: Write the failing tests**

```javascript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import api from './api.js';
import {
  searchProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from './adminProductService.js';

describe('adminProductService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('searchProducts fetches from /admin/products with the given params and returns the page data', async () => {
    const page = { content: [{ id: 1, name: 'Wireless Earbuds' }], totalPages: 1, totalElements: 1 };
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, message: 'Products retrieved successfully.', data: page },
    });

    const result = await searchProducts({ page: 0, size: 20, sort: 'createdAt,asc' });

    expect(api.get).toHaveBeenCalledWith('/admin/products', { params: { page: 0, size: 20, sort: 'createdAt,asc' } });
    expect(result).toEqual(page);
  });

  it('getProductById fetches a single product by id', async () => {
    const product = { id: 1, name: 'Wireless Earbuds' };
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, message: 'Product retrieved successfully.', data: product },
    });

    const result = await getProductById(1);

    expect(api.get).toHaveBeenCalledWith('/admin/products/1');
    expect(result).toEqual(product);
  });

  it('createProduct posts the payload and returns the created product', async () => {
    const created = { id: 2, name: 'Desk Lamp' };
    vi.spyOn(api, 'post').mockResolvedValue({
      data: { success: true, message: 'Product created successfully.', data: created },
    });

    const payload = { name: 'Desk Lamp', categoryId: 1 };
    const result = await createProduct(payload);

    expect(api.post).toHaveBeenCalledWith('/admin/products', payload);
    expect(result).toEqual(created);
  });

  it('updateProduct puts the payload to the product id and returns the updated product', async () => {
    const updated = { id: 2, name: 'Desk Lamp Pro' };
    vi.spyOn(api, 'put').mockResolvedValue({
      data: { success: true, message: 'Product updated successfully.', data: updated },
    });

    const payload = { name: 'Desk Lamp Pro', categoryId: 1 };
    const result = await updateProduct(2, payload);

    expect(api.put).toHaveBeenCalledWith('/admin/products/2', payload);
    expect(result).toEqual(updated);
  });

  it('deleteProduct sends a delete request for the product id', async () => {
    vi.spyOn(api, 'delete').mockResolvedValue({
      data: { success: true, message: 'Product deleted successfully.', data: null },
    });

    await deleteProduct(2);

    expect(api.delete).toHaveBeenCalledWith('/admin/products/2');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- adminProductService.test.js`
Expected: FAIL — `adminProductService.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

```javascript
import api from './api.js';

export async function searchProducts(params) {
  const response = await api.get('/admin/products', { params });
  return response.data.data;
}

export async function getProductById(id) {
  const response = await api.get(`/admin/products/${id}`);
  return response.data.data;
}

export async function createProduct(payload) {
  const response = await api.post('/admin/products', payload);
  return response.data.data;
}

export async function updateProduct(id, payload) {
  const response = await api.put(`/admin/products/${id}`, payload);
  return response.data.data;
}

export async function deleteProduct(id) {
  await api.delete(`/admin/products/${id}`);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- adminProductService.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/adminProductService.js frontend/src/services/adminProductService.test.js
git commit -m "feat: add adminProductService for product CRUD"
```

---

### Task 2: `adminImageService`

**Files:**
- Create: `frontend/src/services/adminImageService.js`
- Test: `frontend/src/services/adminImageService.test.js`

**Interfaces:**
- Consumes: shared `api` Axios instance.
- Produces: `uploadImage(file): Promise<{ filename: string }>`. Consumed by `ImageUploader` (Task 3).

- [ ] **Step 1: Write the failing test**

```javascript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import api from './api.js';
import { uploadImage } from './adminImageService.js';

describe('adminImageService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uploadImage posts a multipart FormData payload with the file and returns the response data', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({
      data: { success: true, message: 'Image uploaded successfully.', data: { filename: 'img_20260727_1.webp' } },
    });
    const file = new File(['content'], 'photo.webp', { type: 'image/webp' });

    const result = await uploadImage(file);

    expect(api.post).toHaveBeenCalledWith('/admin/images', expect.any(FormData));
    const formData = api.post.mock.calls[0][1];
    expect(formData.get('file')).toBe(file);
    expect(result).toEqual({ filename: 'img_20260727_1.webp' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- adminImageService.test.js`
Expected: FAIL — `adminImageService.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

```javascript
import api from './api.js';

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/admin/images', formData);
  return response.data.data;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm test -- adminImageService.test.js`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/adminImageService.js frontend/src/services/adminImageService.test.js
git commit -m "feat: add adminImageService for product image uploads"
```

---

### Task 3: `ImageUploader`

**Files:**
- Create: `frontend/src/components/ImageUploader.jsx`
- Test: `frontend/src/components/ImageUploader.test.jsx`

**Interfaces:**
- Consumes: `uploadImage` from Task 2; `getImageUrl(filename)` (existing, `frontend/src/utils/imageUrl.js`).
- Produces: `ImageUploader({ imageFileName, onChange })` (default export). Calls `onChange(filename: string)` only after a successful upload — never with a `File` object. Used by `ProductForm` (Task 5).

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ImageUploader from './ImageUploader.jsx';
import * as adminImageService from '../services/adminImageService.js';

describe('ImageUploader', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a placeholder when there is no image', () => {
    render(<ImageUploader imageFileName={null} onChange={vi.fn()} />);
    expect(screen.queryByAltText('Product preview')).not.toBeInTheDocument();
  });

  it('shows a preview when an image filename is provided', () => {
    render(<ImageUploader imageFileName="img_123.webp" onChange={vi.fn()} />);
    expect(screen.getByAltText('Product preview')).toBeInTheDocument();
  });

  it('rejects a file with an unsupported type without uploading', async () => {
    const onChange = vi.fn();
    const uploadSpy = vi.spyOn(adminImageService, 'uploadImage');
    const user = userEvent.setup();
    render(<ImageUploader imageFileName={null} onChange={onChange} />);

    const file = new File(['content'], 'photo.gif', { type: 'image/gif' });
    await user.upload(screen.getByLabelText(/upload image/i), file);

    expect(await screen.findByText('Only JPG, PNG, and WebP images are allowed.')).toBeInTheDocument();
    expect(uploadSpy).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects a file over 5MB without uploading', async () => {
    const onChange = vi.fn();
    const uploadSpy = vi.spyOn(adminImageService, 'uploadImage');
    const user = userEvent.setup();
    render(<ImageUploader imageFileName={null} onChange={onChange} />);

    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], 'photo.webp', { type: 'image/webp' });
    await user.upload(screen.getByLabelText(/upload image/i), bigFile);

    expect(await screen.findByText('Image must be 5MB or smaller.')).toBeInTheDocument();
    expect(uploadSpy).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uploads a valid file and calls onChange with the returned filename', async () => {
    const onChange = vi.fn();
    vi.spyOn(adminImageService, 'uploadImage').mockResolvedValue({ filename: 'img_new.webp' });
    const user = userEvent.setup();
    render(<ImageUploader imageFileName={null} onChange={onChange} />);

    const file = new File(['content'], 'photo.webp', { type: 'image/webp' });
    await user.upload(screen.getByLabelText(/upload image/i), file);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('img_new.webp'));
  });

  it('shows an inline error when the upload request fails', async () => {
    const onChange = vi.fn();
    vi.spyOn(adminImageService, 'uploadImage').mockRejectedValue({ message: 'Upload failed. Please try again.' });
    const user = userEvent.setup();
    render(<ImageUploader imageFileName={null} onChange={onChange} />);

    const file = new File(['content'], 'photo.webp', { type: 'image/webp' });
    await user.upload(screen.getByLabelText(/upload image/i), file);

    expect(await screen.findByText('Upload failed. Please try again.')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- ImageUploader.test.jsx`
Expected: FAIL — `ImageUploader.jsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
import { useState } from 'react';
import { Image as ImageIcon, Upload } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl.js';
import { uploadImage } from '../services/adminImageService.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function ImageUploader({ imageFileName, onChange }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const previewUrl = getImageUrl(imageFileName);

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
      <span className="mb-1 block text-sm font-medium text-slate-700">Product Image</span>
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {previewUrl ? (
            <img src={previewUrl} alt="Product preview" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-8 w-8 text-slate-300" />
          )}
        </div>
        <div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Upload size={16} />
            {isUploading ? 'Uploading...' : 'Upload Image'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
            />
          </label>
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-600">
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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- ImageUploader.test.jsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ImageUploader.jsx frontend/src/components/ImageUploader.test.jsx
git commit -m "feat: add ImageUploader with immediate upload-on-select"
```

---

### Task 4: `useAdminProductSearch`

**Files:**
- Create: `frontend/src/hooks/useAdminProductSearch.js`
- Test: `frontend/src/hooks/useAdminProductSearch.test.jsx`

**Interfaces:**
- Consumes: `searchProducts` from Task 1 (`adminProductService.js`).
- Produces: `useAdminProductSearch()` returning `{ products, totalPages, totalElements, isLoading, error, search, categoryId, filter, status, sortKey, sortDirection, page, setSearch(value), setCategoryId(value), setFilter(value), setStatus(value), onSortChange(key), setPage(value), reload() }`. `filter` is `'all' | 'trending' | 'bestSeller'`; `status` is `'all' | 'active' | 'inactive'` and maps to the `active` query param (omitted for `'all'`). `sortKey`/`sortDirection` feed `DataTable`'s `onSortChange` prop directly. Consumed by `ProductsPage` (Task 6).

- [ ] **Step 1: Write the failing tests**

```jsx
import { renderHook, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useAdminProductSearch } from './useAdminProductSearch.js';
import * as adminProductService from '../services/adminProductService.js';

function wrapper({ children }) {
  return <MemoryRouter initialEntries={['/admin/products']}>{children}</MemoryRouter>;
}

describe('useAdminProductSearch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches on mount with the default sort and no status filter', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({
      content: [{ id: 1, name: 'Product One' }],
      totalPages: 1,
      totalElements: 1,
    });

    const { result } = renderHook(() => useAdminProductSearch(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(adminProductService.searchProducts).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, size: 20, sort: 'createdAt,asc' })
    );
    const params = adminProductService.searchProducts.mock.calls[0][0];
    expect(params.active).toBeUndefined();
  });

  it('setStatus("active") sends active=true and setStatus("inactive") sends active=false', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({
      content: [],
      totalPages: 0,
      totalElements: 0,
    });
    const { result } = renderHook(() => useAdminProductSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setStatus('active'));
    await waitFor(() => expect(result.current.status).toBe('active'));
    expect(adminProductService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ active: true }));

    act(() => result.current.setStatus('inactive'));
    await waitFor(() => expect(result.current.status).toBe('inactive'));
    expect(adminProductService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ active: false }));
  });

  it('resets to page 1 when a filter changes', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({
      content: [],
      totalPages: 5,
      totalElements: 50,
    });
    const { result } = renderHook(() => useAdminProductSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setPage(3));
    await waitFor(() => expect(result.current.page).toBe(3));

    act(() => result.current.setFilter('trending'));
    await waitFor(() => expect(result.current.page).toBe(1));
  });

  it('onSortChange toggles direction on the same key and resets to ascending on a new key', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({
      content: [],
      totalPages: 0,
      totalElements: 0,
    });
    const { result } = renderHook(() => useAdminProductSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.onSortChange('name'));
    await waitFor(() => expect(result.current.sortKey).toBe('name'));
    expect(result.current.sortDirection).toBe('asc');

    act(() => result.current.onSortChange('name'));
    await waitFor(() => expect(result.current.sortDirection).toBe('desc'));
  });

  it('reload triggers a re-fetch with the same params', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({
      content: [],
      totalPages: 0,
      totalElements: 0,
    });
    const { result } = renderHook(() => useAdminProductSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.reload());

    await waitFor(() => expect(adminProductService.searchProducts).toHaveBeenCalledTimes(2));
  });

  it('exposes an error message when the fetch fails', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockRejectedValue({
      message: 'Network error. Please try again.',
    });

    const { result } = renderHook(() => useAdminProductSearch(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Network error. Please try again.');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- useAdminProductSearch.test.jsx`
Expected: FAIL — `useAdminProductSearch.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

```javascript
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchProducts } from '../services/adminProductService.js';

const PAGE_SIZE = 20;

export function useAdminProductSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const search = searchParams.get('search') ?? '';
  const categoryId = searchParams.get('category') ?? '';
  const filter = searchParams.get('filter') ?? 'all';
  const status = searchParams.get('status') ?? 'all';
  const sortKey = searchParams.get('sortKey') ?? 'createdAt';
  const sortDirection = searchParams.get('sortDirection') ?? 'asc';
  const page = Number(searchParams.get('page') ?? '1');

  useEffect(() => {
    let isCancelled = false;
    // Resetting loading/error state at the start of each fetch is the standard
    // reset-before-async-work pattern; it can't cascade since neither value
    // is a dependency of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    const params = {
      page: page - 1,
      size: PAGE_SIZE,
      sort: `${sortKey},${sortDirection}`,
    };
    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;
    if (filter === 'trending') params.trending = true;
    if (filter === 'bestSeller') params.bestSeller = true;
    if (status === 'active') params.active = true;
    if (status === 'inactive') params.active = false;

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
  }, [search, categoryId, filter, status, sortKey, sortDirection, page, refreshIndex]);

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

  function handleSortChange(key) {
    if (key === sortKey) {
      updateParams({ sortDirection: sortDirection === 'asc' ? 'desc' : 'asc' }, { resetPage: false });
    } else {
      updateParams({ sortKey: key, sortDirection: 'asc' }, { resetPage: false });
    }
  }

  return {
    products,
    totalPages,
    totalElements,
    isLoading,
    error,
    search,
    categoryId,
    filter,
    status,
    sortKey,
    sortDirection,
    page,
    setSearch: (value) => updateParams({ search: value }),
    setCategoryId: (value) => updateParams({ category: value }),
    setFilter: (value) => updateParams({ filter: value === 'all' ? '' : value }),
    setStatus: (value) => updateParams({ status: value === 'all' ? '' : value }),
    onSortChange: handleSortChange,
    setPage: (value) => updateParams({ page: value === 1 ? '' : value }, { resetPage: false }),
    reload: () => setRefreshIndex((n) => n + 1),
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- useAdminProductSearch.test.jsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useAdminProductSearch.js frontend/src/hooks/useAdminProductSearch.test.jsx
git commit -m "feat: add useAdminProductSearch hook with URL-param-driven state"
```

---

### Task 5: `ProductForm`

**Files:**
- Create: `frontend/src/components/ProductForm.jsx`
- Test: `frontend/src/components/ProductForm.test.jsx`

**Interfaces:**
- Consumes: `ImageUploader` from Task 3, exact signature `ImageUploader({ imageFileName, onChange })`.
- Produces: `ProductForm({ product, categories, onSubmit, onCancel })` (default export). `product` is `null` for create or a full `Product` object for edit. `categories` is `Category[]` (`{ id, productCategoryName }`, from the existing `adminCategoryService`). Calls `onSubmit({ name, description, categoryId, imageFileName, productPrice, productLink, trending, bestSeller, active })` — `categoryId`/`productPrice` are numbers, everything else matches the field types on the wire. `onSubmit` is expected to reject with `{ message, fieldErrors }` on failure. Used by `ProductFormPage` (Task 7).

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ProductForm from './ProductForm.jsx';

const categories = [
  { id: 1, productCategoryName: 'Electronics' },
  { id: 2, productCategoryName: 'Home Goods' },
];

describe('ProductForm', () => {
  it('shows validation errors when submitted empty', async () => {
    const user = userEvent.setup();
    render(<ProductForm product={null} categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Add Product' }));

    expect(await screen.findByText('Product name is required.')).toBeInTheDocument();
    expect(screen.getByText('Description is required.')).toBeInTheDocument();
    expect(screen.getByText('Category is required.')).toBeInTheDocument();
    expect(screen.getByText('Price is required.')).toBeInTheDocument();
    expect(screen.getByText('Product URL is required.')).toBeInTheDocument();
  });

  it('rejects a non-HTTPS product link', async () => {
    const user = userEvent.setup();
    render(<ProductForm product={null} categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Amazon Affiliate Link'), 'http://amazon.com/dp/example');
    await user.click(screen.getByRole('button', { name: 'Add Product' }));

    expect(await screen.findByText('Product URL must be a valid HTTPS link.')).toBeInTheDocument();
  });

  it('submits the expected payload for a new product', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ProductForm product={null} categories={categories} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Product Name'), 'Wireless Earbuds');
    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await user.type(screen.getByLabelText('Description'), 'Compact wireless earbuds.');
    await user.type(screen.getByLabelText('Price ($)'), '49.99');
    await user.type(screen.getByLabelText('Amazon Affiliate Link'), 'https://amazon.com/dp/example');
    await user.click(screen.getByRole('checkbox', { name: 'Trending' }));
    await user.click(screen.getByRole('button', { name: 'Add Product' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Wireless Earbuds',
      description: 'Compact wireless earbuds.',
      categoryId: 1,
      imageFileName: null,
      productPrice: 49.99,
      productLink: 'https://amazon.com/dp/example',
      trending: true,
      bestSeller: false,
      active: true,
    });
  });

  it('pre-fills fields and submits an update payload when editing', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    const product = {
      id: 5,
      name: 'Wireless Earbuds',
      description: 'Compact wireless earbuds.',
      categoryId: 1,
      imageFileName: 'img_existing.webp',
      productPrice: 49.99,
      productLink: 'https://amazon.com/dp/example',
      trending: false,
      bestSeller: true,
      active: true,
    };
    render(<ProductForm product={product} categories={categories} onSubmit={onSubmit} onCancel={vi.fn()} />);

    expect(screen.getByLabelText('Product Name')).toHaveValue('Wireless Earbuds');
    expect(screen.getByLabelText('Category')).toHaveValue('1');
    expect(screen.getByRole('checkbox', { name: 'Best Seller' })).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Wireless Earbuds',
      description: 'Compact wireless earbuds.',
      categoryId: 1,
      imageFileName: 'img_existing.webp',
      productPrice: 49.99,
      productLink: 'https://amazon.com/dp/example',
      trending: false,
      bestSeller: true,
      active: true,
    });
  });

  it('renders a server-side field error under the matching input', async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      message: 'Validation failed.',
      fieldErrors: { productLink: 'Product URL must be a valid HTTPS link.' },
    });
    const user = userEvent.setup();
    render(<ProductForm product={null} categories={categories} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Product Name'), 'Wireless Earbuds');
    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await user.type(screen.getByLabelText('Description'), 'Compact wireless earbuds.');
    await user.type(screen.getByLabelText('Price ($)'), '49.99');
    await user.type(screen.getByLabelText('Amazon Affiliate Link'), 'https://amazon.com/dp/example');
    await user.click(screen.getByRole('button', { name: 'Add Product' }));

    expect(await screen.findByText('Product URL must be a valid HTTPS link.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- ProductForm.test.jsx`
Expected: FAIL — `ProductForm.jsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
import { useState } from 'react';
import ImageUploader from './ImageUploader.jsx';

function ProductForm({ product, categories, onSubmit, onCancel }) {
  const [imageFileName, setImageFileName] = useState(product?.imageFileName ?? null);
  const [name, setName] = useState(product?.name ?? '');
  const [categoryId, setCategoryId] = useState(
    product?.categoryId !== undefined ? String(product.categoryId) : ''
  );
  const [description, setDescription] = useState(product?.description ?? '');
  const [productPrice, setProductPrice] = useState(
    product?.productPrice !== undefined ? String(product.productPrice) : ''
  );
  const [productLink, setProductLink] = useState(product?.productLink ?? '');
  const [trending, setTrending] = useState(product?.trending ?? false);
  const [bestSeller, setBestSeller] = useState(product?.bestSeller ?? false);
  const [active, setActive] = useState(product?.active ?? true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const errors = {};
    if (!name.trim()) errors.name = 'Product name is required.';
    if (!description.trim()) errors.description = 'Description is required.';
    if (!categoryId) errors.categoryId = 'Category is required.';
    const priceValue = Number(productPrice);
    if (productPrice === '' || Number.isNaN(priceValue)) {
      errors.productPrice = 'Price is required.';
    } else if (priceValue < 0) {
      errors.productPrice = 'Price must be greater than or equal to zero.';
    }
    if (!productLink.trim()) {
      errors.productLink = 'Product URL is required.';
    } else if (!/^https:\/\/.+/.test(productLink.trim())) {
      errors.productLink = 'Product URL must be a valid HTTPS link.';
    }
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        categoryId: Number(categoryId),
        imageFileName,
        productPrice: Number(productPrice),
        productLink: productLink.trim(),
        trending,
        bestSeller,
        active,
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
    <form onSubmit={handleSubmit} noValidate className="max-w-2xl">
      {formError && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}

      <div className="mb-6">
        <ImageUploader imageFileName={imageFileName} onChange={setImageFileName} />
      </div>

      <div className="mb-4">
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
          Product Name
        </label>
        <input
          id="name"
          type="text"
          maxLength={200}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? 'name-error' : undefined}
        />
        {fieldErrors.name && (
          <p id="name-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="categoryId" className="mb-1 block text-sm font-medium text-slate-700">
          Category
        </label>
        <select
          id="categoryId"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
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
        <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
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
        <label htmlFor="productPrice" className="mb-1 block text-sm font-medium text-slate-700">
          Price ($)
        </label>
        <input
          id="productPrice"
          type="number"
          step="0.01"
          min="0"
          value={productPrice}
          onChange={(event) => setProductPrice(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.productPrice)}
          aria-describedby={fieldErrors.productPrice ? 'productPrice-error' : undefined}
        />
        {fieldErrors.productPrice && (
          <p id="productPrice-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.productPrice}
          </p>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="productLink" className="mb-1 block text-sm font-medium text-slate-700">
          Amazon Affiliate Link
        </label>
        <input
          id="productLink"
          type="text"
          value={productLink}
          onChange={(event) => setProductLink(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.productLink)}
          aria-describedby={fieldErrors.productLink ? 'productLink-error' : undefined}
        />
        {fieldErrors.productLink && (
          <p id="productLink-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.productLink}
          </p>
        )}
      </div>

      <div className="mb-6 flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={trending} onChange={(event) => setTrending(event.target.checked)} />
          Trending
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={bestSeller}
            onChange={(event) => setBestSeller(event.target.checked)}
          />
          Best Seller
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Active
        </label>
      </div>

      <div className="flex justify-end gap-3">
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
          {isSubmitting ? 'Saving...' : product ? 'Save Changes' : 'Add Product'}
        </button>
      </div>
    </form>
  );
}

export default ProductForm;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- ProductForm.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ProductForm.jsx frontend/src/components/ProductForm.test.jsx
git commit -m "feat: add ProductForm with client-side and server-side error handling"
```

---

### Task 6: `ProductsPage` assembly (list)

**Files:**
- Modify: `frontend/src/pages/admin/ProductsPage.jsx` (replace the placeholder body entirely)
- Test: `frontend/src/pages/admin/ProductsPage.test.jsx`

**Interfaces:**
- Consumes: `DataTable`, `ConfirmDialog` (existing, Category Management stage), `Pagination`, `SearchInput`, `FilterDropdown` (existing, Public Homepage stage), `useAdminProductSearch` (Task 4), `adminProductService.deleteProduct` (Task 1), `adminCategoryService.getCategories` (existing), `getImageUrl` (existing), `useToast` (existing).
- Produces: the complete `/admin/products` route content. `Add Product` and each row's `Edit` action are plain `<Link>`s to `/admin/products/new` and `/admin/products/{id}` — these routes are wired to `ProductFormPage` in Task 7, but this task's own test only asserts the `href`, so it does not depend on Task 7 being done first.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ToastProvider } from '../../context/ToastContext.jsx';
import ProductsPage from './ProductsPage.jsx';
import * as adminProductService from '../../services/adminProductService.js';
import * as adminCategoryService from '../../services/adminCategoryService.js';

const products = [
  {
    id: 1,
    name: 'Wireless Earbuds',
    categoryName: 'Electronics',
    imageFileName: null,
    productPrice: 49.99,
    trending: true,
    bestSeller: false,
    active: true,
    createdAt: '2026-01-10T10:00:00',
  },
  {
    id: 2,
    name: 'Desk Lamp',
    categoryName: 'Home Goods',
    imageFileName: null,
    productPrice: 29.99,
    trending: false,
    bestSeller: true,
    active: false,
    createdAt: '2026-02-15T10:00:00',
  },
];

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/admin/products']}>
        <ProductsPage />
      </MemoryRouter>
    </ToastProvider>
  );
}

describe('ProductsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminCategoryService, 'getCategories').mockResolvedValue([
      { id: 1, productCategoryName: 'Electronics' },
    ]);
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({
      content: products,
      totalPages: 1,
      totalElements: 2,
    });
  });

  it('renders the fetched products with their badges', async () => {
    renderPage();

    expect(await screen.findByText('Wireless Earbuds')).toBeInTheDocument();
    expect(screen.getByText('Trending')).toBeInTheDocument();
    expect(screen.getByText('Best Seller')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('$49.99')).toBeInTheDocument();
  });

  it('links "Add Product" to the new-product route', async () => {
    renderPage();
    await screen.findByText('Wireless Earbuds');

    expect(screen.getByRole('link', { name: 'Add Product' })).toHaveAttribute('href', '/admin/products/new');
  });

  it("links a row's edit action to its product route", async () => {
    renderPage();
    await screen.findByText('Wireless Earbuds');

    expect(screen.getByRole('link', { name: 'Edit Wireless Earbuds' })).toHaveAttribute(
      'href',
      '/admin/products/1'
    );
  });

  it('deactivates a product after confirmation and shows a success toast', async () => {
    vi.spyOn(adminProductService, 'deleteProduct').mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Wireless Earbuds');

    await user.click(screen.getByRole('button', { name: 'Delete Wireless Earbuds' }));
    expect(
      await screen.findByText(
        'This will deactivate "Wireless Earbuds" and remove it from the public catalog. You can reactivate it later from Edit.'
      )
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(adminProductService.deleteProduct).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Product deactivated successfully.')).toBeInTheDocument();
  });

  it('filters by search term', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Wireless Earbuds');

    await user.type(screen.getByLabelText('Search products'), 'lamp');

    await waitFor(() =>
      expect(adminProductService.searchProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'lamp' })
      )
    );
  });

  it('shows an empty state when there are no products', async () => {
    adminProductService.searchProducts.mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
    renderPage();

    expect(await screen.findByText('No products found')).toBeInTheDocument();
  });

  it('shows an error state with retry when the fetch fails', async () => {
    adminProductService.searchProducts.mockRejectedValueOnce({ message: 'Network error. Please try again.' });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Network error. Please try again.')).toBeInTheDocument();

    adminProductService.searchProducts.mockResolvedValueOnce({ content: products, totalPages: 1, totalElements: 2 });
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Wireless Earbuds')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- ProductsPage.test.jsx`
Expected: FAIL — the current placeholder renders none of this.

- [ ] **Step 3: Write the new `ProductsPage.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import DataTable from '../../components/DataTable.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import SearchInput from '../../components/SearchInput.jsx';
import FilterDropdown from '../../components/FilterDropdown.jsx';
import Pagination from '../../components/Pagination.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
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
    { key: 'name', label: 'Name', sortable: true },
    { key: 'categoryName', label: 'Category' },
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
          {row.trending && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Trending
            </span>
          )}
          {row.bestSeller && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
              Best Seller
            </span>
          )}
          {!row.active && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              Inactive
            </span>
          )}
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
            className="inline-flex rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
          >
            <Pencil size={16} />
          </Link>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.name}`}
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
        <h1 className="text-2xl font-bold text-slate-900">Products</h1>
        <Link
          to="/admin/products/new"
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} />
          Add Product
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="min-w-[240px] flex-1">
          <SearchInput value={productSearch.search} onChange={productSearch.setSearch} />
        </div>
        <FilterDropdown
          label="Category"
          value={productSearch.categoryId}
          options={categoryOptions}
          onChange={productSearch.setCategoryId}
        />
        <FilterDropdown
          label="Type"
          value={productSearch.filter}
          options={TYPE_OPTIONS}
          onChange={productSearch.setFilter}
        />
        <FilterDropdown
          label="Status"
          value={productSearch.status}
          options={STATUS_OPTIONS}
          onChange={productSearch.setStatus}
        />
      </div>

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
            emptyState={
              <EmptyState
                title="No products found"
                description="Try adjusting your search or filters, or add your first product."
              />
            }
          />
          <Pagination
            page={productSearch.page}
            totalPages={productSearch.totalPages}
            onPageChange={productSearch.setPage}
          />
        </>
      )}

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

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm test -- ProductsPage.test.jsx`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/admin/ProductsPage.jsx frontend/src/pages/admin/ProductsPage.test.jsx
git commit -m "feat: assemble the product list page with search, filters, and delete"
```

---

### Task 7: `ProductFormPage` + routing

**Files:**
- Create: `frontend/src/pages/admin/ProductFormPage.jsx`
- Test: `frontend/src/pages/admin/ProductFormPage.test.jsx`
- Modify: `frontend/src/App.jsx` (route `/admin/products/new` and `/admin/products/:id` to `ProductFormPage` instead of `ProductsPage`)

**Interfaces:**
- Consumes: `ProductForm` (Task 5), `adminProductService.getProductById`/`createProduct`/`updateProduct` (Task 1), `adminCategoryService.getCategories` (existing), `useToast` (existing).
- Produces: the complete `/admin/products/new` and `/admin/products/:id` route content — terminal for this stage.

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ToastProvider } from '../../context/ToastContext.jsx';
import ProductFormPage from './ProductFormPage.jsx';
import * as adminProductService from '../../services/adminProductService.js';
import * as adminCategoryService from '../../services/adminCategoryService.js';

const categories = [{ id: 1, productCategoryName: 'Electronics' }];

function renderPage(initialEntry) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/admin/products" element={<div>Products List</div>} />
          <Route path="/admin/products/new" element={<ProductFormPage />} />
          <Route path="/admin/products/:id" element={<ProductFormPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );
}

describe('ProductFormPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminCategoryService, 'getCategories').mockResolvedValue(categories);
  });

  it('renders an empty form in create mode', async () => {
    renderPage('/admin/products/new');

    expect(await screen.findByRole('heading', { name: 'Add Product' })).toBeInTheDocument();
    expect(screen.getByLabelText('Product Name')).toHaveValue('');
  });

  it('creates a product and navigates back to the list on success', async () => {
    vi.spyOn(adminProductService, 'createProduct').mockResolvedValue({ id: 9 });
    const user = userEvent.setup();
    renderPage('/admin/products/new');
    await screen.findByRole('heading', { name: 'Add Product' });

    await user.type(screen.getByLabelText('Product Name'), 'Wireless Earbuds');
    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await user.type(screen.getByLabelText('Description'), 'Compact wireless earbuds.');
    await user.type(screen.getByLabelText('Price ($)'), '49.99');
    await user.type(screen.getByLabelText('Amazon Affiliate Link'), 'https://amazon.com/dp/example');
    await user.click(screen.getByRole('button', { name: 'Add Product' }));

    expect(await screen.findByText('Products List')).toBeInTheDocument();
  });

  it('loads and pre-fills the product in edit mode', async () => {
    vi.spyOn(adminProductService, 'getProductById').mockResolvedValue({
      id: 5,
      name: 'Wireless Earbuds',
      description: 'Compact wireless earbuds.',
      categoryId: 1,
      imageFileName: null,
      productPrice: 49.99,
      productLink: 'https://amazon.com/dp/example',
      trending: false,
      bestSeller: false,
      active: true,
    });
    renderPage('/admin/products/5');

    expect(await screen.findByRole('heading', { name: 'Edit Product' })).toBeInTheDocument();
    expect(screen.getByLabelText('Product Name')).toHaveValue('Wireless Earbuds');
  });

  it('shows an error state when loading the product fails in edit mode', async () => {
    vi.spyOn(adminProductService, 'getProductById').mockRejectedValue({
      message: 'Failed to load product.',
    });
    renderPage('/admin/products/5');

    expect(await screen.findByText('Failed to load product.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- ProductFormPage.test.jsx`
Expected: FAIL — `ProductFormPage.jsx` does not exist yet.

- [ ] **Step 3: Write the new `ProductFormPage.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProductForm from '../../components/ProductForm.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { useToast } from '../../hooks/useToast.js';
import { getProductById, createProduct, updateProduct } from '../../services/adminProductService.js';
import { getCategories } from '../../services/adminCategoryService.js';

function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEditMode = Boolean(id);

  const [categories, setCategories] = useState([]);
  const [product, setProduct] = useState(null);
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
    getProductById(id)
      .then(setProduct)
      .catch((err) => setError(err.message ?? 'Failed to load product.'))
      .finally(() => setIsLoading(false));
  }, [id, isEditMode]);

  async function handleSubmit(payload) {
    if (isEditMode) {
      await updateProduct(id, payload);
      showToast('Product updated successfully.');
    } else {
      await createProduct(payload);
      showToast('Product created successfully.');
    }
    navigate('/admin/products');
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{isEditMode ? 'Edit Product' : 'Add Product'}</h1>

      {isLoading ? (
        <LoadingSpinner label="Loading product..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <ProductForm
          product={product}
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/admin/products')}
        />
      )}
    </div>
  );
}

export default ProductFormPage;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- ProductFormPage.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Wire the routes in `App.jsx`**

Modify `frontend/src/App.jsx`: add the import and change the two route elements.

```javascript
import ProductFormPage from './pages/admin/ProductFormPage.jsx';
```

```jsx
<Route path="/admin/products" element={<ProductsPage />} />
<Route path="/admin/products/new" element={<ProductFormPage />} />
<Route path="/admin/products/:id" element={<ProductFormPage />} />
```

- [ ] **Step 6: Run the full suite to confirm no regressions**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus all tests from Tasks 1 through 7.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/admin/ProductFormPage.jsx frontend/src/pages/admin/ProductFormPage.test.jsx frontend/src/App.jsx
git commit -m "feat: add ProductFormPage and wire it to /admin/products/new and /admin/products/:id"
```

---

### Task 8: Final verification

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything from Tasks 1–7
- Produces: nothing further downstream — this sub-stage's final gate.

- [ ] **Step 1: Run the entire test suite**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus all tests from Tasks 1 through 7.

- [ ] **Step 2: Run lint**

Run: `cd frontend && npm run lint`
Expected: clean (0 errors, 0 warnings). Both data-fetching effects in this plan (`useAdminProductSearch`, `ProductFormPage`'s edit-mode fetch) already carry the `react-hooks/set-state-in-effect` disable comment established in the prior stage — if lint still flags something unanticipated, apply the same pattern with a one-line justification.

- [ ] **Step 3: Run the production build**

Run: `cd frontend && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 4: Manual smoke check (optional, requires the backend running and a real admin login)**

Optional — skip if a live backend isn't available; Steps 1-3 are the mandatory bar. If available: open `/admin/products`, confirm the table loads with correct badges/thumbnails, search/filters/sort/pagination work, "Add Product" reaches a working create form (including a real image upload), editing an existing product pre-fills correctly, and deactivating a product removes it from the "Active" filter view while it remains visible under "Inactive"/"All".

- [ ] **Step 5: Commit (if the smoke check surfaced any fixes)**

If Step 4 found nothing to fix (or was skipped), there is nothing to commit for this task — Task 7's commit is the final commit of this sub-stage. If it did surface a small fix, apply it, re-run Steps 1-3, and commit:
```bash
git add -A
git commit -m "fix: address issue found during Admin Product Management manual smoke check"
```
