# Compare Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users pick up to 4 products from anywhere in the catalog and view them side by side on a dedicated `/compare` page, with a persistent floating bar and a navbar link showing the current count.

**Architecture:** A new backend batch-fetch-by-ids endpoint reuses the existing `ProductResponse` DTO. On the frontend, a `CompareContext` (matching the existing `ToastContext`/`AuthContext` pattern) holds the selected product IDs in `localStorage`; `ProductCard` gets a toggle button, a new global `CompareBar` shows the running selection, the `Navbar`/`MobileMenu` gain a "Compare" link with a count badge, and a new `ComparePage` renders the full comparison table.

**Tech Stack:** Same as prior stages — Spring Boot/Java 21/MySQL on the backend; React JS/JSX, Vite, Tailwind, React Router DOM, Framer Motion, Lucide React on the frontend. No new dependencies.

## Global Constraints

- Full design detail: `docs/superpowers/specs/2026-07-27-compare-design.md`.
- Comparison is capped at 4 products, selection persists in `localStorage` (not the URL).
- The `/compare` endpoint only ever returns **active** products, silently dropping inactive/missing/malformed ids — never a 400 or 404 for a partially-bad `ids` list.
- No changes to the `Product` entity, `ProductRequest`, admin endpoints, or the database schema — this is additive and read-only.
- TDD throughout: write the failing test, confirm RED, implement, confirm GREEN, run the full suite, commit.
- Task ordering in this plan deliberately wires `CompareProvider` into `App.jsx` (Task 3) *before* any component starts calling `useCompare()` (Tasks 4+) — this keeps `App.test.jsx` green throughout instead of breaking partway through the plan.
- Never commit `.env`.

---

### Task 1: Backend — batch compare-by-ids endpoint

**Files:**
- Modify: `backend/src/main/java/com/twogofindz/backend/repository/ProductRepository.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/ProductService.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/ProductServiceImpl.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/controller/publicapi/PublicProductController.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicProductControllerTest.java`

**Interfaces:**
- Produces: `GET /api/public/products/compare?ids=1,2,3` → `ApiResponse<List<ProductResponse>>`. Results are active-only, ordered to match the requested `ids`, with malformed tokens and missing/inactive ids silently dropped (never a 4xx for a partially-bad list). No `ids` param (or all-invalid) returns an empty list.
- Consumed later by: the frontend's `compareProducts(ids)` service call (Task 2).

- [ ] **Step 1: Write the failing tests**

Add these test methods (and the private helper) to the end of the existing `PublicProductControllerTest` class, just before its closing brace:

```java
    @Test
    void compare_returnsRequestedProductsInRequestedOrder() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Compare Order Category");
        Long firstId = createProductId(token, categoryId, "Compare First", true);
        Long secondId = createProductId(token, categoryId, "Compare Second", true);

        mockMvc.perform(get("/api/public/products/compare").param("ids", secondId + "," + firstId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(secondId))
                .andExpect(jsonPath("$.data[0].name").value("Compare Second"))
                .andExpect(jsonPath("$.data[1].id").value(firstId))
                .andExpect(jsonPath("$.data[1].name").value("Compare First"));
    }

    @Test
    void compare_dropsInactiveAndMissingIds_silently() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Compare Filter Category");
        Long activeId = createProductId(token, categoryId, "Compare Active", true);
        Long inactiveId = createProductId(token, categoryId, "Compare Inactive", false);

        mockMvc.perform(get("/api/public/products/compare")
                        .param("ids", activeId + "," + inactiveId + ",999999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(activeId));
    }

    @Test
    void compare_withNoIds_returnsEmptyList() throws Exception {
        mockMvc.perform(get("/api/public/products/compare"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    void compare_toleratesNonNumericTokens_byIgnoringThem() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Compare Malformed Category");
        Long productId = createProductId(token, categoryId, "Compare Valid Token", true);

        mockMvc.perform(get("/api/public/products/compare").param("ids", "abc," + productId + ",xyz"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(productId));
    }

    private Long createProductId(String token, Long categoryId, String name, boolean active) throws Exception {
        var result = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ProductRequest(
                                name, "Compare test product.", categoryId, null,
                                new BigDecimal("10.00"), "https://amazon.com/dp/" + name.replace(" ", "-"),
                                false, false, active))))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && mvn test -Dtest=PublicProductControllerTest`
Expected: FAIL — the new test methods hit a nonexistent `/compare` endpoint (404), while the pre-existing test methods in this file keep passing.

- [ ] **Step 3: Add the repository method**

In `ProductRepository.java`, add this method to the interface (after `countByActiveTrueAndBestSellerTrue()`):

```java
    List<Product> findAllByIdInAndActiveTrue(List<Long> ids);
```

- [ ] **Step 4: Add the service method**

In `ProductService.java`, add `import java.util.List;` alongside the existing imports, and add this method signature to the interface (after `search(...)`):

```java
    List<ProductResponse> getComparableByIds(List<Long> ids);
```

In `ProductServiceImpl.java`, add `import java.util.List;` alongside the existing imports, and add this method (after `search(...)`, before `findProduct`):

```java
    @Override
    @Transactional(readOnly = true)
    public List<ProductResponse> getComparableByIds(List<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        List<Product> found = productRepository.findAllByIdInAndActiveTrue(ids);
        // Preserve the caller's requested order rather than whatever order the DB returns,
        // since the frontend uses this order as the comparison table's column order.
        return ids.stream()
                .flatMap(id -> found.stream().filter(product -> product.getId().equals(id)))
                .map(productMapper::toResponse)
                .toList();
    }
```

- [ ] **Step 5: Add the controller endpoint**

In `PublicProductController.java`, add `import java.util.Arrays;` and `import java.util.List;` alongside the existing imports, then add this endpoint (after `getById`, before `recordClick`) plus the private helper (after `recordClick`, as the last method in the class):

```java
    @GetMapping("/compare")
    public ApiResponse<List<ProductResponse>> compare(@RequestParam(required = false) String ids) {
        return ApiResponse.success("Products retrieved successfully.", productService.getComparableByIds(parseIds(ids)));
    }
```

```java
    private List<Long> parseIds(String ids) {
        if (ids == null || ids.isBlank()) {
            return List.of();
        }
        return Arrays.stream(ids.split(","))
                .map(String::trim)
                .filter(token -> token.matches("\\d+"))
                .map(Long::parseLong)
                .toList();
    }
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd backend && mvn test -Dtest=PublicProductControllerTest`
Expected: PASS (all methods in this file, old and new)

- [ ] **Step 7: Run the full backend suite**

