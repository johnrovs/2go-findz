# Admin Dashboard Redesign — Phase 1: Shell, KPI Row, Performance Overview Chart

## Context

The user supplied a reference screenshot of a target admin dashboard design (dark navy sidebar with grouped nav + "Quick Tip" card; header with a personalized greeting, date-range picker, Export Report button, and admin avatar; a 6-card KPI row; a "Performance Overview" line chart + "Traffic by Source" donut side-by-side; "Top Categories"; "Recent Products"; "Latest Guides"; "Quick Actions"; "System Alerts"; footer) along with a very large, prescriptive spec (26 sections) for reproducing it, with explicit exclusions:

- No "Estimated Commissions" KPI card.
- No "Traffic by Source" card.
- The Performance Overview chart shows only Views and Clicks (no Orders, no Commissions).

Codebase research (2026-08-12) found the current `frontend/src/pages/admin/DashboardPage.jsx` is far from this target: 8 KPI cards (5 `AnalyticsCard` + 3 `GaugeCard`), a 4-series area chart, and 3 extra bar charts — none of the reference's grouped sidebar, header greeting, table/list sections, Quick Actions, System Alerts, or footer exist yet. This is effectively a rebuild, not a tweak, and splits into pieces with very different backend risk:

- **Pure frontend, existing data**: sidebar, header, KPI row reshape, Views+Clicks chart.
- **Small new backend query**: Top Categories, Recent Products' Clicks column.
- **Real new backend work**: Latest Guides' view count (buying guides have zero view tracking today), Export Report (no export library/endpoint exists at all).

Given this, the work is being decomposed into sequential phases, each with its own spec → plan → implementation cycle. **This spec covers Phase 1 only**: the dashboard shell (sidebar + header + design tokens), the 5-card KPI row, and the Performance Overview chart. Top Categories, Recent Products, Latest Guides, Quick Actions, System Alerts, footer, and Export Report are explicitly out of scope here and will each be their own follow-on phase.

## Key decisions (confirmed with the user)

