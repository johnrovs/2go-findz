# Admin Dashboard Phase 6: System Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three all-time alert counts (draft products, draft buying guides, empty categories) to the dashboard summary endpoint, and a `SystemAlertsCard` listing whichever are non-zero, stacked below `QuickActionsCard` in the dashboard's third column.

**Architecture:** Three small new repository count queries feed three new fields on `DashboardSummaryResponse` (same all-time, non-range-filtered convention as `totalProducts`/`publishedGuideCount`). A new frontend card renders only the non-zero rows, with a positive empty state when all three are zero.

**Tech Stack:** Spring Data JPA (`@Query` + derived queries), React, react-router-dom, lucide-react, Tailwind CSS.

## Global Constraints

- All three counts are all-time totals — never scoped to the date-range picker, same convention as `totalProducts`/`totalCategories`/`publishedGuideCount`.
- Alert rows are omitted entirely when their count is 0 — same "omit zero rows" convention as Top Categories/Recent Products.
- When all three counts are 0, show a positive "All caught up!" state, not the shared `EmptyState` component (its "nothing here" framing doesn't fit a positive empty state).
- Alert links go to each feature's plain list page (`/admin/products`, `/admin/buying-guides`, `/admin/categories`) — no status-filtered query param, since `ProductsPage`'s status filter is local component state, not URL-driven (confirmed by reading `ProductsPage.jsx`).
- Spec reference: `docs/superpowers/specs/2026-08-13-admin-dashboard-phase6-system-alerts-design.md`.

---

### Task 1: Backend — `draftProductCount`, `draftGuideCount`, `emptyCategoryCount` on the summary endpoint

**Files:**
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/response/DashboardSummaryResponse.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/repository/ProductRepository.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/repository/BuyingGuideRepository.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/repository/ProductCategoryRepository.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/DashboardServiceImpl.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminDashboardControllerTest.java`

**Interfaces:**
- Produces: `DashboardSummaryResponse.draftProductCount()`, `.draftGuideCount()`, `.emptyCategoryCount()` — all `long`, all-time, never range-filtered. Consumed by Task 3 (frontend).

- [ ] **Step 1: Write the failing tests**

Add to `AdminDashboardControllerTest.java`, inserted after the existing `summary_publishedGuideCount_countsOnlyActivePublicGuides` test:

```java
@Test
void summary_draftProductCount_countsOnlyInactiveProducts() throws Exception {
    String token = adminToken();
    Long categoryId = createCategoryId(token, "Draft Product Count Category");

    long before = fetchSummaryData(token, null, null).path("draftProductCount").asLong();

    createProductId(token, "Draft Count Active Product", categoryId, new BigDecimal("10.00"), false, false, true);
    createProductId(token, "Draft Count Inactive Product", categoryId, new BigDecimal("10.00"), false, false, false);

    long after = fetchSummaryData(token, null, null).path("draftProductCount").asLong();

    assertEquals(before + 1, after, "draftProductCount must count only inactive products");
}

@Test
void summary_draftGuideCount_countsOnlyInactiveGuides() throws Exception {
    String token = adminToken();
    Long categoryId = createCategoryId(token, "Draft Guide Count Category");

    long before = fetchSummaryData(token, null, null).path("draftGuideCount").asLong();

    createBuyingGuideId(token, "Draft Count Active Guide", categoryId, true, Visibility.PUBLIC);
    createBuyingGuideId(token, "Draft Count Inactive Guide", categoryId, false, Visibility.PUBLIC);

    long after = fetchSummaryData(token, null, null).path("draftGuideCount").asLong();

    assertEquals(before + 1, after, "draftGuideCount must count only inactive guides");
}

@Test
void summary_emptyCategoryCount_countsOnlyCategoriesWithNoActiveProducts() throws Exception {
    String token = adminToken();
    Long categoryWithActiveProductId = createCategoryId(token, "Empty Category Count Has Product");
    Long emptyCategoryId = createCategoryId(token, "Empty Category Count Truly Empty");
    Long categoryWithOnlyInactiveProductId = createCategoryId(token, "Empty Category Count Only Inactive");

    long before = fetchSummaryData(token, null, null).path("emptyCategoryCount").asLong();

    createProductId(token, "Empty Category Count Active Product", categoryWithActiveProductId, new BigDecimal("10.00"), false, false, true);
    createProductId(token, "Empty Category Count Inactive Product", categoryWithOnlyInactiveProductId, new BigDecimal("10.00"), false, false, false);

    long after = fetchSummaryData(token, null, null).path("emptyCategoryCount").asLong();

    assertEquals(before + 2, after,
            "emptyCategoryCount must count the truly-empty category and the only-inactive-products category, but not the one with an active product");
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `backend/`): `mvn test -Dtest=AdminDashboardControllerTest#summary_draftProductCount_countsOnlyInactiveProducts+summary_draftGuideCount_countsOnlyInactiveGuides+summary_emptyCategoryCount_countsOnlyCategoriesWithNoActiveProducts`
Expected: FAIL — compile error, `draftProductCount`/`draftGuideCount`/`emptyCategoryCount` aren't fields on the response yet.

- [ ] **Step 3: Add the fields to `DashboardSummaryResponse`**

Replace `DashboardSummaryResponse.java` in full:

```java
package com.twogofindz.backend.dto.response;

import java.math.BigDecimal;

public record DashboardSummaryResponse(
        long totalViews,
        long totalClicks,
        BigDecimal estimatedTotalCommission,
        long totalProducts,
        long totalCategories,
        long trendingCount,
        long bestSellerCount,
        long publishedGuideCount,
        long draftProductCount,
        long draftGuideCount,
        long emptyCategoryCount
) {
}
```

- [ ] **Step 4: Add the repository queries**

In `ProductRepository.java`, add one derived-query method (alongside the existing ones):

```java
long countByActiveFalse();
```

In `BuyingGuideRepository.java`, add one derived-query method (alongside the existing ones):

```java
long countByActiveFalse();
```

In `ProductCategoryRepository.java`, add:

```java
import org.springframework.data.jpa.repository.Query;
```

```java
/**
 * Categories with zero active products — either no products at all, or only inactive ones.
 * Cheap to compute directly (categories are low-volume, no pagination needed).
 */
@Query("""
        select count(c) from ProductCategory c
        where not exists (
            select 1 from Product p where p.category = c and p.active = true
        )
        """)
long countCategoriesWithNoActiveProducts();
```

- [ ] **Step 5: Wire into `DashboardServiceImpl.getSummary()`**

At the end of `getSummary()`, before the `return`, add:

```java
// New: all-time counts of things that need admin attention, same non-range-filtered
// convention as totalProducts/totalCategories/publishedGuideCount.
long draftProductCount = productRepository.countByActiveFalse();
long draftGuideCount = buyingGuideRepository.countByActiveFalse();
long emptyCategoryCount = productCategoryRepository.countCategoriesWithNoActiveProducts();
```

Update the `return` statement:

```java
return new DashboardSummaryResponse(
        totalViews, totalClicks, estimatedTotalCommission,
        totalProducts, totalCategories, trendingCount, bestSellerCount, publishedGuideCount,
        draftProductCount, draftGuideCount, emptyCategoryCount);
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `mvn test -Dtest=AdminDashboardControllerTest`
Expected: PASS (all tests in the file, including the three new ones and every existing test that constructs/consumes `DashboardSummaryResponse`).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/dto/response/DashboardSummaryResponse.java backend/src/main/java/com/twogofindz/backend/repository/ProductRepository.java backend/src/main/java/com/twogofindz/backend/repository/BuyingGuideRepository.java backend/src/main/java/com/twogofindz/backend/repository/ProductCategoryRepository.java backend/src/main/java/com/twogofindz/backend/service/impl/DashboardServiceImpl.java backend/src/test/java/com/twogofindz/backend/controller/admin/AdminDashboardControllerTest.java
git commit -m "feat(admin-dashboard): add draftProductCount, draftGuideCount, emptyCategoryCount to the summary endpoint"
```

---

### Task 2: `SystemAlertsCard` component

**Files:**
- Create: `frontend/src/components/SystemAlertsCard.jsx`
- Test: `frontend/src/components/SystemAlertsCard.test.jsx`

**Interfaces:**
- Produces: default-exported `SystemAlertsCard({ draftProductCount, draftGuideCount, emptyCategoryCount })`. Consumed by Task 3.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/SystemAlertsCard.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SystemAlertsCard from './SystemAlertsCard.jsx';

function renderCard(props) {
  return render(
    <MemoryRouter>
      <SystemAlertsCard draftProductCount={0} draftGuideCount={0} emptyCategoryCount={0} {...props} />
    </MemoryRouter>
  );
}

describe('SystemAlertsCard', () => {
  it('renders the title', () => {
    renderCard();
    expect(screen.getByText('System Alerts')).toBeInTheDocument();
  });

  it('renders a row per non-zero count, correctly pluralized, with the right link', () => {
    renderCard({ draftProductCount: 3, draftGuideCount: 1, emptyCategoryCount: 2 });

    const draftProductsLink = screen.getByRole('link', { name: /3 draft products need review/ });
    expect(draftProductsLink).toHaveAttribute('href', '/admin/products');

    const draftGuideLink = screen.getByRole('link', { name: /1 draft buying guide needs review/ });
    expect(draftGuideLink).toHaveAttribute('href', '/admin/buying-guides');

    const emptyCategoriesLink = screen.getByRole('link', { name: /2 categories with no active products/ });
    expect(emptyCategoriesLink).toHaveAttribute('href', '/admin/categories');
  });

  it('omits rows whose count is zero', () => {
    renderCard({ draftProductCount: 5, draftGuideCount: 0, emptyCategoryCount: 0 });

    expect(screen.getByRole('link', { name: /5 draft products need review/ })).toBeInTheDocument();
    expect(screen.queryByText(/draft buying guide/)).not.toBeInTheDocument();
    expect(screen.queryByText(/no active products/)).not.toBeInTheDocument();
  });

  it('shows "All caught up!" when every count is zero', () => {
    renderCard({ draftProductCount: 0, draftGuideCount: 0, emptyCategoryCount: 0 });
    expect(screen.getByText('All caught up!')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `frontend/`): `npm test -- SystemAlertsCard`
Expected: FAIL — `src/components/SystemAlertsCard.jsx` does not exist.

- [ ] **Step 3: Implement**

Create `frontend/src/components/SystemAlertsCard.jsx`:

```jsx
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';

function AlertRow({ to, children }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 rounded-btn px-2 py-2.5 hover:bg-surface-secondary">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dashboard-orange/10 text-dashboard-orange">
          <AlertTriangle size={14} />
        </span>
        <span className="flex-1 text-small font-medium text-heading">{children}</span>
        <ChevronRight size={16} className="shrink-0 text-muted" />
      </Link>
    </li>
  );
}

function SystemAlertsCard({ draftProductCount, draftGuideCount, emptyCategoryCount }) {
  const hasAlerts = draftProductCount > 0 || draftGuideCount > 0 || emptyCategoryCount > 0;

  const draftProductMessage =
    draftProductCount === 1
      ? `${draftProductCount} draft product needs review`
      : `${draftProductCount} draft products need review`;
  const draftGuideMessage =
    draftGuideCount === 1
      ? `${draftGuideCount} draft buying guide needs review`
      : `${draftGuideCount} draft buying guides need review`;
  const emptyCategoryMessage =
    emptyCategoryCount === 1
      ? `${emptyCategoryCount} category with no active products`
      : `${emptyCategoryCount} categories with no active products`;

  return (
    <div className="flex h-full flex-col rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <h3 className="mb-4 text-card-title text-heading">System Alerts</h3>
      {!hasAlerts ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-success" />
          <p className="text-small font-medium text-heading">All caught up!</p>
        </div>
      ) : (
        <ul className="space-y-1">
          {draftProductCount > 0 && <AlertRow to="/admin/products">{draftProductMessage}</AlertRow>}
          {draftGuideCount > 0 && <AlertRow to="/admin/buying-guides">{draftGuideMessage}</AlertRow>}
          {emptyCategoryCount > 0 && <AlertRow to="/admin/categories">{emptyCategoryMessage}</AlertRow>}
        </ul>
      )}
    </div>
  );
}

export default SystemAlertsCard;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- SystemAlertsCard`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/SystemAlertsCard.jsx frontend/src/components/SystemAlertsCard.test.jsx
git commit -m "feat(admin-dashboard): add SystemAlertsCard component"
```

---

### Task 3: Assemble into `DashboardPage`

**Files:**
- Modify: `frontend/src/pages/admin/DashboardPage.jsx`
- Modify: `frontend/src/pages/admin/DashboardPage.test.jsx`

**Interfaces:**
- Consumes: `SystemAlertsCard` (Task 2), `summary.draftProductCount`/`.draftGuideCount`/`.emptyCategoryCount` (Task 1).

- [ ] **Step 1: Update `DashboardPage.jsx`**

Add the import (alongside the existing component imports):

```js
import SystemAlertsCard from '../../components/SystemAlertsCard.jsx';
```

Replace the lower grid's third child (currently the bare `<QuickActionsCard />`) with a vertical stack of two cards:

```jsx
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)_minmax(280px,1fr)]">
        <RecentProductsCard products={analytics.recentProducts} />
        <LatestGuidesCard guides={analytics.latestGuides} />
        <div className="flex flex-col gap-4">
          <QuickActionsCard />
          <SystemAlertsCard
            draftProductCount={summary.draftProductCount}
            draftGuideCount={summary.draftGuideCount}
            emptyCategoryCount={summary.emptyCategoryCount}
          />
        </div>
      </div>
```

- [ ] **Step 2: Update `DashboardPage.test.jsx`**

Add three fields to the existing `currentSummary` fixture object:

```js
const currentSummary = {
  totalViews: 1204,
  totalClicks: 356,
  estimatedTotalCommission: 128.5,
  totalProducts: 42,
  totalCategories: 6,
  trendingCount: 8,
  bestSellerCount: 5,
  publishedGuideCount: 14,
  draftProductCount: 3,
  draftGuideCount: 1,
  emptyCategoryCount: 2,
};
```

Add one new test case (alongside the existing `it(...)` blocks, before the final closing `});`):

```jsx
  it('renders the System Alerts card with real alert data', async () => {
    renderPage();
    await screen.findByText('Performance Overview');

    expect(screen.getByText('System Alerts')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /3 draft products need review/ })).toHaveAttribute(
      'href',
      '/admin/products'
    );
  });
