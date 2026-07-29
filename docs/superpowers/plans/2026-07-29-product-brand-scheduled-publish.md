# Product Brand & Scheduled Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional Brand field and an automatic scheduled-publish option to the admin Product form, backed by a new database columns, a scheduled backend job, and updated admin UI.

**Architecture:** A DB migration adds two nullable columns (`brand`, `scheduled_publish_at`) to `products`. `ProductRequest`/`ProductResponse`/`Product` carry the new fields. `ProductServiceImpl` forces `active = false` server-side whenever a `scheduledPublishAt` is present, regardless of what the client sends for `active`. A new `@Scheduled` job polls every 60 seconds for products whose scheduled time has passed and activates them. The frontend `ProductForm` gets a Brand text field and a hand-built switch control that swaps the existing Active checkbox for a `datetime-local` picker when "Schedule for later" is on; `ProductsPage` gains a Brand column and a "Scheduled" status badge.

**Tech Stack:** Spring Boot 3 (Java 21), Spring Data JPA, Flyway, MySQL (Testcontainers in tests), React, Vitest, React Testing Library.

## Global Constraints

- `brand`: optional `String`, max 200 characters, no `@NotBlank`/`@NotNull` — existing products need no backfill.
- `scheduledPublishAt`: optional `LocalDateTime`, validated `@Future` when present (Jakarta's `@Future` is a no-op on `null`).
- **Record field order deviation from the design spec:** the design spec said to insert `brand`/`scheduledPublishAt` into `ProductRequest` "after productLink and before trending/bestSeller/active." During planning, 22 existing positional `new ProductRequest(...)` call sites were found across 9 test files. Inserting in the middle would require re-locating and editing an argument in the middle of an arbitrarily-wrapped list at every site. Appending both fields at the **end** of the record (after `active`) instead lets every one of those 22 call sites be fixed by the same mechanical transformation (append `, null, null` before the closing paren) — same behavior and validation, just a safer, more mechanical implementation. `ProductResponse` similarly appends both fields after `updatedAt`.
- Server-side effective active: `boolean effectiveActive = request.scheduledPublishAt() != null ? false : request.active();` — applied in both `create` and `update`, as a safety net independent of what the frontend sends.
- Scheduler: `@Scheduled(fixedRate = 60000)`, queries `active = false AND scheduledPublishAt <= now()`, sets `active = true` and `scheduledPublishAt = null` on each match.
- Frontend switch: default off (Publish immediately). When on: Active checkbox hidden, `datetime-local` field shown and required, submit sends `active: false`. When off: unchanged existing behavior, submit sends `scheduledPublishAt: null`.
- No changes to the public catalog, search, or comparison endpoints — `active` keeps its exact current meaning everywhere else.

---

### Task 1: Database migration and `Product` entity fields

**Files:**
- Create: `backend/src/main/resources/db/migration/V12__add_product_brand_and_scheduled_publish.sql`
- Modify: `backend/src/main/java/com/twogofindz/backend/entity/Product.java`

**Interfaces:**
- Produces: `Product.getBrand()`/`setBrand(String)`, `Product.getScheduledPublishAt()`/`setScheduledPublishAt(LocalDateTime)` — consumed by Task 2's mapper and Task 3's service logic.

No test file for this task alone — the migration and entity fields are exercised by Task 2 onward. This is a direct-edit task (schema change, no unit to TDD in isolation).

- [ ] **Step 1: Create the migration**

```sql
ALTER TABLE products
    ADD COLUMN brand VARCHAR(200) NULL,
    ADD COLUMN scheduled_publish_at TIMESTAMP NULL;
```

- [ ] **Step 2: Add the two fields to `Product.java`**

In `backend/src/main/java/com/twogofindz/backend/entity/Product.java`, change:

```java
    @Column(nullable = false)
    private boolean active;

    @Generated(event = {EventType.INSERT, EventType.UPDATE})
```

to:

```java
    @Column(nullable = false)
    private boolean active;

    @Column(length = 200)
    private String brand;

    @Column(name = "scheduled_publish_at")
    private LocalDateTime scheduledPublishAt;

    @Generated(event = {EventType.INSERT, EventType.UPDATE})
```

(`LocalDateTime` is already imported in this file.)

- [ ] **Step 3: Verify the project still compiles**

Run: `mvn -q compile` (from `backend/`)
Expected: BUILD SUCCESS.

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/db/migration/V12__add_product_brand_and_scheduled_publish.sql backend/src/main/java/com/twogofindz/backend/entity/Product.java
git commit -m "feat(product): add brand and scheduledPublishAt columns"
```

---

### Task 2: DTOs, mapper, and fixing every existing `ProductRequest` call site

**Files:**
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/request/ProductRequest.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/response/ProductResponse.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/mapper/ProductMapper.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminProductControllerTest.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicProductControllerTest.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminDashboardControllerTest.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/admin/ProductPlaceholderImageTest.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminComparisonControllerTest.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/admin/CategoryDeleteTest.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicComparisonControllerTest.java`

**Interfaces:**
- Consumes: `Product.getBrand()`/`getScheduledPublishAt()` from Task 1.
- Produces: `ProductRequest(name, description, categoryId, imageFileName, productPrice, productLink, trending, bestSeller, active, brand, scheduledPublishAt)` and `ProductResponse(..., updatedAt, brand, scheduledPublishAt)` — the exact 11-arg / 15-arg positional shapes every later task and every test in this codebase must use from now on.

This task's job is to land the two new DTO fields **without changing any behavior yet** (Task 3 wires them into the service layer) and without breaking the build — every existing positional `new ProductRequest(...)` call must keep compiling and every existing test must keep passing.

- [ ] **Step 1: Add `brand` and `scheduledPublishAt` to `ProductRequest`**

Change `backend/src/main/java/com/twogofindz/backend/dto/request/ProductRequest.java` from:

```java
package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ProductRequest(
        @NotBlank(message = "Product name is required.")
        @Size(max = 200, message = "Product name must be at most 200 characters.")
        String name,

        @NotBlank(message = "Description is required.") String description,
        @NotNull(message = "Category is required.") Long categoryId,

        @Size(max = 255, message = "Image file name must be at most 255 characters.")
        String imageFileName,

        @NotNull(message = "Price is required.")
        @DecimalMin(value = "0.00", message = "Price must be greater than or equal to zero.")
        BigDecimal productPrice,

        @NotBlank(message = "Product URL is required.")
        @Size(max = 2048, message = "Product URL must be at most 2048 characters.")
        @Pattern(regexp = "^https://.+", message = "Product URL must be a valid HTTPS link.")
        String productLink,

        @NotNull(message = "Trending flag is required.") Boolean trending,
        @NotNull(message = "Best seller flag is required.") Boolean bestSeller,
        @NotNull(message = "Active flag is required.") Boolean active
) {
}
```

to:

```java
package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ProductRequest(
        @NotBlank(message = "Product name is required.")
        @Size(max = 200, message = "Product name must be at most 200 characters.")
        String name,

        @NotBlank(message = "Description is required.") String description,
        @NotNull(message = "Category is required.") Long categoryId,

        @Size(max = 255, message = "Image file name must be at most 255 characters.")
        String imageFileName,

        @NotNull(message = "Price is required.")
        @DecimalMin(value = "0.00", message = "Price must be greater than or equal to zero.")
        BigDecimal productPrice,

        @NotBlank(message = "Product URL is required.")
        @Size(max = 2048, message = "Product URL must be at most 2048 characters.")
        @Pattern(regexp = "^https://.+", message = "Product URL must be a valid HTTPS link.")
        String productLink,

        @NotNull(message = "Trending flag is required.") Boolean trending,
        @NotNull(message = "Best seller flag is required.") Boolean bestSeller,
        @NotNull(message = "Active flag is required.") Boolean active,

        @Size(max = 200, message = "Brand must be at most 200 characters.")
        String brand,

        @Future(message = "Scheduled publish date must be in the future.")
        LocalDateTime scheduledPublishAt
) {
}
```

- [ ] **Step 2: Add `brand` and `scheduledPublishAt` to `ProductResponse`**

Change `backend/src/main/java/com/twogofindz/backend/dto/response/ProductResponse.java` from:

```java
package com.twogofindz.backend.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ProductResponse(
        Long id,
        String name,
        String description,
        Long categoryId,
        String categoryName,
        String imageFileName,
        BigDecimal productPrice,
        String productLink,
        boolean trending,
        boolean bestSeller,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
```

to:

```java
package com.twogofindz.backend.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ProductResponse(
        Long id,
        String name,
        String description,
        Long categoryId,
        String categoryName,
        String imageFileName,
        BigDecimal productPrice,
        String productLink,
        boolean trending,
        boolean bestSeller,
        boolean active,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String brand,
        LocalDateTime scheduledPublishAt
) {
}
```

- [ ] **Step 3: Update `ProductMapper.toResponse`**

Change `backend/src/main/java/com/twogofindz/backend/mapper/ProductMapper.java`'s return statement from:

```java
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getCategory().getId(),
                product.getCategory().getProductCategoryName(),
                imageFileName,
                product.getProductPrice(),
                product.getProductLink(),
                product.isTrending(),
                product.isBestSeller(),
                product.isActive(),
                product.getCreatedAt(),
                product.getUpdatedAt()
        );
```

to:

```java
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getCategory().getId(),
                product.getCategory().getProductCategoryName(),
                imageFileName,
                product.getProductPrice(),
                product.getProductLink(),
                product.isTrending(),
                product.isBestSeller(),
                product.isActive(),
                product.getCreatedAt(),
                product.getUpdatedAt(),
                product.getBrand(),
                product.getScheduledPublishAt()
        );
```

- [ ] **Step 4: Fix `AdminProductControllerTest.java` (8 call sites)**

This file has 7 calls ending in the literal `false, false, true)` and 1 call ending in `true, false, true)` — both substrings are unique to their respective call sites within this file (verified during planning: 7 and 1 occurrences respectively, no unrelated matches).

Apply two edits:

Replace **every** occurrence of:
```java
false, false, true)
```
with:
```java
false, false, true, null, null)
```

Then replace the one remaining occurrence of:
```java
true, false, true)
```
with:
```java
true, false, true, null, null)
```

- [ ] **Step 5: Fix `PublicProductControllerTest.java` (5 call sites)**

Apply three edits, each replacing **every** occurrence in the file (verified during planning: 2, 2, and 1 occurrences respectively):

`false, false, false)` → `false, false, false, null, null)`

`false, false, true)` → `false, false, true, null, null)`

`false, false, active)` → `false, false, active, null, null)`

- [ ] **Step 6: Fix `AdminDashboardControllerTest.java` (2 call sites)**

Change:
```java
                                false, false, true))))
```
to:
```java
                                false, false, true, null, null))))
```

Change:
```java
                                price, link, trending, bestSeller, active))))
```
to:
```java
                                price, link, trending, bestSeller, active, null, null))))
```

- [ ] **Step 7: Fix the remaining 6 single-call-site files**

Each of these files has exactly one `new ProductRequest(...)` call ending in the literal `false, false, true)` (verified unique during planning). In each file, replace:
```java
false, false, true)
```
with:
```java
false, false, true, null, null)
```

Apply this to:
- `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java`
- `backend/src/test/java/com/twogofindz/backend/controller/admin/ProductPlaceholderImageTest.java`
- `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java`
- `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminComparisonControllerTest.java`
- `backend/src/test/java/com/twogofindz/backend/controller/admin/CategoryDeleteTest.java`
- `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicComparisonControllerTest.java`

- [ ] **Step 8: Run the full backend test suite**

Run: `mvn -q test` (from `backend/`)
Expected: BUILD SUCCESS, every existing test passes unchanged (brand/scheduledPublishAt are `null` in every existing call, which is valid — both are optional).

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/dto/request/ProductRequest.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/ProductResponse.java \
        backend/src/main/java/com/twogofindz/backend/mapper/ProductMapper.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/AdminProductControllerTest.java \
        backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicProductControllerTest.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/AdminDashboardControllerTest.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/ProductPlaceholderImageTest.java \
        backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/AdminComparisonControllerTest.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/CategoryDeleteTest.java \
        backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicComparisonControllerTest.java
git commit -m "feat(product): add brand and scheduledPublishAt to request/response DTOs"
```

---

### Task 3: Wire brand and scheduled-active logic into `ProductServiceImpl`

**Files:**
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/ProductServiceImpl.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminProductControllerTest.java`

**Interfaces:**
- Consumes: `ProductRequest.brand()`/`.scheduledPublishAt()` and `ProductResponse.brand`/`.scheduledPublishAt` from Task 2.
- Produces: the effective-active computation later tasks (and the scheduler in Task 4) rely on — a product saved with a non-null `scheduledPublishAt` is always persisted with `active = false`.

- [ ] **Step 1: Write the failing tests**

Add to `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminProductControllerTest.java`:

```java
    @Test
    void create_withScheduledPublishAt_forcesActiveFalse() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Scheduled Product Category");
        ProductRequest request = new ProductRequest(
                "Scheduled Product", "Will publish later.", categoryId, null,
                new BigDecimal("15.00"), "https://amazon.com/dp/scheduled", false, false, true,
                null, LocalDateTime.now().plusDays(2));

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.active").value(false))
                .andExpect(jsonPath("$.data.scheduledPublishAt").isNotEmpty());
    }

    @Test
    void create_withBrand_returnsBrandInResponse() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Brand Product Category");
        ProductRequest request = new ProductRequest(
                "Branded Product", "Has a brand.", categoryId, null,
                new BigDecimal("15.00"), "https://amazon.com/dp/branded", false, false, true,
                "Nike", null);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.brand").value("Nike"));
    }

    @Test
    void create_returns400_withPastScheduledPublishAt() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Past Schedule Category");
        ProductRequest request = new ProductRequest(
                "Bad Schedule Product", "Scheduled in the past.", categoryId, null,
                new BigDecimal("15.00"), "https://amazon.com/dp/pastschedule", false, false, true,
                null, LocalDateTime.now().minusDays(1));

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
```

Add `import java.time.LocalDateTime;` to this file's imports if not already present (it is not — verify and add alongside the existing `java.math.BigDecimal` import).

- [ ] **Step 2: Run the new tests to verify they fail**

Run: `mvn -q test -Dtest=AdminProductControllerTest#create_withScheduledPublishAt_forcesActiveFalse+create_withBrand_returnsBrandInResponse+create_returns400_withPastScheduledPublishAt` (from `backend/`)
Expected: the first two FAIL (brand/scheduledPublishAt aren't wired into the entity yet, so the response still reflects the raw request's `active: true` and no `brand`); the third passes already (bean validation runs before the service layer).

- [ ] **Step 3: Wire the fields into `ProductServiceImpl`**

Change `backend/src/main/java/com/twogofindz/backend/service/impl/ProductServiceImpl.java`'s `create` method from:

```java
    @Override
    @Transactional
    public ProductResponse create(ProductRequest request) {
        ProductCategory category = findCategory(request.categoryId());
        Product product = Product.builder()
                .name(request.name())
                .description(request.description())
                .category(category)
                .imageFileName(request.imageFileName())
                .productPrice(request.productPrice())
                .productLink(request.productLink())
                .trending(request.trending())
                .bestSeller(request.bestSeller())
                .active(request.active())
                .build();
        return productMapper.toResponse(productRepository.save(product));
    }
```

to:

```java
    @Override
    @Transactional
    public ProductResponse create(ProductRequest request) {
        ProductCategory category = findCategory(request.categoryId());
        boolean effectiveActive = request.scheduledPublishAt() != null ? false : request.active();
        Product product = Product.builder()
                .name(request.name())
                .description(request.description())
                .category(category)
                .imageFileName(request.imageFileName())
                .productPrice(request.productPrice())
                .productLink(request.productLink())
                .trending(request.trending())
                .bestSeller(request.bestSeller())
                .active(effectiveActive)
                .brand(request.brand())
                .scheduledPublishAt(request.scheduledPublishAt())
                .build();
        return productMapper.toResponse(productRepository.save(product));
    }
```

And its `update` method from:

```java
    @Override
    @Transactional
    public ProductResponse update(Long id, ProductRequest request) {
        Product product = findProduct(id);
        ProductCategory category = findCategory(request.categoryId());

        product.setName(request.name());
        product.setDescription(request.description());
        product.setCategory(category);
        product.setImageFileName(request.imageFileName());
        product.setProductPrice(request.productPrice());
        product.setProductLink(request.productLink());
        product.setTrending(request.trending());
        product.setBestSeller(request.bestSeller());
        product.setActive(request.active());

        return productMapper.toResponse(productRepository.save(product));
    }
```

to:

```java
    @Override
    @Transactional
    public ProductResponse update(Long id, ProductRequest request) {
        Product product = findProduct(id);
        ProductCategory category = findCategory(request.categoryId());
        boolean effectiveActive = request.scheduledPublishAt() != null ? false : request.active();

        product.setName(request.name());
        product.setDescription(request.description());
        product.setCategory(category);
        product.setImageFileName(request.imageFileName());
        product.setProductPrice(request.productPrice());
        product.setProductLink(request.productLink());
        product.setTrending(request.trending());
        product.setBestSeller(request.bestSeller());
        product.setActive(effectiveActive);
        product.setBrand(request.brand());
        product.setScheduledPublishAt(request.scheduledPublishAt());

        return productMapper.toResponse(productRepository.save(product));
    }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `mvn -q test -Dtest=AdminProductControllerTest` (from `backend/`)
Expected: BUILD SUCCESS, all tests in this file pass, including the 3 new ones.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/service/impl/ProductServiceImpl.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/AdminProductControllerTest.java
git commit -m "feat(product): force active false when a product is scheduled, wire brand"
```

---

### Task 4: Automatic publish scheduler

**Files:**
- Modify: `backend/src/main/java/com/twogofindz/backend/repository/ProductRepository.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/BackendApplication.java`
- Create: `backend/src/main/java/com/twogofindz/backend/scheduler/ProductPublishScheduler.java`
- Create: `backend/src/test/java/com/twogofindz/backend/scheduler/ProductPublishSchedulerTest.java`

**Interfaces:**
- Consumes: `Product.setActive(boolean)`/`.setScheduledPublishAt(LocalDateTime)` (Task 1), `ProductRepository` (existing).
- Produces: `ProductPublishScheduler.publishScheduledProducts()` — a public, directly-callable method (also fired automatically every 60s in production via `@Scheduled`), called directly by its own test to avoid waiting on the real timer.

- [ ] **Step 1: Write the failing tests**

Create `backend/src/test/java/com/twogofindz/backend/scheduler/ProductPublishSchedulerTest.java`:

```java
package com.twogofindz.backend.scheduler;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.entity.ProductCategory;
import com.twogofindz.backend.repository.ProductCategoryRepository;
import com.twogofindz.backend.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class ProductPublishSchedulerTest extends AbstractIntegrationTest {

    @Autowired
    private ProductPublishScheduler scheduler;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductCategoryRepository productCategoryRepository;

    @Test
    @Transactional
    void publishScheduledProducts_activatesDueProduct_andClearsScheduledDate() {
        ProductCategory category = productCategoryRepository.save(
                ProductCategory.builder().productCategoryName("Scheduler Due Category")
                        .commissionRate(new BigDecimal("5.00")).build());
        Product due = productRepository.save(Product.builder()
                .name("Due Product").description("Should be published by the scheduler.").category(category)
                .productPrice(new BigDecimal("10.00")).productLink("https://amazon.com/dp/due")
                .trending(false).bestSeller(false).active(false)
                .scheduledPublishAt(LocalDateTime.now().minusMinutes(1))
                .build());

        scheduler.publishScheduledProducts();

        Product refreshed = productRepository.findById(due.getId()).orElseThrow();
        assertThat(refreshed.isActive()).isTrue();
        assertThat(refreshed.getScheduledPublishAt()).isNull();
    }

    @Test
    @Transactional
    void publishScheduledProducts_leavesNotYetDueProductUntouched() {
        ProductCategory category = productCategoryRepository.save(
                ProductCategory.builder().productCategoryName("Scheduler Not Due Category")
                        .commissionRate(new BigDecimal("5.00")).build());
        Product notDue = productRepository.save(Product.builder()
                .name("Not Due Product").description("Should stay inactive.").category(category)
                .productPrice(new BigDecimal("10.00")).productLink("https://amazon.com/dp/notdue")
                .trending(false).bestSeller(false).active(false)
                .scheduledPublishAt(LocalDateTime.now().plusDays(1))
                .build());

        scheduler.publishScheduledProducts();

        Product refreshed = productRepository.findById(notDue.getId()).orElseThrow();
        assertThat(refreshed.isActive()).isFalse();
        assertThat(refreshed.getScheduledPublishAt()).isNotNull();
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `mvn -q test -Dtest=ProductPublishSchedulerTest` (from `backend/`)
Expected: FAIL to compile — `ProductPublishScheduler` doesn't exist yet.

- [ ] **Step 3: Add the repository query method**

In `backend/src/main/java/com/twogofindz/backend/repository/ProductRepository.java`, add inside the interface (both `LocalDateTime` and `List` are already imported):

```java
    List<Product> findByActiveFalseAndScheduledPublishAtLessThanEqual(LocalDateTime now);
```

- [ ] **Step 4: Create the scheduler**

Create `backend/src/main/java/com/twogofindz/backend/scheduler/ProductPublishScheduler.java`:

```java
package com.twogofindz.backend.scheduler;

import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.repository.ProductRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class ProductPublishScheduler {

    private final ProductRepository productRepository;

    public ProductPublishScheduler(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void publishScheduledProducts() {
        List<Product> due = productRepository
                .findByActiveFalseAndScheduledPublishAtLessThanEqual(LocalDateTime.now());
        due.forEach(product -> {
            product.setActive(true);
            product.setScheduledPublishAt(null);
        });
        productRepository.saveAll(due);
    }
}
```

- [ ] **Step 5: Enable scheduling**

Change `backend/src/main/java/com/twogofindz/backend/BackendApplication.java` from:

```java
package com.twogofindz.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }
}
```

to:

```java
package com.twogofindz.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BackendApplication {
    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `mvn -q test -Dtest=ProductPublishSchedulerTest` (from `backend/`)
Expected: BUILD SUCCESS, both tests pass.

- [ ] **Step 7: Run the full backend suite**

Run: `mvn -q test` (from `backend/`)
Expected: BUILD SUCCESS — `@EnableScheduling` starts the real 60-second timer in every test's Spring context too, but since it only *activates* already-due products (a no-op when none exist) it doesn't affect any other test's assertions.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/repository/ProductRepository.java \
        backend/src/main/java/com/twogofindz/backend/BackendApplication.java \
        backend/src/main/java/com/twogofindz/backend/scheduler/ProductPublishScheduler.java \
        backend/src/test/java/com/twogofindz/backend/scheduler/ProductPublishSchedulerTest.java
git commit -m "feat(product): add scheduler that auto-publishes due products"
```

---

### Task 5: Product form — Brand field and schedule switch

**Files:**
- Modify: `frontend/src/components/ProductForm.jsx`
- Modify: `frontend/src/components/ProductForm.test.jsx`

**Interfaces:**
- Produces: `onSubmit` payload gains `brand: string | null` and `scheduledPublishAt: string | null` (ISO 8601), and `active` is now computed as `isScheduled ? false : active`. Later tasks don't consume this directly, but `adminProductService.createProduct`/`updateProduct` (unchanged, plain passthrough) forward it to the API built in Tasks 2–3.

- [ ] **Step 1: Write the failing tests**

In `frontend/src/components/ProductForm.test.jsx`, update the two existing payload-assertion tests to include the two new fields. Change:

```js
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Wireless Earbuds',
      description: 'Compact wireless earbuds.',
      categoryId: 1,
      imageFileName: null,
      productPrice: 49.99,
      productLink: 'https://amazon.com/dp/example',
      trending: true,
      bestSeller: false,
      active: true,
    });
  });

  it('pre-fills fields and submits an update payload when editing', async () => {
```

to:

```js
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Wireless Earbuds',
      description: 'Compact wireless earbuds.',
      categoryId: 1,
      imageFileName: null,
      productPrice: 49.99,
      productLink: 'https://amazon.com/dp/example',
      trending: true,
      bestSeller: false,
      active: true,
      brand: null,
      scheduledPublishAt: null,
    });
  });

  it('pre-fills fields and submits an update payload when editing', async () => {
```

And change the second assertion from:

```js
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Wireless Earbuds',
      description: 'Compact wireless earbuds.',
      categoryId: 1,
      imageFileName: 'img_existing.webp',
      productPrice: 49.99,
      productLink: 'https://amazon.com/dp/example',
      trending: false,
      bestSeller: true,
      active: true,
    });
  });
