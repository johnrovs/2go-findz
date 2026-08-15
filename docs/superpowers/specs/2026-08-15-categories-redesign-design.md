# Product Categories Redesign — Design Spec

## Goal

Apply the visual language and structural patterns already shipped for Products Management (list page + Add/Edit Product form) to the Product Categories admin pages, adapted for Categories' much smaller data model (name, commission rate, optional image — no status, no visibility flags, no scheduling).

## Scope

Applies to the Categories list page (`CategoriesPage.jsx`) and a new dedicated Add/Edit Category page (new `CategoryFormPage.jsx` + restructured `CategoryForm.jsx`), replacing the current Modal-based add/edit flow. Out of scope: any backend changes (no new endpoints, no pagination infra, no product-count field), `AdminSidebar`, and every other admin page.

## Conflict resolved with the user before implementation

**Modal vs. dedicated page for Add/Edit Category** — converted to a dedicated page (`/admin/categories/new`, `/admin/categories/:id`), matching `ProductFormPage`'s structure, rather than keeping the existing Modal. The form's right column only has the image dropzone (no Visibility/Schedule panels, since categories have neither concept) — a proportionately sparser page than Products', by design, not an oversight.

## Design tokens

No new tokens. Reuses everything already established by the Products redesign: `dashboard-purple`, the `accent` (orange) Button variant, `rounded-card`/`rounded-btn`, `SearchInput`, `DataTable`'s `headerClassName` gradient prop, `ImageUploader`'s `dropzone` variant, the required-asterisk-outside-`<label>` pattern.

## Component changes

### 1. `CategoriesPage.jsx` (list page, restyled)

```
Product Categories                                    [+ Add Category]
Organize your storefront's product categories.

┌─────────────────────────────────────────────────────────────────┐
│ [Search categories...]                                          │
│ N categories                                                    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ IMAGE │ Category Name │ Commission Rate │ Created │ ACTIONS │ │  ← gradient header
│ ├───────┼────────────────┼─────────────────┼─────────┼─────────┤ │
│ │  ...  │      ...       │       ...       │   ...   │ (E)(D)  │ │  ← circular outline actions
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

- Heading: `text-page-heading` + subtitle, matching `ProductsPage.jsx`.
- "Add Category" becomes `<Button to="/admin/categories/new" variant="accent">` (was a Modal-opening `onClick`).
- Search: swaps the current plain `<input>` for the `SearchInput` component; keeps `aria-label="Search categories"` so the existing search test is unaffected.
- Card wrapper: same `rounded-card border border-slate-200 bg-white shadow-card` as `ProductsPage.jsx`.
- Count text: "N categories" (client-side count of the already-fetched list — no backend change).
- **Not added**: Sort-by dropdown, Status/Type filter dropdowns, rows-per-page, pagination nav. Categories have no status concept, and `getCategories()` returns a flat list, not a `Page` — these Products-only controls have nothing to attach to. Column-click sorting (already functional, already backend-backed via `sortBy`/`direction` params) is preserved unchanged.
- Table: `DataTable` gets the same `headerClassName={TABLE_HEADER_GRADIENT}` gradient and taller-row treatment as Products.
- Row actions: circular outline Edit/Delete buttons matching Products. Edit becomes `<Link to={`/admin/categories/${row.id}`}>` (was a Modal-opening click); Delete stays a button opening the existing `ConfirmDialog`.
- Delete flow: entirely unchanged — same `ConfirmDialog`, same toast-based surfacing of the backend's "category has products assigned" (`CategoryInUseException`) rejection.

### 2. `CategoryFormPage.jsx` (new)

Mirrors `ProductFormPage.jsx`:
- "← Back to Categories" link → `navigate('/admin/categories')`.
- Heading: "Add Category" / "Edit Category". Subtitle: "Create a new category to organize your storefront." / "Update this category's details."
- Edit-mode data loading: `adminCategoryService.js` has no `getCategoryById` today (only a list endpoint). Rather than add a new backend endpoint for this, edit mode calls the existing `getCategories()` and finds the matching `id` client-side. This keeps the change entirely frontend-scoped, consistent with "no backend changes" — acceptable given the category list is small and already fetched via one cheap call.
- On submit: `createCategory`/`updateCategory` (unchanged), success toast, `navigate('/admin/categories')`.

### 3. `CategoryForm.jsx` (restructured, same white-card two-column shell as `ProductForm.jsx`)

```
┌───────────────────────────────────────────┬─────────────────────┐
│ Category Information                       │ Category Image      │
│ Enter the category name and commission     │ [dashed dropzone]   │
│ rate for your storefront.                  │                     │
│                                             │                     │
│ Category Name *                            │                     │
│ [                                        ]  │                     │
│                                             │                     │
│ Commission Rate (%) *                      │                     │
│ [                                    %  ]   │                     │
│                                             │                     │
├─────────────────────────────────────────────────────────────────┤
│ * Required fields                    [Cancel]  [Add Category]     │
└─────────────────────────────────────────────────────────────────┘
```

- Left column: **Category Name** (full width, required, same field styling as Products). **Commission Rate (%)** (required, 0–100, same field styling with a `%` suffix decoration — mirrors Products' `$` prefix technique, just on the right side of the input).
- Right column: `ImageUploader` `variant="dropzone"` only — no Visibility or Schedule panels (nothing in the data model to back them).
- Footer: `* Required fields`, Cancel (secondary), Add Category / Save Changes (`accent` orange), same disabled-while-submitting behavior.
- Both required-field asterisks use the same outside-the-`<label>` sibling pattern established in the Product form redesign, to avoid breaking `getByLabelText('Category Name')` / `getByLabelText('Commission Rate (%)')`.
- All validation, payload shape (`{ productCategoryName, commissionRate, imageFileName }`), and server field-error mapping are unchanged from today's `CategoryForm.jsx`.

## Testing plan

- `CategoriesPage.test.jsx`: the existing create/edit tests (currently driven through the Modal via `within(dialog)`) are converted to route-based tests using `MemoryRouter` + `Routes`, matching `ProductFormPage.test.jsx`'s pattern — navigating to `/admin/categories/new` or clicking Edit and asserting navigation to `/admin/categories/:id`. All other existing tests (render, image thumbnail/placeholder, search filter, sort toggle, delete confirm, delete-blocked toast, empty state, error state) are unaffected by this change and keep passing as-is.
- `CategoryForm.test.jsx`: unaffected — it already tests the component directly via props, not through the Modal wrapper.
- `CategoryFormPage.test.jsx` (new): mirrors `ProductFormPage.test.jsx` — create mode renders empty form, back-link navigates to the list, edit mode loads and pre-fills via the client-side list lookup, error state when the category id isn't found in the list.

## Final manual verification

1. Compare the restyled Categories list page against the Products list page for visual consistency (gradient header, card wrapper, search styling, circular actions, heading/subtitle treatment).
2. Compare Add/Edit Category page against Add/Edit Product page's shell (back-link, heading, white card, two-column grid, footer) — right column correctly shows only the image dropzone.
3. Exercise: search, column-click sort, Add Category → create → toast → navigate back → list shows the new category; Edit → pre-filled fields including image preview → Save Changes → toast → navigate back → list reflects the update; Delete → confirm → toast; attempt to delete a category with products assigned → in-use error toast, row stays.
4. Resize to tablet/mobile, confirm no horizontal overflow on both pages.
5. Run `npm test`, `npm run lint`, `npm run build`.