1. **"Total Orders" KPI**: this site has no order/purchase tracking (it's an Amazon affiliate site — only click-throughs are tracked, never actual purchases; the existing dashboard already distinguishes "Estimated Commission" from real revenue for exactly this reason). Rather than fabricate an orders number, the 3rd KPI slot is **Total Products** instead, reusing the existing all-time `totalProducts` count already returned by the summary endpoint.
2. **Sidebar nav items without a real page**: the reference's full nav list (Reviews, Trending, Best Sellers, Deals, Traffic, Clicks, Commissions, Reports, Users, Integrations) mostly has no corresponding admin route today. Rather than show them disabled or link them to non-existent pages, the sidebar shows **only items with a real existing route**, grouped as closely to the reference's structure as possible. This yields two groups instead of four: **MAIN** (Dashboard, Products, Categories, Buying Guides, Comparisons) and **SETTINGS** (Settings). Groups that would end up empty (CONTENT, ANALYTICS) are omitted entirely rather than rendered with no items.
3. **Legacy gauges/bar charts**: the current dashboard's 3 `GaugeCard`s (CTR, Trending Share, Best-Seller Share) and 3 extra bar charts (Most-Clicked Products, Commission by Category, Products Added by Month) aren't in the reference and weren't in the user's exclusion list either — they're simply **removed from this page** (not deleted server-side; their backend endpoints and data stay intact for potential reuse elsewhere later).
4. **Font**: the user's spec says "Inter" in prose but gives a `Poppins` code snippet. The codebase already loads Poppins site-wide (`@fontsource/poppins`), so Poppins is used, not Inter.
5. **Page scope for this phase**: the page ends after the Performance Overview chart. No placeholder gaps are left for Top Categories/Recent Products/Latest Guides/Quick Actions/System Alerts/footer — those arrive in later phases.

## Non-goals (deferred to later phases)

- Top Categories card, Traffic-by-Source removal reflow (the chart's row partner).
- Recent Products table, Latest Guides list, Quick Actions grid, System Alerts list, footer.
- Real Export Report functionality (CSV/PDF/XLSX generation) — the button exists visually this phase but is disabled.
- Tablet/mobile responsive polish beyond not breaking (full responsive verification happens once all sections exist — building it against an incomplete page risks rework).

## Design tokens

Extend `frontend/tailwind.config.js` with a new `dashboard` color group rather than introducing parallel raw CSS custom properties (keeping the existing Tailwind-config-driven token convention intact):

```js
colors: {
  // ...existing tokens unchanged...
  dashboard: {
    purple: '#5b2cf2',
    purpleDark: '#4315d9',
    purpleLight: '#f0ebff',
    orange: '#ff6b00',
    green: '#36ad3d',
    blue: '#1685ff',
  },
}
```

Two of the reference's requested colors are exact matches to existing tokens and are reused directly rather than duplicated: `navy.950` (`#020d18`) for the sidebar background, and `danger` (`#EF4444`) for red accents. The existing `success`/`info`/`amazon`/`primary` tokens are untouched — other admin pages (product status badges, etc.) keep their current shades.

Font: Poppins (already the site-wide font via `@fontsource/poppins`), no change needed to font loading.

## Sidebar (`AdminSidebar.jsx`)

- Background: `bg-navy-950` (replacing the current hardcoded `bg-[#0F172A]`).
- Two nav groups, each with a muted uppercase label:
  - **MAIN**: Dashboard, Products, Categories, Buying Guides, Comparisons (existing routes, existing icons reused).
  - **SETTINGS**: Settings (existing route).
- Active item: purple gradient (`from-dashboard-purple to-dashboard-purpleDark`), replacing the current `from-primary to-indigo-500` (which depended on the `.admin-scope` CSS-var swap — this phase moves the sidebar off that mechanism onto explicit dashboard tokens for pixel accuracy against the reference).
- Inactive items: white/light text, hover state using a lighter navy shade, visible keyboard-focus ring (no decorative underlines, per the spec).
- Logo: reuse the existing `frontend/src/assets/2gofindz.png`, "2Go" in orange / "Findz" in white, tagline "Smart Finds. Better Choices." underneath — matches the reference and the existing public navbar treatment.
- Quick Tip card at the bottom: lightbulb icon, `dashboard.purpleDark` background, white title "Quick Tip", pale-purple (`dashboard.purpleLight`) body text with the exact copy: "Add new products regularly to increase engagement and commissions." Rounded corners matching the existing `rounded-card` token.
- Existing collapsible/drawer behavior on tablet/mobile, active-state preservation, and focus-restore-on-close are preserved as-is (already implemented in `AdminLayout`/`AdminSidebar` today) — only the visual styling and item list change, not the interaction logic.

## Header (`AdminTopbar.jsx`)

- Left: existing sidebar-toggle button (unchanged), replacing the current breadcrumb with:
  - `<h1>Welcome back, {user.fullName}! 👋</h1>` — one dashboard `h1`, dynamic from the existing auth context (`useAuth()` or equivalent already powering `{user?.fullName}` today), never hardcoded.
  - Supporting text: "Here's what's happening with 2Go Findz today."
- Right side, in order:
  - New `DashboardDateRangePicker` component, built on `react-datepicker`'s range-select mode (`selectsRange`) — already a project dependency (used today by `PublishDatePicker.jsx` for single-date selection), so this reuses the existing date library rather than adding a new one. Replaces the current `FilterDropdown` preset + raw `<input type="date">` pair. Wired to the same `from`/`to` query params `DashboardSummaryController`/`DashboardAnalyticsController` already accept.
  - `Export Report` button (reusing `Button.jsx`), **disabled this phase** with a "Coming soon" tooltip/label — the backend has no export capability yet (confirmed: no CSV/PDF/XLSX library in `pom.xml`, no export endpoint anywhere), so wiring a real export is explicitly deferred.
  - Admin avatar + name + role + dropdown chevron, opened via an accessible button (`aria-haspopup`, `aria-expanded`), reusing the existing authenticated-user data already available to `AdminTopbar`.

## KPI row (`DashboardKpiGrid` / `DashboardKpiCard`)

Exactly 5 cards, `grid-cols-5` on desktop (responsive collapse deferred per non-goals, but not actively broken):

| # | Label | Icon (color) | Source |
|---|-------|--------------|--------|
| 1 | Total Views | eye (`dashboard.purple`) | existing `totalViews` (range-scoped) |
| 2 | Total Clicks | cursor (`dashboard.orange`) | existing `totalClicks` (range-scoped) |
| 3 | Total Products | shopping-cart (`dashboard.green`) | existing `totalProducts` (all-time, per existing "Rule 3" convention) |
| 4 | Published Guides | document (`dashboard.blue`) | **new** `publishedGuideCount` (all-time, mirrors the `totalProducts`/`totalCategories` pattern) |
| 5 | Avg. CTR | target (`dashboard.purple`) | computed client-side from views/clicks, exactly as today (`safePercentage(clicks, views)`) |

Each card: colored circular icon container, label (12–13px/600), large value (22–25px/700), percentage-change indicator with a ↑/↓ glyph (never color-only — green for positive, red/`danger` for negative) at 11–12px/600, and a comparison-period caption at 10–11px/400–500 (e.g. "vs May 12 – May 18", derived from the selected date range's equivalent prior period). Card height/alignment stays consistent across all 5. Large numbers use thousands separators; CTR is formatted as a percentage.

`DashboardKpiCard` is a new component replacing `AnalyticsCard.jsx`'s usage on this page (the existing component's `{label, value, icon}` shape doesn't have a delta/comparison sub-line, so it's extended rather than reused as-is — `AnalyticsCard.jsx` itself is left untouched for any other consumer).

## Performance Overview chart

- Full-width card (Top Categories, its reference row-partner, is deferred to the next phase — no placeholder is left in its place).
- New `DashboardLineChart` component, sibling to the existing `DualAreaChart.jsx` and sharing its `{data, xKey, series: [{key, name, color}]}` shape (a drop-in reuse of that established multi-series pattern, just rendering `<Line>` instead of `<Area>`).
- Two series only: **Views** (`dashboard.purple`, circular point markers, subtle shaded area beneath via recharts' gradient-fill pattern already used in `DualAreaChart`) and **Clicks** (`dashboard.orange`, line only, no shading). No Orders/Commissions series exist to remove since this is a new chart, not a trim of the old one.
- Data source: existing `viewsByDay`/`clicksByDay` fields from `GET /api/admin/dashboard/analytics` — no backend change needed for the chart data itself.
- Daily/Weekly/Monthly granularity dropdown, top-right. The backend only returns daily buckets today, so Weekly/Monthly are computed client-side by summing daily buckets into calendar weeks/months — documented in code as a client-side bucketing step, not a new backend capability.
- Compact legend at the top showing only "Views" (purple dot) and "Clicks" (orange dot).
- Light grid lines (`grid: #e9edf3`), white chart background, numeric Y-axis labels (formatted with `K` for thousands where the value warrants it), date X-axis labels, readable tooltips.
- Loading/empty/failed states follow the existing `LoadingSpinner`/`EmptyState`/`ErrorState` components already used elsewhere in admin.
- An accessible data table (visually hidden, `sr-only`, or a "view as table" toggle) provides the same values as the chart for screen-reader users, satisfying the accessibility requirement without needing a separate charting-library accessibility plugin.

## Backend change

One new field on `DashboardSummaryResponse` (record) and its computation in `DashboardServiceImpl`:

```java
long publishedGuideCount = buyingGuideRepository.countByVisibilityAndActiveTrue(BuyingGuideVisibility.PUBLIC);
```

(Exact repository method name/signature to be finalized against the real `BuyingGuideRepository` during planning — the existing `totalProducts`/`totalCategories` counts in `DashboardServiceImpl` are the direct precedent to follow: same all-time, non-range-filtered behavior, same "count by simple boolean/enum predicate" shape.) No new endpoint, no new DTO — this is an additive field on the existing summary response, so the existing `AdminDashboardController` route and its consumers elsewhere (if any) are unaffected by the addition.

## Removed from this page (not deleted)

- `GaugeCard` usage ×3 (CTR, Trending Share, Best-Seller Share) — `GaugeCard.jsx` itself is untouched in case another page wants it later.
- `AnalyticsChart` bar-chart usage ×3 (Most-Clicked Products, Commission by Category, Products Added by Month) — `AnalyticsChart.jsx` itself is untouched.
- The old `DualAreaChart` usage for Views/Clicks/Orders/Commissions — replaced by the new `DashboardLineChart` (Views/Clicks only). `DualAreaChart.jsx` itself is untouched for any other consumer.
- The old `FilterDropdown`-based date range control on this page — replaced by `DashboardDateRangePicker`. `FilterDropdown.jsx` itself is untouched for other admin pages that use it.

## Testing

- Update `frontend/src/pages/admin/DashboardPage.test.jsx` to match the new structure (5 KPI cards, one chart, no gauges/extra bar charts).
- New tests: `DashboardDateRangePicker.test.jsx`, `DashboardKpiCard.test.jsx`, `DashboardLineChart.test.jsx`.
- Update `AdminSidebar.test.jsx`/`AdminTopbar.test.jsx` (or create them if they don't already exist) for the new nav groups and header content.
- Backend: a test on `DashboardServiceImpl`/`AdminDashboardController` covering the new `publishedGuideCount` field.
- Full frontend suite, lint, build; backend `mvn test` for the summary-response change.
- Manual verification: screenshot the dashboard at the reference's viewport size and compare side-by-side (sidebar width, header height, KPI card height, icon-circle size, chart height/line thickness/grid opacity), per the user's own "do not claim it matches without screenshot comparison" requirement — scoped to this phase's sections only (sidebar, header, KPI row, chart), not the full reference (later phases get their own comparison once built).