Run: `cd backend && mvn test`
Expected: PASS — no regressions elsewhere.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/repository/ProductRepository.java \
        backend/src/main/java/com/twogofindz/backend/service/ProductService.java \
        backend/src/main/java/com/twogofindz/backend/service/impl/ProductServiceImpl.java \
        backend/src/main/java/com/twogofindz/backend/controller/publicapi/PublicProductController.java \
        backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicProductControllerTest.java
git commit -m "feat: add public batch compare-by-ids products endpoint"
```

---

### Task 2: `CompareContext`, `useCompare`, and `compareProducts` service call

**Files:**
- Create: `frontend/src/context/CompareContext.jsx`
- Create: `frontend/src/hooks/useCompare.js`
- Modify: `frontend/src/services/productService.js`
- Test: `frontend/src/context/CompareContext.test.jsx`

**Interfaces:**
- Produces: `CompareProvider({ children })` (named export). `useCompare()` returning `{ ids, toggle(id), remove(id), clear(), isSelected(id), isFull }`, where `ids` is `number[]` capped at 4, backed by `localStorage` key `compareProductIds`.
- Produces: `compareProducts(ids)` in `productService.js` — `async (ids: number[]) => ProductResponse[]`, calling `GET /public/products/compare?ids=<comma-joined>`.
- Consumed by: `App.jsx` (Task 3), `ProductCard` (Task 4), `CompareBar` (Task 5), `Navbar`/`MobileMenu` (Task 6), `ComparePage` (Task 7).

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, beforeEach } from 'vitest';
import { CompareProvider } from './CompareContext.jsx';
import { useCompare } from '../hooks/useCompare.js';

function TestConsumer() {
  const { ids, toggle, remove, clear, isSelected, isFull } = useCompare();
  return (
    <div>
      <p data-testid="ids">{ids.join(',')}</p>
      <p data-testid="isFull">{String(isFull)}</p>
      <p data-testid="isSelected1">{String(isSelected(1))}</p>
      <button onClick={() => toggle(1)}>Toggle 1</button>
      <button onClick={() => toggle(2)}>Toggle 2</button>
      <button onClick={() => toggle(3)}>Toggle 3</button>
      <button onClick={() => toggle(4)}>Toggle 4</button>
      <button onClick={() => toggle(5)}>Toggle 5</button>
      <button onClick={() => remove(2)}>Remove 2</button>
      <button onClick={() => clear()}>Clear</button>
    </div>
  );
}

function renderConsumer() {
  return render(
    <CompareProvider>
      <TestConsumer />
    </CompareProvider>
  );
}

describe('CompareContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts empty when localStorage has nothing stored', () => {
    renderConsumer();
    expect(screen.getByTestId('ids')).toHaveTextContent('');
  });

  it('adds an id when toggled on and removes it when toggled again', async () => {
    const user = userEvent.setup();
    renderConsumer();

    await user.click(screen.getByText('Toggle 1'));
    expect(screen.getByTestId('ids')).toHaveTextContent('1');
    expect(screen.getByTestId('isSelected1')).toHaveTextContent('true');

    await user.click(screen.getByText('Toggle 1'));
    expect(screen.getByTestId('ids')).toHaveTextContent('');
    expect(screen.getByTestId('isSelected1')).toHaveTextContent('false');
  });

  it('caps the selection at 4 items', async () => {
    const user = userEvent.setup();
    renderConsumer();

    await user.click(screen.getByText('Toggle 1'));
    await user.click(screen.getByText('Toggle 2'));
    await user.click(screen.getByText('Toggle 3'));
    await user.click(screen.getByText('Toggle 4'));
    expect(screen.getByTestId('isFull')).toHaveTextContent('true');

    await user.click(screen.getByText('Toggle 5'));
    expect(screen.getByTestId('ids')).toHaveTextContent('1,2,3,4');
  });

  it('removes a specific id via remove()', async () => {
    const user = userEvent.setup();
    renderConsumer();

    await user.click(screen.getByText('Toggle 1'));
    await user.click(screen.getByText('Toggle 2'));
    await user.click(screen.getByText('Remove 2'));

    expect(screen.getByTestId('ids')).toHaveTextContent('1');
  });

  it('clears the entire selection via clear()', async () => {
    const user = userEvent.setup();
    renderConsumer();

    await user.click(screen.getByText('Toggle 1'));
    await user.click(screen.getByText('Toggle 2'));
    await user.click(screen.getByText('Clear'));

    expect(screen.getByTestId('ids')).toHaveTextContent('');
  });

  it('persists the selection to localStorage and rehydrates a fresh provider from it', async () => {
    const user = userEvent.setup();
    const { unmount } = renderConsumer();

    await user.click(screen.getByText('Toggle 1'));
    await user.click(screen.getByText('Toggle 3'));
    unmount();

    renderConsumer();
    expect(screen.getByTestId('ids')).toHaveTextContent('1,3');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- CompareContext.test.jsx`
Expected: FAIL — neither `CompareContext.jsx` nor `useCompare.js` exists yet.

- [ ] **Step 3: Write the implementation**

```jsx
import { createContext, useEffect, useState } from 'react';

// eslint-disable-next-line react-refresh/only-export-components -- context and provider are intentionally co-located
export const CompareContext = createContext(null);

const STORAGE_KEY = 'compareProductIds';
const MAX_COMPARE_ITEMS = 4;

function readStoredIds() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export function CompareProvider({ children }) {
  const [ids, setIds] = useState(readStoredIds);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids]);

  function toggle(id) {
    setIds((current) => {
      if (current.includes(id)) {
        return current.filter((existingId) => existingId !== id);
      }
      if (current.length >= MAX_COMPARE_ITEMS) {
        return current;
      }
      return [...current, id];
    });
  }

  function remove(id) {
    setIds((current) => current.filter((existingId) => existingId !== id));
  }

  function clear() {
    setIds([]);
  }

  function isSelected(id) {
    return ids.includes(id);
  }

  const isFull = ids.length >= MAX_COMPARE_ITEMS;

  return (
    <CompareContext.Provider value={{ ids, toggle, remove, clear, isSelected, isFull }}>
      {children}
    </CompareContext.Provider>
  );
}
```

```js
import { useContext } from 'react';
import { CompareContext } from '../context/CompareContext.jsx';

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
}
```

Add to `frontend/src/services/productService.js` (after `getProductById`):

```js
export async function compareProducts(ids) {
  const response = await api.get('/public/products/compare', { params: { ids: ids.join(',') } });
  return response.data.data;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- CompareContext.test.jsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/context/CompareContext.jsx frontend/src/context/CompareContext.test.jsx \
        frontend/src/hooks/useCompare.js frontend/src/services/productService.js
git commit -m "feat: add CompareContext, useCompare hook, and compareProducts service call"
```

---

### Task 3: Wire `CompareProvider` into `App.jsx`

