# Hero Banners — Design

**Date:** 2026-07-27
**Scope:** First of four new stages derived from a user-supplied requirements document (Hero Banners → Navbar/Routes redesign → Compare → Buying Guides). A full-stack feature: a new `hero_banners` backend entity with admin CRUD, and a public `HeroCarousel` component that displays them — falling back to the existing, unmodified `HeroSection` when no banners are configured.

**Master spec:** no corresponding section in `docs/PROJECT_SPEC.md` — this is new scope beyond the original spec, requested directly by the user. Mirrors `docs/PROJECT_SPEC.md`'s general patterns (layered backend architecture, `ApiResponse` envelope, soft-vs-hard delete conventions) throughout.

## Out of scope for this stage

- The navbar redesign, new routes (`/trending`, `/categories`, `/best-sellers`), and search modal (next stage)
- Compare and Buying Guides (later stages)
- Drag-and-drop slide reordering — `displayOrder` is a plain admin-edited integer field
- A new admin sidebar item — banner management lives inside the existing System Settings page

## Backend

Conventions verified directly against the existing `ProductCategory` vertical (entity, migration, mapper, repository, service, controller, tests) so this feature fits the codebase exactly, not a generic Spring Boot pattern.

**Migration** — `backend/src/main/resources/db/migration/V8__create_hero_banners_table.sql` (current latest is `V7__create_system_settings_table.sql`):
```sql
CREATE TABLE hero_banners (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    image_filename VARCHAR(255) NOT NULL,
    image_alt VARCHAR(255) NOT NULL,
    badge VARCHAR(100) NULL,
    headline VARCHAR(200) NOT NULL,
    description TEXT NULL,
    button_text VARCHAR(100) NOT NULL,
    button_link VARCHAR(255) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hero_banners_active_order (active, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
`image_filename` is `NOT NULL` — every persisted banner always has a real image, so the frontend never has to handle an image-less carousel slide. The "no image configured" case is handled entirely by falling back to `HeroSection` when the banner list is empty (see "Public frontend" below), not by making the image optional here.

**Entity** — `backend/src/main/java/com/twogofindz/backend/entity/HeroBanner.java`: Lombok `@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder`, fields matching the migration 1:1. Timestamps follow the existing DB-managed pattern (`@Generated(event = {EventType.INSERT, EventType.UPDATE})` + `insertable=false, updatable=false`) — never `@CreationTimestamp`, which this codebase doesn't use anywhere.

**DTOs:**
- `HeroBannerRequest` (record): `imageFilename` (`@NotBlank`), `imageAlt` (`@NotBlank` — descriptive alt text is a hard requirement from the source doc's accessibility section, not optional), `badge` (nullable, no annotation), `headline` (`@NotBlank`, max 200), `description` (nullable), `buttonText` (`@NotBlank`, max 100), `buttonLink` (`@NotBlank`, `@Pattern(regexp = "^/.*", message = "Button link must be an internal path starting with /.")` — internal route, not an external URL, so no HTTPS check like `ProductRequest.productLink`), `displayOrder` (`@NotNull Integer`), `active` (`@NotNull Boolean`).
- `HeroBannerResponse` (admin, full record): `id, imageFilename, imageAlt, badge, headline, description, buttonText, buttonLink, displayOrder, active, createdAt, updatedAt`.
- `PublicHeroBannerResponse`: `id, imageFilename, imageAlt, badge, headline, description, buttonText, buttonLink` — no `active` (implied true, it's the only kind returned), no `displayOrder` (already applied server-side), no timestamps. Mirrors how `PublicCategoryResponse` omits `commissionRate`.

**Mapper** — `backend/src/main/java/com/twogofindz/backend/mapper/HeroBannerMapper.java`: manual `@Component`, `toResponse(...)` / `toPublicResponse(...)`, matching `CategoryMapper`'s style (no MapStruct anywhere in this codebase).

**Repository** — `backend/src/main/java/com/twogofindz/backend/repository/HeroBannerRepository.java`: `List<HeroBanner> findAllByOrderByDisplayOrderAsc()` (admin listing — includes inactive), `List<HeroBanner> findByActiveTrueOrderByDisplayOrderAsc()` (public listing). Plain derived query methods, not JPA Specifications — this entity has no combinable filters, so Specifications (used for `Product`'s multi-filter search) would be overkill here; simple derived methods match `Category`'s style.

**Service** — `HeroBannerService` interface + `HeroBannerServiceImpl`: `create(HeroBannerRequest)`, `update(Long id, HeroBannerRequest)`, `getAllForAdmin(): List<HeroBannerResponse>`, `getAllForPublic(): List<PublicHeroBannerResponse>`, `delete(Long id)`. Not-found reuses the existing generic `ResourceNotFoundException` via a private `findEntityById(Long id)` helper — no new exception type, since hero banners have no downstream foreign-key references (unlike `Category`'s `CategoryInUseException`, there's nothing that can be "in use").

**Controllers:**
- `AdminHeroBannerController` (`backend/src/main/java/com/twogofindz/backend/controller/admin/`), `@RequestMapping("/api/admin/hero-banners")`, JWT-protected: `GET /` (all, admin ordering), `POST /`, `PUT /{id}`, `DELETE /{id}`. No `GET /{id}` — the admin frontend's edit flow reuses the row object already in memory from the list, matching how `CategoriesPage` actually consumes the category admin API (never calls a single-item GET).
- `PublicHeroBannerController` (`backend/src/main/java/com/twogofindz/backend/controller/publicapi/`), `@RequestMapping("/api/public/hero-banners")`: `GET /` → active-only, ordered.

**Delete is a real hard delete** (not soft-delete like `Product`) — hero banners aren't referenced by anything else and don't need historical preservation for analytics, unlike products.

**Tests** (MockMvc integration tests via the existing `AbstractIntegrationTest` base class, matching `AdminCategoryControllerTest`'s pattern — no bare Mockito-only unit tests, this codebase verifies behavior end-to-end through controllers):
- `AdminHeroBannerControllerTest`: create/update/delete success, validation failures (blank headline, `buttonLink` not starting with `/`).
- `PublicHeroBannerControllerTest`: only active banners returned, ordered by `displayOrder`, inactive banners never appear (leakage guard, mirroring `PublicCategoryControllerTest`'s commission-rate-leakage check).

## Admin UI

No new sidebar item. A new "Hero Banner Slides" section is added to the existing `SettingsPage` (`frontend/src/pages/admin/SettingsPage.jsx`), placed directly after the existing "Branding & Hero Images" section, with a one-line explanatory note under the existing single Hero Image uploader: *"This image is used only when no hero banner slides are configured below."*

The section reuses `DataTable`, `Modal`, `ConfirmDialog`, `ImageUploader` — all already built (Category/Product Management stages), no new reusable primitives needed:
- `DataTable` columns: thumbnail, Headline, Badge, Order (`displayOrder`), Status (Active/Inactive badge, same styling convention as `ProductsPage`), Actions.
- "Add Slide" opens `Modal` + new `HeroBannerForm` component: `ImageUploader`, image alt text (text, required — descriptive text for screen readers, e.g. "Curated collection of trending gadgets and home products"), badge (text, optional), headline (text, required), description (textarea, optional), button text (text, required), button link (text, required, helper text "e.g. /trending — an internal page path"), display order (number, required), active (checkbox).
- Delete uses `ConfirmDialog` with real destructive framing (`isDestructive`, confirm label "Delete") — unlike the soft-delete "Deactivate" copy used for products, this is a genuine, irreversible hard delete.

New admin service: `frontend/src/services/adminHeroBannerService.js` — `getHeroBanners()`, `createHeroBanner(payload)`, `updateHeroBanner(id, payload)`, `deleteHeroBanner(id)`.

## Public frontend

New service: `frontend/src/services/heroBannerService.js` — `getHeroBanners(): Promise<PublicHeroBanner[]>`, hitting `GET /public/hero-banners`. (Named the same as the admin one but in the public-vs-admin split already established by `settingsService.js`/`adminSettingsService.js` and `categoryService.js`/`adminCategoryService.js`.)

**`HeroSlide`** (new, presentational, `frontend/src/components/HeroSlide.jsx`): props `{ imageUrl, imageAlt, badge, headline, description, buttonText, buttonTo, onButtonClick, isPriority }` — exactly one of `buttonTo` (renders a real `<Link to={buttonTo}>`) or `onButtonClick` (renders a `<button>`) is provided per slide. Full-width banner: locked aspect-ratio image (`object-cover`) with the admin-supplied `imageAlt` as its real `alt` text (not decorative — this is a content image, per the source doc's explicit accessibility requirement), gradient overlay for text legibility over any image, badge pill (`amber-100`/`amber-800`, matching existing badge conventions), headline at the existing hero typography scale (`text-4xl sm:text-5xl lg:text-6xl font-extrabold`), description, CTA button. `isPriority` controls `loading="eager"` vs `loading="lazy"` — only the first visible slide is eager.

**`HeroCarousel`** (new, `frontend/src/components/HeroCarousel.jsx`): props `{ banners, heroSectionProps }`.
- **If `banners.length === 0`:** renders `<HeroSection {...heroSectionProps} />` completely unchanged — the existing, already-tested two-CTA text hero. Zero new risk to current behavior; this is the literal definition of "default when no banner is configured."
- **If `banners.length === 1`:** renders a single `HeroSlide` with no carousel chrome at all (no arrows/indicators/autoplay) — avoids pointless UI for content that never changes.
- **If `banners.length > 1`:** full carousel — autoplay every 5000ms (`setInterval` in a `useEffect`, cleared on unmount and paused on `onMouseEnter`/resumed on `onMouseLeave`), previous/next buttons (`aria-label="Previous slide"`/`"Next slide"`), clickable dot indicators (`aria-label="Go to slide N"`, `aria-current="true"` on the active one), basic touch swipe (`touchstart`/`touchend` X-delta threshold), Framer Motion `AnimatePresence` fade transition. Respects `prefers-reduced-motion` via `window.matchMedia('(prefers-reduced-motion: reduce)')`: when set, autoplay is disabled and transitions are instant cuts instead of animated. Keyboard access comes for free from the prev/next buttons being real, natively focusable `<button>` elements — no custom keydown handler needed.

**`HomePage.jsx`** fetches hero banners alongside its existing settings/categories fetch (same `useEffect`-per-independent-resource pattern already there) and replaces its current direct `<HeroSection ... />` usage with `<HeroCarousel banners={heroBanners} heroSectionProps={{ headline: ..., description: ..., onExploreClick: scrollToCatalog, onTrendingClick: ... }} />`.

## Testing

Frontend, Vitest + React Testing Library:
- `adminHeroBannerService` / `heroBannerService`: request/response shape, mirroring existing service test patterns.
- `HeroSlide`: renders with an image, renders the button as a `Link` when `buttonTo` given vs a `button` when `onButtonClick` given, `isPriority` controls `loading` attribute.
- `HeroCarousel`: renders unmodified `HeroSection` when `banners` is empty, renders a single chrome-less slide for one banner, renders full carousel chrome for 2+ banners, autoplay advances slides, hover pauses autoplay, prev/next/indicator clicks navigate, respects a mocked `prefers-reduced-motion` media query.
- `SettingsPage`: the new Hero Banner Slides section renders fetched banners in the table, create/edit/delete flow (mirroring `CategoriesPage.test.jsx`'s CRUD test shape), delete confirmation uses destructive styling and copy (contrast with the non-destructive product "Deactivate" copy).

Backend, JUnit + MockMvc (see "Tests" under Backend above for exact coverage).
