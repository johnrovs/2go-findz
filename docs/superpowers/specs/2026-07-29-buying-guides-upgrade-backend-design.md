# Buying Guides Upgrade — Stage 1: Data Model & Backend APIs

## Context

The existing `BuyingGuide` feature (`docs/superpowers/specs/2026-07-27-buying-guides-design.md`)
is thin: a single `content` TEXT blob rendered as `whitespace-pre-line`, plus
a plain ordered `Product` list. This upgrade brings it up to (and beyond) the
structural richness of the sibling `Comparison` feature — per-product Quick
Recommendation badges, a grouped comparison spec table, a Top Pick and
multiple Runner-Up sections (each with editorial pros/cons/best-for), ordered
Buying Advice sections, an FAQ builder, and an admin-configurable
table-of-contents — all normalized into relational tables rather than JSON
blobs, and all editable through a tabbed admin form (Stage 2) and rendered on
a redesigned public page (Stage 3).

**The 3 stages:**
1. Data model + backend admin/public APIs (this spec)
2. Admin authoring UI (tabbed form: Basic Info, Products, Quick Picks,
   Comparison, Top Pick, Runner-Ups, Buying Guide advice, FAQs, SEO & Publish)
3. Public Buying Guide page (all sections, TOC, accordion FAQ, affiliate
   links)

`Comparison`'s entities, migration conventions, DTO/validation patterns, and
`ApiResponse`/`GlobalExceptionHandler` wiring are the in-repo template this
stage reuses throughout, rather than inventing new conventions.

Deferred out of this feature entirely (confirmed with the user): an
automated SEO-score gauge/checklist, a three-tier Public/Unlisted/Private
visibility model (existing `active` boolean + `scheduledPublishAt` is kept
instead), and Product "In Stock"/"Prime" badges. Rich-text embeds
(video/iframe) are also deferred — sanitization allows links but not
arbitrary `<iframe>` content, to avoid an open XSS surface.

## Data Model

### `Product` (small additive change)

| Field | Type | Notes |
|---|---|---|
| rating | decimal(2,1) | nullable; admin-entered, same convention as `productPrice` (no live Amazon sync exists anywhere in this codebase) |
| reviewCount | int | not null, default 0 |

Needed because the comparison table's "reviews" column and the Quick
Recommendation/Product-picker cards have no data source today.

### `BuyingGuide` (altered)

| Field | Type | Notes |
|---|---|---|
| id | bigint | PK, unchanged |
| title | varchar(200) | unchanged |
| slug | varchar(220) | **new**; required, unique; backfilled from `title` for existing rows (kebab-case, collision-suffixed), admin-editable afterward — same pattern as `Comparison` |
| excerpt | varchar(500) | unchanged |
| introduction | text | **renamed from `content`**; sanitized HTML (was plain text); existing values carried over as-is |
| coverImageFilename | varchar | unchanged |
| categoryId | bigint FK → product_categories | **new**; nullable (existing rows have none until next edit; admin form requires it going forward) |
| seoTitle | varchar(70) | **new**; nullable |
| seoDescription | varchar(200) | **new**; nullable |
| active | boolean | unchanged — kept instead of introducing a parallel `status` enum |
| scheduledPublishAt | timestamp | **new**; mirrors the scheduling mechanism already shipped for `Product` (`09bb354`, `2a77b53`) |
| createdAt / updatedAt | timestamp | unchanged |

`recommendedProducts` (existing `@ManyToMany` + `@OrderColumn` join via
`buying_guide_products`) is kept as-is and now represents the guide-wide
product set referenced throughout every new section below.

### `BuyingGuideQuickRecommendation`

One row per Quick Recommendation card.

| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| buyingGuideId | FK → buying_guides | cascade delete |
| productId | FK → products | cascade delete; must be one of the guide's `recommendedProducts` |
| badgeName | varchar(60) | required; free text, not an enum (e.g. "Best Overall", "Best Battery Life") |
| displayOrder | int | |

Unique on `(buyingGuideId, productId)` — one Quick Recommendation entry per
product per guide.

### `BuyingGuideComparisonSpec` + `BuyingGuideComparisonValue`

| `BuyingGuideComparisonSpec` | Type | Notes |
|---|---|---|
| id | bigint | PK |
| buyingGuideId | FK → buying_guides | cascade delete |
| specificationName | varchar(100) | required, free text (e.g. "Battery Life", "Water Resistance") |
| displayOrder | int | |

Price and Customer Reviews are **not** rows in this table — the public and
admin comparison tables always render those two columns live from `Product`
(`productPrice`, `rating`/`reviewCount`), never as stored/editable values.
This was an explicit decision to prevent stale or fabricated figures.

| `BuyingGuideComparisonValue` | Type | Notes |
|---|---|---|
| id | bigint | PK |
| comparisonSpecId | FK → buying_guide_comparison_specs | cascade delete |
| productId | FK → products | cascade delete |
| specificationValue | varchar(500) | required |

