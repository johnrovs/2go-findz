# Buying Guides Feature — Design

**Date:** 2026-07-27
**Scope:** Fourth and final stage derived from the user-supplied requirements document (Hero Banners → Public Navbar Redesign & Dedicated Catalog Routes → Compare → **Buying Guides**). Adds real editorial content: admin-authored articles that recommend specific products, with a public list page and per-guide detail page. Per the user's explicit answer earlier this session, this needs real backend development, not a placeholder page.

**Master spec:** no corresponding section in `docs/PROJECT_SPEC.md` — new scope requested directly by the user, same as the three prior stages.

## Out of scope for this stage

- Rich-text/WYSIWYG editing — guide content is plain text, matching how `Product.description` already works. No new editor dependency.
- Per-product notes within a guide (e.g., "best for beginners") — the recommended-products list is just an ordered set of products, no per-item annotation field.
- SEO slugs — detail URLs use the numeric id (`/buying-guides/:id`), matching every other route in this app (categories, products).
- Guide categorization/tagging — out of scope for v1; guides are a flat, reverse-chronological list, matching how `Product`'s default sort already works (no manual `displayOrder` field, unlike `HeroBanner`, since guides are an ongoing content feed rather than a small curated carousel).
- View/click analytics on guides — no tracking beyond what already exists for products.

## Data model

New `BuyingGuide` entity (`backend/src/main/java/com/twogofindz/backend/entity/BuyingGuide.java`), modeled on `HeroBanner`'s conventions:

- `id`, `title` (required), `excerpt` (required, short summary for list cards), `content` (required, `TEXT`, full article body), `coverImageFilename`, `active` (`Boolean`, draft/publish toggle), `createdAt`/`updatedAt` (DB-generated timestamps, same `@Generated` pattern used throughout this codebase).
- `recommendedProducts`: `@ManyToMany` to `Product` with `@OrderColumn(name = "display_order")`, backed by a new `buying_guide_products` join table (`buying_guide_id`, `product_id`, `display_order`). Hibernate manages the join table and ordering automatically — no separate join-entity class needed. Reordering in the admin form is just reordering the `List<Product>` before save.

New Flyway migration `V9__create_buying_guides_table.sql` creates both `buying_guides` and `buying_guide_products`.

Deleting a guide is a **hard delete** (`buyingGuideRepository.delete(...)`), matching `HeroBanner` — guides have no analytics or foreign-key referential-integrity concerns the way `Product` does (which is why `Product` uses soft-delete instead).

## Backend

