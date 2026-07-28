# Design System Stage 3: Public Pages

## Context

This is Stage 3 of the 6-stage UI/UX redesign of "2Go Findz". Stages 1
(Design Foundations) and 2 (Core UI Kit) are complete: fonts, color/
typography/radius/shadow tokens, and the `Button`/`Badge` components exist
and are already applied to `ProductCard`, `SectionHeading`, `HeroSection`,
`Navbar`, `Footer`, and the loading/empty/error states.

This stage retokenizes the remaining public-facing pages and the
components they use that Stage 2 didn't touch: Homepage section rhythm,
the shared catalog/filter components (reused by Trending/Best Sellers/
Categories), the Comparisons and Buying Guides list pages, and Buying
Guide detail-page typography.

Because `ProductCard`, `SectionHeading`, `HeroSection`, and the loading/
empty/error states are already retokenized, every page that composes them
(which is most of this stage's scope) inherits those changes automatically
— this stage's real work is the page-level layout wrappers and the
handful of components Stage 2 didn't reach.

None of the test files for any component or page touched in this stage
contain class-name assertions (confirmed by inspection) — every test is
behavior/text/role-based, so no test files need changes in this stage.

## 1. Shared Filter/Browse Components

These four components are used by `HomePage` directly and by `CatalogPage`
(which powers Trending, Best Sellers, and Categories).

### `CategoryCard.jsx`

- `rounded-xl ... shadow-sm ... hover:shadow-md focus:ring-indigo-500` →
  `rounded-card ... shadow-card ... hover:shadow-card-hover focus:ring-primary`.
- Label span: `text-base font-semibold text-slate-900` → `text-card-title text-heading`.

### `SearchInput.jsx`

- Icon color: `text-slate-400` → `text-muted`.
- Input: `rounded-lg border-slate-300 focus:border-indigo-500 focus:ring-indigo-500` →
  `rounded-search border-border focus:border-primary focus:ring-primary` (this is the
  spec's dedicated search-bar radius token, distinct from `rounded-btn`/`rounded-card`).

### `ProductFilters.jsx`

- Quick-filter pills: active state `bg-indigo-600 text-white` → `bg-primary text-white`;
  inactive `bg-slate-100 text-slate-700 hover:bg-slate-200` stays as-is (neutral slate,
  no token for a "chip" background exists in the spec and inventing one would be
  speculative — slate is already a neutral gray consistent with the design).

### `FilterDropdown.jsx`

- Label: `text-slate-700` → `text-body`.
- Select: `border-slate-300 focus:border-indigo-500 focus:ring-indigo-500` →
  `border-border focus:border-primary focus:ring-primary`.

### `Pagination.jsx`

- Active page number: `bg-indigo-600 text-white` → `bg-primary text-white`.
- Inactive page numbers and prev/next arrows keep their neutral slate treatment
  (same reasoning as the filter pills — no spec'd token for this).

## 2. CatalogPage (Trending, Best Sellers, Categories)

`frontend/src/components/CatalogPage.jsx` is the shared component behind
all three of these pages (`TrendingPage`/`BestSellersPage`/`CategoriesPage`
each just call it with different props).

- Section background: `bg-slate-50` → `bg-surface-secondary`.
- Section vertical padding: `py-16 sm:py-20` → `py-24`, applying the spec's
  96px vertical section-spacing rule uniformly (Tailwind's default `24`
  spacing step is exactly 6rem/96px, so no new token is needed — this was
  already noted as a convention in Stage 1, now actually applied).

`CategoriesPage.jsx` renders its own extra "Shop by Category" section
(passed as `children` into `CatalogPage`) with the identical
`py-16 sm:py-20` pattern — same change applies there.

## 3. HomePage

`frontend/src/pages/HomePage.jsx` — every section's vertical padding
(`py-16 sm:py-20`, and the "Follow Us" section's `py-10`) becomes `py-24`
for consistency with the same 96px rhythm. Section backgrounds using
`bg-slate-50` become `bg-surface-secondary`; the final CTA section's
`bg-indigo-50` also becomes `bg-surface-secondary` (matching the same
change already made to `HeroSection` in Stage 2, for visual consistency
between the two indigo-tinted sections that used to bookend the page).

The "Why Shop with 2Go Findz" items are hand-rolled (not using
`SectionHeading`, since they're per-item mini-headings inside a grid, not
a page section title) — retype them: `text-base font-semibold
text-slate-900` → `text-card-title text-heading`; `text-sm text-slate-600`
→ `text-small text-body`.

The social-links section (`py-10`, unique among the page's sections) also
becomes `py-24` for rhythm consistency — it's still just a thin band of
icons, but consistent spacing matters more than this one section's
individual density.

## 4. Comparisons and Buying Guides List Pages

`frontend/src/pages/ComparisonsPage.jsx` and `frontend/src/pages/BuyingGuidesPage.jsx`
each hand-roll a card (cover image + title + description) that predates
Stage 2's `ProductCard` rework and still uses the exact pre-Stage-2 card
treatment. Bring both in line with `ProductCard`'s current card language:

- Card wrapper: `rounded-xl ... shadow-sm ... hover:shadow-md` →
  `rounded-card ... shadow-card ... hover:shadow-card-hover`.
  (Comparisons' description clamps at `line-clamp-2` today — unchanged; only
  the surrounding classes are token-swapped.)
- Title (`<h3>`): `text-base font-semibold text-slate-900` → `text-card-title text-heading`.
- Description (`<p>`): `text-sm text-slate-600` → `text-small text-body` (clamp unchanged).
- Section vertical padding: `py-16 sm:py-20` → `py-24`, same rhythm rule as everywhere else.

These are presentational `<Link>`-wrapped cards, not `<button>`/`<a>` CTAs, so they
are not converted to the `Button` component — `Button`'s job is CTAs, not whole
clickable card surfaces.

## 5. BuyingGuideDetailPage

`frontend/src/pages/BuyingGuideDetailPage.jsx` gets the spec's "premium
online magazine" typography treatment, within the constraint that the
guide's `content` is a single free-text field (no structural TOC or
pros/cons callout boxes — those would require a backend content-model
change, out of scope for this redesign):

- Content container: `max-w-3xl` → `max-w-reading` (720px, the spec's
  dedicated reading-width token, replacing the ad-hoc 768px).
- Title: `text-3xl font-bold text-slate-900` → `text-page-heading text-heading`.
- Body paragraph: `text-base leading-relaxed text-slate-700` → `text-body`
  (the `text-body` typography class already carries the spec's 160%
  line-height, making the separate `leading-relaxed` utility redundant).
- Cover image radius: `rounded-xl` → `rounded-image`.
- Section vertical padding: `py-16 sm:py-20` → `py-24`.

## Testing

No test file in this stage's scope contains class-name assertions
(`CategoryCard.test.jsx`, `SearchInput.test.jsx`, `ProductFilters.test.jsx`,
`FilterDropdown.test.jsx`, `Pagination.test.jsx`, `CatalogPage.test.jsx`,
`HomePage.test.jsx`, `ComparisonsPage.test.jsx`, `BuyingGuidesPage.test.jsx`,
`BuyingGuideDetailPage.test.jsx` were all checked) — every existing test
queries by role, text, or attribute, none of which this stage's purely
cosmetic changes affect. No test files need modification; the existing
suite is the regression guard.

## Out of Scope for This Stage

- No structural changes to Buying Guide content (no TOC, no pros/cons
  callout boxes, no expert-tip highlights) — the content model is a single
  free-text field and changing that is a backend change, out of scope.
- No changes to the `/compare` tool or the Comparisons *detail* page
  (its comparison table) — that's Stage 4.
- No admin-page changes — that's Stage 5.
- No animation changes beyond what's already in place — that's Stage 6.
