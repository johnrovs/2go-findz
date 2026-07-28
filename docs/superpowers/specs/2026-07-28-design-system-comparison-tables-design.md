# Design System Stage 4: Comparison Tables

## Context

This is Stage 4 of the 6-stage UI/UX redesign of "2Go Findz". Stages 1–3
(Design Foundations, Core UI Kit, Public Pages) are complete.

Per the original decomposition, this stage covers the ad-hoc `/compare`
tool and the Comparisons feature's detail-page comparison table: sticky
header, sticky product image, alternating row colors, icons instead of
yes/no text, hover highlighting, responsive.

**Scope expansion, decided during this stage's brainstorming:** unlike
`ComparePage.jsx` (the `/compare` tool), which is almost entirely already
covered by Stage 2's shared-component fixes and needs only its table
touched, `ComparisonDetailPage.jsx` hand-rolls nearly everything inline
(hero, product breakdown cards, custom sections, FAQ accordion, related
comparisons cards) rather than reusing shared components. Only the parts
using `SectionHeading`/`LoadingSpinner`/`ErrorState`/`ProductGrid` were
already retokenized in earlier stages. No future stage in the 6-stage plan
is scoped to touch the rest of this page, so — matching what Stage 3 did
when it found stray hand-rolled cards on the Comparisons/Buying-Guides list
pages — this stage restyles the **entire** `ComparisonDetailPage`, not just
its table.

Two spec items have no literal application anywhere in this app's data:
"icons instead of Yes/No text" has no boolean field in either table (the
`/compare` table's fields are name/category/price/badges/description; the
Comparisons table's spec values are free text with a BEST/GOOD/STANDARD
tier, not booleans). Following the precedent set in Stage 1 (dropping
star-ratings/bookmarks for the same reason), this is dropped for the
`/compare` table. The Comparisons table's tier system is the one place
with genuinely categorical data, so it becomes the home for an icon
treatment in spirit of the same spec line (see below).

## 1. `/compare` Tool Table (`frontend/src/pages/ComparePage.jsx`)

- `<thead>`: add `sticky top-16 z-10 bg-white` — sticks below the Navbar
  (which occupies the top 64px / `top-16`). The product image already
  lives in the header row, so this single change satisfies both "sticky
  header" and "sticky product image" for this page.
- `<tbody>` rows: add alternating backgrounds via `odd:bg-white
  even:bg-surface-secondary`, and `hover:bg-primary/5` for row-hover
  highlighting.
- "View on Amazon" cell: replace the ad-hoc `<a>` with `<Button
  variant="amazon" href={...} target="_blank" rel="nofollow sponsored
  noopener noreferrer">`.
- Remove-product button (the `X` icon circle in each header cell): keep
  its neutral slate treatment — no spec'd token exists for this kind of
  control, matching the precedent from Stage 3's filter pills/pagination.
- "Browse products" link (shown in the empty state): `text-indigo-600` →
  `text-primary`.