```

- [ ] **Step 3: Run the full frontend suite**

Run: `npm test` (from `frontend/`)
Expected: PASS, 0 failures. Fix any assertion mismatch rather than changing behavior (watch for text collisions the way Phase 2/4 hit — e.g. "draft" or "review" wording colliding with another card's copy; scope queries with `within(...)` if needed).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/DashboardPage.jsx frontend/src/pages/admin/DashboardPage.test.jsx
git commit -m "feat(admin-dashboard): assemble System Alerts into the dashboard page"
```

---

### Task 4: Full verification and manual check

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

Start both servers (or reuse already-running instances), log in as admin, navigate to `/admin`, and confirm: System Alerts renders stacked below Quick Actions in the third column, matching widths; the alert rows show real, correct counts (cross-check against the actual number of inactive products/guides and empty categories in the dev database); each row links to the correct page; if the dev database currently has zero of all three, temporarily verify the "All caught up!" state instead — do not fabricate data to force a specific state; no console errors.

- [ ] **Step 7: Write the completion note**

Summarize in the final report: what shipped (System Alerts: draft products, draft buying guides, empty categories — all real, all-time, actionable), confirmation that real Export Report generation remains out of scope, the "overdue scheduled item" signal that was considered and rejected (and why), test/lint/build results (frontend + backend).

---

## Self-Review Notes

- **Spec coverage:** three backend count queries + `DashboardSummaryResponse` fields (Task 1), `SystemAlertsCard` with omit-zero-rows and positive empty state (Task 2), third-column stacked layout (Task 3), full verification including a real-data cross-check (Task 4) — all covered. The rejected "overdue scheduled item" signal is carried into the Task 4 completion-note instruction so it isn't mistaken for a gap.
- **Placeholder scan:** no TBD/TODO; every step has real, complete code.
- **Type consistency:** `draftProductCount`/`draftGuideCount`/`emptyCategoryCount` field names are used identically across `DashboardSummaryResponse` (Task 1), `DashboardServiceImpl`'s construction, and `SystemAlertsCard`'s props (Task 2) and `DashboardPage.jsx`'s call site (Task 3, `summary.draftProductCount` etc.).
