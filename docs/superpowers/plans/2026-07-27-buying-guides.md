# Buying Guides Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins author editorial buying-guide articles that recommend specific products, with a public list page and per-guide detail page, and full admin CRUD.

**Architecture:** A new `BuyingGuide` entity with an ordered `@ManyToMany` to `Product` (via `@OrderColumn`, no separate join-entity class). Backend follows the exact admin-CRUD-plus-public-read-only split already established by `Product`/`HeroBanner`. Frontend follows the exact `ProductsPage`/`ProductFormPage` admin pattern and the exact `CatalogPage`-style public page pattern, plus one new reusable `ProductPicker` component for the recommended-products multi-select/reorder UI.

**Tech Stack:** Same as every prior stage — Spring Boot/Java 21/MySQL backend; React JS/JSX, Vite, Tailwind, React Router DOM, Lucide React frontend. No new dependencies.

## Global Constraints

- Full design detail: `docs/superpowers/specs/2026-07-27-buying-guides-design.md`.
- Guide content is plain text (no rich-text editor), matching `Product.description`.
- Detail URLs use the numeric id (`/buying-guides/:id`), not slugs.
- No manual display-order field on guides themselves — newest-first, matching `Product`'s default sort (unlike `HeroBanner`'s curated `displayOrder`).
- Deleting a guide is a **hard delete** (matches `HeroBanner`, not `Product`'s soft-delete).
- A draft (`active: false`) guide must 404 on the public API exactly like an inactive product — no information leak about its existence.
- TDD throughout: write the failing test, confirm RED, implement, confirm GREEN, run the full suite, commit.
- Every new page that renders `<Navbar />` needs a `<CompareProvider>` wrapper in its test file (established in the Compare stage) — `Navbar` calls `useCompare()` unconditionally.
- Never commit `.env`.

---

### Task 1: Backend — `BuyingGuide` admin CRUD

**Files:**
- Create: `backend/src/main/resources/db/migration/V9__create_buying_guides_table.sql`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuide.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideRequest.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/mapper/BuyingGuideMapper.java`
- Create: `backend/src/main/java/com/twogofindz/backend/repository/BuyingGuideRepository.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/BuyingGuideService.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/impl/BuyingGuideServiceImpl.java`
- Create: `backend/src/main/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideController.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java`

**Interfaces:**
- Produces: `POST/PUT/GET/DELETE /api/admin/buying-guides` (protected). `BuyingGuideRequest(title, excerpt, content, coverImageFilename, active, recommendedProductIds: List<Long>)`. `BuyingGuideResponse(id, title, excerpt, content, coverImageFilename, active, recommendedProducts: List<ProductResponse>, createdAt, updatedAt)`.
- Consumed later by: Task 2 (public endpoints reuse `BuyingGuide`/`BuyingGuideMapper`/`BuyingGuideRepository`), Task 4/5 (frontend admin pages).

- [ ] **Step 1: Write the failing tests**

```java
package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.BuyingGuideRequest;
import com.twogofindz.backend.dto.request.ProductRequest;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
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
        Long categoryId = createCategoryId(token, "Guide Order Category");
        Long firstProductId = createProductId(token, categoryId, "Guide Product A");
        Long secondProductId = createProductId(token, categoryId, "Guide Product B");

        BuyingGuideRequest request = new BuyingGuideRequest(
                "Best Kitchen Gadgets 2026", "A quick roundup of our favorite kitchen gadgets.",
                "Full article content here.", null, true, List.of(secondProductId, firstProductId));

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Best Kitchen Gadgets 2026"))
                .andExpect(jsonPath("$.data.active").value(true))
                .andExpect(jsonPath("$.data.recommendedProducts[0].id").value(secondProductId))
                .andExpect(jsonPath("$.data.recommendedProducts[1].id").value(firstProductId));
    }

    @Test
    void create_returns400_whenTitleBlank() throws Exception {
        String token = adminToken();
        BuyingGuideRequest request = new BuyingGuideRequest("", "Excerpt", "Content", null, true, List.of());

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns401_withoutToken() throws Exception {
        BuyingGuideRequest request = new BuyingGuideRequest("Title", "Excerpt", "Content", null, true, List.of());

        mockMvc.perform(post("/api/admin/buying-guides")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void update_succeeds_andReordersRecommendedProducts() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Guide Update Category");
        Long firstProductId = createProductId(token, categoryId, "Guide Update Product A");
        Long secondProductId = createProductId(token, categoryId, "Guide Update Product B");

        var createResult = mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                                "Original Title", "Original excerpt", "Original content", null, true,
                                List.of(firstProductId, secondProductId)))))
                .andReturn();
        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        BuyingGuideRequest updateRequest = new BuyingGuideRequest(
                "Updated Title", "Updated excerpt", "Updated content", null, false,
                List.of(secondProductId, firstProductId));

        mockMvc.perform(put("/api/admin/buying-guides/{id}", id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Updated Title"))
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

        var createResult = mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                                "Deletable Guide", "Excerpt", "Content", null, true, List.of()))))
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
                                false, false, true))))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test -Dtest=AdminBuyingGuideControllerTest`
Expected: FAIL to compile — none of the production classes exist yet.

- [ ] **Step 3: Write the migration**

```sql
CREATE TABLE buying_guides (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    excerpt VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    cover_image_filename VARCHAR(255) NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_buying_guides_active_created (active, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE buying_guide_products (
    buying_guide_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    display_order INT NOT NULL,
    PRIMARY KEY (buying_guide_id, display_order),
    CONSTRAINT fk_buying_guide_products_guide FOREIGN KEY (buying_guide_id)
        REFERENCES buying_guides (id) ON DELETE CASCADE,
    CONSTRAINT fk_buying_guide_products_product FOREIGN KEY (product_id)
        REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_buying_guide_products_product ON buying_guide_products (product_id);
```

- [ ] **Step 4: Write the entity**

```java
package com.twogofindz.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "buying_guides")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuyingGuide {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 500)
    private String excerpt;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "cover_image_filename")
    private String coverImageFilename;

    @Column(nullable = false)
    private Boolean active;

    @ManyToMany
    @JoinTable(
            name = "buying_guide_products",
            joinColumns = @JoinColumn(name = "buying_guide_id"),
            inverseJoinColumns = @JoinColumn(name = "product_id")
    )
    @OrderColumn(name = "display_order")
    private List<Product> recommendedProducts;

    @Generated(event = {EventType.INSERT, EventType.UPDATE})
    @Column(name = "created_at", nullable = false, updatable = false, insertable = false)
    private LocalDateTime createdAt;

    @Generated(event = {EventType.INSERT, EventType.UPDATE})
    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
```

- [ ] **Step 5: Write the request/response DTOs**

```java
package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record BuyingGuideRequest(
        @NotBlank(message = "Title is required.")
        @Size(max = 200, message = "Title must be at most 200 characters.")
        String title,

        @NotBlank(message = "Excerpt is required.")
        @Size(max = 500, message = "Excerpt must be at most 500 characters.")
        String excerpt,

        @NotBlank(message = "Content is required.")
        String content,

        @Size(max = 255, message = "Cover image filename must be at most 255 characters.")
        String coverImageFilename,

        @NotNull(message = "Active flag is required.")
        Boolean active,

        @NotNull(message = "Recommended products list is required.")
        List<Long> recommendedProductIds
) {
}
```

```java
package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record BuyingGuideResponse(
        Long id,
        String title,
        String excerpt,
        String content,
        String coverImageFilename,
        Boolean active,
        List<ProductResponse> recommendedProducts,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
```

- [ ] **Step 6: Write the mapper**

```java
package com.twogofindz.backend.mapper;

import com.twogofindz.backend.dto.response.BuyingGuideResponse;
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
                guide.getExcerpt(),
                guide.getContent(),
                guide.getCoverImageFilename(),
                guide.getActive(),
                guide.getRecommendedProducts().stream().map(productMapper::toResponse).toList(),
                guide.getCreatedAt(),
                guide.getUpdatedAt()
        );
    }
}
```

- [ ] **Step 7: Write the repository**

```java
package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.BuyingGuide;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BuyingGuideRepository extends JpaRepository<BuyingGuide, Long> {
    List<BuyingGuide> findAllByOrderByCreatedAtDesc();
    List<BuyingGuide> findByActiveTrueOrderByCreatedAtDesc();
}
```

- [ ] **Step 8: Write the service**

```java
package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.request.BuyingGuideRequest;
import com.twogofindz.backend.dto.response.BuyingGuideResponse;