**Files:**
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `CompareProvider` from Task 2.
- Produces: `CompareContext` available to every component rendered inside `App` — the foundation every later task's `useCompare()` call relies on.

**Note:** this task deliberately lands *before* any component calls `useCompare()`, so `App.test.jsx` (which renders the real `<App />` with no mocks) never sees a broken tree at any point in this plan. No new test — `CompareProvider` adds no new observable behavior on its own; verification is running the existing suite.

- [ ] **Step 1: Modify `App.jsx`**

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { CompareProvider } from './context/CompareContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import TrendingPage from './pages/TrendingPage.jsx';
import BestSellersPage from './pages/BestSellersPage.jsx';
import PublicCategoriesPage from './pages/CategoriesPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import ProductsPage from './pages/admin/ProductsPage.jsx';
import ProductFormPage from './pages/admin/ProductFormPage.jsx';
import CategoriesPage from './pages/admin/CategoriesPage.jsx';
import SettingsPage from './pages/admin/SettingsPage.jsx';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <CompareProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/trending" element={<TrendingPage />} />
                <Route path="/categories" element={<PublicCategoriesPage />} />
                <Route path="/best-sellers" element={<BestSellersPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route element={<AdminLayout />}>
                    <Route path="/admin" element={<DashboardPage />} />
                    <Route path="/admin/products" element={<ProductsPage />} />
                    <Route path="/admin/products/new" element={<ProductFormPage />} />
                    <Route path="/admin/products/:id" element={<ProductFormPage />} />
                    <Route path="/admin/categories" element={<CategoriesPage />} />
                    <Route path="/admin/settings" element={<SettingsPage />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </BrowserRouter>
          </CompareProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
```

- [ ] **Step 2: Run the full suite to confirm no regressions**

Run: `cd frontend && npm test`
Expected: PASS — every prior test, unchanged.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: wire CompareProvider into App.jsx"
```

---

### Task 4: `ProductCard` — Add to Compare toggle

**Files:**
- Modify: `frontend/src/components/ProductCard.jsx`
- Modify: `frontend/src/components/ProductCard.test.jsx`
- Modify: `frontend/src/components/ProductGrid.test.jsx`
- Modify: `frontend/src/components/CatalogPage.test.jsx`
- Modify: `frontend/src/pages/HomePage.test.jsx`

**Interfaces:**
- Consumes: `useCompare()` from Task 2 (`isSelected`, `isFull`, `toggle`).
- Produces: no new exports — `ProductCard` itself now requires a `CompareProvider` ancestor, which is why every test file that renders it (directly or transitively, when it actually receives product data) needs a `CompareProvider` wrapper added in this task.

- [ ] **Step 1: Write the failing tests**

Add these two tests to `ProductCard.test.jsx`, and wrap **every** `render(<ProductCard ... />)` call in the file with `<CompareProvider>` (the whole file's tests will fail to run at all otherwise, since `useCompare()` throws without a provider). Add the import and a `beforeEach` reset, then update every existing `render(...)` call:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ProductCard from './ProductCard.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
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

function renderCard(product = baseProduct) {
  return render(
    <CompareProvider>
      <ProductCard product={product} />
    </CompareProvider>
  );
}

describe('ProductCard', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders the product name, category, and the trending badge only', () => {
    renderCard();

    expect(screen.getByText('Wireless Earbuds')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Trending')).toBeInTheDocument();
    expect(screen.queryByText('Best Seller')).not.toBeInTheDocument();
  });

  it('never renders the description, price, or added date', () => {
    renderCard();

    expect(screen.queryByText(baseProduct.description)).not.toBeInTheDocument();
    expect(screen.queryByText('$49.99')).not.toBeInTheDocument();
    expect(screen.queryByText(/added/i)).not.toBeInTheDocument();
  });

  it('renders the "View on Amazon" link with the correct href and rel attributes', () => {
    renderCard();

    const link = screen.getByRole('link', { name: /view on amazon/i });
    expect(link).toHaveAttribute('href', baseProduct.productLink);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'nofollow sponsored noopener noreferrer');
  });

  it('records a click with the stored session id when "View on Amazon" is clicked', async () => {
    sessionStorage.setItem('sessionId', 'test-session-abc');
    vi.spyOn(trackingService, 'recordClick').mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('link', { name: /view on amazon/i }));

    expect(trackingService.recordClick).toHaveBeenCalledWith(baseProduct.id, 'test-session-abc');
  });

  it('renders a placeholder message when there is no product image', () => {
    renderCard({ ...baseProduct, imageFileName: null });

    expect(screen.getByText('No image available')).toBeInTheDocument();
  });

  it('hides the badges on mobile, showing them from sm: up', () => {
    renderCard();

    expect(screen.getByText('Trending').parentElement).toHaveClass('hidden', 'sm:flex');
  });

  it('always shows the image, category, name, and "View on Amazon" button, regardless of screen size', () => {
    renderCard();

    expect(screen.getByText('Electronics')).not.toHaveClass('hidden');
    expect(screen.getByText('Wireless Earbuds')).not.toHaveClass('hidden');
    expect(screen.getByRole('link', { name: /view on amazon/i })).not.toHaveClass('hidden');
  });

  it('toggles the compare selection when the compare button is clicked', async () => {
    const user = userEvent.setup();
    renderCard();

    const compareButton = screen.getByRole('button', { name: 'Add Wireless Earbuds to Compare' });
    expect(compareButton).toHaveAttribute('aria-pressed', 'false');

    await user.click(compareButton);

    expect(screen.getByRole('button', { name: 'Remove Wireless Earbuds from Compare' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('disables the compare button once 4 other products are already selected', () => {
    localStorage.setItem('compareProductIds', JSON.stringify([10, 20, 30, 40]));
    renderCard();

    expect(screen.getByRole('button', { name: 'Add Wireless Earbuds to Compare' })).toBeDisabled();
  });
});
```

In `ProductGrid.test.jsx`, add the `CompareProvider` import and wrap the one render call that supplies real product data:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductGrid from './ProductGrid.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';

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
    render(
      <CompareProvider>
        <ProductGrid products={[product]} isLoading={false} error={null} />
      </CompareProvider>
    );
    expect(screen.getByText('Wireless Earbuds')).toBeInTheDocument();
  });

  it('uses a 2-column grid on mobile', () => {
    const { container } = render(
      <CompareProvider>
        <ProductGrid products={[product]} isLoading={false} error={null} />
      </CompareProvider>
    );
    expect(container.firstChild).toHaveClass('grid-cols-2');
  });
});
```

In `CatalogPage.test.jsx`, add the `CompareProvider` import and wrap the render helper's output:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CatalogPage from './CatalogPage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';
import * as productService from '../services/productService.js';

const settings = { affiliateDisclosure: 'As an Amazon Associate...' };
const categories = [{ id: 1, productCategoryName: 'Electronics' }];
const product = {
  id: 1,
  name: 'Wireless Earbuds',
  categoryName: 'Electronics',
  imageFileName: null,
  productPrice: '49.99',
  productLink: 'https://amazon.com/dp/example',
  trending: true,
  bestSeller: false,
  active: true,
  createdAt: '2026-07-20T10:00:00',
};

function renderCatalog(props, initialEntries = ['/trending']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CompareProvider>
        <CatalogPage title="Trending Finds" {...props} />
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('CatalogPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(settings);
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue(categories);
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [product],
      totalPages: 1,
      totalElements: 1,
    });
  });

  it('renders the title and fetched products', async () => {
    renderCatalog();
    expect(await screen.findByRole('heading', { name: 'Trending Finds' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('Wireless Earbuds').length).toBeGreaterThan(0));
  });

  it('seeds the filter from initialFilter when the URL has no filter param', async () => {
    renderCatalog({ initialFilter: 'trending' });

    await waitFor(() =>
      expect(productService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ trending: true }))
    );
  });

  it('does not override an explicit URL filter with initialFilter', async () => {
    renderCatalog({ initialFilter: 'trending' }, ['/trending?filter=bestSeller']);

    await waitFor(() =>
      expect(productService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ bestSeller: true }))
    );
    const lastCallParams = productService.searchProducts.mock.calls.at(-1)[0];
    expect(lastCallParams.trending).toBeUndefined();
  });

  it('seeds the category from initialCategoryId when the URL has no category param', async () => {
    renderCatalog({ initialCategoryId: 1 });

    await waitFor(() =>
      expect(productService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ categoryId: '1' }))
    );
  });

  it('renders children between the navbar and the catalog section', async () => {
    renderCatalog({ children: <div>Extra Content</div> });
    expect(await screen.findByText('Extra Content')).toBeInTheDocument();
  });
});
```

In `pages/HomePage.test.jsx`, add the `CompareProvider` import and wrap the render helper's output:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import HomePage from './HomePage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';
import * as productService from '../services/productService.js';
import * as trackingService from '../services/trackingService.js';
import * as heroBannerService from '../services/heroBannerService.js';

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

function renderHomePage(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CompareProvider>
        <HomePage />
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(settings);
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue(categories);
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [product],
      totalPages: 1,
      totalElements: 1,
    });
    vi.spyOn(trackingService, 'recordView').mockResolvedValue({ sessionId: 'session-abc' });
    vi.spyOn(heroBannerService, 'getHeroBanners').mockResolvedValue([]);
  });

  it('renders the hero headline from settings', async () => {
    renderHomePage();
    expect(await screen.findByRole('heading', { name: settings.heroHeadline })).toBeInTheDocument();
  });

  it('renders the shop-by-category section and the main catalog with fetched products', async () => {
    renderHomePage();

    await waitFor(() => expect(screen.getAllByText('Electronics').length).toBeGreaterThan(0));
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

  it('renders the default HeroSection when there are no hero banners', async () => {
    renderHomePage();
    expect(await screen.findByRole('heading', { name: settings.heroHeadline })).toBeInTheDocument();
  });

  it('renders the hero carousel when hero banners are configured', async () => {
    heroBannerService.getHeroBanners.mockResolvedValue([
      {
        id: 1,
        imageFilename: 'img_1.webp',
        imageAlt: 'Trending gadgets',
        badge: 'Trending Today',
        headline: 'Amazon Finds Everyone Is Talking About',
        description: 'Discover trending products.',
        buttonText: 'Explore Trending Finds',
        buttonLink: '/trending',
      },
    ]);
    renderHomePage();

    expect(
      await screen.findByRole('heading', { name: 'Amazon Finds Everyone Is Talking About' })
    ).toBeInTheDocument();
  });

  it('scrolls to the catalog section when arriving with a #catalog hash', async () => {
    const scrollIntoViewSpy = vi.fn();
    vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(scrollIntoViewSpy);

    renderHomePage(['/#catalog']);

    await screen.findByRole('heading', { name: settings.heroHeadline });
    await waitFor(() => expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: 'smooth' }));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- ProductCard.test.jsx ProductGrid.test.jsx CatalogPage.test.jsx HomePage.test.jsx`
