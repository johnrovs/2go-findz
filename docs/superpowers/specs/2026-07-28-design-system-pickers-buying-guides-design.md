# Design System Stage 8: Pickers & Buying Guides

## Context

This is Stage 8 of the ongoing UI/UX redesign of "2Go Findz". Stage 7
(Products & Categories) is complete. The originally-tentative "Buying
Guides & Comparisons" scope (~1840 lines across 14 files: 3 picker
components, 2 admin pages, 2 form components, 6 comparison-form tabs, 2
form-page wrappers) is larger and structurally more complex than Stage 7,
so it's split by dependency order:

- **Stage 8 (this doc):** `EntityPicker` (the shared search/select
  primitive — `ProductPicker` and `ComparisonPicker` are unstyled
  wrappers around it, so fixing `EntityPicker` fixes both automatically)
  plus Buying Guides — `BuyingGuidesPage`, `BuyingGuideForm`,
  `BuyingGuideFormPage`. Pickers come first because `BuyingGuideForm`
  already depends on `ProductPicker`, and Stage 9's `ComparisonForm`
  will depend on both `ProductPicker` and `ComparisonPicker`.
- **Stage 9:** Comparisons — `ComparisonsPage`, `ComparisonForm` and its
  6 tab sub-components, `ComparisonFormPage`. Reuses the now-finished
  pickers.
- **Stage 10:** Settings — `SettingsPage` alone.

There is no reference image — the design reuses the exact tokens and
patterns already established and validated in Stage 7 (`primary`,
`danger`, `success`, `muted`, `body`, `heading`, `surface-secondary`,
`border`, `rounded-btn`, `rounded-search`, `text-page-heading`,
`text-small`, the `Button` component including its `to` prop). Every
file in this stage was checked for class-name test assertions during
planning — none exist, so retokenizing is safe everywhere.

## 1. EntityPicker

`EntityPicker.jsx` is the single source of styling for both
`ProductPicker` (used by `BuyingGuideForm` in this stage, and by
Comparisons' `RelatedTab` in Stage 9) and `ComparisonPicker` (used by
`RelatedTab` in Stage 9) — neither wrapper adds its own classes.
Retokenizing it once here benefits both consumers automatically, the
same "shared primitive first" reasoning used for Stage 6's chrome pass
and Stage 8's own pickers-before-forms ordering.

- Label: `text-sm font-medium text-slate-700` → `text-small font-medium
  text-body`.
- Search input: `border-slate-300 ... focus:border-indigo-500
  focus:ring-indigo-500` → `border-border ... focus:border-primary
  focus:ring-primary`; radius `rounded-md` → `rounded-btn`.
- "Searching..." text: `text-slate-400` → `text-muted`.
- Results dropdown (`<ul>`): `border-slate-200 ... shadow-sm` →
  `border-border ... shadow-card`; radius `rounded-md` → `rounded-btn`;
  each result button `text-slate-700 hover:bg-slate-50` → `text-body
  hover:bg-surface-secondary`.
- Selected-item rows (`<li>`): `border-slate-200` → `border-border`;
  radius `rounded-md` → `rounded-btn`; item label `text-slate-700` →
  `text-body`.
- Up/down/remove icon buttons: `text-slate-500 hover:bg-slate-100` →
  `text-muted hover:bg-surface-secondary`; up/down additionally get
  `hover:text-primary` (matching the "edit" semantic used for icon
  actions elsewhere); remove additionally gets `hover:text-danger`
  (matching the "delete" semantic, already present as
  `hover:text-red-600` today, just retokenized).

No change to search debouncing, add/remove/reorder logic, or the
`label`/`inputId`/`searchPlaceholder`/`selectedItems`/`onChange`/
`search`/`getItemLabel` prop API.

## 2. BuyingGuidesPage

Page heading: `text-2xl font-bold text-slate-900` → `text-page-heading
text-heading`.

Primary "Add" action: the hand-rolled `bg-indigo-600 ...
hover:bg-indigo-700` Link is replaced with `<Button
to="/admin/buying-guides/new">`, using the `to` prop added to `Button`
in Stage 7.

Row-level Edit/Delete icon buttons (in the `actions` column's `render`):
retokenized exactly like `ProductsPage`/`CategoriesPage` in Stage 7:
`text-slate-500` → `text-muted`, `hover:bg-slate-100` →
`hover:bg-surface-secondary`, `hover:text-indigo-600` →
`hover:text-primary`, `hover:text-red-600` → `hover:text-danger`.

Status badge (in the `active` column's `render`), mapped onto semantic
tokens the same way Stage 7 mapped Trending/Best Seller/Inactive:
Published (`row.active`) `bg-emerald-100 text-emerald-800` →
`bg-success/10 text-success`; Draft (`!row.active`) `bg-slate-100
text-slate-600` → `bg-surface-secondary text-muted`.

## 3. BuyingGuideForm

Identical field treatment to `ProductForm`/`CategoryForm` in Stage 7:

- Labels (Title, Excerpt, Content, Active checkbox): `text-sm
  font-medium text-slate-700` → `text-small font-medium text-body`.
- Text input and both textareas: `border-slate-300 ...
  focus:border-indigo-500 focus:ring-indigo-500` → `border-border ...
  focus:border-primary focus:ring-primary`; radius `rounded-md` →
  `rounded-btn`.
- Field-level error text: `text-red-600` → `text-danger`.
- Form-level error banner: `bg-red-50 text-red-700` → `bg-danger/10
  text-danger`.
- Cancel/Submit buttons: replaced with `<Button variant="secondary">`
  (Cancel) and `<Button variant="primary" type="submit">` (Submit),
  preserving the existing loading-label logic and `disabled` behavior.

The embedded `<ProductPicker>` needs no direct changes here — it
inherits its retokenized appearance from the `EntityPicker` fix in
Section 1.

No validation, field set, or submit payload changes — presentation only.

## 4. BuyingGuideFormPage

Page heading: `text-2xl font-bold text-slate-900` → `text-page-heading
text-heading`. No other changes.

## Testing

Every component in this stage was checked for class-name assertions in
its existing test file (`EntityPicker.test.jsx`, `BuyingGuideForm.test.jsx`,
`BuyingGuidesPage.test.jsx`, `BuyingGuideFormPage.test.jsx`) — all query
by role/label/text, not class names, so no test updates are needed for
the retokenization itself.

## Out of Scope for This Stage

- `ComparisonsPage`, `ComparisonForm`, its 6 tabs, `ComparisonFormPage` —
  Stage 9.
- `ComparisonPicker` gets no direct changes here (it has no styling of
  its own) but is fully covered by the `EntityPicker` fix — Stage 9
  confirms this when `RelatedTab` is built.
- `SettingsPage` — Stage 10.
- Any change to `EntityPicker`'s search/debounce behavior, add/remove/
  reorder logic, or `BuyingGuideForm`'s validation rules or submit
  payload shape.
