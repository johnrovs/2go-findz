# Buying Guide Products Step (Stage 3, Part 1)

## Context

The Buying Guide editor's Basic Info step (Step 1) is complete and merged.
The user provided a reference screenshot of the "Products" step (Step 2):
a two-column layout — a searchable/filterable product catalog on the
left, a reorderable list of selected products on the right — plus a
detailed written spec covering search, filters, pagination, add/remove,
drag-and-drop + keyboard-accessible reordering, persistence via the real
backend model, and Previous/Next step navigation.

This depends on `2026-08-02-product-sku-and-brand-filter-design.md`
(brand filter + SKU search on the backend), built first.

**Explicitly out of scope** (confirmed with the user in this session and
by their own standing instruction): Quick Picks, Comparison, Top Pick,
Runner-Ups, Buying Guide Content, FAQs, and SEO & Publish steps are not
built here — each needs its own future reference image and go-ahead.

## Step navigation (new)

`BuyingGuideForm.jsx` currently always renders `BasicInfoStep` — there is
no step-switching state, and `Stepper.jsx` hardcodes step 1 as the only
enabled, active step. This task adds real navigation, scoped to exactly
the two steps that exist:

- `BuyingGuideForm.jsx` adds `const [activeStep, setActiveStep] = useState(1)`
  and `const [maxUnlockedStep, setMaxUnlockedStep] = useState(1)`.
- `Stepper.jsx` changes its signature to
  `Stepper({ activeStep, maxUnlockedStep, onStepClick })`. A step button is
  enabled when `stepNumber <= maxUnlockedStep`; `aria-current="step"` is
  set when `stepNumber === activeStep`. Steps 3–9 stay permanently
  disabled regardless of `maxUnlockedStep` (`stepNumber > 2` is always
  disabled) — they don't exist yet.
- A **Next** button renders at the bottom of the Basic Info step's form
  column. Clicking it runs the existing `validate()`; on success it calls
  `setMaxUnlockedStep(2)` and `setActiveStep(2)`, on failure it sets
  `fieldErrors` exactly as Save already does.
- The Products step renders a **Previous** button (returns to step 1, no
  validation needed to go back) and **no Next button** — there is no step
  3 to advance to yet. Because nothing downstream depends on the product
  selection yet, there's no minimum-product-count gate either; Save as
  Draft / Publish already validate at the whole-guide level independent
  of which step is active.
- Clicking an unlocked step number in the `Stepper` jumps `activeStep`
  directly (no re-validation of the step being left, matching typical
  wizard UX — validation only happens on forward progression via Next).

## Data model change

`recommendedProductIds` (currently `const [recommendedProductIds] = useState((guide?.recommendedProducts ?? []).map((p) => p.id))`
— read-only, no setter) becomes:

```js
const [recommendedProducts, setRecommendedProducts] = useState(guide?.recommendedProducts ?? []);
```

storing full product objects (`{ id, name, imageFileName, productPrice,
brand, ... }` — the same shape `ProductResponse` and catalog search
results already use), not just IDs. This matches the existing pattern for
`quickRecommendations`/`comparisonSpecs`/`recommendationSections`/`faqs`,
which already store full objects and get reduced to their submit shape
only inside `buildPayload`:

```js
recommendedProductIds: recommendedProducts.map((p) => p.id),
```

Array order is submit order — the existing backend model
(`BuyingGuideRequest.recommendedProductIds: List<Long>`) has no separate
position field, so no new backend work is needed for persistence itself.

## File structure

New files under `frontend/src/components/buying-guide-form/`:
- `ProductsStep.jsx` — step container, two-column grid
  (`grid grid-cols-1 gap-6 lg:grid-cols-2`), owns no state itself beyond
  local UI state; receives `selectedProducts`/`onSelectedProductsChange`
  props from `BuyingGuideForm.jsx`.
- `ProductCatalogPanel.jsx` — left column.
- `SelectedProductsPanel.jsx` — right column.

