# Products Management Page Redesign

## Context

The user supplied a detailed reference screenshot and a 12-section prescriptive spec for redesigning `frontend/src/pages/admin/ProductsPage.jsx` to match it pixel-accurately, covering sidebar, header, page heading, filter toolbar, results/sort row, product table, status badges, row actions, pagination, typography, icons, and responsive behavior.

**Codebase research (2026-08-14)** found this is largely a visual restyle, not a rebuild:
- The sidebar's navy color (`navy-950` = `#020d18`) already matches the reference exactly (built in the earlier Admin Dashboard Phase 1).
- `AdminTopbar.jsx` already renders the "Dashboard / Products" breadcrumb header.
- `SearchInput.jsx`, `FilterDropdown.jsx`, and `Pagination.jsx` already implement debounced search, dropdown filters, and ellipsis-style pagination — they need re-skinning, not rebuilding.
- The Type (`All Products`/`Trending`/`Best Sellers`) and Status (`All`/`Active`/`Inactive`) filters already exist with matching option sets.

Research also surfaced four real conflicts between the reference image and the actual data model, each resolved with the user before design:

1. **Status badges**: the reference implies one mutually-exclusive badge per row, but `trending`, `bestSeller`, `active`, and `scheduledPublishAt` are independent flags that can co-occur. **Resolved:** keep showing every applicable badge per row (re-skinned to match the reference's pill look), don't force a single-badge priority order.
2. **Badge wording**: the reference shows "Draft" for inactive products, but this page's own Status *filter* dropdown already says "Active"/"Inactive" (and Admin Dashboard Phase 2 deliberately scoped "Draft"/"Published" wording to the Dashboard's Recent Products/Latest Guides cards only, not this page). **Resolved:** keep "Inactive" here; add a new blue "Published" badge for the previously-blank plain-active-with-no-other-flags case.
3. **Admin avatar**: the reference shows a photographic avatar, but no profile-photo feature exists anywhere in this app (no stored image, no upload). **Resolved:** use the same initial-letter circular avatar convention already established on the Dashboard header.
4. **Sort control**: the reference's "Newest first" dropdown is a different interaction than the existing sortable-column-header clicks. **Resolved:** add the dropdown as a second way to set the same `sortKey`/`sortDirection` state the column clicks already drive — both stay in sync, nothing removed.

Rows-per-page is a genuinely new capability (page size is currently hardcoded to `20` in `useAdminProductSearch.js`), added per the user's choice of 10/20/50 options, default unchanged at 20.

## Scope

Redesign `ProductsPage.jsx` visually to match the reference (colors, spacing, radii, shadows, typography, table styling, badges, buttons, pagination) while preserving every existing behavior (search, filter, sort, paginate, add/edit/delete). Add three new capabilities: a `StatusBadge` component, a "Sort by" preset dropdown, and a rows-per-page selector.

**Out of scope:** `AdminSidebar.jsx`/`AdminTopbar.jsx` structural changes (already match), a profile-photo upload feature, any backend/data-model change, any other admin page.

## Section A: Scope & reuse

Reused as-is (no changes): `AdminSidebar.jsx`, `AdminTopbar.jsx`.

Restyled (existing component, same props/behavior, new classes): `SearchInput.jsx`, `FilterDropdown.jsx`, `Pagination.jsx`, `DataTable.jsx`'s header (via new className props passed from `ProductsPage.jsx`, not changes to `DataTable.jsx` itself — it already accepts arbitrary column render functions and doesn't hardcode header styling beyond what's already themeable).

New: `frontend/src/components/StatusBadge.jsx`, a "Sort by" dropdown, a "Rows per page" dropdown, a `Button` `accent` variant.

## Section B: Page heading & filter toolbar

`ProductsPage.jsx`'s heading grows to `text-[46px] font-extrabold leading-tight text-heading` (desktop; the existing `text-page-heading` token is smaller and used elsewhere in the admin app, so this page gets an explicit override rather than changing that shared token) with a new subtitle paragraph: "Manage, organize, and publish products across your storefront." (`text-small text-muted`, matching the muted-text convention used throughout the admin app).