import java.util.List;

public interface BuyingGuideService {
    BuyingGuideResponse create(BuyingGuideRequest request);
    BuyingGuideResponse update(Long id, BuyingGuideRequest request);
    BuyingGuideResponse getByIdForAdmin(Long id);
    void delete(Long id);
    List<BuyingGuideResponse> getAllForAdmin();
}
```

```java
package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.BuyingGuideRequest;
import com.twogofindz.backend.dto.response.BuyingGuideResponse;
import com.twogofindz.backend.entity.BuyingGuide;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.exception.ResourceNotFoundException;
import com.twogofindz.backend.mapper.BuyingGuideMapper;
import com.twogofindz.backend.repository.BuyingGuideRepository;
import com.twogofindz.backend.repository.ProductRepository;
import com.twogofindz.backend.service.BuyingGuideService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BuyingGuideServiceImpl implements BuyingGuideService {

    private final BuyingGuideRepository buyingGuideRepository;
    private final ProductRepository productRepository;
    private final BuyingGuideMapper buyingGuideMapper;

    public BuyingGuideServiceImpl(BuyingGuideRepository buyingGuideRepository,
                                   ProductRepository productRepository,
                                   BuyingGuideMapper buyingGuideMapper) {
        this.buyingGuideRepository = buyingGuideRepository;
        this.productRepository = productRepository;
        this.buyingGuideMapper = buyingGuideMapper;
    }

    @Override
    @Transactional
    public BuyingGuideResponse create(BuyingGuideRequest request) {
        BuyingGuide guide = BuyingGuide.builder()
                .title(request.title())
                .excerpt(request.excerpt())
                .content(request.content())
                .coverImageFilename(request.coverImageFilename())
                .active(request.active())
                .recommendedProducts(resolveProducts(request.recommendedProductIds()))
                .build();
        return buyingGuideMapper.toResponse(buyingGuideRepository.save(guide));
    }

    @Override
    @Transactional
    public BuyingGuideResponse update(Long id, BuyingGuideRequest request) {
        BuyingGuide guide = findEntityById(id);
        guide.setTitle(request.title());
        guide.setExcerpt(request.excerpt());
        guide.setContent(request.content());
        guide.setCoverImageFilename(request.coverImageFilename());
        guide.setActive(request.active());
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

    private List<Product> resolveProducts(List<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        List<Product> found = productRepository.findAllById(ids);
        // Preserve the caller's requested order rather than whatever order the DB returns,
        // since this order becomes the guide's recommended-products display order.
        return ids.stream()
                .flatMap(id -> found.stream().filter(product -> product.getId().equals(id)))
                .toList();
    }

    private BuyingGuide findEntityById(Long id) {
        return buyingGuideRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Buying guide not found with id: " + id));
    }
}
```

- [ ] **Step 9: Write the controller**

```java
package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.dto.request.BuyingGuideRequest;
import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.BuyingGuideResponse;
import com.twogofindz.backend.service.BuyingGuideService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/buying-guides")
public class AdminBuyingGuideController {

    private final BuyingGuideService buyingGuideService;

    public AdminBuyingGuideController(BuyingGuideService buyingGuideService) {
        this.buyingGuideService = buyingGuideService;
    }

    @GetMapping
    public ApiResponse<List<BuyingGuideResponse>> getAll() {
        return ApiResponse.success("Buying guides retrieved successfully.", buyingGuideService.getAllForAdmin());
    }

    @GetMapping("/{id}")
    public ApiResponse<BuyingGuideResponse> getById(@PathVariable Long id) {
        return ApiResponse.success("Buying guide retrieved successfully.", buyingGuideService.getByIdForAdmin(id));
    }

    @PostMapping
    public ApiResponse<BuyingGuideResponse> create(@Valid @RequestBody BuyingGuideRequest request) {
        return ApiResponse.success("Buying guide created successfully.", buyingGuideService.create(request));
    }

    @PutMapping("/{id}")
    public ApiResponse<BuyingGuideResponse> update(@PathVariable Long id, @Valid @RequestBody BuyingGuideRequest request) {
        return ApiResponse.success("Buying guide updated successfully.", buyingGuideService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        buyingGuideService.delete(id);
        return ApiResponse.success("Buying guide deleted successfully.");
    }
}
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test -Dtest=AdminBuyingGuideControllerTest`
Expected: PASS (6 tests)

- [ ] **Step 11: Run the full backend suite**

Run: `cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test`
Expected: PASS — no regressions.

- [ ] **Step 12: Commit**

```bash
git add backend/src/main/resources/db/migration/V9__create_buying_guides_table.sql \
        backend/src/main/java/com/twogofindz/backend/entity/BuyingGuide.java \
        backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideRequest.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideResponse.java \
        backend/src/main/java/com/twogofindz/backend/mapper/BuyingGuideMapper.java \
        backend/src/main/java/com/twogofindz/backend/repository/BuyingGuideRepository.java \
        backend/src/main/java/com/twogofindz/backend/service/BuyingGuideService.java \
        backend/src/main/java/com/twogofindz/backend/service/impl/BuyingGuideServiceImpl.java \
        backend/src/main/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideController.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java
git commit -m "feat: add BuyingGuide entity and admin CRUD endpoints"
```

---

### Task 2: Backend — public buying-guide endpoints

**Files:**
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideSummaryResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideDetailResponse.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/mapper/BuyingGuideMapper.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/BuyingGuideService.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/BuyingGuideServiceImpl.java`
- Create: `backend/src/main/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideController.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java`

**Interfaces:**
- Consumes: `BuyingGuide`, `BuyingGuideRepository`, `BuyingGuideMapper`, `BuyingGuideServiceImpl` (Task 1).
- Produces: `GET /api/public/buying-guides` → `ApiResponse<List<PublicBuyingGuideSummaryResponse>>` (active-only, newest first). `GET /api/public/buying-guides/{id}` → `ApiResponse<PublicBuyingGuideDetailResponse>` (404 for inactive/missing). Consumed by Task 7/8 (frontend public pages).

- [ ] **Step 1: Write the failing tests**

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

        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Public Active Guide", "Excerpt", "Content", null, true, List.of()))));

        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Public Draft Guide", "Excerpt", "Content", null, false, List.of()))));

        mockMvc.perform(get("/api/public/buying-guides"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.title == 'Public Draft Guide')]").isEmpty())
                .andExpect(jsonPath("$.data[?(@.title == 'Public Active Guide')]").exists());
    }

    @Test
    void getById_returns404_forInactiveGuide() throws Exception {
        String token = adminToken();
        var createResult = mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                                "Inactive Detail Guide", "Excerpt", "Content", null, false, List.of()))))
                .andReturn();
        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(get("/api/public/buying-guides/{id}", id))
                .andExpect(status().isNotFound());
    }

    @Test
    void getById_returns404_forUnknownGuide() throws Exception {
        mockMvc.perform(get("/api/public/buying-guides/{id}", 999999L))
                .andExpect(status().isNotFound());
    }

    @Test
    void getById_returnsActiveGuide_withRecommendedProductsInOrder() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Public Guide Category");
        Long firstProductId = createProductId(token, categoryId, "Public Guide Product A");
        Long secondProductId = createProductId(token, categoryId, "Public Guide Product B");

        var createResult = mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                                "Public Detail Guide", "Excerpt", "Full content body.", null, true,
                                List.of(secondProductId, firstProductId)))))
                .andReturn();
        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        mockMvc.perform(get("/api/public/buying-guides/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Public Detail Guide"))
                .andExpect(jsonPath("$.data.content").value("Full content body."))
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
                                false, false, true))))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asLong();
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test -Dtest=PublicBuyingGuideControllerTest`
Expected: FAIL to compile — the public DTOs and controller don't exist yet.

- [ ] **Step 3: Write the public response DTOs**

```java
package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;

