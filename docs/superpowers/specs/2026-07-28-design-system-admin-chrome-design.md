# Design System Stage 6: Admin Chrome

## Context

This is Stage 6 of the ongoing UI/UX redesign of "2Go Findz". Stages 1–5
are complete. The originally-tentative "Admin Dashboard: Sidebar, Topbar,
DataTable, admin forms" scope turned out to be as large as Stages 2+3
combined (8 admin pages, 4 form components, several shared admin-only
components), so — matching the Stage 2 → Stage 3 pattern (shared
components first, page-specific content after) — this is split into:

- **Stage 6 (this doc):** shared admin chrome and primitives —
  `AdminLayout`, `AdminSidebar`, `AdminTopbar`, `DataTable`, `Modal`,
  `ConfirmDialog`, `ImageUploader` — used by every admin page, so
  restyling them cascades benefit everywhere automatically.
- **Stage 7:** the remaining page-specific bespoke markup across the 8
  admin pages (Products, Categories, Buying Guides list+form, Comparisons
  list+form, Settings — Dashboard is already done) and the 4 dedicated
  form components (`ProductForm`, `CategoryForm`, `ComparisonForm` and its
  6 tab sub-components, `BuyingGuideForm`), plus `EntityPicker`/
  `ProductPicker` (deferred here since they're tied to those specific form
  workflows, not general chrome).

There is no reference image for this stage — the design is driven
entirely by the tokens already established in Stages 1–5 (`primary` blue,
`amazon` orange, `danger`/`success`/`warning`/`info`, the typography
scale, `rounded-card`/`shadow-card`/`shadow-dropdown`/`shadow-navbar`).

**One decision locked in during brainstorming:** the admin sidebar
currently uses a permanent dark background (`bg-slate-900`), distinct
from the rest of the light-mode site. It switches to light in this
stage, matching the rest of the redesign, rather than staying as a
deliberate dark-chrome element.

## 1. AdminLayout, AdminSidebar, AdminTopbar

`AdminLayout.jsx`: outer background `bg-slate-50` → `bg-surface-secondary`.

`AdminSidebar.jsx`: `bg-slate-900 text-slate-200` → `bg-white border-r
border-slate-200`; active nav link `bg-indigo-600 text-white` →
`bg-primary/10 text-primary`; inactive nav link `hover:bg-slate-800` →
`text-body hover:bg-slate-100`; Logout button `text-slate-300
hover:bg-slate-800` → `text-body hover:bg-slate-100`. Structure
(desktop persistent panel + mobile slide-over) unchanged.

`AdminTopbar.jsx`: header `border-b border-slate-200 bg-white` → same,
plus `shadow-navbar` (matching the public `Navbar`'s sticky treatment,
even though this topbar isn't sticky — the shadow signals "chrome
boundary" consistently across both navs); breadcrumb `text-sm
text-slate-500` → `text-small text-muted`; user name `text-sm font-medium
text-slate-700` → `text-small font-medium text-heading`.

## 2. DataTable

Wrapper `rounded-lg border-slate-200 bg-white` → `rounded-card
border-slate-200 bg-white shadow-card`; header row `bg-slate-50` →
`bg-surface-secondary`; header text `text-slate-500` → `text-muted`;
sortable-column button hover `hover:text-slate-700` → `hover:text-primary`;
body cell text `text-slate-700` → `text-body`. Sorting/rendering behavior
and the `columns`/`rows`/`sortKey`/`sortDirection`/`onSortChange`/
`isLoading`/`emptyState` prop API are unchanged.

## 3. Modal, ConfirmDialog, and a new Button `danger` variant

**New `Button` variant:** `frontend/src/components/Button.jsx` gains a
fourth `variant="danger"` (`bg-danger text-white shadow-card
hover:bg-red-700`), alongside the existing `primary`/`secondary`/`amazon`.
This uses the `danger` color token established in Stage 1 but never
given a Button treatment — every admin delete/deactivate confirmation
needs a destructive-styled action button, and none of the three existing
variants fit that semantically.

`Modal.jsx`: dialog panel `rounded-xl ... shadow-lg` → `rounded-card ...
shadow-dropdown`; title `text-lg font-semibold text-slate-900` →
`text-card-title text-heading`. Focus-trap and portal behavior unchanged.

`ConfirmDialog.jsx`: message `text-sm text-slate-600` → `text-body`;
both buttons become `<Button>` — Cancel is `variant="secondary"`;
Confirm is `variant="danger"` when `isDestructive` is true, otherwise
`variant="primary"` (preserves the existing `isDestructive` prop's
meaning, just expressed through the new Button variant instead of an
inline conditional class string).

## 4. ImageUploader

Label `text-sm font-medium text-slate-700` → `text-small font-medium
text-body`; preview box `rounded-lg border-slate-200 bg-slate-50` →
`rounded-card border-border bg-surface-secondary`; upload trigger
`rounded-md border-slate-300 text-slate-700 hover:bg-slate-50` →
`rounded-btn border-border text-body hover:bg-slate-50`; error text
`text-red-600` → `text-danger`.

Kept as a styled `<label>` wrapping a hidden file input, **not** converted
to the `Button` component — `Button`'s polymorphic `<button>`/`<a>`
design has no mode for "label wrapping a hidden file input," and adding
one would overcomplicate `Button` for its one consumer here.

## Testing

Every component in this stage was checked for class-name assertions in
its existing test file:

- `AdminSidebar.test.jsx`, `AdminTopbar.test.jsx`, `DataTable.test.jsx`,
  `Modal.test.jsx`, `ImageUploader.test.jsx`: role/text/attribute-based
  only — no changes needed.
- `ConfirmDialog.test.jsx`: needs checking during planning for any
  assertion tied to the old inline destructive-button class string
  (`bg-red-600`) — if present, updated to match the new `danger` Button
  variant's rendered classes.
- `Button.test.jsx`: gains new tests for the `danger` variant, mirroring
  the existing `primary`/`secondary`/`amazon` variant tests.

## Out of Scope for This Stage

- No changes to any of the 8 admin pages' own bespoke markup, the 4 form
  components, or `EntityPicker`/`ProductPicker` — Stage 7.
- No animation changes beyond what's already in place.
- No changes to `DataTable`'s sorting logic, `Modal`'s focus-trap logic,
  or `ImageUploader`'s upload/validation logic — presentation only.
