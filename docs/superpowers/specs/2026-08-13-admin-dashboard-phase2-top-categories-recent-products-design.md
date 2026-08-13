# Admin Dashboard Redesign — Phase 2: Top Categories, Recent Products

## Context

Follow-on to `docs/superpowers/specs/2026-08-12-admin-dashboard-phase1-shell-kpi-chart-design.md` (Phase 1: sidebar, header, 5-card KPI row, Performance Overview chart — shipped). That spec explicitly deferred Top Categories, Recent Products, Latest Guides, Quick Actions, System Alerts, the footer, and real Export Report generation to later phases, split by backend risk. This spec covers the two lowest-risk remaining pieces: **Top Categories** and **Recent Products**, both buildable from data the backend already tracks (product clicks), needing only new aggregation queries — no new tracking tables, unlike Latest Guides (no view tracking exists for buying guides) or Export Report (no generation library exists at all).

Per the reference image, these two cards complete the "analytics row" started in Phase 1 (Performance Overview + Top Categories side by side) and begin the "lower dashboard" row (Recent Products is its left column). Latest Guides, Quick Actions, and System Alerts — the rest of that lower row — remain separate future phases.

## Key decisions (confirmed with the user)

1. **Top Categories metric**: ranked by **click count within the selected date range**, not product count. A static all-time product count would be both tiny (5-20 per category) and unresponsive to the date-range picker, unlike every other number on this dashboard.
2. **Recent Products status wording**: badges read **"Published"/"Draft"**, matching the reference image exactly, even though the existing `/admin/products` list page labels this same `active` boolean "Active"/"Inactive". This is a disclosed, scoped-to-this-card wording choice, not a data model change — the existing Products page is untouched. There is no real "Archived" state in the `Product` entity, so it's never shown.
3. **Recent Products' Actions menu**: three-dot menu with **only an Edit item** (→ the existing `/admin/products/:id` admin route). No public product-detail page exists in this app, so a "View" action is omitted rather than linking somewhere fake.

## Non-goals (deferred to later phases)

- Latest Guides, Quick Actions, System Alerts, the footer.
- Real Export Report generation.
- Any change to the existing `/admin/products` or `/admin/categories` list pages' own terminology/behavior — this phase only adds two new dashboard cards.

## Top Categories

**Backend**: `ProductClickRepository.countClicksByCategory(from, to, pageable)` — a structural mirror of the existing `sumCommissionByCategory` query (same `ProductClick` → `product.category` join, same "categories with zero clicks in range produce no row" convention already established there), counting rows instead of summing commission, ordered by count descending, limited via the supplied `Pageable` (top 5). New projection interface `CategoryClickCountProjection { getCategoryId(), getCategoryName(), getClickCount() }`, mapped to a new DTO `CategoryClickCountResponse(Long categoryId, String categoryName, long clickCount)`. `DashboardServiceImpl.getAnalytics()` adds a `topCategories` field to the existing `DashboardAnalyticsResponse` — no new endpoint, no new frontend service call.

**Frontend** `TopCategoriesCard.jsx`:
- Title "Top Categories", "View all" link (top-right) → `/admin/categories`.
- Up to 5 rows (fewer if fewer categories had any clicks in the range, per the existing zero-omission convention — never zero-padded to force exactly 5).
- Each row: a consistent outline icon (e.g. a tag/folder glyph — no per-category icon exists in the data model, so this is a fixed UI choice, not fabricated data) in a purple-tinted circular container, category name, a horizontal progress bar whose width is scaled against the highest click count among the currently-visible rows (so the top row is always 100% width), and the click count right-aligned with thousands separators.
- Loading state (skeleton matching final row count/height), empty state ("No category activity in this range.") when zero categories have clicks, error state consistent with other cards.

## Recent Products

**Backend**:
- `ProductRepository.findTop5ByOrderByCreatedAtDesc()` — a Spring Data derived query for the 5 most recently created products, **no `active` filter** (the reference mixes Published and Draft rows, so inactive/draft products must appear too).
- `ProductClickRepository.countClicksByProductIdsBetween(productIds, from, to)` — one batched query returning click counts grouped by product id for exactly those 5 products (avoids N+1 — five separate per-product count queries). Products with no clicks in range are absent from the result and default to `0` in the service layer.
- New DTO `RecentProductResponse(Long id, String name, String imageFileName, String categoryName, boolean active, LocalDateTime createdAt, long clicks)`. `DashboardServiceImpl.getAnalytics()` adds a `recentProducts` field to `DashboardAnalyticsResponse`, zipping the 5 products with their looked-up click counts.

**Frontend** `RecentProductsCard.jsx`:
- Title "Recent Products", "View all products" link (top-right) → `/admin/products`, plus a full-width outlined `Button` with the same label/destination at the bottom of the card.
- Reuses the existing shared `DataTable.jsx` component (no new table primitive). Columns:
  - **Product** — thumbnail (`getImageUrl` pattern already used on `/admin/products`, with the same fallback icon box for missing images) + name (clamped to one line).
  - **Category** — `categoryName`.
  - **Status** — "Published" (green pill, `active === true`) / "Draft" (gray pill, `active === false`), per the wording decision above.
  - **Date Added** — `createdAt`, formatted with the same `toLocaleDateString` pattern already used on `/admin/products`.
  - **Clicks** — right-aligned number, thousands-separated.
  - **Actions** — a new small `ActionsMenu` component (three-dot trigger button, `role="menu"` popover, outside-click + Escape to close, matching the interaction pattern already established by the Categories dropdown in `Navbar.jsx` and `LanguageSelector.jsx`) containing only an **Edit** item linking to `/admin/products/:id`.
- Loading state (skeleton matching 5 compact rows), empty state ("No products yet." with a link to add one), error state.
- Reloads when the dashboard's date range changes (the `clicks` column is range-scoped; which 5 products appear is not, since "recent" means recent by creation date regardless of range) — via the same single `getAnalytics` call already used by the rest of the dashboard, no separate network request.

## Layout integration

Both cards join the existing Phase 1 page, per the reference's structure:
- **Analytics row** becomes `Performance Overview` (~68-72% width) + `Top Categories` (~28-32% width) side by side on desktop, matching heights — replacing Phase 1's full-width-only Performance Overview.
- **Recent Products** becomes the left column of the (new, this-phase-starts-it) lower grid — its middle (Latest Guides) and right (Quick Actions + System Alerts) columns stay absent until their own phases, so the lower grid is single-column (just Recent Products) for now rather than the eventual three-column layout, with no placeholder gaps for the not-yet-built columns.

## Testing

- Backend: new tests on `AdminDashboardControllerTest` for both new queries — `countClicksByCategory` (multiple categories, some with zero clicks omitted, ordering, limit) and the recent-products-plus-clicks flow (5 most recent regardless of active flag, correct per-product click counts scoped to range, zero-click products default to 0).
- Frontend: new `TopCategoriesCard.test.jsx`, `RecentProductsCard.test.jsx`, `ActionsMenu.test.jsx` (open/close, outside-click, Escape, focus return — same pattern as `LanguageSelector.test.jsx`), updated `DashboardPage.test.jsx` for the new layout and both cards' presence.
- Full suite + lint + build (frontend and backend), manual screenshot comparison against the reference's analytics-row and Recent-Products sections specifically.