Unique on `(comparisonSpecId, productId)`. Validation: every spec row must
have exactly one value for every product currently in the guide — no more,
no fewer.

### `BuyingGuideRecommendationSection` (Top Pick + Runner-Ups, shared table)

| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| buyingGuideId | FK → buying_guides | cascade delete |
| productId | FK → products | cascade delete; must be one of the guide's products |
| recommendationType | enum(TOP_PICK, RUNNER_UP) | required |
| sectionLabel | varchar(100) | required; free text (e.g. "Our Top Pick", "Best Battery Life") |
| whyRecommended | text | required; sanitized HTML |
| displayOrder | int | |
| topPickGuard | int, generated always as `CASE WHEN recommendationType = 'TOP_PICK' THEN 1 ELSE NULL END`, stored | DB-level safety net |

Unique on `(buyingGuideId, topPickGuard)` — MySQL unique indexes ignore
`NULL`, so this enforces "at most one Top Pick per guide" at the database
level in addition to service-layer validation, without blocking multiple
`RUNNER_UP` rows (which generate `NULL` and are exempt from the constraint).

### `BuyingGuideRecommendationItem` (Pros / Cons / Best For, shared table)

| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| recommendationSectionId | FK → buying_guide_recommendation_sections | cascade delete |
| itemType | enum(PRO, CON, BEST_FOR) | required |
| content | varchar(300) | required |
| displayOrder | int | |

One shared entity/table for Top Pick and every Runner-Up's Pros, Cons, and
Best For lists — avoids duplicating this structure per recommendation type.

### `BuyingGuideAdviceSection`

| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| buyingGuideId | FK → buying_guides | cascade delete |
| title | varchar(150) | required, free text (e.g. "What to Look For", "How We Tested") |
| content | text | required; sanitized HTML |
| displayOrder | int | |

### `BuyingGuideFaq`

| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| buyingGuideId | FK → buying_guides | cascade delete |
| question | varchar(300) | required |
| answer | text | required; sanitized HTML |
| displayOrder | int | |

### `BuyingGuideSectionSetting` (table of contents)

| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| buyingGuideId | FK → buying_guides | cascade delete |
| sectionKey | varchar(30) | required; one of `QUICK_RECOMMENDATIONS`, `COMPARISON_TABLE`, `TOP_PICK`, `RUNNER_UPS`, `BUYING_ADVICE`, `FAQS` |
| visible | boolean | default true |
| displayOrder | int | |

Unique on `(buyingGuideId, sectionKey)`. Toggles/reorders only the real
built-in section types — no free-text TOC entries, nothing to fall out of
sync with actual content. Any `sectionKey` missing a row for a given guide
falls back to `visible = true` with default ordering. A section is only
ever rendered on the public page if it is both visible **and** has valid
saved content (an empty Comparison table or FAQ list never renders,
regardless of this setting).

### Deletion

Hard delete on `BuyingGuide`, `ON DELETE CASCADE` on every child table
listed above. `product_id` foreign keys also cascade — consistent with the
existing `buying_guide_products` table — but deleting a `BuyingGuide` never
touches `products` themselves.

## API Endpoints

### Admin (`/api/admin/buying-guides`, JWT-protected, unchanged base path)

```
GET    /api/admin/buying-guides
GET    /api/admin/buying-guides/{id}
POST   /api/admin/buying-guides
PUT    /api/admin/buying-guides/{id}
DELETE /api/admin/buying-guides/{id}
```

One request DTO carries the full nested structure on every create/update;
the service replaces child collections wholesale (delete-then-recreate via
`orphanRemoval=true`), matching the `Comparison` precedent — no partial-save
consistency problem to solve since the admin form always holds full guide
state in memory.

### Public (`/api/public/buying-guides`)

```
GET /api/public/buying-guides         published only, unpaginated, summary fields
GET /api/public/buying-guides/{slug}  full detail; 404 for drafts/scheduled/unknown slugs
```

Switches from numeric `id` to `slug` lookup for SEO-friendly URLs, matching
`Comparison`. The detail 404 is indistinguishable between "not yet
published" and "doesn't exist" — same rule already established for both
`BuyingGuide` and `Comparison`.

### Request DTOs

