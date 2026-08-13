# Admin Dashboard Phase 2: Top Categories, Recent Products Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Top Categories" card (click-count ranking) and a "Recent Products" table card to the admin dashboard, completing the analytics row started in Phase 1 and beginning the lower dashboard grid.

**Architecture:** Two new aggregation queries on the existing `ProductClickRepository`/`ProductRepository` (mirroring already-established query patterns — no new tables, no N+1), surfaced as two new fields on the existing `DashboardAnalyticsResponse`. Two new frontend cards consume those fields via the dashboard's existing single `getAnalytics` call — no new network requests, no new hooks.

**Tech Stack:** Spring Data JPA (`@Query` + `Pageable`), React, the existing shared `DataTable`/`Button`/`EmptyState` components.

## Global Constraints

- Top Categories ranks by click count within the selected date range (not product count) — real, dynamic data.
- Categories with zero clicks in range produce no row (existing convention from `sumCommissionByCategory`) — never zero-padded to force exactly 5 rows.
- Recent Products' Status badges read "Published"/"Draft" (matching the reference image), even though `/admin/products` labels the same field "Active"/"Inactive" — a scoped, disclosed wording choice for this card only. No "Archived" state exists in the data model.
- Recent Products' Actions menu has **only** an Edit item (→ `/admin/products/:id`) — no "View" action, since no public product-detail page exists in this app.
- Recent Products shows the 5 most recently created products regardless of `active` status (the reference mixes Published and Draft rows).
- Avoid N+1: per-product click counts for the 5 recent products come from one batched query, not five.
- Spec reference: `docs/superpowers/specs/2026-08-13-admin-dashboard-phase2-top-categories-recent-products-design.md`.

---

### Task 1: Backend — `topCategories` and `recentProducts` on the analytics endpoint

