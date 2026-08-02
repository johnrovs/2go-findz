# Buying Guides — Unified Table of Contents (Backend Extension)

## Context

Stage 1 (`docs/superpowers/specs/2026-07-29-buying-guides-upgrade-backend-design.md`)
shipped `BuyingGuideSectionSetting` — a fixed 6-key enum
(`QUICK_RECOMMENDATIONS, COMPARISON_TABLE, TOP_PICK, RUNNER_UPS,
BUYING_ADVICE, FAQS`) that can only reorder/toggle those six category
*slots* as whole blocks — plus a separate `BuyingGuideAdviceSection` list
(freeform title+content) that always renders as one lump wherever the
`BUYING_ADVICE` slot sits.

While brainstorming the Stage 2 admin UI, reference mockups for the "Basic
Info" step's table-of-contents builder and the "Buying Guide" content step
showed the real requirement: an admin builds an arbitrary number of
freeform titled content blocks (e.g. "How We Tested", "Who Should Buy It",
"Final Recommendation") on the Buying Guide Content step, and the Basic
Info step's TOC builder reorders/renames/hides/deletes those blocks
**interleaved** with the five data-backed sections (Quick Recommendations,
Comparison Table, Top Pick, Runner-Ups, FAQs each still render as one row
regardless of how many items they contain) — e.g. FAQs can sit between two
custom blocks, not always after all of "Buying Advice". The existing model
cannot represent this: `BUYING_ADVICE` is one fixed-position slot, not N
independently-orderable entries.

This spec replaces `BuyingGuideSectionSetting` + `BuyingGuideAdviceSection`
with a single unified, ordered entity. Everything else from Stage 1
(`BuyingGuideQuickRecommendation`, `BuyingGuideComparisonSpec`/`Value`,
`BuyingGuideRecommendationSection`/`Item`, `BuyingGuideFaq`,
`recommendedProducts`, root-field scheduling/SEO/slug) is unchanged.

Nothing has been deployed yet (per Stage 1's Global Constraints — all
stages ship together), so this is a clean schema replacement, not a
data-preserving migration.

## Data Model

### `BuyingGuideTocEntry` (replaces `BuyingGuideSectionSetting` and `BuyingGuideAdviceSection`)

One row per table-of-contents entry, in a single admin-controlled order
per guide.

| Field | Type | Notes |
|---|---|---|
| id | bigint | PK |
| buyingGuideId | FK → buying_guides | cascade delete |
| sectionKey | varchar(30), nullable | one of `QUICK_RECOMMENDATIONS`, `COMPARISON_TABLE`, `TOP_PICK`, `RUNNER_UPS`, `FAQS` for a **structural** entry; `NULL` for a **custom** entry. This is the sole discriminator — no separate `entryType` column, matching the codebase's existing minimalism (e.g. no discriminator column exists on `BuyingGuideRecommendationItem` beyond its own `itemType`). |
| title | varchar(150), nullable | required for custom entries (`sectionKey IS NULL`); must be `NULL` for structural entries — their label is fixed/derived in the frontend, never stored |
| content | text, nullable | required for custom entries; sanitized HTML (same `HtmlSanitizer` as `introduction`/`whyRecommended`); must be `NULL` for structural entries |
| visible | boolean | default true |
| displayOrder | int | via `@OrderColumn`, single shared order across structural and custom entries |

`BuyingGuideSectionKey` enum drops its `BUYING_ADVICE` value (down to 5
members) — a custom `BuyingGuideTocEntry` is what `BUYING_ADVICE` used to
represent, just no longer singular.

Unique constraint: plain `UNIQUE (buying_guide_id, section_key)`. MySQL
treats every `NULL` in a unique index as distinct from every other value
(including other `NULL`s), so this constrains only non-null (structural)
keys to at most one row per guide — custom entries (`section_key = NULL`)
are entirely unaffected and can repeat freely. No partial/filtered index
syntax needed.

### Deletion

Same cascade convention as every other child table: `ON DELETE CASCADE`
from `buying_guides`. Deleting a custom entry from the admin TOC builder
is a real delete (title + content gone) — the frontend's "confirm before
deleting a section with saved content" dialog is the only guard, matching
how every other list in this feature already works (whole-collection
replace-on-save, nothing soft-deleted).

## API Changes

### Request DTO

`BuyingGuideRequest.sectionSettings` and `.adviceSections` are removed;
replaced by one field:

