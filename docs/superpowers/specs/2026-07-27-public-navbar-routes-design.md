# Public Navbar Redesign & Dedicated Catalog Routes — Design

**Date:** 2026-07-27
**Scope:** Second of four new stages derived from the user-supplied requirements document (Hero Banners done → **Navbar/Routes redesign** → Compare → Buying Guides). Replaces the logo-only `Navbar` with a full public navigation (links, Categories dropdown, mobile drawer, search modal), and adds three dedicated catalog routes (`/trending`, `/categories`, `/best-sellers`) that reuse the existing homepage catalog machinery rather than duplicating it.

**Master spec:** no corresponding section in `docs/PROJECT_SPEC.md` — new scope requested directly by the user, same as the Hero Banners stage. Frontend-only — no backend changes.

## Out of scope for this stage

- Compare and Buying Guides navbar links/routes — deferred to their own later stages so nothing links to a 404 in the meantime
- A product detail page (`/product/:id`) — doesn't exist yet; search results and catalog cards continue to link straight to Amazon, as they do today
- Real newsletter functionality — only a commented-out placeholder per the source doc's explicit (but here inapplicable, since none exists) instruction

## Navbar

`frontend/src/components/Navbar.jsx` (full rewrite, currently logo-only):
- **Desktop (`md:` and up):** logo (unchanged), then Home / Trending / Best Sellers as plain `<Link>`s, a **Categories dropdown**, and a search icon button.
- **Categories dropdown:** fetches the existing public category list (`categoryService.getCategories()`, already used elsewhere) and renders each as a link to `/categories?category={id}`; the "Categories" trigger itself links to `/categories` (unfiltered). Opens on click (not hover-only, for touch/keyboard parity), closes on outside click, Escape, or selecting an item.
- **Mobile (below `md`):** hamburger button opens `MobileMenu` (new) — the same slide-in drawer pattern already built for `AdminSidebar` (fixed overlay + Framer Motion `x: '-100%' → 0` panel, closes on link click or Escape), just carrying the public nav links instead of admin ones.
- **Active route highlighting**, per the source doc's requirement, using React Router's `NavLink` (already the pattern `AdminSidebar` uses for its own links).
- The Amazon-affiliate CTA styling stays consistent with the rest of the site — no changes to existing button color/spacing conventions.

## Dedicated catalog pages

One new component, **`CatalogPage`** (`frontend/src/components/CatalogPage.jsx`), extracts the homepage's existing catalog section (currently inline in `HomePage.jsx`: `SectionHeading` + `SearchInput` + `ProductFilters` + `ProductGrid` + `Pagination`, driven by `useProductSearch()`) into a reusable page body. Props: `{ title, description, initialFilter, initialCategoryId }`. On mount, if the URL doesn't already carry `filter`/`category` params, it seeds them from `initialFilter`/`initialCategoryId` via the existing `useProductSearch` setters — after that, normal URL-param-driven behavior takes over, so landing on `/trending` pre-filters to trending but never locks the user out of changing it. Wraps its content in `Navbar` + `Footer`, matching every other public page.

Three thin page components consume it:
- `frontend/src/pages/TrendingPage.jsx` → `<CatalogPage title="Trending Finds" initialFilter="trending" />`
- `frontend/src/pages/BestSellersPage.jsx` → `<CatalogPage title="Best Sellers" initialFilter="bestSeller" />`
- `frontend/src/pages/CategoriesPage.jsx` (public — a **new, distinct file** from the existing *admin* `frontend/src/pages/admin/CategoriesPage.jsx`; different directory, no collision) → renders the existing `CategoryCard` grid (reusing `categoryService.getCategories()`, same as the homepage's "Shop by Category" section) above a `<CatalogPage title="Categories" />`, so the page works both as a browse-by-category index and, when arrived at via `?category={id}`, as a pre-filtered catalog.

**Routing** (`frontend/src/App.jsx`): add
```
<Route path="/trending" element={<TrendingPage />} />
<Route path="/categories" element={<CategoriesPage />} />
<Route path="/best-sellers" element={<BestSellersPage />} />
```
alongside the existing `/` route. No changes to admin routes.

## Search modal

**`SearchModal.jsx`** (new), opened from the Navbar's search icon button:
- Reuses the existing `Modal` (already portal-safe as of the Hero Banners stage's bug fix, so this is safe to open from anywhere, including pages with their own forms) and the existing `SearchInput` (already debounced).
- As the query changes, fetches a small live result list via the existing `searchProducts({ search, page: 0, size: 5 })` — compact rows (thumbnail via `getImageUrl`, name, price), not full `ProductCard`s.
- States: loading (existing `LoadingSpinner`), empty ("No products found" via existing `EmptyState`), error (existing `ErrorState`, no retry needed — just re-typing retries naturally).
- Clicking a result, or submitting the query, navigates to `/?search={query}#catalog` and closes the modal — there's no product detail page to deep-link to yet, so results route back to the full catalog with the term pre-applied rather than attempting a false deep link.
- Escape-to-close and focus trapping are inherited from `Modal` for free.

## Newsletter placeholder

Per the source doc, add a commented-out block to `frontend/src/components/Footer.jsx` (the natural location — "Newsletter footer form" is explicitly listed) with the exact marker comment:
```jsx
{/* TODO: Enable newsletter functionality in a future deployment. */}
{/* <NewsletterSignup /> */}
```
No `NewsletterSignup` component is created — there's nothing to import, so no unused-import lint issue. This is scaffolding text only, matching the doc's own fallback instruction ("If commenting out the component creates linting errors, remove only the unused import" — moot here since nothing is imported).

## Accessibility

`NavLink`s carry `aria-current="page"` automatically via React Router when active. The Categories dropdown trigger has `aria-expanded`/`aria-haspopup`. `MobileMenu` mirrors `AdminSidebar`'s existing accessible drawer (`role="dialog"`, `aria-modal`, Escape-to-close). Search modal inherits `Modal`'s existing focus trap and `Escape` handling. All new interactive elements have visible focus states, matching the site-wide convention.

## Testing

Vitest + React Testing Library:
- `Navbar`: renders all nav links, active-link highlighting, Categories dropdown opens/closes and lists real categories, mobile hamburger opens `MobileMenu`, search icon opens `SearchModal`.
- `MobileMenu`: opens/closes, closes on link click, closes on Escape.
- `CatalogPage`: seeds `filter`/`category` from `initialFilter`/`initialCategoryId` only when the URL doesn't already have them, renders the catalog UI, doesn't re-seed on subsequent filter changes.
- `TrendingPage` / `BestSellersPage` / `CategoriesPage` (public): each renders with the correct title and initial filter; `CategoriesPage` additionally renders the category-card grid.
- `SearchModal`: debounced live results render with correct data, loading/empty/error states, clicking a result and submitting the query both navigate to `/?search=...` and close the modal, Escape closes it.
- `Footer`: the newsletter comment doesn't render any visible output or break existing disclosure/social-links tests.
