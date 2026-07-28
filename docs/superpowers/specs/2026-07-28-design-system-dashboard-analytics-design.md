# Design System Stage 5: Dashboard Analytics

## Context

This stage redesigns the admin Dashboard/analytics page's charts and KPI
cards, inspired by a reference image the user provided (a dark neon
pink/cyan infographic dashboard template), reworked for this app's actual
design system and actual data.

**Renumbering:** this narrows what was originally scoped as "Stage 5:
Admin Dashboard" (which also included Sidebar/Topbar/DataTable/admin
forms) down to just the Dashboard analytics page, since that's what the
reference image actually shows. The rest of the admin chrome becomes a
new **Stage 6: Admin Chrome** (Sidebar, Topbar, DataTable, admin forms —
no visual reference yet, to be brainstormed separately when reached).
The former Stage 6 (Micro-interactions & Accessibility) becomes **Stage
7**.

**Two constraints locked in during brainstorming:**

- **No fabricated data.** The reference's dot-matrix grids and JAN–APR
  connected-dot timeline don't correspond to anything in this app's data
  model. They are not replicated. The reference is a style/mood board
  (card treatment, chart types, gauge usage, overlapping-series look,
  rounded corners) applied only to the dashboard's real 5 charts and 7
  KPI cards.
- **Existing palette only.** The reference's hot-pink/cyan neon is
  translated into this app's already-established tokens — `primary`
  blue and `amazon` orange — not a new chart-specific accent color. No
  new color tokens are added in this stage.

## 1. KPI Cards

`AnalyticsCard.jsx` (existing, retokenized): `rounded-xl border ...
shadow-sm` → `rounded-card border border-slate-200 shadow-card`; icon
`text-indigo-500` → `text-primary`; label `text-sm font-medium
text-slate-500` → `text-small font-medium text-muted`; value `text-2xl
font-bold text-slate-900` → `text-page-heading text-heading`.

**New `GaugeCard.jsx`** — a donut-shaped percentage gauge (Recharts
`RadialBarChart`, single ring, `primary` blue fill over a light-gray
track, percentage rendered as text in the center) for the three metrics
that are naturally "a percent of a real, already-fetched whole" —
computed client-side from fields the dashboard already receives, never
fabricated:

- **Click-Through Rate** = `totalClicks / totalViews × 100`
- **Trending Share of Catalog** = `trendingCount / totalProducts × 100`
- **Best-Seller Share of Catalog** = `bestSellerCount / totalProducts × 100`

Each guards against division by zero (renders `0%` when the denominator
is 0, not `NaN`). `GaugeCard`'s props: `{ label, value }` where `value`
is a 0–100 number the caller has already computed — the component itself
does no data fetching or derivation, matching `AnalyticsCard`'s existing
"dumb presentational card" contract.

These three gauge cards replace the current **Trending Products** and
**Best Sellers** *count* cards in the KPI grid (their raw counts remain
visible via the Products page's existing trending/best-seller filters)
and add **Click-Through Rate** as a new metric. **Total Views**, **Total
Clicks**, **Estimated Commission**, **Total Products**, and **Total
Categories** remain plain `AnalyticsCard`s — raw counts and currency
don't have a natural "percent of what" framing.

Resulting KPI grid (7 cards, unchanged count): Total Views,
Total Clicks, Estimated Commission, Total Products, Total Categories
(all `AnalyticsCard`), plus Click-Through Rate, Trending Share, Best-Seller
Share (all `GaugeCard`).

## 2. Charts

### Views + Clicks combined area chart

**New `DualAreaChart.jsx`** replaces the two separate line charts
("Website Views by Day", "Product Clicks by Day") with one dual-series
overlapping area chart — Recharts `AreaChart` with two `<Area>` elements
sharing the date X-axis: Views in `primary` blue (`#2563EB`), Clicks in
`amazon` orange (`#FF9900`), both `type="monotone"`, semi-transparent
fills (`fillOpacity={0.15}`), a small legend, on a merged dataset keyed
by date (`[{ date, views, clicks }, ...]`, built by joining
`analytics.viewsByDay` and `analytics.clicksByDay` on `date`). This is
the chart that most directly echoes the reference's signature two-tone
overlapping wave — a natural fit since both series already share the
same daily date range from the existing date-range filter.

Props: `{ data, xKey, series, label }` where `series` is `[{ key: 'views',
color: '#2563EB', name: 'Views' }, { key: 'clicks', color: '#FF9900',
name: 'Clicks' }]` — generic enough to reuse if a future dashboard
addition needs a 2-series area chart, but not over-engineered beyond
what this one consumer needs (no 3+-series support, no configurable
chart type).

### Existing bar charts (retokenized, structure unchanged)

`AnalyticsChart.jsx` keeps its current `type="line" | "bar"` API (still
used for the three remaining single-series charts: Most-Clicked Products,
Estimated Commission by Category, Products Added by Month) — only its
colors and card chrome change: `stroke`/`fill` `#4f46e5` → `#2563EB`
(`primary`); card wrapper `rounded-xl border-slate-200` → `rounded-card
border-slate-200 shadow-card`; heading `text-slate-700` → `text-heading`;
gridline color `#e2e8f0` → `#E5E7EB` (the `border` token's hex, Recharts
components take raw color values, not Tailwind classes); bar corner
radius stays `[4, 4, 0, 0]`.

### Tooltip

Both `AnalyticsChart` and `DualAreaChart` get a shared custom Recharts
`<Tooltip>` content renderer (`ChartTooltip.jsx`, new, small) styled as
`rounded-card shadow-dropdown bg-white p-2 text-small` instead of
Recharts' unstyled default box — the one shared piece of chrome between
the two chart components.

## 3. DashboardPage Layout

`frontend/src/pages/admin/DashboardPage.jsx`: KPI grid stays `grid
grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4` (7 cards, 4 `AnalyticsCard`
+ 3 `GaugeCard`, same grid). Chart grid stays `grid grid-cols-1 gap-6
lg:grid-cols-2` (now 4 chart cards instead of 5: the combined
`DualAreaChart` takes one slot where two line charts used to be, plus
the 3 existing bar charts). Page heading and date-range filter: retokenize
to match Stage 2/3 patterns (`text-page-heading text-heading` for "Dashboard",
`rounded-btn border-border focus:border-primary focus:ring-primary` for
the custom date inputs, matching `LoginPage`'s already-established input
treatment).

## Testing

- `GaugeCard.test.jsx` (new): renders the label and a formatted
  percentage; renders `0%` (not `NaN%`) when given a 0 value.
- `DualAreaChart.test.jsx` (new): renders both series' `name` values in
  the legend; renders the empty state when `data` is empty (matching
  `AnalyticsChart`'s existing empty-state pattern).
- `AnalyticsCard.test.jsx`, `AnalyticsChart.test.jsx` (existing): checked
  for class-name assertions — `AnalyticsChart.test.jsx` has none (queries
  by text/structure); `AnalyticsCard.test.jsx` likewise. No changes needed
  beyond re-running them to confirm they still pass.
- `DashboardPage.test.jsx` (existing): checked for assertions tied to the
  two charts being combined (e.g. separately querying "Website Views by
  Day" and "Product Clicks by Day" as two chart headings) — if present,
  updated to expect one combined chart heading instead; the plan will
  read this file's current content before writing exact steps.

## Out of Scope for This Stage

- No Sidebar/Topbar/DataTable/admin-form changes — Stage 6 (Admin Chrome).
- No dot-matrix grids, timeline/pin components, or any other reference
  element with no corresponding real data.
- No new color tokens.
- No animation changes beyond what Recharts provides by default.