`Button.jsx` gains a new `accent` variant, reusing the existing `dashboard-orange` token (`#ff6b00` — already in `tailwind.config.js`, close enough to the reference's "approximately `#FF7A00` or `#FF8A00`" to avoid introducing a near-duplicate color):

```js
accent: 'bg-dashboard-orange text-white shadow-card hover:opacity-90',
```

`+ Add Product` switches from `variant="primary"` to `variant="accent"`.

The filter row (search + Category/Type/Status dropdowns) and the table+pagination move inside one shared card:

```jsx
<div className="rounded-card border border-slate-200 bg-white shadow-card">
  {/* filter row */}
  {/* results count + sort row */}
  {/* table */}
  {/* pagination */}
</div>
```

reusing the same `rounded-card border border-slate-200 bg-white shadow-card` shell every dashboard card in this app already uses (`TopCategoriesCard`, `RecentProductsCard`, etc.) — no new card-shell pattern introduced. A "Clear filters" text button appears in the filter row, resetting `search`/`categoryId`/`filter`/`status` to their defaults (calls the existing setters with empty values — no new hook method needed, `updateParams` already supports clearing multiple keys at once by extending the existing setter calls into one combined reset function in `ProductsPage.jsx`).

## Section C: Table, StatusBadge, and row actions

Table header gets a purple gradient:

```css
background: linear-gradient(90deg, #5B2CF2 0%, #6D35F5 55%, #5425E8 100%);
```

applied via an inline `style` on the `<thead>` (Tailwind's built-in gradient utilities can't express a 3-stop gradient with these exact stops without a custom config entry; since this is a single one-off decorative header used only here, an inline style is simpler than adding a new Tailwind gradient utility for one use), white uppercase text, rounded top-left/top-right corners on the first/last `<th>`.

Column label "Name" → "Product" (`{ key: 'name', label: 'Product', sortable: true }` — same data key, label text only). Row height grows via `py-4` on `DataTable`'s `<td>` cells (currently `py-3`) — this is the one small `DataTable.jsx` change, applied globally to that component since every admin table using it benefits from the same breathing room, not just this page.

New `frontend/src/components/StatusBadge.jsx`, extracted from `ProductsPage.jsx`'s current inline badge markup:

```jsx
const VARIANTS = {
  trending: 'bg-warning/10 text-warning',
  bestSeller: 'bg-success/10 text-success',
  scheduled: 'bg-info/10 text-info',
  published: 'bg-info/10 text-info',
  inactive: 'bg-surface-secondary text-muted',
};

function StatusBadge({ variant, children }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${VARIANTS[variant]}`}>
      {children}
    </span>
  );
}
```

`ProductsPage.jsx`'s Status column renders one `StatusBadge` per true condition — `trending` → "Trending", `bestSeller` → "Best Seller", `scheduledPublishAt` → "Scheduled" (all as today, just via the new component), plus the new rule: `active && !trending && !bestSeller && !scheduledPublishAt` → `<StatusBadge variant="published">Published</StatusBadge>`, and `!active` → `<StatusBadge variant="inactive">Inactive</StatusBadge>` (unchanged from today, just via the new component).

Row actions become circular outline buttons:

```jsx
<Link
  to={`/admin/products/${row.id}`}
  aria-label={`Edit ${row.name}`}
  title="Edit"
  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-muted hover:border-primary hover:bg-primary/10 hover:text-primary"
>
  <Pencil size={14} />
</Link>
<button
  type="button"
  onClick={() => setDeleteTarget(row)}
  aria-label={`Delete ${row.name}`}
  title="Delete"
  className="rounded-full h-8 w-8 inline-flex items-center justify-center border border-slate-200 text-muted hover:border-danger hover:bg-danger/10 hover:text-danger"
>
  <Trash2 size={14} />
