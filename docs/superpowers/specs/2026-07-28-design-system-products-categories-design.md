# Design System Stage 7: Products & Categories

## Context

This is Stage 7 of the ongoing UI/UX redesign of "2Go Findz". Stage 6
(shared admin chrome: `AdminLayout`, `AdminSidebar`, `AdminTopbar`,
`DataTable`, `Modal`, `ConfirmDialog`, `ImageUploader`) is complete. The
originally-tentative "page-specific admin content" scope (8 admin pages +
4 form components + 6 comparison-form tabs + 3 pickers) is too large for
one stage, so — matching the Stage 5/6 split pattern — it's divided by
feature domain:

- **Stage 7 (this doc):** Products & Categories — `ProductsPage`,
  `ProductForm`, `ProductFormPage`, `CategoriesPage`, `CategoryForm` — the
  core, most-used catalog management pages.
- **Stage 8:** Buying Guides & Comparisons — `BuyingGuidesPage`,
  `BuyingGuideForm`, `BuyingGuideFormPage`, `ComparisonsPage`,
  `ComparisonForm` and its 6 tab sub-components, `ComparisonFormPage`,
  plus `EntityPicker`/`ProductPicker`/`ComparisonPicker`.
- **Stage 9:** Settings — `SettingsPage` alone.

There is no reference image for this stage — the design is driven
entirely by the tokens already established in Stages 1–6 (`primary`
blue, `amazon` orange, `danger`/`success`/`warning`/`info`, the
typography scale, `rounded-btn`/`rounded-card`/`rounded-search`,
`shadow-card`/`shadow-dropdown`).

This stage also includes a small touch-up pass on three shared list-page
controls — `SearchInput`, `FilterDropdown`, `Pagination` — that are
reused by every list page across all three sub-stages. They're already
mostly tokenized from earlier work; fixing their few remaining ad-hoc
classes now cascades the benefit to Stage 8 and 9 automatically, the same
reasoning used for Stage 6's chrome pass. `ErrorState` and `EmptyState`
are already fully tokenized — no changes needed there.

## 1. Button: new `to` prop for router navigation

`Button.jsx` currently renders `<a href>` when given `href`, or
`<button>` otherwise. `ProductsPage`'s "Add Product" action is a
react-router `<Link to="/admin/products/new">` styled to look like a
button — `href` can't express client-side navigation. This same pattern
recurs in `BuyingGuidesPage` and `ComparisonsPage` (Stage 8), so it's
worth fixing once here rather than duplicating Button's class recipe as
a raw string on every page.

