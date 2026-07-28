# Comparisons — Stage 1: Data Model & Backend APIs

## Context

This is Stage 1 of a 4-stage feature: **Comparisons**, a new admin-curated
editorial content type ("Best Portable Blenders Compared", Wirecutter/RTINGS
style) distinct from the existing ad-hoc `/compare` tool.

The existing `/compare` page (`ComparePage.jsx`, `CompareContext.jsx`,
`compareProducts` on `PublicProductController`) lets a visitor pick any 2-4
products via a compare icon and see a simple side-by-side table. It is
ephemeral (localStorage-backed product IDs, no persistence) and stays
exactly as-is — untouched by this work.

**Comparisons** are a new, separate, persistent, admin-authored content type
with their own entities, publish workflow, and public URL
(`/comparisons/:slug`). They are structurally similar to Buying Guides but
richer: instead of one product list, each Comparison has per-product
editorial data (badges, strengths/weaknesses, pros/cons), a flexible
grouped spec table, reorderable prose sections, an FAQ, and related-content
links.

**The 4 stages:**
1. Data model + backend admin/public APIs (this spec)
2. Admin authoring UI
3. Public Comparison page (all sections, list page, routing)
4. SEO (meta tags, JSON-LD) + UX/performance polish

Dark mode is explicitly out of scope for all stages — the rest of the site
is light-only, and building it for one page would be inconsistent. It can
be revisited later as its own site-wide initiative if wanted.

## Data Model

### `Comparison` (root entity)

| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| title | varchar(200) | required |
| slug | varchar(220) | required, unique, kebab-case; auto-generated from title on create, admin-editable afterward |
| description | varchar(500) | required; short subtitle shown in hero and list cards |
| coverImageFilename | varchar | nullable; reuses existing image upload pipeline |
| categoryId | bigint FK → product_categories | required |
| seoTitle | varchar(200) | nullable; falls back to `title` when blank |
| seoDescription | varchar(300) | nullable; falls back to `description` when blank |
| published | boolean | default false |
| createdAt / updatedAt | timestamp | DB-managed |

### `ComparisonProduct` (ordered join to `Product`)

One row per product included in the comparison.

| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| comparisonId | FK → comparisons | cascade delete |
| productId | FK → products | |
| displayOrder | int | preserves admin-chosen order |
| badge | varchar(100) | nullable; e.g. "Best Overall", "Best Budget" |
| recommendation | varchar(500) | required; short blurb for the winner-summary card and product card |
| bestFor | varchar(200) | required |
| mainStrength | varchar(200) | required |
| mainWeakness | varchar(200) | required |
| pros | text | newline-delimited bullets, plain text (no rich-text editor, same as Buying Guides content) |
| cons | text | newline-delimited bullets |
| editorsScore | decimal(3,1) | nullable; 0.0–10.0 |

Validation: **pros and cons are both required together, or both blank** —
never one without the other. This directly enforces the "never show a
product with only Pros" rule from a single constraint rather than needing
separate business logic per field.

A comparison must have **at least 2 products** — fewer isn't a comparison.

### `ComparisonSpecRow` + `ComparisonSpecValue` (grouped spec table)

The doc requires grouped rows (e.g. "Performance" → Power, Battery Life...)
where the actual rows vary per product category (a blender needs
"Capacity"; skincare needs "Skin Type"). Rather than a fixed taxonomy per
category, rows are fully admin-defined per comparison — the same
flexible-content approach already validated for Buying Guides' plain-text
content.

**`ComparisonSpecRow`**

| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| comparisonId | FK → comparisons | cascade delete |
| groupLabel | varchar(100) | required; free text, e.g. "Performance" — consecutive rows sharing a group label render together |
| rowLabel | varchar(100) | required; e.g. "Battery Life" |
| displayOrder | int | |

**`ComparisonSpecValue`**

| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| specRowId | FK → comparison_spec_rows | cascade delete |
| productId | FK → products | must be one of the comparison's `ComparisonProduct` entries |
| value | varchar(200) | required |
| tier | enum(BEST, GOOD, STANDARD) | default STANDARD; drives the green/yellow/gray highlight — admin only needs to mark the standout cells |

Validation: every `ComparisonSpecRow` must have exactly one
`ComparisonSpecValue` per product currently in the comparison — no
orphaned values for a product that was since removed, no missing values
for a product that's present.

### `ComparisonSection` (flexible prose blocks)

