# Buying Guide Unified TOC Entries — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `BuyingGuideSectionSetting` (fixed 6-key enum, whole-block toggle/reorder only) and `BuyingGuideAdviceSection` (freeform list always rendered as one lump) with a single unified, ordered `BuyingGuideTocEntry` model, so an admin's custom content blocks (e.g. "How We Tested") can be freely interleaved with the 5 data-backed structural sections (Quick Recommendations, Comparison Table, Top Pick, Runner-Ups, FAQs) in one reorderable table of contents.

**Architecture:** One new entity/table replaces two; `sectionKey` null/non-null is the sole discriminator between a structural row (fixed identity, no title/content) and a custom row (freeform title+content, like `adviceSections` used to be). `BuyingGuideRequest`/`Response` and the public detail response collapse their `sectionSettings`+`adviceSections`/`visibleSectionOrder`+`adviceSections` fields into one `tocEntries` list each. Duplicate structural keys are rejected; missing ones are silently backfilled (`visible = true`, appended in a fixed default order) at save time rather than rejected, preserving today's "you don't have to configure TOC settings to save a guide" ergonomics.

**Tech Stack:** Spring Boot 3.2.5, Java 21, Spring Data JPA/Hibernate 6, MySQL 8, Flyway, Lombok, JUnit 5 + MockMvc + Testcontainers — unchanged from the rest of this feature.

Reference: `docs/superpowers/specs/2026-08-01-buying-guide-unified-toc-design.md` (approved design).

## Global Constraints

- Java 21 / Spring Boot 3.2.5 / MySQL 8 — no other stack changes.
- Flyway migration files live in `backend/src/main/resources/db/migration/`, named `V<n>__description.sql`; next available version is `V16`.
- `section_key` nullable, non-null for structural rows, null for custom rows — the **sole** discriminator; no separate `entry_type` column.
- A structural entry (`sectionKey != null`) may appear **at most once** per guide (rejected as a validation error if duplicated) but is **not required** — omitted structural keys are auto-appended at save time with `visible = true`, in the fixed order `QUICK_RECOMMENDATIONS, COMPARISON_TABLE, TOP_PICK, RUNNER_UPS, FAQS`.
- A structural entry must have `title == null && content == null`; a custom entry (`sectionKey == null`) requires non-blank `title` (max 150 chars) and non-blank `content`. Both are service-layer checks in `validateRequest()`, not Bean Validation annotations (cross-field, same pattern as the existing top-pick-count/comparison-completeness checks).
- `content` on custom entries is sanitized server-side with the existing `HtmlSanitizer.sanitize(...)`, same as `introduction`/`whyRecommended`/FAQ content.
- Nothing is deployed yet (confirmed in the spec) — the migration is a clean drop-and-recreate, no data-preservation/backfill SQL needed.
- Entities: Lombok `@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder`, `@GeneratedValue(strategy = GenerationType.IDENTITY)` on `id` — matches every other child entity in this feature.
- Deletion: cascade via `orphanRemoval = true` on the owning `BuyingGuide.tocEntries` collection, same as every other child list in this feature — a custom entry omitted from an update's `tocEntries` list is genuinely deleted (title + content gone), matching the "confirm before deleting" UX being purely a frontend concern.
- Task 1 intentionally leaves the project **not compiling** (`BuyingGuideServiceImpl`/`BuyingGuideMapper` still reference the removed entity/DTO shapes) — this is expected and resolved in Task 2, exactly mirroring the precedent already established in `docs/superpowers/plans/2026-07-29-buying-guides-upgrade-backend-plan.md` (Task 5 → Task 6).

---

### Task 1: Schema, entity, and DTO layer for the unified TOC model

Replaces the data layer only. `BuyingGuideServiceImpl` and `BuyingGuideMapper` (main sources) still reference the removed types at the end of this task — the project will not compile until Task 2. This is expected; do not attempt to fix it here.

**Files:**
- Create: `backend/src/main/resources/db/migration/V16__replace_section_settings_and_advice_sections_with_toc_entries.sql`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideTocEntry.java`
- Delete: `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideSectionSetting.java`
- Delete: `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideAdviceSection.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideSectionKey.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuide.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideTocEntryRequest.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideTocEntryResponse.java`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideTocEntryResponse.java`
- Delete: `backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideSectionSettingRequest.java`
- Delete: `backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideSectionSettingResponse.java`
- Delete: `backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideAdviceSectionRequest.java`
- Delete: `backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideAdviceSectionResponse.java`
- Delete: `backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideAdviceSectionResponse.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideRequest.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideResponse.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideDetailResponse.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/repository/BuyingGuideRepositoryTest.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/dto/request/BuyingGuideSectionRequestValidationTest.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java` (mechanical arity fix only — 12 positional `new BuyingGuideRequest(...)` call sites)
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java` (mechanical arity fix only — 4 positional call sites)

**Interfaces:**
- Produces: `BuyingGuide.getTocEntries()/setTocEntries(List<BuyingGuideTocEntry>)`; `BuyingGuideTocEntry.getSectionKey()/getTitle()/getContent()/isVisible()` and their setters; `BuyingGuideRequest.tocEntries(): List<BuyingGuideTocEntryRequest>` (replacing `.adviceSections()`/`.sectionSettings()`); `BuyingGuideResponse.tocEntries(): List<BuyingGuideTocEntryResponse>`; `PublicBuyingGuideDetailResponse.tocEntries(): List<PublicBuyingGuideTocEntryResponse>` (replacing `.adviceSections()`/`.visibleSectionOrder()`). Task 2's service/mapper rewrite consumes these exact names.

- [ ] **Step 1: Write the failing test — `BuyingGuideRepositoryTest`**

Replace the file entirely:

```java
package com.twogofindz.backend.repository;

