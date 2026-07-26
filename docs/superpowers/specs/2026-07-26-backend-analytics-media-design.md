# Stage 2: Backend Analytics/Media — Design

**Date:** 2026-07-26
**Scope:** Second backend implementation stage. Adds image upload (via a swappable `StorageService`), anonymous website-view and product-click tracking, dashboard analytics with estimated commission calculation, and system settings.

**Master spec:** `docs/PROJECT_SPEC.md`. **Prior stage:** `docs/superpowers/specs/2026-07-26-backend-foundation-design.md` / `docs/superpowers/plans/2026-07-26-backend-foundation.md` (merged to `master`). This stage builds directly on the `products`, `product_categories`, JWT auth, and `ApiResponse`/`GlobalExceptionHandler` infrastructure already shipped — none of Stage 1's endpoints or DTOs change.

## Out of scope for this stage

- Frontend (any stage)
- Testing/deployment-prep stages (later, per the CLAUDE.md-mandated workflow)
- Cloudinary/S3 storage implementations (the `StorageService` interface is designed for this, but only `LocalStorageService` ships now, per spec: "Never tightly couple image uploads to local storage")

## Database additions (Flyway, continuing from Stage 1's V1-V4)

**`V5__create_website_views_table.sql`**
- `id` PK, `anonymous_session_id` (nullable string), `viewed_at` (`DEFAULT CURRENT_TIMESTAMP`)
- Index on `viewed_at`

**`V6__create_product_clicks_table.sql`**
- `id` PK, `product_id` FK → `products.id`, `anonymous_session_id` (nullable), `clicked_at` (`DEFAULT CURRENT_TIMESTAMP`)
- Indexes on `product_id`, `clicked_at`

**`V7__create_system_settings_table.sql`**
- Single-row table (id always `1`), dedicated columns rather than a generic key-value shape: `logo_image_filename, hero_image_filename, placeholder_image_filename, tiktok_url, pinterest_url, instagram_url, youtube_url, shop_bio, hero_headline, hero_description, affiliate_disclosure, contact_email, created_at, updated_at`
- Seeded with one row of sensible defaults (spec's suggested headline/bio/disclosure text) so `GET` never 404s before an admin configures anything

## Image upload architecture

**Decoupled from record CRUD — no breaking changes to Stage 1.** Rather than making `ProductRequest`/`CategoryRequest` multipart, a single generic upload endpoint returns a filename that the frontend then includes in the existing JSON create/update payloads (`ProductRequest.imageFileName` already exists as a plain string from Stage 1).

- `StorageService` interface: `store(MultipartFile file): String` (returns the generated filename), `delete(String filename): void`. `LocalStorageService` is the only implementation this stage, writing into `UPLOAD_DIRECTORY` (already an env var from Stage 1).
- Filename generation: `img_yyyyMMdd_HHmmss_NNN.ext` — original client filename is never trusted or used for storage.
- Validation (in `LocalStorageService`, before writing): content-type allow-list (`image/jpeg`, `image/png`, `image/webp`), non-empty file, size ≤ 5MB (also capped at the Spring `multipart` config level as a first line of defense).
- `POST /api/admin/images` (`ROLE_ADMIN`, multipart) → `ApiResponse<UploadResponse>` where `UploadResponse` is just `{ filename }`.
- Static serving: `/uploads/**` mapped to `UPLOAD_DIRECTORY` via `WebMvcConfigurer.addResourceHandlers` — no controller code needed for reads, and this path is added to `SecurityConfig`'s public matchers.
- Placeholder fallback: `ProductMapper`/`CategoryMapper`'s public-facing response construction resolves `system_settings.placeholderImageFilename` when a record's own `imageFileName` is null (requires `ProductServiceImpl`/mapper to depend on `SystemSettingsService`).
- Old-file cleanup: when an admin uploads a *replacement* image for a product/category/setting that already has one, the previous file is deleted after the new one is successfully stored. Soft-deleting a product does **not** delete its image (the row still exists and may be reactivated).

## Tracking

- `POST /api/public/views` (permitAll) — generates a UUID server-side, inserts a `website_views` row, returns `{ sessionId }`. Frontend calls this once per browser session and caches the id (e.g. `sessionStorage`).
- `POST /api/public/products/{id}/click` (permitAll) — accepts an optional `sessionId` in the request body, inserts a `product_clicks` row tied to the given product. Called by the frontend just before redirecting to the Amazon affiliate link.

## Dashboard analytics (admin, `ROLE_ADMIN`)

All endpoints accept optional explicit `from`/`to` (`LocalDate`) query parameters — the frontend computes concrete dates for the named presets (Today, Last 7 Days, Last 30 Days, Current Month); the backend has one code path and no period-name parsing. Omitting both means all-time.

- `GET /api/admin/dashboard/summary` — total website views, total product clicks, estimated total commission, total products, total categories, trending count, best-seller count (all within the optional date filter, except product/category counts which are always current totals).
- `GET /api/admin/dashboard/analytics` — views-by-day, clicks-by-day, most-clicked products (top N), estimated commission by category, products-added-by-month.

**Commission calculation** (per spec, computed per product then aggregated by category):
```
Estimated Commission = Product Price × (Category Commission Rate / 100) × Tracked Clicks (in range)
```
Always labeled an estimate in the response DTO's field naming/documentation — never presented as confirmed income, per spec's explicit requirement. Implemented as a repository-level aggregation query (native SQL, given the join across `product_clicks` → `products` → `product_categories` with a `BigDecimal` multiply-and-sum) rather than pulling all click rows into memory.

## System settings

- `GET /api/public/settings` (permitAll) — returns the public-safe subset (everything in the table; there's no commission-rate-style sensitive field here, so admin and public shapes are identical for this resource, unlike categories).
- `GET /api/admin/settings`, `PUT /api/admin/settings` (`ROLE_ADMIN`) — full read/update of the single settings row. `PUT` is an upsert-style full replace (all fields required in the request, matching the form-based admin UI described in the spec).

## Testing

Same approach as Stage 1: Testcontainers MySQL, JUnit 5 + MockMvc, extending `AbstractIntegrationTest`. New shared test helper for multipart image upload (`uploadTestImage(String token): String filename`) added to `AbstractIntegrationTest` alongside the existing `adminToken()`/`createCategoryId()`, following the same duplication-avoidance lesson from Stage 1's pre-flight review.

Coverage: image upload (valid/invalid content-type/oversized/empty), static serving reachability, view tracking (session id issued, row recorded), click tracking (row recorded, tied to product), dashboard summary/analytics math (seed known clicks/prices/rates, assert the computed commission), settings CRUD (get/update, public vs admin reachability).

## Environment variables

No new variables — `UPLOAD_DIRECTORY` already exists from Stage 1's `.env.example`.
