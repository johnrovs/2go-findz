# Buying Guide — Comparison Step (Step 4) Design

## Goal

Add a production-ready Comparison-table editor as Step 4 of the Buying Guide
form, matching the visual layout of the reference screenshot as closely as
the existing backend model allows. Steps 1–3 (Basic Info, Products, Quick
Picks) are already built and must be preserved unmodified in design,
behavior, saved data, and responsive layout. This task does not touch Top
Pick or any step after Comparison.

## Backend reality (confirms scope)

The backend already has a fully wired, working Comparison model for
`BuyingGuide` — this is not new backend work, only a missing frontend editor,
the same situation Quick Picks was in before Step 3 was built.

- `BuyingGuide.comparisonSpecs` is a `@OneToMany` of
  `BuyingGuideComparisonSpec`, each owning a `@OneToMany` of
  `BuyingGuideComparisonValue`. Both already round-trip through
  `BuyingGuideRequest`/`BuyingGuideResponse` and
  `BuyingGuideForm.jsx`'s `mapComparisonSpecsFromResponse`/`buildPayload`.
- Shape: `{ specificationName: string, values: [{ productId, value: string }] }`.
  `value` is a plain string (max 500 chars, `@NotBlank`). There is no
  value-type, unit, or display-metadata field anywhere in the model.
- `BuyingGuideServiceImpl.validateRequest()` already enforces: for every
  spec, `valueProductIds` (the set of productIds referenced by that spec's
  values) must equal exactly the guide's `recommendedProductIds` set — no
  more, no fewer, no duplicates. This means **comparison columns are always
  exactly the Products-step list**; there is no independent
  add/remove/reorder of "comparison products," and no minimum/maximum
  product-count configuration to build.
- There is no comparison-specific reset endpoint, category-template table,
  or per-spec "system/protected" flag. Everything saves through the same
  guide create/update endpoint the other steps already use.

This materially narrows several sections of the original reference spec
(independent product subset with its own ordering/min/max, typed values
with units, persisted category-default templates, a separate reset
endpoint). Those pieces are deliberately out of scope here, consistent with
how Quick Picks was scoped to the real `productLink`/no-Prime-fields model
rather than inventing new backend fields.

## 1. Products in This Comparison panel

Read-only horizontal row of product cards mirroring `recommendedProducts`
(Step 2's list, in Step 2's order) — no drag, no Add/Remove modal, since
there is no independent subset to manage here. Each card shows position
number, product image, product name. A "Manage in Products step" link/button
navigates to Step 2 (`setActiveStep(2)`), consistent with how the guide
already lets you jump between unlocked steps.

Component: `ComparisonProductsPanel.jsx`.

## 2. Comparison Specifications editor

White card, heading "Comparison Specifications," supporting text "Drag and
drop to reorder rows," with **Add Specification** and **Reset to Default**
actions.

Table layout: Specification name column, one column per current comparison
product (thumbnail + name in the header), Actions column.

Each row (`ComparisonSpecificationRow.jsx`):
- Drag handle (`useSortable`) + Move Up/Move Down buttons — same pattern as
  `QuickPickEditorRow`.
- Specification-name text input, always editable inline (no separate
  edit/save toggle — confirmed with the user; matches the Badge Name
  pattern from Quick Picks).
- One always-editable text input per product column, holding that
  product's value for this spec.
- Delete button, confirms before removing (removes the whole row and all
  its per-product values).

**Add Specification** appends a new row: empty name, one empty-string value
per current comparison product. No modal — the row is immediately editable
in place.

**Stable IDs for reordering:** existing specs use their real numeric
`id` from the server. A spec added client-side before the first save has no
server id yet, so it gets a `crypto.randomUUID()`-generated client-only id
(stored on the local object, e.g. `clientId`), used as the `useSortable`
key/id instead of the array index. This mirrors the "never use array index
as a stable id" rule already applied in Quick Picks.

