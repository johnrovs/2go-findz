# Comparisons Stage 1 (Data Model & Backend APIs) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the data model and REST APIs (admin CRUD + public read) for a new admin-curated "Comparisons" content type, entirely separate from the existing ad-hoc `/compare` tool.

**Architecture:** Six new JPA entities rooted at `Comparison` (products, spec rows/values, sections, FAQs, related comparisons/products), one nested request/response DTO per level, a single service that replaces the full nested state on every create/update (no granular per-child endpoints), and two controllers (`/api/admin/comparisons`, `/api/public/comparisons`) following this codebase's existing layered-architecture and testing conventions exactly.

**Tech Stack:** Java 21, Spring Boot, Spring Data JPA, Spring Security (JWT), Bean Validation, Lombok, Maven, MySQL (Flyway migrations), MockMvc + Testcontainers MySQL for integration tests.

## Global Constraints

- Never expose JPA entities directly from controllers — use request/response DTOs (`dto/request`, `dto/response`).
- Business logic lives in the service layer, not controllers; controllers stay thin.
- Use constructor injection everywhere (no field injection).
- Centralized exception handling via `@RestControllerAdvice` (`GlobalExceptionHandler`) — every new failure mode gets an `@ExceptionHandler` there, never an ad-hoc try/catch in a controller.
- Every API response uses the existing `ApiResponse<T>` envelope (`success`, `message`, `data`, `timestamp`); validation failures use `ValidationErrorResponse`.
- Use `BigDecimal` for `editorsScore` (never floating point), `LocalDateTime` for timestamps, Java records for DTOs.
- Normalized relational schema: foreign keys, indexes, timestamps, `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4` — matches every existing migration.
- Hard delete with `ON DELETE CASCADE` on all child tables (same precedent as `BuyingGuide`/`HeroBanner` — no analytics reference these entities).
- Follow strict TDD for every step: write the failing test, run it and confirm it fails, implement the minimal code to pass, run it and confirm it passes, run the full backend suite, then commit.
- Dark mode is out of scope for this entire feature (all 4 stages) — do not add any dark-mode styling or configuration.
- This stage delivers backend only — no frontend, no admin UI, no public page rendering (Stages 2–4).

---

### Task 1: Migration, entities, and repository

