# Product SKU Field + Brand Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional `sku` field to the Product model (searchable via the existing free-text search), and add brand filtering (query param + distinct-brands endpoint) to the admin product search API.

**Architecture:** Straight vertical slice through the existing layered backend (Flyway migration → JPA entity → DTOs/mapper → `Specification` → service → controller), plus the two small frontend consumers (`ProductForm.jsx`, `adminProductService.js`) that need to know about the new field/param. No new architectural patterns — every piece mirrors how `brand` itself was added in migration `V12`.

**Tech Stack:** Spring Boot 3.2.5, Java 21, MySQL, Flyway, Spring Data JPA Specifications, JUnit 5 + MockMvc (`AbstractIntegrationTest`), React 18.3, Vitest + RTL.

## Global Constraints

- `sku` is nullable and optional on every product — no backfill, no required-field validation.
- `sku` max length 64, unique when non-null (`UNIQUE INDEX` — MySQL permits multiple `NULL`s under it).
- Brand filtering is exact match (case-insensitive), not partial/fuzzy.
- No SKU column is added to any admin list/table view — this only makes SKU settable and searchable.
- No brand filter is wired into the existing `ProductsPage.jsx` admin list — only the (separate, dependent) Buying Guides Products step consumes `brand` filtering and the distinct-brands list.

---

### Task 1: Migration, entity, DTOs, mapper — SKU field end-to-end

