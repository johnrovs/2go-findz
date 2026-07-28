# Comparisons — Stage 3: Public Comparison Page Rendering

## Context

This is Stage 3 of the 4-stage Comparisons feature. Stage 1 (data model +
backend admin/public APIs) and Stage 2 (admin authoring UI) are both
complete and merged to master. Stage 1's design doc
(`docs/superpowers/specs/2026-07-27-comparisons-backend-design.md`) and
plan (`docs/superpowers/plans/2026-07-27-comparisons-backend.md`) describe
the full data model and public API shape (`getAllForPublic`,
`getBySlugForPublic`) this stage renders against.

Stage 3 builds the public-facing frontend: a list page (`/comparisons`)
and a slug-based detail page (`/comparisons/:slug`) rendering the full
nested content model — products with editorial data, the flexible grouped
spec table, reorderable sections, FAQ, and related content.

**The 4 stages:** 1. Backend (done) → 2. Admin authoring UI (done) →
3. Public page rendering (this spec) → 4. SEO + UX/performance polish.

This is a wholly new, separate content type — the existing ad-hoc
`/compare` page (pick-any-2-4-products, ephemeral, no persistence) remains
untouched, per the decision made at the start of this feature.

## Pages & Routing

- `frontend/src/services/comparisonService.js` — `getComparisons()`,
  `getComparisonBySlug(slug)`, thin wrappers over
  `/public/comparisons[...]`. Mirrors `buyingGuideService.js` exactly.
- `frontend/src/pages/ComparisonsPage.jsx` — public list page. Distinct
  file from the admin `pages/admin/ComparisonsPage.jsx` (different
  directory, no collision), same alias-on-import pattern already used for
  Buying Guides and Categories in `App.jsx`.
- `frontend/src/pages/ComparisonDetailPage.jsx` — public detail page,
  reads `:slug` via `useParams()` (not `:id` — matches Stage 1's
  slug-based public API, unlike Buying Guides which is id-based).
- Both reuse `Navbar`/`Footer`/`SectionHeading`/`LoadingSpinner`/
  `ErrorState`/`EmptyState` unmodified.
- Routes added to `App.jsx`: `/comparisons`, `/comparisons/:slug`.
- `Navbar.jsx` gets a new "Comparisons" `NavLink`; `MobileMenu.jsx` gets a
  matching `NAV_ITEMS` entry — both positioned near "Buying Guides".

## List Page

Same card-grid treatment as `BuyingGuidesPage`: cover image, title,
description, linking to the detail page by slug
(`/comparisons/${comparison.slug}`). Unpaginated, matching the
established precedent — curated editorial content, not high-cardinality.

## Detail Page Sections

The source requirements doc lists 12 named sections (Comparison Hero,
Quick Winner Summary, Comparison Table, Best For Badges, Individual
Product Cards, Real World Performance, Pros & Cons, Things To Know Before
Buying, Final Recommendation, FAQ, Related Comparisons, Related Products,
Amazon CTA). Several of these collapse onto the same underlying data type
built in Stage 1, so the detail page renders as **7 actual regions**:

1. **Hero** — title, description, cover image, category name, "Last
   Updated" (from `updatedAt`). The affiliate disclosure is not
   duplicated here — it already appears once in `Footer`.

2. **Comparison Table** — the grouped spec rows
   (`ComparisonSpecRow`/`ComparisonSpecValue`), rendered with group
   headers (consecutive rows sharing a `groupLabel` render together) and
   per-cell tier highlighting: `BEST` = green, `GOOD` = yellow,
   `STANDARD` = default/gray. This is exactly what Stage 1's `SpecTier`
   enum was built for. Omitted entirely if `specRows` is empty.

3. **Product Cards** — one per `ComparisonProduct`, in the admin's
   `displayOrder`. Each card shows: badge (prominent, top of card, if
   present), product image, product name, recommendation, bestFor,
   mainStrength, mainWeakness, pros/cons (as bullet lists), editor's
   score (as "X.X / 10" if present), and a "View on Amazon" CTA
   (`target="_blank"`, `rel="nofollow sponsored noopener noreferrer"`,
   identical copy/attributes to every other Amazon CTA on the site). This
   single region covers "Quick Winner Summary," "Best For Badges,"
   "Individual Product Cards," "Pros & Cons," and "Amazon CTA" from the
   source doc — a separate compact "winner summary" row was considered
   and rejected as redundant with the full cards directly below it.

4. **Sections** — `ComparisonSection` entries rendered in the admin's
   order, each as a heading+body card. This single flexible region
   covers "Real World Performance," "Things To Know Before Buying," and
   "Final Recommendation" from the source doc, exactly as Stage 1
   designed `ComparisonSection` to do. Omitted if `sections` is empty.

5. **FAQ** — `ComparisonFaq` entries as a question/answer list. Omitted
   if `faqs` is empty.

6. **Related Comparisons** — cards linking to other comparisons by slug.
   Stage 1's public API already filters `relatedComparisons` to
   published-only server-side, so every link here is guaranteed live.
   Omitted if empty.

7. **Related Products** — reuses the existing `ProductGrid`/`ProductCard`
   components exactly as `BuyingGuideDetailPage` already does. Omitted if
   empty.

Any region backed by an empty list is omitted entirely — no empty
headings or placeholder text.

## Validation & Error Handling

`ComparisonDetailPage` follows the same 404 pattern as
`BuyingGuideDetailPage`: a failed fetch (draft comparison or unknown
slug — indistinguishable per Stage 1's backend design) shows `ErrorState`
with the backend's error message. `ComparisonsPage` reuses
`LoadingSpinner`/`ErrorState`/`EmptyState` exactly as `BuyingGuidesPage`
does.

## Testing

Vitest + React Testing Library, following established conventions:

- `ComparisonsPage.test.jsx` — renders fetched cards, empty state, error
  state; wrapped in `CompareProvider` (required since it renders
  `Navbar`, matching `BuyingGuidesPage.test.jsx`'s precedent)
- `ComparisonDetailPage.test.jsx` — renders all seven regions when
  populated, omits each region when its backing data is empty (one test
  per region is excessive; a couple of representative omission cases
  plus one full-population case is sufficient), spec table tier
  rendering, 404 handling for drafts/unknown slugs; wrapped in
  `CompareProvider`
- `Navbar.test.jsx` / `MobileMenu.test.jsx` — new assertions for the
  "Comparisons" link, following the exact pattern used when Buying
  Guides' nav links were added

## Out of Scope for Stage 3

- SEO meta tags, JSON-LD (FAQ/breadcrumb/comparison schema), canonical
  URLs, OG images (Stage 4)
- UX polish: sticky/pinned section navigation, print-friendly styling,
  mobile section collapse (Stage 4)
- Performance: image lazy-loading, spec-table row memoization (Stage 4)
- Dark mode (out of scope entirely, all stages)