**Reset to Default:** confirmation dialog first ("This will remove your
current specifications and their values and replace them with a small
default set. This can't be undone once saved."). On confirm, replaces
`comparisonSpecs` with a small **generic** 3-row default set — `Price`,
`Customer Reviews`, `Best For` — not the electronics-specific list from the
reference image (Battery Life, ANC, Bluetooth Version, etc. are examples
tied to one category, and there's no persisted category-template mechanism
to key them off correctly for every guide category). `Price` and `Customer
Reviews` values are pre-filled per product from that product's
`productPrice`/`rating`+`reviewCount` at the moment of reset (a one-time
convenience copy, not a live/permanent sync — the model has no sync
mechanism), formatted as plain strings (e.g. `"$69.99"`,
`"4.8 (12,850)"`); `Best For` starts blank per product. All values stay
freely editable afterward. Reset only replaces `comparisonSpecs` — it does
not touch `recommendedProducts`, `quickRecommendations`, or any other step's
state.

## 3. Keeping comparison state valid as products change

Because the backend requires exact 1:1 coverage between comparison values
and `recommendedProducts`, `BuyingGuideForm.jsx` needs a small
reconciliation effect: whenever `recommendedProducts` changes (a product
added or removed in Step 2), every existing spec's `values` array is
resynced so it has exactly one entry per current product — a new empty-string
entry for a newly added product, and the entry removed for a product no
longer in the guide. This runs automatically (a `useEffect` keyed on the
product-id list) so the Comparison step, whenever visited, always renders
the correct current column set, with any newly added product's cells shown
empty (and blocking Next, same as any other blank required cell) rather
than the app crashing or silently sending a mismatched payload that the
backend would reject.

## 4. Validation (Next)

Blocks advancing to Top Pick unless:
- At least one specification row exists.
- Every specification name is non-blank and unique
  (case-insensitive `.trim().toLowerCase()`, mirroring the Quick Picks
  badge-name dedup check).
- Every value cell (every spec × every product) is non-blank.

On failure: stay on Comparison, render an inline error summary above the
table plus per-row/per-cell error state, and move focus to the first
invalid field. On success: `submit(false)` (matching the existing
`handleQuickPicksNext` pattern) then advance `activeStep`/`maxUnlockedStep`
to 5.

**Previous** does not discard in-progress edits — it simply navigates back
to Quick Picks, preserving local state exactly like the existing Products →
Quick Picks Previous button already does.

## 5. Live Preview

Extend `LivePreview.jsx` with a "2. Comparison Table" section (numbered
per the guide's existing table-of-contents numbering, matching how Quick
Picks became "1. Quick Recommendations"). Renders a semantic `<table>`:
first column of specification names, one `<th>` per comparison product with
its thumbnail + name, one `<tr>` per specification.

Cell rendering: plain text as-is, except a small presentational nicety — a
value that case-insensitively equals exactly `"yes"` or `"no"` renders as a
green check / red cross icon with accessible text (`<span
className="sr-only">Yes</span>`/`No`), matching the reference screenshot's
ANC row without inventing a real boolean type in the data model. An empty
in-progress cell (only possible transiently while editing, never in saved
data since the backend requires all cells non-blank) renders as an em dash.

Desktop: table renders inline in the existing sticky preview panel. Narrow
viewports: the table sits inside its own `overflow-x-auto` container so
horizontal scrolling stays contained rather than overflowing the page,
consistent with the project's existing responsive rules.

## 6. Step navigation

`Stepper.jsx`'s `MAX_BUILT_STEP` becomes `4`. Comparison is reachable once
Quick Picks' Next has been completed, same unlock pattern as every prior
step. Top Pick stays locked/disabled — it is explicitly out of scope for
this task and is not being built or redesigned.

## 7. Accessibility

- The comparison table uses real `<table>`/`<thead>`/`<tbody>`/`<th
  scope="col">` markup, not a div grid, so screen readers get proper row/
  column headers.
- Every text input (spec name, per-product value) has an associated
  `<label>` (visually hidden where the table layout already conveys it
  through the column header, e.g. per-cell inputs use
  `aria-label="{spec name} for {product name}"`).
- Drag handles remain keyboard-operable via `@dnd-kit`'s existing sortable
  keyboard coordinate getter (same as Quick Picks), plus explicit Move
  Up/Down buttons as the non-drag alternative — drag and drop is never the
  only way to reorder.
- Row removal and reset both require an explicit confirm step and use
  accessible labels (e.g. "Delete Battery Life specification").

## 8. Files

**New:**
- `frontend/src/components/buying-guide-form/BuyingGuideComparisonStep.jsx`
- `frontend/src/components/buying-guide-form/ComparisonProductsPanel.jsx`
- `frontend/src/components/buying-guide-form/ComparisonSpecificationsEditor.jsx`
- `frontend/src/components/buying-guide-form/ComparisonSpecificationRow.jsx`
- `frontend/src/components/buying-guide-form/ResetComparisonDialog.jsx`
- Matching `.test.jsx` for each.

**Modified:**
- `frontend/src/components/BuyingGuideForm.jsx` — wire Step 4, product-sync
  reconciliation effect, validation, Previous/Next.
- `frontend/src/components/BuyingGuideForm.test.jsx`
- `frontend/src/components/buying-guide-form/LivePreview.jsx` +
  `LivePreview.test.jsx` — add Comparison Table section.
- `frontend/src/components/buying-guide-form/Stepper.jsx` +
  `Stepper.test.jsx` — `MAX_BUILT_STEP = 4`.

**Backend:** one small validation addition, mirroring the Quick Picks
badge-name precedent — `BuyingGuideServiceImpl.validateRequest()` gains a
duplicate-`specificationName` check (case-insensitive) alongside its
existing per-spec product-coverage check, throwing
`InvalidBuyingGuideException` on collision. No entity, migration, or DTO
changes; everything else already exists and is wired.

## Explicitly out of scope for this task

- Independent comparison-product selection, its own reorder, or
  min/max-product configuration (backend requires exact 1:1 coverage with
  `recommendedProducts`; there is nothing to select independently).
- Typed values (currency/boolean/rating/duration/measurement/select),
  units, or per-spec metadata — backend stores plain strings only.
- Persisted category-default templates — Reset to Default uses one small
  generic set, not a category-keyed table.
- System-protected/non-deletable specification rows — no such flag exists
  in the model.
- Top Pick (Step 5) or any step after Comparison.
