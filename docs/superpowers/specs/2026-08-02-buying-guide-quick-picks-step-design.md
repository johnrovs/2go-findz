# Buying Guide Quick Picks Step (Stage 3, Part 2)

## Context

Basic Info (Step 1) and Products (Step 2) are complete and merged. The user
provided a reference screenshot of the "Quick Picks" step (Step 3) — a
horizontal-card editor for the guide's top recommendations, each with a
colored badge, product info, an Amazon link, and drag-to-reorder — plus an
extremely detailed 22-section written spec.

**Explicitly out of scope** (per the user's own standing instruction):
Comparison, Top Pick, Runner-Ups, Buying Guide Content, FAQs, and SEO &
Publish are not built here — each needs its own future reference image and
go-ahead.

## Backend: one small addition, no migration

The backend already fully supports Quick Picks: `BuyingGuideQuickRecommendation`
(id, buyingGuide, product, badgeName), automatic order persistence via
`@OrderColumn(name = "display_order")` on `BuyingGuide.quickRecommendations`,
a DB-level `UNIQUE (buying_guide_id, product_id)` constraint preventing the
same product being added twice, and `BuyingGuideServiceImpl.validateRequest()`
already rejects a quick pick whose `productId` isn't in the guide's
`recommendedProductIds`.

The one gap: nothing stops two quick picks from sharing a badge name.
`validateRequest()` gains one more check, next to its existing duplicate-
product check:

```java
Set<String> badgeNames = new LinkedHashSet<>();
for (BuyingGuideQuickRecommendationRequest quickRec : request.quickRecommendations()) {
    if (!badgeNames.add(quickRec.badgeName().trim().toLowerCase())) {
        throw new InvalidBuyingGuideException(
                "Two quick picks cannot use the same badge name: \"" + quickRec.badgeName() + "\".");
    }
}
```

(Case-insensitive comparison — "Best Overall" and "best overall" should
still collide.) No entity, DTO, or migration changes.

**Amazon Link decision (confirmed with the user):** the reference image's
"Amazon Link" field is the product's own `productLink` — already an Amazon
URL, already set on the Products page — displayed read-only in the Quick
Pick row, not a new editable/overridable field. This avoids a backend
change entirely and avoids two divergent copies of "the same product's
Amazon link" existing in the system.

## Eligible products: no new fetch

"Eligible products" for the Add Quick Pick dialog = the guide's
`recommendedProducts` (Step 2's already-loaded state) minus whichever are
already used as a quick pick. This is a synchronous array filter — no new
service call, no loading state, no error/retry state for the dialog itself.
This is a deliberate simplification versus the spec's anticipated
loading/error states for that dialog, since the data is already resident.

## Badge appearance: deterministic, not stored

No badge-color field exists on the backend and none is being added. Per
the spec's own explicit fallback instruction ("If the existing data model
does not support custom badge colors, deterministically assign colors
based on the Quick Pick position"), color is derived from array index:

```js
const BADGE_COLORS = [
  { bg: 'bg-success', text: 'text-white' },   // index 0 — green
  { bg: 'bg-info', text: 'text-white' },      // index 1 — blue
  { bg: 'bg-primary', text: 'text-white' },   // index 2 — purple
  { bg: 'bg-warning', text: 'text-white' },   // index 3 — orange
  { bg: 'bg-danger', text: 'text-white' },    // index 4 — red/coral
];
function badgeColorForIndex(index) { return BADGE_COLORS[index % BADGE_COLORS.length]; }
```

All five already exist as design-system colors in `tailwind.config.js` —
no new colors introduced. This is documented as an assumption: badge color
follows position, not any saved per-badge preference.

## Explicitly omitted (no supporting data)

- **Prime indicator** and **In Stock availability badge**: no such fields
  exist anywhere on `Product`. Omitted from both the editor row and Live
  Preview, per the spec's own "only when supported by stored data" clause.
- **Multi-marketplace Amazon validation**: no marketplace/country config
  exists. A single hardcoded hostname allowlist is used instead:
  `amazon.com`, `amazon.ca`, `amazon.co.uk`, `amazon.de`.
- **"Configured affiliate ID" mismatch warning**: no affiliate-ID setting
  exists anywhere in Settings. Skipped rather than warning against a value
  that doesn't exist.

## Data flow in `BuyingGuideForm.jsx`

`quickRecommendations` (currently a read-only `useState` initialized from
`mapQuickRecommendationsFromResponse`, storing `{ productId, badgeName }`)
becomes read-write, storing the full product alongside the badge name so
the editor and preview can render product info without a lookup:

```js
const [quickRecommendations, setQuickRecommendations] = useState(
  (guide?.quickRecommendations ?? []).map((r) => ({ product: r.product, badgeName: r.badgeName }))
);
```

`buildPayload` maps back to the wire shape:

```js
quickRecommendations: quickRecommendations.map(({ product, badgeName }) => ({
  productId: product.id,
  badgeName: badgeName.trim(),
})),
```

## Step navigation changes

`Stepper.jsx`'s `MAX_BUILT_STEP` becomes `3`. `BuyingGuideForm.jsx`:

- The Products step (`activeStep === 2`) gains a real **Next** button for
  the first time — it had none, since step 3 didn't exist. Next has no
  step-2-specific validation beyond what already exists (product selection
  has no minimum), and unlocks/advances to step 3.
- Step 3 (`activeStep === 3`) gets both **Previous** (returns to step 2,
  no validation) and **Next**, which validates:
  - At least 1 quick pick exists.
  - Every badge name is non-blank, ≤30 characters, and unique
    (case-insensitive) among this guide's quick picks.
  - Every quick pick's product is still in `recommendedProducts` (mirrors
    the backend's own check, for immediate feedback before the round-trip).
  - No duplicate products among quick picks (mirrors the DB's own unique
    constraint, for immediate feedback).

  On success: saves (`onSubmit`, non-publishing) — but does not
  navigate anywhere, since step 4 (Comparison) doesn't exist yet and
  `MAX_BUILT_STEP` caps at 3. Next is fully real: it validates, blocks
  on failure with an inline error summary and focuses the first invalid
  field exactly per the spec, and persists on success — it just has
  nowhere further to advance to yet. This is different from how the
  Products step (previously the last built step) omits Next entirely:
  here the spec explicitly requires working validate-and-save behavior
  on Next regardless of whether Comparison exists, so Next is built for
  real, only its "advance to the next step" side effect is a no-op until
  Comparison lands. A brief inline confirmation ("Quick Picks saved.")
  replaces navigation on success.

## Components

- **`BuyingGuideQuickPicksStep.jsx`** — heading ("Quick Picks" + "How it
  works" popover button), supporting text, "Add Quick Pick" button (top
  right, disabled at 5/5 with an explanatory tooltip), the tip notice
  below the list, composes `QuickPickEditorList` + `AddQuickPickDialog`.
- **`AddQuickPickDialog.jsx`** — built on the existing `Modal.jsx`. Lists
  eligible products (image, name, brand, price, rating, reviewCount) with
  a search box (client-side filter, no debounce needed — small in-memory
  list) and an Add action per row. Empty states: "No eligible products —
  every product in this guide is already a Quick Pick" vs. "No products
  in this guide yet — add some in the Products step first."
- **`QuickPickEditorList.jsx`** — mirrors `SelectedProductsPanel.jsx`'s
  exact `@dnd-kit` `DndContext`/`SortableContext` + Up/Down button pattern
  (drag handle, keyboard reorder, live-region announcement on move), one
  `QuickPickEditorRow` per item, empty state when zero.
- **`QuickPickEditorRow.jsx`** — order number, drag handle, `QuickPickBadge`
  preview + editable badge-name input (helper text, character counter,
  inline validation), product info block (image, name, brand, price, star
  rating + review count using the existing `star` color token), Amazon
  link (read-only, truncated, external-link icon button opening in a new
  tab with `rel="nofollow sponsored noopener noreferrer"`, a small warning
  icon+tooltip if the hostname isn't in the Amazon allowlist), Remove
  button.
- **`QuickPickBadge.jsx`** — small reusable colored pill
  (`badgeColorForIndex`), used identically in the editor row and in the
  extended `LivePreview`.
- Removal reuses the existing `ConfirmDialog.jsx` directly — no new
  dialog component. Confirmation is only required when the badge name is
  non-blank (mirrors `TocBuilder`'s existing "confirm only if there's
  real content" rule); a still-blank/just-added row removes immediately.
- **`LivePreview.jsx` is extended, not duplicated.** It gains a
  `quickRecommendations` prop; when non-empty, a real "1. Quick
  Recommendations" section renders below the existing TOC, using
  `QuickPickBadge` + product image/name/rating/price + an orange "View on
  Amazon" CTA (disabled with a tooltip if the link fails the hostname
  check). This is the first step whose data has a direct published-page
  section, unlike Products.
- No separate `QuickPicksStepNavigation` or `AffiliateLinkField`
  components — Previous/Next stay inlined in `BuyingGuideForm.jsx`
  (matching Basic Info/Products), and the Amazon-link display is small
  enough to live directly in `QuickPickEditorRow`.

## "How it works" popover

A small button (`aria-expanded`, `aria-controls`) next to the heading
toggles an inline disclosure panel directly below the heading row — not a
modal, since it's non-blocking informational content the admin should be
able to reference while editing. Clicking again, pressing Escape, or
clicking outside closes it. Lists the four bullet points from the spec
verbatim. This is a new small self-contained piece of
`BuyingGuideQuickPicksStep.jsx`, not a shared component, since nothing
else in the codebase needs an inline disclosure yet.

## Limits

No existing business rule. Per the spec's own fallback: minimum 1 to
progress past this step (soft — Save as Draft works below the minimum,
only the step-3 Next gate enforces it), maximum 5 (Add button disables at
5 with inline text explaining why), recommended 3–5 shown as guidance
text, not enforced.

## Testing

New test files for `QuickPickBadge`, `AddQuickPickDialog`,
`QuickPickEditorRow`, `QuickPickEditorList`, `BuyingGuideQuickPicksStep`,
plus updated tests for `Stepper` (`MAX_BUILT_STEP` → 3),
`LivePreview` (new section), and `BuyingGuideForm` (step 3 wiring,
Products-step Next button, `quickRecommendations` → payload mapping with
the new `{product, badgeName}` shape). Backend: a new
`AdminBuyingGuideControllerTest` case for the duplicate-badge-name
rejection.
