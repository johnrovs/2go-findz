# Comparisons — Stage 2: Admin Authoring UI

## Context

This is Stage 2 of the 4-stage Comparisons feature. Stage 1 (data model +
backend admin/public APIs) is complete and merged to master:
`docs/superpowers/specs/2026-07-27-comparisons-backend-design.md` and
`docs/superpowers/plans/2026-07-27-comparisons-backend.md` describe the full
data model and API shape this stage builds against.

Stage 2 builds the admin-facing frontend: a list page and a full authoring
form that lets an admin create and edit every part of a Comparison —
basic fields, per-product editorial data, the flexible grouped spec table,
reorderable prose sections, an FAQ, and related-content pickers — all
saved as a single `ComparisonRequest` payload matching Stage 1's
single-PUT design.

**The 4 stages:** 1. Backend (done) → 2. Admin authoring UI (this spec) →
3. Public Comparison page → 4. SEO + UX/performance polish.

## Pages & Routing

- `frontend/src/services/adminComparisonService.js` — `getComparisons()`,
  `getComparisonById(id)`, `createComparison(payload)`,
  `updateComparison(id, payload)`, `deleteComparison(id)`, thin wrappers
  over `/admin/comparisons[...]`.
- `frontend/src/pages/admin/ComparisonsPage.jsx` — list page. Same
  `DataTable`/`ConfirmDialog`/`ErrorState`/`EmptyState` pattern as
  `BuyingGuidesPage`. Columns: cover image, title, category, Published/Draft
  badge, created date, edit/delete actions.
- `frontend/src/pages/admin/ComparisonFormPage.jsx` — thin page wrapper.
  Loads the comparison on edit (`:id` route param), calls create/update on
  submit, shows a toast, navigates back to the list. Mirrors
  `BuyingGuideFormPage`'s load-on-edit `useEffect` pattern exactly.
- Routes added to `App.jsx`: `/admin/comparisons`, `/admin/comparisons/new`,
  `/admin/comparisons/:id`, inside the existing `AdminLayout` route group.
- `AdminSidebar.jsx` gets a new "Comparisons" nav item.

## `ComparisonForm` Architecture

`ComparisonForm.jsx` owns all form state in one place — basic fields,
`products`, `specRows`, `sections`, `faqs`, `relatedComparisonIds`,
`relatedProductIds` — and renders a tab bar (Basic Info / Products / Spec
Table / Sections / FAQ / Related) over the active tab's content. One
shared Save button submits the entire state as a single
`ComparisonRequest`-shaped payload, matching Stage 1's single-PUT
full-nested-state-replacement design — no tab can be "half-saved."

Each tab is its own component under `frontend/src/components/comparison-form/`,
receiving state slices and setters as props (not context), keeping data
flow explicit:

- `BasicInfoTab.jsx`
- `ProductsTab.jsx`
- `SpecTableTab.jsx`
- `SectionsTab.jsx`
- `FaqTab.jsx`
- `RelatedTab.jsx`

## Tab-by-Tab Content

**Basic Info**: title, slug (optional text input, helper text "auto-generated
from title if left blank" — no live JS slugify; the backend already
handles blank-means-generate, and the edit form pre-fills the generated
slug from the loaded comparison), description, cover image (`ImageUploader`,
reused as-is), category (`<select>` populated from `getCategories()`, same
prop-passed pattern as `ProductForm`), SEO title, SEO description, Published
checkbox.

**Products**: a product search box (same debounced-search UX as the
existing `ProductPicker`) to add products. Each added product renders as
an expandable card with badge, recommendation, bestFor, mainStrength,
mainWeakness, pros, cons, editor's score, plus reorder/remove buttons.
Client-side validation mirrors the backend: pros and cons must both be
filled or both blank per product; at least 2 products required to submit.

**Spec Table**: "Add Row" prompts for groupLabel + rowLabel. Each row then
renders one value + tier (BEST/GOOD/STANDARD dropdown) input per product
**currently in the Products tab** — auto-synced: adding a product in the
Products tab automatically adds an empty value slot to every existing spec
row; removing a product removes its column from every row. The admin can
never reach the backend's "row doesn't match products" validation error
through normal use of the UI.

**Sections** and **FAQ**: both simple repeatable add/remove/reorder lists
(heading+body / question+answer respectively) — structurally identical to
each other, no search step.

**Related**: two ordered multi-select pickers, max 8 items each — related
products and related comparisons. Rather than duplicating the existing
`ProductPicker`'s ~130 lines of search/add/reorder/remove logic for
comparisons, Stage 2 extracts a generic `EntityPicker` component (search
function + item-label function, ordered multi-select, reorder/remove
buttons) that both a refactored `ProductPicker` (thin wrapper preserving
its exact external API) and a new `ComparisonPicker` (thin wrapper
searching comparisons) build on top of. `ProductPicker`'s existing test
suite continues to guard its behavior unchanged since its props and
rendered output don't change — only its internal implementation is
refactored to delegate to `EntityPicker`.

## Validation & Error Handling

Client-side validation mirrors the backend so submission failures are rare
in normal use: title/description/category required; slug format
(kebab-case) validated if the admin types one; at least 2 products;
pros/cons paired per product; related items capped at 8 each. Server-side
field errors (e.g. duplicate slug → 409 Conflict) surface through the same
`fieldErrors`/`formError` state pattern established in `BuyingGuideForm`.

`ComparisonsPage` reuses `LoadingSpinner`/`ErrorState`/`EmptyState`/
`ConfirmDialog` exactly as `BuyingGuidesPage` does.

## Testing

Vitest + React Testing Library per component, following this session's
established conventions:

- `ComparisonsPage.test.jsx` — list, empty state, delete via confirm
  dialog, wrapped in `ToastProvider`
- `ComparisonFormPage.test.jsx` — create-empty, load-and-prefill-on-edit,
  submit-calls-service, wrapped in `ToastProvider`
- `ComparisonForm.test.jsx` — tab switching, validation errors, submit
  payload shape (full nested structure)
- `EntityPicker.test.jsx` — generic search/add/duplicate-prevention/
  reorder/remove behavior
- `ProductPicker.test.jsx` — existing test file, must continue passing
  unchanged against the refactored wrapper (regression guard for the
  `EntityPicker` extraction)
- `ComparisonPicker.test.jsx` — thin; confirms it wires `EntityPicker` to
  comparison search correctly
- Focused tests within `ProductsTab.test.jsx` / `SpecTableTab.test.jsx`
  covering the auto-sync behavior specifically: adding a product adds a
  column to every existing spec row; removing a product removes its
  column from every row

## Out of Scope for Stage 2

- Public Comparison page rendering, list page, routing, nav links (Stage 3)
- SEO meta tags, JSON-LD, canonical URLs, OG images (Stage 4)
- UX polish: sticky headers, dark mode (out of scope entirely), print-friendly,
  mobile section collapse (Stage 4)
- Performance: image lazy-loading, row memoization (Stage 4 — frontend
  rendering concerns that apply to the public page, not the admin form)

A live manual smoke test of the admin flow against the running backend
(matching how every prior admin stage this session was verified) happens
at the end of this stage's plan, even though there's no public page yet
to visually confirm against.