Expected: FAIL — `useCompare` throws (no provider) wherever `ProductCard` renders with product data, and the two new `ProductCard` tests fail since the toggle button doesn't exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
import { motion } from 'framer-motion';
import { Check, GitCompare } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl.js';
import { recordClick } from '../services/trackingService.js';
import { useCompare } from '../hooks/useCompare.js';

function ProductCard({ product }) {
  const imageUrl = getImageUrl(product.imageFileName);
  const { isSelected, isFull, toggle } = useCompare();
  const selected = isSelected(product.id);

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
        <div className="absolute left-2 top-2 hidden gap-1.5 sm:flex">
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
        <button
          type="button"
          onClick={() => toggle(product.id)}
          disabled={!selected && isFull}
          aria-pressed={selected}
          aria-label={selected ? `Remove ${product.name} from Compare` : `Add ${product.name} to Compare`}
          title={!selected && isFull ? 'Compare is full — remove an item to add another' : undefined}
          className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
            selected ? 'bg-indigo-600 text-white' : 'bg-white/90 text-slate-600 hover:bg-white'
          }`}
        >
          {selected ? <Check size={16} /> : <GitCompare size={16} />}
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-indigo-600">{product.categoryName}</span>
        <h3 className="text-base font-semibold text-slate-900">{product.name}</h3>
        <a
          href={product.productLink}
          onClick={handleViewOnAmazon}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="mt-auto inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          View on Amazon
        </a>
      </div>
    </motion.article>
  );
}

export default ProductCard;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- ProductCard.test.jsx ProductGrid.test.jsx CatalogPage.test.jsx HomePage.test.jsx`
Expected: PASS (9 + 5 + 5 + 8 tests respectively)

- [ ] **Step 5: Run the full suite to catch anything else affected**

Run: `cd frontend && npm test`
Expected: PASS — every test file, including `TrendingPage.test.jsx`/`BestSellersPage.test.jsx`/`pages/CategoriesPage.test.jsx`, which mock `searchProducts` with an **empty** `content` array and so never actually instantiate a real `ProductCard`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ProductCard.jsx frontend/src/components/ProductCard.test.jsx \
        frontend/src/components/ProductGrid.test.jsx frontend/src/components/CatalogPage.test.jsx \
        frontend/src/pages/HomePage.test.jsx