Add a `to` prop: when present, `Button` renders react-router's `<Link
to={to}>` instead of `<a>`/`<button>`, using the same computed
`classes` string. `href` and no-prop behavior are unchanged — this is
additive, not a breaking change.

```jsx
import { Link } from 'react-router-dom';
// ...
function Button({ variant = 'primary', size = 'md', href, to, className = '', children, ...rest }) {
  const classes = `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
```

## 2. ProductsPage & CategoriesPage

Page heading: `text-2xl font-bold text-slate-900` → `text-page-heading
text-heading` on both pages, matching the precedent already set by
`DashboardPage` in Stage 5.

Primary "Add" action: both pages' hand-rolled `bg-indigo-600 ...
hover:bg-indigo-700` button markup is replaced with `<Button
variant="primary">` — `ProductsPage` uses the new `to="/admin/products/new"`
prop; `CategoriesPage` keeps its existing `onClick` (it opens a `Modal`,
not a route).

Icon action buttons (Edit/Delete per row, in each page's `columns`
definition): kept as plain `<Link>`/`<button>` — not converted to
`Button`, which has no icon-only compact size and would need one just
for this — but retokenized: `text-slate-500` → `text-muted`,
`hover:bg-slate-100` → `hover:bg-surface-secondary`,
`hover:text-indigo-600` → `hover:text-primary`, `hover:text-red-600` →
`hover:text-danger`.

`ProductsPage` status badges (in the `badges` column's `render`), mapped
from raw Tailwind colors onto existing semantic tokens: Trending
`bg-amber-100 text-amber-800` → `bg-warning/10 text-warning`; Best Seller
`bg-emerald-100 text-emerald-800` → `bg-success/10 text-success`;
Inactive `bg-slate-100 text-slate-600` → `bg-surface-secondary
text-muted`.

`CategoriesPage`'s raw search `<input>` (not the shared `SearchInput`
component — it does client-side filtering of already-loaded categories,
not the debounced server search `SearchInput` is built for, so it stays
a separate raw input): `border-slate-300 focus:border-indigo-500
focus:ring-indigo-500` → `border-border focus:border-primary
focus:ring-primary`, radius `rounded-md` → `rounded-search` to match
`SearchInput`'s own radius since both are search-type inputs.

## 3. ProductForm & CategoryForm

Both forms get the identical field treatment:

- Labels: `text-sm font-medium text-slate-700` → `text-small font-medium
  text-body`.
- Text/number/select/textarea inputs: `border-slate-300 ...
  focus:border-indigo-500 focus:outline-none focus:ring-2
  focus:ring-indigo-500` → `border-border ... focus:border-primary
  focus:outline-none focus:ring-2 focus:ring-primary`; radius `rounded-md`
  → `rounded-btn`.
- Field-level error text: `text-red-600` → `text-danger`.
- Form-level error banner: `bg-red-50 text-red-700` → `bg-danger/10
  text-danger`, matching `ErrorState`'s existing pattern exactly.
- Checkboxes (`ProductForm`'s Trending/Best Seller/Active) and their
  labels: label text `text-sm font-medium text-slate-700` → `text-small
  font-medium text-body`; checkbox input left with native browser
  styling (not a design-system concern at this scale).
- Cancel/Submit buttons: replaced with `<Button variant="secondary">`
  (Cancel) and `<Button variant="primary" type="submit">` (Submit),
  mirroring `ConfirmDialog`'s Stage 6 treatment. Submit's existing
  loading-label logic (`isSubmitting ? 'Saving...' : ...`) and `disabled`
  behavior are preserved as children/props of `Button`.

No validation logic, field state, or submit/cancel behavior changes —
presentation only.

## 4. ProductFormPage

Page heading: `text-2xl font-bold text-slate-900` → `text-page-heading
text-heading`. No other changes — the rest of the page just composes
`ProductForm`, `LoadingSpinner`, and `ErrorState`, all already handled.

## 5. Shared list controls: SearchInput, FilterDropdown, Pagination

Small cleanup pass — each already uses most current tokens; only the
remaining ad-hoc classes change:

- `FilterDropdown.jsx`: select `rounded-md` → `rounded-btn`;
  `text-slate-900` → `text-heading`.
- `Pagination.jsx`: nav buttons `rounded-md` → `rounded-btn`; prev/next
  icons `text-slate-500` → `text-muted`; page-number default state
  `text-slate-700` → `text-body`; all `hover:bg-slate-100` →
  `hover:bg-surface-secondary`. The active-page `bg-primary text-white`
  state is already correct and unchanged.
- `SearchInput.jsx`: already fully tokenized — no changes.

## Testing

Every component in this stage was checked for class-name assertions in
its existing test file — `CategoryForm.test.jsx`, `ProductForm.test.jsx`,
`ProductsPage.test.jsx`, `CategoriesPage.test.jsx` all assert on
role/text/attribute, not class names, so no test updates are needed for
the retokenization itself.

`Button.test.jsx` gains new tests for the `to` prop (renders a
react-router `Link` with the given `to` and the computed classes),
mirroring the existing `href` tests. Tests that render `Button` with `to`
need a `MemoryRouter` wrapper, matching how `ProductsPage.test.jsx`
already wraps its own router-dependent renders.

## Out of Scope for This Stage

- Buying Guides, Comparisons, Settings pages and their forms — Stage 8
  and Stage 9.
- `EntityPicker`, `ProductPicker`, `ComparisonPicker` — Stage 8 (tied to
  those forms' workflows).
- Any change to `ProductForm`/`CategoryForm` validation rules, field set,
  or submit payload shape.
- Any change to `ProductsPage`/`CategoriesPage` search, filter, sort, or
  pagination logic — presentation only.
- No icon-only size/variant added to `Button` — deferred until a stage
  actually needs to convert icon action buttons, to avoid growing
  `Button`'s API for a single untested use case.
