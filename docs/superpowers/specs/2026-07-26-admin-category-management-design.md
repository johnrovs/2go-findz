# Frontend Admin Stage 1: Category Management — Design

**Date:** 2026-07-26
**Scope:** The first of four sequential Frontend Admin sub-stages (Category Management → Product Management → System Settings → Dashboard & Analytics). Replaces the `CategoriesPage` placeholder with full CRUD, and establishes three reusable admin primitives (`Modal`, `DataTable`, `ConfirmDialog`) that the later sub-stages will consume.

**Master spec:** `docs/PROJECT_SPEC.md` §"5. Product Category Management". **Depends on:** the already-completed admin shell (`AuthContext`, `ProtectedRoute`, `AdminLayout`/`AdminSidebar`/`AdminTopbar`, `ToastContext`) and the shared `api` Axios instance — all shipped in an earlier Frontend Core stage. Backend endpoints consumed (all under `/api/admin/categories`, JWT-protected):

| Method | Path | Notes |
|---|---|---|
| GET | `/` | query: `sortBy`, `direction` (`asc`/`desc`) → `List<CategoryResponse>` (not paginated) |
| POST | `/` | body `CategoryRequest` → `CategoryResponse` |
| PUT | `/{id}` | body `CategoryRequest` → `CategoryResponse` |
| DELETE | `/{id}` | → `Void`; throws (409-mapped) `CategoryInUseException` when products reference the category |

`CategoryRequest`: `{ productCategoryName, commissionRate }` (`commissionRate` is `BigDecimal`, validated 0–100 with 2 decimal places server-side). `CategoryResponse`: `{ id, productCategoryName, commissionRate, createdAt, updatedAt }`.

## Out of scope for this stage

- Product Management, System Settings, Dashboard & Analytics (the next three sub-stages)
- Any backend changes — the admin category list endpoint has no `search` query param and this stage does not add one (see "Search" below)
- Pagination — the endpoint returns the full list; category counts are expected to stay small

## Page structure

`CategoriesPage` (`frontend/src/pages/admin/CategoriesPage.jsx`), rendered inside the existing `AdminLayout`:

1. **Page header** — title "Product Categories", "Add Category" primary button (opens the create modal).
2. **Search bar** — a single text input that filters the in-memory category list by name, client-side, as the user types (no debounce needed — filtering an already-fetched array is synchronous and cheap).
3. **Table** — `DataTable` with columns: Category Name (sortable), Commission Rate (sortable, rendered as `4.00%`), Created (sortable, formatted date), Actions (Edit / Delete icon buttons per row).
4. **States** — `LoadingSpinner` during the initial fetch, `ErrorState` (with retry) if the fetch fails, `EmptyState` when the list is empty or a search yields no matches (distinct copy for each case).
5. **Create/Edit modal** — `Modal` wrapping `CategoryForm`; same form component for both, keyed by whether an `id` is present.
6. **Delete confirmation** — `ConfirmDialog`, triggered by the row's Delete action.

## New reusable components