git commit -m "feat: add Add-to-Compare toggle to ProductCard"
```

---

### Task 5: `CompareBar`

**Files:**
- Create: `frontend/src/components/CompareBar.jsx`
- Test: `frontend/src/components/CompareBar.test.jsx`

**Interfaces:**
- Consumes: `useCompare()` (Task 2), `compareProducts` from `productService.js` (Task 2).
- Produces: `CompareBar()` (default export, no props). Used by `App.jsx` (Task 8).

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CompareBar from './CompareBar.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as productService from '../services/productService.js';

const product = {
  id: 1,
  name: 'Wireless Earbuds',
  imageFileName: null,
};

function renderBar(initialIds = []) {
  if (initialIds.length > 0) {
    localStorage.setItem('compareProductIds', JSON.stringify(initialIds));
  }
  return render(
    <MemoryRouter>
      <CompareProvider>
        <CompareBar />
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('CompareBar', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders nothing when the compare list is empty', () => {
    renderBar([]);
    expect(screen.queryByText(/compare \(/i)).not.toBeInTheDocument();
  });

  it('shows the count and thumbnails when products are selected', async () => {
    vi.spyOn(productService, 'compareProducts').mockResolvedValue([product]);
    renderBar([1]);

    expect(await screen.findByText('Compare (1)')).toBeInTheDocument();
    expect(screen.getByAltText('Wireless Earbuds')).toBeInTheDocument();
  });

  it('removes a product when its remove button is clicked', async () => {
    vi.spyOn(productService, 'compareProducts').mockResolvedValue([product]);
    const user = userEvent.setup();
    renderBar([1]);

    await screen.findByText('Compare (1)');
    await user.click(screen.getByRole('button', { name: 'Remove Wireless Earbuds from compare' }));

    await waitFor(() => expect(screen.queryByText(/compare \(/i)).not.toBeInTheDocument());
  });

  it('clears the entire list when "Clear" is clicked', async () => {
    vi.spyOn(productService, 'compareProducts').mockResolvedValue([product]);
    const user = userEvent.setup();
    renderBar([1]);

    await screen.findByText('Compare (1)');
    await user.click(screen.getByRole('button', { name: 'Clear compare list' }));

    await waitFor(() => expect(screen.queryByText(/compare \(/i)).not.toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- CompareBar.test.jsx`
Expected: FAIL — `CompareBar.jsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, X } from 'lucide-react';
import { useCompare } from '../hooks/useCompare.js';
import { compareProducts } from '../services/productService.js';
import { getImageUrl } from '../utils/imageUrl.js';

function CompareBar() {
  const { ids, remove, clear } = useCompare();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (ids.length === 0) {
      setProducts([]);
      return undefined;
    }

    let isCancelled = false;
    compareProducts(ids)
      .then((data) => {
        if (!isCancelled) setProducts(data);
      })
      .catch(() => {
        if (!isCancelled) setProducts([]);
      });

    return () => {
      isCancelled = true;
    };
  }, [ids]);

  if (ids.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white shadow-lg">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {products.map((product) => (
            <div key={product.id} className="relative">
              <img
                src={getImageUrl(product.imageFileName)}
                alt={product.name}
                className="h-12 w-12 rounded-md object-cover"
              />
              <button
                type="button"
                onClick={() => remove(product.id)}
                aria-label={`Remove ${product.name} from compare`}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={clear}
          aria-label="Clear compare list"
          className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          <Trash2 size={16} />
          Clear
        </button>
        <Link
          to="/compare"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          Compare ({ids.length})
        </Link>
      </div>
    </div>
  );
}

export default CompareBar;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- CompareBar.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/CompareBar.jsx frontend/src/components/CompareBar.test.jsx
git commit -m "feat: add global CompareBar"
```

---

### Task 6: "Compare" link with count badge in `Navbar` and `MobileMenu`

**Files:**
- Modify: `frontend/src/components/Navbar.jsx`
- Modify: `frontend/src/components/MobileMenu.jsx`
- Modify: `frontend/src/components/Navbar.test.jsx`
- Modify: `frontend/src/components/MobileMenu.test.jsx`
- Modify: `frontend/src/pages/TrendingPage.test.jsx`
- Modify: `frontend/src/pages/BestSellersPage.test.jsx`
- Modify: `frontend/src/pages/CategoriesPage.test.jsx`

**Interfaces:**
- Consumes: `useCompare()` (Task 2) in `Navbar` only. `MobileMenu` receives the count via a new `compareCount` prop from `Navbar` (default `0`) — it does not call `useCompare()` itself, so `MobileMenu.test.jsx` needs no `CompareProvider`.
- Produces: `MobileMenu({ isOpen, onClose, compareCount })`. Since `Navbar` now calls `useCompare()`, every test file that renders `Navbar` (directly, or transitively via `CatalogPage`/`HomePage`) needs a `CompareProvider` ancestor — `CatalogPage.test.jsx`/`HomePage.test.jsx` already got this in Task 4; this task adds it to `TrendingPage.test.jsx`, `BestSellersPage.test.jsx`, and `pages/CategoriesPage.test.jsx`, which weren't touched then (their mocked `searchProducts` returns empty content, so `ProductCard` never rendered, but `Navbar` always does).

- [ ] **Step 1: Write the failing tests**

Replace `Navbar.test.jsx` in full:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Navbar from './Navbar.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as categoryService from '../services/categoryService.js';

