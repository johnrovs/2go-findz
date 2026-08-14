# Admin Dashboard Phase 5: Footer

## Context

Follow-on to Phase 1 (shell/KPI/chart), Phase 2 (Top Categories, Recent Products), Phase 3 (Quick Actions), and Phase 4 (Latest Guides) — all shipped. Those specs deferred System Alerts, the footer, and real Export Report generation, split by risk. This spec covers **the footer only** — the lowest-risk remaining piece: pure frontend, static content, no new data.

**Root cause confirmed by reading the code:** `AdminLayout.jsx` (sidebar + topbar + routed `<Outlet>` content) has no footer element at all today.

## Scope

Add a minimal `AdminFooter` component to the admin shell, appearing consistently across every admin page (not just the dashboard).

**Out of scope:** System Alerts, real Export Report generation — separate future phases.

## Component

New `frontend/src/components/AdminFooter.jsx`, no props, fully static:
- Content: `© {current year} 2Go Findz. All rights reserved.` — matches `PublicFooter`'s copyright copy, but hardcoded English (the admin area is not part of the i18n system; every other admin component — `DashboardHeader`, `DashboardKpiCard`, `AdminSidebar`, etc. — is hardcoded English too).
- Style: small, muted text (`text-small text-muted`), with a top border (`border-t border-slate-200`) separating it from page content above, and vertical padding — minimal, no nav links or social icons (those belong to the public site's `PublicFooter`, not this internal admin tool).

## Placement

`frontend/src/layouts/AdminLayout.jsx` gets `<AdminFooter />` added immediately after the routed `<Outlet>`, inside the same `<main>` flex column, so it renders below whatever page is currently routed — appearing on every admin page (Dashboard, Products, Categories, Buying Guides, Comparisons, Settings), not just the dashboard.

## Testing

- `frontend/src/components/AdminFooter.test.jsx`: renders the component and asserts the copyright text (with the current year, computed via `new Date().getFullYear()` in the test, not hardcoded) is present.
- `frontend/src/layouts/AdminLayout.test.jsx`: one new assertion that the footer's copyright text renders alongside the routed page content.

## Self-Review

- **Placeholder scan:** no TBD/TODO; content, styling, and placement are fully specified.
- **Internal consistency:** matches the established "admin area is hardcoded English, no i18n" convention already used by every other admin component; matches `PublicFooter`'s copyright copy exactly, adapted to a minimal admin-appropriate style.
- **Scope check:** one new component + one layout placement — minimal, appropriately sized for a single implementation plan.
- **Ambiguity check:** placement (whole admin area via `AdminLayout`, not just the dashboard page) is explicit, resolving the only real design choice in this phase.
