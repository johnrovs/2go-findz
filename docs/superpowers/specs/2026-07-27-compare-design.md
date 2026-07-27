# Compare Feature — Design

**Date:** 2026-07-27
**Scope:** Third of four new stages derived from the user-supplied requirements document (Hero Banners done → Public Navbar Redesign & Dedicated Catalog Routes done → **Compare** → Buying Guides). Adds a real product-comparison feature: users pick up to 4 products from anywhere in the catalog and view them side by side on a dedicated `/compare` page. Per the user's explicit answer earlier this session, this needs real backend development, not a placeholder page.

**Master spec:** no corresponding section in `docs/PROJECT_SPEC.md` — new scope requested directly by the user, same as the Hero Banners and Navbar Redesign stages.

## Out of scope for this stage

- Buying Guides navbar link/route — deferred to its own later stage.
- Structured product attributes/specs (e.g. weight, dimensions, material) — the `Product` entity has no such fields today, so comparison is limited to the fields that already exist: image, category, name, price, description, trending/best-seller status, and the Amazon link.
- Cross-device sync of the compare selection — `localStorage` is per-browser only, matching the scope of a lightweight affiliate site (no user accounts to sync against beyond admin auth).

## Architecture & data flow

A new `CompareContext` (matching the existing `ToastContext`/`AuthContext` provider pattern in `frontend/src/context/`) holds the list of selected product IDs, capped at 4, and persists it to `localStorage` under the key `compareProductIds` — read on provider mount, written on every change — so the selection survives page refreshes and navigation between pages. A `useCompare()` hook (matching `useToast`/`useAuth`) wraps the context and exposes:

- `ids` — the current array of selected product IDs (order = selection order)
- `isSelected(id)` — boolean
- `isFull` — `true` once 4 are selected
- `toggle(id)` — adds if not present and not full, removes if present
- `remove(id)` — removes a specific ID
- `clear()` — empties the selection

The selection is a global, persistent choice (closer to a shopping cart) rather than page-specific filter state, so it is intentionally **not** reflected in the URL the way catalog filters are — `/compare` always reads from `CompareContext`, not from query params.

## Backend

One new endpoint, reusing the existing `ProductResponse` DTO (already carries `id`, `name`, `description`, `categoryName`, `imageFileName`, `productPrice`, `productLink`, `trending`, `bestSeller`, `createdAt` — everything comparison needs):