- **`Modal.jsx`** — generic centered dialog: backdrop (click to close), `Esc` to close, focus trapped inside while open, renders arbitrary children via a `title` + body slot. No animation library dependency beyond the already-installed Framer Motion (simple fade/scale-in). Props: `{ isOpen, onClose, title, children }`.
- **`DataTable.jsx`** — generic presentational table. Props: `{ columns, rows, sortKey, sortDirection, onSortChange, isLoading, emptyState }`. `columns` is `[{ key, label, sortable, render? }]`; `render(row)` lets a column customize its cell (used here for the percentage-formatted commission column and the Actions column). Clicking a sortable header toggles `asc`/`desc` via `onSortChange(key)`. Column-header sort is the standard interaction pattern for admin tables (distinct from the storefront's dropdown-based sort).
- **`ConfirmDialog.jsx`** — built on `Modal`. Props: `{ isOpen, title, message, confirmLabel, isDestructive, onConfirm, onCancel, isLoading }`. `isDestructive` styles the confirm button `red` instead of `indigo`. `isLoading` disables both buttons and shows a spinner in the confirm button while the delete request is in flight.

## New page-specific component

- **`CategoryForm.jsx`** — two fields: `productCategoryName` (text, required) and `commissionRate` (number input, step `0.01`, min `0`, max `100`, suffixed with a `%` label). Client-side validation mirrors backend rules (required name, rate in `[0, 100]`) so obviously-invalid input never reaches the network. Server-side duplicate-name rejection (`400` with a field error) is surfaced under the name input via the existing `{ message, fieldErrors }` shape from `normalizeError` — not a generic toast, so the user sees exactly which field is wrong.

## New service

`frontend/src/services/adminCategoryService.js`:
- `getCategories({ sortBy, direction } = {})` → `GET /admin/categories` → `CategoryResponse[]`
- `createCategory(payload)` → `POST /admin/categories` → `CategoryResponse`
- `updateCategory(id, payload)` → `PUT /admin/categories/{id}` → `CategoryResponse`
- `deleteCategory(id)` → `DELETE /admin/categories/{id}` → `void`

Built on the existing shared `api` Axios instance (already attaches the JWT bearer token via its request interceptor) — no direct `axios`/`fetch` calls.

## Search

The admin category list endpoint exposes only `sortBy`/`direction`, no `search` param. Since categories are typically a short, fully-loaded list, `CategoriesPage` fetches the complete list once (re-fetching only after a create/update/delete, or when the user changes sort) and filters by `productCategoryName` client-side on every keystroke. This keeps the stage frontend-only and avoids adding backend surface area for a dataset this small.

## Data flow & error handling

- **List load:** on mount and after sort changes, call `getCategories({ sortBy, direction })`; `isLoading` drives the spinner, a failed fetch shows `ErrorState` with a retry button that re-triggers the same call.
- **Create/Edit submit:** `CategoryForm` calls `createCategory`/`updateCategory`; on success, close the modal, show a success toast (`useToast()`), and refresh the list. On a validation error (`400` with `fieldErrors.productCategoryName`, e.g. duplicate name), keep the modal open and render the message under the name field — do not toast it.
- **Delete confirm:** `ConfirmDialog`'s `onConfirm` calls `deleteCategory(id)`. On success: close the dialog, toast success, refresh the list. On `CategoryInUseException` (mapped to a `409` with a descriptive `message`, no `fieldErrors`): close the dialog and show the backend's message as an error toast — this is exactly the "prevent deletion and show a helpful validation message" requirement from the spec, and the message text comes from the backend so it can reference the actual products blocking the delete without the frontend needing to know product names itself.
- **Network/unexpected errors:** fall back to the existing generic `normalizeError` message via error toast, consistent with every other stage.

## Accessibility

`Modal` traps focus and restores it to the triggering element on close. `DataTable` sortable headers are real `<button>` elements inside `<th>` with `aria-sort` reflecting current state. `ConfirmDialog` uses `role="alertdialog"` with the destructive action never the default-focused element (cancel is default-focused) to avoid accidental destructive confirms on stray Enter presses.

## Testing

Vitest + React Testing Library:
- `Modal`: opens/closes on backdrop click and `Esc`, traps focus.
- `DataTable`: renders columns/rows, clicking a sortable header calls `onSortChange`, shows `emptyState` when `rows` is empty, shows loading state.
- `ConfirmDialog`: calls `onConfirm`/`onCancel`, disables buttons while `isLoading`.
- `CategoryForm`: client-side required/range validation, submits the expected payload shape, renders a server-side field error under the name input.
- `CategoriesPage`: renders fetched categories, search filters the visible rows, sort toggles reorder rows, create/edit/delete happy paths (mocking `adminCategoryService` and `useToast`), and the in-use delete error path shows the backend's message via toast without removing the row.