public record PublicBuyingGuideSummaryResponse(
        Long id,
        String title,
        String excerpt,
        String coverImageFilename,
        LocalDateTime createdAt
) {
}
```

```java
package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record PublicBuyingGuideDetailResponse(
        Long id,
        String title,
        String content,
        String coverImageFilename,
        LocalDateTime createdAt,
        List<ProductResponse> recommendedProducts
) {
}
```

- [ ] **Step 4: Add the public mapper methods**

In `BuyingGuideMapper.java`, add these two methods after `toResponse` (add the two new imports alongside the existing ones):

```java
    public PublicBuyingGuideSummaryResponse toPublicSummary(BuyingGuide guide) {
        return new PublicBuyingGuideSummaryResponse(
                guide.getId(),
                guide.getTitle(),
                guide.getExcerpt(),
                guide.getCoverImageFilename(),
                guide.getCreatedAt()
        );
    }

    public PublicBuyingGuideDetailResponse toPublicDetail(BuyingGuide guide) {
        return new PublicBuyingGuideDetailResponse(
                guide.getId(),
                guide.getTitle(),
                guide.getContent(),
                guide.getCoverImageFilename(),
                guide.getCreatedAt(),
                guide.getRecommendedProducts().stream().map(productMapper::toResponse).toList()
        );
    }
```

Add `import com.twogofindz.backend.dto.response.PublicBuyingGuideDetailResponse;` and `import com.twogofindz.backend.dto.response.PublicBuyingGuideSummaryResponse;` to the file's import list.

- [ ] **Step 5: Add the public service methods**

In `BuyingGuideService.java`, add `import com.twogofindz.backend.dto.response.PublicBuyingGuideDetailResponse;` and `import com.twogofindz.backend.dto.response.PublicBuyingGuideSummaryResponse;`, then add to the interface:

```java
    List<PublicBuyingGuideSummaryResponse> getAllForPublic();
    PublicBuyingGuideDetailResponse getByIdForPublic(Long id);
