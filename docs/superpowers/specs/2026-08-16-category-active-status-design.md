# Category Active/Inactive Status — Design Spec

## Goal

Add an Active/Inactive status field to Product Categories, matching the toggle-switch pattern already used for Products — spanning a real backend schema change (no `active` field exists on categories today) through to the Add/Edit Category form and the Categories list page.

## Scope

Backend: migration, `ProductCategory` entity, `CategoryRequest`/`CategoryResponse` DTOs, `CategoryMapper`, `CategoryServiceImpl` (including the public-facing filter). Frontend: `CategoryForm.jsx` (new toggle), `CategoriesPage.jsx` (new Status column). Also touches every existing backend test that constructs `CategoryRequest` directly (a Java record — adding a field changes its positional constructor everywhere it's called).

Out of scope: `PublicCategoryResponse` does not gain an `active` field — inactive categories are filtered out server-side before serialization, so public consumers never see the flag at all, matching how `PublicProductController` already treats `Product.active`.

## Conflict resolved with the user before implementation

**List page scope** — the user's request named only the form, but the list page also gains a Status column (via `StatusBadge`, matching Products), since leaving the list with no visible indication of a category's active state would be an inconsistent, confusing gap next to the newly-toggleable field.

## Precedent this design follows exactly

- **Column type/default**: `products.active BOOLEAN NOT NULL DEFAULT TRUE` (from `V4__create_products_table.sql`) → `product_categories.active BOOLEAN NOT NULL DEFAULT TRUE`, same migration shape.
- **Entity field type**: `Product.active` is a primitive `boolean` (not `Boolean`) → `ProductCategory.active` is also a primitive `boolean`.
- **Request DTO validation**: `ProductRequest.active` is `@NotNull Boolean active` (wrapper, for validation) → `CategoryRequest.active` is the same shape.
- **Public visibility rule**: `PublicProductController`'s explicit comment — "Public visitors only ever see active products, regardless of any client-supplied filter" — applies identically to `CategoryServiceImpl.getAllForPublic()`, which today returns every category unfiltered.
- **Frontend default**: `ProductForm`'s `useState(product?.active ?? true)` → `CategoryForm`'s `useState(category?.active ?? true)`, same fallback for new-entity creation.
- **List badge**: Products' two-state (non-scheduled) case — `StatusBadge variant="published"`/`variant="inactive"` — applied identically to categories (categories have no scheduling concept, so only these two states exist).

## Backend changes

1. **New migration** `V23__add_category_active.sql`:
   ```sql
   ALTER TABLE product_categories ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
   ```
2. **`ProductCategory` entity**: add `private boolean active;` with `@Column(name = "active", nullable = false)`.
3. **`CategoryRequest`**: add `@NotNull(message = "Active flag is required.") Boolean active` as the new 4th field (after `imageFileName`).
4. **`CategoryResponse`**: add `Boolean active` (after `imageFileName`, before `createdAt`).
5. **`CategoryMapper.toResponse`**: pass `category.isActive()` (Lombok's generated getter for a primitive `boolean` field) into the new response field. `toPublicResponse` is unchanged.
6. **`CategoryServiceImpl`**:
   - `create`: `ProductCategory.builder()...active(request.active())...`
   - `update`: `category.setActive(request.active());`
   - `getAllForPublic()`: filter the stream to `.filter(ProductCategory::isActive)` before mapping.

## Backend test fallout (a real landmine, not incidental)

`CategoryRequest` is a Java record — every `new CategoryRequest(name, rate, imageFileName)` call becomes a compile error once `active` is added as a 4th field. This affects **12 call sites across 5 files**, each needing `true` appended as the new last argument (matching the migration's default, since none of these tests are testing inactive-category behavior):

- `AbstractIntegrationTest.java`: 1 call site, inside the shared `createCategoryId(token, name)` helper used by many other test classes — fixing this one call site keeps every indirect caller (including `PublicCategoryControllerTest`'s `getAll_neverExposesCommissionRate` and `CategoryDeleteTest`) compiling and passing unchanged.
- `AdminCategoryControllerTest.java`: 8 direct call sites.
- `PublicCategoryControllerTest.java`: 1 direct call site (`getAll_exposesImageFileNameWhenConfigured`).
- `GlobalExceptionHandlerTest.java`: 1 direct call site.
- `AdminDashboardControllerTest.java`: 1 direct call site.

## Frontend changes

### `CategoryForm.jsx`

Right column gains a second panel below the image dropzone:
```
Category Visibility
  Active        [switch]   "Visible on the storefront"
```
One `ToggleSwitch` (already shipped), state `useState(category?.active ?? true)`. Submit payload gains `active: <boolean>`.

### `CategoriesPage.jsx`

New `Status` column between `Commission Rate` and `Created`:
```js
render: (row) => row.active
  ? <StatusBadge variant="published">Active</StatusBadge>
  : <StatusBadge variant="inactive">Inactive</StatusBadge>
```

## Testing plan

**Backend**: extend `AdminCategoryControllerTest` with a create/update round-trip asserting `active` in the response; extend `PublicCategoryControllerTest` with a new test creating one active and one inactive category and asserting only the active one appears in `GET /api/public/categories`. Fix all 12 existing `CategoryRequest` call sites per the landmine above.

**Frontend**: extend `CategoryForm.test.jsx` with an Active-toggle-off test (mirroring `ProductForm`'s pattern) and a payload-includes-`active` test; extend `CategoriesPage.test.jsx` with tests asserting the Active/Inactive badge renders per row.

## Final manual verification

1. Run the Flyway migration against the dev database, confirm existing categories all read as Active.
2. Create a new category with Active off, confirm it does NOT appear on the public storefront's category grid/nav, but its own edit page still loads normally in the admin.
3. Confirm an inactive category's existing products are still independently visible on the storefront (their own `active` flag is unaffected).
4. Confirm the Categories list page shows the correct badge for both states, and the Products page's category dropdown still lists inactive categories (products can still be assigned to them — only public *browsing* of the category itself is affected, not admin category-assignment).
5. Run backend (`mvn test`) and frontend (`npm test`, `npm run lint`, `npm run build`) verification.
