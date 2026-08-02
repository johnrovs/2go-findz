# Product SKU Field + Brand Filter (Backend)

## Context

The Buying Guides "Products" step (a separate, dependent sub-project — see
`2026-08-02-buying-guide-products-step-design.md`) needs to let an admin
search the product catalog by brand and see an "All Brands" filter
dropdown, matching its reference image. Two real gaps exist in the current
backend:

1. `Product`/`ProductResponse` already has a `brand` field, but
   `AdminProductController`'s search endpoint has no `brand` query param
   to filter by it, and there's no way to list the distinct brand values
   a dropdown would need.
2. The reference spec also calls for searching "by name, brand, category,
   or SKU" — but the `Product` model has no SKU field anywhere (entity,
   DTO, or database).

This is a small, self-contained backend change. It's built and merged to
`master` first, since the Products step UI depends on it.

## Database

New migration `V17__add_product_sku.sql`:

```sql
ALTER TABLE products
    ADD COLUMN sku VARCHAR(64) NULL,
    ADD UNIQUE INDEX uq_products_sku (sku);
```

`sku` is nullable and optional per-product — MySQL permits multiple `NULL`
values under a unique index, so existing products remain valid without a
backfill, consistent with how `brand` was added in `V12`.

## Entity

`Product.java` gains:

```java
@Column(length = 64)
private String sku;
```

## DTOs

`ProductRequest` gains an optional field:

```java
@Size(max = 64, message = "SKU must be at most 64 characters.")
String sku,
```

`ProductResponse` gains `String sku` in the same position. `ProductMapper`
passes `product.getSku()` through.

## Search

`ProductSpecifications.search(term)` adds SKU to the existing OR-chain
(name/description/category), so the current free-text `search` param
also matches SKU — no new query param needed for it:

```java
cb.like(cb.lower(root.get("sku")), like)
```

(SKU values may contain mixed-case letters; matching is case-insensitive
like the other fields here, consistent with existing behavior.)

## Brand filter

New specification:

```java
public static Specification<Product> hasBrand(String brand) {
    return (root, query, cb) ->
            (brand == null || brand.isBlank())
                    ? cb.conjunction()
                    : cb.equal(cb.lower(root.get("brand")), brand.toLowerCase());
}
```

`AdminProductController.search()` gains:

```java
@RequestParam(required = false) String brand,
```

passed through to `ProductService.search(...)`, `ProductServiceImpl`, and
added to the specification chain — same pattern as `hasCategoryId`.

## Brand list endpoint

New endpoint to populate the "All Brands" dropdown without over-fetching
full product pages:

```
GET /api/admin/products/brands  →  ApiResponse<List<String>>
```

Backed by a new repository query:

```java
@Query("SELECT DISTINCT p.brand FROM Product p WHERE p.brand IS NOT NULL AND p.brand <> '' ORDER BY p.brand")
List<String> findDistinctBrands();
```

Exposed via `ProductService.getDistinctBrands()` → `ProductServiceImpl` →
`AdminProductController`.

## Frontend

- `ProductForm.jsx` gains a SKU text input, placed directly below the
  existing Brand field, same styling/pattern (plain optional text input,
  no special validation beyond the 64-char limit already enforced by
  `maxLength`).
- `adminProductService.js` gains `getDistinctBrands()` and `searchProducts(params)`
  passes through a `brand` param when present.

## Testing

Backend: `AdminProductControllerTest` gains cases for brand filtering,
brand-list retrieval, and SKU appearing in create/update/search-by-term
responses. `ProductServiceImplTest` (if present) gains unit coverage for
`hasBrand`/`getDistinctBrands`. Frontend: `ProductForm.test.jsx` gains a
case asserting SKU is submitted; `adminProductService.test.js` gains a
case for `getDistinctBrands()`.

## Out of scope

- No SKU column added to any admin product list/table view — this task
  only makes SKU searchable/settable, not a new displayed column.
- No brand filter added to the existing `ProductsPage.jsx` admin list —
  only the new Buying Guides Products step consumes it. Wiring it into
  the admin products list is a separate, future task if wanted.
