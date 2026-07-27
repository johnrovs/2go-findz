# Frontend Stage 2: Public Homepage — Design

**Date:** 2026-07-26
**Scope:** The complete public storefront homepage — hero, social links, curated product teasers, the searchable/filterable/sortable/paginated product catalog, supporting content sections, and the footer. Wires up anonymous view/click tracking against the backend endpoints shipped in `docs/superpowers/plans/2026-07-26-backend-analytics-media.md`.

**Master spec:** `docs/PROJECT_SPEC.md` §"Public Home Page". **Depends on:** Frontend Stage 1 (`docs/superpowers/plans/2026-07-26-frontend-core.md`, merged) for the Axios service layer, reusable primitives (`LoadingSpinner`/`EmptyState`/`ErrorState`), and the `/` route (currently a placeholder `HomePage`). Backend endpoints consumed: `GET /api/public/products`, `GET /api/public/products/{id}`, `GET /api/public/categories`, `GET /api/public/settings`, `POST /api/public/views`, `POST /api/public/products/{id}/click`.

## Out of scope for this stage

- Admin CRUD screens (Frontend Stage 3)
- Login/admin shell changes (Frontend Stage 1, already done)
- Deployment configuration

## Page structure (in order)

1. **Hero Banner** — shop name, headline, description, two CTAs, all sourced from `GET /api/public/settings` (`heroHeadline`, `heroDescription`, `shopBio`, `heroImageFilename`). Framer Motion entrance animation.
2. **Social Media Links** — TikTok/Pinterest/Instagram/YouTube icon links from settings; hover animation; `target="_blank" rel="noopener noreferrer"`.
3. **Curated teasers** — Featured Products, Trending Finds, Best Sellers: small previews (first N results of a scoped, unpaginated query each), no filter UI of their own.
4. **Shop by Category** — category cards (from `GET /api/public/categories`, which never exposes commission rate); clicking a card scrolls to/navigates the main catalog pre-filtered by that category (`?category={id}`).
5. **Main catalog** — the interactive core: debounced search input, filter controls (All/Trending/Best Sellers/Category dropdown), sort dropdown, paginated product grid.
6. **Why Shop with 2Go Findz** — static content section.
7. **Social CTA** — a second, more prominent social-links call to action.
8. **Footer** — site links + the required affiliate disclosure text (from settings' `affiliateDisclosure` field).

## State management

- Search/filter/sort/page state lives in the URL via React Router's `useSearchParams` — bookmarkable, back-button-friendly, survives refresh, matches how a product-browsing page is expected to behave.
- A `useProductSearch()` hook wraps `useSearchParams`, reads `search`, `category`, `trending`, `bestSeller`, `sort`, `page`, calls `productService.searchProducts(params)`, and returns `{ products, isLoading, error, page, totalPages, setSearch, setCategory, setFilter, setSort, setPage }`. Every setter updates the URL via `setSearchParams(..., { replace: true })` so typing in the search box doesn't spam browser history.
- The search input is debounced (~300ms) before updating the URL/triggering a fetch — satisfies the spec's "updates while typing, no page refresh" requirement without firing a request per keystroke.
- Default sort (no `sort` param) matches the backend's own default: `createdAt` ascending (oldest first) — already the default on `GET /api/public/products` from Backend Stage 1, so the frontend simply omits the param rather than re-encoding the default.

## Image URLs

`utils/imageUrl.js` exports `getImageUrl(filename)`: derives the backend origin by stripping a trailing `/api` from `VITE_API_BASE_URL`, then returns `${origin}/uploads/${filename}`. No new environment variable. If `filename` is falsy, returns `null` so callers can render an `<img>` with no `src` gracefully (in practice this should be rare — the backend's placeholder-image fallback, shipped in Backend Stage 2, means `imageFileName` is only null when no placeholder has been configured yet).

## Tracking

- **View tracking:** on `HomePage` mount, a `useEffect` checks `sessionStorage.getItem('sessionId')`. If absent, calls `POST /api/public/views` once, stores the returned `sessionId` in `sessionStorage`. Re-renders and re-mounts within the same browser session never fire a second call.
- **Click tracking:** `ProductCard`'s "View on Amazon" button handler calls `trackingService.recordClick(productId, sessionId)` (from `sessionStorage`) and then immediately calls `window.open(productLink, '_blank', 'noopener,noreferrer')` — the tracking request is initiated before the redirect fires, satisfying "track through the backend before redirecting" without making the click feel laggy by awaiting the network round-trip. The anchor/button itself uses `rel="nofollow sponsored noopener noreferrer"` semantics (implemented via `window.open`'s `noopener` flag plus a visually-identical `<a>` fallback for no-JS/right-click "open in new tab" — see Task breakdown).

## New reusable components (per spec's explicit list)

`HeroSection`, `SocialLinks`, `SearchInput`, `FilterDropdown`, `ProductFilters`, `ProductGrid`, `ProductCard`, `CategoryCard`, `SectionHeading`, `Pagination`, `AffiliateDisclosure`, `Footer`.

Reused from Frontend Stage 1: `LoadingSpinner`, `EmptyState`, `ErrorState`.

## New services

- `services/productService.js` — `searchProducts(params): Promise<PageResponse>`, `getProductById(id): Promise<Product>`
- `services/categoryService.js` — `getCategories(): Promise<Category[]>`
- `services/settingsService.js` — `getSettings(): Promise<Settings>`
- `services/trackingService.js` — `recordView(): Promise<{ sessionId }>`, `recordClick(productId, sessionId): Promise<void>`

All built on the existing shared `api` Axios instance from Frontend Stage 1 — no direct `axios`/`fetch` calls anywhere in this stage either.

## Accessibility & responsiveness

Every product image has descriptive alt text (product name). Lazy-loaded images (`loading="lazy"`). Visible focus states on every interactive element (cards, filter controls, pagination buttons). Semantic HTML (`<section>`, `<nav>` for pagination, `<article>` per product card). Responsive grid: single column on mobile, scaling up through tablet/laptop/desktop breakpoints.

## Testing

Vitest + React Testing Library, consistent with Frontend Stage 1's approach:
- `useProductSearch` hook: URL params round-trip correctly, debounce delays the search fetch, page resets to 1 when filters change.
- `ProductCard`: renders badges conditionally (trending/best-seller), click tracking fires before navigation, correct `rel` attributes.
- `SearchInput`: debounced update, clears correctly.
- `Pagination`: page navigation updates the URL.
- `HomePage`: view tracking fires once per session (mocking `sessionStorage`).
- `SocialLinks`: correct `target`/`rel` attributes, hidden when a URL isn't configured in settings.
