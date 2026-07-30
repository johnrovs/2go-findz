# Buying Guides Upgrade — Stage 1 Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize the `BuyingGuide` backend (currently a single `content` blob + plain product list) into the richer structure — Quick Recommendations, a live-priced comparison table, Top Pick/Runner-Up sections with pros/cons/best-for, ordered Buying Advice sections, FAQs, and a section-visibility TOC — matching and reusing the `Comparison` feature's entity/DTO/validation conventions.

**Architecture:** MySQL schema via Flyway migrations (`backend/src/main/resources/db/migration/`), JPA entities with owned `@OneToMany(cascade=ALL, orphanRemoval=true) @OrderColumn` child collections (mirroring `Comparison`/`ComparisonProduct` etc.), one nested `BuyingGuideRequest`/`BuyingGuideResponse` pair covering the whole guide, transactional whole-guide replace-on-save service logic, `ApiResponse<T>` envelope throughout, MockMvc integration tests via the existing `AbstractIntegrationTest` (Testcontainers MySQL).

**Tech Stack:** Spring Boot 3.2.5, Java 21, Spring Data JPA/Hibernate 6, MySQL 8, Flyway, Lombok, JUnit 5 + MockMvc + Testcontainers. New dependency: `jsoup` (HTML sanitization — no sanitizer exists in this codebase today).

Reference: `docs/superpowers/specs/2026-07-29-buying-guides-upgrade-backend-design.md` (approved design). Deviation from that spec noted inline in Task 2 and Task 4: the design's single "V14" migration is split into two migrations (V14 root-table alter, V15 child tables) so each ships as an independently testable increment — the resulting schema is identical either way.

## Global Constraints

- Java 21 / Spring Boot 3.2.5 / MySQL 8 — no other stack changes.
- Flyway migration files live in `backend/src/main/resources/db/migration/`, named `V<n>__description.sql`; next available version is `V13`.
- Every controller response is wrapped in `ApiResponse<T>` (`com.twogofindz.backend.dto.response.ApiResponse`) — never return a raw entity or raw DTO.
- Never expose JPA entities directly through controllers or response DTOs.
- `/api/admin/**` requires `ROLE_ADMIN` (already enforced by existing `SecurityConfig` — no security config changes needed in this plan).
- Entities: Lombok `@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder`, `@GeneratedValue(strategy = GenerationType.IDENTITY)` on `id`, `createdAt`/`updatedAt` via `@Generated(event = {EventType.INSERT, EventType.UPDATE})` with `insertable = false, updatable = false`.
- Services/mappers use constructor injection (no field injection, no Lombok `@RequiredArgsConstructor` — match existing explicit-constructor style).
- Bean Validation messages follow the existing style exactly: `"X is required."`, `"X must be at most N characters."`, `"X must be between A and B."`.
- New business-rule (cross-entity) validation exceptions extend `RuntimeException` in `com.twogofindz.backend.exception` and get one `@ExceptionHandler` added to `GlobalExceptionHandler` returning `400 Bad Request` — mirrors `InvalidComparisonException`.
- Tests: JUnit 5, extend `AbstractIntegrationTest` for anything hitting the database/HTTP layer; plain JUnit (no Spring context) for pure unit tests (sanitizer, Bean Validation annotation checks).
- No new runtime dependency besides `jsoup` (approved for HTML sanitization in the design doc).
- Deployment: all of Stage 1/2/3 are implemented and merged before anything is deployed to Render/Netlify (confirmed with the user) — no need for backward-compatible dual endpoints or feature flags anywhere in this plan.

---

### Task 1: Add `rating` and `reviewCount` to `Product`

Needed because the Buying Guide comparison table's "reviews" column and the Quick Recommendation/product-picker cards (Stage 2/3) have no data source today — `Product` has no rating or review-count field anywhere in the schema.

**Files:**
- Create: `backend/src/main/resources/db/migration/V13__add_product_rating_and_review_count.sql`
- Modify: `backend/src/main/java/com/twogofindz/backend/entity/Product.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/request/ProductRequest.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/response/ProductResponse.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/mapper/ProductMapper.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/ProductServiceImpl.java`
- Modify (mechanical arity fix — append 2 trailing constructor args to every `new ProductRequest(...)` call site, 24 total across 11 files):
  - `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java` (1 site)
  - `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminProductControllerTest.java` (9 sites)
  - `backend/src/test/java/com/twogofindz/backend/controller/admin/ProductPlaceholderImageTest.java` (1 site)
  - `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminDashboardControllerTest.java` (2 sites)
  - `backend/src/test/java/com/twogofindz/backend/controller/admin/CategoryDeleteTest.java` (1 site)
  - `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicProductControllerTest.java` (5 sites)
  - `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminComparisonControllerTest.java` (1 site)
  - `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java` (1 site)
  - `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicComparisonControllerTest.java` (1 site)
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminProductControllerTest.java` (new test method, added in this task)

**Interfaces:**
- Produces: `Product.getRating(): BigDecimal` (nullable), `Product.getReviewCount(): int`; `ProductRequest.rating(): BigDecimal` (nullable), `ProductRequest.reviewCount(): Integer` (nullable, defaults to `0` server-side); `ProductResponse.rating(): BigDecimal`, `ProductResponse.reviewCount(): int`. Every later task that resolves a product for display (Task 6's mapper) reads these two accessors directly off `ProductResponse`.

- [ ] **Step 1: Write the failing test**

Add to `AdminProductControllerTest.java` (new imports `assertEquals` not needed — using `jsonPath`):

```java
    @Test
    void create_withRatingAndReviewCount_returnsThemInResponse() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Rated Product Category");
        ProductRequest request = new ProductRequest(
                "Rated Product", "Has rating and reviews.", categoryId, null,
                new BigDecimal("15.00"), "https://amazon.com/dp/rated", false, false, true,
                null, null, new BigDecimal("4.5"), 1200);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rating").value(4.5))
                .andExpect(jsonPath("$.data.reviewCount").value(1200));
    }

    @Test
    void create_withoutReviewCount_defaultsToZero() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Unrated Product Category");
        ProductRequest request = new ProductRequest(
                "Unrated Product", "No rating yet.", categoryId, null,
                new BigDecimal("15.00"), "https://amazon.com/dp/unrated", false, false, true,
                null, null, null, null);

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rating").doesNotExist())
                .andExpect(jsonPath("$.data.reviewCount").value(0));
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./mvnw test -Dtest=AdminProductControllerTest -q`
Expected: FAIL — compile error, `ProductRequest` has no 13-arg constructor yet.

- [ ] **Step 3: Add the migration**

`backend/src/main/resources/db/migration/V13__add_product_rating_and_review_count.sql`:

```sql
ALTER TABLE products
    ADD COLUMN rating DECIMAL(2,1) NULL,
    ADD COLUMN review_count INT NOT NULL DEFAULT 0;
```

- [ ] **Step 4: Update the entity**

In `Product.java`, add after the `scheduledPublishAt` field:

```java
    @Column(precision = 2, scale = 1)
    private BigDecimal rating;

    @Column(name = "review_count", nullable = false)
    private int reviewCount;
```

- [ ] **Step 5: Update `ProductRequest`**

Append two parameters to the record (after `scheduledPublishAt`):

```java
        @Future(message = "Scheduled publish date must be in the future.")
        LocalDateTime scheduledPublishAt,

        @DecimalMin(value = "0.0", message = "Rating must be between 0.0 and 5.0.")
        @DecimalMax(value = "5.0", message = "Rating must be between 0.0 and 5.0.")
        BigDecimal rating,

        @Min(value = 0, message = "Review count cannot be negative.")
        Integer reviewCount
) {
}
```

Add imports `jakarta.validation.constraints.DecimalMax` and `jakarta.validation.constraints.Min`.

- [ ] **Step 6: Update `ProductResponse`**

Append after `scheduledPublishAt`:

```java
        LocalDateTime scheduledPublishAt,
        BigDecimal rating,
        int reviewCount
) {
}
```

- [ ] **Step 7: Update `ProductMapper.toResponse`**

Append two arguments to the `new ProductResponse(...)` call, after `product.getScheduledPublishAt()`:

```java
                product.getScheduledPublishAt(),
                product.getRating(),
                product.getReviewCount()
        );
```

- [ ] **Step 8: Update `ProductServiceImpl`**

In both `create` and `update`, after `.scheduledPublishAt(request.scheduledPublishAt())`, add:

```java
                .rating(request.rating())
                .reviewCount(request.reviewCount() != null ? request.reviewCount() : 0)
```

(In `update`, use the setter form: `product.setRating(request.rating());` and `product.setReviewCount(request.reviewCount() != null ? request.reviewCount() : 0);`.)

- [ ] **Step 9: Fix the 24 existing `new ProductRequest(...)` call sites**

Every existing call currently ends its argument list with one of these trailing patterns (11 args total today): `..., null, null)`, `..., "Nike", null)`, `..., null, LocalDateTime.now()...)`. Add exactly two more trailing arguments — `null, null` — immediately before the final closing parenthesis of the constructor call, in every one of the following locations. Two worked examples:

Before (from `AdminProductControllerTest.java`):
```java
        ProductRequest request = new ProductRequest(
                "Air Fryer", "A compact 4-quart air fryer.", categoryId, null,
                new BigDecimal("79.99"), "https://amazon.com/dp/example", true, false, true, null, null);
```
After:
```java
        ProductRequest request = new ProductRequest(
                "Air Fryer", "A compact 4-quart air fryer.", categoryId, null,
                new BigDecimal("79.99"), "https://amazon.com/dp/example", true, false, true, null, null,
                null, null);
```

Before (scheduled/brand variants, from `AdminProductControllerTest.java`):
```java
        ProductRequest request = new ProductRequest(
                "Scheduled Product", "Will publish later.", categoryId, null,
                new BigDecimal("15.00"), "https://amazon.com/dp/scheduled", false, false, true,
                null, LocalDateTime.now().plusDays(2));
```
After:
```java
        ProductRequest request = new ProductRequest(
                "Scheduled Product", "Will publish later.", categoryId, null,
                new BigDecimal("15.00"), "https://amazon.com/dp/scheduled", false, false, true,
                null, LocalDateTime.now().plusDays(2), null, null);