import com.twogofindz.backend.AbstractIntegrationTest;
import com.twogofindz.backend.entity.BuyingGuide;
import com.twogofindz.backend.entity.BuyingGuideComparisonSpec;
import com.twogofindz.backend.entity.BuyingGuideComparisonValue;
import com.twogofindz.backend.entity.BuyingGuideFaq;
import com.twogofindz.backend.entity.BuyingGuideQuickRecommendation;
import com.twogofindz.backend.entity.BuyingGuideRecommendationItem;
import com.twogofindz.backend.entity.BuyingGuideRecommendationSection;
import com.twogofindz.backend.entity.BuyingGuideSectionKey;
import com.twogofindz.backend.entity.BuyingGuideTocEntry;
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

        BuyingGuideFaq faq = BuyingGuideFaq.builder()
                .buyingGuide(guide).question("Is it worth it?").answer("Yes.").build();
        guide.setFaqs(new ArrayList<>(List.of(faq)));

        BuyingGuideTocEntry structuralEntry = BuyingGuideTocEntry.builder()
                .buyingGuide(guide).sectionKey(BuyingGuideSectionKey.FAQS).visible(true).build();
        BuyingGuideTocEntry customEntry = BuyingGuideTocEntry.builder()
                .buyingGuide(guide).title("What to Look For").content("Look for good battery life.").visible(true).build();
        guide.setTocEntries(new ArrayList<>(List.of(structuralEntry, customEntry)));

        BuyingGuide saved = buyingGuideRepository.saveAndFlush(guide);
        entityManager.clear();

        BuyingGuide reloaded = buyingGuideRepository.findById(saved.getId()).orElseThrow();
        assertThat(reloaded.getQuickRecommendations()).hasSize(1);
        assertThat(reloaded.getComparisonSpecs()).hasSize(1);
        assertThat(reloaded.getComparisonSpecs().get(0).getValues()).hasSize(1);
        assertThat(reloaded.getRecommendationSections()).hasSize(1);
        assertThat(reloaded.getRecommendationSections().get(0).getItems()).hasSize(1);
        assertThat(reloaded.getFaqs()).hasSize(1);
        assertThat(reloaded.getTocEntries()).hasSize(2);
        assertThat(reloaded.getTocEntries().get(0).getSectionKey()).isEqualTo(BuyingGuideSectionKey.FAQS);
        assertThat(reloaded.getTocEntries().get(1).getTitle()).isEqualTo("What to Look For");

        Long guideId = saved.getId();
        buyingGuideRepository.delete(reloaded);
        buyingGuideRepository.flush();

        Long remainingFaqs = entityManager.createQuery(
                        "select count(f) from BuyingGuideFaq f where f.buyingGuide.id = :guideId", Long.class)
                .setParameter("guideId", guideId)
                .getSingleResult();
        assertThat(remainingFaqs).isZero();

        Long remainingTocEntries = entityManager.createQuery(
                        "select count(t) from BuyingGuideTocEntry t where t.buyingGuide.id = :guideId", Long.class)
                .setParameter("guideId", guideId)
                .getSingleResult();
        assertThat(remainingTocEntries).isZero();

        Product stillExists = productRepository.findById(product.getId()).orElseThrow();
        assertThat(stillExists).isNotNull();
    }
}
```

- [ ] **Step 2: Confirm the test fails to compile**

Run: `cd backend && mvn -q test-compile`
Expected: FAIL — `com.twogofindz.backend.entity.BuyingGuideTocEntry` doesn't exist yet.

- [ ] **Step 3: Add the migration**

`backend/src/main/resources/db/migration/V16__replace_section_settings_and_advice_sections_with_toc_entries.sql`:

```sql
DROP TABLE buying_guide_advice_sections;
DROP TABLE buying_guide_section_settings;