**Files:**
- Create: `backend/src/main/resources/db/migration/V10__create_comparisons_tables.sql`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/SpecTier.java`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/Comparison.java`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/ComparisonProduct.java`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/ComparisonSpecRow.java`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/ComparisonSpecValue.java`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/ComparisonSection.java`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/ComparisonFaq.java`
- Create: `backend/src/main/java/com/twogofindz/backend/repository/ComparisonRepository.java`
- Test: `backend/src/test/java/com/twogofindz/backend/repository/ComparisonRepositoryTest.java`

**Interfaces:**
- Produces: `Comparison` entity with `List<ComparisonProduct> products`, `List<ComparisonSpecRow> specRows`, `List<ComparisonSection> sections`, `List<ComparisonFaq> faqs`, `List<Comparison> relatedComparisons`, `List<Product> relatedProducts` (all `@OrderColumn`-ordered), plus `ComparisonRepository` with `findAllByOrderByCreatedAtDesc()`, `findByPublishedTrueOrderByCreatedAtDesc()`, `findBySlug(String)`, `existsBySlug(String)`, `existsBySlugAndIdNot(String, Long)`. Consumed by every later task.

- [ ] **Step 1: Write the failing repository test**

Create `backend/src/test/java/com/twogofindz/backend/repository/ComparisonRepositoryTest.java`:

```java
package com.twogofindz.backend.repository;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.entity.Comparison;
import com.twogofindz.backend.entity.ComparisonFaq;
import com.twogofindz.backend.entity.ComparisonProduct;
import com.twogofindz.backend.entity.ComparisonSection;
import com.twogofindz.backend.entity.ComparisonSpecRow;
import com.twogofindz.backend.entity.ComparisonSpecValue;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.entity.ProductCategory;
import com.twogofindz.backend.entity.SpecTier;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ComparisonRepositoryTest extends AbstractIntegrationTest {

    @Autowired
    private ComparisonRepository comparisonRepository;

    @Autowired
    private ProductCategoryRepository productCategoryRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @Transactional
    void savesAndReloadsFullNestedComparison_thenCascadeDeletesAllChildren() {
        ProductCategory category = productCategoryRepository.save(
                ProductCategory.builder().productCategoryName("Repo Test Category").commissionRate(new BigDecimal("5.00")).build());
        Product productA = productRepository.save(
                Product.builder().name("Repo Test Product A").description("desc").category(category)
                        .productPrice(new BigDecimal("19.99")).productLink("https://example.com/a")
                        .trending(false).bestSeller(false).active(true).build());
        Product productB = productRepository.save(
                Product.builder().name("Repo Test Product B").description("desc").category(category)
                        .productPrice(new BigDecimal("29.99")).productLink("https://example.com/b")
                        .trending(false).bestSeller(false).active(true).build());

        Comparison comparison = Comparison.builder()
                .title("Repo Test Comparison")
                .slug("repo-test-comparison")
                .description("A comparison used only for repository-level testing.")
                .category(category)
                .published(false)
                .build();

        List<ComparisonProduct> products = new ArrayList<>();
        products.add(ComparisonProduct.builder().comparison(comparison).product(productA)
                .recommendation("Great overall.").bestFor("Everyone").mainStrength("Speed").mainWeakness("Price")
                .pros("Fast\nReliable").cons("Expensive").build());
        products.add(ComparisonProduct.builder().comparison(comparison).product(productB)
                .recommendation("Great budget pick.").bestFor("Budget shoppers").mainStrength("Price").mainWeakness("Speed")
                .pros("Cheap").cons("Slower").build());
        comparison.setProducts(products);

        ComparisonSpecRow row = ComparisonSpecRow.builder().comparison(comparison)
                .groupLabel("Performance").rowLabel("Speed").build();
        List<ComparisonSpecValue> values = new ArrayList<>();
        values.add(ComparisonSpecValue.builder().specRow(row).product(productA).value("Fast").tier(SpecTier.BEST).build());
        values.add(ComparisonSpecValue.builder().specRow(row).product(productB).value("Moderate").tier(SpecTier.STANDARD).build());
        row.setValues(values);
        List<ComparisonSpecRow> specRows = new ArrayList<>();
        specRows.add(row);
        comparison.setSpecRows(specRows);

        List<ComparisonSection> sections = new ArrayList<>();
        sections.add(ComparisonSection.builder().comparison(comparison)
                .heading("Buying Tips").body("Consider your budget first.").build());
        comparison.setSections(sections);

        List<ComparisonFaq> faqs = new ArrayList<>();
        faqs.add(ComparisonFaq.builder().comparison(comparison)
                .question("Which is better?").answer("It depends on your budget.").build());
        comparison.setFaqs(faqs);

        Comparison saved = comparisonRepository.save(comparison);
        entityManager.flush();
        entityManager.clear();

        Comparison reloaded = comparisonRepository.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getProducts()).hasSize(2);
        assertThat(reloaded.getProducts().get(0).getProduct().getName()).isEqualTo("Repo Test Product A");
        assertThat(reloaded.getSpecRows()).hasSize(1);
        assertThat(reloaded.getSpecRows().get(0).getValues()).hasSize(2);
        assertThat(reloaded.getSections()).hasSize(1);
        assertThat(reloaded.getFaqs()).hasSize(1);

        Long id = reloaded.getId();
        comparisonRepository.delete(reloaded);
        entityManager.flush();
        entityManager.clear();

        assertThat(comparisonRepository.findById(id)).isEmpty();
        assertThat(countChildRows("ComparisonProduct", id)).isZero();
        assertThat(countChildRows("ComparisonSection", id)).isZero();
        assertThat(countChildRows("ComparisonFaq", id)).isZero();
        assertThat(countChildRows("ComparisonSpecRow", id)).isZero();
    }

    private Long countChildRows(String entityName, Long comparisonId) {
        return entityManager.createQuery(
                        "SELECT COUNT(e) FROM " + entityName + " e WHERE e.comparison.id = :id", Long.class)
                .setParameter("id", comparisonId)
                .getSingleResult();
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test -Dtest=ComparisonRepositoryTest`
Expected: FAIL — compilation error, none of the entities/repository exist yet.

- [ ] **Step 3: Create the migration**

Create `backend/src/main/resources/db/migration/V10__create_comparisons_tables.sql`:

```sql
CREATE TABLE comparisons (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(220) NOT NULL,
    description VARCHAR(500) NOT NULL,
    cover_image_filename VARCHAR(255) NULL,
    product_category_id BIGINT NOT NULL,
    seo_title VARCHAR(200) NULL,
    seo_description VARCHAR(300) NULL,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_comparisons_slug UNIQUE (slug),
    CONSTRAINT fk_comparisons_category FOREIGN KEY (product_category_id)
        REFERENCES product_categories (id),
    INDEX idx_comparisons_published_created (published, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE comparison_products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    comparison_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    display_order INT NOT NULL,
    badge VARCHAR(100) NULL,
    recommendation VARCHAR(500) NOT NULL,
    best_for VARCHAR(200) NOT NULL,
    main_strength VARCHAR(200) NOT NULL,
    main_weakness VARCHAR(200) NOT NULL,
    pros TEXT NULL,
    cons TEXT NULL,
    editors_score DECIMAL(3,1) NULL,
    CONSTRAINT fk_comparison_products_comparison FOREIGN KEY (comparison_id)
        REFERENCES comparisons (id) ON DELETE CASCADE,
    CONSTRAINT fk_comparison_products_product FOREIGN KEY (product_id)
        REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_comparison_products_comparison ON comparison_products (comparison_id);
CREATE INDEX idx_comparison_products_product ON comparison_products (product_id);

CREATE TABLE comparison_spec_rows (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    comparison_id BIGINT NOT NULL,
    group_label VARCHAR(100) NOT NULL,
    row_label VARCHAR(100) NOT NULL,
    display_order INT NOT NULL,
    CONSTRAINT fk_comparison_spec_rows_comparison FOREIGN KEY (comparison_id)
        REFERENCES comparisons (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_comparison_spec_rows_comparison ON comparison_spec_rows (comparison_id);

CREATE TABLE comparison_spec_values (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    spec_row_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    value VARCHAR(200) NOT NULL,
    tier VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
    CONSTRAINT fk_comparison_spec_values_row FOREIGN KEY (spec_row_id)
        REFERENCES comparison_spec_rows (id) ON DELETE CASCADE,
    CONSTRAINT fk_comparison_spec_values_product FOREIGN KEY (product_id)
        REFERENCES products (id) ON DELETE CASCADE,
    CONSTRAINT uq_comparison_spec_values_row_product UNIQUE (spec_row_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE comparison_sections (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    comparison_id BIGINT NOT NULL,
    heading VARCHAR(150) NOT NULL,
    body TEXT NOT NULL,
    display_order INT NOT NULL,
    CONSTRAINT fk_comparison_sections_comparison FOREIGN KEY (comparison_id)
        REFERENCES comparisons (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_comparison_sections_comparison ON comparison_sections (comparison_id);

CREATE TABLE comparison_faqs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    comparison_id BIGINT NOT NULL,
    question VARCHAR(300) NOT NULL,
    answer TEXT NOT NULL,
    display_order INT NOT NULL,
    CONSTRAINT fk_comparison_faqs_comparison FOREIGN KEY (comparison_id)
        REFERENCES comparisons (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_comparison_faqs_comparison ON comparison_faqs (comparison_id);

CREATE TABLE comparison_related_comparisons (
    comparison_id BIGINT NOT NULL,
    related_comparison_id BIGINT NOT NULL,
    display_order INT NOT NULL,
    PRIMARY KEY (comparison_id, display_order),
    CONSTRAINT fk_comparison_related_comparisons_comparison FOREIGN KEY (comparison_id)
        REFERENCES comparisons (id) ON DELETE CASCADE,
    CONSTRAINT fk_comparison_related_comparisons_related FOREIGN KEY (related_comparison_id)
        REFERENCES comparisons (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_comparison_related_comparisons_related ON comparison_related_comparisons (related_comparison_id);

CREATE TABLE comparison_related_products (
    comparison_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    display_order INT NOT NULL,
    PRIMARY KEY (comparison_id, display_order),
    CONSTRAINT fk_comparison_related_products_comparison FOREIGN KEY (comparison_id)
        REFERENCES comparisons (id) ON DELETE CASCADE,
    CONSTRAINT fk_comparison_related_products_product FOREIGN KEY (product_id)
        REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_comparison_related_products_product ON comparison_related_products (product_id);
```

- [ ] **Step 4: Create `SpecTier.java`**

```java
package com.twogofindz.backend.entity;

public enum SpecTier {
    BEST,
    GOOD,
    STANDARD
}
```

- [ ] **Step 5: Create `ComparisonProduct.java`**

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

import java.math.BigDecimal;

@Entity
@Table(name = "comparison_products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComparisonProduct {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "comparison_id", nullable = false)
    private Comparison comparison;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(length = 100)
    private String badge;

    @Column(nullable = false, length = 500)
    private String recommendation;

    @Column(name = "best_for", nullable = false, length = 200)
    private String bestFor;

    @Column(name = "main_strength", nullable = false, length = 200)
    private String mainStrength;

    @Column(name = "main_weakness", nullable = false, length = 200)
    private String mainWeakness;

    @Column(columnDefinition = "TEXT")
    private String pros;

    @Column(columnDefinition = "TEXT")
    private String cons;

    @Column(name = "editors_score", precision = 3, scale = 1)
    private BigDecimal editorsScore;
}
```

- [ ] **Step 6: Create `ComparisonSpecValue.java`**

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
@Table(name = "comparison_spec_values")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComparisonSpecValue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "spec_row_id", nullable = false)
    private ComparisonSpecRow specRow;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false, length = 200)
    private String value;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SpecTier tier;
}
```

- [ ] **Step 7: Create `ComparisonSpecRow.java`**

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
@Table(name = "comparison_spec_rows")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComparisonSpecRow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "comparison_id", nullable = false)
    private Comparison comparison;

    @Column(name = "group_label", nullable = false, length = 100)
    private String groupLabel;

    @Column(name = "row_label", nullable = false, length = 100)
    private String rowLabel;

    @OneToMany(mappedBy = "specRow", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ComparisonSpecValue> values;
}
```

- [ ] **Step 8: Create `ComparisonSection.java`**

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
@Table(name = "comparison_sections")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComparisonSection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "comparison_id", nullable = false)
    private Comparison comparison;

    @Column(nullable = false, length = 150)
    private String heading;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;
}
```

- [ ] **Step 9: Create `ComparisonFaq.java`**

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
@Table(name = "comparison_faqs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ComparisonFaq {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "comparison_id", nullable = false)
    private Comparison comparison;

    @Column(nullable = false, length = 300)
    private String question;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String answer;
}
```

- [ ] **Step 10: Create `Comparison.java`**

```java
package com.twogofindz.backend.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
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
@Table(name = "comparisons")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Comparison {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, unique = true, length = 220)
    private String slug;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(name = "cover_image_filename")
    private String coverImageFilename;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_category_id", nullable = false)
    private ProductCategory category;

    @Column(name = "seo_title", length = 200)
    private String seoTitle;

    @Column(name = "seo_description", length = 300)
    private String seoDescription;

    @Column(nullable = false)
    private Boolean published;

    @OneToMany(mappedBy = "comparison", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderColumn(name = "display_order")
    private List<ComparisonProduct> products;

    @OneToMany(mappedBy = "comparison", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderColumn(name = "display_order")
    private List<ComparisonSpecRow> specRows;

    @OneToMany(mappedBy = "comparison", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderColumn(name = "display_order")
    private List<ComparisonSection> sections;

    @OneToMany(mappedBy = "comparison", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderColumn(name = "display_order")
    private List<ComparisonFaq> faqs;

    @ManyToMany
    @JoinTable(
            name = "comparison_related_comparisons",
            joinColumns = @JoinColumn(name = "comparison_id"),
            inverseJoinColumns = @JoinColumn(name = "related_comparison_id")
    )
    @OrderColumn(name = "display_order")
    private List<Comparison> relatedComparisons;

    @ManyToMany
    @JoinTable(
            name = "comparison_related_products",
            joinColumns = @JoinColumn(name = "comparison_id"),
            inverseJoinColumns = @JoinColumn(name = "product_id")
    )
    @OrderColumn(name = "display_order")
    private List<Product> relatedProducts;

    @Generated(event = {EventType.INSERT, EventType.UPDATE})
    @Column(name = "created_at", nullable = false, updatable = false, insertable = false)
    private LocalDateTime createdAt;

    @Generated(event = {EventType.INSERT, EventType.UPDATE})
    @Column(name = "updated_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime updatedAt;
}
```

- [ ] **Step 11: Create `ComparisonRepository.java`**

```java
package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.Comparison;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ComparisonRepository extends JpaRepository<Comparison, Long> {

    List<Comparison> findAllByOrderByCreatedAtDesc();

    List<Comparison> findByPublishedTrueOrderByCreatedAtDesc();

    Optional<Comparison> findBySlug(String slug);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);
}
```

- [ ] **Step 12: Run the test to verify it passes**

Run: `cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test -Dtest=ComparisonRepositoryTest`
Expected: PASS (1 test)

- [ ] **Step 13: Run the full backend suite**

Run: `cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test`
Expected: PASS — every prior test plus this one (84 total).

- [ ] **Step 14: Commit**

```bash
git add backend/src/main/resources/db/migration/V10__create_comparisons_tables.sql \
        backend/src/main/java/com/twogofindz/backend/entity/SpecTier.java \
        backend/src/main/java/com/twogofindz/backend/entity/Comparison.java \
        backend/src/main/java/com/twogofindz/backend/entity/ComparisonProduct.java \
        backend/src/main/java/com/twogofindz/backend/entity/ComparisonSpecRow.java \
        backend/src/main/java/com/twogofindz/backend/entity/ComparisonSpecValue.java \
        backend/src/main/java/com/twogofindz/backend/entity/ComparisonSection.java \
        backend/src/main/java/com/twogofindz/backend/entity/ComparisonFaq.java \
        backend/src/main/java/com/twogofindz/backend/repository/ComparisonRepository.java \
        backend/src/test/java/com/twogofindz/backend/repository/ComparisonRepositoryTest.java
git commit -m "feat: add Comparison entity graph, migration, and repository"
```

---

### Task 2: Admin create + read (list, get by id)

**Files:**
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/ComparisonProductRequest.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/ComparisonSpecValueRequest.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/ComparisonSpecRowRequest.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/ComparisonSectionRequest.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/ComparisonFaqRequest.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/ComparisonRequest.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/ComparisonProductResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/ComparisonSpecValueResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/ComparisonSpecRowResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/ComparisonSectionResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/ComparisonFaqResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/ComparisonSummaryResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/ComparisonResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/exception/InvalidComparisonException.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/exception/GlobalExceptionHandler.java`
- Create: `backend/src/main/java/com/twogofindz/backend/mapper/ComparisonMapper.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/ComparisonService.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/impl/ComparisonServiceImpl.java`
- Create: `backend/src/main/java/com/twogofindz/backend/controller/admin/AdminComparisonController.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminComparisonControllerTest.java`

**Interfaces:**
- Consumes: `Comparison`/`ComparisonProduct`/`ComparisonSpecRow`/`ComparisonSpecValue`/`ComparisonSection`/`ComparisonFaq`/`SpecTier` (Task 1), `ProductRepository`, `ProductCategoryRepository`, `ProductMapper.toResponse(Product)` (all pre-existing).
- Produces: `ComparisonService.create(ComparisonRequest)`, `getByIdForAdmin(Long)`, `getAllForAdmin()`; `ComparisonMapper.toResponse(Comparison)`, `toSummary(Comparison)`; `POST /api/admin/comparisons`, `GET /api/admin/comparisons`, `GET /api/admin/comparisons/{id}`. Task 3 extends the service/controller with update/delete; Task 4 extends the mapper/service/controller with public read methods.

- [ ] **Step 1: Write the failing controller tests**

Create `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminComparisonControllerTest.java`:

```java
package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.ComparisonFaqRequest;
import com.twogofindz.backend.dto.request.ComparisonProductRequest;
import com.twogofindz.backend.dto.request.ComparisonRequest;
import com.twogofindz.backend.dto.request.ComparisonSectionRequest;
import com.twogofindz.backend.dto.request.ComparisonSpecRowRequest;
import com.twogofindz.backend.dto.request.ComparisonSpecValueRequest;
import com.twogofindz.backend.dto.request.ProductRequest;
import com.twogofindz.backend.entity.SpecTier;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminComparisonControllerTest extends AbstractIntegrationTest {

    @Test
    void create_succeeds_withFullNestedPayload() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Comparison Test Category A");
        Long productAId = createProductId(token, categoryId, "Comparison Test Product A");
        Long productBId = createProductId(token, categoryId, "Comparison Test Product B");

        ComparisonRequest request = validRequest(categoryId, productAId, productBId, "comparison-create-test");

        mockMvc.perform(post("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Comparison Create Test"))
                .andExpect(jsonPath("$.data.slug").value("comparison-create-test"))
                .andExpect(jsonPath("$.data.products", hasSize(2)))
                .andExpect(jsonPath("$.data.products[0].product.name").value("Comparison Test Product A"))
                .andExpect(jsonPath("$.data.specRows", hasSize(1)))
                .andExpect(jsonPath("$.data.specRows[0].values", hasSize(2)))
                .andExpect(jsonPath("$.data.sections", hasSize(1)))
                .andExpect(jsonPath("$.data.faqs", hasSize(1)));
    }

    @Test
    void create_returns400_whenTitleBlank() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Comparison Test Category B");
        Long productAId = createProductId(token, categoryId, "Comparison Test Product C");
        Long productBId = createProductId(token, categoryId, "Comparison Test Product D");
        ComparisonRequest full = validRequest(categoryId, productAId, productBId, "comparison-blank-title");

        ComparisonRequest request = new ComparisonRequest(
                "", full.slug(), full.description(), full.coverImageFilename(), full.categoryId(),
                full.seoTitle(), full.seoDescription(), full.published(), full.products(),
                full.specRows(), full.sections(), full.faqs(), full.relatedComparisonIds(), full.relatedProductIds());

        mockMvc.perform(post("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.title").exists());
    }

    @Test
    void create_returns400_whenFewerThanTwoProducts() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Comparison Test Category C");
        Long productAId = createProductId(token, categoryId, "Comparison Test Product E");
        ComparisonRequest full = validRequest(categoryId, productAId, productAId, "comparison-one-product");

        ComparisonRequest request = new ComparisonRequest(
                full.title(), full.slug(), full.description(), full.coverImageFilename(), full.categoryId(),
                full.seoTitle(), full.seoDescription(), full.published(),
                List.of(full.products().get(0)),
                List.of(), List.of(), List.of(), List.of(), List.of());

        mockMvc.perform(post("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.products").exists());
    }

    @Test
    void create_returns400_whenProsProvidedWithoutCons() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Comparison Test Category D");
        Long productAId = createProductId(token, categoryId, "Comparison Test Product F");
        Long productBId = createProductId(token, categoryId, "Comparison Test Product G");

        ComparisonProductRequest badProduct = new ComparisonProductRequest(
                productAId, "Best Overall", "Great pick.", "Everyone", "Speed", "Price",
                "Fast", null, new BigDecimal("8.5"));
        ComparisonProductRequest okProduct = new ComparisonProductRequest(
                productBId, null, "Solid budget pick.", "Budget shoppers", "Price", "Speed",
                null, null, null);

        ComparisonRequest request = new ComparisonRequest(
                "Comparison Pros Cons Test", "comparison-pros-cons-test", "A test comparison.", null, categoryId,
                null, null, true,
                List.of(badProduct, okProduct), List.of(), List.of(), List.of(), List.of(), List.of());

        mockMvc.perform(post("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns400_whenSpecRowMissingValueForAProduct() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Comparison Test Category E");
        Long productAId = createProductId(token, categoryId, "Comparison Test Product H");
        Long productBId = createProductId(token, categoryId, "Comparison Test Product I");
        ComparisonRequest full = validRequest(categoryId, productAId, productBId, "comparison-incomplete-row");

        ComparisonSpecRowRequest incompleteRow = new ComparisonSpecRowRequest(
                "Performance", "Speed",
                List.of(new ComparisonSpecValueRequest(productAId, "Fast", SpecTier.BEST)));

        ComparisonRequest request = new ComparisonRequest(
                full.title(), full.slug(), full.description(), full.coverImageFilename(), full.categoryId(),
                full.seoTitle(), full.seoDescription(), full.published(), full.products(),
                List.of(incompleteRow), List.of(), List.of(), List.of(), List.of());

        mockMvc.perform(post("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns409_whenSlugAlreadyExists() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Comparison Test Category F");
        Long productAId = createProductId(token, categoryId, "Comparison Test Product J");
        Long productBId = createProductId(token, categoryId, "Comparison Test Product K");
        ComparisonRequest request = validRequest(categoryId, productAId, productBId, "comparison-duplicate-slug");

        mockMvc.perform(post("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    @Test
    void create_returns401_withoutToken() throws Exception {
        ComparisonRequest request = validRequest(1L, 1L, 2L, "comparison-no-token");

        mockMvc.perform(post("/api/admin/comparisons")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getById_returns404_forUnknownComparison() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/admin/comparisons/999999")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void getAll_includesCreatedComparison() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Comparison Test Category G");
        Long productAId = createProductId(token, categoryId, "Comparison Test Product L");
        Long productBId = createProductId(token, categoryId, "Comparison Test Product M");
        ComparisonRequest request = validRequest(categoryId, productAId, productBId, "comparison-list-test");

        mockMvc.perform(post("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        MvcResult result = mockMvc.perform(get("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();

        assertThat(result.getResponse().getContentAsString()).contains("comparison-list-test");
    }

    private ComparisonRequest validRequest(Long categoryId, Long productAId, Long productBId, String slug) {
        ComparisonProductRequest productA = new ComparisonProductRequest(
                productAId, "Best Overall", "Great overall pick.", "Everyone", "Speed", "Price",
                "Fast\nReliable", "Expensive", new BigDecimal("8.5"));
        ComparisonProductRequest productB = new ComparisonProductRequest(
                productBId, "Best Budget", "Great budget pick.", "Budget shoppers", "Price", "Speed",
                "Cheap", "Slower", new BigDecimal("7.0"));

        ComparisonSpecRowRequest specRow = new ComparisonSpecRowRequest(
                "Performance", "Speed",
                List.of(
                        new ComparisonSpecValueRequest(productAId, "Fast", SpecTier.BEST),
                        new ComparisonSpecValueRequest(productBId, "Moderate", SpecTier.STANDARD)));

        ComparisonSectionRequest section = new ComparisonSectionRequest("Buying Tips", "Consider your budget first.");
        ComparisonFaqRequest faq = new ComparisonFaqRequest("Which is better?", "It depends on your budget.");

        return new ComparisonRequest(
                titleFromSlug(slug), slug, "A test comparison used for automated testing.", null, categoryId,
                null, null, true,
                List.of(productA, productB), List.of(specRow), List.of(section), List.of(faq),
                List.of(), List.of());
    }

    private static String titleFromSlug(String slug) {
        String[] words = slug.split("-");
        StringBuilder title = new StringBuilder();
        for (String word : words) {
            title.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1)).append(' ');
        }
        return title.toString().trim();
    }

    private Long createProductId(String token, Long categoryId, String name) throws Exception {
        ProductRequest request = new ProductRequest(
                name, "Description for " + name, categoryId, null,
                new BigDecimal("19.99"), "https://example.com/" + name.replace(" ", "-"),
                false, false, true);
        MvcResult result = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).path("data").path("id").asLong();
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test -Dtest=AdminComparisonControllerTest`
Expected: FAIL — compilation error, none of the DTOs/mapper/service/controller exist yet.

- [ ] **Step 3: Create the request DTOs**

Create `backend/src/main/java/com/twogofindz/backend/dto/request/ComparisonProductRequest.java`:

```java
package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ComparisonProductRequest(
        @NotNull(message = "Product id is required.")
        Long productId,

        @Size(max = 100, message = "Badge must be at most 100 characters.")
        String badge,

        @NotBlank(message = "Recommendation is required.")
        @Size(max = 500, message = "Recommendation must be at most 500 characters.")
        String recommendation,

        @NotBlank(message = "Best For is required.")
        @Size(max = 200, message = "Best For must be at most 200 characters.")
        String bestFor,

        @NotBlank(message = "Main strength is required.")
        @Size(max = 200, message = "Main strength must be at most 200 characters.")
        String mainStrength,

        @NotBlank(message = "Main weakness is required.")
        @Size(max = 200, message = "Main weakness must be at most 200 characters.")
        String mainWeakness,

        String pros,

        String cons,

        @DecimalMin(value = "0.0", message = "Editor's score must be between 0.0 and 10.0.")
        @DecimalMax(value = "10.0", message = "Editor's score must be between 0.0 and 10.0.")
        BigDecimal editorsScore
) {
    @AssertTrue(message = "Pros and cons must both be provided, or both left blank.")
    public boolean isProsConsConsistent() {
        boolean prosBlank = pros == null || pros.isBlank();
        boolean consBlank = cons == null || cons.isBlank();
        return prosBlank == consBlank;
    }
}
```

Create `backend/src/main/java/com/twogofindz/backend/dto/request/ComparisonSpecValueRequest.java`:

```java
package com.twogofindz.backend.dto.request;

import com.twogofindz.backend.entity.SpecTier;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ComparisonSpecValueRequest(
        @NotNull(message = "Product id is required for every spec value.")
        Long productId,

        @NotBlank(message = "Spec value is required.")
        @Size(max = 200, message = "Spec value must be at most 200 characters.")
        String value,

        SpecTier tier
) {
}
```

Create `backend/src/main/java/com/twogofindz/backend/dto/request/ComparisonSpecRowRequest.java`:

```java
package com.twogofindz.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ComparisonSpecRowRequest(
        @NotBlank(message = "Group label is required.")
        @Size(max = 100, message = "Group label must be at most 100 characters.")
        String groupLabel,

        @NotBlank(message = "Row label is required.")
        @Size(max = 100, message = "Row label must be at most 100 characters.")
        String rowLabel,

        @NotEmpty(message = "Each spec row must include at least one value.")
        @Valid
        List<ComparisonSpecValueRequest> values
) {
}
```

Create `backend/src/main/java/com/twogofindz/backend/dto/request/ComparisonSectionRequest.java`:

```java
package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ComparisonSectionRequest(
        @NotBlank(message = "Section heading is required.")
        @Size(max = 150, message = "Section heading must be at most 150 characters.")
        String heading,

        @NotBlank(message = "Section body is required.")
        String body
) {
}
```

Create `backend/src/main/java/com/twogofindz/backend/dto/request/ComparisonFaqRequest.java`:

```java
package com.twogofindz.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ComparisonFaqRequest(
        @NotBlank(message = "Question is required.")
        @Size(max = 300, message = "Question must be at most 300 characters.")
        String question,

        @NotBlank(message = "Answer is required.")
        String answer
) {
}
```

Create `backend/src/main/java/com/twogofindz/backend/dto/request/ComparisonRequest.java`:

```java
package com.twogofindz.backend.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ComparisonRequest(
        @NotBlank(message = "Title is required.")
        @Size(max = 200, message = "Title must be at most 200 characters.")
        String title,

        @Pattern(regexp = "^$|^[a-z0-9]+(-[a-z0-9]+)*$", message = "Slug must be lowercase letters, numbers, and hyphens only.")
        @Size(max = 220, message = "Slug must be at most 220 characters.")
        String slug,

        @NotBlank(message = "Description is required.")
        @Size(max = 500, message = "Description must be at most 500 characters.")
        String description,

        @Size(max = 255, message = "Cover image filename must be at most 255 characters.")
        String coverImageFilename,

        @NotNull(message = "Category is required.")
        Long categoryId,

        @Size(max = 200, message = "SEO title must be at most 200 characters.")
        String seoTitle,

        @Size(max = 300, message = "SEO description must be at most 300 characters.")
        String seoDescription,

        @NotNull(message = "Published flag is required.")
        Boolean published,

        @NotNull(message = "Products list is required.")
        @Size(min = 2, message = "A comparison must include at least 2 products.")
        @Valid
        List<ComparisonProductRequest> products,

        @NotNull(message = "Spec rows list is required.")
        @Valid
        List<ComparisonSpecRowRequest> specRows,

        @NotNull(message = "Sections list is required.")
        @Valid
        List<ComparisonSectionRequest> sections,

        @NotNull(message = "FAQs list is required.")
        @Valid
        List<ComparisonFaqRequest> faqs,

        @NotNull(message = "Related comparisons list is required.")
        @Size(max = 8, message = "You can select at most 8 related comparisons.")
        List<Long> relatedComparisonIds,

        @NotNull(message = "Related products list is required.")
        @Size(max = 8, message = "You can select at most 8 related products.")
        List<Long> relatedProductIds
) {
}
```

- [ ] **Step 4: Create the response DTOs**

Create `backend/src/main/java/com/twogofindz/backend/dto/response/ComparisonProductResponse.java`:

```java
package com.twogofindz.backend.dto.response;

import java.math.BigDecimal;

public record ComparisonProductResponse(
        Long id,
        ProductResponse product,
        String badge,
        String recommendation,
        String bestFor,
        String mainStrength,
        String mainWeakness,
        String pros,
        String cons,
        BigDecimal editorsScore
) {
}
```

Create `backend/src/main/java/com/twogofindz/backend/dto/response/ComparisonSpecValueResponse.java`:

```java
package com.twogofindz.backend.dto.response;

import com.twogofindz.backend.entity.SpecTier;

public record ComparisonSpecValueResponse(
        Long productId,
        String value,
        SpecTier tier
) {
}
```

Create `backend/src/main/java/com/twogofindz/backend/dto/response/ComparisonSpecRowResponse.java`:

```java
package com.twogofindz.backend.dto.response;

import java.util.List;

public record ComparisonSpecRowResponse(
        Long id,
        String groupLabel,
        String rowLabel,
        List<ComparisonSpecValueResponse> values
) {
}
```

Create `backend/src/main/java/com/twogofindz/backend/dto/response/ComparisonSectionResponse.java`:

```java
package com.twogofindz.backend.dto.response;

public record ComparisonSectionResponse(
        Long id,
        String heading,
        String body
) {
}
```

Create `backend/src/main/java/com/twogofindz/backend/dto/response/ComparisonFaqResponse.java`:

```java
package com.twogofindz.backend.dto.response;

public record ComparisonFaqResponse(
        Long id,
        String question,
        String answer
) {
}
```

Create `backend/src/main/java/com/twogofindz/backend/dto/response/ComparisonSummaryResponse.java`:

```java
package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;

public record ComparisonSummaryResponse(
        Long id,
        String title,
        String slug,
        String description,
        String coverImageFilename,
        Long categoryId,
        String categoryName,
        Boolean published,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
```

Create `backend/src/main/java/com/twogofindz/backend/dto/response/ComparisonResponse.java`:

```java
package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record ComparisonResponse(
        Long id,
        String title,
        String slug,
        String description,
        String coverImageFilename,
        Long categoryId,
        String categoryName,
        String seoTitle,
        String seoDescription,
        Boolean published,
        List<ComparisonProductResponse> products,
        List<ComparisonSpecRowResponse> specRows,
        List<ComparisonSectionResponse> sections,
        List<ComparisonFaqResponse> faqs,
        List<ComparisonSummaryResponse> relatedComparisons,
        List<ProductResponse> relatedProducts,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
```

- [ ] **Step 5: Create `InvalidComparisonException.java` and wire it into `GlobalExceptionHandler`**

Create `backend/src/main/java/com/twogofindz/backend/exception/InvalidComparisonException.java`:

```java
package com.twogofindz.backend.exception;

public class InvalidComparisonException extends RuntimeException {
    public InvalidComparisonException(String message) {
        super(message);
    }
}
```

Modify `backend/src/main/java/com/twogofindz/backend/exception/GlobalExceptionHandler.java`: add this handler method immediately after `handleInvalidFile`:

```java
    @ExceptionHandler(InvalidComparisonException.class)
    public ResponseEntity<ApiResponse<Void>> handleInvalidComparison(InvalidComparisonException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.failure(ex.getMessage()));
    }
```

(No new import needed — `InvalidComparisonException` is already in the same `com.twogofindz.backend.exception` package as `GlobalExceptionHandler`.)

- [ ] **Step 6: Create `ComparisonMapper.java`**

```java
package com.twogofindz.backend.mapper;

import com.twogofindz.backend.dto.response.ComparisonFaqResponse;
import com.twogofindz.backend.dto.response.ComparisonProductResponse;
import com.twogofindz.backend.dto.response.ComparisonResponse;
import com.twogofindz.backend.dto.response.ComparisonSectionResponse;
import com.twogofindz.backend.dto.response.ComparisonSpecRowResponse;
import com.twogofindz.backend.dto.response.ComparisonSpecValueResponse;
import com.twogofindz.backend.dto.response.ComparisonSummaryResponse;
import com.twogofindz.backend.entity.Comparison;
import com.twogofindz.backend.entity.ComparisonFaq;
import com.twogofindz.backend.entity.ComparisonProduct;
import com.twogofindz.backend.entity.ComparisonSection;
import com.twogofindz.backend.entity.ComparisonSpecRow;
import com.twogofindz.backend.entity.ComparisonSpecValue;
import org.springframework.stereotype.Component;

@Component
public class ComparisonMapper {

    private final ProductMapper productMapper;

    public ComparisonMapper(ProductMapper productMapper) {
        this.productMapper = productMapper;
    }

    public ComparisonResponse toResponse(Comparison comparison) {
        return new ComparisonResponse(
                comparison.getId(),
                comparison.getTitle(),
                comparison.getSlug(),
                comparison.getDescription(),
                comparison.getCoverImageFilename(),
                comparison.getCategory().getId(),
                comparison.getCategory().getProductCategoryName(),
                comparison.getSeoTitle(),
                comparison.getSeoDescription(),
                comparison.getPublished(),
                comparison.getProducts().stream().map(this::toProductResponse).toList(),
                comparison.getSpecRows().stream().map(this::toSpecRowResponse).toList(),
                comparison.getSections().stream().map(this::toSectionResponse).toList(),
                comparison.getFaqs().stream().map(this::toFaqResponse).toList(),
                comparison.getRelatedComparisons().stream().map(this::toSummary).toList(),
                comparison.getRelatedProducts().stream().map(productMapper::toResponse).toList(),
                comparison.getCreatedAt(),
                comparison.getUpdatedAt()
        );
    }

    public ComparisonSummaryResponse toSummary(Comparison comparison) {
        return new ComparisonSummaryResponse(
                comparison.getId(),
                comparison.getTitle(),
                comparison.getSlug(),
                comparison.getDescription(),
                comparison.getCoverImageFilename(),
                comparison.getCategory().getId(),
                comparison.getCategory().getProductCategoryName(),
                comparison.getPublished(),
                comparison.getCreatedAt(),
                comparison.getUpdatedAt()
        );
    }

    ComparisonProductResponse toProductResponse(ComparisonProduct product) {
        return new ComparisonProductResponse(
                product.getId(),
                productMapper.toResponse(product.getProduct()),
                product.getBadge(),
                product.getRecommendation(),
                product.getBestFor(),
                product.getMainStrength(),
                product.getMainWeakness(),
                product.getPros(),
                product.getCons(),
                product.getEditorsScore()
        );
    }

    ComparisonSpecRowResponse toSpecRowResponse(ComparisonSpecRow row) {
        return new ComparisonSpecRowResponse(
                row.getId(),
                row.getGroupLabel(),
                row.getRowLabel(),
                row.getValues().stream().map(this::toSpecValueResponse).toList()
        );
    }

    private ComparisonSpecValueResponse toSpecValueResponse(ComparisonSpecValue value) {
        return new ComparisonSpecValueResponse(value.getProduct().getId(), value.getValue(), value.getTier());
    }

    ComparisonSectionResponse toSectionResponse(ComparisonSection section) {
        return new ComparisonSectionResponse(section.getId(), section.getHeading(), section.getBody());
    }

    ComparisonFaqResponse toFaqResponse(ComparisonFaq faq) {
        return new ComparisonFaqResponse(faq.getId(), faq.getQuestion(), faq.getAnswer());
    }
}
```

(Note: `toProductResponse`, `toSpecRowResponse`, `toSectionResponse`, `toFaqResponse` are package-private rather than `private` so Task 4 can reuse them from the same class when adding public-mapping methods — no cross-class visibility issue since Task 4 only modifies this same file.)

- [ ] **Step 7: Create `ComparisonService.java`**

```java
package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.request.ComparisonRequest;
import com.twogofindz.backend.dto.response.ComparisonResponse;
import com.twogofindz.backend.dto.response.ComparisonSummaryResponse;

import java.util.List;

public interface ComparisonService {

    ComparisonResponse create(ComparisonRequest request);

    ComparisonResponse getByIdForAdmin(Long id);

    List<ComparisonSummaryResponse> getAllForAdmin();
}
```

- [ ] **Step 8: Create `ComparisonServiceImpl.java`**

```java
package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.ComparisonFaqRequest;
import com.twogofindz.backend.dto.request.ComparisonProductRequest;
import com.twogofindz.backend.dto.request.ComparisonRequest;
import com.twogofindz.backend.dto.request.ComparisonSectionRequest;
import com.twogofindz.backend.dto.request.ComparisonSpecRowRequest;
import com.twogofindz.backend.dto.request.ComparisonSpecValueRequest;
import com.twogofindz.backend.dto.response.ComparisonResponse;
import com.twogofindz.backend.dto.response.ComparisonSummaryResponse;
import com.twogofindz.backend.entity.Comparison;
import com.twogofindz.backend.entity.ComparisonFaq;
import com.twogofindz.backend.entity.ComparisonProduct;
import com.twogofindz.backend.entity.ComparisonSection;
import com.twogofindz.backend.entity.ComparisonSpecRow;
import com.twogofindz.backend.entity.ComparisonSpecValue;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.entity.ProductCategory;
import com.twogofindz.backend.entity.SpecTier;
import com.twogofindz.backend.exception.DuplicateResourceException;
import com.twogofindz.backend.exception.InvalidComparisonException;
import com.twogofindz.backend.exception.ResourceNotFoundException;
import com.twogofindz.backend.mapper.ComparisonMapper;
import com.twogofindz.backend.repository.ComparisonRepository;
import com.twogofindz.backend.repository.ProductCategoryRepository;
import com.twogofindz.backend.repository.ProductRepository;
import com.twogofindz.backend.service.ComparisonService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ComparisonServiceImpl implements ComparisonService {

    private final ComparisonRepository comparisonRepository;
    private final ProductRepository productRepository;
    private final ProductCategoryRepository productCategoryRepository;
    private final ComparisonMapper comparisonMapper;

    public ComparisonServiceImpl(ComparisonRepository comparisonRepository,
                                  ProductRepository productRepository,
                                  ProductCategoryRepository productCategoryRepository,
                                  ComparisonMapper comparisonMapper) {
        this.comparisonRepository = comparisonRepository;
        this.productRepository = productRepository;
        this.productCategoryRepository = productCategoryRepository;
        this.comparisonMapper = comparisonMapper;
    }

    @Override
    @Transactional
    public ComparisonResponse create(ComparisonRequest request) {
        validateSpecRowsMatchProducts(request);

        ProductCategory category = findCategory(request.categoryId());
        String slug = resolveSlug(request.slug(), request.title(), null);

        Comparison comparison = Comparison.builder()
                .title(request.title())
                .slug(slug)
                .description(request.description())
                .coverImageFilename(request.coverImageFilename())
                .category(category)
                .seoTitle(request.seoTitle())
                .seoDescription(request.seoDescription())
                .published(request.published())
                .build();

        comparison.setProducts(buildProducts(comparison, request.products()));
        comparison.setSpecRows(buildSpecRows(comparison, request.specRows()));
        comparison.setSections(buildSections(comparison, request.sections()));
        comparison.setFaqs(buildFaqs(comparison, request.faqs()));
        comparison.setRelatedComparisons(resolveRelatedComparisons(request.relatedComparisonIds(), null));
        comparison.setRelatedProducts(resolveRelatedProducts(request.relatedProductIds()));

        return comparisonMapper.toResponse(comparisonRepository.save(comparison));
    }

    @Override
    @Transactional(readOnly = true)
    public ComparisonResponse getByIdForAdmin(Long id) {
        return comparisonMapper.toResponse(findEntityById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ComparisonSummaryResponse> getAllForAdmin() {
        return comparisonRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(comparisonMapper::toSummary)
                .toList();
    }

    void validateSpecRowsMatchProducts(ComparisonRequest request) {
        Set<Long> productIds = request.products().stream()
                .map(ComparisonProductRequest::productId)
                .collect(Collectors.toSet());
        for (ComparisonSpecRowRequest row : request.specRows()) {
            Set<Long> valueProductIds = row.values().stream()
                    .map(ComparisonSpecValueRequest::productId)
                    .collect(Collectors.toSet());
            if (row.values().size() != productIds.size() || !valueProductIds.equals(productIds)) {
                throw new InvalidComparisonException(
                        "Spec row \"" + row.rowLabel() + "\" must have exactly one value for every product in the comparison.");
            }
        }
    }

    ProductCategory findCategory(Long categoryId) {
        return productCategoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + categoryId));
    }

    String resolveSlug(String requestedSlug, String title, Long excludeId) {
        String slug = (requestedSlug == null || requestedSlug.isBlank()) ? slugify(title) : requestedSlug;
        boolean taken = excludeId == null
                ? comparisonRepository.existsBySlug(slug)
                : comparisonRepository.existsBySlugAndIdNot(slug, excludeId);
        if (taken) {
            throw new DuplicateResourceException("A comparison with slug \"" + slug + "\" already exists.");
        }
        return slug;
    }

    private String slugify(String title) {
        String base = title.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return base.isBlank() ? "comparison" : base;
    }

    List<ComparisonProduct> buildProducts(Comparison comparison, List<ComparisonProductRequest> requests) {
        List<ComparisonProduct> products = new ArrayList<>();
        for (ComparisonProductRequest req : requests) {
            Product product = productRepository.findById(req.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + req.productId()));
            products.add(ComparisonProduct.builder()
                    .comparison(comparison)
                    .product(product)
                    .badge(req.badge())
                    .recommendation(req.recommendation())
                    .bestFor(req.bestFor())
                    .mainStrength(req.mainStrength())
                    .mainWeakness(req.mainWeakness())
                    .pros(req.pros())
                    .cons(req.cons())
                    .editorsScore(req.editorsScore())
                    .build());
        }
        return products;
    }

    List<ComparisonSpecRow> buildSpecRows(Comparison comparison, List<ComparisonSpecRowRequest> requests) {
        List<ComparisonSpecRow> rows = new ArrayList<>();
        for (ComparisonSpecRowRequest req : requests) {
            ComparisonSpecRow row = ComparisonSpecRow.builder()
                    .comparison(comparison)
                    .groupLabel(req.groupLabel())
                    .rowLabel(req.rowLabel())
                    .build();
            List<ComparisonSpecValue> values = new ArrayList<>();
            for (ComparisonSpecValueRequest valueReq : req.values()) {
                Product product = productRepository.findById(valueReq.productId())
                        .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + valueReq.productId()));
                values.add(ComparisonSpecValue.builder()
                        .specRow(row)
                        .product(product)
                        .value(valueReq.value())
                        .tier(valueReq.tier() != null ? valueReq.tier() : SpecTier.STANDARD)
                        .build());
            }
            row.setValues(values);
            rows.add(row);
        }
        return rows;
    }

    List<ComparisonSection> buildSections(Comparison comparison, List<ComparisonSectionRequest> requests) {
        List<ComparisonSection> sections = new ArrayList<>();
        for (ComparisonSectionRequest req : requests) {
            sections.add(ComparisonSection.builder()
                    .comparison(comparison)
                    .heading(req.heading())
                    .body(req.body())
                    .build());
        }
        return sections;
    }

    List<ComparisonFaq> buildFaqs(Comparison comparison, List<ComparisonFaqRequest> requests) {
        List<ComparisonFaq> faqs = new ArrayList<>();
        for (ComparisonFaqRequest req : requests) {
            faqs.add(ComparisonFaq.builder()
                    .comparison(comparison)
                    .question(req.question())
                    .answer(req.answer())
                    .build());
        }
        return faqs;
    }

    List<Comparison> resolveRelatedComparisons(List<Long> ids, Long selfId) {
        // Must be mutable: Hibernate clears and repopulates this collection in place when
        // merging an @OrderColumn @ManyToMany association (same reasoning as BuyingGuide's
        // resolveProducts) -- an immutable list throws UnsupportedOperationException on update.
        List<Comparison> ordered = new ArrayList<>();
        if (ids.isEmpty()) {
            return ordered;
        }
        if (selfId != null && ids.contains(selfId)) {
            throw new InvalidComparisonException("A comparison cannot be related to itself.");
        }
        List<Comparison> found = comparisonRepository.findAllById(ids);
        for (Long id : ids) {
            found.stream().filter(c -> c.getId().equals(id)).findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Related comparison not found with id: " + id));
        }
        for (Long id : ids) {
            found.stream().filter(c -> c.getId().equals(id)).findFirst().ifPresent(ordered::add);
        }
        return ordered;
    }

    List<Product> resolveRelatedProducts(List<Long> ids) {
        List<Product> ordered = new ArrayList<>();
        if (ids.isEmpty()) {
            return ordered;
        }
        List<Product> found = productRepository.findAllById(ids);
        for (Long id : ids) {
            found.stream().filter(p -> p.getId().equals(id)).findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Related product not found with id: " + id));
        }
        for (Long id : ids) {
            found.stream().filter(p -> p.getId().equals(id)).findFirst().ifPresent(ordered::add);
        }
        return ordered;
    }

    Comparison findEntityById(Long id) {
        return comparisonRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Comparison not found with id: " + id));
    }
}
```

(Note: several helper methods are package-private rather than `private` so Task 3 can add `update`/`delete` in the same class without needing to duplicate logic, and so Task 4 can add the public-read methods — no cross-class visibility issue since both later tasks only modify this same file.)

- [ ] **Step 9: Create `AdminComparisonController.java`**

```java
package com.twogofindz.backend.controller.admin;

import com.twogofindz.backend.dto.request.ComparisonRequest;
import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.ComparisonResponse;
import com.twogofindz.backend.dto.response.ComparisonSummaryResponse;
import com.twogofindz.backend.service.ComparisonService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/comparisons")
public class AdminComparisonController {

    private final ComparisonService comparisonService;

    public AdminComparisonController(ComparisonService comparisonService) {
        this.comparisonService = comparisonService;
    }

    @GetMapping
    public ApiResponse<List<ComparisonSummaryResponse>> getAll() {
        return ApiResponse.success("Comparisons retrieved successfully.", comparisonService.getAllForAdmin());
    }

    @GetMapping("/{id}")
    public ApiResponse<ComparisonResponse> getById(@PathVariable Long id) {
        return ApiResponse.success("Comparison retrieved successfully.", comparisonService.getByIdForAdmin(id));
    }

    @PostMapping
    public ApiResponse<ComparisonResponse> create(@Valid @RequestBody ComparisonRequest request) {
        return ApiResponse.success("Comparison created successfully.", comparisonService.create(request));
    }
}
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test -Dtest=AdminComparisonControllerTest`
Expected: PASS (9 tests)

- [ ] **Step 11: Run the full backend suite**

Run: `cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test`
Expected: PASS — every prior test plus these 9 (93 total).

- [ ] **Step 12: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/dto/request/ComparisonProductRequest.java \
        backend/src/main/java/com/twogofindz/backend/dto/request/ComparisonSpecValueRequest.java \
        backend/src/main/java/com/twogofindz/backend/dto/request/ComparisonSpecRowRequest.java \
        backend/src/main/java/com/twogofindz/backend/dto/request/ComparisonSectionRequest.java \
        backend/src/main/java/com/twogofindz/backend/dto/request/ComparisonFaqRequest.java \
        backend/src/main/java/com/twogofindz/backend/dto/request/ComparisonRequest.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/ComparisonProductResponse.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/ComparisonSpecValueResponse.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/ComparisonSpecRowResponse.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/ComparisonSectionResponse.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/ComparisonFaqResponse.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/ComparisonSummaryResponse.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/ComparisonResponse.java \
        backend/src/main/java/com/twogofindz/backend/exception/InvalidComparisonException.java \
        backend/src/main/java/com/twogofindz/backend/exception/GlobalExceptionHandler.java \
        backend/src/main/java/com/twogofindz/backend/mapper/ComparisonMapper.java \
        backend/src/main/java/com/twogofindz/backend/service/ComparisonService.java \
        backend/src/main/java/com/twogofindz/backend/service/impl/ComparisonServiceImpl.java \
        backend/src/main/java/com/twogofindz/backend/controller/admin/AdminComparisonController.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/AdminComparisonControllerTest.java
git commit -m "feat: add Comparison admin create and read endpoints"
```

---

### Task 3: Admin update + delete

**Files:**
- Modify: `backend/src/main/java/com/twogofindz/backend/service/ComparisonService.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/ComparisonServiceImpl.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/controller/admin/AdminComparisonController.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminComparisonControllerTest.java`

**Interfaces:**
- Consumes: everything from Task 2 (`ComparisonServiceImpl`'s package-private `buildProducts`/`buildSpecRows`/`buildSections`/`buildFaqs`/`resolveRelatedComparisons`/`resolveRelatedProducts`/`resolveSlug`/`findCategory`/`findEntityById`/`validateSpecRowsMatchProducts`, `AdminComparisonControllerTest.validRequest`/`createProductId`).
- Produces: `ComparisonService.update(Long, ComparisonRequest)`, `delete(Long)`; `PUT /api/admin/comparisons/{id}`, `DELETE /api/admin/comparisons/{id}`. Used only by Stage 2 (admin UI), not by any later task in this plan.

- [ ] **Step 1: Write the failing tests**

Modify `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminComparisonControllerTest.java`: add these imports:

```java
import com.twogofindz.backend.entity.SpecTier;
```

(already present) and these static imports alongside the existing ones:

```java
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
```

Add these test methods (after `getAll_includesCreatedComparison`, before the `validRequest` helper method):

```java
    @Test
    void update_succeeds_andReplacesNestedState() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Comparison Update Category");
        Long productAId = createProductId(token, categoryId, "Comparison Update Product A");
        Long productBId = createProductId(token, categoryId, "Comparison Update Product B");
        Long productCId = createProductId(token, categoryId, "Comparison Update Product C");

        ComparisonRequest createRequest = validRequest(categoryId, productAId, productBId, "comparison-update-test");
        MvcResult createResult = mockMvc.perform(post("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andReturn();
        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString()).path("data").path("id").asLong();

        ComparisonProductRequest reorderedFirst = new ComparisonProductRequest(
                productCId, "New Badge", "Updated recommendation.", "New audience", "New strength", "New weakness",
                "Pro one", "Con one", new BigDecimal("9.0"));
        ComparisonProductRequest reorderedSecond = new ComparisonProductRequest(
                productAId, null, "Still solid.", "Everyone", "Speed", "Price", null, null, null);

        ComparisonSpecRowRequest updatedRow = new ComparisonSpecRowRequest(
                "Build Quality", "Material",
                List.of(
                        new ComparisonSpecValueRequest(productCId, "Aluminum", SpecTier.BEST),
                        new ComparisonSpecValueRequest(productAId, "Plastic", SpecTier.STANDARD)));

        ComparisonRequest updateRequest = new ComparisonRequest(
                "Comparison Update Test Updated", "comparison-update-test", "Updated description.", null, categoryId,
                null, null, true,
                List.of(reorderedFirst, reorderedSecond),
                List.of(updatedRow),
                List.of(new ComparisonSectionRequest("Final Verdict", "Product C wins overall.")),
                List.of(),
                List.of(), List.of());

        mockMvc.perform(put("/api/admin/comparisons/" + id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Comparison Update Test Updated"))
                .andExpect(jsonPath("$.data.products", hasSize(2)))
                .andExpect(jsonPath("$.data.products[0].product.id").value(productCId))
                .andExpect(jsonPath("$.data.products[1].product.id").value(productAId))
                .andExpect(jsonPath("$.data.specRows", hasSize(1)))
                .andExpect(jsonPath("$.data.specRows[0].rowLabel").value("Material"))
                .andExpect(jsonPath("$.data.sections", hasSize(1)))
                .andExpect(jsonPath("$.data.faqs", hasSize(0)));
    }

    @Test
    void update_returns404_forUnknownComparison() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Comparison Update Missing Category");
        Long productAId = createProductId(token, categoryId, "Comparison Update Missing Product A");
        Long productBId = createProductId(token, categoryId, "Comparison Update Missing Product B");
        ComparisonRequest request = validRequest(categoryId, productAId, productBId, "comparison-update-missing");

        mockMvc.perform(put("/api/admin/comparisons/999999")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    void update_returns400_whenComparisonRelatesToItself() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Comparison Self Relate Category");
        Long productAId = createProductId(token, categoryId, "Comparison Self Relate Product A");
        Long productBId = createProductId(token, categoryId, "Comparison Self Relate Product B");

        ComparisonRequest createRequest = validRequest(categoryId, productAId, productBId, "comparison-self-relate");
        MvcResult createResult = mockMvc.perform(post("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andReturn();
        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString()).path("data").path("id").asLong();

        ComparisonRequest full = validRequest(categoryId, productAId, productBId, "comparison-self-relate");
        ComparisonRequest selfRelateRequest = new ComparisonRequest(
                full.title(), full.slug(), full.description(), full.coverImageFilename(), full.categoryId(),
                full.seoTitle(), full.seoDescription(), full.published(), full.products(),
                full.specRows(), full.sections(), full.faqs(), List.of(id), List.of());

        mockMvc.perform(put("/api/admin/comparisons/" + id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(selfRelateRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void delete_succeeds_andRemovesFromGetAll() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Comparison Delete Category");
        Long productAId = createProductId(token, categoryId, "Comparison Delete Product A");
        Long productBId = createProductId(token, categoryId, "Comparison Delete Product B");
        ComparisonRequest request = validRequest(categoryId, productAId, productBId, "comparison-delete-test");

        MvcResult createResult = mockMvc.perform(post("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn();
        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString()).path("data").path("id").asLong();

        mockMvc.perform(delete("/api/admin/comparisons/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/comparisons/" + id)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void delete_returns404_forUnknownComparison() throws Exception {
        String token = adminToken();

        mockMvc.perform(delete("/api/admin/comparisons/999999")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test -Dtest=AdminComparisonControllerTest`
Expected: FAIL — `ComparisonService` has no `update`/`delete` methods, `AdminComparisonController` has no `PUT`/`DELETE` mappings.

- [ ] **Step 3: Add `update`/`delete` to `ComparisonService.java`**

Modify `backend/src/main/java/com/twogofindz/backend/service/ComparisonService.java`, adding these two method signatures inside the interface (after `create`):

```java
    ComparisonResponse update(Long id, ComparisonRequest request);

    void delete(Long id);
```

- [ ] **Step 4: Add `update`/`delete` to `ComparisonServiceImpl.java`**

Modify `backend/src/main/java/com/twogofindz/backend/service/impl/ComparisonServiceImpl.java`, adding these two methods (after `create`, before `getByIdForAdmin`):

```java
    @Override
    @Transactional
    public ComparisonResponse update(Long id, ComparisonRequest request) {
        validateSpecRowsMatchProducts(request);

        Comparison comparison = findEntityById(id);
        ProductCategory category = findCategory(request.categoryId());
        String slug = resolveSlug(request.slug(), request.title(), id);

        comparison.setTitle(request.title());
        comparison.setSlug(slug);
        comparison.setDescription(request.description());
        comparison.setCoverImageFilename(request.coverImageFilename());
        comparison.setCategory(category);
        comparison.setSeoTitle(request.seoTitle());
        comparison.setSeoDescription(request.seoDescription());
        comparison.setPublished(request.published());
        comparison.setProducts(buildProducts(comparison, request.products()));
        comparison.setSpecRows(buildSpecRows(comparison, request.specRows()));
        comparison.setSections(buildSections(comparison, request.sections()));
        comparison.setFaqs(buildFaqs(comparison, request.faqs()));
        comparison.setRelatedComparisons(resolveRelatedComparisons(request.relatedComparisonIds(), id));
        comparison.setRelatedProducts(resolveRelatedProducts(request.relatedProductIds()));

        return comparisonMapper.toResponse(comparisonRepository.save(comparison));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        comparisonRepository.delete(findEntityById(id));
    }
```

- [ ] **Step 5: Add `PUT`/`DELETE` to `AdminComparisonController.java`**

Modify `backend/src/main/java/com/twogofindz/backend/controller/admin/AdminComparisonController.java`: add these imports:

```java
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PutMapping;
```

Add these two methods (after `create`):

```java
    @PutMapping("/{id}")
    public ApiResponse<ComparisonResponse> update(@PathVariable Long id, @Valid @RequestBody ComparisonRequest request) {
        return ApiResponse.success("Comparison updated successfully.", comparisonService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        comparisonService.delete(id);
        return ApiResponse.success("Comparison deleted successfully.");
    }
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test -Dtest=AdminComparisonControllerTest`
Expected: PASS (14 tests: the original 9 plus these 5)

- [ ] **Step 7: Run the full backend suite**

Run: `cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test`
Expected: PASS (98 total)

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/service/ComparisonService.java \
        backend/src/main/java/com/twogofindz/backend/service/impl/ComparisonServiceImpl.java \
        backend/src/main/java/com/twogofindz/backend/controller/admin/AdminComparisonController.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/AdminComparisonControllerTest.java
git commit -m "feat: add Comparison admin update and delete endpoints"
```

---

### Task 4: Public endpoints

**Files:**
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/PublicComparisonSummaryResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/PublicComparisonDetailResponse.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/mapper/ComparisonMapper.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/ComparisonService.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/ComparisonServiceImpl.java`
- Create: `backend/src/main/java/com/twogofindz/backend/controller/publicapi/PublicComparisonController.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicComparisonControllerTest.java`

**Interfaces:**
- Consumes: `ComparisonRepository.findByPublishedTrueOrderByCreatedAtDesc()`/`findBySlug(String)` (Task 1), `ComparisonMapper`'s package-private `toProductResponse`/`toSpecRowResponse`/`toSectionResponse`/`toFaqResponse`/`toSummary` (Task 2).
- Produces: `GET /api/public/comparisons`, `GET /api/public/comparisons/{slug}` — this is the final task of Stage 1; nothing in this plan depends on it further.

- [ ] **Step 1: Write the failing tests**

Create `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicComparisonControllerTest.java`:

```java
package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.dto.request.ComparisonFaqRequest;
import com.twogofindz.backend.dto.request.ComparisonProductRequest;
import com.twogofindz.backend.dto.request.ComparisonRequest;
import com.twogofindz.backend.dto.request.ComparisonSectionRequest;
import com.twogofindz.backend.dto.request.ComparisonSpecRowRequest;
import com.twogofindz.backend.dto.request.ComparisonSpecValueRequest;
import com.twogofindz.backend.dto.request.ProductRequest;
import com.twogofindz.backend.entity.SpecTier;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PublicComparisonControllerTest extends AbstractIntegrationTest {

    @Test
    void getAll_returnsOnlyPublishedComparisons() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Public Comparison Category A");
        Long productAId = createProductId(token, categoryId, "Public Comparison Product A");
        Long productBId = createProductId(token, categoryId, "Public Comparison Product B");

        createComparison(token, categoryId, productAId, productBId, "public-comparison-published", true);
        createComparison(token, categoryId, productAId, productBId, "public-comparison-draft", false);

        mockMvc.perform(get("/api/public/comparisons"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.slug == 'public-comparison-published')]").exists())
                .andExpect(jsonPath("$.data[?(@.slug == 'public-comparison-draft')]").doesNotExist());
    }

    @Test
    void getBySlug_returns404_forDraftComparison() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Public Comparison Category B");
        Long productAId = createProductId(token, categoryId, "Public Comparison Product C");
        Long productBId = createProductId(token, categoryId, "Public Comparison Product D");
        createComparison(token, categoryId, productAId, productBId, "public-comparison-draft-detail", false);

        mockMvc.perform(get("/api/public/comparisons/public-comparison-draft-detail"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getBySlug_returns404_forUnknownSlug() throws Exception {
        mockMvc.perform(get("/api/public/comparisons/does-not-exist"))
                .andExpect(status().isNotFound());
    }

    @Test
    void getBySlug_returnsPublishedComparison_withFullNestedStructure() throws Exception {
        String token = adminToken();
        Long categoryId = createCategoryId(token, "Public Comparison Category C");
        Long productAId = createProductId(token, categoryId, "Public Comparison Product E");
        Long productBId = createProductId(token, categoryId, "Public Comparison Product F");
        createComparison(token, categoryId, productAId, productBId, "public-comparison-full-detail", true);

        mockMvc.perform(get("/api/public/comparisons/public-comparison-full-detail"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("Public Comparison Full Detail"))
                .andExpect(jsonPath("$.data.products.length()").value(2))
                .andExpect(jsonPath("$.data.specRows.length()").value(1))
                .andExpect(jsonPath("$.data.sections.length()").value(1))
                .andExpect(jsonPath("$.data.faqs.length()").value(1));
    }

    private void createComparison(String token, Long categoryId, Long productAId, Long productBId,
                                   String slug, boolean published) throws Exception {
        ComparisonProductRequest productA = new ComparisonProductRequest(
                productAId, "Best Overall", "Great overall pick.", "Everyone", "Speed", "Price",
                "Fast", "Expensive", new BigDecimal("8.5"));
        ComparisonProductRequest productB = new ComparisonProductRequest(
                productBId, "Best Budget", "Great budget pick.", "Budget shoppers", "Price", "Speed",
                "Cheap", "Slower", new BigDecimal("7.0"));
        ComparisonSpecRowRequest specRow = new ComparisonSpecRowRequest(
                "Performance", "Speed",
                List.of(
                        new ComparisonSpecValueRequest(productAId, "Fast", SpecTier.BEST),
                        new ComparisonSpecValueRequest(productBId, "Moderate", SpecTier.STANDARD)));
        ComparisonSectionRequest section = new ComparisonSectionRequest("Buying Tips", "Consider your budget first.");
        ComparisonFaqRequest faq = new ComparisonFaqRequest("Which is better?", "It depends on your budget.");

        String[] words = slug.split("-");
        StringBuilder title = new StringBuilder();
        for (String word : words) {
            title.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1)).append(' ');
        }

        ComparisonRequest request = new ComparisonRequest(
                title.toString().trim(), slug, "A test comparison used for automated testing.", null, categoryId,
                null, null, published,
                List.of(productA, productB), List.of(specRow), List.of(section), List.of(faq),
                List.of(), List.of());

        mockMvc.perform(post("/api/admin/comparisons")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    private Long createProductId(String token, Long categoryId, String name) throws Exception {
        ProductRequest request = new ProductRequest(
                name, "Description for " + name, categoryId, null,
                new BigDecimal("19.99"), "https://example.com/" + name.replace(" ", "-"),
                false, false, true);
        MvcResult result = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).path("data").path("id").asLong();
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test -Dtest=PublicComparisonControllerTest`
Expected: FAIL — compilation error, `PublicComparisonController` and the public DTOs don't exist yet.

- [ ] **Step 3: Create the public response DTOs**

Create `backend/src/main/java/com/twogofindz/backend/dto/response/PublicComparisonSummaryResponse.java`:

```java
package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;

public record PublicComparisonSummaryResponse(
        Long id,
        String title,
        String slug,
        String description,
        String coverImageFilename,
        String categoryName,
        LocalDateTime createdAt
) {
}
```

Create `backend/src/main/java/com/twogofindz/backend/dto/response/PublicComparisonDetailResponse.java`:

```java
package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record PublicComparisonDetailResponse(
        Long id,
        String title,
        String slug,
        String description,
        String coverImageFilename,
        String categoryName,
        String seoTitle,
        String seoDescription,
        List<ComparisonProductResponse> products,
        List<ComparisonSpecRowResponse> specRows,
        List<ComparisonSectionResponse> sections,
        List<ComparisonFaqResponse> faqs,
        List<ComparisonSummaryResponse> relatedComparisons,
        List<ProductResponse> relatedProducts,
        LocalDateTime createdAt
) {
}
```

- [ ] **Step 4: Add public mapping methods to `ComparisonMapper.java`**

Modify `backend/src/main/java/com/twogofindz/backend/mapper/ComparisonMapper.java`: add these two imports:

```java
import com.twogofindz.backend.dto.response.PublicComparisonDetailResponse;
import com.twogofindz.backend.dto.response.PublicComparisonSummaryResponse;
```

Add these two methods (after `toSummary`):

```java
    public PublicComparisonSummaryResponse toPublicSummary(Comparison comparison) {
        return new PublicComparisonSummaryResponse(
                comparison.getId(),
                comparison.getTitle(),
                comparison.getSlug(),
                comparison.getDescription(),
                comparison.getCoverImageFilename(),
                comparison.getCategory().getProductCategoryName(),
                comparison.getCreatedAt()
        );
    }

    public PublicComparisonDetailResponse toPublicDetail(Comparison comparison) {
        return new PublicComparisonDetailResponse(
                comparison.getId(),
                comparison.getTitle(),
                comparison.getSlug(),
                comparison.getDescription(),
                comparison.getCoverImageFilename(),
                comparison.getCategory().getProductCategoryName(),
                comparison.getSeoTitle(),
                comparison.getSeoDescription(),
                comparison.getProducts().stream().map(this::toProductResponse).toList(),
                comparison.getSpecRows().stream().map(this::toSpecRowResponse).toList(),
                comparison.getSections().stream().map(this::toSectionResponse).toList(),
                comparison.getFaqs().stream().map(this::toFaqResponse).toList(),
                // Only expose related comparisons that are themselves publicly visible, so a
                // draft linked as "related" from the admin panel never renders as a dead link.
                comparison.getRelatedComparisons().stream()
                        .filter(Comparison::getPublished)
                        .map(this::toSummary)
                        .toList(),
                comparison.getRelatedProducts().stream().map(productMapper::toResponse).toList(),
                comparison.getCreatedAt()
        );
    }
```

- [ ] **Step 5: Add public methods to `ComparisonService.java`**

Modify `backend/src/main/java/com/twogofindz/backend/service/ComparisonService.java`: add these imports:

```java
import com.twogofindz.backend.dto.response.PublicComparisonDetailResponse;
import com.twogofindz.backend.dto.response.PublicComparisonSummaryResponse;
```

Add these two method signatures (after `delete`):

```java
    List<PublicComparisonSummaryResponse> getAllForPublic();

    PublicComparisonDetailResponse getBySlugForPublic(String slug);
```

- [ ] **Step 6: Implement the public methods in `ComparisonServiceImpl.java`**

Modify `backend/src/main/java/com/twogofindz/backend/service/impl/ComparisonServiceImpl.java`: add these imports:

```java
import com.twogofindz.backend.dto.response.PublicComparisonDetailResponse;
import com.twogofindz.backend.dto.response.PublicComparisonSummaryResponse;
```

Add these two methods (after `delete`):

```java
    @Override
    @Transactional(readOnly = true)
    public List<PublicComparisonSummaryResponse> getAllForPublic() {
        return comparisonRepository.findByPublishedTrueOrderByCreatedAtDesc().stream()
                .map(comparisonMapper::toPublicSummary)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PublicComparisonDetailResponse getBySlugForPublic(String slug) {
        Comparison comparison = comparisonRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Comparison not found with slug: " + slug));
        // Deliberately identical to the "not found" outcome above: a draft comparison must not
        // be distinguishable from a nonexistent one via the public API (no information leak).
        if (!comparison.getPublished()) {
            throw new ResourceNotFoundException("Comparison not found with slug: " + slug);
        }
        return comparisonMapper.toPublicDetail(comparison);
    }
```

- [ ] **Step 7: Create `PublicComparisonController.java`**

```java
package com.twogofindz.backend.controller.publicapi;

import com.twogofindz.backend.dto.response.ApiResponse;
import com.twogofindz.backend.dto.response.PublicComparisonDetailResponse;
import com.twogofindz.backend.dto.response.PublicComparisonSummaryResponse;
import com.twogofindz.backend.service.ComparisonService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public/comparisons")
public class PublicComparisonController {

    private final ComparisonService comparisonService;

    public PublicComparisonController(ComparisonService comparisonService) {
        this.comparisonService = comparisonService;
    }

    @GetMapping
    public ApiResponse<List<PublicComparisonSummaryResponse>> getAll() {
        return ApiResponse.success("Comparisons retrieved successfully.", comparisonService.getAllForPublic());
    }

    @GetMapping("/{slug}")
    public ApiResponse<PublicComparisonDetailResponse> getBySlug(@PathVariable String slug) {
        return ApiResponse.success("Comparison retrieved successfully.", comparisonService.getBySlugForPublic(slug));
    }
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test -Dtest=PublicComparisonControllerTest`
Expected: PASS (4 tests)

- [ ] **Step 9: Run the full backend suite**

Run: `cd backend && export DOCKER_HOST="unix:///Users/johnrovero/.colima/default/docker.sock" && export TESTCONTAINERS_RYUK_DISABLED=true && mvn test`
Expected: PASS (102 total — this is the final task of Stage 1)

- [ ] **Step 10: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/dto/response/PublicComparisonSummaryResponse.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/PublicComparisonDetailResponse.java \
        backend/src/main/java/com/twogofindz/backend/mapper/ComparisonMapper.java \
        backend/src/main/java/com/twogofindz/backend/service/ComparisonService.java \
        backend/src/main/java/com/twogofindz/backend/service/impl/ComparisonServiceImpl.java \
        backend/src/main/java/com/twogofindz/backend/controller/publicapi/PublicComparisonController.java \
        backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicComparisonControllerTest.java
git commit -m "feat: add Comparison public list and detail endpoints"
```

---

## Stage 1 Completion

After Task 4, use the `superpowers:finishing-a-development-branch` skill: run the full backend suite one more time, then present the merge/push/keep-local choice — matching how every prior stage in this project ended.

Stages 2–4 (admin authoring UI, public page rendering, SEO/UX polish) are separate plans, each starting with its own brainstorm→spec→plan cycle once this stage is merged/pushed.
