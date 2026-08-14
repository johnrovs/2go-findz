# Add/Edit Product Form Redesign — Design Spec

## Goal

Restyle the Add Product / Edit Product form (`ProductFormPage.jsx` + `ProductForm.jsx`) to match a reference image pixel-accurately on desktop: a two-column layout inside one white card, a purple/orange accent scheme, toggle switches instead of checkboxes, and a restyled shared admin topbar — while preserving all existing create/update behavior, validation, and API contracts exactly.

## Scope

Applies to **both** `/admin/products/new` and `/admin/products/:id`, since both routes render the same `ProductFormPage` → `ProductForm` components. Diverging them into two separate designs was considered and rejected — it would fork a shared component for no functional reason and leave the admin UI visually inconsistent between create and edit.

Out of scope: `AdminSidebar.jsx`, backend, routes, `adminProductService.js`, `adminCategoryService.js`, `adminImageService.js`, and every other admin page's content (only their shared topbar chrome changes, per the decision below).

## Conflicts resolved with the user before implementation

1. **Add vs. Add+Edit scope** — apply to both (shared component, avoids UI divergence).
2. **Avatar+role placement** — added to the shared `AdminTopbar` (affects every admin page's topbar uniformly) rather than a one-off header scoped only to the product form pages. Small, consistent change; reuses an avatar pattern that already existed, dormant, in `DashboardHeader.jsx`.
3. **Avatar style** — initial-letter circle (not a photo), since no profile-photo upload feature exists anywhere in the app. `user.role` (`'ADMIN'`) is mapped to a display label (`'Administrator'`) rather than rendered raw.
4. **Active toggle + Schedule for later interaction** — preserves today's exact behavior: the Active row is omitted entirely from Product Visibility while Schedule for later is on (a scheduled product is forced inactive until it publishes). Matches the existing passing test in `ProductForm.test.jsx`.

## Design tokens (reused, none new)

| Reference ask | Existing token | Value |
|---|---|---|
| Primary purple `#5B2CF2` | `dashboard-purple` | `#5b2cf2` (exact match) |
| Purple accent / focus | `primary` (admin-scope) | `#7C3AED` |
| Orange button `#FF7A00`/`#FF8A00` | `dashboard-orange` (via `Button` `accent` variant) | `#ff6b00` |
| Border `#E5EAF2` | `border` | `#E5E7EB` |
| Main text `#0B1629` | `heading` | `#111827` |
| Secondary text `#475467` | `body` | `#4B5563` |
| Muted text `#667085` | `muted` | `#9CA3AF` |
| Error `#EF4444` | `danger` | `#EF4444` |
| Container radius 12–14px | `rounded-card` | `18px` (reused for app-wide consistency with `ProductsPage.jsx`'s card) |
| Field radius 9–11px | `rounded-btn` | `12px` (reused — every other input in the app already uses this) |

No new CSS variables or Tailwind color entries are introduced.

## Component changes

### 1. `AdminTopbar.jsx` (global, additive)

Right side changes from a bare name to:

```
[J]  John Rommel Rovero
     Administrator
```

- Circle: `bg-dashboard-purpleLight text-dashboard-purple`, first character of `user.fullName`.
- Role: small `ROLE_LABELS = { ADMIN: 'Administrator' }` map; falls back to the raw `user.role` value (or `'Administrator'` if absent) so an unmapped future role never disappears silently.
- Renders on every admin page that currently shows `AdminTopbar` (unchanged: still returns `null` on `/admin` and the Buying Guide editor routes).

### 2. `ProductFormPage.jsx`

Adds, above the existing conditional render:

```
← Back to Products

Add Product                          (or "Edit Product" in edit mode)
Create a new product and prepare it for your storefront.
```

- Back link: `text-dashboard-purple`, left-arrow icon (`lucide-react` `ArrowLeft`), `onClick={() => navigate('/admin/products')}` — same destination as the existing Cancel button.
- Heading: `text-page-heading` token (existing, same one `ProductsPage.jsx` uses).
- Edit-mode subtitle (new copy, since the reference only shows Add): `Update this product's details and Amazon listing information.`

### 3. `ProductForm.jsx` (restructured)

Wrapped in one white card: `rounded-card border border-slate-200 bg-white shadow-card p-6`.

Two-column grid inside, `lg:grid-cols-[2fr_1fr]` (a 2:1 ratio — 66.7%/33.3%, the closest clean grid-track expression of the reference's ~68%/32% split) with a vertical divider (a left border on the right column), collapsing to a single stacked column below `lg`.

**Left column — Product Information:**

```
Product Information
Enter the product details and Amazon listing information.

Product Name * (≈55%)              Brand (≈45%)
SKU                                  Category * (select)
Description (full width, textarea, 0/500 counter)
Price ($) * (with $ prefix)         Amazon Affiliate Link * (with link icon)
```

- All existing state, validation, and submit-payload logic is unchanged — this is a markup/styling restructure, not a logic rewrite.
- Description gains a **frontend-only** `maxLength={500}` and a live `{description.length} / 500` counter. The backend has no length constraint on `description` today, so this is a new soft cap, not a backend contract change.
- Price input: `$` rendered as an absolutely-positioned prefix inside a relative wrapper; the underlying `<input type="number" step="0.01" min="0">` and its validation are untouched.
- Amazon Affiliate Link input: a link icon prefix (same wrapper technique), placeholder changed to `https://amazon.com/dp/...`; the existing `^https://.+` validation regex is untouched (no new Amazon-domain enforcement — not requested).

**Right column — Product Image, Product Visibility, Schedule for later:**

```
Product Image
[dashed-border dropzone]

Product Visibility
  Active        [switch]   "Visible on the storefront"
  Trending      [switch]   "Feature in Trending"
  Best Seller   [switch]   "Show the Best Seller badge"

Schedule for later                                  [switch]
  (when on) Select date [icon]   Select time [icon]
```

- Product Visibility panel: one bordered container, three `ToggleSwitch` rows with thin `divide-y` separators. Active row is omitted entirely when `isScheduled` is true (see resolved conflict #4).
- Schedule for later: separate bordered panel, one `ToggleSwitch` row. When on, reveals two icon-labeled fields (calendar/clock) that are visually split but both write to the same existing `scheduledPublishAt` state/input — the existing single `datetime-local` value, submit-time formatting (`${value}:00`, no timezone conversion), and future-date validation are all unchanged.

### 4. `ToggleSwitch.jsx` (new, reusable)

Extracted from the existing inline "Schedule for later" switch markup, since the redesign needs the identical title+helper-text+switch pattern four times (Active, Trending, Best Seller, Schedule for later) instead of once.

```jsx
ToggleSwitch({ label, helperText, checked, onChange, id })
```

- Renders the title, helper text, and an accessible `role="switch"` button (`aria-checked`, `aria-label`) — same accessibility contract the current Schedule switch already has.
- Used by both the Product Visibility panel and the Schedule for later panel.

### 5. `ImageUploader.jsx` (additive-only)

New opt-in `variant="dropzone"`. Existing `variant="square"` (default) and `variant="wide"` are **byte-for-byte unchanged** — both remain used as-is by `CategoryForm.jsx`, `BasicInfoStep.jsx` and `AdvancedSeoPanel.jsx` (Buying Guide form), `BasicInfoTab.jsx` (Comparison form), and `SettingsPage.jsx`.

Dropzone variant, empty state:
- Dashed purple border box, centered upload icon, "Upload product image", "PNG, JPG or WebP · Max 5MB", and a white-background/purple-border "Choose Image" button.
- Clicking the box or the button opens the file picker; native HTML5 drag-and-drop (`onDragOver`/`onDrop`) onto the box feeds the same file through the existing validation pipeline (`ALLOWED_TYPES`, `MAX_SIZE_BYTES`, `uploadImage` service call) — no new validation rules, just a new entry point into the same function.

Dropzone variant, filled state (not shown in the reference, which only captures the empty state — carried over from the existing `wide` variant's convention for consistency): preview image fills the box with a small overlay remove (×) button; the button below switches to "Change Image". Reuses the existing remove/replace behavior, restyled to match the dashed-box look.

## Validation (unchanged except where noted)

All preserved exactly: required name, required category, required price (non-negative), required Amazon link (`^https://.+`), required future scheduled date when scheduling is on, image type/size limits (5MB, JPG/PNG/WebP), server-side field-error mapping onto the same field IDs.

New: description 500-character soft cap (frontend-only, see above).

## Responsive behavior

- **Desktop (≥1024px):** two-column grid as designed, entire form visible without unnecessary scrolling.
- **Tablet (<1024px):** the grid collapses to a single stacked column (Product Information first, then Image/Visibility/Schedule) via a `lg:` breakpoint. `AdminSidebar`'s existing drawer behavior is untouched and already works app-wide.
- **Mobile:** fully stacked, footer buttons become full-width (`flex-col sm:flex-row` or equivalent), no horizontal overflow — same verification approach used for the Products page redesign (checked `document.documentElement.scrollWidth` against `window.innerWidth` at 768px and 375px).

## Footer

```
* Required fields                              Cancel   Add Product
```

- `*` in `danger` red, "Required fields" in `muted` text.
- Cancel: existing `secondary` Button variant, navigates to `/admin/products` (unchanged). No new unsaved-changes confirmation is added — none exists today and it wasn't requested as new scope.
- Submit button: switches from the current default (`primary`) Button variant to the existing `accent` (orange) variant. Label/disabled/loading behavior unchanged (`Add Product` / `Save Changes` / `Saving...`, disabled while submitting).

## Testing plan

Extend in place (no existing assertions change, since no validation/submit/data logic changes):
- `ProductForm.test.jsx` — all current tests keep passing unmodified; add tests for the description counter and confirm the Active-row-hides-when-scheduled behavior still holds under the new markup.
- `ProductFormPage.test.jsx` — add coverage for the new back-link and heading/subtitle in both modes.
- `ToggleSwitch.test.jsx` (new) — label/helper rendering, `aria-checked` toggling, `onChange` firing.
- `ImageUploader.test.jsx` — add coverage for the new `dropzone` variant (click-to-upload, drag-and-drop, preview, remove) without touching existing `square`/`wide` test cases.
- `AdminTopbar.test.jsx` — add coverage for the new avatar/role rendering; existing breadcrumb tests keep passing unmodified.

## Final manual verification (desktop + tablet + mobile)

1. Run the app, compare `/admin/products/new` side-by-side against the reference image: two-column proportions, vertical divider, field placement, colors, icons, buttons, switches, borders, spacing.
2. Confirm Product Visibility controls appear exactly once (no duplication elsewhere in the form).
3. Exercise: image selection (click + drag-and-drop), each toggle, scheduling on/off, Cancel, successful submit (toast + navigate back to Products + list reflects the new/updated product), server-side validation error display.
4. Repeat the walkthrough on `/admin/products/:id` (Edit mode) to confirm pre-fill and the "Save Changes" label/copy.
5. Resize to tablet (~768px) and mobile (~375px), confirm stacking and no horizontal overflow.
6. Run `npm test`, `npm run lint`, `npm run build`.