function renderNavbar(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CompareProvider>
        <Navbar />
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('Navbar', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([{ id: 1, productCategoryName: 'Electronics' }]);
  });

  it('renders the main nav links', () => {
    renderNavbar();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trending' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Best Sellers' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Compare' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Categories' })).toBeInTheDocument();
  });

  it('highlights the active route', () => {
    renderNavbar(['/trending']);
    expect(screen.getByRole('link', { name: 'Trending' })).toHaveClass('text-indigo-600');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveClass('text-indigo-600');
  });

  it('opens the categories dropdown and lists fetched categories', async () => {
    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getByRole('button', { name: 'Categories' }));

    expect(await screen.findByRole('menuitem', { name: 'Electronics' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'All Categories' })).toHaveAttribute('href', '/categories');
    expect(screen.getByRole('menuitem', { name: 'Electronics' })).toHaveAttribute('href', '/categories?category=1');
  });

  it('closes the categories dropdown on outside click', async () => {
    const user = userEvent.setup();
    renderNavbar();
    await user.click(screen.getByRole('button', { name: 'Categories' }));
    await screen.findByRole('menuitem', { name: 'Electronics' });

    await user.click(document.body);

    await waitFor(() => expect(screen.queryByRole('menuitem', { name: 'Electronics' })).not.toBeInTheDocument());
  });

  it('opens the mobile menu when the hamburger button is clicked', async () => {
    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(screen.getAllByRole('link', { name: 'Trending' }).length).toBeGreaterThan(1);
  });

  it('links the search button to browse all products', () => {
    renderNavbar();

    expect(screen.getByRole('link', { name: 'Browse all products' })).toHaveAttribute('href', '/#catalog');
  });

  it('shows no compare count badge when nothing is selected', () => {
    renderNavbar();
    expect(screen.getByRole('link', { name: 'Compare' })).not.toHaveTextContent(/\d/);
  });

  it('shows the compare count badge once products are selected', () => {
    localStorage.setItem('compareProductIds', JSON.stringify([1, 2]));
    renderNavbar();
    // The badge digit is rendered inside the same link, so its accessible name becomes
    // "Compare2" -- an exact "Compare" match would no longer find it once the badge shows.
    expect(screen.getByRole('link', { name: /compare/i })).toHaveTextContent('2');
  });
});
```

Replace `MobileMenu.test.jsx` in full:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import MobileMenu from './MobileMenu.jsx';

function renderMenu(props) {
  return render(
    <MemoryRouter>
      <MobileMenu isOpen onClose={vi.fn()} {...props} />
    </MemoryRouter>
  );
}

describe('MobileMenu', () => {
  it('renders nothing when closed', () => {
    render(
      <MemoryRouter>
        <MobileMenu isOpen={false} onClose={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
  });

  it('renders the nav links, a Compare link, and a search link when open', () => {
    renderMenu();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trending' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Categories' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Best Sellers' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Compare' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /search/i })).toHaveAttribute('href', '/#catalog');
  });

  it('calls onClose when a nav link is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderMenu({ onClose });

    await user.click(screen.getByRole('link', { name: 'Trending' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when the search link is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderMenu({ onClose });

    await user.click(screen.getByRole('link', { name: /search/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderMenu({ onClose });

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });

  it('shows no compare count badge when compareCount is 0', () => {
    renderMenu({ compareCount: 0 });
    expect(screen.getByRole('link', { name: 'Compare' })).not.toHaveTextContent(/\d/);
  });

  it('shows the compare count badge when compareCount is greater than 0', () => {
    renderMenu({ compareCount: 3 });
    // Same reasoning as Navbar's equivalent test: the badge digit is part of the link's
    // accessible name once it renders, so an exact "Compare" match would miss it.
    expect(screen.getByRole('link', { name: /compare/i })).toHaveTextContent('3');
  });
});
```

In `pages/TrendingPage.test.jsx`, wrap the render in `CompareProvider`:

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import TrendingPage from './TrendingPage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';
import * as productService from '../services/productService.js';

describe('TrendingPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({});
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([]);
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
  });

  it('renders the Trending Finds title and seeds the trending filter', async () => {
    render(
      <MemoryRouter initialEntries={['/trending']}>
        <CompareProvider>
          <TrendingPage />
        </CompareProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Trending Finds' })).toBeInTheDocument();
    expect(productService.searchProducts).toHaveBeenCalledWith(expect.objectContaining({ trending: true }));
  });
});
```

In `pages/BestSellersPage.test.jsx`, wrap the render in `CompareProvider`:

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BestSellersPage from './BestSellersPage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';
import * as productService from '../services/productService.js';

describe('BestSellersPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({});
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([]);
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
  });

  it('renders the Best Sellers title and seeds the bestSeller filter', async () => {
    render(
      <MemoryRouter initialEntries={['/best-sellers']}>
        <CompareProvider>
          <BestSellersPage />
        </CompareProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Best Sellers' })).toBeInTheDocument();
    expect(productService.searchProducts).toHaveBeenCalledWith(expect.objectContaining({ bestSeller: true }));
  });
});
```

In `pages/CategoriesPage.test.jsx`, wrap the render in `CompareProvider`:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CategoriesPage from './CategoriesPage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';
import * as productService from '../services/productService.js';

const categories = [{ id: 1, productCategoryName: 'Electronics' }];

function renderPage(initialEntries = ['/categories']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CompareProvider>
        <CategoriesPage />
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('CategoriesPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({});
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue(categories);
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
  });

  it('renders the category card grid and the catalog title', async () => {
    renderPage();

    expect(await screen.findByText('Shop by Category')).toBeInTheDocument();
    expect(screen.getAllByText('Electronics').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Categories' })).toBeInTheDocument();
  });

  it('filters the catalog to the clicked category', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Shop by Category');

    await user.click(screen.getByRole('button', { name: 'Electronics' }));

    await waitFor(() =>
      expect(productService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ categoryId: '1' }))
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- Navbar.test.jsx MobileMenu.test.jsx TrendingPage.test.jsx BestSellersPage.test.jsx`
Expected: FAIL — no "Compare" link exists yet in either component, and the page tests fail because `Navbar` (rendered inside them) now calls `useCompare()` without a provider.

- [ ] **Step 3: Write the implementation**

In `Navbar.jsx`, add the import and the `useCompare()` call, add the "Compare" `NavLink` between the Categories dropdown and "Best Sellers", and pass `compareCount` to `MobileMenu`:

```jsx
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ChevronDown, Menu, Search } from 'lucide-react';
import logo from '../assets/2gofindz.png';
import MobileMenu from './MobileMenu.jsx';
import { getCategories } from '../services/categoryService.js';
import { useCompare } from '../hooks/useCompare.js';

const navLinkClassName = ({ isActive }) =>
  `text-sm font-medium transition ${isActive ? 'text-indigo-600' : 'text-slate-700 hover:text-indigo-600'}`;