New hook: `frontend/src/hooks/useProductCatalogSearch.js`.

## Left panel — `ProductCatalogPanel.jsx`

`useProductCatalogSearch` mirrors `useAdminProductSearch`'s fetch logic
(same `searchProducts()` call, same `PAGE_SIZE = 20`, same debounced
search-term handling via the existing `SearchInput` component) but uses
plain `useState` for `search`/`categoryId`/`brand`/`page` instead of
`useSearchParams` — the guide editor doesn't use URL query-param state
anywhere else, and coupling catalog-search state to the URL would leak
into the guide editor's own URL and risk colliding with a future Quick
Picks catalog sharing the same route. It exposes the same shape
(`products`, `totalPages`, `totalElements`, `isLoading`, `error`, plus
setters) so the panel's rendering logic can follow `ProductsPage.jsx`'s
established pattern closely.

Reused as-is: `SearchInput`, `FilterDropdown` (one for Category, one new
one for Brand — options populated from `getDistinctBrands()`, loaded
once on mount), `Pagination`.

Each result renders as a compact row/card: thumbnail (`imageFileName`),
name, brand, price, and an **Add** button. The button is disabled and
reads "Added" when `product.id` is already present in `selectedProducts`.

States: `LoadingSpinner` while fetching, `ErrorState` (with retry calling
the hook's `reload()`) on failure, `EmptyState` ("No products match your
search") when a search returns zero results — same components
`ProductsPage.jsx` already uses.

## Right panel — `SelectedProductsPanel.jsx`

Same reorder pattern as `TocBuilder.jsx`: each row uses `@dnd-kit`'s
`useSortable` for a drag handle (`GripVertical` icon, `cursor-grab`) plus
explicit `ArrowUp`/`ArrowDown` icon buttons for keyboard/no-drag
accessibility (disabled at the respective list boundary), and a `Trash2`
remove button. Removal is immediate, no confirmation dialog — consistent
with `EntityPicker`'s existing selected-list remove button, since
removing a selection is low-stakes and trivially reversible by re-adding.

Header shows a live count: `"{n} product{s} selected"`. Empty state: a
centered message ("No products selected yet") with a hint to search on
the left — no separate `EmptyState` component needed here since it's a
simple inline message within the panel, not a full page-level empty
state.

## Live Preview

Unchanged. `LivePreview` keeps rendering exactly what it renders today
(title/excerpt/cover image/TOC) on the Products step too — same
`previewProps` passed from `BuyingGuideForm.jsx`. There is no reference
mockup for product cards inside the live preview, and the existing TOC
preview already represents where "Quick Recommendations" / "Comparison
Table" will render once those steps exist.

## Testing

- `useProductCatalogSearch.test.js` — fetch on mount, search/filter/page
  changes trigger re-fetch with correct params, loading/error states.
- `ProductCatalogPanel.test.jsx` — renders results, Add button
  disables/labels correctly for already-selected products, loading/empty/
  error states render.
- `SelectedProductsPanel.test.jsx` — renders selected products in order,
  Up/Down buttons reorder and respect boundaries, Remove button removes,
  empty state renders when the list is empty.
- `Stepper.test.jsx` — updated for `activeStep`/`maxUnlockedStep` props;
  steps beyond `maxUnlockedStep` stay disabled, steps beyond 2 stay
  disabled regardless.
- `BuyingGuideForm.test.jsx` — updated for: Next on Basic Info
  validates and unlocks/advances to step 2; Previous returns to step 1;
  `recommendedProducts` state changes flow into `buildPayload` as
  `recommendedProductIds` (array of IDs, in order); an existing guide's
  `recommendedProducts` initializes the selected panel correctly.

## Out of scope

- Quick Picks and every step after Products (per standing instruction).
- Any "used elsewhere" dependency warning when removing a product — no
  downstream step exists yet to depend on a selection, so this has no
  observable behavior to build or test today.
- Product cards inside the Live Preview panel.
