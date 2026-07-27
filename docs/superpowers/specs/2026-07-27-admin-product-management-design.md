# Frontend Admin Stage 2: Product Management — Design

**Date:** 2026-07-27
**Scope:** Second of four sequential Frontend Admin sub-stages (Category Management → **Product Management** → System Settings → Dashboard & Analytics). Replaces the `ProductsPage` placeholder with a paginated, filterable, searchable, sortable list, and splits the already-scaffolded `/admin/products/new` and `/admin/products/:id` routes off to a new dedicated `ProductFormPage` with full CRUD and image upload.

**Master spec:** `docs/PROJECT_SPEC.md` §"4. Product Management". **Depends on:** the admin shell (unchanged), and reuses `Modal`/`ConfirmDialog`/`DataTable` from Frontend Admin Stage 1 (Category Management, `docs/superpowers/specs/2026-07-26-admin-category-management-design.md`) plus `Pagination`/`SearchInput`/`FilterDropdown` from the Public Homepage stage. Backend endpoints consumed, all JWT-protected:

| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/products` | query: `search, categoryId, trending, bestSeller, active, minPrice, maxPrice` + `Pageable` (`page`, `size`, `sort`; default size 20, default sort `createdAt` ascending) → `Page<ProductResponse>` |
| GET | `/api/admin/products/{id}` | → `ProductResponse` |
| POST | `/api/admin/products` | body `ProductRequest` → `ProductResponse` |
| PUT | `/api/admin/products/{id}` | body `ProductRequest` → `ProductResponse` |
| DELETE | `/api/admin/products/{id}` | calls `productService.softDelete(id)` — sets `active = false`, does **not** hard-delete → `Void` |
| POST | `/api/admin/images` | multipart, field name `file` → `ApiResponse<UploadResponse{ filename }>` |

`ProductRequest` (verified directly from the backend DTO, not summarized): `name` (`@NotBlank`, max 200), `description` (`@NotBlank`), `categoryId` (`@NotNull`), `imageFileName` (optional, max 255 — **not required**), `productPrice` (`@NotNull`, `@DecimalMin("0.00")`), `productLink` (`@NotBlank`, must match `^https://.+`), `trending`/`bestSeller`/`active` (`@NotNull` booleans). `ProductResponse`: `{ id, name, description, categoryId, categoryName, imageFileName, productPrice, productLink, trending, bestSeller, active, createdAt, updatedAt }`.

Also reused: `adminCategoryService.getCategories()` (Stage 1) for the category dropdown, `utils/imageUrl.js`'s `getImageUrl(filename)` for previews.

## Out of scope for this stage

- System Settings, Dashboard & Analytics (the next two sub-stages)
- Any backend changes — including cleanup of images uploaded but never attached to a saved product (a known, accepted gap; see "Image upload" below)
- Hard-delete — the backend only exposes soft delete

## Routing change

`frontend/src/App.jsx` currently routes all three product paths to the same placeholder `ProductsPage`:
```
/admin/products         ProductsPage
/admin/products/new     ProductsPage
/admin/products/:id     ProductsPage
```
This stage splits them:
```
/admin/products         ProductsPage       (list)
/admin/products/new     ProductFormPage    (create)
/admin/products/:id     ProductFormPage    (edit)
```
`ProductFormPage` reads `useParams().id` — its absence means create mode, its presence means edit mode (fetches the product via `getProductById(id)` on mount).

## List page (`ProductsPage`)

State lives in the URL via a new `useAdminProductSearch()` hook, mirroring the public `useProductSearch()` hook's shape and conventions: `search` (debounced ~300ms before updating the URL), `categoryId`, `filter` (`all`/`trending`/`bestSeller`, maps to the `trending`/`bestSeller` query params), `status` (`all`/`active`/`inactive`, maps to the `active` query param — omitted entirely for `all`), `sortKey`/`sortDirection` (drives `DataTable`'s column-header sort, translated to the backend's `sort=field,direction` Pageable param), and `page` (1-indexed externally, converted to `page - 1` for the request — same convention as `useProductSearch`). **Default status filter is "all"** — nothing is hidden from the admin by default; they narrow down explicitly.

**Filter bar:** `SearchInput` (reused as-is), `FilterDropdown` for Category (options from `adminCategoryService.getCategories()`), `FilterDropdown` for Type (All Products/Trending/Best Sellers), `FilterDropdown` for Status (All/Active/Inactive).

**`DataTable` columns:**
- Thumbnail — `getImageUrl(row.imageFileName)` in a fixed-size `<img>`, or a placeholder icon box when there's no image.
- Name (sortable, `sort=name,...`)
- Category (`categoryName` — **not sortable**, avoids an untested joined-column sort path on the backend)
- Price (sortable, `sort=productPrice,...`, formatted `$X.XX`)
- Badges — `Trending` (`amber-100`/`amber-800`) and `Best Seller` (`emerald-100`/`emerald-800`) when applicable, same styling as the public `ProductCard`; an `Inactive` badge (`slate-100`/`slate-600`) only when `active` is `false` — no badge at all for the active/default case, keeping the table visually quiet.
- Created (sortable, `sort=createdAt,...`, formatted date)
- Actions — Edit (navigates to `/admin/products/{id}`) and Delete (opens `ConfirmDialog`)