function Navbar() {
  const { ids } = useCompare();
  const [categories, setCategories] = useState([]);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const categoriesRef = useRef(null);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!isCategoriesOpen) return undefined;

    function handleClickOutside(event) {
      if (categoriesRef.current && !categoriesRef.current.contains(event.target)) {
        setIsCategoriesOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsCategoriesOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCategoriesOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="2Go Findz home">
            <img src={logo} alt="2Go Findz" className="h-10 w-10" />
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-6 md:flex">
            <NavLink to="/" end className={navLinkClassName}>
              Home
            </NavLink>
            <NavLink to="/trending" className={navLinkClassName}>
              Trending
            </NavLink>
            <div ref={categoriesRef} className="relative">
              <button
                type="button"
                onClick={() => setIsCategoriesOpen((open) => !open)}
                aria-expanded={isCategoriesOpen}
                aria-haspopup="menu"
                className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-indigo-600"
              >
                Categories
                <ChevronDown size={16} />
              </button>
              {isCategoriesOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-full mt-2 w-56 rounded-md border border-slate-200 bg-white py-2 shadow-lg"
                >
                  <Link
                    to="/categories"
                    role="menuitem"
                    onClick={() => setIsCategoriesOpen(false)}
                    className="block px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
                  >
                    All Categories
                  </Link>
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      to={`/categories?category=${category.id}`}
                      role="menuitem"
                      onClick={() => setIsCategoriesOpen(false)}
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {category.productCategoryName}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <NavLink to="/compare" className={navLinkClassName}>
              Compare
              {ids.length > 0 && (
                <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                  {ids.length}
                </span>
              )}
            </NavLink>
            <NavLink to="/best-sellers" className={navLinkClassName}>
              Best Sellers
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/#catalog"
              aria-label="Browse all products"
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
            >
              <Search size={20} />
            </Link>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        compareCount={ids.length}
      />
    </>
  );
}

export default Navbar;
```

In `MobileMenu.jsx`, add "Compare" to `NAV_ITEMS`, accept the `compareCount` prop, and render the badge next to the Compare label:

```jsx
import { useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/trending', label: 'Trending' },
  { to: '/categories', label: 'Categories' },
  { to: '/compare', label: 'Compare' },
  { to: '/best-sellers', label: 'Best Sellers' },
];

function MobileMenu({ isOpen, onClose, compareCount = 0 }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Mobile navigation">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        transition={{ type: 'tween', duration: 0.2 }}
        className="absolute inset-y-0 left-0 w-64 bg-white"
      >
        <nav aria-label="Mobile navigation" className="flex h-full flex-col px-3 py-6">
          <ul className="flex-1 space-y-1">
            {NAV_ITEMS.map(({ to, label, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center rounded-md px-3 py-2 text-sm font-medium transition ${
                      isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700 hover:bg-slate-100'
                    }`
                  }
                >
                  {label}
                  {to === '/compare' && compareCount > 0 && (
                    <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                      {compareCount}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
            <li>
              <Link
                to="/#catalog"
                onClick={onClose}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <Search size={16} />
                Search
              </Link>
            </li>
          </ul>
        </nav>
      </motion.div>
    </div>
  );
}

export default MobileMenu;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- Navbar.test.jsx MobileMenu.test.jsx TrendingPage.test.jsx BestSellersPage.test.jsx`
Expected: PASS (8 + 7 + 1 + 1 tests respectively)

- [ ] **Step 5: Run the full suite**

Run: `cd frontend && npm test`
Expected: PASS — `pages/CategoriesPage.test.jsx` (public) is covered by this task's `CompareProvider` wrapper too, since it renders `Navbar` via `CatalogPage`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Navbar.jsx frontend/src/components/Navbar.test.jsx \
        frontend/src/components/MobileMenu.jsx frontend/src/components/MobileMenu.test.jsx \
        frontend/src/pages/TrendingPage.test.jsx frontend/src/pages/BestSellersPage.test.jsx \
        frontend/src/pages/CategoriesPage.test.jsx
git commit -m "feat: add Compare link with count badge to Navbar and MobileMenu"
```

---

### Task 7: `ComparePage`

**Files:**
- Create: `frontend/src/pages/ComparePage.jsx`
- Test: `frontend/src/pages/ComparePage.test.jsx`

**Interfaces:**
- Consumes: `useCompare()` (Task 2), `compareProducts` from `productService.js` (Task 2), `Navbar` (already `CompareProvider`-aware from Task 6), `Footer`, `SectionHeading`, `LoadingSpinner`, `EmptyState`, `ErrorState` (all existing, unmodified), `getImageUrl` (existing), `getSettings` (existing).
- Produces: `ComparePage()` (default export, no props). Used by `App.jsx` (Task 8) at route `/compare`.

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ComparePage from './ComparePage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as productService from '../services/productService.js';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';

const productA = {
  id: 1,
  name: 'Wireless Earbuds',
  description: 'Compact wireless earbuds.',
  categoryName: 'Electronics',
  imageFileName: null,
  productPrice: '49.99',
  productLink: 'https://amazon.com/dp/earbuds',
  trending: true,
  bestSeller: false,
};

const productB = {
  id: 2,
  name: 'Smart Watch',
  description: 'Feature-packed smart watch.',
  categoryName: 'Electronics',
  imageFileName: null,
  productPrice: '99.99',
  productLink: 'https://amazon.com/dp/watch',
  trending: false,
  bestSeller: true,
};

function renderComparePage(initialIds = [1, 2]) {
  if (initialIds.length > 0) {
    localStorage.setItem('compareProductIds', JSON.stringify(initialIds));
  }
  return render(
    <MemoryRouter>
      <CompareProvider>
        <ComparePage />
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('ComparePage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({});
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([]);
  });

  it('shows an empty state when nothing is selected', async () => {
    renderComparePage([]);

    expect(await screen.findByText('Add at least 2 products to compare')).toBeInTheDocument();
  });

  it('shows an empty state when only 1 product is selected', async () => {
    vi.spyOn(productService, 'compareProducts').mockResolvedValue([productA]);
    renderComparePage([1]);

    expect(await screen.findByText('Add at least 2 products to compare')).toBeInTheDocument();
  });

  it('renders a comparison table with full detail for each selected product', async () => {
    vi.spyOn(productService, 'compareProducts').mockResolvedValue([productA, productB]);
    renderComparePage();

    expect(await screen.findByText('Wireless Earbuds')).toBeInTheDocument();
    expect(screen.getByText('Smart Watch')).toBeInTheDocument();
    expect(screen.getAllByText('Electronics').length).toBeGreaterThan(0);
    expect(screen.getByText('$49.99')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
    expect(screen.getByText('Compact wireless earbuds.')).toBeInTheDocument();
    expect(screen.getByText('Trending')).toBeInTheDocument();
    expect(screen.getByText('Best Seller')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /view on amazon/i })).toHaveLength(2);
  });

  it('removes a product from the comparison when its remove button is clicked', async () => {
    vi.spyOn(productService, 'compareProducts').mockImplementation((ids) =>
      Promise.resolve([productA, productB].filter((product) => ids.includes(product.id)))
    );
    const user = userEvent.setup();
    renderComparePage();

    await screen.findByText('Wireless Earbuds');
    await user.click(screen.getByRole('button', { name: 'Remove Wireless Earbuds from compare' }));

    await waitFor(() => expect(screen.queryByText('Wireless Earbuds')).not.toBeInTheDocument());
    expect(await screen.findByText('Add at least 2 products to compare')).toBeInTheDocument();
  });

  it('shows an error state when fetching fails', async () => {
    vi.spyOn(productService, 'compareProducts').mockRejectedValue({ message: 'Network error. Please try again.' });
    renderComparePage();

    expect(await screen.findByText('Network error. Please try again.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- ComparePage.test.jsx`
Expected: FAIL — `ComparePage.jsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { useCompare } from '../hooks/useCompare.js';
import { compareProducts } from '../services/productService.js';
import { getSettings } from '../services/settingsService.js';
import { getImageUrl } from '../utils/imageUrl.js';

function ComparePage() {
  const { ids, remove } = useCompare();
  const [settings, setSettings] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    if (ids.length === 0) {
      setProducts([]);
      setIsLoading(false);
      return undefined;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    compareProducts(ids)
      .then((data) => {
        if (isCancelled) return;
        setProducts(data);
      })
      .catch((err) => {
        if (isCancelled) return;
        setError(err.message ?? 'Failed to load products to compare.');
      })
      .finally(() => {
        if (isCancelled) return;
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [ids]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Compare Products" description="See your selected products side by side." />

          {isLoading && <LoadingSpinner label="Loading products to compare..." />}
          {!isLoading && error && <ErrorState message={error} />}
          {!isLoading && !error && products.length < 2 && (
            <div className="text-center">
              <EmptyState
                title="Add at least 2 products to compare"
                description="Use the compare icon on any product card to add it here."
              />
              <Link to="/#catalog" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">
                Browse products
              </Link>
            </div>
          )}
          {!isLoading && !error && products.length >= 2 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr>
                    <th scope="col" className="w-32 p-3 text-sm font-medium text-slate-500"></th>
                    {products.map((product) => (
                      <th key={product.id} scope="col" className="p-3 align-top">
                        <button
                          type="button"
                          onClick={() => remove(product.id)}
                          aria-label={`Remove ${product.name} from compare`}
                          className="mb-2 ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                        >
                          <X size={14} />
                        </button>
                        <img
                          src={getImageUrl(product.imageFileName)}
                          alt={product.name}
                          className="aspect-square w-full rounded-lg object-cover"
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                      Name
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3 text-sm font-semibold text-slate-900">
                        {product.name}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                      Category
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3 text-sm text-slate-700">
                        {product.categoryName}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                      Price
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3 text-sm font-semibold text-slate-900">
                        ${Number(product.productPrice).toFixed(2)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                      Badges
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3 text-sm text-slate-700">
                        <div className="flex flex-wrap gap-1.5">
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
                          {!product.trending && !product.bestSeller && <span className="text-slate-400">—</span>}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                      Description
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3 text-sm text-slate-600">
                        {product.description}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500"></th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3">
                        <a
                          href={product.productLink}
                          target="_blank"
                          rel="nofollow sponsored noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                          View on Amazon
                        </a>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      <Footer settings={settings} />
    </div>
  );
}

export default ComparePage;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- ComparePage.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ComparePage.jsx frontend/src/pages/ComparePage.test.jsx
git commit -m "feat: add ComparePage with full-detail comparison table"
```

---

### Task 8: Wire `/compare` route and `CompareBar` into `App.jsx`

**Files:**
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `ComparePage` (Task 7), `CompareBar` (Task 5).
- Produces: the complete `/compare` route and the always-mounted `CompareBar`. No dedicated test — covered by `ComparePage.test.jsx`/`CompareBar.test.jsx` plus this task's full-suite verification, matching how routing wiring was handled in the prior Navbar Redesign stage.

- [ ] **Step 1: Modify `App.jsx`**

Add the `ComparePage` and `CompareBar` imports, the `/compare` route, and render `<CompareBar />` as a sibling of `<Routes>` (inside `<BrowserRouter>`, so it's always mounted regardless of the current route):

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { CompareProvider } from './context/CompareContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import CompareBar from './components/CompareBar.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import TrendingPage from './pages/TrendingPage.jsx';
import BestSellersPage from './pages/BestSellersPage.jsx';
import PublicCategoriesPage from './pages/CategoriesPage.jsx';
import ComparePage from './pages/ComparePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import ProductsPage from './pages/admin/ProductsPage.jsx';
import ProductFormPage from './pages/admin/ProductFormPage.jsx';
import CategoriesPage from './pages/admin/CategoriesPage.jsx';
import SettingsPage from './pages/admin/SettingsPage.jsx';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <CompareProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/trending" element={<TrendingPage />} />
                <Route path="/categories" element={<PublicCategoriesPage />} />
                <Route path="/best-sellers" element={<BestSellersPage />} />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route element={<AdminLayout />}>
                    <Route path="/admin" element={<DashboardPage />} />
                    <Route path="/admin/products" element={<ProductsPage />} />
                    <Route path="/admin/products/new" element={<ProductFormPage />} />
                    <Route path="/admin/products/:id" element={<ProductFormPage />} />
                    <Route path="/admin/categories" element={<CategoriesPage />} />
                    <Route path="/admin/settings" element={<SettingsPage />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              <CompareBar />
            </BrowserRouter>
          </CompareProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
```

- [ ] **Step 2: Run the full suite to confirm no regressions**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus all tests from Tasks 2 through 7.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: wire /compare route and CompareBar into App.jsx"
```

---

### Task 9: Final verification

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything from Tasks 1–8
- Produces: nothing further downstream — this stage's final gate.

- [ ] **Step 1: Run the entire backend test suite**

Run: `cd backend && mvn test`
Expected: PASS — every prior test plus Task 1's new tests.

- [ ] **Step 2: Run the entire frontend test suite**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus all tests from Tasks 2 through 8.

- [ ] **Step 3: Run frontend lint**

Run: `cd frontend && npm run lint`
Expected: clean (0 errors, 0 warnings). If lint flags something unanticipated (e.g. an exhaustive-deps warning), apply the established pattern from prior stages: a one-line `eslint-disable-next-line` with justification only if the rule is genuinely a false positive for that effect's shape — never add one preemptively where lint doesn't actually flag it.

- [ ] **Step 4: Run the frontend production build**

Run: `cd frontend && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 5: Run the backend build**

Run: `cd backend && mvn clean package -DskipTests`
Expected: succeeds with no errors.

- [ ] **Step 6: Manual smoke check (optional, requires both servers running)**

Optional — skip if a live backend isn't available; Steps 1-5 are the mandatory bar. If available: confirm the compare icon toggles on/off on a product card and disables once 4 are selected; the floating `CompareBar` appears with correct thumbnails/count and its remove/clear controls work; the "Compare" navbar link and badge update live as products are added/removed, on both desktop and the mobile menu; `/compare` renders the full comparison table for 2+ selections and the correct empty state for 0 or 1; removing a product from the table updates the navbar badge and `CompareBar` too; refreshing the page preserves the selection (localStorage persistence).

- [ ] **Step 7: Commit (if the smoke check surfaced any fixes)**

If Step 6 found nothing to fix (or was skipped), there is nothing to commit for this task — Task 8's commit is the final commit of this stage. If it did surface a small fix, apply it, re-run Steps 1-5, and commit:
```bash
git add -A
git commit -m "fix: address issue found during Compare feature manual smoke check"
```