```

In `BuyingGuideServiceImpl.java`, add the same two imports, then add these methods (after `getAllForAdmin`, before `resolveProducts`):

```java
    @Override
    @Transactional(readOnly = true)
    public List<PublicBuyingGuideSummaryResponse> getAllForPublic() {
        return buyingGuideRepository.findByActiveTrueOrderByCreatedAtDesc().stream()
                .map(buyingGuideMapper::toPublicSummary)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PublicBuyingGuideDetailResponse getByIdForPublic(Long id) {
        BuyingGuide guide = findEntityById(id);
        // Deliberately identical to the "not found" outcome below: a draft guide must not
        // be distinguishable from a nonexistent one via the public API (no information leak).
        if (!guide.getActive()) {
            throw new ResourceNotFoundException("Buying guide not found with id: " + id);
        }
        return buyingGuideMapper.toPublicDetail(guide);
    }
```

- [ ] **Step 6: Write the public controller**

```java
package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideDetailResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideSummaryResponse;
import com.twogofindz.backend.service.BuyingGuideService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public/buying-guides")
public class PublicBuyingGuideController {

    private final BuyingGuideService buyingGuideService;

    public PublicBuyingGuideController(BuyingGuideService buyingGuideService) {
        this.buyingGuideService = buyingGuideService;
    }

    @GetMapping
    public ApiResponse<List<PublicBuyingGuideSummaryResponse>> getAll() {
        return ApiResponse.success("Buying guides retrieved successfully.", buyingGuideService.getAllForPublic());
    }

    @GetMapping("/{id}")
    public ApiResponse<PublicBuyingGuideDetailResponse> getById(@PathVariable Long id) {
        return ApiResponse.success("Buying guide retrieved successfully.", buyingGuideService.getByIdForPublic(id));
    }
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test -Dtest=PublicBuyingGuideControllerTest`
Expected: PASS (4 tests)

- [ ] **Step 8: Run the full backend suite**

Run: `cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test`
Expected: PASS — no regressions.

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideSummaryResponse.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideDetailResponse.java \
        backend/src/main/java/com/twogofindz/backend/mapper/BuyingGuideMapper.java \
        backend/src/main/java/com/twogofindz/backend/service/BuyingGuideService.java \
        backend/src/main/java/com/twogofindz/backend/service/impl/BuyingGuideServiceImpl.java \
        backend/src/main/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideController.java \
        backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java
git commit -m "feat: add public buying-guide list and detail endpoints"
```

---

### Task 3: Frontend — `ProductPicker` component

**Files:**
- Create: `frontend/src/components/ProductPicker.jsx`
- Test: `frontend/src/components/ProductPicker.test.jsx`

**Interfaces:**
- Consumes: `searchProducts` from the existing `frontend/src/services/adminProductService.js` (`searchProducts({ search, size }) => Promise<{ content: Product[] }>`, where `Product` has at least `{ id, name }`).
- Produces: `ProductPicker({ selectedProducts: Product[], onChange: (products: Product[]) => void })` (default export). Used by Task 5's `BuyingGuideForm`.

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ProductPicker from './ProductPicker.jsx';
import * as adminProductService from '../services/adminProductService.js';

const productA = { id: 1, name: 'Wireless Earbuds' };
const productB = { id: 2, name: 'Smart Watch' };

describe('ProductPicker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('searches and adds a product to the selection', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({ content: [productA] });
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ProductPicker selectedProducts={[]} onChange={onChange} />);

    await user.type(screen.getByLabelText('Recommended Products'), 'earbuds');
    await user.click(await screen.findByRole('button', { name: 'Wireless Earbuds' }));

    expect(onChange).toHaveBeenCalledWith([productA]);
  });

  it('does not add the same product twice', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({ content: [productA] });
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ProductPicker selectedProducts={[productA]} onChange={onChange} />);

    await user.type(screen.getByLabelText('Recommended Products'), 'earbuds');
    await user.click(await screen.findByRole('button', { name: 'Wireless Earbuds' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes a selected product', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ProductPicker selectedProducts={[productA, productB]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Remove Wireless Earbuds' }));

    expect(onChange).toHaveBeenCalledWith([productB]);
  });

  it('reorders selected products with the move up/down buttons', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ProductPicker selectedProducts={[productA, productB]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Move Smart Watch up' }));

    expect(onChange).toHaveBeenCalledWith([productB, productA]);
  });

  it('disables move-up for the first item and move-down for the last item', () => {
    render(<ProductPicker selectedProducts={[productA, productB]} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Move Wireless Earbuds up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Smart Watch down' })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- ProductPicker.test.jsx`
Expected: FAIL — `ProductPicker.jsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { searchProducts } from '../services/adminProductService.js';

function ProductPicker({ selectedProducts, onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return undefined;
    }

    let isCancelled = false;
    setIsSearching(true);
    searchProducts({ search: trimmed, size: 5 })
      .then((data) => {
        if (!isCancelled) setResults(data.content);
      })
      .catch(() => {
        if (!isCancelled) setResults([]);
      })
      .finally(() => {
        if (!isCancelled) setIsSearching(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [query]);

  function handleAdd(product) {
    if (selectedProducts.some((selected) => selected.id === product.id)) return;
    onChange([...selectedProducts, product]);
    setQuery('');
  }

  function handleRemove(id) {
    onChange(selectedProducts.filter((product) => product.id !== id));
  }

  function handleMoveUp(index) {
    if (index === 0) return;
    const next = [...selectedProducts];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function handleMoveDown(index) {
    if (index === selectedProducts.length - 1) return;
    const next = [...selectedProducts];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  return (
    <div>
      <label htmlFor="productSearch" className="mb-1 block text-sm font-medium text-slate-700">
        Recommended Products
      </label>
      <input
        id="productSearch"
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search products to add..."
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {isSearching && <p className="mt-1 text-sm text-slate-400">Searching...</p>}
      {!isSearching && results.length > 0 && (
        <ul className="mt-1 rounded-md border border-slate-200 bg-white shadow-sm">
          {results.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => handleAdd(product)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {product.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <ul className="mt-3 space-y-2">
        {selectedProducts.map((product, index) => (
          <li
            key={product.id}
            className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
          >
            <span className="text-sm text-slate-700">{product.name}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                aria-label={`Move ${product.name} up`}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleMoveDown(index)}
                disabled={index === selectedProducts.length - 1}
                aria-label={`Move ${product.name} down`}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleRemove(product.id)}
                aria-label={`Remove ${product.name}`}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
              >
                <X size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ProductPicker;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- ProductPicker.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ProductPicker.jsx frontend/src/components/ProductPicker.test.jsx
git commit -m "feat: add ProductPicker for searchable, reorderable product selection"
```

---

### Task 4: Frontend — admin `BuyingGuidesPage` (list)

**Files:**
- Create: `frontend/src/services/adminBuyingGuideService.js`
- Create: `frontend/src/pages/admin/BuyingGuidesPage.jsx`
- Test: `frontend/src/pages/admin/BuyingGuidesPage.test.jsx`

**Interfaces:**
- Produces: `getBuyingGuides()`, `getBuyingGuideById(id)`, `createBuyingGuide(payload)`, `updateBuyingGuide(id, payload)`, `deleteBuyingGuide(id)` in `adminBuyingGuideService.js` — consumed by this task and Task 5.
- Produces: `BuyingGuidesPage()` (default export, no props). Used by Task 6 (route wiring).

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BuyingGuidesPage from './BuyingGuidesPage.jsx';
import * as adminBuyingGuideService from '../../services/adminBuyingGuideService.js';

const guide = {
  id: 1,
  title: 'Best Kitchen Gadgets 2026',
  excerpt: 'A quick roundup.',
  coverImageFilename: null,
  active: true,
  createdAt: '2026-07-20T10:00:00',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <BuyingGuidesPage />
    </MemoryRouter>
  );
}

describe('BuyingGuidesPage (admin)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the list of buying guides', async () => {
    vi.spyOn(adminBuyingGuideService, 'getBuyingGuides').mockResolvedValue([guide]);
    renderPage();

    expect(await screen.findByText('Best Kitchen Gadgets 2026')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('shows an empty state when there are no guides', async () => {
    vi.spyOn(adminBuyingGuideService, 'getBuyingGuides').mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('No buying guides found')).toBeInTheDocument();
  });

  it('deletes a guide via the confirm dialog', async () => {
    vi.spyOn(adminBuyingGuideService, 'getBuyingGuides').mockResolvedValue([guide]);
    vi.spyOn(adminBuyingGuideService, 'deleteBuyingGuide').mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Best Kitchen Gadgets 2026');
    await user.click(screen.getByRole('button', { name: 'Delete Best Kitchen Gadgets 2026' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(adminBuyingGuideService.deleteBuyingGuide).toHaveBeenCalledWith(1));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- pages/admin/BuyingGuidesPage.test.jsx`
Expected: FAIL — neither `adminBuyingGuideService.js` nor `BuyingGuidesPage.jsx` exists yet.

- [ ] **Step 3: Write `adminBuyingGuideService.js`**

```js
import api from './api.js';

export async function getBuyingGuides() {
  const response = await api.get('/admin/buying-guides');
  return response.data.data;
}

export async function getBuyingGuideById(id) {
  const response = await api.get(`/admin/buying-guides/${id}`);
  return response.data.data;
}

export async function createBuyingGuide(payload) {
  const response = await api.post('/admin/buying-guides', payload);
  return response.data.data;
}

export async function updateBuyingGuide(id, payload) {
  const response = await api.put(`/admin/buying-guides/${id}`, payload);
  return response.data.data;
}

export async function deleteBuyingGuide(id) {
  await api.delete(`/admin/buying-guides/${id}`);
}
```

- [ ] **Step 4: Write `BuyingGuidesPage.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import DataTable from '../../components/DataTable.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';
import { useToast } from '../../hooks/useToast.js';
import { getBuyingGuides, deleteBuyingGuide } from '../../services/adminBuyingGuideService.js';

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function BuyingGuidesPage() {
  const { showToast } = useToast();
  const [guides, setGuides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function loadGuides() {
    setIsLoading(true);
    setError(null);
    getBuyingGuides()
      .then(setGuides)
      .catch((err) => setError(err.message ?? 'Failed to load buying guides.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadGuides();
  }, []);

  async function handleDeleteConfirm() {
    setIsDeleting(true);
    try {
      await deleteBuyingGuide(deleteTarget.id);
      showToast('Buying guide deleted successfully.');
      setDeleteTarget(null);
      loadGuides();
    } catch (err) {
      showToast(err.message ?? 'Failed to delete buying guide.', 'error');
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  const columns = [
    {
      key: 'coverImageFilename',
      label: 'Cover',
      render: (row) => {
        const url = getImageUrl(row.coverImageFilename);
        return url ? (
          <img src={url} alt={row.title} className="h-12 w-12 rounded-md object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-100">
            <BookOpen className="h-5 w-5 text-slate-300" />
          </div>
        );
      },
    },
    { key: 'title', label: 'Title' },
    {
      key: 'active',
      label: 'Status',
      render: (row) => (
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            row.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {row.active ? 'Published' : 'Draft'}
        </span>
      ),
    },
    { key: 'createdAt', label: 'Created', render: (row) => formatDate(row.createdAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <Link
            to={`/admin/buying-guides/${row.id}`}
            aria-label={`Edit ${row.title}`}
            className="inline-flex rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
          >
            <Pencil size={16} />
          </Link>
          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            aria-label={`Delete ${row.title}`}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Buying Guides</h1>
        <Link
          to="/admin/buying-guides/new"
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} />
          Add Guide
        </Link>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={loadGuides} />
      ) : (
        <DataTable
          columns={columns}
          rows={guides}
          isLoading={isLoading}
          emptyState={
            <EmptyState title="No buying guides found" description="Add your first buying guide to get started." />
          }
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete Buying Guide"
        message={deleteTarget ? `This will permanently delete "${deleteTarget.title}".` : ''}
        confirmLabel="Delete"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default BuyingGuidesPage;
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd frontend && npm test -- pages/admin/BuyingGuidesPage.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/services/adminBuyingGuideService.js frontend/src/pages/admin/BuyingGuidesPage.jsx \
        frontend/src/pages/admin/BuyingGuidesPage.test.jsx
git commit -m "feat: add admin BuyingGuidesPage list"
```

---

### Task 5: Frontend — admin `BuyingGuideForm` + `BuyingGuideFormPage`

**Files:**
- Create: `frontend/src/components/BuyingGuideForm.jsx`
- Create: `frontend/src/components/BuyingGuideForm.test.jsx`
- Create: `frontend/src/pages/admin/BuyingGuideFormPage.jsx`
- Create: `frontend/src/pages/admin/BuyingGuideFormPage.test.jsx`

**Interfaces:**
- Consumes: `ImageUploader` (existing), `ProductPicker` (Task 3), `getBuyingGuideById`/`createBuyingGuide`/`updateBuyingGuide` (Task 4's `adminBuyingGuideService.js`).
- Produces: `BuyingGuideForm({ guide, onSubmit, onCancel })`, calling `onSubmit({ title, excerpt, content, coverImageFilename, active, recommendedProductIds: number[] })`. `BuyingGuideFormPage()` (default export, no props, reads `:id` from the route — matches `ProductFormPage`'s create/edit-in-one-page shape). Used by Task 6 (route wiring).

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BuyingGuideForm from './BuyingGuideForm.jsx';
import * as adminProductService from '../services/adminProductService.js';

describe('BuyingGuideForm', () => {
  it('shows validation errors when submitted empty', async () => {
    const user = userEvent.setup();
    render(<BuyingGuideForm guide={null} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Add Guide' }));

    expect(await screen.findByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByText('Excerpt is required.')).toBeInTheDocument();
    expect(screen.getByText('Content is required.')).toBeInTheDocument();
  });

  it('submits the expected payload for a new guide', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<BuyingGuideForm guide={null} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Title'), 'Best Kitchen Gadgets 2026');
    await user.type(screen.getByLabelText('Excerpt'), 'A quick roundup.');
    await user.type(screen.getByLabelText('Content'), 'Full article body.');
    await user.click(screen.getByRole('button', { name: 'Add Guide' }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Best Kitchen Gadgets 2026',
      excerpt: 'A quick roundup.',
      content: 'Full article body.',
      coverImageFilename: null,
      active: true,
      recommendedProductIds: [],
    });
  });

  it('pre-fills fields and submits an update payload when editing, preserving recommended products', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    const guide = {
      id: 5,
      title: 'Existing Guide',
      excerpt: 'Existing excerpt.',
      content: 'Existing content.',
      coverImageFilename: 'img_existing.webp',
      active: true,
      recommendedProducts: [{ id: 1, name: 'Wireless Earbuds' }],
    };
    render(<BuyingGuideForm guide={guide} onSubmit={onSubmit} onCancel={vi.fn()} />);

    expect(screen.getByLabelText('Title')).toHaveValue('Existing Guide');
    expect(screen.getByText('Wireless Earbuds')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Existing Guide',
      excerpt: 'Existing excerpt.',
      content: 'Existing content.',
      coverImageFilename: 'img_existing.webp',
      active: true,
      recommendedProductIds: [1],
    });
  });

  it('adds a searched product to the recommended list before submitting', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({
      content: [{ id: 2, name: 'Smart Watch' }],
    });
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<BuyingGuideForm guide={null} onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByLabelText('Title'), 'Title');
    await user.type(screen.getByLabelText('Excerpt'), 'Excerpt');
    await user.type(screen.getByLabelText('Content'), 'Content');
    await user.type(screen.getByLabelText('Recommended Products'), 'watch');
    await user.click(await screen.findByRole('button', { name: 'Smart Watch' }));
    await user.click(screen.getByRole('button', { name: 'Add Guide' }));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ recommendedProductIds: [2] }));
  });
});
```

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BuyingGuideFormPage from './BuyingGuideFormPage.jsx';
import * as adminBuyingGuideService from '../../services/adminBuyingGuideService.js';

function renderPage(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/admin/buying-guides/new" element={<BuyingGuideFormPage />} />
        <Route path="/admin/buying-guides/:id" element={<BuyingGuideFormPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BuyingGuideFormPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the create form with an empty title', () => {
    renderPage(['/admin/buying-guides/new']);
    expect(screen.getByRole('heading', { name: 'Add Buying Guide' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('');
  });

  it('loads and pre-fills the edit form', async () => {
    vi.spyOn(adminBuyingGuideService, 'getBuyingGuideById').mockResolvedValue({
      id: 7,
      title: 'Existing Guide',
      excerpt: 'Existing excerpt.',
      content: 'Existing content.',
      coverImageFilename: null,
      active: true,
      recommendedProducts: [],
    });
    renderPage(['/admin/buying-guides/7']);

    expect(await screen.findByRole('heading', { name: 'Edit Buying Guide' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Existing Guide');
  });

  it('creates a guide and submits via adminBuyingGuideService on save', async () => {
    vi.spyOn(adminBuyingGuideService, 'createBuyingGuide').mockResolvedValue({ id: 1 });
    const user = userEvent.setup();
    renderPage(['/admin/buying-guides/new']);

    await user.type(screen.getByLabelText('Title'), 'New Guide');
    await user.type(screen.getByLabelText('Excerpt'), 'Excerpt.');
    await user.type(screen.getByLabelText('Content'), 'Content.');
    await user.click(screen.getByRole('button', { name: 'Add Guide' }));

    await waitFor(() => expect(adminBuyingGuideService.createBuyingGuide).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- BuyingGuideForm.test.jsx pages/admin/BuyingGuideFormPage.test.jsx`
Expected: FAIL — neither `BuyingGuideForm.jsx` nor `BuyingGuideFormPage.jsx` exists yet.

- [ ] **Step 3: Write `BuyingGuideForm.jsx`**

```jsx
import { useState } from 'react';
import ImageUploader from './ImageUploader.jsx';
import ProductPicker from './ProductPicker.jsx';

function BuyingGuideForm({ guide, onSubmit, onCancel }) {
  const [coverImageFilename, setCoverImageFilename] = useState(guide?.coverImageFilename ?? null);
  const [title, setTitle] = useState(guide?.title ?? '');
  const [excerpt, setExcerpt] = useState(guide?.excerpt ?? '');
  const [content, setContent] = useState(guide?.content ?? '');
  const [active, setActive] = useState(guide?.active ?? true);
  const [recommendedProducts, setRecommendedProducts] = useState(guide?.recommendedProducts ?? []);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const errors = {};
    if (!title.trim()) errors.title = 'Title is required.';
    if (!excerpt.trim()) errors.excerpt = 'Excerpt is required.';
    if (!content.trim()) errors.content = 'Content is required.';
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        excerpt: excerpt.trim(),
        content: content.trim(),
        coverImageFilename,
        active,
        recommendedProductIds: recommendedProducts.map((product) => product.id),
      });
    } catch (error) {
      setFieldErrors(error.fieldErrors ?? {});
      if (!error.fieldErrors) {
        setFormError(error.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-2xl">
      {formError && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}

      <div className="mb-6">
        <ImageUploader imageFileName={coverImageFilename} onChange={setCoverImageFilename} />
      </div>

      <div className="mb-4">
        <label htmlFor="title" className="mb-1 block text-sm font-medium text-slate-700">
          Title
        </label>
        <input
          id="title"
          type="text"
          maxLength={200}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.title)}
          aria-describedby={fieldErrors.title ? 'title-error' : undefined}
        />
        {fieldErrors.title && (
          <p id="title-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.title}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="excerpt" className="mb-1 block text-sm font-medium text-slate-700">
          Excerpt
        </label>
        <textarea
          id="excerpt"
          rows={2}
          maxLength={500}
          value={excerpt}
          onChange={(event) => setExcerpt(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.excerpt)}
          aria-describedby={fieldErrors.excerpt ? 'excerpt-error' : undefined}
        />
        {fieldErrors.excerpt && (
          <p id="excerpt-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.excerpt}
          </p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="content" className="mb-1 block text-sm font-medium text-slate-700">
          Content
        </label>
        <textarea
          id="content"
          rows={8}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-invalid={Boolean(fieldErrors.content)}
          aria-describedby={fieldErrors.content ? 'content-error' : undefined}
        />
        {fieldErrors.content && (
          <p id="content-error" className="mt-1 text-sm text-red-600">
            {fieldErrors.content}
          </p>
        )}
      </div>

      <div className="mb-6">
        <ProductPicker selectedProducts={recommendedProducts} onChange={setRecommendedProducts} />
      </div>

      <div className="mb-6">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          Active
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Saving...' : guide ? 'Save Changes' : 'Add Guide'}
        </button>
      </div>
    </form>
  );
}

export default BuyingGuideForm;
```

- [ ] **Step 4: Write `BuyingGuideFormPage.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BuyingGuideForm from '../../components/BuyingGuideForm.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { useToast } from '../../hooks/useToast.js';
import { getBuyingGuideById, createBuyingGuide, updateBuyingGuide } from '../../services/adminBuyingGuideService.js';

function BuyingGuideFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEditMode = Boolean(id);

  const [guide, setGuide] = useState(null);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEditMode) return;
    // Resetting loading/error state at the start of each fetch is the standard
    // reset-before-async-work pattern; it can't cascade since neither value
    // is a dependency of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);
    getBuyingGuideById(id)
      .then(setGuide)
      .catch((err) => setError(err.message ?? 'Failed to load buying guide.'))
      .finally(() => setIsLoading(false));
  }, [id, isEditMode]);

  async function handleSubmit(payload) {
    if (isEditMode) {
      await updateBuyingGuide(id, payload);
      showToast('Buying guide updated successfully.');
    } else {
      await createBuyingGuide(payload);
      showToast('Buying guide created successfully.');
    }
    navigate('/admin/buying-guides');
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        {isEditMode ? 'Edit Buying Guide' : 'Add Buying Guide'}
      </h1>

      {isLoading ? (
        <LoadingSpinner label="Loading buying guide..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <BuyingGuideForm guide={guide} onSubmit={handleSubmit} onCancel={() => navigate('/admin/buying-guides')} />
      )}
    </div>
  );
}

export default BuyingGuideFormPage;
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd frontend && npm test -- BuyingGuideForm.test.jsx pages/admin/BuyingGuideFormPage.test.jsx`
Expected: PASS (4 + 3 tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/BuyingGuideForm.jsx frontend/src/components/BuyingGuideForm.test.jsx \
        frontend/src/pages/admin/BuyingGuideFormPage.jsx frontend/src/pages/admin/BuyingGuideFormPage.test.jsx
git commit -m "feat: add admin BuyingGuideForm and BuyingGuideFormPage"
```

---

### Task 6: Wire admin routes and `AdminSidebar` link

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/AdminSidebar.jsx`

**Interfaces:**
- Consumes: `BuyingGuidesPage` (Task 4), `BuyingGuideFormPage` (Task 5).
- Produces: `/admin/buying-guides`, `/admin/buying-guides/new`, `/admin/buying-guides/:id` routes, plus the sidebar entry linking to them. No dedicated test — covered by Task 4/5's own tests plus this task's full-suite verification, matching how routing wiring was handled in prior stages.

- [ ] **Step 1: Modify `App.jsx`**

Add the import (alongside the other admin page imports) and the three routes (inside the existing `AdminLayout` route group, after `/admin/settings`):

```jsx
import BuyingGuidesPage from './pages/admin/BuyingGuidesPage.jsx';
import BuyingGuideFormPage from './pages/admin/BuyingGuideFormPage.jsx';
```

```jsx
                    <Route path="/admin/settings" element={<SettingsPage />} />
                    <Route path="/admin/buying-guides" element={<BuyingGuidesPage />} />
                    <Route path="/admin/buying-guides/new" element={<BuyingGuideFormPage />} />
                    <Route path="/admin/buying-guides/:id" element={<BuyingGuideFormPage />} />
```

- [ ] **Step 2: Modify `AdminSidebar.jsx`**

Add `BookOpen` to the `lucide-react` import and add a new entry to `NAV_ITEMS` (after "Product Categories", before "System Settings"):

```jsx
import { LayoutDashboard, Package, Tags, BookOpen, Settings, LogOut } from 'lucide-react';
```

```jsx
const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Product Categories', icon: Tags },
  { to: '/admin/buying-guides', label: 'Buying Guides', icon: BookOpen },
  { to: '/admin/settings', label: 'System Settings', icon: Settings },
];
```

- [ ] **Step 3: Run the full frontend suite to confirm no regressions**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus all tests from Tasks 3 through 5.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.jsx frontend/src/components/AdminSidebar.jsx
git commit -m "feat: wire admin buying-guide routes and sidebar link"
```

---

### Task 7: Frontend — public `BuyingGuidesPage` (list)

**Files:**
- Create: `frontend/src/services/buyingGuideService.js`
- Create: `frontend/src/pages/BuyingGuidesPage.jsx`
- Test: `frontend/src/pages/BuyingGuidesPage.test.jsx`

**Interfaces:**
- Produces: `getBuyingGuides()`, `getBuyingGuideById(id)` in `buyingGuideService.js` (public, distinct file from Task 4's admin service) — consumed by this task and Task 8.
- Produces: `BuyingGuidesPage()` (default export, no props) at `frontend/src/pages/BuyingGuidesPage.jsx` — **public**, a distinct file from the admin `frontend/src/pages/admin/BuyingGuidesPage.jsx` from Task 4 (different directory, no collision, same alias pattern already used for the public `CategoriesPage`). Used by Task 9 (route wiring).

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BuyingGuidesPage from './BuyingGuidesPage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as buyingGuideService from '../services/buyingGuideService.js';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';

const guide = {
  id: 1,
  title: 'Best Kitchen Gadgets 2026',
  excerpt: 'A quick roundup of our favorite kitchen gadgets.',
  coverImageFilename: null,
  createdAt: '2026-07-20T10:00:00',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <CompareProvider>
        <BuyingGuidesPage />
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('BuyingGuidesPage (public)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({});
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([]);
  });

  it('renders fetched guide cards', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuides').mockResolvedValue([guide]);
    renderPage();

    expect(await screen.findByText('Best Kitchen Gadgets 2026')).toBeInTheDocument();
    expect(screen.getByText('A quick roundup of our favorite kitchen gadgets.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Best Kitchen Gadgets 2026/ })).toHaveAttribute(
      'href',
      '/buying-guides/1'
    );
  });

  it('shows an empty state when there are no guides', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuides').mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('No buying guides yet')).toBeInTheDocument();
  });

  it('shows an error state when fetching fails', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuides').mockRejectedValue({
      message: 'Network error. Please try again.',
    });
    renderPage();

    expect(await screen.findByText('Network error. Please try again.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- src/pages/BuyingGuidesPage.test.jsx`
Expected: FAIL — neither `buyingGuideService.js` nor `frontend/src/pages/BuyingGuidesPage.jsx` exists yet.

- [ ] **Step 3: Write `buyingGuideService.js`**

```js
import api from './api.js';

export async function getBuyingGuides() {
  const response = await api.get('/public/buying-guides');
  return response.data.data;
}

export async function getBuyingGuideById(id) {
  const response = await api.get(`/public/buying-guides/${id}`);
  return response.data.data;
}
```

- [ ] **Step 4: Write `pages/BuyingGuidesPage.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { getBuyingGuides } from '../services/buyingGuideService.js';
import { getSettings } from '../services/settingsService.js';
import { getImageUrl } from '../utils/imageUrl.js';

function BuyingGuidesPage() {
  const [settings, setSettings] = useState(null);
  const [guides, setGuides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    getBuyingGuides()
      .then(setGuides)
      .catch((err) => setError(err.message ?? 'Failed to load buying guides.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Buying Guides" description="Curated advice to help you choose the right products." />

          {isLoading && <LoadingSpinner label="Loading buying guides..." />}
          {!isLoading && error && <ErrorState message={error} />}
          {!isLoading && !error && guides.length === 0 && (
            <EmptyState title="No buying guides yet" description="Check back soon for curated buying advice." />
          )}
          {!isLoading && !error && guides.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {guides.map((guide) => (
                <Link
                  key={guide.id}
                  to={`/buying-guides/${guide.id}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
                >
                  <div className="aspect-video overflow-hidden bg-slate-100">
                    {getImageUrl(guide.coverImageFilename) ? (
                      <img
                        src={getImageUrl(guide.coverImageFilename)}
                        alt={guide.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                        No image available
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="text-base font-semibold text-slate-900">{guide.title}</h3>
                    <p className="line-clamp-2 text-sm text-slate-600">{guide.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer settings={settings} />
    </div>
  );
}

export default BuyingGuidesPage;
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npm test -- src/pages/BuyingGuidesPage.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/services/buyingGuideService.js frontend/src/pages/BuyingGuidesPage.jsx \
        frontend/src/pages/BuyingGuidesPage.test.jsx
git commit -m "feat: add public BuyingGuidesPage list"
```

---

### Task 8: Frontend — public `BuyingGuideDetailPage`

**Files:**
- Create: `frontend/src/pages/BuyingGuideDetailPage.jsx`
- Test: `frontend/src/pages/BuyingGuideDetailPage.test.jsx`

**Interfaces:**
- Consumes: `getBuyingGuideById` (Task 7's `buyingGuideService.js`), `ProductGrid`/`SectionHeading`/`Navbar`/`Footer` (existing).
- Produces: `BuyingGuideDetailPage()` (default export, no props, reads `:id` from the route). Used by Task 9 (route wiring).

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BuyingGuideDetailPage from './BuyingGuideDetailPage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as buyingGuideService from '../services/buyingGuideService.js';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';

const guide = {
  id: 1,
  title: 'Best Kitchen Gadgets 2026',
  content: 'Full article body content here.',
  coverImageFilename: null,
  createdAt: '2026-07-20T10:00:00',
  recommendedProducts: [
    {
      id: 10,
      name: 'Wireless Earbuds',
      categoryName: 'Electronics',
      imageFileName: null,
      productLink: 'https://amazon.com/dp/example',
      trending: false,
      bestSeller: false,
    },
  ],
};

function renderPage(initialEntries = ['/buying-guides/1']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CompareProvider>
        <Routes>
          <Route path="/buying-guides/:id" element={<BuyingGuideDetailPage />} />
        </Routes>
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('BuyingGuideDetailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({});
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([]);
  });

  it('renders the guide content and recommended products', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuideById').mockResolvedValue(guide);
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Best Kitchen Gadgets 2026', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Full article body content here.')).toBeInTheDocument();
    expect(screen.getByText('Wireless Earbuds')).toBeInTheDocument();
  });

  it('shows an error state when the guide is not found', async () => {
    vi.spyOn(buyingGuideService, 'getBuyingGuideById').mockRejectedValue({
      message: 'Buying guide not found.',
    });
    renderPage();

    expect(await screen.findByText('Buying guide not found.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- BuyingGuideDetailPage.test.jsx`
Expected: FAIL — `BuyingGuideDetailPage.jsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { getBuyingGuideById } from '../services/buyingGuideService.js';
import { getSettings } from '../services/settingsService.js';
import { getImageUrl } from '../utils/imageUrl.js';

function BuyingGuideDetailPage() {
  const { id } = useParams();
  const [settings, setSettings] = useState(null);
  const [guide, setGuide] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    // Resetting loading/error state at the start of each fetch is the standard
    // reset-before-async-work pattern; it can't cascade since neither value
    // is a dependency of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);
    getBuyingGuideById(id)
      .then(setGuide)
      .catch((err) => setError(err.message ?? 'Buying guide not found.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          {isLoading && <LoadingSpinner label="Loading buying guide..." />}
          {!isLoading && error && <ErrorState message={error} />}
          {!isLoading && !error && guide && (
            <>
              {getImageUrl(guide.coverImageFilename) && (
                <img
                  src={getImageUrl(guide.coverImageFilename)}
                  alt={guide.title}
                  className="mb-6 aspect-video w-full rounded-xl object-cover"
                />
              )}
              <h1 className="mb-4 text-3xl font-bold text-slate-900">{guide.title}</h1>
              <p className="whitespace-pre-line text-base leading-relaxed text-slate-700">{guide.content}</p>
            </>
          )}
        </div>

        {!isLoading && !error && guide && guide.recommendedProducts.length > 0 && (
          <div className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading title="Recommended Products" />
            <ProductGrid products={guide.recommendedProducts} isLoading={false} error={null} />
          </div>
        )}
      </section>
      <Footer settings={settings} />
    </div>
  );
}

export default BuyingGuideDetailPage;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm test -- BuyingGuideDetailPage.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/BuyingGuideDetailPage.jsx frontend/src/pages/BuyingGuideDetailPage.test.jsx
git commit -m "feat: add public BuyingGuideDetailPage"
```

---

### Task 9: Wire public routes and `Navbar`/`MobileMenu` links

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Navbar.jsx`
- Modify: `frontend/src/components/Navbar.test.jsx`
- Modify: `frontend/src/components/MobileMenu.jsx`
- Modify: `frontend/src/components/MobileMenu.test.jsx`

**Interfaces:**
- Consumes: public `BuyingGuidesPage` (Task 7), `BuyingGuideDetailPage` (Task 8).
- Produces: `/buying-guides`, `/buying-guides/:id` public routes; "Buying Guides" links in both nav surfaces. This is the final integration task for the whole feature — no dedicated new test file beyond the `Navbar.test.jsx`/`MobileMenu.test.jsx` additions below, matching how routing wiring was handled in every prior stage.

- [ ] **Step 1: Write the failing test additions**

In `Navbar.test.jsx`, add this test (after the existing "links the search button to browse all products" test):

```jsx
  it('renders the Buying Guides link between Compare and Best Sellers', () => {
    renderNavbar();
    expect(screen.getByRole('link', { name: 'Buying Guides' })).toHaveAttribute('href', '/buying-guides');
  });
```

In `MobileMenu.test.jsx`, add this test (after the existing "renders the nav links, a Compare link, and a search link when open" test):

```jsx
  it('renders the Buying Guides link', () => {
    renderMenu();
    expect(screen.getByRole('link', { name: 'Buying Guides' })).toHaveAttribute('href', '/buying-guides');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- Navbar.test.jsx MobileMenu.test.jsx`
Expected: FAIL — no "Buying Guides" link exists in either component yet.

- [ ] **Step 3: Modify `App.jsx`**

Add the imports (alongside the other public page imports) and the two routes (after `/compare`, before `/login`):

```jsx
import PublicBuyingGuidesPage from './pages/BuyingGuidesPage.jsx';
import BuyingGuideDetailPage from './pages/BuyingGuideDetailPage.jsx';
```

```jsx
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/buying-guides" element={<PublicBuyingGuidesPage />} />
                <Route path="/buying-guides/:id" element={<BuyingGuideDetailPage />} />
                <Route path="/login" element={<LoginPage />} />
```

- [ ] **Step 4: Modify `Navbar.jsx`**

Add a new `NavLink` for "Buying Guides" between the "Compare" `NavLink` and the "Best Sellers" `NavLink`:

```jsx
            <NavLink to="/buying-guides" className={navLinkClassName}>
              Buying Guides
            </NavLink>
```

- [ ] **Step 5: Modify `MobileMenu.jsx`**

Add `{ to: '/buying-guides', label: 'Buying Guides' }` to `NAV_ITEMS`, positioned after the `/compare` entry and before the `/best-sellers` entry:

```jsx
const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/trending', label: 'Trending' },
  { to: '/categories', label: 'Categories' },
  { to: '/compare', label: 'Compare' },
  { to: '/buying-guides', label: 'Buying Guides' },
  { to: '/best-sellers', label: 'Best Sellers' },
];
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd frontend && npm test -- Navbar.test.jsx MobileMenu.test.jsx`
Expected: PASS (9 + 8 tests respectively)

- [ ] **Step 7: Run the full frontend suite**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus all tests from Tasks 3 through 8.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/App.jsx frontend/src/components/Navbar.jsx frontend/src/components/Navbar.test.jsx \
        frontend/src/components/MobileMenu.jsx frontend/src/components/MobileMenu.test.jsx
git commit -m "feat: wire public buying-guide routes and navbar links"
```

---

### Task 10: Final verification

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything from Tasks 1–9
- Produces: nothing further downstream — this stage's final gate.

- [ ] **Step 1: Run the entire backend test suite**

Run: `cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test`
Expected: PASS — every prior test plus Tasks 1–2's new tests.

- [ ] **Step 2: Run the entire frontend test suite**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus all tests from Tasks 3 through 9.

- [ ] **Step 3: Run frontend lint**

Run: `cd frontend && npm run lint`
Expected: clean (0 errors, 0 warnings). If lint flags something unanticipated (e.g. an exhaustive-deps warning), apply the established pattern from prior stages: a one-line `eslint-disable-next-line` with justification only if the rule is genuinely a false positive for that effect's shape — never add one preemptively where lint doesn't actually flag it.

- [ ] **Step 4: Run the frontend production build**

Run: `cd frontend && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 5: Run the backend build**

Run: `cd backend && mvn clean package -DskipTests`
Expected: succeeds with no errors.

- [ ] **Step 6: Manual smoke check (optional, requires both servers running — restart the backend dev server first if it was already running before this plan's migration/code landed)**

Optional — skip if a live backend isn't available; Steps 1-5 are the mandatory bar. If available: confirm an admin can create a buying guide with a cover image, excerpt, content, and 2+ recommended products in a chosen order; confirm editing a guide loads and preserves that order, and reordering/removing products in the picker works; confirm deleting a guide removes it from the admin list; confirm a draft (inactive) guide does not appear on the public `/buying-guides` list and 404s if visited directly; confirm the public list page renders cards linking to the correct detail pages; confirm a guide's detail page renders its content and recommended products (with working Add-to-Compare/View-on-Amazon buttons, since it reuses `ProductGrid`); confirm the "Buying Guides" link appears in both the desktop navbar and mobile menu, and in the admin sidebar.

- [ ] **Step 7: Commit (if the smoke check surfaced any fixes)**

If Step 6 found nothing to fix (or was skipped), there is nothing to commit for this task — Task 9's commit is the final commit of this stage. If it did surface a small fix, apply it, re-run Steps 1-5, and commit:
```bash
git add -A
git commit -m "fix: address issue found during Buying Guides manual smoke check"
```