- Trending/Best Seller badge pills in the table body: left as-is
  (`bg-amber-100`/`bg-emerald-100`) — no token exists for these two
  specific business concepts, and inventing one would be speculative
  (same reasoning as Stage 3's filter-pill decision).

## 2. Comparisons Detail-Page Table (`frontend/src/pages/ComparisonDetailPage.jsx`)

- `<thead>`: sticky, positioned below both the Navbar and this page's
  existing sticky section-nav (itself `sticky top-16`, permanently pinned
  once reached since its parent spans the whole page). The exact top
  offset depends on the section-nav's rendered height, which isn't a
  fixed value in code — the implementation plan will start from an
  estimate and correct it against the live rendered page during the
  final smoke check, rather than guessing a precise pixel value here.
- Table header cells gain a small product thumbnail image above the
  product name (products already carry `imageFileName`) — without an
  image in the header, "sticky product image" has nothing to stick;
  adding one also makes the sticky header genuinely useful for tracking
  which column is which while scrolling through grouped spec rows.
- `<tbody>` rows: same `odd`/`even` alternating background and
  `hover:bg-primary/5` highlighting as the `/compare` table. Group-label
  rows keep their current full-width divider treatment, retokenized
  (`bg-slate-50` → `bg-surface-secondary`).
- Tier cells: alongside the existing tier-tinted background
  (`tierClassName`, unchanged), add a small icon next to `BEST`-tier
  values (a `Check` icon, Lucide, matching the codebase's existing icon
  library) — the one place either table has real categorical data, so
  the natural home for an icon-based indicator.

## 3. Rest of ComparisonDetailPage

- **Hero**: category label `text-indigo-600` → `text-primary`; title
  `text-3xl font-bold text-slate-900` → `text-page-heading text-heading`;
  description `text-base leading-relaxed text-slate-700` → `text-body`;
  "Last updated" `text-xs text-slate-400` → `text-small text-muted`; cover
  image `rounded-xl` → `rounded-image`.
- **Sticky section nav**: links `text-slate-600 hover:text-indigo-600` →
  `text-body hover:text-primary`; add `shadow-navbar` to match the main
  Navbar's sticky treatment.
- **Product Breakdown cards**: `rounded-xl border border-slate-200 p-6` →
  `rounded-card border border-slate-200 shadow-card hover:shadow-card-hover
  p-6`; badge pill `bg-indigo-100 text-indigo-700` → `bg-primary/10
  text-primary` (kept as an inline pill, not the `Badge` component —
  `Badge` is a fixed-size numeric-count circle, structurally different
  from a wider text-label pill; forcing them into one component would
  produce an awkward shape for one of the two uses); product name
  `text-lg font-semibold text-slate-900` → `text-card-title text-heading`;
  editor's score `text-sm font-medium text-slate-600` → `text-small
  text-body`; recommendation `text-sm text-slate-700` → `text-small
  text-body`; `dl` term labels `font-medium text-slate-500` →
  `font-medium text-muted`; `dl` definitions `text-slate-700` →
  `text-body`; Pros header `text-emerald-700` → `text-success`; Cons
  header `text-red-700` → `text-danger`; pros/cons list text
  `text-slate-700` → `text-body`; CTA `<a>` → `<Button variant="amazon"
  href={...} className="print:hidden">`.
- **Custom sections**: heading `text-xl font-semibold text-slate-900` →
  `text-card-title text-heading`; body `text-base leading-relaxed
  text-slate-700` → `text-body`.
- **FAQ accordion**: border `border-slate-200` → `border-border`;
  question button `text-base font-semibold text-slate-900` →
  `text-card-title text-heading`; answer `text-sm text-slate-700` →
  `text-small text-body`.
- **Related Comparisons cards**: `rounded-xl ... shadow-sm ...
  hover:shadow-md` → `rounded-card ... shadow-card ...
  hover:shadow-card-hover`, matching Stage 3's list-page card treatment.
  Title stays at `text-sm font-semibold` (not the full `text-card-title`
  scale) since these are compact 4-per-row thumbnails, not full list
  cards — just retokenize its color: `text-slate-900` → `text-heading`.
- **Related Products**: renders via `ProductGrid`, already fully styled
  since Stage 2 — no changes.

## Testing

Both pages' test files were checked for class-name assertions:
`ComparePage.test.jsx` and `ComparisonDetailPage.test.jsx` query
exclusively by role, text, and attribute (the one exception —
`ComparisonDetailPage.test.jsx`'s existing tier-styling test, which
asserts `toHaveClass('bg-emerald-50')` etc. on spec-value cells — is
unaffected, since `tierClassName`'s output classes aren't changed by this
stage, only supplemented with an icon for `BEST`). No test files need
modification for the styling changes; a new assertion is needed only for
the new `BEST`-tier icon (confirming it renders) and, if the CTA's element
type changes in a way existing queries don't already cover, for the
`Button`-rendered CTAs (existing `getByRole('link', ...)` queries already
cover this, since `Button` renders `<a>` when given `href`, same as Stage
2/3's `ProductCard`/list-page precedent).

## Out of Scope for This Stage

- No changes to `ComparisonsPage.jsx` (the list page) or
  `BuyingGuidesPage.jsx`/`BuyingGuideDetailPage.jsx` — already covered in
  Stage 3.
- No admin-page changes — Stage 5.
- No animation changes beyond what's already in place — Stage 6.
- No changes to the underlying spec-row/tier data model — this stage is
  presentation only.
