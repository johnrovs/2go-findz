# Admin Dashboard Phase 6: System Alerts

## Context

Follow-on to Phase 1 (shell/KPI/chart), Phase 2 (Top Categories, Recent Products), Phase 3 (Quick Actions), Phase 4 (Latest Guides), and Phase 5 (footer) — all shipped. Those specs deferred System Alerts and real Export Report generation, split by risk. This spec covers **System Alerts only** — the smaller remaining piece.

**Root cause of the original ambiguity:** the reference design implies an "alerts" widget, but this app tracks no inventory or orders — the two things most admin dashboards alert on. Reading the data model turned up three real, cheap-to-compute, actionable signals instead:

- **Draft products** — products with `active = false`.
- **Draft buying guides** — guides with `active = false`.
- **Empty categories** — categories with zero active products.

(An "overdue scheduled item" signal was considered and rejected: `ProductPublishScheduler`/`BuyingGuidePublishScheduler` already auto-publish scheduled items every 60 seconds, so a scheduled-but-still-inactive product is only ever true for under a minute — not a meaningful alert.)

## Scope

Add three all-time alert counts to the dashboard summary endpoint, and a `SystemAlertsCard` that lists whichever of the three are non-zero, stacked below `QuickActionsCard` in the dashboard's third column.

**Out of scope:** real Export Report generation — a separate future phase.

## Backend

These are all-time counts, not scoped to the date-range picker — same convention as `totalProducts`/`totalCategories`/`publishedGuideCount` on `DashboardSummaryResponse` (a draft product doesn't stop being relevant based on which date range is selected).

**`DashboardSummaryResponse`** gains three fields, appended after `publishedGuideCount`:

```java
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

**New repository methods:**
- `ProductRepository.countByActiveFalse()` — derived query, mirrors the existing `countByActiveTrueAndTrendingTrue()`/`countByActiveTrueAndBestSellerTrue()` naming style.
- `BuyingGuideRepository.countByActiveFalse()` — derived query, mirrors the existing `countByActiveTrueAndVisibility(Visibility)`.
- `ProductCategoryRepository.countCategoriesWithNoActiveProducts()` — a new `@Query` counting categories that have zero rows in `products` with `active = true` (a `NOT EXISTS` or `LEFT JOIN ... WHERE product.id IS NULL` correlated query — categories are cheap in volume, no pagination needed).

**`DashboardServiceImpl.getSummary()`** computes all three the same way it already computes `trendingCount`/`bestSellerCount`/`publishedGuideCount` — each a single repository call, no new backend risk beyond three small queries.

## Frontend

New `frontend/src/components/SystemAlertsCard.jsx`, no props beyond the three counts (`draftProductCount`, `draftGuideCount`, `emptyCategoryCount`) plus nothing else — no data fetching, purely derived from `summary` (already fetched by `useDashboardData`).

- Card shell: same `rounded-card border border-slate-200 bg-white p-5 shadow-card` as every other dashboard card.
- Title: "System Alerts", no "View all" link (unlike the other cards — there's no single page these three signals all belong to).
- Body: a vertical list, one row per **non-zero** count only — a count of 0 for any signal omits that row entirely (same "omit zero rows" convention as Top Categories/Recent Products). Each visible row is a `Link`:

| Condition | Message | Route |
|---|---|---|
| `draftProductCount > 0` | "{n} draft product{s} need review" | `/admin/products` |
| `draftGuideCount > 0` | "{n} draft buying guide{s} need review" | `/admin/buying-guides` |
| `emptyCategoryCount > 0` | "{n} categor{y/ies} with no active products" | `/admin/categories` |

Each row: an icon badge (`AlertTriangle` from lucide-react, `bg-dashboard-orange/10 text-dashboard-orange` — reusing the existing orange token rather than introducing a new color), the message text, and a trailing `ChevronRight`.

- **Empty state:** when all three counts are 0, render a positive state instead — a `CheckCircle2` icon (green, `text-success`) with the text "All caught up!" — not the shared `EmptyState` component (that component's "nothing here" framing doesn't fit a *positive* empty state).

Links go to each feature's plain list page (`/admin/products`, `/admin/buying-guides`, `/admin/categories`) — not a status-filtered URL. Confirmed by reading `ProductsPage.jsx`: its status filter is local component state via `useAdminProductSearch()`, not URL query params, so a `?status=inactive`-style link would silently do nothing. Same precedent as Quick Actions' "Manage Categories" link in Phase 3.

## Layout

`DashboardPage.jsx`'s third column (currently just `QuickActionsCard`) becomes a vertical stack of two cards:

```jsx
<div className="flex flex-col gap-4">
  <QuickActionsCard />
  <SystemAlertsCard
    draftProductCount={summary.draftProductCount}
    draftGuideCount={summary.draftGuideCount}
    emptyCategoryCount={summary.emptyCategoryCount}
  />
</div>
```

replacing the bare `<QuickActionsCard />` as the third child of the lower grid — the grid's column widths (`lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)_minmax(280px,1fr)]`) are unchanged from Phase 4.

## Testing

- Backend: `AdminDashboardControllerTest` (or a new `AdminDashboardSummaryTest` if that's cleaner given the existing file's size — implementer's call, following the existing file's structure) gets tests confirming `draftProductCount`/`draftGuideCount`/`emptyCategoryCount` reflect real created data, and that active-only/non-empty categories don't inflate the counts.
- Frontend: `SystemAlertsCard.test.jsx` — renders only non-zero rows, correct message pluralization, correct hrefs, and the "All caught up!" state when all three are 0. `DashboardPage.test.jsx` gets one new test asserting the card renders with real summary data.

## Self-Review

- **Placeholder scan:** no TBD/TODO; every signal, query, message, and route is fully specified.
- **Internal consistency:** the "omit zero rows" rule and the "all-time, non-range-filtered" rule are both stated once and applied consistently to the backend fields and the frontend row visibility — no contradiction with prior phases' identical conventions.
- **Scope check:** three small backend queries + one frontend card + one layout change — comparable in size to Phase 2 (Top Categories/Recent Products), appropriately sized for one implementation plan.
- **Ambiguity check:** the "overdue scheduled item" signal that was considered and rejected is documented with its reason, so it isn't mistaken for a gap; pluralization rules and exact route targets are made explicit rather than left to implementer judgment.