CREATE TABLE buying_guide_toc_entries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    buying_guide_id BIGINT NOT NULL,
    section_key VARCHAR(30) NULL,
    title VARCHAR(150) NULL,
    content TEXT NULL,
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_bg_toc_entries_guide FOREIGN KEY (buying_guide_id) REFERENCES buying_guides (id) ON DELETE CASCADE,
    CONSTRAINT uq_bg_toc_entries_guide_key UNIQUE (buying_guide_id, section_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_bg_toc_entries_guide ON buying_guide_toc_entries (buying_guide_id);
```

(MySQL treats every `NULL` in a unique index as distinct from every other value, so `uq_bg_toc_entries_guide_key` only constrains non-null `section_key` values to one row per guide — custom entries, where `section_key` is `NULL`, are unaffected and can repeat freely.)

- [ ] **Step 4: Update `BuyingGuideSectionKey`**

`backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideSectionKey.java` — remove `BUYING_ADVICE`:

```java
package com.twogofindz.backend.entity;

public enum BuyingGuideSectionKey {
    QUICK_RECOMMENDATIONS,
    COMPARISON_TABLE,
    TOP_PICK,
    RUNNER_UPS,
    FAQS
}
```

- [ ] **Step 5: Add the `BuyingGuideTocEntry` entity**

`backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideTocEntry.java`:

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
@Table(name = "buying_guide_toc_entries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuyingGuideTocEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "buying_guide_id", nullable = false)
    private BuyingGuide buyingGuide;

    @Enumerated(EnumType.STRING)
    @Column(name = "section_key", columnDefinition = "VARCHAR(30)")
    private BuyingGuideSectionKey sectionKey;

    @Column(length = 150)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    private boolean visible;
}
```

Delete `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideSectionSetting.java` and `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideAdviceSection.java`.

- [ ] **Step 6: Wire `tocEntries` onto `BuyingGuide`**

In `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuide.java`, replace:

```java
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

with:

```java
    @OneToMany(mappedBy = "buyingGuide", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderColumn(name = "display_order")
    private List<BuyingGuideFaq> faqs;

    @OneToMany(mappedBy = "buyingGuide", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderColumn(name = "display_order")
    private List<BuyingGuideTocEntry> tocEntries;
```

(No import changes needed — `CascadeType`/`OneToMany`/`OrderColumn` are already imported.)

- [ ] **Step 7: Add the `BuyingGuideTocEntryRequest`/`Response` and `PublicBuyingGuideTocEntryResponse` DTOs**

`backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideTocEntryRequest.java`:

```java
package com.twogofindz.backend.dto.request;

import com.twogofindz.backend.entity.BuyingGuideSectionKey;
import jakarta.validation.constraints.Size;

public record BuyingGuideTocEntryRequest(
        BuyingGuideSectionKey sectionKey,

        @Size(max = 150, message = "Section title must be at most 150 characters.")
        String title,

        String content,

        boolean visible
) {
}
```

(`title`/`content` are conditionally required depending on `sectionKey` — that cross-field rule is a service-layer check in Task 2, not expressible as a plain Bean Validation annotation here.)

`backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideTocEntryResponse.java`:

```java
package com.twogofindz.backend.dto.response;

import com.twogofindz.backend.entity.BuyingGuideSectionKey;

public record BuyingGuideTocEntryResponse(
        Long id,
        BuyingGuideSectionKey sectionKey,
        String title,
        String content,
        boolean visible
) {
}
```

`backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideTocEntryResponse.java`:

```java
package com.twogofindz.backend.dto.response;

import com.twogofindz.backend.entity.BuyingGuideSectionKey;

public record PublicBuyingGuideTocEntryResponse(
        BuyingGuideSectionKey sectionKey,
        String title,
        String content
) {
}
```

Delete `BuyingGuideSectionSettingRequest.java`, `BuyingGuideSectionSettingResponse.java`, `BuyingGuideAdviceSectionRequest.java`, `BuyingGuideAdviceSectionResponse.java`, `PublicBuyingGuideAdviceSectionResponse.java` from `dto/request`/`dto/response`.

- [ ] **Step 8: Update `BuyingGuideRequest`**

Replace the last two fields (`adviceSections`, `sectionSettings`) in `backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideRequest.java`:

```java
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

with:

```java
        @NotNull(message = "Recommendation sections list is required.")
        @Valid
        List<BuyingGuideRecommendationSectionRequest> recommendationSections,

        @NotNull(message = "FAQs list is required.")
        @Valid
        List<BuyingGuideFaqRequest> faqs,

        @NotNull(message = "Table of contents entries list is required.")
        @Valid
        List<BuyingGuideTocEntryRequest> tocEntries
) {
}
```

- [ ] **Step 9: Update `BuyingGuideResponse`**

In `backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideResponse.java`, replace:

```java
        List<BuyingGuideRecommendationSectionResponse> recommendationSections,
        List<BuyingGuideAdviceSectionResponse> adviceSections,
        List<BuyingGuideFaqResponse> faqs,
        List<BuyingGuideSectionSettingResponse> sectionSettings,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
```

with:

```java
        List<BuyingGuideRecommendationSectionResponse> recommendationSections,
        List<BuyingGuideFaqResponse> faqs,
        List<BuyingGuideTocEntryResponse> tocEntries,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
```

- [ ] **Step 10: Update `PublicBuyingGuideDetailResponse`**

Replace the file:

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
        List<ProductResponse> recommendedProducts,
        List<PublicBuyingGuideQuickRecommendationResponse> quickRecommendations,
        PublicBuyingGuideComparisonTableResponse comparisonTable,
        PublicBuyingGuideRecommendationSectionResponse topPick,
        List<PublicBuyingGuideRecommendationSectionResponse> runnerUps,
        List<PublicBuyingGuideFaqResponse> faqs,
        List<PublicBuyingGuideTocEntryResponse> tocEntries
) {
}
```

(`BuyingGuideSectionKey` import is no longer needed here — the old `visibleSectionOrder: List<BuyingGuideSectionKey>` field is gone.)

- [ ] **Step 11: Update `BuyingGuideSectionRequestValidationTest`**

In `backend/src/test/java/com/twogofindz/backend/dto/request/BuyingGuideSectionRequestValidationTest.java`, remove the `adviceSectionRequest_rejectsBlankTitle` test method (references the deleted `BuyingGuideAdviceSectionRequest`):

```java
    @Test
    void adviceSectionRequest_rejectsBlankTitle() {
        BuyingGuideAdviceSectionRequest request = new BuyingGuideAdviceSectionRequest("", "Some content.");
        Set<ConstraintViolation<BuyingGuideAdviceSectionRequest>> violations = VALIDATOR.validate(request);
        assertThat(violations).isNotEmpty();
    }
```

Replace it with:

```java
    @Test
    void tocEntryRequest_rejectsTitleOverMaxLength() {
        String tooLongTitle = "a".repeat(151);
        BuyingGuideTocEntryRequest request = new BuyingGuideTocEntryRequest(null, tooLongTitle, "Some content.", true);
        Set<ConstraintViolation<BuyingGuideTocEntryRequest>> violations = VALIDATOR.validate(request);
        assertThat(violations).isNotEmpty();
    }
```

- [ ] **Step 12: Mechanically fix positional `new BuyingGuideRequest(...)` call sites**

Every existing positional call in `AdminBuyingGuideControllerTest.java` (12 occurrences) and `PublicBuyingGuideControllerTest.java` (4 occurrences) currently ends its trailing argument list with 6 empty lists: `List.of(), List.of(), List.of(), List.of(), List.of(), List.of())` — for `quickRecommendations, comparisonSpecs, recommendationSections, adviceSections, faqs, sectionSettings`. Since `adviceSections` and `sectionSettings` are now one `tocEntries` field, drop exactly one `List.of(), ` from that trailing run of 6, leaving 5:

Before (representative example, from `AdminBuyingGuideControllerTest.java`):
```java
                true, null, List.of(secondProductId, firstProductId),
                List.of(), List.of(), List.of(), List.of(), List.of(), List.of());