**Mutation refresh strategy:** after any successful delete, `ProductsPage` re-fetches the current page from the server rather than patching local state — the server's `active` filter already determines correctly whether a just-deactivated product should still be visible under the current status filter, so the client doesn't need to replicate that logic. (Create/update happen on `ProductFormPage`, which navigates back to `/admin/products` on success; the list re-fetches naturally on mount.)

**Delete confirmation copy** reflects the actual (reversible) backend behavior rather than the spec's generic "cannot be undone" language, which doesn't hold for a soft delete: *"This will deactivate \"{name}\" and remove it from the public catalog. You can reactivate it later from Edit."* Confirm label: "Deactivate". Not styled as destructive-red, since it isn't a destructive/irreversible action — uses the `ConfirmDialog`'s default (indigo) styling instead of `isDestructive`.

## Form page (`ProductFormPage` + `ProductForm`)

`ProductFormPage` is a thin wrapper: in edit mode, fetches the product via `getProductById(id)` (loading/error states), then renders `ProductForm` with that data; in create mode, renders `ProductForm` with no initial data. On successful submit, shows a success toast and navigates to `/admin/products`.

`ProductForm` fields, in order: image (`ImageUploader`), name, category (`FilterDropdown`-style select, but required — no "All" option), description (textarea), price, product link, then the three checkboxes (Trending, Best Seller, Active). Client-side validation mirrors the backend exactly (see the verified `ProductRequest` rules above) — required-field and format checks happen before any network call; server-side field errors (the `{ message, fieldErrors }` shape) render under the matching field, same pattern as `CategoryForm`.

## Image upload (`ImageUploader` + `adminImageService`)

Uploads immediately on file selection — the backend's `imageFileName` is a plain string field on `ProductRequest`, so a file has to become a filename before the form can reference it regardless of timing. Client-side validation before the upload call: MIME type must be one of `image/jpeg`, `image/png`, `image/webp`; size must be ≤ 5MB (both mirror the backend's actual validation). On upload success, stores the returned `filename` in the form's local state and shows a preview via `getImageUrl(filename)`. On upload failure, shows an inline error under the uploader (not a form-wide error) and leaves the previous filename (if any) untouched. Selecting a new file re-runs the same flow, overwriting the stored filename. In edit mode, the uploader preloads the existing image's preview from `product.imageFileName`.

**Accepted gap:** if an admin uploads a replacement image and then navigates away without saving, the previously-uploaded-but-unreferenced file is not cleaned up. This is backend storage-lifecycle behavior, out of scope for a frontend-only stage.

## Data flow & error handling

- **List load:** `useAdminProductSearch()` fetches on mount and whenever search/filters/sort/page change (same debounce-then-fetch pattern as the public hook). A failed fetch shows `ErrorState` with retry.
- **Create/update submit:** `ProductForm` calls `createProduct`/`updateProduct` via `adminProductService`; on success, `ProductFormPage` toasts and navigates back to the list. On a validation error, field-level errors render inline; the form stays on the page with entered data intact.
- **Delete confirm:** `ConfirmDialog`'s `onConfirm` calls `deleteProduct(id)`; on success, closes the dialog, toasts, and re-fetches the current list page. Network/unexpected errors fall back to the existing generic `normalizeError` message via error toast, consistent with every other stage.

## New reusable services

- `frontend/src/services/adminProductService.js` — `searchProducts(params): Promise<PageResponse>`, `getProductById(id): Promise<Product>`, `createProduct(payload): Promise<Product>`, `updateProduct(id, payload): Promise<Product>`, `deleteProduct(id): Promise<void>`
- `frontend/src/services/adminImageService.js` — `uploadImage(file): Promise<{ filename: string }>`

## Accessibility

Same bar as prior stages: labeled inputs, `aria-invalid`/`aria-describedby` on validation errors, `ImageUploader`'s file input has an associated label, upload errors are announced via `role="alert"`, `DataTable`'s sortable headers carry `aria-sort` (inherited from Stage 1, unchanged).

## Testing

Vitest + React Testing Library:
- `adminProductService` / `adminImageService`: request shape and response unwrapping, mirroring the `adminCategoryService` test pattern (`vi.spyOn(api, ...)`).
- `ImageUploader`: rejects an oversized/wrong-type file before uploading, shows a preview on upload success, shows an inline error on upload failure, replacing a file re-uploads.
- `ProductForm`: required-field validation, HTTPS-link format validation, submits the expected payload shape, pre-fills and submits an update payload in edit mode, renders a server-side field error inline.
- `useAdminProductSearch`: URL params round-trip, debounced search, page resets on filter change, status filter maps to the `active` param correctly (including omitting it for "all").
- `ProductsPage`: renders fetched products with correct badges, filters/search/sort update results, delete flow re-fetches and shows the correct toast copy, empty/error states.
- `ProductFormPage`: create flow navigates and toasts on success, edit flow loads and pre-fills existing data.