**Files:**
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/CategoryClickCountResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/RecentProductResponse.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/repository/ProductClickRepository.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/repository/ProductRepository.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/response/DashboardAnalyticsResponse.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/DashboardServiceImpl.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminDashboardControllerTest.java`

**Interfaces:**
- Produces: `DashboardAnalyticsResponse.topCategories()` → `List<CategoryClickCountResponse(categoryId, categoryName, clickCount)>`, ranked descending, top 5, zero-click categories omitted.
- Produces: `DashboardAnalyticsResponse.recentProducts()` → `List<RecentProductResponse(id, name, imageFileName, categoryName, active, createdAt, clicks)>`, the 5 most recently created products (any `active` value), `clicks` scoped to the requested date range.
- Consumed by Tasks 2 and 4 (frontend cards).

- [ ] **Step 1: Write the failing tests**

Add to `AdminDashboardControllerTest.java` (add `import java.util.Map;` and `import java.util.stream.Collectors;` are not needed here — this is the test file, just uses existing imports plus what's below):

```java
@Test
void analytics_topCategories_ranksByClickCount_omittingZeroClickCategories() throws Exception {
    String token = adminToken();
    Long busyCategoryId = createCategoryId(token, "Top Categories Busy Category");
    Long quietCategoryId = createCategoryId(token, "Top Categories Quiet Category");
    Long silentCategoryId = createCategoryId(token, "Top Categories Silent Category");

    Long busyProductId = createProductId(token, "Top Categories Busy Product", busyCategoryId, new BigDecimal("10.00"), false, false, true);
    Long quietProductId = createProductId(token, "Top Categories Quiet Product", quietCategoryId, new BigDecimal("10.00"), false, false, true);
    createProductId(token, "Top Categories Silent Product", silentCategoryId, new BigDecimal("10.00"), false, false, true);

    for (int i = 0; i < 5; i++) {
        mockMvc.perform(post("/api/public/products/{id}/click", busyProductId));
    }
    mockMvc.perform(post("/api/public/products/{id}/click", quietProductId));

    var result = mockMvc.perform(get("/api/admin/dashboard/analytics")
                    .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();

    JsonNode topCategories = objectMapper.readTree(result.getResponse().getContentAsString())
            .path("data").path("topCategories");

    int busyIndex = -1;
    int quietIndex = -1;
    boolean silentPresent = false;
    for (int i = 0; i < topCategories.size(); i++) {
        JsonNode row = topCategories.get(i);
        String name = row.path("categoryName").asText();
        if (name.equals("Top Categories Busy Category")) {
            busyIndex = i;
            assertEquals(5, row.path("clickCount").asLong());
        }
        if (name.equals("Top Categories Quiet Category")) {
            quietIndex = i;
            assertEquals(1, row.path("clickCount").asLong());
        }
        if (name.equals("Top Categories Silent Category")) {
            silentPresent = true;
        }
    }

    assertTrue(busyIndex >= 0, "the busy category should appear in topCategories");
    assertTrue(quietIndex >= 0, "the quiet category should appear in topCategories");
    assertTrue(busyIndex < quietIndex, "the category with more clicks must be ordered before the one with fewer");
    assertFalse(silentPresent, "a category with zero clicks in range must not appear in topCategories");
}

@Test
void analytics_recentProducts_returnsFiveMostRecent_regardlessOfActiveFlag_withRangeScopedClicks() throws Exception {
    String token = adminToken();
    Long categoryId = createCategoryId(token, "Recent Products Category");

    Long inactiveProductId = createProductId(token, "Recent Products Draft Product", categoryId, new BigDecimal("10.00"), false, false, false);
    mockMvc.perform(post("/api/public/products/{id}/click", inactiveProductId));
    mockMvc.perform(post("/api/public/products/{id}/click", inactiveProductId));

    var result = mockMvc.perform(get("/api/admin/dashboard/analytics")
                    .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();

    JsonNode recentProducts = objectMapper.readTree(result.getResponse().getContentAsString())
            .path("data").path("recentProducts");

    boolean found = false;
    for (int i = 0; i < recentProducts.size(); i++) {
        JsonNode row = recentProducts.get(i);
        if (row.path("id").asLong() == inactiveProductId) {
            found = true;
            assertEquals(false, row.path("active").asBoolean());
            assertEquals(2, row.path("clicks").asLong());
        }
    }
    assertTrue(found, "an inactive (draft) product must still appear in recentProducts if it's among the 5 most recently created");
    assertTrue(recentProducts.size() <= 5, "recentProducts must never return more than 5 rows");
}
```

Add `import static org.junit.jupiter.api.Assertions.assertFalse;` to the test file's imports alongside the existing `assertEquals`/`assertTrue` static imports.

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `backend/`): `mvn test -Dtest=AdminDashboardControllerTest#analytics_topCategories_ranksByClickCount_omittingZeroClickCategories+analytics_recentProducts_returnsFiveMostRecent_regardlessOfActiveFlag_withRangeScopedClicks`
Expected: FAIL — compile error, `topCategories`/`recentProducts` aren't fields on the response yet.

- [ ] **Step 3: Create the two new response DTOs**

Create `backend/src/main/java/com/twogofindz/backend/dto/response/CategoryClickCountResponse.java`:

```java
package com.twogofindz.backend.dto.response;

public record CategoryClickCountResponse(Long categoryId, String categoryName, long clickCount) {
}
```

Create `backend/src/main/java/com/twogofindz/backend/dto/response/RecentProductResponse.java`:

```java
package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;

public record RecentProductResponse(
        Long id,
        String name,
        String imageFileName,
        String categoryName,
        boolean active,
        LocalDateTime createdAt,
        long clicks
) {
}
```

- [ ] **Step 4: Add the field to `DashboardAnalyticsResponse`**

Replace `DashboardAnalyticsResponse.java` in full:

```java
package com.twogofindz.backend.dto.response;

import java.util.List;

public record DashboardAnalyticsResponse(
        List<DailyCountResponse> viewsByDay,
        List<DailyCountResponse> clicksByDay,
        List<ProductClickCountResponse> mostClickedProducts,
        List<CategoryCommissionResponse> commissionByCategory,
        List<MonthlyCountResponse> productsAddedByMonth,
        List<CategoryClickCountResponse> topCategories,
        List<RecentProductResponse> recentProducts
) {
}
```

- [ ] **Step 5: Add the repository queries**

In `ProductClickRepository.java`, add two methods and two projection interfaces (alongside the existing ones):

```java
/**
 * Per-category click count, grouped and ranked in the DB, limited via the supplied
 * {@link Pageable} (top 5). Mirrors sumCommissionByCategory's join/grouping shape and its
 * "categories with zero clicks in range produce no row" convention — nothing to group means
 * no row, never a zero-padded entry.
 */
@Query("""
        select pc.product.category.id as categoryId,
               pc.product.category.productCategoryName as categoryName,
               count(pc) as clickCount
        from ProductClick pc
        where pc.clickedAt between :from and :to
        group by pc.product.category.id, pc.product.category.productCategoryName
        order by count(pc) desc, pc.product.category.id asc
        """)
List<CategoryClickCountProjection> countClicksByCategory(@Param("from") LocalDateTime from,
                                                           @Param("to") LocalDateTime to,
                                                           Pageable pageable);

/**
 * Click counts for a specific, small set of product ids (the dashboard's 5 recent products),
 * grouped in one query rather than one query per product — avoids N+1. Products with zero
 * clicks in range are simply absent from the result; the caller defaults them to 0.
 */
@Query("""
        select pc.product.id as productId, count(pc) as clickCount
        from ProductClick pc
        where pc.product.id in :productIds and pc.clickedAt between :from and :to
        group by pc.product.id
        """)
List<ProductIdClickCountProjection> countClicksByProductIdsBetween(@Param("productIds") List<Long> productIds,
                                                                     @Param("from") LocalDateTime from,
                                                                     @Param("to") LocalDateTime to);

interface CategoryClickCountProjection {
    Long getCategoryId();

    String getCategoryName();

    Long getClickCount();
}

interface ProductIdClickCountProjection {
    Long getProductId();

    Long getClickCount();
}
```

In `ProductRepository.java`, add one derived-query method (alongside the existing ones):

```java
List<Product> findTop5ByOrderByCreatedAtDesc();
```

- [ ] **Step 6: Wire both into `DashboardServiceImpl`**

Add imports:

```java
import com.twogofindz.backend.dto.response.CategoryClickCountResponse;
import com.twogofindz.backend.dto.response.RecentProductResponse;
import com.twogofindz.backend.entity.Product;
```

```java
import java.util.Map;
import java.util.stream.Collectors;
```

Add a constant alongside `MOST_CLICKED_LIMIT`:

```java
private static final int TOP_CATEGORIES_LIMIT = 5;
```

At the end of `getAnalytics()`, before the `return`:

```java
List<CategoryClickCountResponse> topCategories = productClickRepository
        .countClicksByCategory(start, end, PageRequest.of(0, TOP_CATEGORIES_LIMIT)).stream()
        .map(p -> new CategoryClickCountResponse(p.getCategoryId(), p.getCategoryName(), p.getClickCount()))
        .toList();

List<Product> recentProductEntities = productRepository.findTop5ByOrderByCreatedAtDesc();
List<Long> recentProductIds = recentProductEntities.stream().map(Product::getId).toList();
Map<Long, Long> clicksByProductId = recentProductIds.isEmpty()
        ? Map.of()
        : productClickRepository.countClicksByProductIdsBetween(recentProductIds, start, end).stream()
                .collect(Collectors.toMap(
                        ProductClickRepository.ProductIdClickCountProjection::getProductId,
                        ProductClickRepository.ProductIdClickCountProjection::getClickCount));
List<RecentProductResponse> recentProducts = recentProductEntities.stream()
        .map(p -> new RecentProductResponse(
                p.getId(), p.getName(), p.getImageFileName(), p.getCategory().getProductCategoryName(),
                p.isActive(), p.getCreatedAt(), clicksByProductId.getOrDefault(p.getId(), 0L)))
        .toList();
```

Update the `return` statement:

```java
return new DashboardAnalyticsResponse(
        viewsByDay, clicksByDay, mostClickedProducts, commissionByCategory, productsAddedByMonth,
        topCategories, recentProducts);
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `mvn test -Dtest=AdminDashboardControllerTest`
Expected: PASS (all tests in the file, including the two new ones and every existing test that constructs/consumes `DashboardAnalyticsResponse`).

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/dto/response/CategoryClickCountResponse.java backend/src/main/java/com/twogofindz/backend/dto/response/RecentProductResponse.java backend/src/main/java/com/twogofindz/backend/dto/response/DashboardAnalyticsResponse.java backend/src/main/java/com/twogofindz/backend/repository/ProductClickRepository.java backend/src/main/java/com/twogofindz/backend/repository/ProductRepository.java backend/src/main/java/com/twogofindz/backend/service/impl/DashboardServiceImpl.java backend/src/test/java/com/twogofindz/backend/controller/admin/AdminDashboardControllerTest.java
git commit -m "feat(admin-dashboard): add topCategories and recentProducts to the analytics endpoint"
```

---

### Task 2: `TopCategoriesCard` component

**Files:**
- Create: `frontend/src/components/TopCategoriesCard.jsx`
- Test: `frontend/src/components/TopCategoriesCard.test.jsx`

**Interfaces:**
- Consumes: `EmptyState` (existing).
- Produces: default-exported `TopCategoriesCard({ categories })` — `categories: [{categoryId, categoryName, clickCount}]`. Consumed by Task 5.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/TopCategoriesCard.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import TopCategoriesCard from './TopCategoriesCard.jsx';

const categories = [
  { categoryId: 1, categoryName: 'Electronics', clickCount: 28540 },
  { categoryId: 2, categoryName: 'Home & Kitchen', clickCount: 22180 },
];

function renderCard(props) {
  return render(
    <MemoryRouter>
      <TopCategoriesCard {...props} />
    </MemoryRouter>
  );
}

describe('TopCategoriesCard', () => {
  it('renders the title and a View all link to /admin/categories', () => {
    renderCard({ categories });
    expect(screen.getByText('Top Categories')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/admin/categories');
  });

  it('renders each category name and click count with thousands separators', () => {
    renderCard({ categories });
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('28,540')).toBeInTheDocument();
    expect(screen.getByText('Home & Kitchen')).toBeInTheDocument();
    expect(screen.getByText('22,180')).toBeInTheDocument();
  });

  it("scales the top row's progress bar to 100% width", () => {
    const { container } = renderCard({ categories });
    const bars = container.querySelectorAll('.bg-dashboard-purple.rounded-full');
    expect(bars[0]).toHaveStyle({ width: '100%' });
  });

  it('shows an empty state when no category has any clicks', () => {
    renderCard({ categories: [] });
    expect(screen.getByText('No category activity in this range.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- TopCategoriesCard` (from `frontend/`)
Expected: FAIL — `src/components/TopCategoriesCard.jsx` does not exist.

- [ ] **Step 3: Implement**

Create `frontend/src/components/TopCategoriesCard.jsx`:

```jsx
import { Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmptyState from './EmptyState.jsx';

function TopCategoriesCard({ categories }) {
  const maxClicks = categories.length > 0 ? Math.max(...categories.map((c) => c.clickCount)) : 0;

  return (
    <div className="flex h-full flex-col rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-card-title text-heading">Top Categories</h3>
        <Link to="/admin/categories" className="text-small font-semibold text-primary hover:underline">
          View all
        </Link>
      </div>
      {categories.length === 0 ? (
        <EmptyState title="No category activity" description="No category activity in this range." />
      ) : (
        <ul className="space-y-4">
          {categories.map((category) => (
            <li key={category.categoryId} className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dashboard-purple/10 text-dashboard-purple">
                <Tag size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-small font-medium text-heading">{category.categoryName}</span>
                  <span className="shrink-0 text-small font-semibold text-heading">
                    {category.clickCount.toLocaleString('en-US')}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-dashboard-purpleLight">
                  <div
                    className="h-full rounded-full bg-dashboard-purple"
                    style={{ width: `${maxClicks > 0 ? (category.clickCount / maxClicks) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TopCategoriesCard;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- TopCategoriesCard`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/TopCategoriesCard.jsx frontend/src/components/TopCategoriesCard.test.jsx
git commit -m "feat(admin-dashboard): add TopCategoriesCard component"
```

---

### Task 3: `ActionsMenu` component

**Files:**
- Create: `frontend/src/components/ActionsMenu.jsx`
- Test: `frontend/src/components/ActionsMenu.test.jsx`

**Interfaces:**
- Produces: default-exported `ActionsMenu({ editHref, label })` — a three-dot trigger opening a menu with a single "Edit" item linking to `editHref`. `label` is used to build the accessible name (`"{label} actions"`). Consumed by Task 4.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/ActionsMenu.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ActionsMenu from './ActionsMenu.jsx';

function renderMenu(props = {}) {
  return render(
    <MemoryRouter>
      <ActionsMenu editHref="/admin/products/5" label="Wireless Earbuds" {...props} />
    </MemoryRouter>
  );
}

describe('ActionsMenu', () => {
  it('renders a closed menu by default with an accessible trigger', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: 'Wireless Earbuds actions' })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens the menu on click, showing only an Edit item', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: 'Wireless Earbuds actions' }));

    expect(screen.getByRole('menuitem', { name: /Edit/ })).toHaveAttribute('href', '/admin/products/5');
  });

  it('closes on outside click', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <div>
          <ActionsMenu editHref="/admin/products/5" label="Wireless Earbuds" />
          <button type="button">outside</button>
        </div>
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: 'Wireless Earbuds actions' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'outside' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'Wireless Earbuds actions' });
    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- ActionsMenu`
Expected: FAIL — `src/components/ActionsMenu.jsx` does not exist.

- [ ] **Step 3: Implement**

Create `frontend/src/components/ActionsMenu.jsx`:

```jsx
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical, Pencil } from 'lucide-react';

function ActionsMenu({ editHref, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`${label} actions`}
        className="rounded-btn p-1.5 text-muted hover:bg-surface-secondary hover:text-primary"
      >
        <MoreVertical size={16} />
      </button>
      {isOpen && (
        <div
          role="menu"
          aria-label={`${label} actions`}
          className="absolute right-0 top-full z-10 mt-1 w-32 rounded-card border border-slate-200 bg-white py-1 shadow-dropdown"
        >
          <Link
            to={editHref}
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Pencil size={14} />
            Edit
          </Link>
        </div>
      )}
    </div>
  );
}

export default ActionsMenu;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- ActionsMenu`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ActionsMenu.jsx frontend/src/components/ActionsMenu.test.jsx
git commit -m "feat(admin-dashboard): add ActionsMenu component"
```

---

### Task 4: `RecentProductsCard` component

**Files:**
- Create: `frontend/src/components/RecentProductsCard.jsx`
- Test: `frontend/src/components/RecentProductsCard.test.jsx`

**Interfaces:**
- Consumes: `DataTable`, `EmptyState`, `Button` (existing), `ActionsMenu` (Task 3), `getImageUrl` (existing, `src/utils/imageUrl.js`).
- Produces: default-exported `RecentProductsCard({ products })` — `products: [{id, name, imageFileName, categoryName, active, createdAt, clicks}]`. Consumed by Task 5.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/RecentProductsCard.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import RecentProductsCard from './RecentProductsCard.jsx';

const products = [
  {
    id: 1,
    name: 'Soundcore Liberty 4 NC',
    imageFileName: null,
    categoryName: 'Electronics',
    active: true,
    createdAt: '2026-05-25T00:00:00',
    clicks: 342,
  },
  {
    id: 2,
    name: 'Anker 523 Power Bank',
    imageFileName: null,
    categoryName: 'Electronics',
    active: false,
    createdAt: '2026-05-22T00:00:00',
    clicks: 0,
  },
];

function renderCard(props) {
  return render(
    <MemoryRouter>
      <RecentProductsCard {...props} />
    </MemoryRouter>
  );
}

describe('RecentProductsCard', () => {
  it('renders the title and two "View all products" links (header and bottom button)', () => {
    renderCard({ products });
    expect(screen.getByText('Recent Products')).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'View all products' });
    expect(links).toHaveLength(2);
    links.forEach((link) => expect(link).toHaveAttribute('href', '/admin/products'));
  });

  it('renders each product name, category, and clicks', () => {
    renderCard({ products });
    expect(screen.getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
    expect(screen.getByText('342')).toBeInTheDocument();
    expect(screen.getByText('Anker 523 Power Bank')).toBeInTheDocument();
  });

  it('shows Published for active products and Draft for inactive ones', () => {
    renderCard({ products });
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders an accessible actions menu trigger per row', () => {
    renderCard({ products });
    expect(screen.getByRole('button', { name: 'Soundcore Liberty 4 NC actions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anker 523 Power Bank actions' })).toBeInTheDocument();
  });

  it('shows an empty state when there are no products', () => {
    renderCard({ products: [] });
    expect(screen.getByText('No products yet')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- RecentProductsCard`
Expected: FAIL — `src/components/RecentProductsCard.jsx` does not exist.

- [ ] **Step 3: Implement**

Create `frontend/src/components/RecentProductsCard.jsx`:

```jsx
import { Link } from 'react-router-dom';
import { Image as ImageIcon } from 'lucide-react';
import DataTable from './DataTable.jsx';
import EmptyState from './EmptyState.jsx';
import Button from './Button.jsx';
import ActionsMenu from './ActionsMenu.jsx';
import { getImageUrl } from '../utils/imageUrl.js';

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function RecentProductsCard({ products }) {
  const columns = [
    {
      key: 'name',
      label: 'Product',
      render: (row) => {
        const url = getImageUrl(row.imageFileName);
        return (
          <div className="flex items-center gap-3">
            {url ? (
              <img src={url} alt={row.name} className="h-10 w-10 shrink-0 rounded-md object-cover" />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100">
                <ImageIcon className="h-4 w-4 text-slate-300" />
              </div>
            )}
            <span className="truncate text-small font-medium text-heading">{row.name}</span>
          </div>
        );
      },
    },
    { key: 'categoryName', label: 'Category' },
    {
      key: 'active',
      label: 'Status',
      render: (row) =>
        row.active ? (
          <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
            Published
          </span>
        ) : (
          <span className="rounded-full bg-surface-secondary px-2.5 py-0.5 text-xs font-medium text-muted">
            Draft
          </span>
        ),
    },
    { key: 'createdAt', label: 'Date Added', render: (row) => formatDate(row.createdAt) },
    {
      key: 'clicks',
      label: 'Clicks',
      render: (row) => <span className="block text-right">{row.clicks.toLocaleString('en-US')}</span>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => <ActionsMenu editHref={`/admin/products/${row.id}`} label={row.name} />,
    },
  ];

  return (
    <div className="flex h-full flex-col rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-card-title text-heading">Recent Products</h3>
        <Link to="/admin/products" className="text-small font-semibold text-primary hover:underline">
          View all products
        </Link>
      </div>
      {products.length === 0 ? (
        <EmptyState title="No products yet" description="Add your first product to see it here." />
      ) : (
        <DataTable columns={columns} rows={products} isLoading={false} emptyState={null} />
      )}
      <Button to="/admin/products" variant="secondary" size="sm" className="mt-4 w-full justify-center">
        View all products
      </Button>
    </div>
  );
}

export default RecentProductsCard;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- RecentProductsCard`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/RecentProductsCard.jsx frontend/src/components/RecentProductsCard.test.jsx
git commit -m "feat(admin-dashboard): add RecentProductsCard component"
```

---

### Task 5: Assemble into `DashboardPage`

**Files:**
- Modify: `frontend/src/pages/admin/DashboardPage.jsx`
- Modify: `frontend/src/pages/admin/DashboardPage.test.jsx`

**Interfaces:**
- Consumes: `TopCategoriesCard` (Task 2), `RecentProductsCard` (Task 4), `analytics.topCategories`/`analytics.recentProducts` (Task 1).

- [ ] **Step 1: Update `DashboardPage.jsx`**

Add the two imports at the top (alongside the existing ones):

```js
import TopCategoriesCard from '../../components/TopCategoriesCard.jsx';
import RecentProductsCard from '../../components/RecentProductsCard.jsx';
```

Replace the closing `<DashboardLineChart ... />` block through the end of the returned JSX:

```jsx
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(310px,1fr)]">
        <DashboardLineChart
          data={chartData}
          xKey="date"
          series={[
            { key: 'views', name: 'Views', color: '#5b2cf2' },
            { key: 'clicks', name: 'Clicks', color: '#ff6b00' },
          ]}
          label="Performance Overview"
          headerAction={
            <FilterDropdown
              label="Granularity"
              hideLabel
              value={granularity}
              options={GRANULARITY_OPTIONS}
              onChange={setGranularity}
            />
          }
        />
        <TopCategoriesCard categories={analytics.topCategories} />
      </div>

      <div className="mt-4 grid grid-cols-1">
        <RecentProductsCard products={analytics.recentProducts} />
      </div>
    </div>
  );
}

export default DashboardPage;
```

(This replaces the plain `<DashboardLineChart .../>` call and the two closing lines `</div>` / `);` / `}` / `export default DashboardPage;` at the end of the file with the block above — the `<DashboardLineChart>` props themselves are unchanged from Phase 1, just now nested inside the new grid wrapper alongside `TopCategoriesCard`.)

- [ ] **Step 2: Update `DashboardPage.test.jsx`**

Add `topCategories` and `recentProducts` fields to the existing `analytics` fixture object:

```js
const analytics = {
  viewsByDay: [{ date: '2026-07-01', count: 5 }],
  clicksByDay: [{ date: '2026-07-01', count: 2 }],
  mostClickedProducts: [],
  commissionByCategory: [],
  productsAddedByMonth: [],
  topCategories: [
    { categoryId: 1, categoryName: 'Electronics', clickCount: 28540 },
    { categoryId: 2, categoryName: 'Home & Kitchen', clickCount: 22180 },
  ],
  recentProducts: [
    {
      id: 1,
      name: 'Soundcore Liberty 4 NC',
      imageFileName: null,
      categoryName: 'Electronics',
      active: true,
      createdAt: '2026-05-25T00:00:00',
      clicks: 342,
    },
  ],
};
```

Add two new test cases (alongside the existing `it(...)` blocks, before the final closing `});`):

```jsx
  it('renders the Top Categories card with real category data', async () => {
    renderPage();
    await screen.findByText('Performance Overview');

    expect(screen.getByText('Top Categories')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('28,540')).toBeInTheDocument();
  });

  it('renders the Recent Products card with real product data', async () => {
    renderPage();
    await screen.findByText('Performance Overview');

    expect(screen.getByText('Recent Products')).toBeInTheDocument();
    expect(screen.getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
    expect(screen.getByText('342')).toBeInTheDocument();
  });
```

- [ ] **Step 3: Run the full frontend suite**

Run: `npm test` (from `frontend/`)
Expected: PASS, 0 failures. Fix any assertion mismatch rather than changing behavior.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/DashboardPage.jsx frontend/src/pages/admin/DashboardPage.test.jsx
git commit -m "feat(admin-dashboard): assemble Top Categories and Recent Products into the dashboard page"
```

---

### Task 6: Full verification and manual screenshot comparison

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

- [ ] **Step 4: Run the full backend test suite**

Run (from `backend/`): `mvn test`
Expected: PASS, 0 failures.

- [ ] **Step 5: Run the backend build**

Run: `mvn -q -DskipTests package`
Expected: succeeds.

- [ ] **Step 6: Manual verification**

Start both servers (or reuse already-running instances), log in as admin, navigate to `/admin`, and confirm: Performance Overview and Top Categories render side by side with matching heights on desktop; Top Categories shows real category names/click counts with the top row's bar at 100% width; Recent Products shows 5 real products (including any inactive ones) with correct Published/Draft badges, real click counts, and a working per-row Actions menu (Edit only); both cards' data changes when the date-range picker changes; no console errors.

- [ ] **Step 7: Screenshot comparison against the reference**

Screenshot the analytics row and Recent Products section at the same viewport size as the reference image; compare side by side. Adjust spacing/sizing as needed, matching the same "adjust after screenshot comparison" discipline used in Phase 1.

- [ ] **Step 8: Write the completion note**

Summarize in the final report: what shipped (Top Categories, Recent Products, both wired to real range-scoped/all-time data as appropriate), confirmation that Latest Guides/Quick Actions/System Alerts/footer/real Export Report remain out of scope for this phase, test/lint/build results (frontend + backend).

---

## Self-Review Notes

- **Spec coverage:** Top Categories backend query + card (Task 1, 2), Recent Products backend query + card + Actions menu (Task 1, 3, 4), layout integration into the analytics row and lower grid (Task 5), the three confirmed decisions (click-based ranking, Published/Draft wording, Edit-only actions menu) all directly reflected in the implementation code, not just prose — all covered.
- **Placeholder scan:** no TBD/TODO; every step has real, complete code.
- **Type consistency:** `CategoryClickCountResponse(categoryId, categoryName, clickCount)` and `RecentProductResponse(id, name, imageFileName, categoryName, active, createdAt, clicks)` field names are used identically between their Task 1 definition, the Task 1 service-layer construction, and the Task 2/4 frontend components' prop destructuring (`category.categoryId`/`category.categoryName`/`category.clickCount`; `row.id`/`row.name`/`row.imageFileName`/`row.categoryName`/`row.active`/`row.createdAt`/`row.clicks`). `ActionsMenu({ editHref, label })`'s props match exactly between its Task 3 definition and its Task 4 call site (`editHref={\`/admin/products/${row.id}\`} label={row.name}`).