```
After:
```java
                true, null, List.of(secondProductId, firstProductId),
                List.of(), List.of(), List.of(), List.of(), List.of());
```

Apply this same trailing-run reduction (6 empty lists → 5 empty lists) at every `new BuyingGuideRequest(` call site in both files. Do not touch the JSON text-block tests (`create_withAllSections_succeeds`, `create_returns400_whenQuickRecommendationReferencesProductNotInGuide`, `create_returns400_whenComparisonSpecMissingValueForAProduct`, `create_returns400_whenMoreThanOneTopPick`, `delete_cascadesChildSections_butNeverDeletesProducts`, `getBySlug_returnsFullNestedStructure_withInheritedTopPickBadge`) — those compile fine as plain strings; their JSON bodies and assertions are rewritten for real in Task 2.

- [ ] **Step 13: Confirm the expected compile failure**

Run: `cd backend && mvn -q compile`
Expected: FAIL — `BuyingGuideServiceImpl.java` and `BuyingGuideMapper.java` (main sources) still reference `BuyingGuideAdviceSection`, `BuyingGuideSectionSetting`, `BuyingGuideAdviceSectionRequest`, `BuyingGuideSectionSettingRequest`, and the now-removed `BuyingGuide.getAdviceSections()`/`.getSectionSettings()`/`BuyingGuideRequest.adviceSections()`/`.sectionSettings()` accessors. **This is expected and resolved in Task 2 — do not attempt to fix it here.** If using subagent-driven-development, note this expected transient failure explicitly when handing off to Task 2's worker.

- [ ] **Step 14: Commit**

```bash
git add backend/src/main/resources/db/migration/V16__replace_section_settings_and_advice_sections_with_toc_entries.sql \
        backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideTocEntry.java \
        backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideSectionKey.java \
        backend/src/main/java/com/twogofindz/backend/entity/BuyingGuide.java \
        backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideTocEntryRequest.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideTocEntryResponse.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideTocEntryResponse.java \
        backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideRequest.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideResponse.java \
        backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideDetailResponse.java \
        backend/src/test/java/com/twogofindz/backend/repository/BuyingGuideRepositoryTest.java \
        backend/src/test/java/com/twogofindz/backend/dto/request/BuyingGuideSectionRequestValidationTest.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java \
        backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java
git rm backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideSectionSetting.java \
       backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideAdviceSection.java \
       backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideSectionSettingRequest.java \
       backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideSectionSettingResponse.java \
       backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideAdviceSectionRequest.java \
       backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideAdviceSectionResponse.java \
       backend/src/main/java/com/twogofindz/backend/dto/response/PublicBuyingGuideAdviceSectionResponse.java
git commit -m "feat(buying-guides): replace section settings and advice sections with unified TOC entries (compile-only, service wiring in next commit)"
```

---

### Task 2: Service and mapper wiring, full test rewrites

Wires `tocEntries` into `BuyingGuideServiceImpl` (validation + build + backfill) and `BuyingGuideMapper` (admin + public responses), then rewrites every test that still asserts on the old shapes plus adds coverage for the new validation/backfill/interleaving/deletion behavior.

**Files:**
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/BuyingGuideServiceImpl.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/mapper/BuyingGuideMapper.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java`

**Interfaces:**
- Consumes: everything produced by Task 1.
- Produces: fully working `POST/PUT /api/admin/buying-guides` and `GET /api/public/buying-guides/{slug}` against the new unified TOC model — the complete deliverable of this plan. No further tasks depend on this one.

- [ ] **Step 1: Write the failing tests — append to `AdminBuyingGuideControllerTest.java`**

First, rewrite the existing `create_withAllSections_succeeds` test's `tocEntries` section — change:

```java
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
```

to:

```java
                  "faqs": [
                    {"question": "Is it worth it?", "answer": "<p>Yes.</p>"}
                  ],
                  "tocEntries": [
                    {"sectionKey": null, "title": "What to Look For", "content": "<p>Look for battery life.</p>", "visible": true},
                    {"sectionKey": "FAQS", "title": null, "content": null, "visible": true}
                  ]
                }
                """.formatted(guideCategoryId, topPickProductId, runnerUpProductId, topPickProductId,
                topPickProductId, runnerUpProductId, topPickProductId, runnerUpProductId);
```

and change its assertions — replace:

```java
                .andExpect(jsonPath("$.data.adviceSections[0].title").value("What to Look For"))
                .andExpect(jsonPath("$.data.faqs[0].question").value("Is it worth it?"))
                .andExpect(jsonPath("$.data.sectionSettings[0].sectionKey").value("FAQS"));
```

with:

```java
                .andExpect(jsonPath("$.data.faqs[0].question").value("Is it worth it?"))
                .andExpect(jsonPath("$.data.tocEntries[0].title").value("What to Look For"))
                .andExpect(jsonPath("$.data.tocEntries[1].sectionKey").value("FAQS"));
```

Next, in every remaining JSON text-block test, replace the trailing `"adviceSections": [], ... "sectionSettings": []` (or equivalent empty-list pair) with a single `"tocEntries": []`. Specifically:

In `create_returns400_whenQuickRecommendationReferencesProductNotInGuide`, change:
```java
                  "comparisonSpecs": [], "recommendationSections": [], "adviceSections": [],
                  "faqs": [], "sectionSettings": []
                }
```
to:
```java
                  "comparisonSpecs": [], "recommendationSections": [],
                  "faqs": [], "tocEntries": []
                }
```

In `create_returns400_whenComparisonSpecMissingValueForAProduct`, change:
```java
                  "recommendationSections": [], "adviceSections": [], "faqs": [], "sectionSettings": []
                }
```
to:
```java
                  "recommendationSections": [], "faqs": [], "tocEntries": []
                }
```

In `create_returns400_whenMoreThanOneTopPick`, change:
```java
                  "adviceSections": [], "faqs": [], "sectionSettings": []
                }
```
to:
```java
                  "faqs": [], "tocEntries": []
                }
```

In `delete_cascadesChildSections_butNeverDeletesProducts`, change:
```java
                  "comparisonSpecs": [], "recommendationSections": [], "adviceSections": [],
                  "faqs": [{"question": "Q?", "answer": "A."}], "sectionSettings": []
                }
```
to:
```java
                  "comparisonSpecs": [], "recommendationSections": [],
                  "faqs": [{"question": "Q?", "answer": "A."}], "tocEntries": []
                }
```

Then add these new test methods at the end of the class body, before the closing brace:

```java
    @Test
    void create_omittingStructuralKeys_backfillsAllFiveAsVisible() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Backfill Guide Category");

        BuyingGuideRequest request = new BuyingGuideRequest(
                "Backfill Guide", "backfill-guide", "Excerpt", "Introduction", null,
                guideCategoryId, null, null, true, null, List.of(),
                List.of(), List.of(), List.of(), List.of(), List.of());

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tocEntries", org.hamcrest.Matchers.hasSize(5)))
                .andExpect(jsonPath("$.data.tocEntries[?(@.sectionKey == 'FAQS')].visible")
                        .value(org.hamcrest.Matchers.contains(true)));
    }

    @Test
    void create_returns400_whenStructuralKeyDuplicated() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Duplicate TOC Key Guide Category");

        String requestJson = """
                {
                  "title": "Duplicate TOC Key Guide", "slug": "duplicate-toc-key-guide",
                  "excerpt": "Excerpt", "introduction": "Introduction", "coverImageFilename": null,
                  "categoryId": %d, "seoTitle": null, "seoDescription": null, "active": true,
                  "scheduledPublishAt": null, "recommendedProductIds": [],
                  "quickRecommendations": [], "comparisonSpecs": [], "recommendationSections": [], "faqs": [],
                  "tocEntries": [
                    {"sectionKey": "FAQS", "title": null, "content": null, "visible": true},
                    {"sectionKey": "FAQS", "title": null, "content": null, "visible": true}
                  ]
                }
                """.formatted(guideCategoryId);

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns400_whenStructuralEntryHasCustomTitle() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Structural With Title Guide Category");

        String requestJson = """
                {
                  "title": "Structural With Title Guide", "slug": "structural-with-title-guide",
                  "excerpt": "Excerpt", "introduction": "Introduction", "coverImageFilename": null,
                  "categoryId": %d, "seoTitle": null, "seoDescription": null, "active": true,
                  "scheduledPublishAt": null, "recommendedProductIds": [],
                  "quickRecommendations": [], "comparisonSpecs": [], "recommendationSections": [], "faqs": [],
                  "tocEntries": [
                    {"sectionKey": "FAQS", "title": "Not Allowed", "content": null, "visible": true}
                  ]
                }
                """.formatted(guideCategoryId);

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_returns400_whenCustomEntryMissingContent() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Custom Entry Missing Content Guide Category");

        String requestJson = """
                {
                  "title": "Custom Entry Missing Content Guide", "slug": "custom-entry-missing-content-guide",
                  "excerpt": "Excerpt", "introduction": "Introduction", "coverImageFilename": null,
                  "categoryId": %d, "seoTitle": null, "seoDescription": null, "active": true,
                  "scheduledPublishAt": null, "recommendedProductIds": [],
                  "quickRecommendations": [], "comparisonSpecs": [], "recommendationSections": [], "faqs": [],
                  "tocEntries": [
                    {"sectionKey": null, "title": "How We Tested", "content": "", "visible": true}
                  ]
                }
                """.formatted(guideCategoryId);

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_withCustomEntryInterleavedBetweenStructuralEntries_roundTripsOrder() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Interleaved TOC Guide Category");

        String requestJson = """
                {
                  "title": "Interleaved TOC Guide", "slug": "interleaved-toc-guide",
                  "excerpt": "Excerpt", "introduction": "Introduction", "coverImageFilename": null,
                  "categoryId": %d, "seoTitle": null, "seoDescription": null, "active": true,
                  "scheduledPublishAt": null, "recommendedProductIds": [],
                  "quickRecommendations": [], "comparisonSpecs": [], "recommendationSections": [], "faqs": [],
                  "tocEntries": [
                    {"sectionKey": "QUICK_RECOMMENDATIONS", "title": null, "content": null, "visible": true},
                    {"sectionKey": null, "title": "How We Tested", "content": "<p>We tested it.</p>", "visible": true},
                    {"sectionKey": "FAQS", "title": null, "content": null, "visible": true},
                    {"sectionKey": null, "title": "Final Recommendation", "content": "<p>Buy it.</p>", "visible": true},
                    {"sectionKey": "COMPARISON_TABLE", "title": null, "content": null, "visible": true},
                    {"sectionKey": "TOP_PICK", "title": null, "content": null, "visible": true},
                    {"sectionKey": "RUNNER_UPS", "title": null, "content": null, "visible": true}
                  ]
                }
                """.formatted(guideCategoryId);

        mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tocEntries", org.hamcrest.Matchers.hasSize(7)))
                .andExpect(jsonPath("$.data.tocEntries[0].sectionKey").value("QUICK_RECOMMENDATIONS"))
                .andExpect(jsonPath("$.data.tocEntries[1].title").value("How We Tested"))
                .andExpect(jsonPath("$.data.tocEntries[2].sectionKey").value("FAQS"))
                .andExpect(jsonPath("$.data.tocEntries[3].title").value("Final Recommendation"))
                .andExpect(jsonPath("$.data.tocEntries[4].sectionKey").value("COMPARISON_TABLE"));
    }

    @Test
    void update_removingCustomTocEntry_deletesIt() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Remove Custom TOC Entry Guide Category");

        String createJson = """
                {
                  "title": "Remove Custom TOC Entry Guide", "slug": "remove-custom-toc-entry-guide",
                  "excerpt": "Excerpt", "introduction": "Introduction", "coverImageFilename": null,
                  "categoryId": %d, "seoTitle": null, "seoDescription": null, "active": true,
                  "scheduledPublishAt": null, "recommendedProductIds": [],
                  "quickRecommendations": [], "comparisonSpecs": [], "recommendationSections": [], "faqs": [],
                  "tocEntries": [
                    {"sectionKey": null, "title": "How We Tested", "content": "<p>We tested it.</p>", "visible": true}
                  ]
                }
                """.formatted(guideCategoryId);

        var createResult = mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(createJson))
                .andExpect(jsonPath("$.data.tocEntries[?(@.title == 'How We Tested')]").exists())
                .andReturn();
        Long id = objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asLong();

        String updateJson = """
                {
                  "title": "Remove Custom TOC Entry Guide", "slug": "remove-custom-toc-entry-guide",
                  "excerpt": "Excerpt", "introduction": "Introduction", "coverImageFilename": null,
                  "categoryId": %d, "seoTitle": null, "seoDescription": null, "active": true,
                  "scheduledPublishAt": null, "recommendedProductIds": [],
                  "quickRecommendations": [], "comparisonSpecs": [], "recommendationSections": [], "faqs": [],
                  "tocEntries": []
                }
                """.formatted(guideCategoryId);

        mockMvc.perform(put("/api/admin/buying-guides/{id}", id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(updateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.tocEntries[?(@.title == 'How We Tested')]").doesNotExist())
                .andExpect(jsonPath("$.data.tocEntries", org.hamcrest.Matchers.hasSize(5)));
    }
```

Now update `PublicBuyingGuideControllerTest.java`'s `getBySlug_returnsFullNestedStructure_withInheritedTopPickBadge` — change:

```java
                  "adviceSections": [{"title": "What to Look For", "content": "<p>Look for battery life.</p>"}],
                  "faqs": [{"question": "Is it worth it?", "answer": "<p>Yes.</p>"}],
                  "sectionSettings": []
                }
```

to:

```java
                  "faqs": [{"question": "Is it worth it?", "answer": "<p>Yes.</p>"}],
                  "tocEntries": [
                    {"sectionKey": null, "title": "What to Look For", "content": "<p>Look for battery life.</p>", "visible": true}
                  ]
                }
```

and change its assertions — replace:

```java
                .andExpect(jsonPath("$.data.adviceSections[0].title").value("What to Look For"))
                .andExpect(jsonPath("$.data.faqs[0].question").value("Is it worth it?"))
                .andExpect(jsonPath("$.data.visibleSectionOrder", org.hamcrest.Matchers.hasItem("TOP_PICK")));
```

with:

```java
                .andExpect(jsonPath("$.data.faqs[0].question").value("Is it worth it?"))
                .andExpect(jsonPath("$.data.tocEntries[0].title").value("What to Look For"))
                .andExpect(jsonPath("$.data.tocEntries[0].content").value("<p>Look for battery life.</p>"))
                .andExpect(jsonPath("$.data.tocEntries[?(@.sectionKey == 'TOP_PICK')]").exists());
```

- [ ] **Step 2: Run the tests to verify they fail for the right reason**

Run: `cd backend && mvn -q test -Dtest=AdminBuyingGuideControllerTest,PublicBuyingGuideControllerTest`
Expected: FAIL to compile — `BuyingGuideServiceImpl`/`BuyingGuideMapper` still reference the removed types (the same expected failure carried over from the end of Task 1).

- [ ] **Step 3: Rewrite `BuyingGuideServiceImpl`**

Replace the file entirely:

```java
package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.BuyingGuideComparisonSpecRequest;
import com.twogofindz.backend.dto.request.BuyingGuideComparisonValueRequest;
import com.twogofindz.backend.dto.request.BuyingGuideFaqRequest;
import com.twogofindz.backend.dto.request.BuyingGuideQuickRecommendationRequest;
import com.twogofindz.backend.dto.request.BuyingGuideRecommendationItemRequest;
import com.twogofindz.backend.dto.request.BuyingGuideRecommendationSectionRequest;
import com.twogofindz.backend.dto.request.BuyingGuideRequest;
import com.twogofindz.backend.dto.request.BuyingGuideTocEntryRequest;
import com.twogofindz.backend.dto.response.BuyingGuideResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideDetailResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideSummaryResponse;
import com.twogofindz.backend.entity.BuyingGuide;
import com.twogofindz.backend.entity.BuyingGuideComparisonSpec;
import com.twogofindz.backend.entity.BuyingGuideComparisonValue;
import com.twogofindz.backend.entity.BuyingGuideFaq;
import com.twogofindz.backend.entity.BuyingGuideQuickRecommendation;
import com.twogofindz.backend.entity.BuyingGuideRecommendationItem;
import com.twogofindz.backend.entity.BuyingGuideRecommendationSection;
import com.twogofindz.backend.entity.BuyingGuideSectionKey;
import com.twogofindz.backend.entity.BuyingGuideTocEntry;
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
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class BuyingGuideServiceImpl implements BuyingGuideService {

    private static final List<BuyingGuideSectionKey> DEFAULT_STRUCTURAL_ORDER = List.of(
            BuyingGuideSectionKey.QUICK_RECOMMENDATIONS, BuyingGuideSectionKey.COMPARISON_TABLE,
            BuyingGuideSectionKey.TOP_PICK, BuyingGuideSectionKey.RUNNER_UPS, BuyingGuideSectionKey.FAQS);

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
        guide.setFaqs(buildFaqs(guide, request.faqs()));
        guide.setTocEntries(buildTocEntries(guide, request.tocEntries()));

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

        // These five are owned @OneToMany(cascade=ALL, orphanRemoval=true) children: Hibernate
        // rejects reassigning their collection reference on an already-managed entity, so the
        // replacement must mutate the existing collection in place (same reasoning documented on
        // Comparison's update()).
        guide.getQuickRecommendations().clear();
        guide.getQuickRecommendations().addAll(buildQuickRecommendations(guide, request.quickRecommendations()));
        guide.getComparisonSpecs().clear();
        guide.getComparisonSpecs().addAll(buildComparisonSpecs(guide, request.comparisonSpecs()));
        guide.getRecommendationSections().clear();
        guide.getRecommendationSections().addAll(buildRecommendationSections(guide, request.recommendationSections()));
        guide.getFaqs().clear();
        guide.getFaqs().addAll(buildFaqs(guide, request.faqs()));
        guide.getTocEntries().clear();
        guide.getTocEntries().addAll(buildTocEntries(guide, request.tocEntries()));

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
     * child-section product reference must belong to the guide's own product list, every
     * comparison spec must cover the guide's product set exactly, at most one Top Pick
     * (backstopped at the DB level by the generated-column unique index on
     * buying_guide_recommendation_sections), no duplicate structural TOC section keys
     * (backstopped at the DB level by the unique index on buying_guide_toc_entries), every
     * structural TOC entry must not carry a custom title/content, and every custom TOC entry
     * must have both. Missing structural keys are NOT rejected here — {@link #buildTocEntries}
     * backfills them.
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

        validateTocEntries(request.tocEntries());
    }

    private void validateTocEntries(List<BuyingGuideTocEntryRequest> tocEntries) {
        Set<BuyingGuideSectionKey> seenKeys = new HashSet<>();
        for (BuyingGuideTocEntryRequest entry : tocEntries) {
            if (entry.sectionKey() != null) {
                if (!seenKeys.add(entry.sectionKey())) {
                    throw new InvalidBuyingGuideException(
                            "Section \"" + entry.sectionKey()
                                    + "\" cannot appear more than once in the table of contents.");
                }
                if (entry.title() != null || entry.content() != null) {
                    throw new InvalidBuyingGuideException(
                            "Built-in section \"" + entry.sectionKey()
                                    + "\" cannot have a custom title or content.");
                }
            } else {
                if (entry.title() == null || entry.title().isBlank()) {
                    throw new InvalidBuyingGuideException("Every custom table of contents entry requires a title.");
                }
                if (entry.content() == null || entry.content().isBlank()) {
                    throw new InvalidBuyingGuideException("Every custom table of contents entry requires content.");
                }
            }
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

    private List<BuyingGuideFaq> buildFaqs(BuyingGuide guide, List<BuyingGuideFaqRequest> requests) {
        List<BuyingGuideFaq> result = new ArrayList<>();
        for (BuyingGuideFaqRequest req : requests) {
            result.add(BuyingGuideFaq.builder()
                    .buyingGuide(guide).question(req.question())
                    .answer(HtmlSanitizer.sanitize(req.answer())).build());
        }
        return result;
    }

    /**
     * Builds the guide's TOC entries in the request's given order, then appends any of the 5
     * structural keys the request omitted, each defaulted to {@code visible = true}, in
     * {@link #DEFAULT_STRUCTURAL_ORDER}. This backfill (not rejection) preserves the ergonomics
     * the old {@code resolveVisibleSectionOrder} read-time fallback provided — a caller doesn't
     * have to configure every structural section just to save a guide.
     */
    private List<BuyingGuideTocEntry> buildTocEntries(BuyingGuide guide, List<BuyingGuideTocEntryRequest> requests) {
        List<BuyingGuideTocEntry> result = new ArrayList<>();
        Set<BuyingGuideSectionKey> seenKeys = new HashSet<>();
        for (BuyingGuideTocEntryRequest req : requests) {
            if (req.sectionKey() != null) {
                seenKeys.add(req.sectionKey());
            }
            result.add(BuyingGuideTocEntry.builder()
                    .buyingGuide(guide)
                    .sectionKey(req.sectionKey())
                    .title(req.title())
                    .content(req.sectionKey() == null ? HtmlSanitizer.sanitize(req.content()) : null)
                    .visible(req.visible())
                    .build());
        }
        for (BuyingGuideSectionKey key : DEFAULT_STRUCTURAL_ORDER) {
            if (!seenKeys.contains(key)) {
                result.add(BuyingGuideTocEntry.builder()
                        .buyingGuide(guide).sectionKey(key).visible(true).build());
            }
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

- [ ] **Step 4: Rewrite `BuyingGuideMapper`**

Replace the file entirely:

```java
package com.twogofindz.backend.mapper;

import com.twogofindz.backend.dto.response.BuyingGuideComparisonSpecResponse;
import com.twogofindz.backend.dto.response.BuyingGuideComparisonValueResponse;
import com.twogofindz.backend.dto.response.BuyingGuideFaqResponse;
import com.twogofindz.backend.dto.response.BuyingGuideQuickRecommendationResponse;
import com.twogofindz.backend.dto.response.BuyingGuideRecommendationItemResponse;
import com.twogofindz.backend.dto.response.BuyingGuideRecommendationSectionResponse;
import com.twogofindz.backend.dto.response.BuyingGuideResponse;
import com.twogofindz.backend.dto.response.BuyingGuideTocEntryResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideComparisonRowResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideComparisonTableResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideDetailResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideFaqResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideQuickRecommendationResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideRecommendationSectionResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideSummaryResponse;
import com.twogofindz.backend.dto.response.PublicBuyingGuideTocEntryResponse;
import com.twogofindz.backend.entity.BuyingGuide;
import com.twogofindz.backend.entity.BuyingGuideComparisonSpec;
import com.twogofindz.backend.entity.BuyingGuideComparisonValue;
import com.twogofindz.backend.entity.BuyingGuideFaq;
import com.twogofindz.backend.entity.BuyingGuideQuickRecommendation;
import com.twogofindz.backend.entity.BuyingGuideRecommendationItem;
import com.twogofindz.backend.entity.BuyingGuideRecommendationSection;
import com.twogofindz.backend.entity.BuyingGuideTocEntry;
import com.twogofindz.backend.entity.Product;
import com.twogofindz.backend.entity.RecommendationItemType;
import com.twogofindz.backend.entity.RecommendationType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

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
                guide.getQuickRecommendations().stream().map(this::toQuickRecommendationResponse).toList(),
                guide.getComparisonSpecs().stream().map(this::toComparisonSpecResponse).toList(),
                guide.getRecommendationSections().stream().map(this::toRecommendationSectionResponse).toList(),
                guide.getFaqs().stream().map(this::toFaqResponse).toList(),
                guide.getTocEntries().stream().map(this::toTocEntryResponse).toList(),
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
                guide.getFaqs().stream()
                        .map(faq -> new PublicBuyingGuideFaqResponse(faq.getQuestion(), faq.getAnswer()))
                        .toList(),
                resolveTocEntries(guide)
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

    private BuyingGuideFaqResponse toFaqResponse(BuyingGuideFaq faq) {
        return new BuyingGuideFaqResponse(faq.getId(), faq.getQuestion(), faq.getAnswer());
    }

    private BuyingGuideTocEntryResponse toTocEntryResponse(BuyingGuideTocEntry entry) {
        return new BuyingGuideTocEntryResponse(
                entry.getId(), entry.getSectionKey(), entry.getTitle(), entry.getContent(), entry.isVisible());
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
                .map(BuyingGuideRecommendationItem::getContent)
                .toList();
    }

    /**
     * Walks the guide's persisted TOC order once, filtering out hidden entries, and inlines a
     * custom entry's title/content directly (no separate lookup list) — the public template can
     * render this list top-to-bottom, resolving a structural row's actual content by
     * {@code sectionKey} against the other top-level fields (quickRecommendations,
     * comparisonTable, topPick, runnerUps, faqs).
     */
    private List<PublicBuyingGuideTocEntryResponse> resolveTocEntries(BuyingGuide guide) {
        return guide.getTocEntries().stream()
                .filter(BuyingGuideTocEntry::isVisible)
                .map(entry -> new PublicBuyingGuideTocEntryResponse(
                        entry.getSectionKey(), entry.getTitle(), entry.getContent()))
                .toList();
    }
}
```

- [ ] **Step 5: Run the buying-guide tests**

Run: `cd backend && mvn -q test -Dtest=AdminBuyingGuideControllerTest,PublicBuyingGuideControllerTest,BuyingGuideSectionRequestValidationTest,BuyingGuideRepositoryTest,BuyingGuidePublishSchedulerTest`
Expected: PASS. If a `jsonPath` assertion fails on exact JSON shape, inspect the actual response body in the failure output and adjust the assertion — do not weaken the underlying validation/mapper logic to make a test pass.

- [ ] **Step 6: Run the full suite**

Run: `cd backend && mvn -q test`
Expected: PASS — every test in the module, not just the buying-guide ones.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/service/impl/BuyingGuideServiceImpl.java \
        backend/src/main/java/com/twogofindz/backend/mapper/BuyingGuideMapper.java \
        backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java \
        backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java
git commit -m "feat(buying-guides): wire unified TOC entries into service and mapper"
```