```

to:

```js
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Wireless Earbuds',
      description: 'Compact wireless earbuds.',
      categoryId: 1,
      imageFileName: 'img_existing.webp',
      productPrice: 49.99,
      productLink: 'https://amazon.com/dp/example',
      trending: false,
      bestSeller: true,
      active: true,
      brand: null,
      scheduledPublishAt: null,
    });
  });
```

Then add these new tests at the end of the `describe('ProductForm', ...)` block, right before the final closing `});`:

```js
  it('submits a trimmed brand value', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ProductForm product={null} categories={categories} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Product Name'), 'Wireless Earbuds');
    await user.type(screen.getByLabelText('Brand'), '  Sony  ');
    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await user.type(screen.getByLabelText('Description'), 'Compact wireless earbuds.');
    await user.type(screen.getByLabelText('Price ($)'), '49.99');
    await user.type(screen.getByLabelText('Amazon Affiliate Link'), 'https://amazon.com/dp/example');
    await user.click(screen.getByRole('button', { name: 'Add Product' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ brand: 'Sony' }));
  });

  it('hides the Active checkbox and shows a date/time field when Schedule for later is toggled on', async () => {
    const user = userEvent.setup();
    render(<ProductForm product={null} categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('checkbox', { name: 'Active' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Publish Date & Time')).not.toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: 'Schedule for later' }));

    expect(screen.queryByRole('checkbox', { name: 'Active' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Publish Date & Time')).toBeInTheDocument();
  });

  it('requires a scheduled date when Schedule for later is on', async () => {
    const user = userEvent.setup();
    render(<ProductForm product={null} categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Product Name'), 'Wireless Earbuds');
    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await user.type(screen.getByLabelText('Description'), 'Compact wireless earbuds.');
    await user.type(screen.getByLabelText('Price ($)'), '49.99');
    await user.type(screen.getByLabelText('Amazon Affiliate Link'), 'https://amazon.com/dp/example');
    await user.click(screen.getByRole('switch', { name: 'Schedule for later' }));
    await user.click(screen.getByRole('button', { name: 'Add Product' }));

    expect(await screen.findByText('Scheduled date is required.')).toBeInTheDocument();
  });

  it('rejects a scheduled date that is not in the future', async () => {
    const user = userEvent.setup();
    render(<ProductForm product={null} categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Product Name'), 'Wireless Earbuds');
    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await user.type(screen.getByLabelText('Description'), 'Compact wireless earbuds.');
    await user.type(screen.getByLabelText('Price ($)'), '49.99');
    await user.type(screen.getByLabelText('Amazon Affiliate Link'), 'https://amazon.com/dp/example');
    await user.click(screen.getByRole('switch', { name: 'Schedule for later' }));
    await user.type(screen.getByLabelText('Publish Date & Time'), '2020-01-01T10:00');
    await user.click(screen.getByRole('button', { name: 'Add Product' }));

    expect(await screen.findByText('Scheduled date must be in the future.')).toBeInTheDocument();
  });

  it('submits active:false and an ISO scheduled date when scheduling is on', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ProductForm product={null} categories={categories} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Product Name'), 'Wireless Earbuds');
    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await user.type(screen.getByLabelText('Description'), 'Compact wireless earbuds.');
    await user.type(screen.getByLabelText('Price ($)'), '49.99');
    await user.type(screen.getByLabelText('Amazon Affiliate Link'), 'https://amazon.com/dp/example');
    await user.click(screen.getByRole('switch', { name: 'Schedule for later' }));
    await user.type(screen.getByLabelText('Publish Date & Time'), '2030-06-15T10:00');
    await user.click(screen.getByRole('button', { name: 'Add Product' }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        active: false,
        scheduledPublishAt: new Date('2030-06-15T10:00').toISOString(),
      })
    );
  });

  it('pre-fills the schedule switch and date when editing a product that already has a scheduledPublishAt', async () => {
    const product = {
      id: 5,
      name: 'Wireless Earbuds',
      description: 'Compact wireless earbuds.',
      categoryId: 1,
      imageFileName: null,
      productPrice: 49.99,
      productLink: 'https://amazon.com/dp/example',
      trending: false,
      bestSeller: false,
      active: false,
      scheduledPublishAt: '2030-06-15T10:00:00',
    };
    render(<ProductForm product={product} categories={categories} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByRole('switch', { name: 'Schedule for later' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText('Publish Date & Time')).toHaveValue('2030-06-15T10:00');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- --run ProductForm` (from `frontend/`)
Expected: FAIL — `Brand` label doesn't exist, `switch` role doesn't exist, payload assertions missing the two new keys.

- [ ] **Step 3: Implement the form changes**

In `frontend/src/components/ProductForm.jsx`, add new state right after the existing `active` state:

```jsx
  const [active, setActive] = useState(product?.active ?? true);
  const [brand, setBrand] = useState(product?.brand ?? '');
  const [isScheduled, setIsScheduled] = useState(Boolean(product?.scheduledPublishAt));
  const [scheduledPublishAt, setScheduledPublishAt] = useState(
    product?.scheduledPublishAt ? product.scheduledPublishAt.slice(0, 16) : ''
  );
```

Update `validate()` — change:

```jsx
  function validate() {
    const errors = {};
    if (!name.trim()) errors.name = 'Product name is required.';
    if (!description.trim()) errors.description = 'Description is required.';
    if (!categoryId) errors.categoryId = 'Category is required.';
    const priceValue = Number(productPrice);
    if (productPrice === '' || Number.isNaN(priceValue)) {
      errors.productPrice = 'Price is required.';
    } else if (priceValue < 0) {
      errors.productPrice = 'Price must be greater than or equal to zero.';
    }
    if (!productLink.trim()) {
      errors.productLink = 'Product URL is required.';
    } else if (!/^https:\/\/.+/.test(productLink.trim())) {
      errors.productLink = 'Product URL must be a valid HTTPS link.';
    }
    return errors;
  }
```

to:

```jsx
  function validate() {
    const errors = {};
    if (!name.trim()) errors.name = 'Product name is required.';
    if (!description.trim()) errors.description = 'Description is required.';
    if (!categoryId) errors.categoryId = 'Category is required.';
    const priceValue = Number(productPrice);
    if (productPrice === '' || Number.isNaN(priceValue)) {
      errors.productPrice = 'Price is required.';
    } else if (priceValue < 0) {
      errors.productPrice = 'Price must be greater than or equal to zero.';
    }
    if (!productLink.trim()) {
      errors.productLink = 'Product URL is required.';
    } else if (!/^https:\/\/.+/.test(productLink.trim())) {
      errors.productLink = 'Product URL must be a valid HTTPS link.';
    }
    if (isScheduled) {
      if (!scheduledPublishAt) {
        errors.scheduledPublishAt = 'Scheduled date is required.';
      } else if (new Date(scheduledPublishAt) <= new Date()) {
        errors.scheduledPublishAt = 'Scheduled date must be in the future.';
      }
    }
    return errors;
  }
```

Update the `onSubmit` call inside `handleSubmit` — change:

```jsx
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        categoryId: Number(categoryId),
        imageFileName,
        productPrice: Number(productPrice),
        productLink: productLink.trim(),
        trending,
        bestSeller,
        active,
      });
```

to:

```jsx
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        categoryId: Number(categoryId),
        imageFileName,
        productPrice: Number(productPrice),
        productLink: productLink.trim(),
        trending,
        bestSeller,
        active: isScheduled ? false : active,
        brand: brand.trim() || null,
        scheduledPublishAt: isScheduled ? new Date(scheduledPublishAt).toISOString() : null,
      });
```

Add the Brand field between Product Name and Category. Change:

```jsx
        {fieldErrors.name && (
          <p id="name-error" className="mt-1 text-sm text-danger">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="categoryId" className="mb-1 block text-small font-medium text-body">
          Category
        </label>
```

to:

```jsx
        {fieldErrors.name && (
          <p id="name-error" className="mt-1 text-sm text-danger">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="brand" className="mb-1 block text-small font-medium text-body">
          Brand
        </label>
        <input
          id="brand"
          type="text"
          maxLength={200}
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="categoryId" className="mb-1 block text-small font-medium text-body">
          Category
        </label>
```

Replace the checkboxes block and the space after it — change:

```jsx
      <div className="mb-6 flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-small font-medium text-body">
          <input type="checkbox" checked={trending} onChange={(event) => setTrending(event.target.checked)} />
          Trending
        </label>
        <label className="flex items-center gap-2 text-small font-medium text-body">
          <input
            type="checkbox"
            checked={bestSeller}
            onChange={(event) => setBestSeller(event.target.checked)}
          />
          Best Seller
        </label>
        <label className="flex items-center gap-2 text-small font-medium text-body">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Active
        </label>
      </div>

      <div className="flex justify-end gap-3">
```

to:

```jsx
      <div className="mb-6 flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-small font-medium text-body">
          <input type="checkbox" checked={trending} onChange={(event) => setTrending(event.target.checked)} />
          Trending
        </label>
        <label className="flex items-center gap-2 text-small font-medium text-body">
          <input
            type="checkbox"
            checked={bestSeller}
            onChange={(event) => setBestSeller(event.target.checked)}
          />
          Best Seller
        </label>
        {!isScheduled && (
          <label className="flex items-center gap-2 text-small font-medium text-body">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
            Active
          </label>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between rounded-btn border border-border p-4">
          <div>
            <p className="text-small font-medium text-body">Schedule for later</p>
            <p className="text-xs text-muted">Automatically publish this product at a future date and time.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isScheduled}
            aria-label="Schedule for later"
            onClick={() => setIsScheduled((current) => !current)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              isScheduled ? 'bg-primary' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isScheduled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {isScheduled && (
          <div className="mt-4">
            <label htmlFor="scheduledPublishAt" className="mb-1 block text-small font-medium text-body">
              Publish Date &amp; Time
            </label>
            <input
              id="scheduledPublishAt"
              type="datetime-local"
              value={scheduledPublishAt}
              onChange={(event) => setScheduledPublishAt(event.target.value)}
              className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              aria-invalid={Boolean(fieldErrors.scheduledPublishAt)}
              aria-describedby={fieldErrors.scheduledPublishAt ? 'scheduledPublishAt-error' : undefined}
            />
            {fieldErrors.scheduledPublishAt && (
              <p id="scheduledPublishAt-error" className="mt-1 text-sm text-danger">
                {fieldErrors.scheduledPublishAt}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- --run ProductForm` (from `frontend/`)
Expected: PASS, all tests in `ProductForm.test.jsx` including the 6 new/updated ones.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ProductForm.jsx frontend/src/components/ProductForm.test.jsx
git commit -m "feat(product-form): add brand field and schedule-for-later switch"
```

---

### Task 6: Admin product list — Brand column and Scheduled badge

**Files:**
- Modify: `frontend/src/pages/admin/ProductsPage.jsx`
- Modify: `frontend/src/pages/admin/ProductsPage.test.jsx`

**Interfaces:**
- Consumes: `row.brand`, `row.scheduledPublishAt` from the `ProductResponse` shape produced by Task 2/3, as returned by `adminProductService.searchProducts` (unchanged, plain passthrough).

- [ ] **Step 1: Write the failing test**

Add to `frontend/src/pages/admin/ProductsPage.test.jsx`, inside the `describe('ProductsPage', ...)` block:

```jsx
  it('renders brand and a scheduled badge when applicable', async () => {
    adminProductService.searchProducts.mockResolvedValue({
      content: [
        {
          id: 3,
          name: 'Standing Desk',
          categoryName: 'Home Office',
          brand: 'ErgoPro',
          imageFileName: null,
          productPrice: 199.99,
          trending: false,
          bestSeller: false,
          active: false,
          scheduledPublishAt: '2026-09-01T09:00:00',
          createdAt: '2026-03-01T10:00:00',
        },
      ],
      totalPages: 1,
      totalElements: 1,
    });
    renderPage();

    expect(await screen.findByText('ErgoPro')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run ProductsPage` (from `frontend/`)
Expected: FAIL — no "ErgoPro" or "Scheduled" text rendered yet.

- [ ] **Step 3: Add the Brand column**

In `frontend/src/pages/admin/ProductsPage.jsx`, change:

```jsx
    { key: 'name', label: 'Name', sortable: true },
    { key: 'categoryName', label: 'Category' },
    {
      key: 'productPrice',
```

to:

```jsx
    { key: 'name', label: 'Name', sortable: true },
    { key: 'categoryName', label: 'Category' },
    { key: 'brand', label: 'Brand', render: (row) => row.brand || '—' },
    {
      key: 'productPrice',
```

- [ ] **Step 4: Add the Scheduled badge**

Change:

```jsx
          {row.bestSeller && (
            <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
              Best Seller
            </span>
          )}
          {!row.active && (
```

to:

```jsx
          {row.bestSeller && (
            <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
              Best Seller
            </span>
          )}
          {row.scheduledPublishAt && (
            <span className="rounded-full bg-info/10 px-2.5 py-0.5 text-xs font-medium text-info">
              Scheduled
            </span>
          )}
          {!row.active && (
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- --run ProductsPage` (from `frontend/`)
Expected: PASS, all tests in `ProductsPage.test.jsx` including the new one.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/admin/ProductsPage.jsx frontend/src/pages/admin/ProductsPage.test.jsx
git commit -m "feat(admin): show product brand and scheduled status on the products list"
```

---

### Task 7: Full-stack verification and visual check

**Files:** none (verification only)

**Interfaces:** none — this task consumes the finished output of Tasks 1–6.

- [ ] **Step 1: Run the full backend test suite**

Run: `mvn -q test` (from `backend/`)
Expected: BUILD SUCCESS, every test passes.

- [ ] **Step 2: Run the full frontend test suite**

Run: `npm test -- --run` (from `frontend/`)
Expected: PASS, all tests including the new/updated `ProductForm.test.jsx` and `ProductsPage.test.jsx` cases. If a single unrelated failure appears in the ComparisonDetailPage/CompareBar area, this is a known test-order-dependent flake seen throughout this project's history (not caused by this feature) — re-run once and confirm it passes clean.

- [ ] **Step 3: Visual check with chrome-devtools MCP**

With both the backend (`mvn spring-boot:run` from `backend/`) and frontend (`npm run dev` from `frontend/`) running, use the chrome-devtools MCP tools to:
- Navigate to `/admin/products/new`, confirm the Brand field renders under Product Name, and the "Schedule for later" switch row renders below the checkboxes.
- Click the switch — confirm the Active checkbox disappears and a "Publish Date & Time" field appears.
- Fill out the form with a brand and a future scheduled date/time, submit, and confirm the new product appears on `/admin/products` with its Brand value in the new column and a "Scheduled" badge in the Status column.
- Edit that same product — confirm the switch is pre-checked and the date/time field is pre-filled with the value that was saved.

If anything looks visually wrong, fix it before finishing — this is the final check before the feature is considered done.

- [ ] **Step 4: No commit needed**

This task is verification-only; nothing to commit unless Step 3 uncovers a fix, in which case commit that fix with an appropriate message before finishing.