Covers "Real World Performance", "Things To Know Before Buying", "Final
Recommendation", "Who Should Buy", "Who Should Skip", "Maintenance", and
any other editorial block — the source doc itself lists all of these as
examples of the same reorderable section content, so one flexible entity
covers them all.

| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| comparisonId | FK → comparisons | cascade delete |
| heading | varchar(150) | required; e.g. "Buying Tips" |
| body | text | required; plain text, no rich-text editor |
| displayOrder | int | |

### `ComparisonFaq`

| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| comparisonId | FK → comparisons | cascade delete |
| question | varchar(300) | required |
| answer | text | required |
| displayOrder | int | |

### Related Comparisons & Related Products

Both are admin-curated ordered multi-selects, using the same
`@ManyToMany` + `@OrderColumn` pattern as Buying Guides'
`recommendedProducts`:

- `relatedComparisons`: self-referential M:M (`Comparison` ↔ `Comparison`), max 8
- `relatedProducts`: M:M to `Product`, max 8

### Deletion

Hard delete on `Comparison`, with `ON DELETE CASCADE` on every child table
(`comparison_products`, `comparison_spec_rows`, `comparison_spec_values`,
`comparison_sections`, `comparison_faqs`, and the two related-content join
tables). Consistent with how `HeroBanner` and `BuyingGuide` are deleted —
no analytics or click-tracking references these entities directly, so
there's no reason to soft-delete.

## API Endpoints

### Admin (`/api/admin/comparisons`, JWT-protected)

```
GET    /api/admin/comparisons              list all (draft + published)
GET    /api/admin/comparisons/{id}         full detail incl. all nested children
POST   /api/admin/comparisons              create — full nested payload
PUT    /api/admin/comparisons/{id}         update — replaces nested child collections wholesale
DELETE /api/admin/comparisons/{id}         hard delete, cascades
```

One request DTO carries the full nested structure (products, spec rows,
sections, FAQs, related IDs) on every create/update; the service layer
replaces child collections wholesale rather than diffing. This matches the
Buying Guides precedent (`recommendedProductIds` sent whole on every save)
rather than the source doc's suggestion of granular per-child endpoints
(`POST .../products`, `POST .../faq`, etc.) — one controller and one
service keep the backend surface small, and there's no partial-save
consistency problem to solve since the admin form always has the full
comparison state in memory.

### Public (`/api/public/comparisons`)

```
GET /api/public/comparisons          published only, unpaginated, summary fields
GET /api/public/comparisons/{slug}   full detail; 404 for drafts or unknown slugs
```

Matches the existing `/api/public/buying-guides` convention rather than the
source doc's bare `/api/comparisons` suggestion, for consistency with the
rest of the codebase. The detail 404 is indistinguishable between "draft"
and "doesn't exist," same pattern as `BuyingGuide`/`Product`.

Unpaginated, matching the Buying Guides list precedent — reasonable until
comparison volume proves otherwise.

## Validation Summary

- `title`, `slug`, `description`, `categoryId` required on `Comparison`
- `slug` unique, kebab-case format, auto-generated from title on create, editable after
- At least 2 products per comparison
- `pros`/`cons` required together per `ComparisonProduct` (never one without the other)
- `relatedComparisons`/`relatedProducts` max 8 each
- Every `ComparisonSpecRow` has exactly one `ComparisonSpecValue` per current comparison product

## Testing

MockMvc integration tests per controller, following the exact
`AdminBuyingGuideControllerTest` / `PublicBuyingGuideControllerTest`
structure already established this session:

- Admin: create (with nested products/spec rows/sections/FAQ/related), create validation failures (missing title, <2 products, mismatched pros/cons, too many related items), update (verifying nested-state replacement — including reordering and removing a spec value's product), delete, 404 for unknown id, 401 without token
- Public: list returns only published comparisons, detail 404 for draft, detail 404 for unknown slug, detail returns full nested structure for a published comparison

## Out of Scope for Stage 1

- Admin authoring UI (Stage 2)
- Public Comparison page rendering, list page, routing, nav links (Stage 3)
- SEO meta tags, JSON-LD (FAQ/breadcrumb/comparison schema), canonical URLs, OG images (Stage 4)
- UX polish: sticky headers, keyboard accessibility beyond baseline, print-friendly, mobile section collapse (Stage 4)
- Performance: image lazy-loading, row memoization (Stage 4 — these are frontend rendering concerns)
- Dark mode (out of scope entirely, all stages)