---

## Plan Self-Review

**Spec coverage:** Every section of `docs/superpowers/specs/2026-08-01-buying-guide-unified-toc-design.md` maps to a task — schema/entity (Task 1), request/response DTOs (Task 1), validation delta including the corrected backfill-not-reject rule (Task 2), migration (Task 1), testing (Tasks 1 & 2 together cover repository, DTO-validation, and both controller test files, plus the 4 new behavioral cases the spec's Testing section calls for by name: backfill, duplicate rejection, interleaved round-trip, custom-entry deletion).

**Placeholder scan:** No TBD/TODO; every step has concrete code, an exact `mvn` command, or an exact `git` command.

**Type consistency:** `BuyingGuideTocEntry` getter/setter names (`getSectionKey`/`getTitle`/`getContent`/`isVisible`) used identically across the entity (Task 1), `BuyingGuideRepositoryTest` (Task 1), and both `BuyingGuideServiceImpl`/`BuyingGuideMapper` (Task 2). `BuyingGuideRequest.tocEntries()`/`BuyingGuideResponse.tocEntries()`/`PublicBuyingGuideDetailResponse.tocEntries()` field names match across every consumer. `DEFAULT_STRUCTURAL_ORDER`'s 5 members match `BuyingGuideSectionKey`'s 5 remaining enum constants exactly (after `BUYING_ADVICE` removal in Task 1).

**Known deferred follow-up:** This plan is backend-only. The Stage 2 admin UI (multi-step Buying Guide editor, including the Basic Info page's TOC builder and the Buying Guide Content tab that creates custom `tocEntries`) and Stage 3 public page rendering are separate, later work — not started by this plan.
