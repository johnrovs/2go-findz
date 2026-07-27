# Frontend Admin Stage 4: Dashboard & Analytics — Design

**Date:** 2026-07-27
**Scope:** Fourth and final Frontend Admin sub-stage (Category Management → Product Management → System Settings → **Dashboard & Analytics**). Replaces the `DashboardPage` placeholder with summary metric cards and analytics charts, filterable by date range.

**Master spec:** `docs/PROJECT_SPEC.md` §"3. Administrator Dashboard" §"Dashboard Analytics". **Depends on:** nothing from earlier admin sub-stages directly (no `Modal`/`DataTable`/`ConfirmDialog`/`ImageUploader` reuse here — this stage is read-only, no CRUD). Backend endpoints consumed, JWT-protected:

| Method | Path | Query | Notes |
|---|---|---|---|
| GET | `/api/admin/dashboard/summary` | `from`, `to` (ISO `LocalDate`, both optional) | → `DashboardSummaryResponse` |
| GET | `/api/admin/dashboard/analytics` | `from`, `to` (ISO `LocalDate`, both optional) | → `DashboardAnalyticsResponse` |

DTOs (verified directly from the backend, not summarized):
- `DashboardSummaryResponse`: `{ totalViews(long), totalClicks(long), estimatedTotalCommission(BigDecimal), totalProducts(long), totalCategories(long), trendingCount(long), bestSellerCount(long) }`
- `DashboardAnalyticsResponse`: `{ viewsByDay: DailyCountResponse[], clicksByDay: DailyCountResponse[], mostClickedProducts: ProductClickCountResponse[], commissionByCategory: CategoryCommissionResponse[], productsAddedByMonth: MonthlyCountResponse[] }`
- `DailyCountResponse`: `{ date(LocalDate, serializes as "YYYY-MM-DD"), count(long) }`
- `ProductClickCountResponse`: `{ productId, productName, clickCount(long) }`
- `CategoryCommissionResponse`: `{ categoryId, categoryName, estimatedCommission(BigDecimal) }`
- `MonthlyCountResponse`: `{ yearMonth(String, e.g. "2026-07"), count(long) }`

## Out of scope for this stage

