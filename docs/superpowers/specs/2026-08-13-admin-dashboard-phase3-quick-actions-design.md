# Admin Dashboard Phase 3: Quick Actions

## Context

Follow-on to `docs/superpowers/specs/2026-08-12-admin-dashboard-phase1-shell-kpi-chart-design.md` (Phase 1: sidebar, header, 5-card KPI row, Performance Overview chart — shipped) and `docs/superpowers/specs/2026-08-13-admin-dashboard-phase2-top-categories-recent-products-design.md` (Phase 2: Top Categories, Recent Products — shipped). Those specs deferred Latest Guides, Quick Actions, and System Alerts to later phases, split by backend risk:

- **Quick Actions** — pure frontend, no new backend work. Links to existing create routes.
- **System Alerts** — needs a product decision first: this app tracks no inventory or orders, so "alerts" have no obvious data source yet. Deferred until that's scoped.
- **Latest Guides** — needs real new backend work: `BuyingGuide` has zero view tracking today (confirmed by reading `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuide.java` — no view-count field, no tracking table), so this needs a new tracking system mirroring `WebsiteView`/`ProductClick`.

This spec covers **Quick Actions only** — the lowest-risk remaining piece, chosen to go next for the same reason Phase 2 chose Top Categories/Recent Products first: it ships without new backend risk.

## Scope

Add a "Quick Actions" card to the admin dashboard: a static list of four shortcuts to the app's real content-creation flows. No data fetching, no props, no loading/error/empty states — every route and label is fixed.

**Out of scope:** Latest Guides, System Alerts, the footer, real Export Report generation — all separate future phases.

## Component: `QuickActionsCard`

New file: `frontend/src/components/QuickActionsCard.jsx`. Self-contained, no props.

Renders a card (same `rounded-card border border-slate-200 bg-white p-5 shadow-card` shell as `TopCategoriesCard`/`RecentProductsCard`) titled "Quick Actions", containing a vertical list of four rows. Each row is a `react-router` `Link` with:
- A circular icon badge (same `h-8 w-8 shrink-0 rounded-full` pattern as `TopCategoriesCard`'s category icons)
- The action label
- A trailing `ChevronRight` icon
- Hover state: subtle background tint (`hover:bg-surface-secondary`), consistent with `ActionsMenu`'s menu-item hover

The four actions, in this order:

| Label | Route | Icon | Color token |
|---|---|---|---|
| Add Product | `/admin/products/new` | `Package` | `dashboard-green` |
| Add Buying Guide | `/admin/buying-guides/new` | `FileText` | `dashboard-blue` |
| Add Comparison | `/admin/comparisons/new` | `GitCompare` | `dashboard-purple` |
| Manage Categories | `/admin/categories` | `Tag` | `dashboard-orange` |

Icon/color choices reuse tokens already established by the KPI cards (`Package`+green for Total Products, `FileText`+blue for Published Guides) so the visual language stays consistent. "Manage Categories" links to the categories list page rather than pre-opening its "Add Category" modal — that page has no dedicated `/new` route (categories are created via an in-page modal), and adding one just to support a deep link is out of scope for this phase.

## Layout

`DashboardPage.jsx`'s lower grid — currently a single-column row containing only `RecentProductsCard` (per Phase 2) — becomes two columns:

```jsx
<div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(310px,1fr)]">
  <RecentProductsCard products={analytics.recentProducts} />
  <QuickActionsCard />
</div>
```

This mirrors the `lg:grid-cols-[minmax(0,2.2fr)_minmax(310px,1fr)]` split already used for the Performance Overview + Top Categories row above it. Latest Guides will take the middle column and System Alerts will stack under Quick Actions in their own future phases — no placeholder gaps are added for either now.

## Testing

`frontend/src/components/QuickActionsCard.test.jsx`: renders the card and asserts the title and all four labels are present, each with the correct `href`.

`DashboardPage.test.jsx`: add one test asserting the Quick Actions card and its four labels render on the dashboard page.

## Self-Review

- **Placeholder scan:** no TBD/TODO; every action, route, icon, and color is fully specified.
- **Internal consistency:** the two-column lower-grid layout matches the "no placeholder gaps" principle already established in Phase 1/2 specs; icon/color reuse is traceable to existing KPI card choices.
- **Scope check:** single new component + one layout change — appropriately sized for one implementation plan.
- **Ambiguity check:** "Manage Categories" routing decision (list page, not a deep-linked modal) is made explicit rather than left open.
