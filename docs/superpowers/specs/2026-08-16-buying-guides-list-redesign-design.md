# Buying Guides List Page Redesign — Design Spec

## Goal

Apply the visual language already shipped for Products, Categories, and System Settings to the Buying Guides list page (`BuyingGuidesPage.jsx`) — gradient table header, card wrapper, circular row actions, `StatusBadge` — and fix a real gap where the status badge silently ignores scheduled guides.

## Scope

Applies only to `frontend/src/pages/admin/BuyingGuidesPage.jsx` and its test file. The multi-step editor (`BuyingGuideForm.jsx` and everything under `frontend/src/components/buying-guide-form/`, ~9,000 lines) is explicitly out of scope — it's a purpose-built content-authoring tool (sticky `EditorHeader` with Preview/Save Draft/Publish actions, a `Stepper`, per-step panels for SEO, TOC, product recommendations, etc.), not a flat entity form, and forcing the Product form's two-column layout onto it would be a mismatch rather than an improvement. This was explicitly confirmed with the user before design.

No backend changes: `GET /admin/buying-guides` takes no query parameters (no sort, search, or pagination) and none are added here — that would be new functionality, not a restyle, and wasn't requested.

## Real fix bundled with the restyle

The current status badge only distinguishes Published (`active: true`) from Draft (`active: false`), silently ignoring guides with a `scheduledPublishAt` set — a guide scheduled for future publication shows as plain "Draft" today, with no way to tell it apart from a guide with no schedule at all. The editor's `EditorHeader` already has the correct 3-state vocabulary via a local `deriveStatus(guide)` helper in `BuyingGuideForm.jsx`:

```js
function deriveStatus(guide) {
  if (!guide) return 'Draft';
  if (guide.active) return 'Published';
  if (guide.scheduledPublishAt) return 'Scheduled';
  return 'Draft';
}
```

This function is not exported. Rather than exporting it and importing it into `BuyingGuidesPage.jsx` (a cross-file coupling for a 4-line pure function), the same logic is duplicated directly in `BuyingGuidesPage.jsx` — matching the existing convention in this codebase, where small pure helpers like `formatDate` are already independently duplicated in `ProductsPage.jsx`, `CategoriesPage.jsx`, and `BuyingGuidesPage.jsx` rather than shared.

## Changes

1. **Heading**: `text-page-heading` + subtitle ("Manage in-depth buying guides for your storefront."), matching `ProductsPage`/`CategoriesPage`.
2. **"Add Guide" button**: already a route link (`to="/admin/buying-guides/new"`) — gains `variant="accent"` (orange) and the same `size="sm"` treatment.
3. **Card wrapper**: `rounded-card border border-slate-200 bg-white shadow-card` containing a "N buying guides" count line above the table (no search/sort/pagination controls — none exist today).
4. **Table**: `DataTable` gains `headerClassName={TABLE_HEADER_GRADIENT}` (the same arbitrary-value gradient class already used by Products/Categories).
5. **Status column**: replaces the current bespoke inline `<span>` with `StatusBadge`, using the duplicated `deriveStatus()` logic:
   - `Published` → `<StatusBadge variant="published">Published</StatusBadge>`
   - `Scheduled` → `<StatusBadge variant="scheduled">Scheduled</StatusBadge>`
   - `Draft` → `<StatusBadge variant="inactive">Draft</StatusBadge>` (reusing the existing gray "inactive" visual treatment with different label text — `StatusBadge`'s `children` prop already supports this, no change to `StatusBadge.jsx` itself)
6. **Row actions**: circular outline Edit/Delete buttons (`h-8 w-8 rounded-full border`), matching Products/Categories. Edit stays a `Link` to `/admin/buying-guides/:id` (unchanged destination); Delete stays a button opening the existing `ConfirmDialog`.
7. **Not changed**: the editor and everything under it, `ConfirmDialog`'s message/behavior, `loadGuides`/`handleDeleteConfirm` logic, the `EmptyState`/`ErrorState` copy.

## Testing plan

`BuyingGuidesPage.test.jsx`: the existing three tests (render list + "Published" badge, empty state, delete via confirm dialog) are unaffected by the visual changes and keep passing unchanged — `StatusBadge` still renders the literal text "Published" for an `active: true` guide, so `screen.getByText('Published')` still resolves. Two new tests are added: a guide with `active: false` and a future `scheduledPublishAt` renders "Scheduled"; a guide with `active: false` and no `scheduledPublishAt` renders "Draft".

## Final manual verification

1. Compare `/admin/buying-guides` against `/admin/products` and `/admin/categories` for visual consistency (gradient header, card wrapper, circular actions, heading/subtitle, orange button).
2. Confirm a real scheduled guide (if one exists in dev data, or create one via the editor's "Schedule" action) shows the new "Scheduled" badge instead of "Draft".
3. Exercise: Add Guide navigation, Edit navigation, Delete → confirm → toast.
4. Resize to tablet/mobile, confirm no horizontal overflow.
5. Confirm the editor itself (`/admin/buying-guides/new` and `/admin/buying-guides/:id`) is visually and functionally untouched.
6. Run `npm test`, `npm run lint`, `npm run build`.