```

Apply the same `, null, null` trailing addition at every one of these locations (file — count of `new ProductRequest(` occurrences):
1. `AdminBuyingGuideControllerTest.java` — 1
2. `AdminProductControllerTest.java` — 9 (all call sites in that file; the two you just added in Step 1 already include the new args and don't need fixing)
3. `ProductPlaceholderImageTest.java` — 1
4. `AdminDashboardControllerTest.java` — 2
5. `CategoryDeleteTest.java` — 1
6. `PublicProductControllerTest.java` — 5
7. `AdminComparisonControllerTest.java` — 1
8. `PublicBuyingGuideControllerTest.java` — 1
9. `PublicComparisonControllerTest.java` — 1

- [ ] **Step 10: Run the test to verify it passes**

Run: `cd backend && ./mvnw test -Dtest=AdminProductControllerTest -q`
Expected: PASS (all methods in the file, including the two new ones)

- [ ] **Step 11: Run the full test suite to confirm no other ripple was missed**

Run: `cd backend && ./mvnw test -q`
Expected: PASS. Any remaining compile error means a `new ProductRequest(` call site was missed — search again with `grep -rn "new ProductRequest(" backend/src` and fix it.

- [ ] **Step 12: Commit**

```bash
git add backend/src/main/resources/db/migration/V13__add_product_rating_and_review_count.sql \
        backend/src/main/java/com/twogofindz/backend/entity/Product.java \
        backend/src/main/java/com/twogofindz/backend/dto/request/ProductRequest.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/ProductResponse.java \
        backend/src/main/java/com/twogofindz/backend/mapper/ProductMapper.java \
        backend/src/main/java/com/twogofindz/backend/service/impl/ProductServiceImpl.java \
        backend/src/test
git commit -m "feat(products): add rating and review count fields"
```

---

### Task 2: Restructure `BuyingGuide` root fields — slug, category, SEO, introduction, scheduling

Renames `content` → `introduction`, adds `slug`/`categoryId`/`seoTitle`/`seoDescription`/`scheduledPublishAt` to the guide root, switches the public detail endpoint from numeric `id` to `slug`, and adds a publish scheduler mirroring `ProductPublishScheduler`. Child sections (Quick Recs, Comparison, Top Pick/Runner-Up, Advice, FAQ, TOC) are deliberately **not** touched yet — they land in Tasks 4–6. `recommendedProducts` (the existing `@ManyToMany` product list) is unchanged.

**Files:**
- Create: `backend/src/main/resources/db/migration/V14__restructure_buying_guide_root_fields.sql`
- Modify: `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuide.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/repository/BuyingGuideRepository.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideRequest.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideResponse.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideSummaryResponse.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideDetailResponse.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/mapper/BuyingGuideMapper.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/BuyingGuideService.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/BuyingGuideServiceImpl.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideController.java`
- Create: `backend/src/main/java/com/twogofindz/backend/scheduler/BuyingGuidePublishScheduler.java`
- Rewrite: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java`
- Rewrite: `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java`
- Test: `backend/src/test/java/com/twogofindz/backend/scheduler/BuyingGuidePublishSchedulerTest.java` (new)

**Interfaces:**
- Consumes: `ComparisonServiceImpl.resolveSlug`/`slugify` pattern (read-only reference, not called directly — reimplemented on `BuyingGuideServiceImpl` since it's a different repository).
- Produces: `BuyingGuideService.getBySlugForPublic(String slug): PublicBuyingGuideDetailResponse` (replaces `getByIdForPublic(Long id)`); `BuyingGuideRepository.findBySlug/existsBySlug/existsBySlugAndIdNot/findByActiveFalseAndScheduledPublishAtLessThanEqual`. Task 6 extends `BuyingGuideRequest`/`BuyingGuideResponse` further (appending 6 nested list fields) — every test call site touched in this task will be touched again in Task 6.

- [ ] **Step 1: Write the failing tests (full rewrite of both existing test files)**

Replace `AdminBuyingGuideControllerTest.java` entirely:

```java
package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.BuyingGuideRequest;
import com.twogofindz.backend.dto.request.ProductRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminBuyingGuideControllerTest extends AbstractIntegrationTest {

    @Test
    void create_succeeds_withRecommendedProductsInOrder() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Guide Order Guide Category");
        Long productCategoryId = createCategoryId(token, "Guide Order Product Category");
        Long firstProductId = createProductId(token, productCategoryId, "Guide Product A");
        Long secondProductId = createProductId(token, productCategoryId, "Guide Product B");

        BuyingGuideRequest request = new BuyingGuideRequest(
                "Best Kitchen Gadgets 2026", "best-kitchen-gadgets-2026",
                "A quick roundup of our favorite kitchen gadgets.",
                "Full introduction here.", null, guideCategoryId, null, null,
                true, null, List.of(secondProductId, firstProductId));

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Best Kitchen Gadgets 2026"))
                .andExpect(jsonPath("$.data.slug").value("best-kitchen-gadgets-2026"))
                .andExpect(jsonPath("$.data.categoryName").value("Guide Order Guide Category"))
                .andExpect(jsonPath("$.data.active").value(true))
                .andExpect(jsonPath("$.data.recommendedProducts[0].id").value(secondProductId))
                .andExpect(jsonPath("$.data.recommendedProducts[1].id").value(firstProductId));
    }

    @Test
    void create_autoGeneratesSlug_whenSlugBlank() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Auto Slug Guide Category");

        BuyingGuideRequest request = new BuyingGuideRequest(
                "Best Air Fryers Under $100", "", "Excerpt", "Introduction", null,
                guideCategoryId, null, null, true, null, List.of());

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.slug").value("best-air-fryers-under-100"));
    }

    @Test
    void create_returns409_whenSlugAlreadyTaken() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Duplicate Slug Guide Category");

        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "First Guide", "shared-slug", "Excerpt", "Introduction", null,
                        guideCategoryId, null, null, true, null, List.of()))));

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                                "Second Guide", "shared-slug", "Excerpt", "Introduction", null,
                                guideCategoryId, null, null, true, null, List.of()))))
                .andExpect(status().isConflict());
    }

    @Test
    void create_returns404_whenCategoryDoesNotExist() throws Exception {
        String token = adminToken();
        BuyingGuideRequest request = new BuyingGuideRequest(
                "Orphan Guide", "orphan-guide", "Excerpt", "Introduction", null,
                999999L, null, null, true, null, List.of());

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    void create_returns400_whenTitleBlank() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Blank Title Guide Category");
        BuyingGuideRequest request = new BuyingGuideRequest(
                "", "blank-title", "Excerpt", "Introduction", null,
                guideCategoryId, null, null, true, null, List.of());

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns401_withoutToken() throws Exception {
        BuyingGuideRequest request = new BuyingGuideRequest(
                "Title", "title", "Excerpt", "Introduction", null, 1L, null, null, true, null, List.of());

        mockMvc.perform(post("/api/admin/buying-guides")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void create_withScheduledPublishAt_returnsInactiveWithScheduleSet() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Scheduled Guide Category");
        LocalDateTime scheduledAt = LocalDateTime.now().plusDays(2);
        BuyingGuideRequest request = new BuyingGuideRequest(
                "Scheduled Guide", "scheduled-guide", "Excerpt", "Introduction", null,
                guideCategoryId, null, null, true, scheduledAt, List.of());

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scheduledPublishAt").isNotEmpty());
    }

    @Test
    void update_succeeds_andReordersRecommendedProducts() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Guide Update Guide Category");
        Long productCategoryId = createCategoryId(token, "Guide Update Product Category");
        Long firstProductId = createProductId(token, productCategoryId, "Guide Update Product A");
        Long secondProductId = createProductId(token, productCategoryId, "Guide Update Product B");

        var createResult = mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                                "Original Title", "original-title", "Original excerpt", "Original introduction",
                                null, guideCategoryId, null, null, true, null,
                                List.of(firstProductId, secondProductId)))))
                .andReturn();
        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        BuyingGuideRequest updateRequest = new BuyingGuideRequest(
                "Updated Title", "updated-title", "Updated excerpt", "Updated introduction", null,
                guideCategoryId, null, null, false, null, List.of(secondProductId, firstProductId));

        mockMvc.perform(put("/api/admin/buying-guides/{id}", id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Updated Title"))
                .andExpect(jsonPath("$.data.slug").value("updated-title"))
                .andExpect(jsonPath("$.data.active").value(false))
                .andExpect(jsonPath("$.data.recommendedProducts[0].id").value(secondProductId))
                .andExpect(jsonPath("$.data.recommendedProducts[1].id").value(firstProductId));

        mockMvc.perform(get("/api/admin/buying-guides/{id}", id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Updated Title"));
    }

    @Test
    void getById_returns404_forUnknownGuide() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/admin/buying-guides/{id}", 999999L)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void delete_succeeds_andRemovesFromGetAll() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Deletable Guide Category");

        var createResult = mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                                "Deletable Guide", "deletable-guide", "Excerpt", "Introduction", null,
                                guideCategoryId, null, null, true, null, List.of()))))
                .andReturn();
        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(delete("/api/admin/buying-guides/{id}", id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        var getAllResult = mockMvc.perform(get("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        var dataArray = objectMapper.readTree(getAllResult.getResponse().getContentAsString()).path("data");
        boolean stillPresent = false;
        for (var node : dataArray) {
            if (node.path("id").asLong() == id) {
                stillPresent = true;
                break;
            }
        }
        assertFalse(stillPresent, "Deleted buying guide must not appear in the admin list");
    }

    private Long createProductId(String token, Long categoryId, String name) throws Exception {
        var result = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ProductRequest(
                                name, "Test product for buying guide.", categoryId, null,
                                new BigDecimal("25.00"), "https://amazon.com/dp/" + name.replace(" ", "-"),
                                false, false, true, null, null, null, null))))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();
    }
}
```

Replace `PublicBuyingGuideControllerTest.java` entirely:

```java
package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.BuyingGuideRequest;
import com.twogofindz.backend.dto.request.ProductRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PublicBuyingGuideControllerTest extends AbstractIntegrationTest {

    @Test
    void getAll_returnsOnlyActiveGuides() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Public List Guide Category");

        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Public Active Guide", "public-active-guide", "Excerpt", "Introduction", null,
                        categoryId, null, null, true, null, List.of()))));

        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Public Draft Guide", "public-draft-guide", "Excerpt", "Introduction", null,
                        categoryId, null, null, false, null, List.of()))));

        mockMvc.perform(get("/api/public/buying-guides"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.title == 'Public Draft Guide')]").isEmpty())
                .andExpect(jsonPath("$.data[?(@.title == 'Public Active Guide')]").exists());
    }

    @Test
    void getBySlug_returns404_forInactiveGuide() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Public Inactive Guide Category");

        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Inactive Detail Guide", "inactive-detail-guide", "Excerpt", "Introduction", null,
                        categoryId, null, null, false, null, List.of()))));

        mockMvc.perform(get("/api/public/buying-guides/{slug}", "inactive-detail-guide"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getBySlug_returns404_forUnknownSlug() throws Exception {
        mockMvc.perform(get("/api/public/buying-guides/{slug}", "no-such-guide"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getBySlug_returnsActiveGuide_withRecommendedProductsInOrder() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Public Detail Guide Category");
        Long productCategoryId = createCategoryId(token, "Public Guide Product Category");
        Long firstProductId = createProductId(token, productCategoryId, "Public Guide Product A");
        Long secondProductId = createProductId(token, productCategoryId, "Public Guide Product B");

        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Public Detail Guide", "public-detail-guide", "Excerpt", "Full introduction body.",
                        null, guideCategoryId, null, null, true, null,
                        List.of(secondProductId, firstProductId)))));

        mockMvc.perform(get("/api/public/buying-guides/{slug}", "public-detail-guide"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Public Detail Guide"))
                .andExpect(jsonPath("$.data.introduction").value("Full introduction body."))
                .andExpect(jsonPath("$.data.recommendedProducts[0].id").value(secondProductId))
                .andExpect(jsonPath("$.data.recommendedProducts[1].id").value(firstProductId));
    }

    private Long createProductId(String token, Long categoryId, String name) throws Exception {
        var result = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ProductRequest(
                                name, "Test product for public buying guide.", categoryId, null,
                                new BigDecimal("25.00"), "https://amazon.com/dp/" + name.replace(" ", "-"),
                                false, false, true, null, null, null, null))))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && ./mvnw test -Dtest=AdminBuyingGuideControllerTest,PublicBuyingGuideControllerTest -q`
Expected: FAIL — compile errors (`BuyingGuideRequest` doesn't have this shape yet, `/api/public/buying-guides/{slug}` doesn't exist yet).

- [ ] **Step 3: Add the migration**

`backend/src/main/resources/db/migration/V14__restructure_buying_guide_root_fields.sql`:

```sql
ALTER TABLE buying_guides
    CHANGE COLUMN content introduction TEXT NOT NULL,
    ADD COLUMN slug VARCHAR(220) NULL AFTER title,
    ADD COLUMN category_id BIGINT NULL,
    ADD COLUMN seo_title VARCHAR(70) NULL,
    ADD COLUMN seo_description VARCHAR(200) NULL,
    ADD COLUMN scheduled_publish_at TIMESTAMP NULL;

-- Backfill slugs for any existing rows before enforcing NOT NULL + UNIQUE.
UPDATE buying_guides
SET slug = TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE(title, '[^a-zA-Z0-9]+', '-')))
WHERE slug IS NULL;

-- Resolve any collisions the backfill above could have produced by appending the row's id.
UPDATE buying_guides bg
JOIN (
    SELECT slug FROM buying_guides GROUP BY slug HAVING COUNT(*) > 1
) dup ON bg.slug = dup.slug
SET bg.slug = CONCAT(bg.slug, '-', bg.id);

ALTER TABLE buying_guides
    MODIFY COLUMN slug VARCHAR(220) NOT NULL,
    ADD CONSTRAINT uq_buying_guides_slug UNIQUE (slug),
    ADD CONSTRAINT fk_buying_guides_category FOREIGN KEY (category_id) REFERENCES product_categories (id);
```

- [ ] **Step 4: Update the `BuyingGuide` entity**

Replace the `content` field and add the new scalar fields in `BuyingGuide.java`:

```java
    @Column(nullable = false, length = 220, unique = true)
    private String slug;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String introduction;

    @ManyToOne(optional = true)
    @JoinColumn(name = "category_id")
    private ProductCategory category;

    @Column(name = "seo_title", length = 70)
    private String seoTitle;

    @Column(name = "seo_description", length = 200)
    private String seoDescription;

    @Column(name = "scheduled_publish_at")
    private LocalDateTime scheduledPublishAt;
```

Place `slug` right after `title`, `introduction` where `content` was, and the rest after `active`. Add imports `jakarta.persistence.ManyToOne` and `jakarta.persistence.JoinColumn`.

- [ ] **Step 5: Update `BuyingGuideRepository`**

```java
package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.BuyingGuide;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BuyingGuideRepository extends JpaRepository<BuyingGuide, Long> {
    List<BuyingGuide> findAllByOrderByCreatedAtDesc();
    List<BuyingGuide> findByActiveTrueOrderByCreatedAtDesc();
    Optional<BuyingGuide> findBySlug(String slug);
    boolean existsBySlug(String slug);
    boolean existsBySlugAndIdNot(String slug, Long id);
    List<BuyingGuide> findByActiveFalseAndScheduledPublishAtLessThanEqual(LocalDateTime now);
}
```

- [ ] **Step 6: Update `BuyingGuideRequest`**

```java
package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

public record BuyingGuideRequest(
        @NotBlank(message = "Title is required.")
        @Size(max = 200, message = "Title must be at most 200 characters.")
        String title,

        @Pattern(regexp = "^$|^[a-z0-9]+(-[a-z0-9]+)*$", message = "Slug must be lowercase letters, numbers, and hyphens only.")
        @Size(max = 220, message = "Slug must be at most 220 characters.")
        String slug,

        @NotBlank(message = "Excerpt is required.")
        @Size(max = 500, message = "Excerpt must be at most 500 characters.")
        String excerpt,

        @NotBlank(message = "Introduction is required.")
        String introduction,

        @Size(max = 255, message = "Cover image filename must be at most 255 characters.")
        String coverImageFilename,

        @NotNull(message = "Category is required.")
        Long categoryId,

        @Size(max = 70, message = "SEO title must be at most 70 characters.")
        String seoTitle,

        @Size(max = 200, message = "SEO description must be at most 200 characters.")
        String seoDescription,

        @NotNull(message = "Active flag is required.")
        Boolean active,

        LocalDateTime scheduledPublishAt,

        @NotNull(message = "Recommended products list is required.")
        List<Long> recommendedProductIds
) {
}
```

- [ ] **Step 7: Update `BuyingGuideResponse`, `PublicBuyingGuideSummaryResponse`, `PublicBuyingGuideDetailResponse`**

`BuyingGuideResponse.java`:
```java
package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record BuyingGuideResponse(
        Long id,
        String title,
        String slug,
        String excerpt,
        String introduction,
        String coverImageFilename,
        Long categoryId,
        String categoryName,
        String seoTitle,
        String seoDescription,
        Boolean active,
        LocalDateTime scheduledPublishAt,
        List<ProductResponse> recommendedProducts,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
```

`PublicBuyingGuideSummaryResponse.java`:
```java
package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;

public record PublicBuyingGuideSummaryResponse(
        Long id,
        String title,
        String slug,
        String excerpt,
        String coverImageFilename,
        LocalDateTime createdAt
) {
}
```

`PublicBuyingGuideDetailResponse.java` (intermediate shape — Task 6 appends the 6 nested section lists):
```java
package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record PublicBuyingGuideDetailResponse(
        Long id,
        String title,
        String slug,
        String excerpt,
        String introduction,
        String coverImageFilename,
        String categoryName,
        String seoTitle,
        String seoDescription,
        LocalDateTime createdAt,
        List<ProductResponse> recommendedProducts
) {
}
```

- [ ] **Step 8: Update `BuyingGuideMapper`**

```java
package com.twogofindz.backend.mapper;

import com.twogofindz.backend.dto.response.BuyingGuideResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideDetailResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideSummaryResponse;
import com.twogofindz.backend.entity.BuyingGuide;
import org.springframework.stereotype.Component;

@Component
public class BuyingGuideMapper {

    private final ProductMapper productMapper;

    public BuyingGuideMapper(ProductMapper productMapper) {
        this.productMapper = productMapper;
    }

    public BuyingGuideResponse toResponse(BuyingGuide guide) {
        return new BuyingGuideResponse(
                guide.getId(),
                guide.getTitle(),
                guide.getSlug(),
                guide.getExcerpt(),
                guide.getIntroduction(),
                guide.getCoverImageFilename(),
                guide.getCategory() != null ? guide.getCategory().getId() : null,
                guide.getCategory() != null ? guide.getCategory().getProductCategoryName() : null,
                guide.getSeoTitle(),
                guide.getSeoDescription(),
                guide.getActive(),
                guide.getScheduledPublishAt(),
                guide.getRecommendedProducts().stream().map(productMapper::toResponse).toList(),
                guide.getCreatedAt(),
                guide.getUpdatedAt()
        );
    }

    public PublicBuyingGuideSummaryResponse toPublicSummary(BuyingGuide guide) {
        return new PublicBuyingGuideSummaryResponse(
                guide.getId(),
                guide.getTitle(),
                guide.getSlug(),
                guide.getExcerpt(),
                guide.getCoverImageFilename(),
                guide.getCreatedAt()
        );
    }

    public PublicBuyingGuideDetailResponse toPublicDetail(BuyingGuide guide) {
        return new PublicBuyingGuideDetailResponse(
                guide.getId(),
                guide.getTitle(),
                guide.getSlug(),
                guide.getExcerpt(),
                guide.getIntroduction(),
                guide.getCoverImageFilename(),
                guide.getCategory() != null ? guide.getCategory().getProductCategoryName() : null,
                guide.getSeoTitle(),
                guide.getSeoDescription(),
                guide.getCreatedAt(),
                guide.getRecommendedProducts().stream().map(productMapper::toResponse).toList()
        );
    }
}
```

- [ ] **Step 9: Update `BuyingGuideService` interface**

Replace `PublicBuyingGuideDetailResponse getByIdForPublic(Long id);` with:
```java
    PublicBuyingGuideDetailResponse getBySlugForPublic(String slug);
```

- [ ] **Step 10: Update `BuyingGuideServiceImpl`**

```java
package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.BuyingGuideRequest;
import com.twogofindz.backend.dto.response.BuyingGuideResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideDetailResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideSummaryResponse;
import com.twogofindz.backend.entity.BuyingGuide;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.entity.ProductCategory;
import com.twogofindz.backend.exception.DuplicateResourceException;
import com.twogofindz.backend.exception.ResourceNotFoundException;
import com.twogofindz.backend.mapper.BuyingGuideMapper;
import com.twogofindz.backend.repository.BuyingGuideRepository;
import com.twogofindz.backend.repository.ProductCategoryRepository;
import com.twogofindz.backend.repository.ProductRepository;
import com.twogofindz.backend.service.BuyingGuideService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class BuyingGuideServiceImpl implements BuyingGuideService {

    private final BuyingGuideRepository buyingGuideRepository;
    private final ProductRepository productRepository;
    private final ProductCategoryRepository productCategoryRepository;
    private final BuyingGuideMapper buyingGuideMapper;

    public BuyingGuideServiceImpl(BuyingGuideRepository buyingGuideRepository,
                                   ProductRepository productRepository,
                                   ProductCategoryRepository productCategoryRepository,
                                   BuyingGuideMapper buyingGuideMapper) {
        this.buyingGuideRepository = buyingGuideRepository;
        this.productRepository = productRepository;
        this.productCategoryRepository = productCategoryRepository;
        this.buyingGuideMapper = buyingGuideMapper;
    }

    @Override
    @Transactional
    public BuyingGuideResponse create(BuyingGuideRequest request) {
        ProductCategory category = findCategory(request.categoryId());
        String slug = resolveSlug(request.slug(), request.title(), null);

        BuyingGuide guide = BuyingGuide.builder()
                .title(request.title())
                .slug(slug)
                .excerpt(request.excerpt())
                .introduction(request.introduction())
                .coverImageFilename(request.coverImageFilename())
                .category(category)
                .seoTitle(request.seoTitle())
                .seoDescription(request.seoDescription())
                .active(request.active())
                .scheduledPublishAt(request.scheduledPublishAt())
                .recommendedProducts(resolveProducts(request.recommendedProductIds()))
                .build();
        return buyingGuideMapper.toResponse(buyingGuideRepository.save(guide));
    }

    @Override
    @Transactional
    public BuyingGuideResponse update(Long id, BuyingGuideRequest request) {
        BuyingGuide guide = findEntityById(id);
        ProductCategory category = findCategory(request.categoryId());
        String slug = resolveSlug(request.slug(), request.title(), id);

        guide.setTitle(request.title());
        guide.setSlug(slug);
        guide.setExcerpt(request.excerpt());
        guide.setIntroduction(request.introduction());
        guide.setCoverImageFilename(request.coverImageFilename());
        guide.setCategory(category);
        guide.setSeoTitle(request.seoTitle());
        guide.setSeoDescription(request.seoDescription());
        guide.setActive(request.active());
        guide.setScheduledPublishAt(request.scheduledPublishAt());
        guide.setRecommendedProducts(resolveProducts(request.recommendedProductIds()));
        return buyingGuideMapper.toResponse(buyingGuideRepository.save(guide));
    }

    @Override
    @Transactional(readOnly = true)
    public BuyingGuideResponse getByIdForAdmin(Long id) {
        return buyingGuideMapper.toResponse(findEntityById(id));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        buyingGuideRepository.delete(findEntityById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<BuyingGuideResponse> getAllForAdmin() {
        return buyingGuideRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(buyingGuideMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PublicBuyingGuideSummaryResponse> getAllForPublic() {
        return buyingGuideRepository.findByActiveTrueOrderByCreatedAtDesc().stream()
                .map(buyingGuideMapper::toPublicSummary)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PublicBuyingGuideDetailResponse getBySlugForPublic(String slug) {
        BuyingGuide guide = buyingGuideRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Buying guide not found with slug: " + slug));
        // Deliberately identical to the "not found" outcome above: a draft guide must not
        // be distinguishable from a nonexistent one via the public API (no information leak).
        if (!guide.getActive()) {
            throw new ResourceNotFoundException("Buying guide not found with slug: " + slug);
        }
        return buyingGuideMapper.toPublicDetail(guide);
    }

    private String resolveSlug(String requestedSlug, String title, Long excludeId) {
        String slug = (requestedSlug == null || requestedSlug.isBlank()) ? slugify(title) : requestedSlug;
        boolean taken = excludeId == null
                ? buyingGuideRepository.existsBySlug(slug)
                : buyingGuideRepository.existsBySlugAndIdNot(slug, excludeId);
        if (taken) {
            throw new DuplicateResourceException("A buying guide with slug \"" + slug + "\" already exists.");
        }
        return slug;
    }

    private String slugify(String title) {
        String base = title.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return base.isBlank() ? "buying-guide" : base;
    }

    private ProductCategory findCategory(Long categoryId) {
        return productCategoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + categoryId));
    }

    private List<Product> resolveProducts(List<Long> ids) {
        // Must be a mutable list: Hibernate clears and repopulates this collection in place
        // when merging an @OrderColumn @ManyToMany association, and an immutable list (as
        // List.of()/Stream.toList() would produce) throws UnsupportedOperationException there.
        List<Product> ordered = new ArrayList<>();
        if (ids.isEmpty()) {
            return ordered;
        }
        List<Product> found = productRepository.findAllById(ids);
        for (Long id : ids) {
            found.stream().filter(product -> product.getId().equals(id)).findFirst().ifPresent(ordered::add);
        }
        return ordered;
    }

    private BuyingGuide findEntityById(Long id) {
        return buyingGuideRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Buying guide not found with id: " + id));
    }
}
```

- [ ] **Step 11: Update `PublicBuyingGuideController`**

Change the detail endpoint to slug-based:
```java
    @GetMapping("/{slug}")
    public ApiResponse<PublicBuyingGuideDetailResponse> getBySlug(@PathVariable String slug) {
        return ApiResponse.success("Buying guide retrieved successfully.", buyingGuideService.getBySlugForPublic(slug));
    }
```
(replaces the existing `getById(@PathVariable Long id)` method — same import set, no `PathVariable` type change needed beyond `Long` → `String`.)

- [ ] **Step 12: Add the scheduler**

`backend/src/main/java/com/twogofindz/backend/scheduler/BuyingGuidePublishScheduler.java`:
```java
package com.twogofindz.backend.scheduler;

import com.twogofindz.backend.entity.BuyingGuide;
import com.twogofindz.backend.repository.BuyingGuideRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class BuyingGuidePublishScheduler {

    private final BuyingGuideRepository buyingGuideRepository;

    public BuyingGuidePublishScheduler(BuyingGuideRepository buyingGuideRepository) {
        this.buyingGuideRepository = buyingGuideRepository;
    }

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void publishScheduledGuides() {
        List<BuyingGuide> due = buyingGuideRepository
                .findByActiveFalseAndScheduledPublishAtLessThanEqual(LocalDateTime.now());
        due.forEach(guide -> {
            guide.setActive(true);
            guide.setScheduledPublishAt(null);
        });
        buyingGuideRepository.saveAll(due);
    }
}
```

- [ ] **Step 13: Write the scheduler test**

`backend/src/test/java/com/twogofindz/backend/scheduler/BuyingGuidePublishSchedulerTest.java`:
```java
package com.twogofindz.backend.scheduler;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.entity.BuyingGuide;
import com.twogofindz.backend.entity.ProductCategory;
import com.twogofindz.backend.repository.BuyingGuideRepository;
import com.twogofindz.backend.repository.ProductCategoryRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BuyingGuidePublishSchedulerTest extends AbstractIntegrationTest {

    @Autowired
    private BuyingGuidePublishScheduler scheduler;

    @Autowired
    private BuyingGuideRepository buyingGuideRepository;

    @Autowired
    private ProductCategoryRepository productCategoryRepository;

    @Test
    @Transactional
    void publishScheduledGuides_activatesDueGuide_andClearsScheduledDate() {
        ProductCategory category = productCategoryRepository.save(
                ProductCategory.builder().productCategoryName("Scheduler Due Guide Category")
                        .commissionRate(new BigDecimal("5.00")).build());
        BuyingGuide due = buyingGuideRepository.save(BuyingGuide.builder()
                .title("Due Guide").slug("due-guide").excerpt("Excerpt").introduction("Introduction")
                .category(category).active(false)
                .scheduledPublishAt(LocalDateTime.now().minusMinutes(1))
                .recommendedProducts(List.of())
                .build());

        scheduler.publishScheduledGuides();

        BuyingGuide refreshed = buyingGuideRepository.findById(due.getId()).orElseThrow();
        assertThat(refreshed.getActive()).isTrue();
        assertThat(refreshed.getScheduledPublishAt()).isNull();
    }

    @Test
    @Transactional
    void publishScheduledGuides_leavesNotYetDueGuideUntouched() {
        ProductCategory category = productCategoryRepository.save(
                ProductCategory.builder().productCategoryName("Scheduler Not Due Guide Category")
                        .commissionRate(new BigDecimal("5.00")).build());
        BuyingGuide notDue = buyingGuideRepository.save(BuyingGuide.builder()
                .title("Not Due Guide").slug("not-due-guide").excerpt("Excerpt").introduction("Introduction")
                .category(category).active(false)
                .scheduledPublishAt(LocalDateTime.now().plusDays(1))
                .recommendedProducts(List.of())
                .build());

        scheduler.publishScheduledGuides();

        BuyingGuide refreshed = buyingGuideRepository.findById(notDue.getId()).orElseThrow();
        assertThat(refreshed.getActive()).isFalse();
        assertThat(refreshed.getScheduledPublishAt()).isNotNull();
    }
}
```

- [ ] **Step 14: Run all buying-guide-related tests**

Run: `cd backend && ./mvnw test -Dtest=AdminBuyingGuideControllerTest,PublicBuyingGuideControllerTest,BuyingGuidePublishSchedulerTest -q`
Expected: PASS

- [ ] **Step 15: Run the full suite**

Run: `cd backend && ./mvnw test -q`
Expected: PASS

- [ ] **Step 16: Commit**

```bash
git add backend/src/main/resources/db/migration/V14__restructure_buying_guide_root_fields.sql \
        backend/src/main/java/com/twogofindz/backend/entity/BuyingGuide.java \
        backend/src/main/java/com/twogofindz/backend/repository/BuyingGuideRepository.java \
        backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideRequest.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideResponse.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideSummaryResponse.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideDetailResponse.java \
        backend/src/main/java/com/twogofindz/backend/mapper/BuyingGuideMapper.java \
        backend/src/main/java/com/twogofindz/backend/service/BuyingGuideService.java \
        backend/src/main/java/com/twogofindz/backend/service/impl/BuyingGuideServiceImpl.java \
        backend/src/main/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideController.java \
        backend/src/main/java/com/twogofindz/backend/scheduler/BuyingGuidePublishScheduler.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java \
        backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java \
        backend/src/test/java/com/twogofindz/backend/scheduler/BuyingGuidePublishSchedulerTest.java
git commit -m "feat(buying-guides): restructure root fields with slug, category, SEO, scheduling"
```

---

### Task 3: Add HTML sanitization utility (`jsoup`)

No HTML sanitizer exists anywhere in this codebase today — all "rich" content so far has been plain text. `introduction`, `whyRecommended`, advice `content`, and FAQ `answer` will store HTML from a rich-text editor (Stage 2), so it must be sanitized server-side before persisting. Scope: allow basic formatting (paragraphs, bold/italic/underline, lists, links, images) — **no `<iframe>`/embed support**, to avoid an open XSS surface (confirmed with the user during design).

**Files:**
- Modify: `backend/pom.xml`
- Create: `backend/src/main/java/com/twogofindz/backend/util/HtmlSanitizer.java`
- Test: `backend/src/test/java/com/twogofindz/backend/util/HtmlSanitizerTest.java`

**Interfaces:**
- Produces: `HtmlSanitizer.sanitize(String rawHtml): String` — static utility method, no Spring bean needed (stateless, no dependencies). Task 6's service layer calls this on every rich-text field before persisting.

- [ ] **Step 1: Write the failing test**

`backend/src/test/java/com/twogofindz/backend/util/HtmlSanitizerTest.java`:
```java
package com.twogofindz.backend.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HtmlSanitizerTest {

    @Test
    void sanitize_keepsAllowlistedFormattingTags() {
        String input = "<p>Great <b>battery life</b> and <i>clear</i> <u>calls</u>.</p>"
                + "<ul><li>Point one</li><li>Point two</li></ul>";
        assertThat(HtmlSanitizer.sanitize(input)).isEqualTo(
                "<p>Great <b>battery life</b> and <i>clear</i> <u>calls</u>.</p>\n"
                        + "<ul>\n <li>Point one</li>\n <li>Point two</li>\n</ul>");
    }

    @Test
    void sanitize_keepsSafeLinksAndImages() {
        String input = "<a href=\"https://amazon.com/dp/example\">Buy it</a>"
                + "<img src=\"/uploads/photo.jpg\" alt=\"Product photo\">";
        String result = HtmlSanitizer.sanitize(input);
        assertThat(result).contains("href=\"https://amazon.com/dp/example\"");
        assertThat(result).contains("src=\"/uploads/photo.jpg\"");
        assertThat(result).contains("alt=\"Product photo\"");
    }

    @Test
    void sanitize_stripsScriptTags() {
        String input = "<p>Hello</p><script>alert('xss')</script>";
        assertThat(HtmlSanitizer.sanitize(input)).isEqualTo("<p>Hello</p>");
    }

    @Test
    void sanitize_stripsOnClickAttribute() {
        String input = "<p onclick=\"alert('xss')\">Click me</p>";
        assertThat(HtmlSanitizer.sanitize(input)).isEqualTo("<p>Click me</p>");
    }

    @Test
    void sanitize_stripsIframeEmbeds() {
        String input = "<p>Watch this</p><iframe src=\"https://youtube.com/embed/xyz\"></iframe>";
        assertThat(HtmlSanitizer.sanitize(input)).isEqualTo("<p>Watch this</p>");
    }

    @Test
    void sanitize_stripsJavascriptUrls() {
        String input = "<a href=\"javascript:alert(1)\">Click</a>";
        assertThat(HtmlSanitizer.sanitize(input)).isEqualTo("<a>Click</a>");
    }

    @Test
    void sanitize_returnsEmptyString_forNullInput() {
        assertThat(HtmlSanitizer.sanitize(null)).isEqualTo("");
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./mvnw test -Dtest=HtmlSanitizerTest -q`
Expected: FAIL — `HtmlSanitizer` class doesn't exist yet (compile error).

- [ ] **Step 3: Add the `jsoup` dependency**

In `backend/pom.xml`, add inside `<dependencies>` (near the other non-Spring-managed libraries, after the `jjwt-jackson` dependency):
```xml
    <dependency>
      <groupId>org.jsoup</groupId>
      <artifactId>jsoup</artifactId>
      <version>1.17.2</version>
    </dependency>
```

- [ ] **Step 4: Implement `HtmlSanitizer`**

`backend/src/main/java/com/twogofindz/backend/util/HtmlSanitizer.java`:
```java
package com.twogofindz.backend.util;

import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;

/**
 * Server-side sanitizer for rich-text fields (Buying Guide introduction, "why we recommend it",
 * advice sections, FAQ answers). Deliberately excludes iframe/embed support — arbitrary iframe
 * {@code src} is an open XSS surface, so embeds are out of scope for this feature (links to
 * external video are still fine, just not inline embeds).
 */
public final class HtmlSanitizer {

    private static final Safelist ALLOWLIST = Safelist.relaxed()
            .addTags("u")
            .removeTags("iframe", "video", "audio", "embed", "object")
            .addAttributes("img", "alt")
            .addProtocols("a", "href", "http", "https");

    private HtmlSanitizer() {
    }

    public static String sanitize(String rawHtml) {
        if (rawHtml == null) {
            return "";
        }
        return Jsoup.clean(rawHtml, ALLOWLIST);
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && ./mvnw test -Dtest=HtmlSanitizerTest -q`
Expected: PASS. If the exact whitespace/formatting in the first test doesn't match jsoup's pretty-printer output, adjust the expected string to match — jsoup's `Jsoup.clean` output formatting is deterministic but exact spacing can vary by version, so run the test once, inspect the actual output on failure, and use that as the source of truth for the assertion rather than guessing.

- [ ] **Step 6: Commit**

```bash
git add backend/pom.xml backend/src/main/java/com/twogofindz/backend/util/HtmlSanitizer.java \
        backend/src/test/java/com/twogofindz/backend/util/HtmlSanitizerTest.java
git commit -m "feat(buying-guides): add jsoup-based HTML sanitizer for rich-text fields"
```

---

### Task 4: Add the 7 new child tables + entities, wired as `BuyingGuide` collections

Not yet exposed via `BuyingGuideRequest`/`BuyingGuideResponse` (Tasks 5–6 do that) — this task only proves the schema and JPA mappings are correct via a direct repository-level test. Matches `Comparison`'s convention of **no separate Spring Data repository per child entity** — children are only ever reached through `BuyingGuideRepository` via cascade.

**Files:**
- Create: `backend/src/main/resources/db/migration/V15__create_buying_guide_section_tables.sql`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/RecommendationType.java`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/RecommendationItemType.java`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideSectionKey.java`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideQuickRecommendation.java`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideComparisonSpec.java`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideComparisonValue.java`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideRecommendationSection.java`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideRecommendationItem.java`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideAdviceSection.java`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideFaq.java`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideSectionSetting.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuide.java`
- Test: `backend/src/test/java/com/twogofindz/backend/repository/BuyingGuideRepositoryTest.java` (new — fills the gap noted during investigation: `Comparison` has a repository test, `BuyingGuide` didn't)

**Interfaces:**
- Produces: all 8 new entity classes and 3 enums, plus `BuyingGuide.getQuickRecommendations()/getComparisonSpecs()/getRecommendationSections()/getAdviceSections()/getFaqs()/getSectionSettings(): List<...>`. Task 5's request/response DTOs and Task 6's service reference these exact getter/setter names and entity field names.

- [ ] **Step 1: Write the failing test**

`backend/src/test/java/com/twogofindz/backend/repository/BuyingGuideRepositoryTest.java`:
```java
package com.twogofindz.backend.repository;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.entity.BuyingGuide;
import com.twogofindz.backend.entity.BuyingGuideAdviceSection;
import com.twogofindz.backend.entity.BuyingGuideComparisonSpec;
import com.twogofindz.backend.entity.BuyingGuideComparisonValue;
import com.twogofindz.backend.entity.BuyingGuideFaq;
import com.twogofindz.backend.entity.BuyingGuideQuickRecommendation;
import com.twogofindz.backend.entity.BuyingGuideRecommendationItem;
import com.twogofindz.backend.entity.BuyingGuideRecommendationSection;
import com.twogofindz.backend.entity.BuyingGuideSectionKey;
import com.twogofindz.backend.entity.BuyingGuideSectionSetting;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.entity.ProductCategory;
import com.twogofindz.backend.entity.RecommendationItemType;
import com.twogofindz.backend.entity.RecommendationType;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BuyingGuideRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private BuyingGuideRepository buyingGuideRepository;

    @Autowired
    private ProductCategoryRepository productCategoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    void savingGuide_cascadesAllChildSections_andRoundTripsThem() {
        ProductCategory category = productCategoryRepository.save(
                ProductCategory.builder().productCategoryName("Repo Test Guide Category")
                        .commissionRate(new BigDecimal("5.00")).build());
        Product product = productRepository.save(Product.builder()
                .name("Repo Test Product").description("For cascade test.").category(category)
                .productPrice(new BigDecimal("10.00")).productLink("https://amazon.com/dp/repotest")
                .trending(false).bestSeller(false).active(true).reviewCount(0)
                .build());

        BuyingGuide guide = BuyingGuide.builder()
                .title("Cascade Test Guide").slug("cascade-test-guide")
                .excerpt("Excerpt").introduction("Introduction")
                .category(category).active(true)
                .recommendedProducts(new ArrayList<>(List.of(product)))
                .build();

        BuyingGuideQuickRecommendation quickRec = BuyingGuideQuickRecommendation.builder()
                .buyingGuide(guide).product(product).badgeName("Best Overall").build();
        guide.setQuickRecommendations(new ArrayList<>(List.of(quickRec)));

        BuyingGuideComparisonSpec spec = BuyingGuideComparisonSpec.builder()
                .buyingGuide(guide).specificationName("Battery Life").build();
        BuyingGuideComparisonValue value = BuyingGuideComparisonValue.builder()
                .comparisonSpec(spec).product(product).specificationValue("40 Hrs").build();
        spec.setValues(new ArrayList<>(List.of(value)));
        guide.setComparisonSpecs(new ArrayList<>(List.of(spec)));

        BuyingGuideRecommendationSection section = BuyingGuideRecommendationSection.builder()
                .buyingGuide(guide).product(product).recommendationType(RecommendationType.TOP_PICK)
                .sectionLabel("Our Top Pick").whyRecommended("Great value.").build();
        BuyingGuideRecommendationItem pro = BuyingGuideRecommendationItem.builder()
                .recommendationSection(section).itemType(RecommendationItemType.PRO).content("Great sound").build();
        section.setItems(new ArrayList<>(List.of(pro)));
        guide.setRecommendationSections(new ArrayList<>(List.of(section)));

        BuyingGuideAdviceSection advice = BuyingGuideAdviceSection.builder()
                .buyingGuide(guide).title("What to Look For").content("Look for good battery life.").build();
        guide.setAdviceSections(new ArrayList<>(List.of(advice)));

        BuyingGuideFaq faq = BuyingGuideFaq.builder()
                .buyingGuide(guide).question("Is it worth it?").answer("Yes.").build();
        guide.setFaqs(new ArrayList<>(List.of(faq)));

        BuyingGuideSectionSetting setting = BuyingGuideSectionSetting.builder()
                .buyingGuide(guide).sectionKey(BuyingGuideSectionKey.FAQS).visible(true).build();
        guide.setSectionSettings(new ArrayList<>(List.of(setting)));

        BuyingGuide saved = buyingGuideRepository.saveAndFlush(guide);
        entityManager.clear();

        BuyingGuide reloaded = buyingGuideRepository.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getQuickRecommendations()).hasSize(1);
        assertThat(reloaded.getComparisonSpecs()).hasSize(1);
        assertThat(reloaded.getComparisonSpecs().get(0).getValues()).hasSize(1);
        assertThat(reloaded.getRecommendationSections()).hasSize(1);
        assertThat(reloaded.getRecommendationSections().get(0).getItems()).hasSize(1);
        assertThat(reloaded.getAdviceSections()).hasSize(1);
        assertThat(reloaded.getFaqs()).hasSize(1);
        assertThat(reloaded.getSectionSettings()).hasSize(1);

        Long guideId = saved.getId();
        buyingGuideRepository.delete(reloaded);
        buyingGuideRepository.flush();

        Long remainingFaqs = entityManager.createQuery(
                        "select count(f) from BuyingGuideFaq f where f.buyingGuide.id = :guideId", Long.class)
                .setParameter("guideId", guideId)
                .getSingleResult();
        assertThat(remainingFaqs).isZero();

        Product stillExists = productRepository.findById(product.getId()).orElseThrow();
        assertThat(stillExists).isNotNull();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./mvnw test -Dtest=BuyingGuideRepositoryTest -q`
Expected: FAIL — none of the new entity classes exist yet (compile error).

- [ ] **Step 3: Add the migration**

`backend/src/main/resources/db/migration/V15__create_buying_guide_section_tables.sql`:
```sql
CREATE TABLE buying_guide_quick_recommendations (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    buying_guide_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    badge_name VARCHAR(60) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bg_quick_recs_guide FOREIGN KEY (buying_guide_id) REFERENCES buying_guides (id) ON DELETE CASCADE,
    CONSTRAINT fk_bg_quick_recs_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT uq_bg_quick_recs_guide_product UNIQUE (buying_guide_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_bg_quick_recs_product ON buying_guide_quick_recommendations (product_id);

CREATE TABLE buying_guide_comparison_specs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    buying_guide_id BIGINT NOT NULL,
    specification_name VARCHAR(100) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bg_comparison_specs_guide FOREIGN KEY (buying_guide_id) REFERENCES buying_guides (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_bg_comparison_specs_guide ON buying_guide_comparison_specs (buying_guide_id);

CREATE TABLE buying_guide_comparison_values (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    comparison_spec_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    specification_value VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bg_comparison_values_spec FOREIGN KEY (comparison_spec_id) REFERENCES buying_guide_comparison_specs (id) ON DELETE CASCADE,
    CONSTRAINT fk_bg_comparison_values_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT uq_bg_comparison_values_spec_product UNIQUE (comparison_spec_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE buying_guide_recommendation_sections (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    buying_guide_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    recommendation_type VARCHAR(20) NOT NULL,
    section_label VARCHAR(100) NOT NULL,
    why_recommended TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    top_pick_guard INT GENERATED ALWAYS AS (CASE WHEN recommendation_type = 'TOP_PICK' THEN 1 ELSE NULL END) STORED,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bg_recommendation_sections_guide FOREIGN KEY (buying_guide_id) REFERENCES buying_guides (id) ON DELETE CASCADE,
    CONSTRAINT fk_bg_recommendation_sections_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT uq_bg_recommendation_sections_top_pick UNIQUE (buying_guide_id, top_pick_guard)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_bg_recommendation_sections_guide ON buying_guide_recommendation_sections (buying_guide_id);

CREATE TABLE buying_guide_recommendation_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    recommendation_section_id BIGINT NOT NULL,
    item_type VARCHAR(20) NOT NULL,
    content VARCHAR(300) NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bg_recommendation_items_section FOREIGN KEY (recommendation_section_id) REFERENCES buying_guide_recommendation_sections (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_bg_recommendation_items_section ON buying_guide_recommendation_items (recommendation_section_id);

CREATE TABLE buying_guide_advice_sections (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    buying_guide_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bg_advice_sections_guide FOREIGN KEY (buying_guide_id) REFERENCES buying_guides (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_bg_advice_sections_guide ON buying_guide_advice_sections (buying_guide_id);

CREATE TABLE buying_guide_faqs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    buying_guide_id BIGINT NOT NULL,
    question VARCHAR(300) NOT NULL,
    answer TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bg_faqs_guide FOREIGN KEY (buying_guide_id) REFERENCES buying_guides (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_bg_faqs_guide ON buying_guide_faqs (buying_guide_id);

CREATE TABLE buying_guide_section_settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    buying_guide_id BIGINT NOT NULL,
    section_key VARCHAR(30) NOT NULL,
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bg_section_settings_guide FOREIGN KEY (buying_guide_id) REFERENCES buying_guides (id) ON DELETE CASCADE,
    CONSTRAINT uq_bg_section_settings_guide_key UNIQUE (buying_guide_id, section_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- [ ] **Step 4: Add the 3 enums**

`entity/RecommendationType.java`:
```java
package com.twogofindz.backend.entity;

public enum RecommendationType {
    TOP_PICK,
    RUNNER_UP
}
```

`entity/RecommendationItemType.java`:
```java
package com.twogofindz.backend.entity;

public enum RecommendationItemType {
    PRO,
    CON,
    BEST_FOR
}
```

`entity/BuyingGuideSectionKey.java`:
```java
package com.twogofindz.backend.entity;

public enum BuyingGuideSectionKey {
    QUICK_RECOMMENDATIONS,
    COMPARISON_TABLE,
    TOP_PICK,
    RUNNER_UPS,
    BUYING_ADVICE,
    FAQS
}
```

- [ ] **Step 5: Add the 8 new entities**

`entity/BuyingGuideQuickRecommendation.java`:
```java
package com.twogofindz.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "buying_guide_quick_recommendations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuyingGuideQuickRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "buying_guide_id", nullable = false)
    private BuyingGuide buyingGuide;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "badge_name", nullable = false, length = 60)
    private String badgeName;
}
```

`entity/BuyingGuideComparisonSpec.java`:
```java
package com.twogofindz.backend.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Entity
@Table(name = "buying_guide_comparison_specs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuyingGuideComparisonSpec {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "buying_guide_id", nullable = false)
    private BuyingGuide buyingGuide;

    @Column(name = "specification_name", nullable = false, length = 100)
    private String specificationName;

    @OneToMany(mappedBy = "comparisonSpec", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BuyingGuideComparisonValue> values;
}
```

`entity/BuyingGuideComparisonValue.java`:
```java
package com.twogofindz.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "buying_guide_comparison_values")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuyingGuideComparisonValue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "comparison_spec_id", nullable = false)
    private BuyingGuideComparisonSpec comparisonSpec;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "specification_value", nullable = false, length = 500)
    private String specificationValue;
}
```

`entity/BuyingGuideRecommendationSection.java` (shared by Top Pick + Runner-Up; `items` holds Pros/Cons/Best-For combined — see Task 6 for how the service partitions them by `itemType` while preserving each group's relative order):
```java
package com.twogofindz.backend.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Entity
@Table(name = "buying_guide_recommendation_sections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuyingGuideRecommendationSection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "buying_guide_id", nullable = false)
    private BuyingGuide buyingGuide;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Enumerated(EnumType.STRING)
    @Column(name = "recommendation_type", nullable = false, columnDefinition = "VARCHAR(20)")
    private RecommendationType recommendationType;

    @Column(name = "section_label", nullable = false, length = 100)
    private String sectionLabel;

    @Column(name = "why_recommended", nullable = false, columnDefinition = "TEXT")
    private String whyRecommended;

    @OneToMany(mappedBy = "recommendationSection", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderColumn(name = "display_order")
    private List<BuyingGuideRecommendationItem> items;
}
```

Note: the DB-generated `top_pick_guard` column is intentionally **not** mapped on this entity — nothing in the app ever reads it, it exists purely as a database-level uniqueness safety net (see V15 above), so Hibernate never needs to know it exists.

`entity/BuyingGuideRecommendationItem.java`:
```java
package com.twogofindz.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "buying_guide_recommendation_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuyingGuideRecommendationItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "recommendation_section_id", nullable = false)
    private BuyingGuideRecommendationSection recommendationSection;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false, columnDefinition = "VARCHAR(20)")
    private RecommendationItemType itemType;

    @Column(nullable = false, length = 300)
    private String content;
}
```

`entity/BuyingGuideAdviceSection.java`:
```java
package com.twogofindz.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "buying_guide_advice_sections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuyingGuideAdviceSection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "buying_guide_id", nullable = false)
    private BuyingGuide buyingGuide;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
}
```

`entity/BuyingGuideFaq.java`:
```java
package com.twogofindz.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "buying_guide_faqs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuyingGuideFaq {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "buying_guide_id", nullable = false)
    private BuyingGuide buyingGuide;

    @Column(nullable = false, length = 300)
    private String question;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String answer;
}
```

`entity/BuyingGuideSectionSetting.java`:
```java
package com.twogofindz.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "buying_guide_section_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuyingGuideSectionSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "buying_guide_id", nullable = false)
    private BuyingGuide buyingGuide;

    @Enumerated(EnumType.STRING)
    @Column(name = "section_key", nullable = false, columnDefinition = "VARCHAR(30)")
    private BuyingGuideSectionKey sectionKey;

    @Column(nullable = false)
    private boolean visible;
}
```

- [ ] **Step 6: Wire the 6 owned collections onto `BuyingGuide`**

Add to `BuyingGuide.java` (after `recommendedProducts`), plus the two new imports `jakarta.persistence.CascadeType` and `jakarta.persistence.OneToMany`:
```java
    @OneToMany(mappedBy = "buyingGuide", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderColumn(name = "display_order")
    private List<BuyingGuideQuickRecommendation> quickRecommendations;

    @OneToMany(mappedBy = "buyingGuide", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderColumn(name = "display_order")
    private List<BuyingGuideComparisonSpec> comparisonSpecs;

    @OneToMany(mappedBy = "buyingGuide", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderColumn(name = "display_order")
    private List<BuyingGuideRecommendationSection> recommendationSections;

    @OneToMany(mappedBy = "buyingGuide", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderColumn(name = "display_order")
    private List<BuyingGuideAdviceSection> adviceSections;

    @OneToMany(mappedBy = "buyingGuide", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderColumn(name = "display_order")
    private List<BuyingGuideFaq> faqs;

    @OneToMany(mappedBy = "buyingGuide", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderColumn(name = "display_order")
    private List<BuyingGuideSectionSetting> sectionSettings;
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd backend && ./mvnw test -Dtest=BuyingGuideRepositoryTest -q`
Expected: PASS

- [ ] **Step 8: Run the full suite**

Run: `cd backend && ./mvnw test -q`
Expected: PASS (existing `AdminBuyingGuideControllerTest`/`PublicBuyingGuideControllerTest` are unaffected since `BuyingGuideRequest`/`Response` haven't changed in this task).

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/resources/db/migration/V15__create_buying_guide_section_tables.sql \
        backend/src/main/java/com/twogofindz/backend/entity/RecommendationType.java \
        backend/src/main/java/com/twogofindz/backend/entity/RecommendationItemType.java \
        backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideSectionKey.java \
        backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideQuickRecommendation.java \
        backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideComparisonSpec.java \
        backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideComparisonValue.java \
        backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideRecommendationSection.java \
        backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideRecommendationItem.java \
        backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideAdviceSection.java \
        backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideFaq.java \
        backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideSectionSetting.java \
        backend/src/main/java/com/twogofindz/backend/entity/BuyingGuide.java \
        backend/src/test/java/com/twogofindz/backend/repository/BuyingGuideRepositoryTest.java
git commit -m "feat(buying-guides): add quick recs, comparison, recommendation, advice, FAQ, and TOC tables"
```

---

### Task 5: Request/response DTOs for all 6 new sections

Types only — no service logic wired up yet (Task 6 does that). Verified with a plain JUnit test against `jakarta.validation.Validator` directly (no Spring context needed), proving the Bean Validation annotations are correct before they're exercised end-to-end via MockMvc in Task 6.

**Files:**
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideQuickRecommendationRequest.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideComparisonSpecRequest.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideComparisonValueRequest.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideRecommendationSectionRequest.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideRecommendationItemRequest.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideAdviceSectionRequest.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideFaqRequest.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideSectionSettingRequest.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideRequest.java` (append 6 nested `@Valid` list fields)
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideQuickRecommendationResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideComparisonSpecResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideComparisonValueResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideRecommendationSectionResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideRecommendationItemResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideAdviceSectionResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideFaqResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideSectionSettingResponse.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideResponse.java` (append 6 nested list fields)
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideQuickRecommendationResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideComparisonTableResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideComparisonRowResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideRecommendationSectionResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideAdviceSectionResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideFaqResponse.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideDetailResponse.java` (append the public section fields)
- Test: `backend/src/test/java/com/twogofindz/backend/dto/request/BuyingGuideSectionRequestValidationTest.java` (new)

**Interfaces:**
- Consumes: `RecommendationType`, `RecommendationItemType`, `BuyingGuideSectionKey` (Task 4), `ProductResponse` (Task 1).
- Produces: every request/response record listed above, plus `BuyingGuideRequest`'s 6 new fields — `quickRecommendations`, `comparisonSpecs`, `recommendationSections`, `adviceSections`, `faqs`, `sectionSettings` (all `List<...>`, all `@Valid`) — and the equivalent 6 fields on `BuyingGuideResponse`. Task 6's service/mapper build and read these exact field names.

- [ ] **Step 1: Write the failing test**

`backend/src/test/java/com/twogofindz/backend/dto/request/BuyingGuideSectionRequestValidationTest.java`:
```java
package com.twogofindz.backend.dto.request;

import com.twogofindz.backend.entity.RecommendationType;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class BuyingGuideSectionRequestValidationTest {

    private static final Validator VALIDATOR;

    static {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        VALIDATOR = factory.getValidator();
    }

    @Test
    void quickRecommendationRequest_rejectsBlankBadgeName() {
        BuyingGuideQuickRecommendationRequest request = new BuyingGuideQuickRecommendationRequest(1L, "");
        Set<ConstraintViolation<BuyingGuideQuickRecommendationRequest>> violations = VALIDATOR.validate(request);
        assertThat(violations).isNotEmpty();
    }

    @Test
    void faqRequest_rejectsBlankQuestionAndAnswer() {
        BuyingGuideFaqRequest request = new BuyingGuideFaqRequest("", "");
        Set<ConstraintViolation<BuyingGuideFaqRequest>> violations = VALIDATOR.validate(request);
        assertThat(violations).hasSize(2);
    }

    @Test
    void recommendationSectionRequest_rejectsEmptyProsList() {
        BuyingGuideRecommendationSectionRequest request = new BuyingGuideRecommendationSectionRequest(
                1L, RecommendationType.TOP_PICK, "Our Top Pick", "Great product.",
                List.of(),
                List.of(new BuyingGuideRecommendationItemRequest("Con one")),
                List.of(new BuyingGuideRecommendationItemRequest("Best for one")));
        Set<ConstraintViolation<BuyingGuideRecommendationSectionRequest>> violations = VALIDATOR.validate(request);
        assertThat(violations).isNotEmpty();
    }

    @Test
    void recommendationItemRequest_rejectsBlankContent() {
        BuyingGuideRecommendationItemRequest request = new BuyingGuideRecommendationItemRequest("");
        Set<ConstraintViolation<BuyingGuideRecommendationItemRequest>> violations = VALIDATOR.validate(request);
        assertThat(violations).isNotEmpty();
    }

    @Test
    void comparisonSpecRequest_rejectsEmptyValuesList() {
        BuyingGuideComparisonSpecRequest request = new BuyingGuideComparisonSpecRequest("Battery Life", List.of());
        Set<ConstraintViolation<BuyingGuideComparisonSpecRequest>> violations = VALIDATOR.validate(request);
        assertThat(violations).isNotEmpty();
    }

    @Test
    void adviceSectionRequest_rejectsBlankTitle() {
        BuyingGuideAdviceSectionRequest request = new BuyingGuideAdviceSectionRequest("", "Some content.");
        Set<ConstraintViolation<BuyingGuideAdviceSectionRequest>> violations = VALIDATOR.validate(request);
        assertThat(violations).isNotEmpty();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ./mvnw test -Dtest=BuyingGuideSectionRequestValidationTest -q`
Expected: FAIL — none of these request classes exist yet (compile error).

- [ ] **Step 3: Create the 8 new request DTOs**

`dto/request/BuyingGuideQuickRecommendationRequest.java`:
```java
package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record BuyingGuideQuickRecommendationRequest(
        @NotNull(message = "Product id is required.")
        Long productId,

        @NotBlank(message = "Badge name is required.")
        @Size(max = 60, message = "Badge name must be at most 60 characters.")
        String badgeName
) {
}
```

`dto/request/BuyingGuideComparisonValueRequest.java`:
```java
package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record BuyingGuideComparisonValueRequest(
        @NotNull(message = "Product id is required for every spec value.")
        Long productId,

        @NotBlank(message = "Spec value is required.")
        @Size(max = 500, message = "Spec value must be at most 500 characters.")
        String value
) {
}
```

`dto/request/BuyingGuideComparisonSpecRequest.java`:
```java
package com.twogofindz.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record BuyingGuideComparisonSpecRequest(
        @NotBlank(message = "Specification name is required.")
        @Size(max = 100, message = "Specification name must be at most 100 characters.")
        String specificationName,

        @NotEmpty(message = "Each specification must include at least one value.")
        @Valid
        List<BuyingGuideComparisonValueRequest> values
) {
}
```

`dto/request/BuyingGuideRecommendationItemRequest.java`:
```java
package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BuyingGuideRecommendationItemRequest(
        @NotBlank(message = "Content is required.")
        @Size(max = 300, message = "Content must be at most 300 characters.")
        String content
) {
}
```

`dto/request/BuyingGuideRecommendationSectionRequest.java`:
```java
package com.twogofindz.backend.dto.request;

import com.twogofindz.backend.entity.RecommendationType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record BuyingGuideRecommendationSectionRequest(
        @NotNull(message = "Product id is required.")
        Long productId,

        @NotNull(message = "Recommendation type is required.")
        RecommendationType recommendationType,

        @NotBlank(message = "Section label is required.")
        @Size(max = 100, message = "Section label must be at most 100 characters.")
        String sectionLabel,

        @NotBlank(message = "\"Why we recommend it\" is required.")
        String whyRecommended,

        @NotEmpty(message = "At least one pro is required.")
        @Valid
        List<BuyingGuideRecommendationItemRequest> pros,

        @NotEmpty(message = "At least one con is required.")
        @Valid
        List<BuyingGuideRecommendationItemRequest> cons,

        @NotEmpty(message = "At least one \"best for\" entry is required.")
        @Valid
        List<BuyingGuideRecommendationItemRequest> bestFor
) {
}
```

`dto/request/BuyingGuideAdviceSectionRequest.java`:
```java
package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BuyingGuideAdviceSectionRequest(
        @NotBlank(message = "Section title is required.")
        @Size(max = 150, message = "Section title must be at most 150 characters.")
        String title,

        @NotBlank(message = "Section content is required.")
        String content
) {
}
```

`dto/request/BuyingGuideFaqRequest.java`:
```java
package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BuyingGuideFaqRequest(
        @NotBlank(message = "Question is required.")
        @Size(max = 300, message = "Question must be at most 300 characters.")
        String question,

        @NotBlank(message = "Answer is required.")
        String answer
) {
}
```

`dto/request/BuyingGuideSectionSettingRequest.java`:
```java
package com.twogofindz.backend.dto.request;

import com.twogofindz.backend.entity.BuyingGuideSectionKey;
import jakarta.validation.constraints.NotNull;

public record BuyingGuideSectionSettingRequest(
        @NotNull(message = "Section key is required.")
        BuyingGuideSectionKey sectionKey,

        boolean visible
) {
}
```

- [ ] **Step 4: Append the 6 nested fields to `BuyingGuideRequest`**

Add after `recommendedProductIds` (and its `@NotNull` list, keeping that field last-but-one):
```java
        @NotNull(message = "Recommended products list is required.")
        List<Long> recommendedProductIds,

        @NotNull(message = "Quick recommendations list is required.")
        @Valid
        List<BuyingGuideQuickRecommendationRequest> quickRecommendations,

        @NotNull(message = "Comparison specs list is required.")
        @Valid
        List<BuyingGuideComparisonSpecRequest> comparisonSpecs,

        @NotNull(message = "Recommendation sections list is required.")
        @Valid
        List<BuyingGuideRecommendationSectionRequest> recommendationSections,

        @NotNull(message = "Advice sections list is required.")
        @Valid
        List<BuyingGuideAdviceSectionRequest> adviceSections,

        @NotNull(message = "FAQs list is required.")
        @Valid
        List<BuyingGuideFaqRequest> faqs,

        @NotNull(message = "Section settings list is required.")
        @Valid
        List<BuyingGuideSectionSettingRequest> sectionSettings
) {
}
```
Add the import `jakarta.validation.Valid` to `BuyingGuideRequest.java`.

**This changes `BuyingGuideRequest`'s arity again — every `new BuyingGuideRequest(...)` call site (both test files rewritten in Task 2) needs 6 more trailing arguments.** Update every call site in `AdminBuyingGuideControllerTest.java` and `PublicBuyingGuideControllerTest.java` to append `, List.of(), List.of(), List.of(), List.of(), List.of(), List.of()` before the final closing parenthesis (empty lists — Task 6 adds tests exercising non-empty section payloads).

- [ ] **Step 5: Create the 8 new admin response DTOs**

`dto/response/BuyingGuideQuickRecommendationResponse.java`:
```java
package com.twogofindz.backend.dto.response;

public record BuyingGuideQuickRecommendationResponse(
        Long id,
        ProductResponse product,
        String badgeName
) {
}
```

`dto/response/BuyingGuideComparisonValueResponse.java`:
```java
package com.twogofindz.backend.dto.response;

public record BuyingGuideComparisonValueResponse(
        Long id,
        ProductResponse product,
        String specificationValue
) {
}
```

`dto/response/BuyingGuideComparisonSpecResponse.java`:
```java
package com.twogofindz.backend.dto.response;

import java.util.List;

public record BuyingGuideComparisonSpecResponse(
        Long id,
        String specificationName,
        List<BuyingGuideComparisonValueResponse> values
) {
}
```

`dto/response/BuyingGuideRecommendationItemResponse.java`:
```java
package com.twogofindz.backend.dto.response;

public record BuyingGuideRecommendationItemResponse(
        Long id,
        String content
) {
}
```

`dto/response/BuyingGuideRecommendationSectionResponse.java`:
```java
package com.twogofindz.backend.dto.response;

import com.twogofindz.backend.entity.RecommendationType;

import java.util.List;

public record BuyingGuideRecommendationSectionResponse(
        Long id,
        ProductResponse product,
        RecommendationType recommendationType,
        String sectionLabel,
        String whyRecommended,
        List<BuyingGuideRecommendationItemResponse> pros,
        List<BuyingGuideRecommendationItemResponse> cons,
        List<BuyingGuideRecommendationItemResponse> bestFor
) {
}
```

`dto/response/BuyingGuideAdviceSectionResponse.java`:
```java
package com.twogofindz.backend.dto.response;

public record BuyingGuideAdviceSectionResponse(
        Long id,
        String title,
        String content
) {
}
```

`dto/response/BuyingGuideFaqResponse.java`:
```java
package com.twogofindz.backend.dto.response;

public record BuyingGuideFaqResponse(
        Long id,
        String question,
        String answer
) {
}
```

`dto/response/BuyingGuideSectionSettingResponse.java`:
```java
package com.twogofindz.backend.dto.response;

import com.twogofindz.backend.entity.BuyingGuideSectionKey;

public record BuyingGuideSectionSettingResponse(
        BuyingGuideSectionKey sectionKey,
        boolean visible
) {
}
```

- [ ] **Step 6: Append the 6 nested fields to `BuyingGuideResponse`**

```java
public record BuyingGuideResponse(
        Long id,
        String title,
        String slug,
        String excerpt,
        String introduction,
        String coverImageFilename,
        Long categoryId,
        String categoryName,
        String seoTitle,
        String seoDescription,
        Boolean active,
        LocalDateTime scheduledPublishAt,
        List<ProductResponse> recommendedProducts,
        List<BuyingGuideQuickRecommendationResponse> quickRecommendations,
        List<BuyingGuideComparisonSpecResponse> comparisonSpecs,
        List<BuyingGuideRecommendationSectionResponse> recommendationSections,
        List<BuyingGuideAdviceSectionResponse> adviceSections,
        List<BuyingGuideFaqResponse> faqs,
        List<BuyingGuideSectionSettingResponse> sectionSettings,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
```

- [ ] **Step 7: Create the public response DTOs**

`dto/response/PublicBuyingGuideQuickRecommendationResponse.java`:
```java
package com.twogofindz.backend.dto.response;

public record PublicBuyingGuideQuickRecommendationResponse(
        ProductResponse product,
        String badgeName
) {
}
```

`dto/response/PublicBuyingGuideComparisonRowResponse.java`:
```java
package com.twogofindz.backend.dto.response;

import java.util.List;

public record PublicBuyingGuideComparisonRowResponse(
        ProductResponse product,
        List<String> specificationValues
) {
}
```

`dto/response/PublicBuyingGuideComparisonTableResponse.java`:
```java
package com.twogofindz.backend.dto.response;

import java.util.List;

public record PublicBuyingGuideComparisonTableResponse(
        List<String> specificationNames,
        List<PublicBuyingGuideComparisonRowResponse> rows
) {
}
```

`dto/response/PublicBuyingGuideRecommendationSectionResponse.java`:
```java
package com.twogofindz.backend.dto.response;

import com.twogofindz.backend.entity.RecommendationType;

import java.util.List;

public record PublicBuyingGuideRecommendationSectionResponse(
        ProductResponse product,
        RecommendationType recommendationType,
        String sectionLabel,
        String whyRecommended,
        List<String> pros,
        List<String> cons,
        List<String> bestFor,
        String badgeName
) {
}
```

`dto/response/PublicBuyingGuideAdviceSectionResponse.java`:
```java
package com.twogofindz.backend.dto.response;

public record PublicBuyingGuideAdviceSectionResponse(
        String title,
        String content
) {
}
```

`dto/response/PublicBuyingGuideFaqResponse.java`:
```java
package com.twogofindz.backend.dto.response;

public record PublicBuyingGuideFaqResponse(
        String question,
        String answer
) {
}
```

- [ ] **Step 8: Append the public section fields to `PublicBuyingGuideDetailResponse`**

```java
package com.twogofindz.backend.dto.response;

import com.twogofindz.backend.entity.BuyingGuideSectionKey;

import java.time.LocalDateTime;
import java.util.List;

public record PublicBuyingGuideDetailResponse(
        Long id,
        String title,
        String slug,
        String excerpt,
        String introduction,
        String coverImageFilename,
        String categoryName,
        String seoTitle,
        String seoDescription,
        LocalDateTime createdAt,
        List<ProductResponse> recommendedProducts,
        List<PublicBuyingGuideQuickRecommendationResponse> quickRecommendations,
        PublicBuyingGuideComparisonTableResponse comparisonTable,
        PublicBuyingGuideRecommendationSectionResponse topPick,
        List<PublicBuyingGuideRecommendationSectionResponse> runnerUps,
        List<PublicBuyingGuideAdviceSectionResponse> adviceSections,
        List<PublicBuyingGuideFaqResponse> faqs,
        List<BuyingGuideSectionKey> visibleSectionOrder
) {
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `cd backend && ./mvnw test -Dtest=BuyingGuideSectionRequestValidationTest -q`
Expected: PASS

- [ ] **Step 10: Run the full suite**

Run: `cd backend && ./mvnw test -q`
Expected: FAIL at this point — `BuyingGuideMapper`/`BuyingGuideServiceImpl` don't build the 6 new `BuyingGuideResponse` fields yet, so the mapper won't compile against the new record shape. **This is expected and resolved in Task 6** — do not attempt to fix it here; Task 6 is the very next task and completes the wiring. If using subagent-driven-development, note this expected transient failure explicitly when handing off to Task 6's worker.

- [ ] **Step 11: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/dto
git add backend/src/test/java/com/twogofindz/backend/dto/request/BuyingGuideSectionRequestValidationTest.java
git add backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java \
        backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java
git commit -m "feat(buying-guides): add request/response DTOs for all new sections (compile-only, service wiring in next commit)"
```

---

### Task 6: Service, mapper, and controller wiring — validation rules, sanitization, badge inheritance, comprehensive tests

The core of the feature: transactional whole-guide save across all 6 sections, every business rule from the design doc, and the public response assembly (live comparison prices/reviews via `ProductResponse`, Top Pick badge inheritance from Quick Recommendations, resolved section visibility order).

**Files:**
- Create: `backend/src/main/java/com/twogofindz/backend/exception/InvalidBuyingGuideException.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/exception/GlobalExceptionHandler.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/mapper/BuyingGuideMapper.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/BuyingGuideServiceImpl.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java` (append new tests)
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java` (append new tests)

**Interfaces:**
- Consumes: `HtmlSanitizer.sanitize(String)` (Task 3), all Task 4 entities/enums, all Task 5 DTOs.
- Produces: fully working `POST/PUT /api/admin/buying-guides` and `GET /api/public/buying-guides/{slug}` — the complete Stage 1 deliverable. No further tasks depend on this one; Stage 2 (admin UI) and Stage 3 (public page) consume this API from here.

- [ ] **Step 1: Add the exception and handler**

`exception/InvalidBuyingGuideException.java`:
```java
package com.twogofindz.backend.exception;

public class InvalidBuyingGuideException extends RuntimeException {
    public InvalidBuyingGuideException(String message) {
        super(message);
    }
}
```

Add to `GlobalExceptionHandler.java`, next to `handleInvalidComparison`:
```java
    @ExceptionHandler(InvalidBuyingGuideException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidBuyingGuide(InvalidBuyingGuideException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.failure(ex.getMessage()));
    }
```

- [ ] **Step 2: Write the failing tests (append to `AdminBuyingGuideControllerTest.java`)**

Add these test methods and this one shared helper to the class body (before the closing brace, after the existing `createProductId` helper):

```java
    @Test
    void create_withAllSections_succeeds() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Full Guide Category");
        Long productCategoryId = createCategoryId(token, "Full Guide Product Category");
        Long topPickProductId = createProductId(token, productCategoryId, "Full Guide Top Pick Product");
        Long runnerUpProductId = createProductId(token, productCategoryId, "Full Guide Runner Up Product");

        String requestJson = """
                {
                  "title": "Full Section Guide", "slug": "full-section-guide",
                  "excerpt": "Excerpt", "introduction": "<p>Introduction</p>",
                  "coverImageFilename": null, "categoryId": %d,
                  "seoTitle": null, "seoDescription": null, "active": true, "scheduledPublishAt": null,
                  "recommendedProductIds": [%d, %d],
                  "quickRecommendations": [
                    {"productId": %d, "badgeName": "Best Overall"}
                  ],
                  "comparisonSpecs": [
                    {"specificationName": "Battery Life", "values": [
                      {"productId": %d, "value": "40 Hrs"},
                      {"productId": %d, "value": "30 Hrs"}
                    ]}
                  ],
                  "recommendationSections": [
                    {"productId": %d, "recommendationType": "TOP_PICK", "sectionLabel": "Our Top Pick",
                     "whyRecommended": "<p>Great value.</p>",
                     "pros": [{"content": "Great sound"}], "cons": [{"content": "Pricey"}],
                     "bestFor": [{"content": "Daily commuters"}]},
                    {"productId": %d, "recommendationType": "RUNNER_UP", "sectionLabel": "Best Budget",
                     "whyRecommended": "<p>Solid value.</p>",
                     "pros": [{"content": "Affordable"}], "cons": [{"content": "Fewer features"}],
                     "bestFor": [{"content": "Budget shoppers"}]}
                  ],
                  "adviceSections": [
                    {"title": "What to Look For", "content": "<p>Look for battery life.</p>"}
                  ],
                  "faqs": [
                    {"question": "Is it worth it?", "answer": "<p>Yes.</p>"}
                  ],
                  "sectionSettings": [
                    {"sectionKey": "FAQS", "visible": true}
                  ]
                }
                """.formatted(guideCategoryId, topPickProductId, runnerUpProductId, topPickProductId,
                topPickProductId, runnerUpProductId, topPickProductId, runnerUpProductId);

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.quickRecommendations[0].badgeName").value("Best Overall"))
                .andExpect(jsonPath("$.data.comparisonSpecs[0].specificationName").value("Battery Life"))
                .andExpect(jsonPath("$.data.comparisonSpecs[0].values", org.hamcrest.Matchers.hasSize(2)))
                .andExpect(jsonPath("$.data.recommendationSections[0].recommendationType").value("TOP_PICK"))
                .andExpect(jsonPath("$.data.recommendationSections[0].pros[0].content").value("Great sound"))
                .andExpect(jsonPath("$.data.recommendationSections[0].cons[0].content").value("Pricey"))
                .andExpect(jsonPath("$.data.recommendationSections[0].bestFor[0].content").value("Daily commuters"))
                .andExpect(jsonPath("$.data.adviceSections[0].title").value("What to Look For"))
                .andExpect(jsonPath("$.data.faqs[0].question").value("Is it worth it?"))
                .andExpect(jsonPath("$.data.sectionSettings[0].sectionKey").value("FAQS"));
    }

    @Test
    void create_returns400_whenDuplicateProductInList() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Dup Product Guide Category");
        Long productCategoryId = createCategoryId(token, "Dup Product Category");
        Long productId = createProductId(token, productCategoryId, "Dup Product");

        BuyingGuideRequest request = new BuyingGuideRequest(
                "Dup Product Guide", "dup-product-guide", "Excerpt", "Introduction", null,
                guideCategoryId, null, null, true, null, List.of(productId, productId),
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of());

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns400_whenQuickRecommendationReferencesProductNotInGuide() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Orphan Quick Rec Guide Category");
        Long productCategoryId = createCategoryId(token, "Orphan Quick Rec Product Category");
        Long includedProductId = createProductId(token, productCategoryId, "Included Product");
        Long excludedProductId = createProductId(token, productCategoryId, "Excluded Product");

        String requestJson = """
                {
                  "title": "Orphan Quick Rec Guide", "slug": "orphan-quick-rec-guide",
                  "excerpt": "Excerpt", "introduction": "Introduction", "coverImageFilename": null,
                  "categoryId": %d, "seoTitle": null, "seoDescription": null, "active": true,
                  "scheduledPublishAt": null, "recommendedProductIds": [%d],
                  "quickRecommendations": [{"productId": %d, "badgeName": "Best Overall"}],
                  "comparisonSpecs": [], "recommendationSections": [], "adviceSections": [],
                  "faqs": [], "sectionSettings": []
                }
                """.formatted(guideCategoryId, includedProductId, excludedProductId);

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns400_whenComparisonSpecMissingValueForAProduct() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Missing Spec Value Guide Category");
        Long productCategoryId = createCategoryId(token, "Missing Spec Value Product Category");
        Long firstProductId = createProductId(token, productCategoryId, "Missing Spec Value Product A");
        Long secondProductId = createProductId(token, productCategoryId, "Missing Spec Value Product B");

        String requestJson = """
                {
                  "title": "Missing Spec Value Guide", "slug": "missing-spec-value-guide",
                  "excerpt": "Excerpt", "introduction": "Introduction", "coverImageFilename": null,
                  "categoryId": %d, "seoTitle": null, "seoDescription": null, "active": true,
                  "scheduledPublishAt": null, "recommendedProductIds": [%d, %d],
                  "quickRecommendations": [],
                  "comparisonSpecs": [
                    {"specificationName": "Battery Life", "values": [{"productId": %d, "value": "40 Hrs"}]}
                  ],
                  "recommendationSections": [], "adviceSections": [], "faqs": [], "sectionSettings": []
                }
                """.formatted(guideCategoryId, firstProductId, secondProductId, firstProductId);

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns400_whenMoreThanOneTopPick() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Two Top Picks Guide Category");
        Long productCategoryId = createCategoryId(token, "Two Top Picks Product Category");
        Long firstProductId = createProductId(token, productCategoryId, "Two Top Picks Product A");
        Long secondProductId = createProductId(token, productCategoryId, "Two Top Picks Product B");

        String requestJson = """
                {
                  "title": "Two Top Picks Guide", "slug": "two-top-picks-guide",
                  "excerpt": "Excerpt", "introduction": "Introduction", "coverImageFilename": null,
                  "categoryId": %d, "seoTitle": null, "seoDescription": null, "active": true,
                  "scheduledPublishAt": null, "recommendedProductIds": [%d, %d],
                  "quickRecommendations": [], "comparisonSpecs": [],
                  "recommendationSections": [
                    {"productId": %d, "recommendationType": "TOP_PICK", "sectionLabel": "Top Pick One",
                     "whyRecommended": "Great.", "pros": [{"content": "Good"}],
                     "cons": [{"content": "Bad"}], "bestFor": [{"content": "Everyone"}]},
                    {"productId": %d, "recommendationType": "TOP_PICK", "sectionLabel": "Top Pick Two",
                     "whyRecommended": "Also great.", "pros": [{"content": "Good"}],
                     "cons": [{"content": "Bad"}], "bestFor": [{"content": "Everyone"}]}
                  ],
                  "adviceSections": [], "faqs": [], "sectionSettings": []
                }
                """.formatted(guideCategoryId, firstProductId, secondProductId, firstProductId, secondProductId);

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    void delete_cascadesChildSections_butNeverDeletesProducts() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Cascade Delete Guide Category");
        Long productCategoryId = createCategoryId(token, "Cascade Delete Product Category");
        Long productId = createProductId(token, productCategoryId, "Cascade Delete Product");

        String requestJson = """
                {
                  "title": "Cascade Delete Guide", "slug": "cascade-delete-guide",
                  "excerpt": "Excerpt", "introduction": "Introduction", "coverImageFilename": null,
                  "categoryId": %d, "seoTitle": null, "seoDescription": null, "active": true,
                  "scheduledPublishAt": null, "recommendedProductIds": [%d],
                  "quickRecommendations": [{"productId": %d, "badgeName": "Best Overall"}],
                  "comparisonSpecs": [], "recommendationSections": [], "adviceSections": [],
                  "faqs": [{"question": "Q?", "answer": "A."}], "sectionSettings": []
                }
                """.formatted(guideCategoryId, productId, productId);

        var createResult = mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(requestJson))
                .andReturn();
        Long guideId = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(delete("/api/admin/buying-guides/{id}", guideId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/products/{id}", productId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(productId));
    }
```

Add the import `org.hamcrest.Matchers` is referenced fully-qualified inline above, so no new import line is strictly required, but you may add `import static org.hamcrest.Matchers.hasSize;` and simplify those call sites if preferred — either form compiles.

Append to `PublicBuyingGuideControllerTest.java` (before the closing brace, after the existing `createProductId` helper):

```java
    @Test
    void getBySlug_returnsFullNestedStructure_withInheritedTopPickBadge() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Public Full Guide Category");
        Long productCategoryId = createCategoryId(token, "Public Full Guide Product Category");
        Long topPickProductId = createProductId(token, productCategoryId, "Public Full Guide Top Pick Product");

        String requestJson = """
                {
                  "title": "Public Full Guide", "slug": "public-full-guide",
                  "excerpt": "Excerpt", "introduction": "<p>Introduction</p>", "coverImageFilename": null,
                  "categoryId": %d, "seoTitle": null, "seoDescription": null, "active": true,
                  "scheduledPublishAt": null, "recommendedProductIds": [%d],
                  "quickRecommendations": [{"productId": %d, "badgeName": "Best Overall"}],
                  "comparisonSpecs": [
                    {"specificationName": "Battery Life", "values": [{"productId": %d, "value": "40 Hrs"}]}
                  ],
                  "recommendationSections": [
                    {"productId": %d, "recommendationType": "TOP_PICK", "sectionLabel": "Our Top Pick",
                     "whyRecommended": "<p>Great value.</p>", "pros": [{"content": "Great sound"}],
                     "cons": [{"content": "Pricey"}], "bestFor": [{"content": "Daily commuters"}]}
                  ],
                  "adviceSections": [{"title": "What to Look For", "content": "<p>Look for battery life.</p>"}],
                  "faqs": [{"question": "Is it worth it?", "answer": "<p>Yes.</p>"}],
                  "sectionSettings": []
                }
                """.formatted(guideCategoryId, topPickProductId, topPickProductId, topPickProductId, topPickProductId);

        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(requestJson));

        mockMvc.perform(get("/api/public/buying-guides/{slug}", "public-full-guide"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.quickRecommendations[0].badgeName").value("Best Overall"))
                .andExpect(jsonPath("$.data.comparisonTable.specificationNames[0]").value("Battery Life"))
                .andExpect(jsonPath("$.data.topPick.sectionLabel").value("Our Top Pick"))
                .andExpect(jsonPath("$.data.topPick.badgeName").value("Best Overall"))
                .andExpect(jsonPath("$.data.topPick.pros[0]").value("Great sound"))
                .andExpect(jsonPath("$.data.adviceSections[0].title").value("What to Look For"))
                .andExpect(jsonPath("$.data.faqs[0].question").value("Is it worth it?"))
                .andExpect(jsonPath("$.data.visibleSectionOrder", org.hamcrest.Matchers.hasItem("TOP_PICK")));
    }
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && ./mvnw test -Dtest=AdminBuyingGuideControllerTest,PublicBuyingGuideControllerTest -q`
Expected: FAIL — `BuyingGuideServiceImpl`/`BuyingGuideMapper` don't build or read the 6 new sections yet (this is the expected failure carried over from the end of Task 5).

- [ ] **Step 4: Implement the full `BuyingGuideServiceImpl`**

Replace the file entirely:

```java
package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.BuyingGuideAdviceSectionRequest;
import com.twogofindz.backend.dto.request.BuyingGuideComparisonSpecRequest;
import com.twogofindz.backend.dto.request.BuyingGuideComparisonValueRequest;
import com.twogofindz.backend.dto.request.BuyingGuideFaqRequest;
import com.twogofindz.backend.dto.request.BuyingGuideQuickRecommendationRequest;
import com.twogofindz.backend.dto.request.BuyingGuideRecommendationItemRequest;
import com.twogofindz.backend.dto.request.BuyingGuideRecommendationSectionRequest;
import com.twogofindz.backend.dto.request.BuyingGuideRequest;
import com.twogofindz.backend.dto.request.BuyingGuideSectionSettingRequest;
import com.twogofindz.backend.dto.response.BuyingGuideResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideDetailResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideSummaryResponse;
import com.twogofindz.backend.entity.BuyingGuide;
import com.twogofindz.backend.entity.BuyingGuideAdviceSection;
import com.twogofindz.backend.entity.BuyingGuideComparisonSpec;
import com.twogofindz.backend.entity.BuyingGuideComparisonValue;
import com.twogofindz.backend.entity.BuyingGuideFaq;
import com.twogofindz.backend.entity.BuyingGuideQuickRecommendation;
import com.twogofindz.backend.entity.BuyingGuideRecommendationItem;
import com.twogofindz.backend.entity.BuyingGuideRecommendationSection;
import com.twogofindz.backend.entity.BuyingGuideSectionSetting;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.entity.ProductCategory;
import com.twogofindz.backend.entity.RecommendationItemType;
import com.twogofindz.backend.entity.RecommendationType;
import com.twogofindz.backend.exception.DuplicateResourceException;
import com.twogofindz.backend.exception.InvalidBuyingGuideException;
import com.twogofindz.backend.exception.ResourceNotFoundException;
import com.twogofindz.backend.mapper.BuyingGuideMapper;
import com.twogofindz.backend.repository.BuyingGuideRepository;
import com.twogofindz.backend.repository.ProductCategoryRepository;
import com.twogofindz.backend.repository.ProductRepository;
import com.twogofindz.backend.service.BuyingGuideService;
import com.twogofindz.backend.util.HtmlSanitizer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class BuyingGuideServiceImpl implements BuyingGuideService {

    private final BuyingGuideRepository buyingGuideRepository;
    private final ProductRepository productRepository;
    private final ProductCategoryRepository productCategoryRepository;
    private final BuyingGuideMapper buyingGuideMapper;

    public BuyingGuideServiceImpl(BuyingGuideRepository buyingGuideRepository,
                                   ProductRepository productRepository,
                                   ProductCategoryRepository productCategoryRepository,
                                   BuyingGuideMapper buyingGuideMapper) {
        this.buyingGuideRepository = buyingGuideRepository;
        this.productRepository = productRepository;
        this.productCategoryRepository = productCategoryRepository;
        this.buyingGuideMapper = buyingGuideMapper;
    }

    @Override
    @Transactional
    public BuyingGuideResponse create(BuyingGuideRequest request) {
        validateRequest(request);
        ProductCategory category = findCategory(request.categoryId());
        String slug = resolveSlug(request.slug(), request.title(), null);

        BuyingGuide guide = BuyingGuide.builder()
                .title(request.title())
                .slug(slug)
                .excerpt(request.excerpt())
                .introduction(HtmlSanitizer.sanitize(request.introduction()))
                .coverImageFilename(request.coverImageFilename())
                .category(category)
                .seoTitle(request.seoTitle())
                .seoDescription(request.seoDescription())
                .active(request.active())
                .scheduledPublishAt(request.scheduledPublishAt())
                .recommendedProducts(resolveProducts(request.recommendedProductIds()))
                .build();

        guide.setQuickRecommendations(buildQuickRecommendations(guide, request.quickRecommendations()));
        guide.setComparisonSpecs(buildComparisonSpecs(guide, request.comparisonSpecs()));
        guide.setRecommendationSections(buildRecommendationSections(guide, request.recommendationSections()));
        guide.setAdviceSections(buildAdviceSections(guide, request.adviceSections()));
        guide.setFaqs(buildFaqs(guide, request.faqs()));
        guide.setSectionSettings(buildSectionSettings(guide, request.sectionSettings()));

        return buyingGuideMapper.toResponse(buyingGuideRepository.save(guide));
    }

    @Override
    @Transactional
    public BuyingGuideResponse update(Long id, BuyingGuideRequest request) {
        validateRequest(request);
        BuyingGuide guide = findEntityById(id);
        ProductCategory category = findCategory(request.categoryId());
        String slug = resolveSlug(request.slug(), request.title(), id);

        guide.setTitle(request.title());
        guide.setSlug(slug);
        guide.setExcerpt(request.excerpt());
        guide.setIntroduction(HtmlSanitizer.sanitize(request.introduction()));
        guide.setCoverImageFilename(request.coverImageFilename());
        guide.setCategory(category);
        guide.setSeoTitle(request.seoTitle());
        guide.setSeoDescription(request.seoDescription());
        guide.setActive(request.active());
        guide.setScheduledPublishAt(request.scheduledPublishAt());
        guide.setRecommendedProducts(resolveProducts(request.recommendedProductIds()));

        // These six are owned @OneToMany(cascade=ALL, orphanRemoval=true) children: Hibernate
        // rejects reassigning their collection reference on an already-managed entity, so the
        // replacement must mutate the existing collection in place (same reasoning documented on
        // Comparison's update()).
        guide.getQuickRecommendations().clear();
        guide.getQuickRecommendations().addAll(buildQuickRecommendations(guide, request.quickRecommendations()));
        guide.getComparisonSpecs().clear();
        guide.getComparisonSpecs().addAll(buildComparisonSpecs(guide, request.comparisonSpecs()));
        guide.getRecommendationSections().clear();
        guide.getRecommendationSections().addAll(buildRecommendationSections(guide, request.recommendationSections()));
        guide.getAdviceSections().clear();
        guide.getAdviceSections().addAll(buildAdviceSections(guide, request.adviceSections()));
        guide.getFaqs().clear();
        guide.getFaqs().addAll(buildFaqs(guide, request.faqs()));
        guide.getSectionSettings().clear();
        guide.getSectionSettings().addAll(buildSectionSettings(guide, request.sectionSettings()));

        return buyingGuideMapper.toResponse(buyingGuideRepository.save(guide));
    }

    @Override
    @Transactional(readOnly = true)
    public BuyingGuideResponse getByIdForAdmin(Long id) {
        return buyingGuideMapper.toResponse(findEntityById(id));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        buyingGuideRepository.delete(findEntityById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<BuyingGuideResponse> getAllForAdmin() {
        return buyingGuideRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(buyingGuideMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PublicBuyingGuideSummaryResponse> getAllForPublic() {
        return buyingGuideRepository.findByActiveTrueOrderByCreatedAtDesc().stream()
                .map(buyingGuideMapper::toPublicSummary)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PublicBuyingGuideDetailResponse getBySlugForPublic(String slug) {
        BuyingGuide guide = buyingGuideRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Buying guide not found with slug: " + slug));
        // Deliberately identical to the "not found" outcome above: a draft guide must not
        // be distinguishable from a nonexistent one via the public API (no information leak).
        if (!guide.getActive()) {
            throw new ResourceNotFoundException("Buying guide not found with slug: " + slug);
        }
        return buyingGuideMapper.toPublicDetail(guide);
    }

    /**
     * Every cross-entity rule from the design doc in one place: no duplicate products, every
     * child-section product reference must belong to the guide's own product list (this is also
     * what rejects "remove a product that's still referenced elsewhere" rather than silently
     * cascading), every comparison spec must cover the guide's product set exactly, and at most
     * one Top Pick (backstopped at the DB level by the generated-column unique index on
     * buying_guide_recommendation_sections).
     */
    private void validateRequest(BuyingGuideRequest request) {
        Set<Long> productIds = new LinkedHashSet<>(request.recommendedProductIds());
        if (productIds.size() != request.recommendedProductIds().size()) {
            throw new InvalidBuyingGuideException("A product cannot be added to this guide more than once.");
        }

        for (BuyingGuideQuickRecommendationRequest quickRec : request.quickRecommendations()) {
            if (!productIds.contains(quickRec.productId())) {
                throw new InvalidBuyingGuideException(
                        "Quick recommendation references a product that is not included in this guide.");
            }
        }

        for (BuyingGuideComparisonSpecRequest spec : request.comparisonSpecs()) {
            Set<Long> valueProductIds = spec.values().stream()
                    .map(BuyingGuideComparisonValueRequest::productId)
                    .collect(Collectors.toSet());
            if (valueProductIds.size() != spec.values().size() || !valueProductIds.equals(productIds)) {
                throw new InvalidBuyingGuideException(
                        "Comparison specification \"" + spec.specificationName()
                                + "\" must have exactly one value for every product in this guide.");
            }
        }

        int topPickCount = 0;
        for (BuyingGuideRecommendationSectionRequest section : request.recommendationSections()) {
            if (!productIds.contains(section.productId())) {
                throw new InvalidBuyingGuideException(
                        "Recommendation section \"" + section.sectionLabel()
                                + "\" references a product that is not included in this guide.");
            }
            if (section.recommendationType() == RecommendationType.TOP_PICK) {
                topPickCount++;
            }
        }
        if (topPickCount > 1) {
            throw new InvalidBuyingGuideException("A buying guide can have at most one Top Pick.");
        }
    }

    private List<BuyingGuideQuickRecommendation> buildQuickRecommendations(
            BuyingGuide guide, List<BuyingGuideQuickRecommendationRequest> requests) {
        List<BuyingGuideQuickRecommendation> result = new ArrayList<>();
        for (BuyingGuideQuickRecommendationRequest req : requests) {
            result.add(BuyingGuideQuickRecommendation.builder()
                    .buyingGuide(guide).product(findProduct(req.productId())).badgeName(req.badgeName()).build());
        }
        return result;
    }

    private List<BuyingGuideComparisonSpec> buildComparisonSpecs(
            BuyingGuide guide, List<BuyingGuideComparisonSpecRequest> requests) {
        List<BuyingGuideComparisonSpec> result = new ArrayList<>();
        for (BuyingGuideComparisonSpecRequest req : requests) {
            BuyingGuideComparisonSpec spec = BuyingGuideComparisonSpec.builder()
                    .buyingGuide(guide).specificationName(req.specificationName()).build();
            List<BuyingGuideComparisonValue> values = new ArrayList<>();
            for (BuyingGuideComparisonValueRequest valueReq : req.values()) {
                values.add(BuyingGuideComparisonValue.builder()
                        .comparisonSpec(spec).product(findProduct(valueReq.productId()))
                        .specificationValue(valueReq.value()).build());
            }
            spec.setValues(values);
            result.add(spec);
        }
        return result;
    }

    /**
     * Pros, Cons, and Best For all live in one physical table ({@code items}), discriminated by
     * {@code itemType}, ordered by a single shared {@code @OrderColumn}. Concatenating the three
     * request lists in this fixed order (pros, then cons, then best-for) means each group's
     * relative order survives being filtered back out by type later in the mapper — no separate
     * JPA collection per item type is needed.
     */
    private List<BuyingGuideRecommendationSection> buildRecommendationSections(
            BuyingGuide guide, List<BuyingGuideRecommendationSectionRequest> requests) {
        List<BuyingGuideRecommendationSection> result = new ArrayList<>();
        for (BuyingGuideRecommendationSectionRequest req : requests) {
            BuyingGuideRecommendationSection section = BuyingGuideRecommendationSection.builder()
                    .buyingGuide(guide).product(findProduct(req.productId()))
                    .recommendationType(req.recommendationType())
                    .sectionLabel(req.sectionLabel())
                    .whyRecommended(HtmlSanitizer.sanitize(req.whyRecommended()))
                    .build();

            List<BuyingGuideRecommendationItem> items = new ArrayList<>();
            addItems(section, items, req.pros(), RecommendationItemType.PRO);
            addItems(section, items, req.cons(), RecommendationItemType.CON);
            addItems(section, items, req.bestFor(), RecommendationItemType.BEST_FOR);
            section.setItems(items);

            result.add(section);
        }
        return result;
    }

    private void addItems(BuyingGuideRecommendationSection section, List<BuyingGuideRecommendationItem> items,
                           List<BuyingGuideRecommendationItemRequest> requests, RecommendationItemType type) {
        for (BuyingGuideRecommendationItemRequest req : requests) {
            items.add(BuyingGuideRecommendationItem.builder()
                    .recommendationSection(section).itemType(type).content(req.content()).build());
        }
    }

    private List<BuyingGuideAdviceSection> buildAdviceSections(
            BuyingGuide guide, List<BuyingGuideAdviceSectionRequest> requests) {
        List<BuyingGuideAdviceSection> result = new ArrayList<>();
        for (BuyingGuideAdviceSectionRequest req : requests) {
            result.add(BuyingGuideAdviceSection.builder()
                    .buyingGuide(guide).title(req.title())
                    .content(HtmlSanitizer.sanitize(req.content())).build());
        }
        return result;
    }

    private List<BuyingGuideFaq> buildFaqs(BuyingGuide guide, List<BuyingGuideFaqRequest> requests) {
        List<BuyingGuideFaq> result = new ArrayList<>();
        for (BuyingGuideFaqRequest req : requests) {
            result.add(BuyingGuideFaq.builder()
                    .buyingGuide(guide).question(req.question())
                    .answer(HtmlSanitizer.sanitize(req.answer())).build());
        }
        return result;
    }

    private List<BuyingGuideSectionSetting> buildSectionSettings(
            BuyingGuide guide, List<BuyingGuideSectionSettingRequest> requests) {
        List<BuyingGuideSectionSetting> result = new ArrayList<>();
        for (BuyingGuideSectionSettingRequest req : requests) {
            result.add(BuyingGuideSectionSetting.builder()
                    .buyingGuide(guide).sectionKey(req.sectionKey()).visible(req.visible()).build());
        }
        return result;
    }

    private String resolveSlug(String requestedSlug, String title, Long excludeId) {
        String slug = (requestedSlug == null || requestedSlug.isBlank()) ? slugify(title) : requestedSlug;
        boolean taken = excludeId == null
                ? buyingGuideRepository.existsBySlug(slug)
                : buyingGuideRepository.existsBySlugAndIdNot(slug, excludeId);
        if (taken) {
            throw new DuplicateResourceException("A buying guide with slug \"" + slug + "\" already exists.");
        }
        return slug;
    }

    private String slugify(String title) {
        String base = title.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return base.isBlank() ? "buying-guide" : base;
    }

    private ProductCategory findCategory(Long categoryId) {
        return productCategoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + categoryId));
    }

    private Product findProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
    }

    private List<Product> resolveProducts(List<Long> ids) {
        // Must be a mutable list: Hibernate clears and repopulates this collection in place
        // when merging an @OrderColumn @ManyToMany association, and an immutable list (as
        // List.of()/Stream.toList() would produce) throws UnsupportedOperationException there.
        List<Product> ordered = new ArrayList<>();
        if (ids.isEmpty()) {
            return ordered;
        }
        List<Product> found = productRepository.findAllById(ids);
        for (Long id : ids) {
            found.stream().filter(product -> product.getId().equals(id)).findFirst().ifPresent(ordered::add);
        }
        return ordered;
    }

    private BuyingGuide findEntityById(Long id) {
        return buyingGuideRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Buying guide not found with id: " + id));
    }
}
```

- [ ] **Step 5: Implement the full `BuyingGuideMapper`**

Replace the file entirely:

```java
package com.twogofindz.backend.mapper;

import com.twogofindz.backend.dto.response.BuyingGuideAdviceSectionResponse;
import com.twogofindz.backend.dto.response.BuyingGuideComparisonSpecResponse;
import com.twogofindz.backend.dto.response.BuyingGuideComparisonValueResponse;
import com.twogofindz.backend.dto.response.BuyingGuideFaqResponse;
import com.twogofindz.backend.dto.response.BuyingGuideQuickRecommendationResponse;
import com.twogofindz.backend.dto.response.BuyingGuideRecommendationItemResponse;
import com.twogofindz.backend.dto.response.BuyingGuideRecommendationSectionResponse;
import com.twogofindz.backend.dto.response.BuyingGuideResponse;
import com.twogofindz.backend.dto.response.BuyingGuideSectionSettingResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideAdviceSectionResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideComparisonRowResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideComparisonTableResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideDetailResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideFaqResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideQuickRecommendationResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideRecommendationSectionResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideSummaryResponse;
import com.twogofindz.backend.entity.BuyingGuide;
import com.twogofindz.backend.entity.BuyingGuideAdviceSection;
import com.twogofindz.backend.entity.BuyingGuideComparisonSpec;
import com.twogofindz.backend.entity.BuyingGuideComparisonValue;
import com.twogofindz.backend.entity.BuyingGuideFaq;
import com.twogofindz.backend.entity.BuyingGuideQuickRecommendation;
import com.twogofindz.backend.entity.BuyingGuideRecommendationSection;
import com.twogofindz.backend.entity.BuyingGuideSectionKey;
import com.twogofindz.backend.entity.BuyingGuideSectionSetting;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.entity.RecommendationItemType;
import com.twogofindz.backend.entity.RecommendationType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class BuyingGuideMapper {

    private static final List<BuyingGuideSectionKey> DEFAULT_SECTION_ORDER = List.of(
            BuyingGuideSectionKey.QUICK_RECOMMENDATIONS, BuyingGuideSectionKey.COMPARISON_TABLE,
            BuyingGuideSectionKey.TOP_PICK, BuyingGuideSectionKey.RUNNER_UPS,
            BuyingGuideSectionKey.BUYING_ADVICE, BuyingGuideSectionKey.FAQS);

    private final ProductMapper productMapper;

    public BuyingGuideMapper(ProductMapper productMapper) {
        this.productMapper = productMapper;
    }

    public BuyingGuideResponse toResponse(BuyingGuide guide) {
        return new BuyingGuideResponse(
                guide.getId(),
                guide.getTitle(),
                guide.getSlug(),
                guide.getExcerpt(),
                guide.getIntroduction(),
                guide.getCoverImageFilename(),
                guide.getCategory() != null ? guide.getCategory().getId() : null,
                guide.getCategory() != null ? guide.getCategory().getProductCategoryName() : null,
                guide.getSeoTitle(),
                guide.getSeoDescription(),
                guide.getActive(),
                guide.getScheduledPublishAt(),
                guide.getRecommendedProducts().stream().map(productMapper::toResponse).toList(),
                guide.getQuickRecommendations().stream().map(this::toQuickRecommendationResponse).toList(),
                guide.getComparisonSpecs().stream().map(this::toComparisonSpecResponse).toList(),
                guide.getRecommendationSections().stream().map(this::toRecommendationSectionResponse).toList(),
                guide.getAdviceSections().stream().map(this::toAdviceSectionResponse).toList(),
                guide.getFaqs().stream().map(this::toFaqResponse).toList(),
                guide.getSectionSettings().stream().map(this::toSectionSettingResponse).toList(),
                guide.getCreatedAt(),
                guide.getUpdatedAt()
        );
    }

    public PublicBuyingGuideSummaryResponse toPublicSummary(BuyingGuide guide) {
        return new PublicBuyingGuideSummaryResponse(
                guide.getId(),
                guide.getTitle(),
                guide.getSlug(),
                guide.getExcerpt(),
                guide.getCoverImageFilename(),
                guide.getCreatedAt()
        );
    }

    public PublicBuyingGuideDetailResponse toPublicDetail(BuyingGuide guide) {
        BuyingGuideRecommendationSection topPickEntity = guide.getRecommendationSections().stream()
                .filter(section -> section.getRecommendationType() == RecommendationType.TOP_PICK)
                .findFirst().orElse(null);
        List<PublicBuyingGuideRecommendationSectionResponse> runnerUps = guide.getRecommendationSections().stream()
                .filter(section -> section.getRecommendationType() == RecommendationType.RUNNER_UP)
                .map(section -> toPublicRecommendationSection(guide, section))
                .toList();

        return new PublicBuyingGuideDetailResponse(
                guide.getId(),
                guide.getTitle(),
                guide.getSlug(),
                guide.getExcerpt(),
                guide.getIntroduction(),
                guide.getCoverImageFilename(),
                guide.getCategory() != null ? guide.getCategory().getProductCategoryName() : null,
                guide.getSeoTitle(),
                guide.getSeoDescription(),
                guide.getCreatedAt(),
                guide.getRecommendedProducts().stream().map(productMapper::toResponse).toList(),
                guide.getQuickRecommendations().stream()
                        .map(rec -> new PublicBuyingGuideQuickRecommendationResponse(
                                productMapper.toResponse(rec.getProduct()), rec.getBadgeName()))
                        .toList(),
                toComparisonTable(guide),
                topPickEntity != null ? toPublicRecommendationSection(guide, topPickEntity) : null,
                runnerUps,
                guide.getAdviceSections().stream()
                        .map(section -> new PublicBuyingGuideAdviceSectionResponse(section.getTitle(), section.getContent()))
                        .toList(),
                guide.getFaqs().stream()
                        .map(faq -> new PublicBuyingGuideFaqResponse(faq.getQuestion(), faq.getAnswer()))
                        .toList(),
                resolveVisibleSectionOrder(guide)
        );
    }

    private BuyingGuideQuickRecommendationResponse toQuickRecommendationResponse(BuyingGuideQuickRecommendation rec) {
        return new BuyingGuideQuickRecommendationResponse(
                rec.getId(), productMapper.toResponse(rec.getProduct()), rec.getBadgeName());
    }

    private BuyingGuideComparisonSpecResponse toComparisonSpecResponse(BuyingGuideComparisonSpec spec) {
        return new BuyingGuideComparisonSpecResponse(
                spec.getId(), spec.getSpecificationName(),
                spec.getValues().stream().map(this::toComparisonValueResponse).toList());
    }

    private BuyingGuideComparisonValueResponse toComparisonValueResponse(BuyingGuideComparisonValue value) {
        return new BuyingGuideComparisonValueResponse(
                value.getId(), productMapper.toResponse(value.getProduct()), value.getSpecificationValue());
    }

    private BuyingGuideRecommendationSectionResponse toRecommendationSectionResponse(
            BuyingGuideRecommendationSection section) {
        return new BuyingGuideRecommendationSectionResponse(
                section.getId(),
                productMapper.toResponse(section.getProduct()),
                section.getRecommendationType(),
                section.getSectionLabel(),
                section.getWhyRecommended(),
                itemResponsesByType(section, RecommendationItemType.PRO),
                itemResponsesByType(section, RecommendationItemType.CON),
                itemResponsesByType(section, RecommendationItemType.BEST_FOR)
        );
    }

    private List<BuyingGuideRecommendationItemResponse> itemResponsesByType(
            BuyingGuideRecommendationSection section, RecommendationItemType type) {
        return section.getItems().stream()
                .filter(item -> item.getItemType() == type)
                .map(item -> new BuyingGuideRecommendationItemResponse(item.getId(), item.getContent()))
                .toList();
    }

    private BuyingGuideAdviceSectionResponse toAdviceSectionResponse(BuyingGuideAdviceSection section) {
        return new BuyingGuideAdviceSectionResponse(section.getId(), section.getTitle(), section.getContent());
    }

    private BuyingGuideFaqResponse toFaqResponse(BuyingGuideFaq faq) {
        return new BuyingGuideFaqResponse(faq.getId(), faq.getQuestion(), faq.getAnswer());
    }

    private BuyingGuideSectionSettingResponse toSectionSettingResponse(BuyingGuideSectionSetting setting) {
        return new BuyingGuideSectionSettingResponse(setting.getSectionKey(), setting.isVisible());
    }

    private PublicBuyingGuideComparisonTableResponse toComparisonTable(BuyingGuide guide) {
        List<BuyingGuideComparisonSpec> specs = guide.getComparisonSpecs();
        if (specs.isEmpty()) {
            return null;
        }
        List<String> specNames = specs.stream().map(BuyingGuideComparisonSpec::getSpecificationName).toList();
        List<PublicBuyingGuideComparisonRowResponse> rows = new ArrayList<>();
        for (Product product : guide.getRecommendedProducts()) {
            List<String> values = specs.stream()
                    .map(spec -> spec.getValues().stream()
                            .filter(value -> value.getProduct().getId().equals(product.getId()))
                            .findFirst()
                            .map(BuyingGuideComparisonValue::getSpecificationValue)
                            .orElse(""))
                    .toList();
            rows.add(new PublicBuyingGuideComparisonRowResponse(productMapper.toResponse(product), values));
        }
        return new PublicBuyingGuideComparisonTableResponse(specNames, rows);
    }

    /**
     * A Top Pick or Runner-Up inherits the Quick Recommendation badge for the same product, if
     * one exists in this guide — no separate badge field is stored on recommendation sections.
     */
    private String badgeNameFor(BuyingGuide guide, Long productId) {
        return guide.getQuickRecommendations().stream()
                .filter(rec -> rec.getProduct().getId().equals(productId))
                .map(BuyingGuideQuickRecommendation::getBadgeName)
                .findFirst()
                .orElse(null);
    }

    private PublicBuyingGuideRecommendationSectionResponse toPublicRecommendationSection(
            BuyingGuide guide, BuyingGuideRecommendationSection section) {
        return new PublicBuyingGuideRecommendationSectionResponse(
                productMapper.toResponse(section.getProduct()),
                section.getRecommendationType(),
                section.getSectionLabel(),
                section.getWhyRecommended(),
                itemContentsByType(section, RecommendationItemType.PRO),
                itemContentsByType(section, RecommendationItemType.CON),
                itemContentsByType(section, RecommendationItemType.BEST_FOR),
                badgeNameFor(guide, section.getProduct().getId())
        );
    }

    private List<String> itemContentsByType(BuyingGuideRecommendationSection section, RecommendationItemType type) {
        return section.getItems().stream()
                .filter(item -> item.getItemType() == type)
                .map(com.twogofindz.backend.entity.BuyingGuideRecommendationItem::getContent)
                .toList();
    }

    /**
     * Any section_key missing a row for this guide defaults to visible with the fallback
     * ordering below. A section only ever renders on the public page if it is both visible
     * here AND has actual saved content (empty comparison table/FAQ list never renders) —
     * that content check happens on the frontend (Stage 3), not here.
     */
    private List<BuyingGuideSectionKey> resolveVisibleSectionOrder(BuyingGuide guide) {
        Map<BuyingGuideSectionKey, BuyingGuideSectionSetting> settingsByKey = guide.getSectionSettings().stream()
                .collect(Collectors.toMap(BuyingGuideSectionSetting::getSectionKey, setting -> setting));

        List<BuyingGuideSectionKey> ordered = new ArrayList<>(guide.getSectionSettings().stream()
                .map(BuyingGuideSectionSetting::getSectionKey)
                .toList());
        for (BuyingGuideSectionKey key : DEFAULT_SECTION_ORDER) {
            if (!settingsByKey.containsKey(key)) {
                ordered.add(key);
            }
        }
        return ordered.stream()
                .filter(key -> !settingsByKey.containsKey(key) || settingsByKey.get(key).isVisible())
                .toList();
    }
}
```

- [ ] **Step 6: Run the buying-guide tests**

Run: `cd backend && ./mvnw test -Dtest=AdminBuyingGuideControllerTest,PublicBuyingGuideControllerTest,BuyingGuideSectionRequestValidationTest,BuyingGuideRepositoryTest,BuyingGuidePublishSchedulerTest -q`
Expected: PASS. If a `jsonPath` assertion fails on exact JSON shape, inspect the actual response body in the failure output and adjust the assertion — do not weaken the underlying validation/mapper logic to make a test pass.

- [ ] **Step 7: Run the full suite**

Run: `cd backend && ./mvnw test -q`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/exception/InvalidBuyingGuideException.java \
        backend/src/main/java/com/twogofindz/backend/exception/GlobalExceptionHandler.java \
        backend/src/main/java/com/twogofindz/backend/mapper/BuyingGuideMapper.java \
        backend/src/main/java/com/twogofindz/backend/service/impl/BuyingGuideServiceImpl.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java \
        backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java
git commit -m "feat(buying-guides): wire service, mapper, and validation for all sections (Stage 1 complete)"
```

---

## Plan Self-Review

**Spec coverage:** every requirement in `docs/superpowers/specs/2026-07-29-buying-guides-upgrade-backend-design.md` maps to a task — schema (Tasks 2, 4), Product rating/reviews (Task 1), sanitization (Task 3), all 6 sections + validation + badge inheritance + TOC resolution (Tasks 5–6), slug/scheduling (Task 2). Deferred items (SEO score, visibility tiers, In Stock/Prime badges, embeds) are explicitly excluded, not silently dropped.

**Placeholder scan:** no TBD/TODO; every step has concrete code or an exact shell command.

**Type consistency:** `BuyingGuideRequest`'s final field order (Task 6) — `title, slug, excerpt, introduction, coverImageFilename, categoryId, seoTitle, seoDescription, active, scheduledPublishAt, recommendedProductIds, quickRecommendations, comparisonSpecs, recommendationSections, adviceSections, faqs, sectionSettings` — matches every JSON test payload and every `new BuyingGuideRequest(...)` call site across Tasks 2, 5, and 6. `RecommendationItemType`/`RecommendationType`/`BuyingGuideSectionKey` enum names are used identically in entities (Task 4), DTOs (Task 5), and service/mapper (Task 6).

**Known deferred follow-up:** Stage 2 (admin authoring UI) must update the existing `BuyingGuideForm.jsx` to match this new request/response shape before anything is deployed — it currently posts the old `{title, excerpt, content, coverImageFilename, active, recommendedProducts}` shape. Confirmed acceptable since all 3 stages ship together (see Global Constraints).