```java
record BuyingGuideRequest(
    @NotBlank @Size(max=200) String title,
    @NotBlank @Size(max=220) String slug,
    @NotBlank @Size(max=500) String excerpt,
    @NotBlank String introduction,
    String coverImageFilename,
    Long categoryId,
    @Size(max=70) String seoTitle,
    @Size(max=200) String seoDescription,
    boolean active,
    LocalDateTime scheduledPublishAt,
    @NotEmpty @Size(max=20) List<Long> productIds,
    @Valid List<QuickRecommendationRequest> quickRecommendations,
    @Valid List<ComparisonSpecRequest> comparisonSpecs,
    @Valid List<RecommendationSectionRequest> recommendationSections,
    @Valid List<AdviceSectionRequest> adviceSections,
    @Valid List<FaqRequest> faqs,
    @Valid List<SectionSettingRequest> sectionSettings
) {}

record QuickRecommendationRequest(Long productId, @NotBlank @Size(max=60) String badgeName, int displayOrder) {}

record ComparisonSpecRequest(
    @NotBlank @Size(max=100) String specificationName, int displayOrder,
    @Valid @NotEmpty List<ComparisonValueRequest> values) {}
record ComparisonValueRequest(Long productId, @NotBlank @Size(max=500) String value) {}

record RecommendationSectionRequest(
    Long productId, @NotNull RecommendationType recommendationType,
    @NotBlank @Size(max=100) String sectionLabel,
    @NotBlank String whyRecommended, int displayOrder,
    @Valid @NotEmpty List<RecommendationItemRequest> pros,
    @Valid @NotEmpty List<RecommendationItemRequest> cons,
    @Valid @NotEmpty List<RecommendationItemRequest> bestFor) {}
record RecommendationItemRequest(@NotBlank @Size(max=300) String content, int displayOrder) {}

record AdviceSectionRequest(@NotBlank @Size(max=150) String title, @NotBlank String content, int displayOrder) {}
record FaqRequest(@NotBlank @Size(max=300) String question, @NotBlank String answer, int displayOrder) {}
record SectionSettingRequest(@NotNull SectionKey sectionKey, boolean visible, int displayOrder) {}
```

### Admin Response DTO

`BuyingGuideResponse` (returned by all five admin endpoints) mirrors
`BuyingGuideRequest`'s nested structure field-for-field, plus `id`,
`createdAt`, `updatedAt`, and a resolved `ProductResponse` (not just
`productId`) everywhere a child section references a product — so the
admin form's edit view never needs a second round-trip to resolve product
details for what's already selected.

### Public Response DTO

```java
record PublicBuyingGuideDetailResponse(
    String title, String excerpt, String introduction, String coverImageUrl,
    LocalDateTime publishedAt,
    List<PublicProductSummary> products,
    List<PublicQuickRecommendation> quickRecommendations,
    PublicComparisonTable comparisonTable,
    PublicRecommendationSection topPick,
    List<PublicRecommendationSection> runnerUps,
    List<PublicAdviceSection> adviceSections,
    List<PublicFaq> faqs,
    List<SectionKey> visibleSectionOrder
) {}
```

Delivered as one response — no per-section requests. `PublicProductSummary`
resolves `name`, `imageUrl`, `productPrice`, `rating`, `reviewCount`,
`productLink` from `Product` at read time (never denormalized/copied onto
guide rows). Each `PublicRecommendationSection` includes an optional
`badgeName`, resolved server-side by cross-referencing that product's Quick
Recommendation entry in the same guide (no new column — matches the mockup
showing a Top Pick inheriting its Quick Pick badge).

## Validation Summary

- No duplicate `productId`s within `productIds`
- Every `productId` referenced by any child section must be a member of
  `productIds`
- Every `ComparisonSpec`'s values cover exactly the guide's current product
  set — no missing, no orphaned
- At most one `TOP_PICK` recommendation section (service + DB generated
  column)
- Removing a product from `productIds` while it's still referenced by a
  Quick Recommendation, comparison value, or recommendation section is
  rejected with a message naming the conflicting section — never silently
  cascades
- `displayOrder` is never trusted from the client — the service renumbers
  every list to sequential `0..N-1` on save
- `introduction`, `whyRecommended`, advice `content`, and FAQ `answer` are
  sanitized server-side (new `jsoup` dependency) with an allowlist of
  `p, b, i, u, ul, ol, li, a[href], img[src|alt]` — no `<iframe>`/embed
  support
- Empty badge names, FAQ questions/answers, spec names, section titles all
  rejected via `@NotBlank`

## Testing

MockMvc integration tests per controller, following the existing
`AdminBuyingGuideControllerTest` / `PublicBuyingGuideControllerTest`
structure:

- Admin: create with full nested payload, validation failures (duplicate
  product ref, invalid product ref, missing comparison value, second Top
  Pick, empty badge name, empty FAQ question/answer), update (verifying
  nested-state replacement including reordering), product-removal conflict
  rejection, delete (verifying cascade removes children but never touches
  `products`), 404 for unknown id, 401 without token
- Public: list returns only published/due guides, detail 404 for
  draft/scheduled/unknown slug, detail returns full nested structure with
  resolved product summaries and inherited Top Pick badge
- Backfill the missing `BuyingGuideRepositoryTest` (a gap noted during
  investigation — `Comparison` has one, `BuyingGuide` doesn't)

## Out of Scope for Stage 1

- Admin authoring UI (Stage 2)
- Public Buying Guide page rendering, TOC rendering, accordion FAQ,
  affiliate link attributes (Stage 3)
- Rich-text editor integration on the frontend (Stage 2) — this stage only
  covers server-side sanitization of whatever HTML arrives
- SEO-score gauge/checklist, Public/Unlisted/Private visibility tiers,
  Product "In Stock"/"Prime" badges, embed/iframe content — all explicitly
  deferred
