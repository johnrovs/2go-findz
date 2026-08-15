# System Settings Visual Refresh — Design Spec

## Goal

Apply the visual language established by the Products and Categories redesigns to the System Settings admin page (`SettingsPage.jsx`) — bordered cards, taller fields, dropzone image uploaders, the orange accent submit button — without restructuring the page, since Settings has a fundamentally different shape than a Product or Category form.

## Why this is a visual pass, not a structural rebuild

Settings is a single persistent object with one form and one "Save Changes" button — there's no Add/Edit distinction, no list to navigate back to, and no separate create/edit route. It's also four unrelated concern groups (Branding & Hero Images, Hero Content, Social Links, Shop Info & Disclosure) rather than one entity with one image, so the Product form's two-column "entity info | image" layout has nothing to map onto here. The existing four-section vertical stack is kept; only the visual treatment of each section changes.

## Scope

Applies only to `frontend/src/pages/admin/SettingsPage.jsx` and its test file. Out of scope: `ImageUploader.jsx` itself (see landmine below — not modified), backend, any other admin page.

## Landmine identified and how it's handled

Switching the three `ImageUploader` instances (Logo, Hero Image, Product Placeholder Image) to `variant="dropzone"` changes their hidden file inputs' accessible name from the current regex-matched "Upload Image" text to a fixed literal string, `"Upload product image"` — set by the dropzone markup itself, **not** derived from each instance's own `label` prop. This means all three uploaders on this page will share the *same* accessible name for their hidden inputs, rather than being individually distinguishable ("Upload Logo", "Upload Hero Image", etc.).

Two ways to handle this were considered:
1. **Modify `ImageUploader.jsx` to derive the aria-label from its `label` prop** — rejected. This component is already shipped and used by the Add/Edit Product and Add/Edit Category pages, whose tests assert the exact literal string `'Upload product image'` (case-sensitive). Product/Category's dropzone calls don't pass an explicit `label` prop, so deriving the aria-label from the default `label = 'Product Image'` would produce `"Upload Product Image"` (capital P) — a casing mismatch that breaks those already-merged tests. Not worth the cross-feature risk for a page that doesn't strictly need it.
2. **Accept the shared accessible name, target uploaders by DOM order in tests** (chosen) — the existing test already does this today with the current square-variant markup (`screen.getAllByLabelText(/upload image/i)[1]` to reach the second, Hero uploader). The fix is mechanical: update the query to the dropzone's exact string, keeping the same index-based targeting (`screen.getAllByLabelText('Upload product image')[1]`). The visible label text above each uploader ("Logo", "Hero Image", "Product Placeholder Image") still gives sighted and most screen-reader users context before reaching each file input in reading order.

## Changes

1. **Heading**: `text-page-heading` + subtitle ("Manage your storefront's branding, content, and contact information."), matching `ProductsPage`/`CategoriesPage`.
2. **Section cards**: add `border border-slate-200` to all four `<section>` cards (currently `rounded-card bg-white p-6 shadow-card` with no border).
3. **Field height**: all text/textarea/email inputs move from `px-3 py-2` to the `py-2.5` height standard elsewhere.
4. **Required marker**: Affiliate Disclosure (the only field with required validation) gets the outside-the-`<label>` asterisk pattern established in the Product/Category redesigns, to avoid the same `getByLabelText` accessible-name landmine hit before.
5. **Images**: all three `ImageUploader` calls gain `variant="dropzone"`. No change to `imageFileName`/`onChange` wiring or validation.
6. **Submit button**: `<Button type="submit">` gains `variant="accent"` (orange), matching Products/Categories. Label/disabled/loading text unchanged ("Save Changes" / "Saving...").
7. **Width**: the `<form>`'s `max-w-2xl` constraint is removed so section cards use the full available width, consistent with the Products/Categories cards. The Social Links grid (`sm:grid-cols-2`) is unaffected by this — it already reflows based on available width.
8. **Not changed**: the four-section structure and order, all validation logic (`validate()`, email regex, required-disclosure check), the submit payload shape, `normalizeSettings`, load/error/retry behavior, and the absence of a Cancel button (nothing to cancel back to).

## Testing plan

`SettingsPage.test.jsx`: one required change — the image-upload test's `screen.getAllByLabelText(/upload image/i)[1]` becomes `screen.getAllByLabelText('Upload product image')[1]`, per the landmine above. Every other existing assertion (pre-fill, validation errors, submit payload, success toast, server field-error mapping, load-error retry) is unaffected, since none of them depend on section border/field-height/button-color/width changes.

## Final manual verification

1. Compare `/admin/settings` against `/admin/products` and `/admin/categories` for visual consistency (bordered cards, field height, orange button).
2. Confirm all three dropzone uploaders work independently (click-to-upload and drag-and-drop each), and that the existing image for Logo still previews correctly on load.
3. Exercise: clear Affiliate Disclosure and submit (validation error appears), enter an invalid contact email and submit (validation error appears), make a real edit and save successfully (toast appears, values persist on reload).
4. Resize to tablet/mobile, confirm no horizontal overflow and the Social Links grid still stacks reasonably.
5. Run `npm test`, `npm run lint`, `npm run build`.