</button>
```

The existing deactivate-confirmation `ConfirmDialog` flow (`deleteTarget`/`isDeleting`/`handleDeleteConfirm`) is untouched — only the trigger buttons' visual style changes.

## Section D: Sort dropdown, pagination, rows-per-page

**Sort dropdown** — new constant in `ProductsPage.jsx`:

```js
const SORT_OPTIONS = [
  { value: 'createdAt,desc', label: 'Newest first' },
  { value: 'createdAt,asc', label: 'Oldest first' },
  { value: 'name,asc', label: 'Name A–Z' },
  { value: 'productPrice,asc', label: 'Price: low to high' },
  { value: 'productPrice,desc', label: 'Price: high to low' },
];
```

rendered as a `FilterDropdown` whose `value` is `` `${productSearch.sortKey},${productSearch.sortDirection}` `` and whose `onChange` splits the selected value back into a `sortKey`/`sortDirection` pair and calls a new `useAdminProductSearch` method `setSort(sortKey, sortDirection)` that sets both URL params in one `updateParams` call (avoids two sequential updates fighting each other the way calling `onSortChange` twice would). The existing column-header `onSortChange` handler is unchanged — both write to the same `sortKey`/`sortDirection` URL params, so they always agree.

**Rows-per-page** — `useAdminProductSearch.js`'s `PAGE_SIZE = 20` constant becomes:

```js
const DEFAULT_PAGE_SIZE = 20;
const pageSize = Number(searchParams.get('pageSize') ?? DEFAULT_PAGE_SIZE);
```

used in place of `PAGE_SIZE` in the `params.size` assignment, returned from the hook alongside a `setPageSize: (value) => updateParams({ pageSize: value })` setter (uses the existing `resetPage: true` default so changing page size returns to page 1, consistent with how `setSearch`/`setCategoryId`/etc. already behave). Rendered as a `FilterDropdown` with options `10`/`20`/`50`, placed beside the "Showing X–Y of Z products" text.

**Pagination text** — `Pagination.jsx` gains an optional `summary` prop (a pre-formatted string, computed in `ProductsPage.jsx` as `` `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, totalElements)} of ${totalElements} products` `` using the hook's existing `totalElements`), rendered to the left of the existing page-number buttons when provided — optional so `Pagination.jsx`'s other current callers (if any use it without a count) are unaffected.

## Section E: Responsive behavior & testing

No changes needed to `AdminSidebar.jsx`'s existing mobile drawer or `DataTable.jsx`'s existing `overflow-x-auto` wrapper — both already handle tablet/mobile. The filter row's controls (search, three dropdowns, Clear filters) get `w-full sm:w-auto` so they stack full-width on mobile instead of wrapping awkwardly side-by-side.

**Testing:**
- New `frontend/src/components/StatusBadge.test.jsx` — renders each variant with correct classes/text.
- `ProductsPage.test.jsx` updates: Published badge appears for plain-active products, sort dropdown changes `sortKey`/`sortDirection` in sync with column clicks, rows-per-page dropdown changes the requested page size, Clear filters resets all four filter states.
- `useAdminProductSearch.test.js` updates: `pageSize` param read/write, `setSort` setting both params atomically.
- `Pagination.test.jsx` update: `summary` prop renders the "Showing X–Y of Z" text when provided, renders nothing extra when omitted.
- Manual browser verification with side-by-side screenshot comparison against the reference image (same discipline as every prior phase this session), plus `npm run lint` and `npm run build`.

## Self-Review

- **Placeholder scan:** no TBD/TODO; every color, class list, constant, and prop signature is fully specified.
- **Internal consistency:** the "keep all badges" and "Inactive not Draft" decisions from Section A are applied consistently in Section C's `StatusBadge` usage; the sort-dropdown/column-click dual-write design in Section D explicitly explains why both stay in sync rather than leaving that as an unstated assumption.
- **Scope check:** one page + one new small component + one hook + one shared-component tweak (`DataTable.jsx` row height, `Pagination.jsx` optional prop) — appropriately sized for a single implementation plan, comparable to the larger Admin Dashboard phases already completed this session.
- **Ambiguity check:** all four reference-vs-reality conflicts were resolved with the user before this document was written, so none are left as open questions; exact hex/gradient values, page-size options, and sort presets are all stated explicitly rather than left to implementer judgment.