```java
record BuyingGuideRequest(
    /* ...title, slug, excerpt, introduction, coverImageFilename, categoryId,
       seoTitle, seoDescription, active, scheduledPublishAt,
       recommendedProductIds, quickRecommendations, comparisonSpecs,
       recommendationSections... unchanged from Stage 1... */
    @Valid List<FaqRequest> faqs,
    @NotNull @Valid List<TocEntryRequest> tocEntries
) {}

record TocEntryRequest(
    BuyingGuideSectionKey sectionKey,   // null = custom entry
    @Size(max = 150) String title,      // required iff sectionKey is null
    String content,                     // required iff sectionKey is null
    boolean visible
) {}
```

Cross-field validation (`sectionKey` null ⟺ `title`/`content` present) is
a service-layer check in `validateRequest()`, alongside the existing
top-pick-count and comparison-completeness checks — not expressible with
plain Bean Validation annotations on a single record.

### Admin Response DTO

`BuyingGuideResponse.sectionSettings` and `.adviceSections` are replaced
by `tocEntries: List<TocEntryResponse>` (`{ id, sectionKey, title,
content, visible }`), same order as saved.

### Public Response DTO

`PublicBuyingGuideDetailResponse.visibleSectionOrder` (`List<SectionKey>`)
and `.adviceSections` (`List<PublicAdviceSection>`) are replaced by one
ordered, visibility-filtered list that a template can walk top-to-bottom
without a second lookup:

```java
record PublicTocEntryResponse(
    BuyingGuideSectionKey sectionKey,  // null = custom
    String title,                       // present only for custom entries
    String content                      // present only for custom entries
) {}
```

`quickRecommendations`, `comparisonTable`, `topPick`, `runnerUps`, `faqs`
remain unchanged, separate top-level fields — each still carries its own
structured data (product refs, spec tables, pros/cons/best-for). The
`tocEntries` list only says *where in the reading order* each named
section or custom block falls; the frontend looks up the matching
top-level field by `sectionKey` to render a structural row's actual
content, or renders `title`/`content` inline for a custom row.

## Validation Summary (delta from Stage 1)

- All 5 structural `sectionKey` values must appear exactly once among
  `tocEntries` — none missing, none duplicated
- Every custom entry (`sectionKey == null`) requires non-blank `title`
  (max 150) and non-blank `content`
- A structural entry (`sectionKey != null`) must have `title == null &&
  content == null` — rejects payloads that try to rename/re-content a
  built-in section
- `content` sanitized server-side with the existing `HtmlSanitizer`
  allowlist, same as `introduction`/`whyRecommended`/advice content today
- Everything else from Stage 1's validation summary (`recommendedProductIds`
  dedup, comparison-value completeness, single Top Pick, `displayOrder`
  never trusted from the client) is unchanged

## Migration

New Flyway migration drops `buying_guide_section_settings` and
`buying_guide_advice_sections`, creates `buying_guide_toc_entries`. No
backfill/data-preservation logic needed — confirmed nothing is deployed.

## Testing

Rewrites (not additions) to existing Stage 1 tests that reference the
retired shapes:
- `BuyingGuideRepositoryTest` — cascade test's `sectionSettings`/
  `adviceSections` fixtures become `tocEntries`
- `BuyingGuideSectionRequestValidationTest` — retire
  `SectionSettingRequest`/`AdviceSectionRequest` validation cases, add
  `TocEntryRequest` cases (blank custom title/content, structural entry
  with non-null title rejected)
- `AdminBuyingGuideControllerTest` / `PublicBuyingGuideControllerTest` —
  every full-payload test's JSON body and JSON-path assertions move from
  `sectionSettings`/`adviceSections`/`visibleSectionOrder` to
  `tocEntries`; new cases: missing a structural key rejected, duplicate
  structural key rejected, custom entry interleaved between two
  structural entries round-trips its order correctly, deleting a custom
  entry on update removes it (and only it)
- `BuyingGuideMapper`'s `resolveVisibleSectionOrder` logic is replaced
  entirely by a straight `tocEntries.stream().filter(visible).toList()`
  walk — the old "missing key defaults to visible" fallback goes away
  because the request now requires all 5 structural keys on every save

## Out of Scope

- Stage 2 admin UI (tabbed editor, TOC builder component, rich-text
  editor integration) and Stage 3 public page rendering — separate,
  later work; this spec is backend-only
- SEO & Publish tab fields surfaced by the same round of mockups (Focus
  Keyword, SEO Keywords list, Canonical URL, Public/Unlisted/Private
  visibility, "last saved by" audit tracking) — unrelated to the TOC
  model, deferred to whenever that tab is actually built
- Products/Quick Picks/Comparison/Top Pick/Runner-Ups/FAQs tabs' backend
  — already fully implemented in Stage 1, untouched by this spec