- Any backend changes
- CRUD of any kind — this stage is entirely read-only
- URL-param-driven filter state (see "Date filter" below for why this stage deviates from the Category/Product list pages' convention)

## New dependency

**Recharts**, added to `frontend/package.json`. Chosen over Chart.js (the spec's other named option) because it's React-native — composable components instead of imperative canvas calls — and renders real SVG DOM nodes, so the existing Vitest + React Testing Library approach can query chart output directly. Chart.js's `<canvas>` output isn't meaningfully inspectable by RTL.

**Test environment cost:** Recharts' `ResponsiveContainer` requires `ResizeObserver`, which jsdom doesn't implement. A no-op stub will be added to `frontend/src/test/setup.js`, following the exact precedent already there for `IntersectionObserver` (added in the Public Homepage stage for Framer Motion's `whileInView`).

## Date filter

Presets: **Today, Last 7 Days, Last 30 Days, Current Month, Custom** (all five required by the master spec). Selecting a preset computes `from`/`to` as ISO date strings (`YYYY-MM-DD`) client-side:
- Today: `from = to = today`
- Last 7 Days: `from = today - 6 days`, `to = today`
- Last 30 Days: `from = today - 29 days`, `to = today`
- Current Month: `from = first day of this month`, `to = today`
- Custom: reveals two native `<input type="date">` fields; `from`/`to` come directly from them

Default preset on page load: **Last 30 Days** — the spec doesn't name a default, and an unbounded all-time view isn't listed as one of the five options, so Last 30 Days gives a populated, recent-activity view without extra fetches.

**Deviation from prior admin stages:** filter state here is **plain local component state, not URL search params**. `CategoriesPage`/`ProductsPage` used `useSearchParams` because those are bookmarkable, shareable filtered lists. The dashboard is a landing/overview page — there's no realistic case for bookmarking "dashboard filtered to last 7 days," and adding URL-param plumbing here would be complexity without a corresponding benefit.

## Components

- **`AnalyticsCard`** (new, reusable per the master spec's explicit component list) — `AnalyticsCard({ label, value, icon? })`. A single stat: label, formatted value, optional Lucide icon. Used seven times, one per `DashboardSummaryResponse` field — a direct 1:1 mapping, no derived/computed summary values needed.
- **`AnalyticsChart`** (new, reusable per the master spec's explicit component list) — `AnalyticsChart({ type: 'line' | 'bar', data, xKey, yKey, label, layout? })`. Wraps Recharts' `ResponsiveContainer` + `LineChart`/`BarChart` behind one component so callers never touch Recharts directly. Shows a lightweight "No data yet" message instead of an empty chart when `data` is empty. Used five times, one per `DashboardAnalyticsResponse` array — another direct 1:1 mapping:

  | Field | Chart | Notes |
  |---|---|---|
  | `viewsByDay` | line | `xKey: 'date'`, `yKey: 'count'` |
  | `clicksByDay` | line | `xKey: 'date'`, `yKey: 'count'` |
  | `mostClickedProducts` | bar (horizontal, `layout="vertical"`) | `xKey: 'productName'`, `yKey: 'clickCount'` — horizontal reads better for product-name labels than a Best/Worst rotated x-axis |
  | `commissionByCategory` | bar | `xKey: 'categoryName'`, `yKey: 'estimatedCommission'` |
  | `productsAddedByMonth` | bar | `xKey: 'yearMonth'`, `yKey: 'count'` |

- **`DashboardPage`** (replaces the placeholder) — composes the date filter, a `grid` of 7 `AnalyticsCard`s, and a `grid` of 5 `AnalyticsChart`s, all driven by the new `useDashboardData()` hook.

## Data flow

`useDashboardData()` hook: holds the selected preset (and custom `from`/`to` when applicable), computes the derived date-range params, and fetches `getSummary(params)` and `getAnalytics(params)` in parallel via `Promise.all` whenever the range changes — both are always needed together, so they share one `isLoading`/`error` state rather than two independent ones. Returns `{ summary, analytics, isLoading, error, preset, customFrom, customTo, setPreset, setCustomFrom, setCustomTo, reload }`.

## Error handling

A failed fetch (from either endpoint, since they're combined via `Promise.all`) replaces the whole dashboard body with the existing `ErrorState` + retry (`reload()`) — no partial-failure UI, matching this page's read-only, single-unit nature. Estimated commission is always labeled **"Estimated Commission"** (never "Earnings" or similar), consistent with the master spec's requirement to never present click-based estimates as confirmed income.

## New service

`frontend/src/services/dashboardService.js` — `getSummary({ from, to } = {}): Promise<Summary>`, `getAnalytics({ from, to } = {}): Promise<Analytics>`. When `from`/`to` are `undefined` (e.g., no preset resolved to bounds — shouldn't happen given a default preset, but the service itself stays generic), they're omitted from the request rather than sent as empty strings, so the backend's "both optional" all-time behavior is reachable if ever needed.

## Accessibility

Chart data is also summarized in adjacent `AnalyticsCard`s and table-like structure isn't reintroduced here (charts already carry Recharts' built-in `role="img"`/tooltip semantics); date inputs and the preset dropdown are properly labeled; the "No data yet" empty state is real text content, not just an empty canvas.

## Testing

Vitest + React Testing Library:
- `dashboardService`: request/response shape, mirroring the established `adminCategoryService`/`adminProductService` test pattern.
- `AnalyticsCard`: renders label and value.
- `AnalyticsChart`: renders a line chart for `type="line"`, a bar chart for `type="bar"`, and the empty-state message when `data` is `[]`.
- `useDashboardData`: each preset computes the expected `from`/`to`, Custom uses the manually-set dates, changing the preset triggers a re-fetch, error propagation.
- `DashboardPage`: renders all 7 summary cards with correct values, renders all 5 charts, changing the date filter triggers a re-fetch with updated params, error/retry state, "Estimated Commission" labeling is present (not generic "Commission" or "Earnings").