### Admin (`AdminBuyingGuideController`, `/api/admin/buying-guides`, protected by the existing JWT auth)
- `POST /` — create. `PUT /{id}` — update. `GET /` — list all (admin sees drafts too). `GET /{id}` — single guide detail. `DELETE /{id}` — hard delete.
- `BuyingGuideRequest`: `title`, `excerpt`, `content`, `coverImageFilename`, `active`, `recommendedProductIds: List<Long>` (ordered — the request's list order becomes the guide's display order).
- `BuyingGuideResponse`: full detail including `recommendedProducts: List<ProductResponse>` (reusing the existing DTO, same as the Compare feature's response shape).
- Cover image upload reuses the existing admin image-upload endpoint (`AdminImageController`) already shared by `Product` and `HeroBanner` — no new upload mechanism.
- Validation follows the existing `ProductRequest`/`HeroBannerRequest` pattern: `@NotBlank` on `title`/`excerpt`/`content`, `@NotNull` on `active`.

### Public (`PublicBuyingGuideController`, `/api/public/buying-guides`)
- `GET /` — active-only guides, summary shape (`id`, `title`, `excerpt`, `coverImageFilename`, `createdAt`), newest first (`findByActiveTrueOrderByCreatedAtDesc`).
- `GET /{id}` — active-only detail (`id`, `title`, `content`, `coverImageFilename`, `createdAt`, `recommendedProducts: List<ProductResponse>`); 404s for inactive or missing guides — identical information-hiding rule already applied to `Product.getActiveById`, so a draft guide is indistinguishable from a nonexistent one via the public API.

`BuyingGuideMapper` produces both the admin (`BuyingGuideResponse`) and public (`PublicBuyingGuideSummaryResponse`, `PublicBuyingGuideDetailResponse`) shapes from the entity, following `ProductMapper`'s/`HeroBannerMapper`'s existing pattern of one mapper per entity producing multiple response shapes.

## Frontend

### Admin
- `pages/admin/BuyingGuidesPage.jsx` — `DataTable` listing every guide (title, active/draft status, created date) with edit and delete actions; delete confirmation reuses the existing `ConfirmDialog`. Mirrors `ProductsPage.jsx`.
- `pages/admin/BuyingGuideFormPage.jsx` (shared route for create `/admin/buying-guides/new` and edit `/admin/buying-guides/:id`, mirroring `ProductFormPage.jsx`): fields for title, excerpt, content (`<textarea>`), cover image (existing `ImageUploader`), active toggle, and a recommended-products picker — a searchable multi-select built on the same product-search machinery the catalog already uses, with up/down buttons to reorder the selected list before save.

### Public
- `pages/BuyingGuidesPage.jsx` — public route `/buying-guides`, wrapped in `Navbar`/`Footer`. Grid of guide cards (cover image, title, excerpt), each linking to its detail page. Loading/empty/error states via the existing `LoadingSpinner`/`EmptyState`/`ErrorState`.
- `pages/BuyingGuideDetailPage.jsx` — public route `/buying-guides/:id`. Renders the cover image, title, and full content, followed by a "Recommended Products" section reusing the existing `ProductGrid`/`ProductCard` (so the compare-toggle, badges, and "View on Amazon" behavior all come for free). 404/inactive guides show the existing not-found handling pattern.
- `services/buyingGuideService.js`: `getBuyingGuides()`, `getBuyingGuideById(id)` — thin wrappers matching `productService.js`'s existing style.

### Navigation
- `Navbar.jsx`: new "Buying Guides" `NavLink` positioned after "Compare" and before "Best Sellers" (finally filling the slot deliberately left empty in the earlier Navbar Redesign stage).
- `MobileMenu.jsx`: matching entry added to `NAV_ITEMS`, same position.
- `App.jsx`: the four new routes (two public, two admin — the admin form route is shared between create/edit like `ProductFormPage`'s `/new` and `/:id`).

## Accessibility

- Guide cards and detail pages use semantic headings (`<h2>`/`<h1>` as appropriate) and descriptive image `alt` text (cover image alt text defaults to the guide title, matching how product images already use the product name).
- The admin product multi-select and reorder controls have accessible labels (`aria-label`s naming the product for each reorder/remove action), matching the descriptive-label convention already established for Compare's remove buttons.
- Everything else (focus states, keyboard navigation, no traps) follows the conventions already established throughout this session.

## Testing

Backend (MockMvc integration tests via `AbstractIntegrationTest`, matching every prior stage):
- Admin CRUD: create/update/delete/list/get-by-id, including that the recommended-products order round-trips correctly through save and reload, and that validation errors surface as expected.
- Public: list only returns active guides in newest-first order; detail 404s for inactive/missing guides exactly like `Product.getActiveById`; detail includes the correctly-ordered recommended products.

Frontend (Vitest + React Testing Library):
- `BuyingGuidesPage` (admin): list renders, delete flow works via `ConfirmDialog`.
- `BuyingGuideFormPage` (admin): create and edit both submit the expected payload; the product multi-select adds/removes/reorders correctly.
- `BuyingGuidesPage` (public): renders guide cards from fetched data; loading/empty/error states.
- `BuyingGuideDetailPage` (public): renders full content and the recommended-products grid; not-found state for a missing/inactive guide.
- `Navbar`/`MobileMenu`: the new "Buying Guides" link renders in the correct position.