- **`GET /api/public/products/compare?ids=1,2,3,4`** on `PublicProductController` — parses the comma-separated `ids` param into `List<Long>` (invalid/non-numeric tokens are dropped, not errored), looks the products up, and returns only **active** products — matching how `search`/`getById` already restrict public visitors to active products — silently omitting any ID that is inactive, deleted, or does not exist. Results are returned **in the order the IDs were requested**, so the frontend controls column order deterministically. An empty or entirely-invalid `ids` param returns an empty list, not an error.
- `ProductRepository` gains `findAllByIdInAndActiveTrue(List<Long> ids)`.
- `ProductServiceImpl` gains `getComparableByIds(List<Long> ids)`: calls the repository, then reorders the returned entities to match the input list (Spring Data's `findAllById`-style queries do not guarantee order), then maps to `ProductResponse` via the existing `ProductMapper`.
- `ProductService` interface gains the corresponding `getComparableByIds` method signature.

No changes to `ProductRequest`, `Product` entity, admin endpoints, or the database schema — this is a read-only, public, additive endpoint.

## Frontend

### State: `CompareContext` / `useCompare`
- `frontend/src/context/CompareContext.jsx` — provider wraps the app (in `App.jsx`, alongside `AuthProvider`/`ToastProvider`), initializes `ids` from `localStorage.getItem('compareProductIds')` (parsed JSON array, defaulting to `[]` on any parse failure), and writes to `localStorage` in an effect whenever `ids` changes.
- `frontend/src/hooks/useCompare.js` — thin `useContext(CompareContext)` wrapper, matching `useToast.js`.

### `ProductCard` — add-to-compare toggle
A small icon button in the image's top-right corner (badges already occupy top-left), toggling `useCompare().toggle(product.id)`:
- Unselected: outline/plus icon, `aria-pressed="false"`, label `"Add {name} to Compare"`.
- Selected: filled/check icon, `aria-pressed="true"`, label `"Remove {name} from Compare"`.
- Full and not selected: same outline icon but `disabled`, with a `title`/`aria-label` explaining the 4-item limit ("Compare is full — remove an item to add another").

### `CompareBar` — global floating bar
New `frontend/src/components/CompareBar.jsx`, rendered once in `App.jsx` alongside the routed pages (so it persists across navigation, not per-page). Renders `null` when `ids.length === 0`. When non-empty: a fixed bottom bar showing small product thumbnails (fetched the same way `ComparePage` does, via `compareProducts(ids)`, so it stays in sync even after a refresh), a `"Compare ({ids.length})"` link to `/compare`, a per-thumbnail remove button, and a "Clear all" action.

### `Navbar` — Compare link with count badge
A new "Compare" `NavLink` added between "Categories" and "Best Sellers" (both desktop nav and `MobileMenu`), always visible. When `ids.length > 0`, a small badge showing the count renders next to the label (e.g. a filled circle with the number, matching the site's existing badge/pill styling conventions).

### `ComparePage` — the comparison table
New `frontend/src/pages/ComparePage.jsx`, public route `/compare`, wrapped in `Navbar` + `Footer` like every other public page:
- Reads `ids` from `useCompare()`; fetches full product detail via a new `compareProducts(ids)` call in `productService.js` (`GET /public/products/compare?ids=...`).
- **Fewer than 2 products selected:** empty state — "Add at least 2 products to compare." with a link back to `/` (or `/#catalog`) to browse.
- **2+ products:** a comparison table — one column per product, one row per field (image, category, name, price, description, trending/best-seller badges, "View on Amazon" button), with a remove button (calling `useCompare().remove(id)`) at the top of each column. On mobile, the table scrolls horizontally within its own `overflow-x-auto` container (per the project's responsive-table convention) rather than reflowing into stacked cards.
- If a selected ID silently drops out of the backend response (e.g. the product was deactivated since it was added), the corresponding column is simply absent — no error state, since this is expected, graceful behavior, not a failure.

## Accessibility

- The add-to-compare toggle uses `aria-pressed` to convey selection state, with descriptive `aria-label`s naming the product.
- The comparison view is a semantic `<table>` (or the equivalent ARIA table/grid roles if a `<div>`-based layout is needed for the horizontal-scroll container), so screen readers get row/column relationships, not just a visual grid.
- `CompareBar`'s remove and clear controls have descriptive labels ("Remove {name} from compare", "Clear compare list").
- Focus and keyboard interaction follow the same conventions already established this session (visible focus rings, no keyboard traps).

## Testing

Backend (JUnit/Mockito/MockMvc, following the existing `AbstractIntegrationTest` pattern):
- `ProductRepository`: `findAllByIdInAndActiveTrue` returns only active matches.
- `ProductServiceImpl`: `getComparableByIds` preserves input order, drops inactive/missing ids, empty input returns empty list.
- `PublicProductController`: valid ids return the expected products in order; a mix of valid/invalid/inactive ids returns only the valid active ones; malformed `ids` param (non-numeric tokens) is tolerated, not a 400.

Frontend (Vitest + React Testing Library):
- `CompareContext`/`useCompare`: add/remove/toggle, caps at 4, persists to and rehydrates from `localStorage`.
- `ProductCard`: toggle button reflects selection state, calls `toggle`, disables when full and unselected.
- `CompareBar`: renders nothing when empty, shows correct count/thumbnails when populated, remove and clear work.
- `Navbar`: "Compare" link renders always; count badge appears only when `ids.length > 0` and shows the right number.
- `ComparePage`: empty/under-2 state renders correctly; 2+ products render the full table with all fields; removing a product from the table updates `CompareContext` and re-renders.