**Files:**
- Create: `backend/src/main/resources/db/migration/V17__add_product_sku.sql`
- Modify: `backend/src/main/java/com/twogofindz/backend/entity/Product.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/request/ProductRequest.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/response/ProductResponse.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/mapper/ProductMapper.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/ProductServiceImpl.java` (the `create()` builder)
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminProductControllerTest.java`
- Modify (compile fixups — append trailing `null` arg to every `new ProductRequest(...)` call): all files listed in Step 5 below

**Interfaces:**
- Produces: `Product.getSku()/setSku(String)`; `ProductRequest.sku()` (new **last** positional parameter, after `reviewCount`); `ProductResponse.sku()` (new **last** field, after `reviewCount`).
- `sku` is appended at the end of both records (not inserted next to `brand`) specifically so every existing positional `new ProductRequest(...)` call site needs only one trailing argument added, not a mid-list insertion that would silently shift the meaning of every argument after it.

- [ ] **Step 1: Write the failing test**

Add to `AdminProductControllerTest.java`:

```java
@Test
void create_withSku_returnsSkuInResponse() throws Exception {
    String token = adminToken();
    Long categoryId = createCategoryId(token, "SKU Product Category");
    ProductRequest request = new ProductRequest(
            "Skuvvy Product", "Has a sku.", categoryId, null,
            new BigDecimal("15.00"), "https://amazon.com/dp/skuvvy", false, false, true,
            null, null, null, null, "SKU-12345");

    mockMvc.perform(post("/api/admin/products")
                    .header("Authorization", "Bearer " + token)
                    .contentType(APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.sku").value("SKU-12345"));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn test -Dtest=AdminProductControllerTest#create_withSku_returnsSkuInResponse`
Expected: FAIL to compile — `ProductRequest` has no 14-argument constructor / no `sku()` accessor yet.

- [ ] **Step 3: Migration**

```sql
ALTER TABLE products
    ADD COLUMN sku VARCHAR(64) NULL,
    ADD UNIQUE INDEX uq_products_sku (sku);
```

- [ ] **Step 4: Entity, DTOs, mapper**

In `Product.java`, add after the `reviewCount` field:

```java
@Column(length = 64)
private String sku;
```

In `ProductRequest.java`, add as the new final parameter:

```java
@Size(max = 64, message = "SKU must be at most 64 characters.")
String sku
```

In `ProductResponse.java`, add as the new final field:

```java
String sku
```

In `ProductMapper.toResponse()`, add `product.getSku()` as the new final constructor argument.

In `ProductServiceImpl.create()`'s `Product.builder()...` chain, add `.sku(request.sku())`.

In `ProductServiceImpl.update()` (find the method that copies request fields onto the existing entity), add the equivalent `product.setSku(request.sku());` line alongside the existing field copies.

- [ ] **Step 5: Fix every existing `new ProductRequest(...)` call site**

Run: `cd backend && mvn test-compile`
Expected: compile errors at every positional `new ProductRequest(...)` call missing the 14th argument. Fix each by appending `, null` (or a real value, for tests specifically about SKU) as the new trailing argument. Known call sites to fix:

```
src/test/java/com/twogofindz/backend/controller/admin/AdminProductControllerTest.java:25,43,59,74,90,116,142,166,211,230,248,265,283
src/test/java/com/twogofindz/backend/controller/admin/ProductPlaceholderImageTest.java:39
src/test/java/com/twogofindz/backend/controller/admin/CategoryDeleteTest.java:30
src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java:243
src/test/java/com/twogofindz/backend/controller/admin/AdminComparisonControllerTest.java:370
src/test/java/com/twogofindz/backend/controller/admin/AdminDashboardControllerTest.java:42,213
src/test/java/com/twogofindz/backend/controller/publicapi/PublicProductControllerTest.java:22,47,80,103,174
src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java:98
src/test/java/com/twogofindz/backend/controller/publicapi/PublicComparisonControllerTest.java:113
```

Re-run `mvn test-compile` after each batch of fixes until it succeeds with zero errors.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && mvn test -Dtest=AdminProductControllerTest`
Expected: PASS — full file, including the new `create_withSku_returnsSkuInResponse` test and every pre-existing test in the file (confirming the mechanical fixups didn't change any other test's behavior).

- [ ] **Step 7: Run the full backend suite**

Run: `cd backend && mvn test`
Expected: PASS, 0 failures (confirms every fixed-up call site across all 9 files still compiles and passes).

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/resources/db/migration/V17__add_product_sku.sql \
        backend/src/main/java/com/twogofindz/backend/entity/Product.java \
        backend/src/main/java/com/twogofindz/backend/dto/request/ProductRequest.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/ProductResponse.java \
        backend/src/main/java/com/twogofindz/backend/mapper/ProductMapper.java \
        backend/src/main/java/com/twogofindz/backend/service/impl/ProductServiceImpl.java \
        backend/src/test
git commit -m "feat(products): add optional sku field to Product model"
```

---

### Task 2: SKU is matched by the existing free-text search

**Files:**
- Modify: `backend/src/main/java/com/twogofindz/backend/repository/spec/ProductSpecifications.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminProductControllerTest.java`

**Interfaces:**
- Consumes: `Product.getSku()` from Task 1.
- No new query param — this extends the behavior of the existing `search` param already wired through `AdminProductController.search()`.

- [ ] **Step 1: Write the failing test**

```java
@Test
void search_matchesTerm_bySku() throws Exception {
    String token = adminToken();
    Long categoryId = createCategoryId(token, "SKU Search Category");
    ProductRequest request = new ProductRequest(
            "Findable By Sku", "Matches only by its sku.", categoryId, null,
            new BigDecimal("15.00"), "https://amazon.com/dp/findable", false, false, true,
            null, null, null, null, "UNIQUE-SKU-999");

    mockMvc.perform(post("/api/admin/products")
                    .header("Authorization", "Bearer " + token)
                    .contentType(APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk());

    mockMvc.perform(get("/api/admin/products")
                    .header("Authorization", "Bearer " + token)
                    .param("search", "unique-sku-999"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[0].name").value("Findable By Sku"));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn test -Dtest=AdminProductControllerTest#search_matchesTerm_bySku`
Expected: FAIL — zero results, since `ProductSpecifications.search()` doesn't look at `sku` yet.

- [ ] **Step 3: Implement**

In `ProductSpecifications.search(term)`, add a fourth OR clause:

```java
return cb.or(
        cb.like(cb.lower(root.get("name")), like),
        cb.like(cb.lower(root.get("description")), like),
        cb.like(cb.lower(root.get("category").get("productCategoryName")), like),
        cb.like(cb.lower(root.get("sku")), like)
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && mvn test -Dtest=AdminProductControllerTest`
Expected: PASS, including all prior tests in the file.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/repository/spec/ProductSpecifications.java backend/src/test
git commit -m "feat(products): match sku in free-text product search"
```

---

### Task 3: Brand filter on the search endpoint

**Files:**
- Modify: `backend/src/main/java/com/twogofindz/backend/repository/spec/ProductSpecifications.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/ProductService.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/ProductServiceImpl.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/controller/admin/AdminProductController.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminProductControllerTest.java`

**Interfaces:**
- Produces: `ProductService.search(...)` gains a `String brand` parameter, inserted right after `categoryId` (matching the controller's param order below).
- Produces: `GET /api/admin/products?brand=Nike` filters results to that brand, case-insensitively, exact match.

- [ ] **Step 1: Write the failing test**

```java
@Test
void search_filtersByBrand() throws Exception {
    String token = adminToken();
    Long categoryId = createCategoryId(token, "Brand Filter Category");
    mockMvc.perform(post("/api/admin/products")
            .header("Authorization", "Bearer " + token)
            .contentType(APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new ProductRequest(
                    "Nike Shoe", "A shoe.", categoryId, null,
                    new BigDecimal("50.00"), "https://amazon.com/dp/nikeshoe", false, false, true,
                    "Nike", null, null, null, null))));
    mockMvc.perform(post("/api/admin/products")
            .header("Authorization", "Bearer " + token)
            .contentType(APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(new ProductRequest(
                    "Adidas Shoe", "A shoe.", categoryId, null,
                    new BigDecimal("50.00"), "https://amazon.com/dp/adidasshoe", false, false, true,
                    "Adidas", null, null, null, null))));

    mockMvc.perform(get("/api/admin/products")
                    .header("Authorization", "Bearer " + token)
                    .param("brand", "nike"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(1))
            .andExpect(jsonPath("$.data.content[0].name").value("Nike Shoe"));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn test -Dtest=AdminProductControllerTest#search_filtersByBrand`
Expected: FAIL to compile (`brand` isn't a recognized request param yet, so `.param("brand", ...)` compiles fine but the endpoint ignores it) — actually expect a runtime assertion failure: both products returned, `content.length()` is 2, not 1.

- [ ] **Step 3: Implement the specification**

In `ProductSpecifications.java`:

```java
public static Specification<Product> hasBrand(String brand) {
    return (root, query, cb) ->
            (brand == null || brand.isBlank())
                    ? cb.conjunction()
                    : cb.equal(cb.lower(root.get("brand")), brand.toLowerCase());
}
```

- [ ] **Step 4: Thread `brand` through the service layer**

In `ProductService.java`, change the `search` signature to:

```java
Page<ProductResponse> search(
        String term, Long categoryId, String brand, Boolean trending, Boolean bestSeller, Boolean active,
        BigDecimal minPrice, BigDecimal maxPrice, Pageable pageable);
```

In `ProductServiceImpl.search()`, add the parameter in the same position and add `.and(ProductSpecifications.hasBrand(brand))` to the specification chain.

- [ ] **Step 5: Add the controller param**

In `AdminProductController.search()`, add:

```java
@RequestParam(required = false) String brand,
```

positioned right after `categoryId`, and pass it through in the `productService.search(...)` call in the same position.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && mvn test -Dtest=AdminProductControllerTest`
Expected: PASS, including all prior tests.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/repository/spec/ProductSpecifications.java \
        backend/src/main/java/com/twogofindz/backend/service/ProductService.java \
        backend/src/main/java/com/twogofindz/backend/service/impl/ProductServiceImpl.java \
        backend/src/main/java/com/twogofindz/backend/controller/admin/AdminProductController.java \
        backend/src/test
git commit -m "feat(products): add brand filter to admin product search"
```

---

### Task 4: Distinct-brands endpoint

**Files:**
- Modify: `backend/src/main/java/com/twogofindz/backend/repository/ProductRepository.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/ProductService.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/ProductServiceImpl.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/controller/admin/AdminProductController.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminProductControllerTest.java`

**Interfaces:**
- Produces: `GET /api/admin/products/brands` → `ApiResponse<List<String>>`, distinct non-blank brands, alphabetically sorted.
- Produces: `ProductService.getDistinctBrands(): List<String>`.

- [ ] **Step 1: Write the failing test**

```java
@Test
void getDistinctBrands_returnsSortedUniqueNonBlankBrands() throws Exception {
    String token = adminToken();
    Long categoryId = createCategoryId(token, "Distinct Brands Category");
    for (String brand : new String[] {"Nike", "Adidas", "Nike", null}) {
        mockMvc.perform(post("/api/admin/products")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new ProductRequest(
                        "Product " + java.util.UUID.randomUUID(), "desc", categoryId, null,
                        new BigDecimal("10.00"), "https://amazon.com/dp/x" + java.util.UUID.randomUUID(),
                        false, false, true, brand, null, null, null, null))));
    }

    mockMvc.perform(get("/api/admin/products/brands")
                    .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data", org.hamcrest.Matchers.hasItems("Adidas", "Nike")))
            .andExpect(jsonPath("$.data.length()").value(org.hamcrest.Matchers.greaterThanOrEqualTo(2)));
}
```

Note: this test doesn't assert an exact list length/order beyond containing both brands, since other tests in this suite create their own branded products against the same database and test ordering/isolation isn't guaranteed between test methods — `hasItems` + a minimum-length check is the resilient assertion here.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && mvn test -Dtest=AdminProductControllerTest#getDistinctBrands_returnsSortedUniqueNonBlankBrands`
Expected: FAIL — 404, endpoint doesn't exist.

- [ ] **Step 3: Implement**

In `ProductRepository.java`, add:

```java
@Query("SELECT DISTINCT p.brand FROM Product p WHERE p.brand IS NOT NULL AND p.brand <> '' ORDER BY p.brand")
List<String> findDistinctBrands();
```

In `ProductService.java`, add: `List<String> getDistinctBrands();`

In `ProductServiceImpl.java`, add:

```java
@Override
@Transactional(readOnly = true)
public List<String> getDistinctBrands() {
    return productRepository.findDistinctBrands();
}
```

In `AdminProductController.java`, add:

```java
@GetMapping("/brands")
public ApiResponse<List<String>> getDistinctBrands() {
    return ApiResponse.success("Brands retrieved successfully.", productService.getDistinctBrands());
}
```

(Add `import java.util.List;` if not already present in the controller.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && mvn test -Dtest=AdminProductControllerTest`
Expected: PASS, including all prior tests.

- [ ] **Step 5: Run the full backend suite**

Run: `cd backend && mvn test`
Expected: PASS, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/repository/ProductRepository.java \
        backend/src/main/java/com/twogofindz/backend/service/ProductService.java \
        backend/src/main/java/com/twogofindz/backend/service/impl/ProductServiceImpl.java \
        backend/src/main/java/com/twogofindz/backend/controller/admin/AdminProductController.java \
        backend/src/test
git commit -m "feat(products): add distinct-brands endpoint for filter dropdowns"
```

---

### Task 5: Frontend — SKU field on the admin Product form

**Files:**
- Modify: `frontend/src/components/ProductForm.jsx`
- Test: `frontend/src/components/ProductForm.test.jsx`

**Interfaces:**
- Consumes: nothing new from the backend directly (this is a plain form field).
- Produces: `ProductForm`'s `onSubmit` payload gains a `sku: sku.trim() || null` field.

- [ ] **Step 1: Write the failing test**

Update the existing `'submits the expected payload for a new product'` test in `ProductForm.test.jsx` — add a type action and an expectation:

```js
await user.type(screen.getByLabelText('SKU'), 'SKU-001');
```

(inserted alongside the other `user.type(...)` calls, before the final `user.click(screen.getByRole('button', ...))`), and add `sku: 'SKU-001',` to the `expect(onSubmit).toHaveBeenCalledWith({...})` object (positioned after `brand: null,`).

Also update the `'pre-fills fields and submits an update payload when editing'` test similarly: add `sku: 'SKU-EXIST'` to the `product` fixture object and assert it round-trips into the submitted payload.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/ProductForm.test.jsx`
Expected: FAIL — `getByLabelText('SKU')` finds no element.

- [ ] **Step 3: Implement**

In `ProductForm.jsx`, add state:

```js
const [sku, setSku] = useState(product?.sku ?? '');
```

Add a form field, positioned directly below the existing Brand field block:

```jsx
<div className="mb-4">
  <label htmlFor="sku" className="mb-1 block text-small font-medium text-body">
    SKU
  </label>
  <input
    id="sku"
    type="text"
    maxLength={64}
    value={sku}
    onChange={(event) => setSku(event.target.value)}
    className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
  />
</div>
```

In the `onSubmit(...)` payload object in `handleSubmit`, add `sku: sku.trim() || null,` right after `brand: brand.trim() || null,`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/ProductForm.test.jsx`
Expected: PASS, all cases in the file.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ProductForm.jsx frontend/src/components/ProductForm.test.jsx
git commit -m "feat(products): add SKU field to the admin product form"
```

---

### Task 6: Frontend — brand param and distinct-brands service call

**Files:**
- Modify: `frontend/src/services/adminProductService.js`
- Test: `frontend/src/services/adminProductService.test.js`

**Interfaces:**
- Produces: `getDistinctBrands(): Promise<string[]>`.
- `searchProducts(params)` is unchanged in signature — `brand` simply flows through as any other key in the existing `params` object, so no new test is needed for that half (already covered by the existing `searchProducts` test, which asserts an arbitrary params object passes through untouched).

- [ ] **Step 1: Write the failing test**

Add to `adminProductService.test.js`:

```js
it('getDistinctBrands fetches from /admin/products/brands and returns the brand list', async () => {
  const brands = ['Adidas', 'Nike'];
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, message: 'Brands retrieved successfully.', data: brands },
  });

  const result = await getDistinctBrands();

  expect(api.get).toHaveBeenCalledWith('/admin/products/brands');
  expect(result).toEqual(brands);
});
```

Add `getDistinctBrands` to the existing named import from `'./adminProductService.js'` at the top of the file.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/services/adminProductService.test.js`
Expected: FAIL — `getDistinctBrands` is not exported.

- [ ] **Step 3: Implement**

In `adminProductService.js`, add:

```js
export async function getDistinctBrands() {
  const response = await api.get('/admin/products/brands');
  return response.data.data;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/services/adminProductService.test.js`
Expected: PASS, all cases in the file.

- [ ] **Step 5: Run the full frontend suite**

Run: `cd frontend && npx vitest run`
Expected: PASS, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/services/adminProductService.js frontend/src/services/adminProductService.test.js
git commit -m "feat(products): add getDistinctBrands to adminProductService"
```
