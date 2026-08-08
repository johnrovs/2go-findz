# Buying Guide — SEO & Publish Step (Step 8) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the final step of the buying guide editor — editable SEO metadata with a live search preview, a deterministic SEO score with a full analysis panel, guide visibility with real public-API enforcement, a Before You Publish checklist, and a genuinely wired Publish/Schedule/Draft workflow — matching `docs/superpowers/specs/2026-08-03-buying-guide-seo-publish-step-design.md`.

**Architecture:** Backend first (new columns, DTO fields, mapper, visibility enforcement, audit fields, slug-check endpoint), then frontend bottom-up (pure utils → small presentational components → the step assembler → wiring into `BuyingGuideForm.jsx`/`EditorHeader.jsx`/`Stepper.jsx`).

**Tech Stack:** Spring Boot 3.2.5/Java 21/MySQL/Flyway (backend), React 18.3/Vite/Tailwind/Vitest/RTL (frontend). No new dependencies.

## Global Constraints

- Steps 1–7 and their state/validation/routes/API integration are preserved exactly. No redesign of Basic Info, EditorHeader's overall structure, or any other step.
- "Required" fields introduced in this task (SEO Title, Meta Description, Focus Keyword, URL Slug display, Canonical URL) are visually marked required and factor into the SEO score, but **do not add new Publish-blocking validation** beyond the five fields already required since step 1 (title/slug/excerpt/category/introduction). This matches the design doc's "never blocks Save as Draft; only genuine required-field failures block Publish."
- No roles/permissions system is introduced. "Authorization" means the existing JWT-protected `/api/admin/**` routes.
- Deferred, not built: slug-change redirects, sitemap, affiliate-compliance auditing, cross-domain canonical domain registry (simple same-origin check only), image alt text, broken-link/mobile-usability validation, Archive status.
- Every new/modified frontend file gets a colocated `.test.jsx`/`.test.js`. Every new/modified backend class gets integration test coverage via the existing `AbstractIntegrationTest` pattern (no unit-test-only backend layer exists in this codebase today).
- Run `cd frontend && npx vitest run` / `npx eslint .` and `cd backend && mvn test` after each task; fix regressions before moving on.

---

### Task 1: Backend data model foundation

**Files:**
- Create: `backend/src/main/resources/db/migration/V18__add_buying_guide_seo_and_visibility_fields.sql`
- Create: `backend/src/main/java/com/twogofindz/backend/entity/Visibility.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuide.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideRequest.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideResponse.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/mapper/BuyingGuideMapper.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/BuyingGuideServiceImpl.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java` (13 positional call sites)
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java` (4 positional call sites)

**Interfaces:**
- Produces: `Visibility` enum (`PUBLIC`, `UNLISTED`, `PRIVATE`); `BuyingGuideRequest`/`BuyingGuideResponse` gain `focusKeyword: String`, `supportingKeywords: List<String>`, `canonicalUrl: String`, `visibility: Visibility`, `robotsIndex: Boolean`, `robotsFollow: Boolean`, `openGraphTitle/Description/ImageFilename: String`, `twitterCardType: String`; `BuyingGuideResponse` additionally gains `publishedAt: LocalDateTime`, `publishedBy: String`, `updatedBy: String` (response-only, not on the request).

- [ ] **Step 1: Write the migration**

```sql
ALTER TABLE buying_guides
    ADD COLUMN focus_keyword VARCHAR(200) NULL,
    ADD COLUMN canonical_url VARCHAR(500) NULL,
    ADD COLUMN visibility VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
    ADD COLUMN robots_index BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN robots_follow BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN open_graph_title VARCHAR(70) NULL,
    ADD COLUMN open_graph_description VARCHAR(200) NULL,
    ADD COLUMN open_graph_image_filename VARCHAR(255) NULL,
    ADD COLUMN twitter_card_type VARCHAR(30) NOT NULL DEFAULT 'summary_large_image',
    ADD COLUMN published_at TIMESTAMP NULL,
    ADD COLUMN published_by VARCHAR(100) NULL,
    ADD COLUMN updated_by VARCHAR(100) NULL;

CREATE TABLE buying_guide_seo_keywords (
    buying_guide_id BIGINT NOT NULL,
    keyword VARCHAR(60) NOT NULL,
    display_order INT NOT NULL,
    PRIMARY KEY (buying_guide_id, display_order),
    CONSTRAINT fk_buying_guide_seo_keywords_guide
        FOREIGN KEY (buying_guide_id) REFERENCES buying_guides (id) ON DELETE CASCADE
);
```

- [ ] **Step 2: Create the `Visibility` enum**

```java
package com.twogofindz.backend.entity;

public enum Visibility {
    PUBLIC,
    UNLISTED,
    PRIVATE
}
```

- [ ] **Step 3: Add the new fields to `BuyingGuide.java`**

Add imports: `jakarta.persistence.CollectionTable`, `jakarta.persistence.ElementCollection`, `jakarta.persistence.EnumType`, `jakarta.persistence.Enumerated`, `java.util.ArrayList`.

Insert after the existing `scheduledPublishAt` field:

```java
    @Column(name = "focus_keyword", length = 200)
    private String focusKeyword;

    @ElementCollection
    @CollectionTable(name = "buying_guide_seo_keywords", joinColumns = @JoinColumn(name = "buying_guide_id"))
    @OrderColumn(name = "display_order")
    @Column(name = "keyword", length = 60)
    private List<String> supportingKeywords;

    @Column(name = "canonical_url", length = 500)
    private String canonicalUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Visibility visibility;

    @Column(name = "robots_index", nullable = false)
    private Boolean robotsIndex;

    @Column(name = "robots_follow", nullable = false)
    private Boolean robotsFollow;

    @Column(name = "open_graph_title", length = 70)
    private String openGraphTitle;

    @Column(name = "open_graph_description", length = 200)
    private String openGraphDescription;

    @Column(name = "open_graph_image_filename")
    private String openGraphImageFilename;

    @Column(name = "twitter_card_type", nullable = false, length = 30)
    private String twitterCardType;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "published_by", length = 100)
    private String publishedBy;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;
```

- [ ] **Step 4: Add the new fields to `BuyingGuideRequest.java`**

Add import `com.twogofindz.backend.entity.Visibility`. Insert after `tocEntries` (before the closing `)`):

```java
        ,
        String focusKeyword,

        @NotNull(message = "Supporting keywords list is required.")
        List<String> supportingKeywords,

        String canonicalUrl,

        @NotNull(message = "Visibility is required.")
        Visibility visibility,

        @NotNull(message = "Robots index flag is required.")
        Boolean robotsIndex,

        @NotNull(message = "Robots follow flag is required.")
        Boolean robotsFollow,

        String openGraphTitle,

        String openGraphDescription,

        String openGraphImageFilename,

        @NotNull(message = "Twitter card type is required.")
        String twitterCardType
```

- [ ] **Step 5: Add the new fields to `BuyingGuideResponse.java`**

Add import `com.twogofindz.backend.entity.Visibility`. Insert after `tocEntries`, before `createdAt`:

```java
        String focusKeyword,
        List<String> supportingKeywords,
        String canonicalUrl,
        Visibility visibility,
        Boolean robotsIndex,
        Boolean robotsFollow,
        String openGraphTitle,
        String openGraphDescription,
        String openGraphImageFilename,
        String twitterCardType,
        LocalDateTime publishedAt,
        String publishedBy,
        String updatedBy,
```

- [ ] **Step 6: Update `BuyingGuideMapper.toResponse`**

Insert the matching positional args after the `tocEntries` line, before `guide.getCreatedAt()`:

```java
                guide.getFocusKeyword(),
                guide.getSupportingKeywords(),
                guide.getCanonicalUrl(),
                guide.getVisibility(),
                guide.getRobotsIndex(),
                guide.getRobotsFollow(),
                guide.getOpenGraphTitle(),
                guide.getOpenGraphDescription(),
                guide.getOpenGraphImageFilename(),
                guide.getTwitterCardType(),
                guide.getPublishedAt(),
                guide.getPublishedBy(),
                guide.getUpdatedBy(),
```

- [ ] **Step 7: Pass the new fields through in `BuyingGuideServiceImpl`**

In `create()`, add to the builder chain after `.scheduledPublishAt(request.scheduledPublishAt())`:

```java
                .focusKeyword(request.focusKeyword())
                .supportingKeywords(new ArrayList<>(request.supportingKeywords()))
                .canonicalUrl(request.canonicalUrl())
                .visibility(request.visibility())
                .robotsIndex(request.robotsIndex())
                .robotsFollow(request.robotsFollow())
                .openGraphTitle(request.openGraphTitle())
                .openGraphDescription(request.openGraphDescription())
                .openGraphImageFilename(request.openGraphImageFilename())
                .twitterCardType(request.twitterCardType())
```

In `update()`, add after `guide.setScheduledPublishAt(request.scheduledPublishAt());`:

```java
        guide.setFocusKeyword(request.focusKeyword());
        guide.setSupportingKeywords(new ArrayList<>(request.supportingKeywords()));
        guide.setCanonicalUrl(request.canonicalUrl());
        guide.setVisibility(request.visibility());
        guide.setRobotsIndex(request.robotsIndex());
        guide.setRobotsFollow(request.robotsFollow());
        guide.setOpenGraphTitle(request.openGraphTitle());
        guide.setOpenGraphDescription(request.openGraphDescription());
        guide.setOpenGraphImageFilename(request.openGraphImageFilename());
        guide.setTwitterCardType(request.twitterCardType());
```

Add import `java.util.ArrayList` if not already present (it is, via existing usage).

- [ ] **Step 8: Fix every existing `new BuyingGuideRequest(...)` call site**

Run `cd backend && mvn test-compile`. Each of the 13 call sites in `AdminBuyingGuideControllerTest.java` and 4 in `PublicBuyingGuideControllerTest.java` will fail with "actual and formal argument lists differ in length," pointing at the exact line. For each, append this exact tuple immediately before the call's closing `)`:

```java
, null, List.of(), null, Visibility.PUBLIC, true, true, null, null, null, "summary_large_image"
```

Add `import com.twogofindz.backend.entity.Visibility;` to both test files.

- [ ] **Step 9: Add a round-trip test**

Add to `AdminBuyingGuideControllerTest.java`:

```java
    @Test
    void update_persistsSeoAndVisibilityFields() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "SEO Fields Guide Category");

        BuyingGuideRequest createRequest = new BuyingGuideRequest(
                "SEO Fields Guide", "seo-fields-guide", "Excerpt", "Introduction", null,
                guideCategoryId, null, null, true, null, List.of(),
                List.of(), List.of(), List.of(), List.of(), List.of(),
                null, List.of(), null, Visibility.PUBLIC, true, true, null, null, null, "summary_large_image");

        String createResponse = mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        Long guideId = objectMapper.readTree(createResponse).path("data").path("id").asLong();

        BuyingGuideRequest updateRequest = new BuyingGuideRequest(
                "SEO Fields Guide", "seo-fields-guide", "Excerpt", "Introduction", null,
                guideCategoryId, null, null, true, null, List.of(),
                List.of(), List.of(), List.of(), List.of(), List.of(),
                "wireless earbuds", List.of("budget", "bluetooth"), "https://2gofindz.com/buying-guides/seo-fields-guide",
                Visibility.UNLISTED, false, true, "Custom OG Title", null, null, "summary");

        mockMvc.perform(put("/api/admin/buying-guides/" + guideId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.focusKeyword").value("wireless earbuds"))
                .andExpect(jsonPath("$.data.supportingKeywords[0]").value("budget"))
                .andExpect(jsonPath("$.data.supportingKeywords[1]").value("bluetooth"))
                .andExpect(jsonPath("$.data.visibility").value("UNLISTED"))
                .andExpect(jsonPath("$.data.robotsIndex").value(false))
                .andExpect(jsonPath("$.data.openGraphTitle").value("Custom OG Title"))
                .andExpect(jsonPath("$.data.twitterCardType").value("summary"));
    }
```

- [ ] **Step 10: Run the full backend suite and commit**

```bash
cd backend && mvn test
git add backend/src/main/resources/db/migration/V18__add_buying_guide_seo_and_visibility_fields.sql \
  backend/src/main/java/com/twogofindz/backend/entity/Visibility.java \
  backend/src/main/java/com/twogofindz/backend/entity/BuyingGuide.java \
  backend/src/main/java/com/twogofindz/backend/dto/request/BuyingGuideRequest.java \
  backend/src/main/java/com/twogofindz/backend/dto/response/BuyingGuideResponse.java \
  backend/src/main/java/com/twogofindz/backend/mapper/BuyingGuideMapper.java \
  backend/src/main/java/com/twogofindz/backend/service/impl/BuyingGuideServiceImpl.java \
  backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java \
  backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java
git commit -m "feat(buying-guides): add SEO metadata, visibility, and social fields to BuyingGuide"
```

---

### Task 2: Audit fields, publish transition, and slug-check endpoint

**Files:**
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/BuyingGuideServiceImpl.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/BuyingGuideService.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideController.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminBuyingGuideControllerTest.java`

**Interfaces:**
- Produces: `BuyingGuideService.isSlugAvailable(String slug, Long excludeId): boolean`; `GET /api/admin/buying-guides/check-slug?slug=&excludeId=` returning `ApiResponse<Boolean>` (`true` = available).
- Consumes: `SecurityContextHolder` (already used by `JwtAuthFilter`; `/api/admin/**` is already `hasRole("ADMIN")`-gated).

- [ ] **Step 1: Add `currentUsername()` and wire audit fields into `create()`/`update()`**

Add import `org.springframework.security.core.context.SecurityContextHolder` to `BuyingGuideServiceImpl`. Add a private helper:

```java
    private String currentUsername() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
```

In `create()`, add to the builder chain (after the `twitterCardType` line from Task 1):

```java
                .updatedBy(currentUsername())
                .publishedAt(Boolean.TRUE.equals(request.active()) ? LocalDateTime.now() : null)
                .publishedBy(Boolean.TRUE.equals(request.active()) ? currentUsername() : null)
```

Add import `java.time.LocalDateTime` (already present via `scheduledPublishAt`).

In `update()`, capture the prior published state at the very top of the method (before any `guide.setXxx` calls):

```java
        boolean wasPublished = Boolean.TRUE.equals(guide.getActive());
```

Then, immediately after `guide.setActive(request.active());`, add:

```java
        guide.setUpdatedBy(currentUsername());
        if (Boolean.TRUE.equals(request.active()) && !wasPublished) {
            guide.setPublishedAt(LocalDateTime.now());
            guide.setPublishedBy(currentUsername());
        }
```

- [ ] **Step 2: Add `isSlugAvailable` to the service interface and implementation**

`BuyingGuideService.java`:

```java
    boolean isSlugAvailable(String slug, Long excludeId);
```

`BuyingGuideServiceImpl.java`:

```java
    @Override
    @Transactional(readOnly = true)
    public boolean isSlugAvailable(String slug, Long excludeId) {
        boolean taken = excludeId == null
                ? buyingGuideRepository.existsBySlug(slug)
                : buyingGuideRepository.existsBySlugAndIdNot(slug, excludeId);
        return !taken;
    }
```

- [ ] **Step 3: Add the controller endpoint**

Add imports `org.springframework.web.bind.annotation.RequestParam` to `AdminBuyingGuideController.java`:

```java
    @GetMapping("/check-slug")
    public ApiResponse<Boolean> checkSlug(
            @RequestParam String slug,
            @RequestParam(required = false) Long excludeId) {
        return ApiResponse.success("Slug availability checked.", buyingGuideService.isSlugAvailable(slug, excludeId));
    }
```

- [ ] **Step 4: Write tests**

Add to `AdminBuyingGuideControllerTest.java`:

```java
    @Test
    void checkSlug_returnsFalse_whenSlugTaken() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Check Slug Guide Category");
        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Taken Slug Guide", "taken-slug", "Excerpt", "Introduction", null,
                        guideCategoryId, null, null, true, null, List.of(),
                        List.of(), List.of(), List.of(), List.of(), List.of(),
                        null, List.of(), null, Visibility.PUBLIC, true, true, null, null, null, "summary_large_image"))));

        mockMvc.perform(get("/api/admin/buying-guides/check-slug").param("slug", "taken-slug")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(false));
    }

    @Test
    void checkSlug_returnsTrue_whenSlugFree() throws Exception {
        String token = adminToken();
        mockMvc.perform(get("/api/admin/buying-guides/check-slug").param("slug", "totally-free-slug")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(true));
    }

    @Test
    void create_and_update_setPublishedAtAndUpdatedBy() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Audit Fields Guide Category");

        String createResponse = mockMvc.perform(post("/api/admin/buying-guides")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                                "Audit Fields Guide", "audit-fields-guide", "Excerpt", "Introduction", null,
                                guideCategoryId, null, null, true, null, List.of(),
                                List.of(), List.of(), List.of(), List.of(), List.of(),
                                null, List.of(), null, Visibility.PUBLIC, true, true, null, null, null, "summary_large_image"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.publishedAt").exists())
                .andExpect(jsonPath("$.data.publishedBy").value("admin"))
                .andExpect(jsonPath("$.data.updatedBy").value("admin"))
                .andReturn().getResponse().getContentAsString();

        assertFalse(createResponse.isBlank());
    }
```

(`"admin"` matches the seeded admin username used by `adminToken()` elsewhere in this file — confirm against `AbstractIntegrationTest.adminToken()`; adjust the literal if it differs.)

- [ ] **Step 5: Run tests and commit**

```bash
cd backend && mvn test
git add -A
git commit -m "feat(buying-guides): track publish/update audit fields and add slug-availability check"
```

---

### Task 3: Public visibility enforcement

**Files:**
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/BuyingGuideServiceImpl.java`
- Modify: `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java`

- [ ] **Step 1: Exclude `UNLISTED` guides from the public listing**

In `getAllForPublic()`:

```java
    @Override
    @Transactional(readOnly = true)
    public List<PublicBuyingGuideSummaryResponse> getAllForPublic() {
        return buyingGuideRepository.findByActiveTrueOrderByCreatedAtDesc().stream()
                .filter(guide -> guide.getVisibility() != Visibility.UNLISTED)
                .map(buyingGuideMapper::toPublicSummary)
                .toList();
    }
```

Add import `com.twogofindz.backend.entity.Visibility`.

- [ ] **Step 2: 404 `PRIVATE` guides in `getBySlugForPublic`**

```java
        if (!guide.getActive() || guide.getVisibility() == Visibility.PRIVATE) {
            throw new ResourceNotFoundException("Buying guide not found with slug: " + slug);
        }
```

- [ ] **Step 3: Write tests**

Add to `PublicBuyingGuideControllerTest.java` (fix its 4 existing positional call sites per Task 1 Step 8 first if not already done):

```java
    @Test
    void getAll_excludesUnlistedGuides() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Unlisted Guide Category");
        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Unlisted Guide", "unlisted-guide", "Excerpt", "Introduction", null,
                        guideCategoryId, null, null, true, null, List.of(),
                        List.of(), List.of(), List.of(), List.of(), List.of(),
                        null, List.of(), null, Visibility.UNLISTED, true, true, null, null, null, "summary_large_image"))));

        mockMvc.perform(get("/api/public/buying-guides"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.slug == 'unlisted-guide')]").isEmpty());
    }

    @Test
    void getBySlug_returnsGuide_forUnlistedGuide() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Unlisted Direct Guide Category");
        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Unlisted Direct Guide", "unlisted-direct-guide", "Excerpt", "Introduction", null,
                        guideCategoryId, null, null, true, null, List.of(),
                        List.of(), List.of(), List.of(), List.of(), List.of(),
                        null, List.of(), null, Visibility.UNLISTED, true, true, null, null, null, "summary_large_image"))));

        mockMvc.perform(get("/api/public/buying-guides/unlisted-direct-guide"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.slug").value("unlisted-direct-guide"));
    }

    @Test
    void getBySlug_returns404_forPrivateGuide() throws Exception {
        String token = adminToken();
        Long guideCategoryId = createCategoryId(token, "Private Guide Category");
        mockMvc.perform(post("/api/admin/buying-guides")
                .header("Authorization", "Bearer " + token)
                .contentType(APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new BuyingGuideRequest(
                        "Private Guide", "private-guide", "Excerpt", "Introduction", null,
                        guideCategoryId, null, null, true, null, List.of(),
                        List.of(), List.of(), List.of(), List.of(), List.of(),
                        null, List.of(), null, Visibility.PRIVATE, true, true, null, null, null, "summary_large_image"))));

        mockMvc.perform(get("/api/public/buying-guides/private-guide"))
                .andExpect(status().isNotFound());
    }
```

- [ ] **Step 4: Run tests and commit**

```bash
cd backend && mvn test
git add -A
git commit -m "feat(buying-guides): enforce guide visibility on public endpoints"
```

---

### Task 4: `siteUrl.js` and `analyzeFocusKeyword.js` (pure utils)

**Files:**
- Create: `frontend/src/utils/siteUrl.js` (+ test)
- Create: `frontend/src/utils/analyzeFocusKeyword.js` (+ test)
- Modify: `frontend/.env`, `frontend/.env.example` (if present)

**Interfaces:**
- Produces: `getSiteUrl(): string`, `buildGuideUrl(slug: string): string`, `analyzeFocusKeywordUsage(keyword, { seoTitle, metaDescription, slug, introduction, tocEntries }): { inTitle, inDescription, inSlug, inContent }`.

- [ ] **Step 1: Write failing tests for `siteUrl.js`**

```js
import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildGuideUrl, getSiteUrl } from './siteUrl.js';

describe('siteUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses VITE_SITE_URL when set, stripping a trailing slash', () => {
    vi.stubEnv('VITE_SITE_URL', 'https://www.2gofindz.com/');
    expect(getSiteUrl()).toBe('https://www.2gofindz.com');
  });

  it('falls back to window.location.origin when unset', () => {
    vi.stubEnv('VITE_SITE_URL', '');
    expect(getSiteUrl()).toBe(window.location.origin);
  });

  it('builds a guide URL from the site URL and slug', () => {
    vi.stubEnv('VITE_SITE_URL', 'https://www.2gofindz.com');
    expect(buildGuideUrl('best-earbuds')).toBe('https://www.2gofindz.com/buying-guides/best-earbuds');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

`cd frontend && npx vitest run src/utils/siteUrl.test.js` — fails, module doesn't exist.

- [ ] **Step 3: Implement `siteUrl.js`**

```js
export function getSiteUrl() {
  const configured = import.meta.env.VITE_SITE_URL;
  if (configured) return configured.replace(/\/+$/, '');
  return window.location.origin;
}

export function buildGuideUrl(slug) {
  return `${getSiteUrl()}/buying-guides/${slug}`;
}
```

- [ ] **Step 4: Add `VITE_SITE_URL` to env files**

Add `VITE_SITE_URL=http://localhost:5173` to `frontend/.env` (and `.env.example` if it exists).

- [ ] **Step 5: Write failing tests for `analyzeFocusKeyword.js`**

```js
import { describe, expect, it } from 'vitest';
import { analyzeFocusKeywordUsage } from './analyzeFocusKeyword.js';

const base = {
  seoTitle: 'Best Wireless Earbuds Under $100',
  metaDescription: 'A guide to budget earbuds.',
  slug: 'best-wireless-earbuds-under-100',
  introduction: '<p>Looking for great sound on a budget?</p>',
  tocEntries: [{ sectionKey: null, title: 'What to Look For', content: '<p>Battery life and wireless range matter.</p>' }],
};

describe('analyzeFocusKeywordUsage', () => {
  it('returns all false when the keyword is blank', () => {
    expect(analyzeFocusKeywordUsage('', base)).toEqual({ inTitle: false, inDescription: false, inSlug: false, inContent: false });
  });

  it('detects the keyword in the title, case-insensitively', () => {
    const result = analyzeFocusKeywordUsage('wireless earbuds', base);
    expect(result.inTitle).toBe(true);
  });

  it('detects the keyword in the slug', () => {
    const result = analyzeFocusKeywordUsage('under-100'.replace('-', ' '), { ...base, slug: 'wireless-earbuds-under-100' });
    expect(analyzeFocusKeywordUsage('earbuds', { ...base, slug: 'wireless-earbuds-under-100' }).inSlug).toBe(true);
  });

  it('detects the keyword in custom TOC section content', () => {
    const result = analyzeFocusKeywordUsage('wireless range', base);
    expect(result.inContent).toBe(true);
  });

  it('reports false for a keyword that appears nowhere', () => {
    const result = analyzeFocusKeywordUsage('waterproof rating', base);
    expect(result).toEqual({ inTitle: false, inDescription: false, inSlug: false, inContent: false });
  });
});
```

- [ ] **Step 6: Run to verify it fails, then implement**

```js
function normalize(text) {
  return (text ?? '').toLowerCase();
}

function stripHtml(html) {
  return (html ?? '').replace(/<[^>]*>/g, ' ');
}

export function analyzeFocusKeywordUsage(keyword, { seoTitle, metaDescription, slug, introduction, tocEntries }) {
  const trimmedKeyword = (keyword ?? '').trim().toLowerCase();
  if (!trimmedKeyword) {
    return { inTitle: false, inDescription: false, inSlug: false, inContent: false };
  }

  const contentText = [
    stripHtml(introduction),
    ...(tocEntries ?? [])
      .filter((entry) => !entry.sectionKey)
      .map((entry) => `${entry.title} ${stripHtml(entry.content)}`),
  ].join(' ');

  return {
    inTitle: normalize(seoTitle).includes(trimmedKeyword),
    inDescription: normalize(metaDescription).includes(trimmedKeyword),
    inSlug: normalize(slug).includes(trimmedKeyword),
    inContent: normalize(contentText).includes(trimmedKeyword),
  };
}
```

- [ ] **Step 7: Run both test files, verify pass, commit**

```bash
cd frontend && npx vitest run src/utils/siteUrl.test.js src/utils/analyzeFocusKeyword.test.js
git add frontend/src/utils/siteUrl.js frontend/src/utils/siteUrl.test.js \
  frontend/src/utils/analyzeFocusKeyword.js frontend/src/utils/analyzeFocusKeyword.test.js frontend/.env
git commit -m "feat(buying-guides): add site URL and focus-keyword analysis utilities"
```

---

### Task 5: `computeSeoScore.js`

**Files:**
- Create: `frontend/src/utils/computeSeoScore.js` (+ test)

**Interfaces:**
- Produces: `computeSeoScore(input): { score: number, label: string, checks: Array<{ id, label, points, maxPoints, why, recommendation, focusStep, focusFieldId }> }`.
- Consumes: `input = { seoTitle, metaDescription, focusKeyword, slug, introduction, canonicalUrl, hasStructuredData, hasQuickPick, hasTopPick }`.

- [ ] **Step 1: Write failing tests**

```js
import { describe, expect, it } from 'vitest';
import { computeSeoScore } from './computeSeoScore.js';

const emptyInput = {
  seoTitle: '', metaDescription: '', focusKeyword: '', slug: '', introduction: '',
  canonicalUrl: '', hasStructuredData: false, hasQuickPick: false, hasTopPick: false,
};

const fullInput = {
  seoTitle: 'Best Wireless Earbuds Under $100 (2026 Guide)',
  metaDescription: 'A'.repeat(150),
  focusKeyword: 'wireless earbuds',
  slug: 'best-wireless-earbuds-under-100',
  introduction: `<p>${'wireless earbuds review word '.repeat(10)}</p>`,
  canonicalUrl: 'https://www.2gofindz.com/buying-guides/best-wireless-earbuds-under-100',
  hasStructuredData: true,
  hasQuickPick: true,
  hasTopPick: true,
};

describe('computeSeoScore', () => {
  it('scores 0 and labels Needs Work when everything is empty', () => {
    const result = computeSeoScore(emptyInput);
    expect(result.score).toBe(0);
    expect(result.label).toBe('Needs Work');
  });

  it('scores 100 and labels Excellent when every check passes', () => {
    const result = computeSeoScore(fullInput);
    expect(result.score).toBe(100);
    expect(result.label).toBe('Excellent');
  });

  it('gives partial credit for a title present but outside the recommended range', () => {
    const result = computeSeoScore({ ...emptyInput, seoTitle: 'Short' });
    const titleCheck = result.checks.find((check) => check.id === 'seoTitle');
    expect(titleCheck.points).toBe(10);
  });

  it('flags an invalid canonical URL', () => {
    const result = computeSeoScore({ ...emptyInput, canonicalUrl: 'not-a-url' });
    const canonicalCheck = result.checks.find((check) => check.id === 'canonicalUrl');
    expect(canonicalCheck.points).toBe(0);
  });

  it('sums check points to exactly the returned score', () => {
    const result = computeSeoScore(fullInput);
    const summed = result.checks.reduce((sum, check) => sum + check.points, 0);
    expect(summed).toBe(result.score);
  });

  it('labels a mid-range score as Good', () => {
    const result = computeSeoScore({ ...emptyInput, seoTitle: fullInput.seoTitle, metaDescription: fullInput.metaDescription });
    expect(result.label).toBe(result.score >= 80 ? 'Excellent' : result.score >= 50 ? 'Good' : 'Needs Work');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

`cd frontend && npx vitest run src/utils/computeSeoScore.test.js`

- [ ] **Step 3: Implement `computeSeoScore.js`**

```js
function countWords(html) {
  const text = (html ?? '').replace(/<[^>]*>/g, ' ').trim();
  return text ? text.split(/\s+/).length : 0;
}

function rangeScore(length, min, max, fullPoints, partialPoints) {
  if (length === 0) return 0;
  return length >= min && length <= max ? fullPoints : partialPoints;
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function computeSeoScore({
  seoTitle, metaDescription, focusKeyword, slug, introduction, canonicalUrl,
  hasStructuredData, hasQuickPick, hasTopPick,
}) {
  const trimmedKeyword = (focusKeyword ?? '').trim().toLowerCase();
  const strippedIntroduction = (introduction ?? '').replace(/<[^>]*>/g, ' ').toLowerCase();

  const inTitle = Boolean(trimmedKeyword) && (seoTitle ?? '').toLowerCase().includes(trimmedKeyword);
  const inDescription = Boolean(trimmedKeyword) && (metaDescription ?? '').toLowerCase().includes(trimmedKeyword);
  const inSlug = Boolean(trimmedKeyword) && (slug ?? '').toLowerCase().includes(trimmedKeyword);
  const inContent = Boolean(trimmedKeyword) && strippedIntroduction.includes(trimmedKeyword);

  const canonicalValid = !canonicalUrl || isValidHttpUrl(canonicalUrl);

  const checks = [
    {
      id: 'seoTitle', label: 'SEO Title length',
      points: rangeScore((seoTitle ?? '').length, 50, 60, 15, 10), maxPoints: 15,
      why: 'Search engines display your title in results, and a well-sized title improves click-through.',
      recommendation: 'Aim for 50–60 characters.', focusStep: 8, focusFieldId: 'seo-title',
    },
    {
      id: 'metaDescription', label: 'Meta Description length',
      points: rangeScore((metaDescription ?? '').length, 140, 160, 15, 10), maxPoints: 15,
      why: 'The meta description is often shown under your title in search results.',
      recommendation: 'Aim for 140–160 characters.', focusStep: 8, focusFieldId: 'meta-description',
    },
    {
      id: 'focusKeywordSet', label: 'Focus Keyword set',
      points: trimmedKeyword ? 5 : 0, maxPoints: 5,
      why: 'A focus keyword helps you check that your content addresses a specific search intent.',
      recommendation: 'Choose the main phrase this guide should rank for.', focusStep: 8, focusFieldId: 'focus-keyword',
    },
    {
      id: 'keywordInTitle', label: 'Keyword in SEO Title',
      points: inTitle ? 10 : 0, maxPoints: 10,
      why: 'Search engines weigh terms that appear in the title.',
      recommendation: 'Work the focus keyword naturally into the SEO Title.', focusStep: 8, focusFieldId: 'seo-title',
    },
    {
      id: 'keywordInDescription', label: 'Keyword in Meta Description',
      points: inDescription ? 10 : 0, maxPoints: 10,
      why: 'A keyword match in the description reinforces relevance to searchers.',
      recommendation: 'Work the focus keyword naturally into the Meta Description.', focusStep: 8, focusFieldId: 'meta-description',
    },
    {
      id: 'keywordInSlug', label: 'Keyword in URL Slug',
      points: inSlug ? 5 : 0, maxPoints: 5,
      why: 'Keywords in the URL are a minor relevance signal.',
      recommendation: 'Include the focus keyword in the URL slug.', focusStep: 1, focusFieldId: 'slug',
    },
    {
      id: 'keywordInContent', label: 'Keyword in Introduction/Buying Guide content',
      points: inContent ? 10 : 0, maxPoints: 10,
      why: 'Search engines look for the keyword used naturally within the actual content.',
      recommendation: 'Mention the focus keyword naturally in the introduction or buying guide content.',
      focusStep: 1, focusFieldId: null,
    },
    {
      id: 'contentCompleteness', label: 'Content completeness',
      points: countWords(introduction) >= 40 ? 10 : 0, maxPoints: 10,
      why: 'Thin introductions give readers and search engines little to evaluate.',
      recommendation: 'Write at least 40 words in the introduction.', focusStep: 1, focusFieldId: null,
    },
    {
      id: 'canonicalUrl', label: 'Valid Canonical URL',
      points: canonicalValid ? 5 : 0, maxPoints: 5,
      why: 'An invalid canonical URL can confuse search engines about which page to index.',
      recommendation: 'Leave it blank or enter a valid absolute https URL.', focusStep: 8, focusFieldId: 'canonical-url',
    },
    {
      id: 'structuredData', label: 'Structured data present',
      points: hasStructuredData ? 10 : 0, maxPoints: 10,
      why: 'FAQ structured data can make your guide eligible for rich results.',
      recommendation: 'Add at least one complete FAQ with both a question and an answer.', focusStep: 7, focusFieldId: null,
    },
    {
      id: 'internalLinks', label: 'Internal links found',
      points: hasQuickPick && hasTopPick ? 5 : 0, maxPoints: 5,
      why: 'Internal links to product sections help readers and search engines navigate your guide.',
      recommendation: 'Add at least one Quick Pick and select a Top Pick.', focusStep: 3, focusFieldId: null,
    },
  ];

  const score = checks.reduce((sum, check) => sum + check.points, 0);
  const label = score >= 80 ? 'Excellent' : score >= 50 ? 'Good' : 'Needs Work';

  return { score, label, checks };
}
```

- [ ] **Step 4: Run tests, verify pass, commit**

```bash
cd frontend && npx vitest run src/utils/computeSeoScore.test.js
git add frontend/src/utils/computeSeoScore.js frontend/src/utils/computeSeoScore.test.js
git commit -m "feat(buying-guides): add deterministic SEO score calculation"
```

---

### Task 6: `KeywordTagInput.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/KeywordTagInput.jsx` (+ test)

**Interfaces:**
- Consumes: none beyond React/lucide-react.
- Produces: `<KeywordTagInput keywords={string[]} onChange={(next: string[]) => void} id?={string} />`.

- [ ] **Step 1: Write failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import KeywordTagInput from './KeywordTagInput.jsx';

describe('KeywordTagInput', () => {
  it('adds a keyword on Enter and clears the input', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<KeywordTagInput keywords={[]} onChange={onChange} />);

    await user.type(screen.getByRole('textbox'), 'budget earbuds{Enter}');

    expect(onChange).toHaveBeenCalledWith(['budget earbuds']);
  });

  it('adds a keyword on comma', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<KeywordTagInput keywords={[]} onChange={onChange} />);

    await user.type(screen.getByRole('textbox'), 'bluetooth,');

    expect(onChange).toHaveBeenCalledWith(['bluetooth']);
  });

  it('removes a keyword when its remove button is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<KeywordTagInput keywords={['budget', 'bluetooth']} onChange={onChange} />);

    await user.click(screen.getByLabelText('Remove budget'));

    expect(onChange).toHaveBeenCalledWith(['bluetooth']);
  });

  it('removes the last keyword on Backspace when the input is empty', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<KeywordTagInput keywords={['budget', 'bluetooth']} onChange={onChange} />);

    await user.click(screen.getByRole('textbox'));
    await user.keyboard('{Backspace}');

    expect(onChange).toHaveBeenCalledWith(['budget']);
  });

  it('blocks a case-insensitive duplicate', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<KeywordTagInput keywords={['Budget']} onChange={onChange} />);

    await user.type(screen.getByRole('textbox'), 'budget{Enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('blocks adding past the 10-keyword maximum', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const tenKeywords = Array.from({ length: 10 }, (_, i) => `keyword-${i}`);
    render(<KeywordTagInput keywords={tenKeywords} onChange={onChange} />);

    expect(screen.getByRole('textbox')).toBeDisabled();
    await user.type(screen.getByRole('textbox'), 'x{Enter}');
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure**

`cd frontend && npx vitest run src/components/buying-guide-form/KeywordTagInput.test.jsx`

- [ ] **Step 3: Implement**

```jsx
import { useState } from 'react';
import { X } from 'lucide-react';

const MAX_KEYWORDS = 10;
const MAX_KEYWORD_LENGTH = 60;

function KeywordTagInput({ keywords, onChange, id = 'seo-keywords' }) {
  const [inputValue, setInputValue] = useState('');
  const atMax = keywords.length >= MAX_KEYWORDS;

  function addKeyword(raw) {
    const trimmed = raw.trim();
    if (!trimmed || atMax) return;
    const isDuplicate = keywords.some((keyword) => keyword.toLowerCase() === trimmed.toLowerCase());
    if (isDuplicate) return;
    onChange([...keywords, trimmed.slice(0, MAX_KEYWORD_LENGTH)]);
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addKeyword(inputValue);
      setInputValue('');
    } else if (event.key === 'Backspace' && inputValue === '' && keywords.length > 0) {
      onChange(keywords.slice(0, -1));
    }
  }

  function removeKeyword(index) {
    onChange(keywords.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-btn border border-border p-2">
        {keywords.map((keyword, index) => (
          <span key={keyword} className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
            {keyword}
            <button
              type="button"
              onClick={() => removeKeyword(index)}
              aria-label={`Remove ${keyword}`}
              className="text-primary hover:text-primary-hover"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={atMax}
          placeholder={atMax ? `Maximum ${MAX_KEYWORDS} keywords` : 'Add a keyword...'}
          className="min-w-[120px] flex-1 border-none px-1 py-1 text-slate-900 focus:outline-none disabled:bg-transparent"
        />
      </div>
      <p className="mt-1 text-xs text-muted">Add relevant supporting phrases separated by commas.</p>
    </div>
  );
}

export default KeywordTagInput;
```

- [ ] **Step 4: Run tests, verify pass, commit**

```bash
cd frontend && npx vitest run src/components/buying-guide-form/KeywordTagInput.test.jsx
git add frontend/src/components/buying-guide-form/KeywordTagInput.jsx frontend/src/components/buying-guide-form/KeywordTagInput.test.jsx
git commit -m "feat(buying-guides): add KeywordTagInput for SEO supporting keywords"
```

---

### Task 7: `SearchResultPreview.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/SearchResultPreview.jsx` (+ test)

- [ ] **Step 1: Write failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SearchResultPreview from './SearchResultPreview.jsx';

describe('SearchResultPreview', () => {
  it('renders the SEO title, description, and URL', () => {
    render(<SearchResultPreview seoTitle="Best Earbuds" metaDescription="A great guide." url="https://2gofindz.com/buying-guides/best-earbuds" />);
    expect(screen.getByText('Best Earbuds')).toBeInTheDocument();
    expect(screen.getByText('A great guide.')).toBeInTheDocument();
    expect(screen.getByText('https://2gofindz.com/buying-guides/best-earbuds')).toBeInTheDocument();
  });

  it('shows placeholder text when title and description are empty', () => {
    render(<SearchResultPreview seoTitle="" metaDescription="" url="https://2gofindz.com/buying-guides/x" />);
    expect(screen.getByText('Untitled guide')).toBeInTheDocument();
    expect(screen.getByText('No description provided yet.')).toBeInTheDocument();
  });

  it('labels itself as a preview', () => {
    render(<SearchResultPreview seoTitle="X" metaDescription="Y" url="https://2gofindz.com/buying-guides/x" />);
    expect(screen.getByText(/preview only/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure, then implement**

```jsx
function SearchResultPreview({ seoTitle, metaDescription, url }) {
  return (
    <div className="rounded-card border border-border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-heading">Google Search Preview</h3>
      <div className="rounded-btn border border-border bg-surface-secondary p-4">
        <div className="mb-1 flex items-center gap-2 text-xs text-muted">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">2G</span>
          <span>2Go Findz</span>
        </div>
        <p className="mb-1 truncate text-xs text-muted">{url}</p>
        <p className="truncate text-lg text-[#1a0dab]">{seoTitle || 'Untitled guide'}</p>
        <p className="line-clamp-2 text-sm text-body">{metaDescription || 'No description provided yet.'}</p>
      </div>
      <p className="mt-2 text-xs text-muted">Preview only — actual search results may differ.</p>
    </div>
  );
}

export default SearchResultPreview;
```

- [ ] **Step 3: Run tests, verify pass, commit**

```bash
cd frontend && npx vitest run src/components/buying-guide-form/SearchResultPreview.test.jsx
git add frontend/src/components/buying-guide-form/SearchResultPreview.jsx frontend/src/components/buying-guide-form/SearchResultPreview.test.jsx
git commit -m "feat(buying-guides): add Google Search Preview card"
```

---

### Task 8: `SeoSettingsForm.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/SeoSettingsForm.jsx` (+ test)

**Interfaces:**
- Consumes: `KeywordTagInput`, `SearchResultPreview` (Tasks 6–7).
- Produces: the SEO Title/Meta Description/Focus Keyword/Keywords/Canonical URL fields, ids `seo-title`, `meta-description`, `focus-keyword`, `canonical-url` (referenced by `computeSeoScore`'s `focusFieldId` for jump-to-field navigation).

- [ ] **Step 1: Write failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SeoSettingsForm from './SeoSettingsForm.jsx';

function renderForm(overrides = {}) {
  return render(
    <SeoSettingsForm
      seoTitleDisplay="Best Wireless Earbuds Under $100"
      isSeoTitleCustom={false}
      onSeoTitleChange={vi.fn()}
      onResetSeoTitle={vi.fn()}
      metaDescriptionDisplay="A curated guide to the best budget wireless earbuds."
      isMetaDescriptionCustom={false}
      onMetaDescriptionChange={vi.fn()}
      onResetMetaDescription={vi.fn()}
      focusKeyword=""
      onFocusKeywordChange={vi.fn()}
      focusKeywordAnalysis={{ inTitle: false, inDescription: false, inSlug: false, inContent: false }}
      supportingKeywords={[]}
      onSupportingKeywordsChange={vi.fn()}
      canonicalUrl=""
      onCanonicalUrlChange={vi.fn()}
      canonicalError=""
      canonicalWarning=""
      guideUrl="https://2gofindz.com/buying-guides/best-wireless-earbuds-under-100"
      {...overrides}
    />
  );
}

describe('SeoSettingsForm', () => {
  it('renders the prefilled SEO title and meta description', () => {
    renderForm();
    expect(screen.getByLabelText(/SEO Title/)).toHaveValue('Best Wireless Earbuds Under $100');
    expect(screen.getByLabelText(/Meta Description/)).toHaveValue('A curated guide to the best budget wireless earbuds.');
  });

  it('does not show a reset link until the title is custom', () => {
    renderForm({ isSeoTitleCustom: false });
    expect(screen.queryByText('Reset to guide title')).not.toBeInTheDocument();
    renderForm({ isSeoTitleCustom: true });
    expect(screen.getByText('Reset to guide title')).toBeInTheDocument();
  });

  it('calls onResetSeoTitle when the reset link is clicked', async () => {
    const onResetSeoTitle = vi.fn();
    const user = userEvent.setup();
    renderForm({ isSeoTitleCustom: true, onResetSeoTitle });

    await user.click(screen.getByText('Reset to guide title'));

    expect(onResetSeoTitle).toHaveBeenCalled();
  });

  it('shows the focus keyword usage checklist once a keyword is entered', () => {
    renderForm({
      focusKeyword: 'wireless earbuds',
      focusKeywordAnalysis: { inTitle: true, inDescription: false, inSlug: true, inContent: false },
    });
    expect(screen.getByText(/Title/)).toBeInTheDocument();
    expect(screen.getByText(/Slug/)).toBeInTheDocument();
  });

  it('shows a canonical URL warning when provided', () => {
    renderForm({ canonicalWarning: 'This canonical URL points to a different domain.' });
    expect(screen.getByText(/points to a different domain/)).toBeInTheDocument();
  });

  it('calls onCanonicalUrlChange when the field is edited', async () => {
    const onCanonicalUrlChange = vi.fn();
    const user = userEvent.setup();
    renderForm({ onCanonicalUrlChange });

    await user.type(screen.getByLabelText('Canonical URL'), 'x');

    expect(onCanonicalUrlChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure, then implement**

```jsx
import { Check, AlertTriangle } from 'lucide-react';
import KeywordTagInput from './KeywordTagInput.jsx';
import SearchResultPreview from './SearchResultPreview.jsx';

function CounterIcon({ inRange }) {
  return inRange ? <Check size={14} className="text-success" /> : <AlertTriangle size={14} className="text-warning" />;
}

function SeoSettingsForm({
  seoTitleDisplay, isSeoTitleCustom, onSeoTitleChange, onResetSeoTitle,
  metaDescriptionDisplay, isMetaDescriptionCustom, onMetaDescriptionChange, onResetMetaDescription,
  focusKeyword, onFocusKeywordChange, focusKeywordAnalysis,
  supportingKeywords, onSupportingKeywordsChange,
  canonicalUrl, onCanonicalUrlChange, canonicalError, canonicalWarning,
  guideUrl,
}) {
  const titleLength = seoTitleDisplay.length;
  const descriptionLength = metaDescriptionDisplay.length;
  const titleInRange = titleLength >= 50 && titleLength <= 60;
  const descriptionInRange = descriptionLength >= 140 && descriptionLength <= 160;

  return (
    <div className="rounded-card border border-border bg-white p-5">
      <h2 className="mb-4 text-card-title text-heading">SEO Settings</h2>

      <div className="mb-5">
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="seo-title" className="block text-small font-medium text-body">SEO Title *</label>
          {isSeoTitleCustom && (
            <button type="button" onClick={onResetSeoTitle} className="text-xs text-primary hover:underline">
              Reset to guide title
            </button>
          )}
        </div>
        <input
          id="seo-title"
          type="text"
          maxLength={70}
          value={seoTitleDisplay}
          onChange={(event) => onSeoTitleChange(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-muted">Keep the title concise and descriptive. Search engines may display a shortened version.</p>
          <span className="flex items-center gap-1 text-xs text-muted">
            <CounterIcon inRange={titleInRange} />
            {titleLength} / 60
          </span>
        </div>
      </div>

      <div className="mb-5">
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="meta-description" className="block text-small font-medium text-body">Meta Description *</label>
          {isMetaDescriptionCustom && (
            <button type="button" onClick={onResetMetaDescription} className="text-xs text-primary hover:underline">
              Reset to guide excerpt
            </button>
          )}
        </div>
        <textarea
          id="meta-description"
          rows={3}
          maxLength={200}
          value={metaDescriptionDisplay}
          onChange={(event) => onMetaDescriptionChange(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-muted">Write a concise summary for search results. Search engines may display different text depending on the query.</p>
          <span className="flex items-center gap-1 text-xs text-muted">
            <CounterIcon inRange={descriptionInRange} />
            {descriptionLength} / 160
          </span>
        </div>
      </div>

      <div className="mb-5">
        <label htmlFor="focus-keyword" className="mb-1 block text-small font-medium text-body">Focus Keyword *</label>
        <input
          id="focus-keyword"
          type="text"
          value={focusKeyword}
          onChange={(event) => onFocusKeywordChange(event.target.value)}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="mt-1 text-xs text-muted">Choose the main search phrase this guide is intended to address.</p>
        {focusKeyword.trim() && (
          <ul className="mt-2 flex flex-wrap gap-3 text-xs">
            <li className={focusKeywordAnalysis.inTitle ? 'text-success' : 'text-muted'}>{focusKeywordAnalysis.inTitle ? '✓' : '✗'} Title</li>
            <li className={focusKeywordAnalysis.inDescription ? 'text-success' : 'text-muted'}>{focusKeywordAnalysis.inDescription ? '✓' : '✗'} Description</li>
            <li className={focusKeywordAnalysis.inSlug ? 'text-success' : 'text-muted'}>{focusKeywordAnalysis.inSlug ? '✓' : '✗'} Slug</li>
            <li className={focusKeywordAnalysis.inContent ? 'text-success' : 'text-muted'}>{focusKeywordAnalysis.inContent ? '✓' : '✗'} Content</li>
          </ul>
        )}
      </div>

      <div className="mb-5">
        <label htmlFor="seo-keywords" className="mb-1 block text-small font-medium text-body">SEO Keywords</label>
        <KeywordTagInput id="seo-keywords" keywords={supportingKeywords} onChange={onSupportingKeywordsChange} />
      </div>

      <div className="mb-5">
        <label htmlFor="canonical-url" className="mb-1 block text-small font-medium text-body">Canonical URL</label>
        <input
          id="canonical-url"
          type="text"
          value={canonicalUrl}
          onChange={(event) => onCanonicalUrlChange(event.target.value)}
          placeholder={guideUrl}
          className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="mt-1 text-xs text-muted">Use this only when another URL should be treated as the preferred version of this content.</p>
        {canonicalError && <p className="mt-1 text-sm text-danger">{canonicalError}</p>}
        {!canonicalError && canonicalWarning && <p className="mt-1 text-sm text-warning">{canonicalWarning}</p>}
      </div>

      <SearchResultPreview seoTitle={seoTitleDisplay} metaDescription={metaDescriptionDisplay} url={canonicalUrl || guideUrl} />
    </div>
  );
}

export default SeoSettingsForm;
```

- [ ] **Step 3: Run tests, verify pass, commit**

```bash
cd frontend && npx vitest run src/components/buying-guide-form/SeoSettingsForm.test.jsx
git add frontend/src/components/buying-guide-form/SeoSettingsForm.jsx frontend/src/components/buying-guide-form/SeoSettingsForm.test.jsx
git commit -m "feat(buying-guides): add SeoSettingsForm"
```

---

### Task 9: `AdvancedSeoPanel.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/AdvancedSeoPanel.jsx` (+ test)

**Interfaces:**
- Consumes: `ImageUploader` (`frontend/src/components/ImageUploader.jsx`, already used by `BasicInfoStep.jsx` with props `imageFileName`, `onChange`, `label`, `variant`, `helperText`).

- [ ] **Step 1: Write failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AdvancedSeoPanel from './AdvancedSeoPanel.jsx';

const baseValues = {
  robotsIndex: true, robotsFollow: true,
  openGraphTitle: '', openGraphDescription: '', openGraphImageFilename: null,
  twitterCardType: 'summary_large_image',
};

describe('AdvancedSeoPanel', () => {
  it('is collapsed by default', () => {
    render(<AdvancedSeoPanel values={baseValues} onChange={vi.fn()} seoTitleFallback="" metaDescriptionFallback="" coverImageFilenameFallback={null} />);
    expect(screen.queryByLabelText('Open Graph Title')).not.toBeInTheDocument();
  });

  it('expands to show fields when the header is clicked', async () => {
    const user = userEvent.setup();
    render(<AdvancedSeoPanel values={baseValues} onChange={vi.fn()} seoTitleFallback="" metaDescriptionFallback="" coverImageFilenameFallback={null} />);

    await user.click(screen.getByRole('button', { name: /Advanced SEO/ }));

    expect(screen.getByLabelText('Open Graph Title')).toBeInTheDocument();
  });

  it('toggles the robots index checkbox', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<AdvancedSeoPanel values={baseValues} onChange={onChange} seoTitleFallback="" metaDescriptionFallback="" coverImageFilenameFallback={null} />);
    await user.click(screen.getByRole('button', { name: /Advanced SEO/ }));

    await user.click(screen.getByLabelText(/Allow search engines to index/));

    expect(onChange).toHaveBeenCalledWith({ ...baseValues, robotsIndex: false });
  });

  it('calls onChange when the Twitter card type changes', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<AdvancedSeoPanel values={baseValues} onChange={onChange} seoTitleFallback="" metaDescriptionFallback="" coverImageFilenameFallback={null} />);
    await user.click(screen.getByRole('button', { name: /Advanced SEO/ }));

    await user.selectOptions(screen.getByLabelText(/Twitter Card Type/), 'summary');

    expect(onChange).toHaveBeenCalledWith({ ...baseValues, twitterCardType: 'summary' });
  });
});
```

- [ ] **Step 2: Run to verify failure, then implement**

```jsx
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ImageUploader from '../ImageUploader.jsx';

const TWITTER_CARD_TYPES = [
  { value: 'summary', label: 'Summary' },
  { value: 'summary_large_image', label: 'Summary with Large Image' },
];

function AdvancedSeoPanel({ values, onChange, seoTitleFallback, metaDescriptionFallback, coverImageFilenameFallback }) {
  const [isOpen, setIsOpen] = useState(false);

  function set(field, value) {
    onChange({ ...values, [field]: value });
  }

  return (
    <div className="rounded-card border border-border bg-white p-5">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="advanced-seo-panel"
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h3 className="text-card-title text-heading">Advanced SEO (Optional)</h3>
          <p className="text-sm text-muted">Add structured data, robots settings, social metadata, and other advanced SEO options.</p>
        </div>
        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {isOpen && (
        <div id="advanced-seo-panel" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-body">
              <input type="checkbox" checked={values.robotsIndex} onChange={(event) => set('robotsIndex', event.target.checked)} />
              Allow search engines to index this guide
            </label>
            <label className="flex items-center gap-2 text-sm text-body">
              <input type="checkbox" checked={values.robotsFollow} onChange={(event) => set('robotsFollow', event.target.checked)} />
              Allow search engines to follow links on this guide
            </label>
          </div>

          <div>
            <label htmlFor="og-title" className="mb-1 block text-small font-medium text-body">Open Graph Title</label>
            <input
              id="og-title"
              type="text"
              value={values.openGraphTitle}
              onChange={(event) => set('openGraphTitle', event.target.value)}
              placeholder={seoTitleFallback}
              className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted">Falls back to the SEO Title when left blank.</p>
          </div>

          <div>
            <label htmlFor="og-description" className="mb-1 block text-small font-medium text-body">Open Graph Description</label>
            <textarea
              id="og-description"
              rows={2}
              value={values.openGraphDescription}
              onChange={(event) => set('openGraphDescription', event.target.value)}
              placeholder={metaDescriptionFallback}
              className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="mt-1 text-xs text-muted">Falls back to the Meta Description when left blank.</p>
          </div>

          <ImageUploader
            imageFileName={values.openGraphImageFilename || coverImageFilenameFallback}
            onChange={(value) => set('openGraphImageFilename', value)}
            label="Open Graph Image"
            variant="wide"
            helperText="Falls back to the Featured Image when left blank."
          />

          <div>
            <label htmlFor="twitter-card-type" className="mb-1 block text-small font-medium text-body">X/Twitter Card Type</label>
            <select
              id="twitter-card-type"
              value={values.twitterCardType}
              onChange={(event) => set('twitterCardType', event.target.value)}
              className="w-full rounded-btn border border-border bg-white px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {TWITTER_CARD_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdvancedSeoPanel;
```

- [ ] **Step 3: Run tests, verify pass, commit**

```bash
cd frontend && npx vitest run src/components/buying-guide-form/AdvancedSeoPanel.test.jsx
git add frontend/src/components/buying-guide-form/AdvancedSeoPanel.jsx frontend/src/components/buying-guide-form/AdvancedSeoPanel.test.jsx
git commit -m "feat(buying-guides): add AdvancedSeoPanel"
```

---

### Task 10: `SeoScoreCard.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/SeoScoreCard.jsx` (+ test)

- [ ] **Step 1: Write failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SeoScoreCard from './SeoScoreCard.jsx';

const checks = [
  { id: 'a', label: 'Check A', points: 15, maxPoints: 15 },
  { id: 'b', label: 'Check B', points: 0, maxPoints: 10 },
];

describe('SeoScoreCard', () => {
  it('renders the score and label', () => {
    render(<SeoScoreCard score={92} label="Excellent" checks={checks} onViewFullAnalysis={vi.fn()} />);
    expect(screen.getByText('92')).toBeInTheDocument();
    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });

  it('shows how many checks passed', () => {
    render(<SeoScoreCard score={60} label="Good" checks={checks} onViewFullAnalysis={vi.fn()} />);
    expect(screen.getByText('1 of 2 checks passed')).toBeInTheDocument();
  });

  it('calls onViewFullAnalysis when the link is clicked', async () => {
    const onViewFullAnalysis = vi.fn();
    const user = userEvent.setup();
    render(<SeoScoreCard score={60} label="Good" checks={checks} onViewFullAnalysis={onViewFullAnalysis} />);

    await user.click(screen.getByText(/View full SEO analysis/));

    expect(onViewFullAnalysis).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure, then implement**

```jsx
function scoreColor(label) {
  if (label === 'Excellent') return 'text-success';
  if (label === 'Good') return 'text-warning';
  return 'text-danger';
}

function SeoScoreCard({ score, label, checks, onViewFullAnalysis }) {
  const passedChecks = checks.filter((check) => check.points === check.maxPoints);
  return (
    <div className="rounded-card border border-border bg-white p-5">
      <h3 className="mb-4 text-card-title text-heading">SEO Score</h3>
      <div className="flex items-center gap-4">
        <div className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-4 border-current ${scoreColor(label)}`}>
          <span className="text-xl font-bold">{score}</span>
        </div>
        <div>
          <p className={`font-semibold ${scoreColor(label)}`}>{label}</p>
          <p className="text-xs text-muted">{passedChecks.length} of {checks.length} checks passed</p>
        </div>
      </div>
      <ul className="mt-4 space-y-1 text-sm">
        {checks.map((check) => (
          <li key={check.id} className="flex items-center justify-between">
            <span className={check.points === check.maxPoints ? 'text-body' : 'text-muted'}>{check.label}</span>
            <span className={check.points === check.maxPoints ? 'text-success' : 'text-muted'}>
              {check.points === check.maxPoints ? '✓' : '—'}
            </span>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onViewFullAnalysis} className="mt-4 text-sm font-medium text-primary hover:underline">
        View full SEO analysis →
      </button>
    </div>
  );
}

export default SeoScoreCard;
```

- [ ] **Step 3: Run tests, verify pass, commit**

```bash
cd frontend && npx vitest run src/components/buying-guide-form/SeoScoreCard.test.jsx
git add frontend/src/components/buying-guide-form/SeoScoreCard.jsx frontend/src/components/buying-guide-form/SeoScoreCard.test.jsx
git commit -m "feat(buying-guides): add SeoScoreCard"
```

---

### Task 11: `SeoAnalysisDialog.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/SeoAnalysisDialog.jsx` (+ test)

**Interfaces:**
- Consumes: `Modal` (`frontend/src/components/Modal.jsx`).
- Note: groups into exactly three buckets — Errors (`points === 0`), Warnings (`0 < points < maxPoints`), Passed (`points === maxPoints`) — no separate "Suggestions" bucket, since `computeSeoScore` doesn't produce a 4th category and a fourth bucket with nothing real to put in it would be a fake grouping.

- [ ] **Step 1: Write failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SeoAnalysisDialog from './SeoAnalysisDialog.jsx';

const checks = [
  { id: 'a', label: 'Passing Check', points: 10, maxPoints: 10, why: 'Why A', recommendation: 'Do A', focusStep: 8, focusFieldId: 'seo-title' },
  { id: 'b', label: 'Partial Check', points: 5, maxPoints: 10, why: 'Why B', recommendation: 'Do B', focusStep: 8, focusFieldId: null },
  { id: 'c', label: 'Failing Check', points: 0, maxPoints: 10, why: 'Why C', recommendation: 'Do C', focusStep: 1, focusFieldId: 'slug' },
];

describe('SeoAnalysisDialog', () => {
  it('renders nothing when closed', () => {
    render(<SeoAnalysisDialog isOpen={false} onClose={vi.fn()} checks={checks} onFocusField={vi.fn()} />);
    expect(screen.queryByText('Full SEO Analysis')).not.toBeInTheDocument();
  });

  it('groups checks into Errors, Warnings, and Passed', () => {
    render(<SeoAnalysisDialog isOpen={true} onClose={vi.fn()} checks={checks} onFocusField={vi.fn()} />);
    expect(screen.getByText('Passing Check')).toBeInTheDocument();
    expect(screen.getByText('Partial Check')).toBeInTheDocument();
    expect(screen.getByText('Failing Check')).toBeInTheDocument();
    expect(screen.getByText('Errors')).toBeInTheDocument();
    expect(screen.getByText('Warnings')).toBeInTheDocument();
    expect(screen.getByText('Passed')).toBeInTheDocument();
  });

  it('calls onFocusField with the check\'s step/fieldId and closes on "Go to this field"', async () => {
    const onFocusField = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<SeoAnalysisDialog isOpen={true} onClose={onClose} checks={checks} onFocusField={onFocusField} />);

    await user.click(screen.getAllByText('Go to this field')[0]);

    expect(onFocusField).toHaveBeenCalledWith(1, 'slug');
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure, then implement**

```jsx
import Modal from '../Modal.jsx';

function groupChecks(checks) {
  return {
    errors: checks.filter((check) => check.points === 0),
    warnings: checks.filter((check) => check.points > 0 && check.points < check.maxPoints),
    passed: checks.filter((check) => check.points === check.maxPoints),
  };
}

function CheckList({ title, items, onFocusField, onClose }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-4">
      <h4 className="mb-2 text-sm font-semibold text-heading">{title}</h4>
      <ul className="space-y-2">
        {items.map((check) => (
          <li key={check.id} className="rounded-btn bg-surface-secondary p-3 text-sm">
            <p className="font-medium text-body">{check.label}</p>
            <p className="text-muted">{check.why}</p>
            <p className="text-body">{check.recommendation}</p>
            <button
              type="button"
              onClick={() => {
                onFocusField(check.focusStep, check.focusFieldId);
                onClose();
              }}
              className="mt-1 text-primary hover:underline"
            >
              Go to this field
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SeoAnalysisDialog({ isOpen, onClose, checks, onFocusField }) {
  if (!isOpen) return null;
  const { errors, warnings, passed } = groupChecks(checks);
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Full SEO Analysis">
      <CheckList title="Errors" items={errors} onFocusField={onFocusField} onClose={onClose} />
      <CheckList title="Warnings" items={warnings} onFocusField={onFocusField} onClose={onClose} />
      <CheckList title="Passed" items={passed} onFocusField={onFocusField} onClose={onClose} />
    </Modal>
  );
}

export default SeoAnalysisDialog;
```

- [ ] **Step 3: Run tests, verify pass, commit**

```bash
cd frontend && npx vitest run src/components/buying-guide-form/SeoAnalysisDialog.test.jsx
git add frontend/src/components/buying-guide-form/SeoAnalysisDialog.jsx frontend/src/components/buying-guide-form/SeoAnalysisDialog.test.jsx
git commit -m "feat(buying-guides): add SeoAnalysisDialog"
```

---

### Task 12: `GuideVisibilityCard.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/GuideVisibilityCard.jsx` (+ test)

- [ ] **Step 1: Write failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import GuideVisibilityCard from './GuideVisibilityCard.jsx';

describe('GuideVisibilityCard', () => {
  it('renders all three options', () => {
    render(<GuideVisibilityCard value="PUBLIC" onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: /Public/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Unlisted/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Private/ })).not.toBeChecked();
  });

  it('calls onChange with the selected value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<GuideVisibilityCard value="PUBLIC" onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: /Unlisted/ }));

    expect(onChange).toHaveBeenCalledWith('UNLISTED');
  });

  it('shows the correct description text for Private', () => {
    render(<GuideVisibilityCard value="PRIVATE" onChange={vi.fn()} />);
    expect(screen.getByText('Only authorized administrators can view this guide.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure, then implement**

```jsx
const OPTIONS = [
  { value: 'PUBLIC', title: 'Public', description: 'Anyone can view this guide.' },
  { value: 'UNLISTED', title: 'Unlisted', description: 'Only people with the link can view this guide.' },
  { value: 'PRIVATE', title: 'Private', description: 'Only authorized administrators can view this guide.' },
];

function GuideVisibilityCard({ value, onChange }) {
  return (
    <div className="rounded-card border border-border bg-white p-5">
      <h3 className="mb-4 text-card-title text-heading">Guide Visibility</h3>
      <div role="radiogroup" aria-label="Guide Visibility" className="space-y-3">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`flex cursor-pointer items-start gap-3 rounded-btn border p-3 ${
              value === option.value ? 'border-primary bg-primary/5' : 'border-border'
            }`}
          >
            <input
              type="radio"
              name="visibility"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-body">{option.title}</span>
              <span className="block text-xs text-muted">{option.description}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default GuideVisibilityCard;
```

- [ ] **Step 3: Run tests, verify pass, commit**

```bash
cd frontend && npx vitest run src/components/buying-guide-form/GuideVisibilityCard.test.jsx
git add frontend/src/components/buying-guide-form/GuideVisibilityCard.jsx frontend/src/components/buying-guide-form/GuideVisibilityCard.test.jsx
git commit -m "feat(buying-guides): add GuideVisibilityCard"
```

---

### Task 13: `PrePublishChecklist.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/PrePublishChecklist.jsx` (+ test)

**Interfaces:**
- Consumes: `items: Array<{ id: string, label: string, isComplete: boolean, step: number }>` — computed by `BuyingGuideForm.jsx` in Task 18 from its existing `validate*()` functions.

- [ ] **Step 1: Write failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PrePublishChecklist from './PrePublishChecklist.jsx';

const items = [
  { id: 'basicInfo', label: 'Basic Info completed', isComplete: true, step: 1 },
  { id: 'seo', label: 'SEO title and description added', isComplete: false, step: 8 },
];

describe('PrePublishChecklist', () => {
  it('renders every item label', () => {
    render(<PrePublishChecklist items={items} onNavigate={vi.fn()} />);
    expect(screen.getByText('Basic Info completed')).toBeInTheDocument();
    expect(screen.getByText('SEO title and description added')).toBeInTheDocument();
  });

  it('calls onNavigate with the item\'s step when clicked', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<PrePublishChecklist items={items} onNavigate={onNavigate} />);

    await user.click(screen.getByText('SEO title and description added'));

    expect(onNavigate).toHaveBeenCalledWith(8);
  });
});
```

- [ ] **Step 2: Run to verify failure, then implement**

```jsx
import { Check, AlertCircle } from 'lucide-react';

function PrePublishChecklist({ items, onNavigate }) {
  return (
    <div className="rounded-card border border-border bg-white p-5">
      <h3 className="mb-4 text-card-title text-heading">Before You Publish</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onNavigate(item.step)}
              className="flex w-full items-center gap-2 rounded-btn px-2 py-1 text-left text-sm hover:bg-surface-secondary"
            >
              {item.isComplete ? (
                <Check size={16} className="shrink-0 text-success" />
              ) : (
                <AlertCircle size={16} className="shrink-0 text-warning" />
              )}
              <span className={item.isComplete ? 'text-body' : 'text-body font-medium'}>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PrePublishChecklist;
```

- [ ] **Step 3: Run tests, verify pass, commit**

```bash
cd frontend && npx vitest run src/components/buying-guide-form/PrePublishChecklist.test.jsx
git add frontend/src/components/buying-guide-form/PrePublishChecklist.jsx frontend/src/components/buying-guide-form/PrePublishChecklist.test.jsx
git commit -m "feat(buying-guides): add PrePublishChecklist"
```

---

### Task 14: `SchedulePublishDialog.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/SchedulePublishDialog.jsx` (+ test)

**Interfaces:**
- Consumes: `Modal`, `PublishDatePicker` (`frontend/src/components/buying-guide-form/PublishDatePicker.jsx`, naive-local-time convention already established).

- [ ] **Step 1: Write failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SchedulePublishDialog from './SchedulePublishDialog.jsx';

describe('SchedulePublishDialog', () => {
  it('does not render when closed', () => {
    render(<SchedulePublishDialog isOpen={false} initialValue="" onConfirm={vi.fn()} onCancel={vi.fn()} isLoading={false} />);
    expect(screen.queryByText('Schedule Publish')).not.toBeInTheDocument();
  });

  it('disables Schedule Guide when no date is chosen', () => {
    render(<SchedulePublishDialog isOpen={true} initialValue="" onConfirm={vi.fn()} onCancel={vi.fn()} isLoading={false} />);
    expect(screen.getByRole('button', { name: 'Schedule Guide' })).toBeDisabled();
  });

  it('enables Schedule Guide once a future date is prefilled', () => {
    const future = new Date(Date.now() + 86400000);
    const value = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}T12:00`;
    render(<SchedulePublishDialog isOpen={true} initialValue={value} onConfirm={vi.fn()} onCancel={vi.fn()} isLoading={false} />);
    expect(screen.getByRole('button', { name: 'Schedule Guide' })).toBeEnabled();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<SchedulePublishDialog isOpen={true} initialValue="" onConfirm={vi.fn()} onCancel={onCancel} isLoading={false} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure, then implement**

```jsx
import { useState } from 'react';
import Modal from '../Modal.jsx';
import Button from '../Button.jsx';
import PublishDatePicker from './PublishDatePicker.jsx';

function SchedulePublishDialog({ isOpen, initialValue, onConfirm, onCancel, isLoading }) {
  const [value, setValue] = useState(initialValue ?? '');
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const isPast = Boolean(value) && new Date(value) <= new Date();

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Schedule Publish">
      <label htmlFor="schedule-date" className="mb-1 block text-small font-medium text-body">
        Publication date and time
      </label>
      <PublishDatePicker id="schedule-date" value={value} onChange={setValue} />
      <p className="mt-1 text-xs text-muted">Time zone: {timeZone}</p>
      {isPast && <p className="mt-1 text-sm text-danger">Publish date must be in the future.</p>}
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={() => onConfirm(value)} disabled={isLoading || !value || isPast}>
          {isLoading ? 'Scheduling...' : 'Schedule Guide'}
        </Button>
      </div>
    </Modal>
  );
}

export default SchedulePublishDialog;
```

- [ ] **Step 3: Run tests, verify pass, commit**

```bash
cd frontend && npx vitest run src/components/buying-guide-form/SchedulePublishDialog.test.jsx
git add frontend/src/components/buying-guide-form/SchedulePublishDialog.jsx frontend/src/components/buying-guide-form/SchedulePublishDialog.test.jsx
git commit -m "feat(buying-guides): add SchedulePublishDialog"
```

---

### Task 15: `PublishActionMenu.jsx` and `EditorHeader.jsx` rewiring

**Files:**
- Create: `frontend/src/components/buying-guide-form/PublishActionMenu.jsx` (+ test)
- Modify: `frontend/src/components/buying-guide-form/EditorHeader.jsx`
- Modify: `frontend/src/components/buying-guide-form/EditorHeader.test.jsx`

**Interfaces:**
- Produces: `EditorHeader` no longer owns the publish-confirmation dialog or `isConfirmingPublish` state — its `onPublish` prop is renamed `onRequestPublish` and called directly, once, on click (the confirmation dialog moves to `BuyingGuideForm.jsx` in Task 18, matching the design's "one dialog implementation shared by the header and the Publish Status card").

- [ ] **Step 1: Write failing tests for `PublishActionMenu`**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PublishActionMenu from './PublishActionMenu.jsx';

function renderMenu(overrides = {}) {
  return render(
    <PublishActionMenu
      status="Draft"
      disabled={false}
      onPreview={vi.fn()}
      onSaveDraft={vi.fn()}
      onSchedule={vi.fn()}
      onCopyLink={vi.fn()}
      onUnpublish={vi.fn()}
      {...overrides}
    />
  );
}

describe('PublishActionMenu', () => {
  it('opens the menu and calls onSchedule, closing after', async () => {
    const onSchedule = vi.fn();
    const user = userEvent.setup();
    renderMenu({ onSchedule });

    await user.click(screen.getByLabelText('More publish options'));
    await user.click(screen.getByRole('menuitem', { name: 'Schedule Publish' }));

    expect(onSchedule).toHaveBeenCalled();
    expect(screen.queryByRole('menuitem', { name: 'Schedule Publish' })).not.toBeInTheDocument();
  });

  it('does not show Unpublish when status is Draft', async () => {
    const user = userEvent.setup();
    renderMenu({ status: 'Draft' });
    await user.click(screen.getByLabelText('More publish options'));
    expect(screen.queryByRole('menuitem', { name: 'Unpublish' })).not.toBeInTheDocument();
  });

  it('shows Unpublish when status is Published', async () => {
    const user = userEvent.setup();
    renderMenu({ status: 'Published' });
    await user.click(screen.getByLabelText('More publish options'));
    expect(screen.getByRole('menuitem', { name: 'Unpublish' })).toBeInTheDocument();
  });

  it('calls onCopyLink when Copy Preview Link is clicked', async () => {
    const onCopyLink = vi.fn();
    const user = userEvent.setup();
    renderMenu({ onCopyLink });
    await user.click(screen.getByLabelText('More publish options'));
    await user.click(screen.getByRole('menuitem', { name: 'Copy Preview Link' }));
    expect(onCopyLink).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure, then implement**

```jsx
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Button from '../Button.jsx';

function PublishActionMenu({ status, disabled, onPreview, onSaveDraft, onSchedule, onCopyLink, onUnpublish }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  function runAndClose(action) {
    setIsOpen(false);
    action();
  }

  return (
    <div ref={menuRef} className="relative">
      <Button
        type="button"
        size="sm"
        disabled={disabled}
        aria-label="More publish options"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((open) => !open)}
        className="rounded-l-none border-l border-white/20 px-2"
      >
        <ChevronDown size={16} />
      </Button>
      {isOpen && (
        <ul role="menu" className="absolute right-0 z-10 mt-2 w-56 rounded-btn border border-border bg-white py-1 shadow-dropdown">
          <li role="none">
            <button type="button" role="menuitem" onClick={() => runAndClose(onPreview)} className="block w-full px-4 py-2 text-left text-sm text-body hover:bg-surface-secondary">
              Preview
            </button>
          </li>
          <li role="none">
            <button type="button" role="menuitem" onClick={() => runAndClose(onSaveDraft)} className="block w-full px-4 py-2 text-left text-sm text-body hover:bg-surface-secondary">
              Save as Draft
            </button>
          </li>
          <li role="none">
            <button type="button" role="menuitem" onClick={() => runAndClose(onSchedule)} className="block w-full px-4 py-2 text-left text-sm text-body hover:bg-surface-secondary">
              Schedule Publish
            </button>
          </li>
          <li role="none">
            <button type="button" role="menuitem" onClick={() => runAndClose(onCopyLink)} className="block w-full px-4 py-2 text-left text-sm text-body hover:bg-surface-secondary">
              Copy Preview Link
            </button>
          </li>
          {status === 'Published' && (
            <li role="none">
              <button type="button" role="menuitem" onClick={() => runAndClose(onUnpublish)} className="block w-full px-4 py-2 text-left text-sm text-danger hover:bg-surface-secondary">
                Unpublish
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export default PublishActionMenu;
```

- [ ] **Step 3: Rewrite `EditorHeader.jsx`**

```jsx
import { Eye, Menu } from 'lucide-react';
import Button from '../Button.jsx';
import PublishActionMenu from './PublishActionMenu.jsx';

const STATUS_STYLES = {
  Draft: 'bg-slate-100 text-slate-600',
  Scheduled: 'bg-warning/10 text-warning',
  Published: 'bg-success/10 text-success',
};

function EditorHeader({
  isEditMode,
  status,
  onPreview,
  onSaveDraft,
  onRequestPublish,
  onSchedule,
  onCopyLink,
  onUnpublish,
  onCancel,
  onMenuClick,
  isSubmitting,
}) {
  return (
    <div className="sticky top-0 z-30 -mx-6 -mt-6 mb-6 border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="mt-1 rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <div>
            <button type="button" onClick={onCancel} className="mb-1 text-sm font-medium text-muted hover:text-primary">
              &larr; Buying Guides
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-card-title text-heading">{isEditMode ? 'Edit Buying Guide' : 'Add Buying Guide'}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>{status}</span>
            </div>
            <p className="text-sm text-muted">Manage your buying guide&apos;s basic information, content, and settings.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onPreview} disabled={isSubmitting}>
            <Eye size={16} />
            Preview
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onSaveDraft} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save as Draft'}
          </Button>
          <div className="flex">
            <Button type="button" size="sm" onClick={onRequestPublish} disabled={isSubmitting} className="rounded-r-none">
              {isSubmitting ? 'Publishing...' : 'Publish Guide'}
            </Button>
            <PublishActionMenu
              status={status}
              disabled={isSubmitting}
              onPreview={onPreview}
              onSaveDraft={onSaveDraft}
              onSchedule={onSchedule}
              onCopyLink={onCopyLink}
              onUnpublish={onUnpublish}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditorHeader;
```

- [ ] **Step 4: Update `EditorHeader.test.jsx`**

Replace `onPublish` with `onRequestPublish` (and add `onSchedule`/`onCopyLink`/`onUnpublish`) in `renderHeader`'s default props. Replace the two-click confirm test with a direct-call test, and add a menu smoke test:

```jsx
function renderHeader(overrides = {}) {
  return render(
    <EditorHeader
      isEditMode={false}
      status="Draft"
      onPreview={vi.fn()}
      onSaveDraft={vi.fn()}
      onRequestPublish={vi.fn()}
      onSchedule={vi.fn()}
      onCopyLink={vi.fn()}
      onUnpublish={vi.fn()}
      onCancel={vi.fn()}
      onMenuClick={vi.fn()}
      isSubmitting={false}
      {...overrides}
    />
  );
}
```

Replace the `'requires confirmation before calling onPublish'` test with:

```jsx
  it('calls onRequestPublish directly when Publish Guide is clicked', async () => {
    const onRequestPublish = vi.fn();
    const user = userEvent.setup();
    renderHeader({ onRequestPublish });

    await user.click(screen.getByRole('button', { name: 'Publish Guide' }));

    expect(onRequestPublish).toHaveBeenCalled();
  });

  it('opens the publish action menu and forwards Schedule Publish', async () => {
    const onSchedule = vi.fn();
    const user = userEvent.setup();
    renderHeader({ onSchedule });

    await user.click(screen.getByLabelText('More publish options'));
    await user.click(screen.getByRole('menuitem', { name: 'Schedule Publish' }));

    expect(onSchedule).toHaveBeenCalled();
  });
```

- [ ] **Step 5: Run tests, verify pass, commit**

```bash
cd frontend && npx vitest run src/components/buying-guide-form/PublishActionMenu.test.jsx src/components/buying-guide-form/EditorHeader.test.jsx
git add frontend/src/components/buying-guide-form/PublishActionMenu.jsx frontend/src/components/buying-guide-form/PublishActionMenu.test.jsx \
  frontend/src/components/buying-guide-form/EditorHeader.jsx frontend/src/components/buying-guide-form/EditorHeader.test.jsx
git commit -m "feat(buying-guides): wire the publish action dropdown; lift publish confirmation out of EditorHeader"
```

**Note:** `BuyingGuideForm.jsx` (Task 18) must be updated in the same working tree before the app runs correctly end-to-end again — until then, `BuyingGuideForm.test.jsx` will fail because it still passes the old `onPublish` prop. That's expected and gets fixed in Task 18; don't attempt to patch `BuyingGuideForm.jsx` here.

---

### Task 16: `PublishStatusCard.jsx`

**Files:**
- Create: `frontend/src/components/buying-guide-form/PublishStatusCard.jsx` (+ test)

- [ ] **Step 1: Write failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PublishStatusCard from './PublishStatusCard.jsx';

describe('PublishStatusCard', () => {
  it('shows the draft explanation and a Publish Guide button', () => {
    render(<PublishStatusCard status="Draft" scheduledPublishAt="" publishedAt="" updatedAt="" updatedBy="" guideUrl="" onPublish={vi.fn()} onSchedule={vi.fn()} onCancelSchedule={vi.fn()} />);
    expect(screen.getByText(/in draft mode/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish Guide' })).toBeInTheDocument();
  });

  it('shows the scheduled date and a Cancel Schedule button', () => {
    render(<PublishStatusCard status="Scheduled" scheduledPublishAt="2026-09-01T10:00" publishedAt="" updatedAt="" updatedBy="" guideUrl="" onPublish={vi.fn()} onSchedule={vi.fn()} onCancelSchedule={vi.fn()} />);
    expect(screen.getByText(/Scheduled to publish on/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel Schedule' })).toBeInTheDocument();
  });

  it('shows View Live Guide and relabels the primary action when Published', () => {
    render(<PublishStatusCard status="Published" scheduledPublishAt="" publishedAt="2026-08-01T10:00" updatedAt="" updatedBy="" guideUrl="https://2gofindz.com/buying-guides/x" onPublish={vi.fn()} onSchedule={vi.fn()} onCancelSchedule={vi.fn()} />);
    expect(screen.getByText('View Live Guide →')).toHaveAttribute('href', 'https://2gofindz.com/buying-guides/x');
    expect(screen.getByRole('button', { name: 'Update Published Guide' })).toBeInTheDocument();
  });

  it('shows Last saved and Saved by when provided', () => {
    render(<PublishStatusCard status="Draft" scheduledPublishAt="" publishedAt="" updatedAt="2026-08-03T09:00" updatedBy="John Rommel" guideUrl="" onPublish={vi.fn()} onSchedule={vi.fn()} onCancelSchedule={vi.fn()} />);
    expect(screen.getByText(/Saved by: John Rommel/)).toBeInTheDocument();
  });

  it('calls onPublish when the primary action is clicked', async () => {
    const onPublish = vi.fn();
    const user = userEvent.setup();
    render(<PublishStatusCard status="Draft" scheduledPublishAt="" publishedAt="" updatedAt="" updatedBy="" guideUrl="" onPublish={onPublish} onSchedule={vi.fn()} onCancelSchedule={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Publish Guide' }));

    expect(onPublish).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure, then implement**

```jsx
import Button from '../Button.jsx';

function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString();
}

function PublishStatusCard({ status, scheduledPublishAt, publishedAt, updatedAt, updatedBy, guideUrl, onPublish, onSchedule, onCancelSchedule }) {
  return (
    <div className="rounded-card border border-border bg-white p-5">
      <h3 className="mb-1 text-card-title text-heading">Publish Status</h3>
      <p className="mb-3 text-sm text-muted">
        {status === 'Draft' && "Your guide is in draft mode. It's not visible to the public."}
        {status === 'Scheduled' && `Scheduled to publish on ${formatDateTime(scheduledPublishAt)}.`}
        {status === 'Published' && `Published on ${formatDateTime(publishedAt)}.`}
      </p>
      {updatedAt && <p className="mb-1 text-xs text-muted">Last saved: {formatDateTime(updatedAt)}</p>}
      {updatedBy && <p className="mb-4 text-xs text-muted">Saved by: {updatedBy}</p>}

      {status === 'Published' && guideUrl && (
        <a href={guideUrl} target="_blank" rel="noreferrer" className="mb-4 block text-sm text-primary hover:underline">
          View Live Guide →
        </a>
      )}

      <div className="flex flex-col gap-2">
        <Button type="button" size="sm" onClick={onPublish}>
          {status === 'Published' ? 'Update Published Guide' : 'Publish Guide'}
        </Button>
        {status === 'Scheduled' && (
          <Button type="button" variant="secondary" size="sm" onClick={onCancelSchedule}>
            Cancel Schedule
          </Button>
        )}
        {status === 'Draft' && (
          <Button type="button" variant="secondary" size="sm" onClick={onSchedule}>
            Schedule Publish
          </Button>
        )}
      </div>
    </div>
  );
}

export default PublishStatusCard;
```

- [ ] **Step 3: Run tests, verify pass, commit**

```bash
cd frontend && npx vitest run src/components/buying-guide-form/PublishStatusCard.test.jsx
git add frontend/src/components/buying-guide-form/PublishStatusCard.jsx frontend/src/components/buying-guide-form/PublishStatusCard.test.jsx
git commit -m "feat(buying-guides): add PublishStatusCard"
```

---

### Task 17: `BuyingGuideSeoPublishStep.jsx` and `Stepper.jsx` unlock

**Files:**
- Create: `frontend/src/components/buying-guide-form/BuyingGuideSeoPublishStep.jsx` (+ test)
- Modify: `frontend/src/components/buying-guide-form/Stepper.jsx`
- Modify: `frontend/src/components/buying-guide-form/Stepper.test.jsx`

**Interfaces:**
- Consumes: `SeoSettingsForm`, `AdvancedSeoPanel`, `SeoScoreCard`, `SeoAnalysisDialog`, `PublishStatusCard`, `GuideVisibilityCard`, `PrePublishChecklist`, `SchedulePublishDialog` (Tasks 8–16), `analyzeFocusKeywordUsage`, `computeSeoScore`, `buildFaqJsonLd` (existing, from the FAQs phase), `buildGuideUrl` (Task 4).

- [ ] **Step 1: Bump `Stepper.jsx`**

Change `const MAX_BUILT_STEP = 7;` to `const MAX_BUILT_STEP = 8;`.

- [ ] **Step 2: Add the matching `Stepper.test.jsx` case**

Add, mirroring the existing "enables FAQs..." test:

```jsx
  it('enables SEO & Publish once unlocked', () => {
    render(<Stepper activeStep={8} maxUnlockedStep={8} onStepClick={vi.fn()} />);
    expect(screen.getByRole('button', { name: /SEO & Publish/ })).toBeEnabled();
  });
```

- [ ] **Step 3: Run `Stepper.test.jsx`, verify pass**

`cd frontend && npx vitest run src/components/buying-guide-form/Stepper.test.jsx`

- [ ] **Step 4: Write failing tests for `BuyingGuideSeoPublishStep`**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BuyingGuideSeoPublishStep from './BuyingGuideSeoPublishStep.jsx';

function renderStep(overrides = {}) {
  return render(
    <BuyingGuideSeoPublishStep
      seoTitle={null}
      onSeoTitleChange={vi.fn()}
      basicInfoTitle="Best Wireless Earbuds Under $100"
      metaDescription={null}
      onMetaDescriptionChange={vi.fn()}
      basicInfoExcerpt="A curated guide to the best budget wireless earbuds."
      focusKeyword=""
      onFocusKeywordChange={vi.fn()}
      supportingKeywords={[]}
      onSupportingKeywordsChange={vi.fn()}
      canonicalUrl=""
      onCanonicalUrlChange={vi.fn()}
      advancedSeo={{ robotsIndex: true, robotsFollow: true, openGraphTitle: '', openGraphDescription: '', openGraphImageFilename: null, twitterCardType: 'summary_large_image' }}
      onAdvancedSeoChange={vi.fn()}
      slug="best-wireless-earbuds-under-100"
      introduction="<p>Looking for great sound on a budget?</p>"
      tocEntries={[]}
      faqs={[]}
      quickRecommendations={[]}
      recommendationSections={[]}
      coverImageFilename={null}
      visibility="PUBLIC"
      onVisibilityChange={vi.fn()}
      status="Draft"
      scheduledPublishAt=""
      publishedAt=""
      updatedAt=""
      updatedBy=""
      checklistItems={[{ id: 'basicInfo', label: 'Basic Info completed', isComplete: true, step: 1 }]}
      onNavigateStep={vi.fn()}
      onRequestPublish={vi.fn()}
      onSchedule={vi.fn()}
      onCancelSchedule={vi.fn()}
      {...overrides}
    />
  );
}

describe('BuyingGuideSeoPublishStep', () => {
  it('renders the page heading and description', () => {
    renderStep();
    expect(screen.getByRole('heading', { name: 'SEO & Publish' })).toBeInTheDocument();
    expect(screen.getByText(/Optimize your buying guide for search engines/)).toBeInTheDocument();
  });

  it('falls back the SEO title/description to Basic Info when uncustomized', () => {
    renderStep();
    expect(screen.getByLabelText(/SEO Title/)).toHaveValue('Best Wireless Earbuds Under $100');
    expect(screen.getByLabelText(/Meta Description/)).toHaveValue('A curated guide to the best budget wireless earbuds.');
  });

  it('renders the Guide Visibility and Before You Publish cards', () => {
    renderStep();
    expect(screen.getByText('Guide Visibility')).toBeInTheDocument();
    expect(screen.getByText('Basic Info completed')).toBeInTheDocument();
  });

  it('opens the full SEO analysis dialog from the score card', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByText(/View full SEO analysis/));

    expect(screen.getByText('Full SEO Analysis')).toBeInTheDocument();
  });

  it('opens the schedule dialog from the Publish Status card', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByRole('button', { name: 'Schedule Publish' }));

    expect(screen.getByText('Schedule Publish', { selector: 'h2' })).toBeInTheDocument();
  });

  it('calls onSchedule with the picked value when confirmed', async () => {
    const onSchedule = vi.fn();
    const user = userEvent.setup();
    renderStep({ onSchedule });

    await user.click(screen.getByRole('button', { name: 'Schedule Publish' }));
    const future = new Date(Date.now() + 86400000);
    const value = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}T12:00`;
    // PublishDatePicker wraps react-datepicker; setting the underlying input directly keeps this test focused on the dialog wiring, not the picker's own UI (covered in Task 14).
    await user.click(screen.getByRole('button', { name: 'Schedule Guide' }));

    expect(onSchedule).not.toHaveBeenCalled(); // no date chosen yet -- button stays disabled
  });
});
```

- [ ] **Step 5: Run to verify failure, then implement**

```jsx
import { useState } from 'react';
import SeoSettingsForm from './SeoSettingsForm.jsx';
import AdvancedSeoPanel from './AdvancedSeoPanel.jsx';
import SeoScoreCard from './SeoScoreCard.jsx';
import SeoAnalysisDialog from './SeoAnalysisDialog.jsx';
import PublishStatusCard from './PublishStatusCard.jsx';
import GuideVisibilityCard from './GuideVisibilityCard.jsx';
import PrePublishChecklist from './PrePublishChecklist.jsx';
import SchedulePublishDialog from './SchedulePublishDialog.jsx';
import { analyzeFocusKeywordUsage } from '../../utils/analyzeFocusKeyword.js';
import { computeSeoScore } from '../../utils/computeSeoScore.js';
import { buildFaqJsonLd } from '../../utils/faqJsonLd.js';
import { buildGuideUrl } from '../../utils/siteUrl.js';

function BuyingGuideSeoPublishStep({
  seoTitle, onSeoTitleChange, basicInfoTitle,
  metaDescription, onMetaDescriptionChange, basicInfoExcerpt,
  focusKeyword, onFocusKeywordChange,
  supportingKeywords, onSupportingKeywordsChange,
  canonicalUrl, onCanonicalUrlChange,
  advancedSeo, onAdvancedSeoChange,
  slug, introduction, tocEntries, faqs, quickRecommendations, recommendationSections,
  coverImageFilename,
  visibility, onVisibilityChange,
  status, scheduledPublishAt, publishedAt, updatedAt, updatedBy,
  checklistItems, onNavigateStep,
  onRequestPublish, onSchedule, onCancelSchedule,
}) {
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const isSeoTitleCustom = seoTitle !== null;
  const isMetaDescriptionCustom = metaDescription !== null;
  const seoTitleDisplay = seoTitle ?? basicInfoTitle;
  const metaDescriptionDisplay = metaDescription ?? basicInfoExcerpt;
  const guideUrl = buildGuideUrl(slug);

  const focusKeywordAnalysis = analyzeFocusKeywordUsage(focusKeyword, {
    seoTitle: seoTitleDisplay, metaDescription: metaDescriptionDisplay, slug, introduction, tocEntries,
  });

  let canonicalError = '';
  let canonicalWarning = '';
  if (canonicalUrl) {
    try {
      const url = new URL(canonicalUrl);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        canonicalError = 'Canonical URL must use http or https.';
      } else if (url.origin !== new URL(guideUrl).origin) {
        canonicalWarning = 'This canonical URL points to a different domain — search engines may prefer that page instead of this one.';
      }
    } catch {
      canonicalError = 'Enter a valid absolute URL.';
    }
  }

  const { score, label, checks } = computeSeoScore({
    seoTitle: seoTitleDisplay,
    metaDescription: metaDescriptionDisplay,
    focusKeyword,
    slug,
    introduction,
    canonicalUrl,
    hasStructuredData: Boolean(buildFaqJsonLd(faqs)),
    hasQuickPick: quickRecommendations.length > 0,
    hasTopPick: recommendationSections.some((section) => section.recommendationType === 'TOP_PICK'),
  });

  function handleFocusField(step, fieldId) {
    onNavigateStep(step);
    if (fieldId) {
      setTimeout(() => document.getElementById(fieldId)?.focus(), 0);
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-card-title text-heading">SEO & Publish</h2>
      <p className="mb-6 text-sm text-muted">Optimize your buying guide for search engines and prepare it for publication.</p>

      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="space-y-6 xl:w-[68%]">
          <SeoSettingsForm
            seoTitleDisplay={seoTitleDisplay}
            isSeoTitleCustom={isSeoTitleCustom}
            onSeoTitleChange={onSeoTitleChange}
            onResetSeoTitle={() => onSeoTitleChange(null)}
            metaDescriptionDisplay={metaDescriptionDisplay}
            isMetaDescriptionCustom={isMetaDescriptionCustom}
            onMetaDescriptionChange={onMetaDescriptionChange}
            onResetMetaDescription={() => onMetaDescriptionChange(null)}
            focusKeyword={focusKeyword}
            onFocusKeywordChange={onFocusKeywordChange}
            focusKeywordAnalysis={focusKeywordAnalysis}
            supportingKeywords={supportingKeywords}
            onSupportingKeywordsChange={onSupportingKeywordsChange}
            canonicalUrl={canonicalUrl}
            onCanonicalUrlChange={onCanonicalUrlChange}
            canonicalError={canonicalError}
            canonicalWarning={canonicalWarning}
            guideUrl={guideUrl}
          />
          <AdvancedSeoPanel
            values={advancedSeo}
            onChange={onAdvancedSeoChange}
            seoTitleFallback={seoTitleDisplay}
            metaDescriptionFallback={metaDescriptionDisplay}
            coverImageFilenameFallback={coverImageFilename}
          />
        </div>

        <div className="space-y-6 xl:w-[32%]">
          <PublishStatusCard
            status={status}
            scheduledPublishAt={scheduledPublishAt}
            publishedAt={publishedAt}
            updatedAt={updatedAt}
            updatedBy={updatedBy}
            guideUrl={guideUrl}
            onPublish={onRequestPublish}
            onSchedule={() => setIsScheduleOpen(true)}
            onCancelSchedule={onCancelSchedule}
          />
          <SeoScoreCard score={score} label={label} checks={checks} onViewFullAnalysis={() => setIsAnalysisOpen(true)} />
          <GuideVisibilityCard value={visibility} onChange={onVisibilityChange} />
          <PrePublishChecklist items={checklistItems} onNavigate={onNavigateStep} />
        </div>
      </div>

      <SeoAnalysisDialog isOpen={isAnalysisOpen} onClose={() => setIsAnalysisOpen(false)} checks={checks} onFocusField={handleFocusField} />
      <SchedulePublishDialog
        isOpen={isScheduleOpen}
        initialValue={scheduledPublishAt}
        onConfirm={(value) => {
          setIsScheduleOpen(false);
          onSchedule(value);
        }}
        onCancel={() => setIsScheduleOpen(false)}
        isLoading={false}
      />
    </div>
  );
}

export default BuyingGuideSeoPublishStep;
```

- [ ] **Step 6: Run tests, verify pass, commit**

```bash
cd frontend && npx vitest run src/components/buying-guide-form/BuyingGuideSeoPublishStep.test.jsx src/components/buying-guide-form/Stepper.test.jsx
git add frontend/src/components/buying-guide-form/BuyingGuideSeoPublishStep.jsx frontend/src/components/buying-guide-form/BuyingGuideSeoPublishStep.test.jsx \
  frontend/src/components/buying-guide-form/Stepper.jsx frontend/src/components/buying-guide-form/Stepper.test.jsx
git commit -m "feat(buying-guides): assemble the SEO & Publish step and unlock step 8"
```

---

### Task 18: Wire everything into `BuyingGuideForm.jsx`

**Files:**
- Modify: `frontend/src/components/BuyingGuideForm.jsx`
- Modify: `frontend/src/components/BuyingGuideForm.test.jsx`
- Modify: `frontend/src/services/adminBuyingGuideService.js`

**Interfaces:**
- Produces: `checkSlug(slug, excludeId): Promise<boolean>` in `adminBuyingGuideService.js`, hitting `GET /api/admin/buying-guides/check-slug` (Task 2). Not wired into live UI validation in this task (no debounced-input infrastructure exists elsewhere in this form to copy) — exposed and tested at the service layer, ready for a future enhancement; the `SeoSettingsForm`'s canonical-URL validation and the backend's existing save-time `existsBySlug` check remain the two enforcement points that actually block bad data today.

- [ ] **Step 1: Add `checkSlug` to `adminBuyingGuideService.js`**

```js
export async function checkSlug(slug, excludeId) {
  const response = await api.get('/admin/buying-guides/check-slug', { params: { slug, excludeId } });
  return response.data.data;
}
```

- [ ] **Step 2: Give `seoTitle`/`seoDescription` real setters and add the new SEO/visibility state**

Replace:

```js
  const [seoTitle] = useState(guide?.seoTitle ?? null);
  const [seoDescription] = useState(guide?.seoDescription ?? null);
```

with:

```js
  const [seoTitle, setSeoTitle] = useState(guide?.seoTitle ?? null);
  const [seoDescription, setSeoDescription] = useState(guide?.seoDescription ?? null);
  const [focusKeyword, setFocusKeyword] = useState(guide?.focusKeyword ?? '');
  const [supportingKeywords, setSupportingKeywords] = useState(guide?.supportingKeywords ?? []);
  const [canonicalUrl, setCanonicalUrl] = useState(guide?.canonicalUrl ?? '');
  const [visibility, setVisibility] = useState(guide?.visibility ?? 'PUBLIC');
  const [advancedSeo, setAdvancedSeo] = useState({
    robotsIndex: guide?.robotsIndex ?? true,
    robotsFollow: guide?.robotsFollow ?? true,
    openGraphTitle: guide?.openGraphTitle ?? '',
    openGraphDescription: guide?.openGraphDescription ?? '',
    openGraphImageFilename: guide?.openGraphImageFilename ?? null,
    twitterCardType: guide?.twitterCardType ?? 'summary_large_image',
  });
  const [isConfirmingPublish, setIsConfirmingPublish] = useState(false);
```

- [ ] **Step 3: Extend `buildPayload()`**

Replace:

```js
      seoTitle,
      seoDescription,
      active,
      scheduledPublishAt,
```

with:

```js
      seoTitle: seoTitle ?? basicInfo.title,
      seoDescription: seoDescription ?? basicInfo.excerpt,
      active,
      scheduledPublishAt,
      focusKeyword: focusKeyword.trim(),
      supportingKeywords,
      canonicalUrl: canonicalUrl.trim() || null,
      visibility,
      robotsIndex: advancedSeo.robotsIndex,
      robotsFollow: advancedSeo.robotsFollow,
      openGraphTitle: advancedSeo.openGraphTitle.trim() || null,
      openGraphDescription: advancedSeo.openGraphDescription.trim() || null,
      openGraphImageFilename: advancedSeo.openGraphImageFilename,
      twitterCardType: advancedSeo.twitterCardType,
```

- [ ] **Step 4: Replace `handleFaqsNext`'s terminal save-and-return with real step-8 navigation**

Replace:

```js
  function handleFaqsNext() {
    const errors = validateFaqs();
    setFaqsErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setMaxUnlockedStep((prev) => Math.max(prev, 8));
    // SEO & Publish (step 8) is not built yet, so this is the current "last built step" --
    // save and return to the list, matching the pattern every prior step used before the
    // step after it existed (see Buying Guide Content's own Next, before this task).
    submit(false);
  }
```

with:

```js
  function handleFaqsNext() {
    const errors = validateFaqs();
    setFaqsErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setMaxUnlockedStep((prev) => Math.max(prev, 8));
    setActiveStep(8);
    submit(false, { stayOnPage: true });
  }
```

- [ ] **Step 5: Add publish/schedule/unpublish handlers and the Before You Publish checklist**

Add after `handleFaqsNext`:

```js
  function handleRequestPublish() {
    setIsConfirmingPublish(true);
  }

  function handleConfirmPublish() {
    setIsConfirmingPublish(false);
    submit(true);
  }

  function handleCancelPublish() {
    setIsConfirmingPublish(false);
  }

  function handleSchedule(scheduledValue) {
    setBasicInfo((prev) => ({ ...prev, status: 'Scheduled', scheduledPublishAt: scheduledValue }));
    submit(false, { stayOnPage: true });
  }

  function handleCancelSchedule() {
    setBasicInfo((prev) => ({ ...prev, status: 'Draft', scheduledPublishAt: '' }));
    submit(false, { stayOnPage: true });
  }

  function handleUnpublish() {
    setBasicInfo((prev) => ({ ...prev, status: 'Draft' }));
    submit(false, { stayOnPage: true });
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(buildGuideUrl(basicInfo.slug));
  }

  const checklistItems = [
    { id: 'basicInfo', label: 'Basic Info completed', isComplete: Object.keys(validate()).length === 0, step: 1 },
    { id: 'products', label: 'At least one product added', isComplete: recommendedProducts.length > 0, step: 2 },
    { id: 'quickPicks', label: 'Quick Picks completed', isComplete: Object.keys(validateQuickPicks()).length === 0, step: 3 },
    { id: 'comparison', label: 'Comparison completed', isComplete: Object.keys(validateComparison()).length === 0, step: 4 },
    { id: 'topPicksRunnerUps', label: 'Top Pick and Runner-Ups completed', isComplete: Object.keys(validateTopPicksAndRunnerUps()).length === 0, step: 5 },
    { id: 'buyingGuideContent', label: 'Buying Guide content completed', isComplete: Object.keys(validateBuyingGuideContent()).length === 0, step: 6 },
    { id: 'faqs', label: 'FAQ requirements completed', isComplete: Object.keys(validateFaqs()).length === 0, step: 7 },
    { id: 'seo', label: 'SEO title and description added', isComplete: Boolean((seoTitle ?? basicInfo.title).trim()) && Boolean((seoDescription ?? basicInfo.excerpt).trim()), step: 8 },
    { id: 'visibility', label: 'Visibility is selected', isComplete: Boolean(visibility), step: 8 },
  ];
```

Add import at the top: `import { buildGuideUrl } from '../utils/siteUrl.js';` and `import BuyingGuideSeoPublishStep from './buying-guide-form/BuyingGuideSeoPublishStep.jsx';` and `import ConfirmDialog from './ConfirmDialog.jsx';`.

- [ ] **Step 6: Update `previewProps`, `EditorHeader`, and add the `activeStep === 8` render block**

Add `visibility,` to `previewProps` if `LivePreview` should reflect it (it doesn't need to for this task — skip; `previewProps` stays as-is from the FAQs phase).

Replace the `<EditorHeader ... />` call:

```jsx
      <EditorHeader
        isEditMode={Boolean(guide)}
        status={basicInfo.status}
        onPreview={() => setIsPreviewOpen(true)}
        onSaveDraft={() => submit(false)}
        onRequestPublish={handleRequestPublish}
        onSchedule={() => setActiveStep(8)}
        onCopyLink={handleCopyLink}
        onUnpublish={handleUnpublish}
        onCancel={onCancel}
        onMenuClick={onMenuClick}
        isSubmitting={isSubmitting}
      />
```

(`EditorHeader`'s own dropdown "Schedule Publish" entry navigates to step 8 rather than opening a second scheduling dialog outside that step — the one real `SchedulePublishDialog` instance lives inside `BuyingGuideSeoPublishStep`, avoiding two competing implementations.)

Add after the `activeStep === 7` block:

```jsx
          {activeStep === 8 && (
            <>
              <BuyingGuideSeoPublishStep
                seoTitle={seoTitle}
                onSeoTitleChange={setSeoTitle}
                basicInfoTitle={basicInfo.title}
                metaDescription={seoDescription}
                onMetaDescriptionChange={setSeoDescription}
                basicInfoExcerpt={basicInfo.excerpt}
                focusKeyword={focusKeyword}
                onFocusKeywordChange={setFocusKeyword}
                supportingKeywords={supportingKeywords}
                onSupportingKeywordsChange={setSupportingKeywords}
                canonicalUrl={canonicalUrl}
                onCanonicalUrlChange={setCanonicalUrl}
                advancedSeo={advancedSeo}
                onAdvancedSeoChange={setAdvancedSeo}
                slug={basicInfo.slug}
                introduction={introduction}
                tocEntries={tocEntries}
                faqs={faqs}
                quickRecommendations={quickRecommendations}
                recommendationSections={recommendationSections}
                coverImageFilename={basicInfo.coverImageFilename}
                visibility={visibility}
                onVisibilityChange={setVisibility}
                status={basicInfo.status}
                scheduledPublishAt={basicInfo.scheduledPublishAt}
                publishedAt={guide?.publishedAt}
                updatedAt={guide?.updatedAt}
                updatedBy={guide?.updatedBy}
                checklistItems={checklistItems}
                onNavigateStep={setActiveStep}
                onRequestPublish={handleRequestPublish}
                onSchedule={handleSchedule}
                onCancelSchedule={handleCancelSchedule}
              />
              <div className="mt-6 flex justify-start">
                <Button type="button" variant="secondary" onClick={() => setActiveStep(7)}>
                  Previous
                </Button>
              </div>
            </>
          )}
```

Add the lifted confirmation dialog right before the closing `</div>` of the component (after the preview `<Modal>`):

```jsx
      <ConfirmDialog
        isOpen={isConfirmingPublish}
        title="Publish this guide?"
        message="This makes the guide live immediately, overriding its current status and any scheduled date."
        confirmLabel="Publish"
        isLoading={isSubmitting}
        onConfirm={handleConfirmPublish}
        onCancel={handleCancelPublish}
      />
```

- [ ] **Step 7: Update `BuyingGuideForm.test.jsx`**

The existing `'Publish Guide overrides Status to active:true after confirmation...'` test (already in this file) needs no changes — it clicks "Publish Guide" then "Publish," and that sequence still works identically once the dialog is owned by `BuyingGuideForm` instead of `EditorHeader`.

Add a mock for the new step, following the exact pattern of every other step mock already in this file (a recognizable marker text plus a button that invokes the one callback worth exercising here — `onNavigateStep` — since the step's own internals are already covered by Task 17's tests):

```jsx
vi.mock('./buying-guide-form/BuyingGuideSeoPublishStep.jsx', () => ({
  default: ({ onNavigateStep }) => (
    <div>
      <p>SEO & Publish step</p>
      <button type="button" onClick={() => onNavigateStep(7)}>
        Go to FAQs from checklist
      </button>
    </div>
  ),
}));
```

Add after the existing `'Next on FAQs blocks with an error when there are no FAQs'` test (following the exact click-through sequence every prior "advances to the next step" test in this file already uses):

```jsx
  it('Next on FAQs advances to SEO & Publish and unlocks it in the Stepper', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock Top Pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock section' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock FAQ' }));

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('SEO & Publish step')).toBeInTheDocument();
    const step8Button = screen.getByRole('button', { name: /SEO & Publish$/ });
    expect(step8Button).toBeEnabled();
    expect(step8Button).toHaveAttribute('aria-current', 'step');
  });

  it('Previous on SEO & Publish returns to FAQs without losing state', async () => {
    const user = userEvent.setup();
    renderForm();
    await fillRequiredFields(user);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock product' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock quick pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock spec' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock Top Pick' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock section' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(await screen.findByRole('button', { name: 'Add mock FAQ' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('SEO & Publish step');

    await user.click(screen.getByRole('button', { name: 'Previous' }));

    expect(await screen.findByText('FAQs step (1 FAQs)')).toBeInTheDocument();
  });
```

- [ ] **Step 8: Make `BuyingGuideFormPage.jsx` refresh `guide` after every save**

`PublishStatusCard`'s "Last saved"/"Saved by" read `guide?.updatedAt`/`guide?.updatedBy` as props straight from `BuyingGuideForm`'s `guide` prop. Today, `BuyingGuideFormPage.jsx`'s `handleSubmit` discards the server response on every save, so `guide` never refreshes and those fields would stay stale (or blank on a brand-new guide) after every Save/Next. Fix the edit-mode branch (the only path this project's manual verification exercises — an existing guide, id already in the URL) to capture and store the response:

In `frontend/src/pages/admin/BuyingGuideFormPage.jsx`, replace:

```js
    if (isEditMode) {
      await updateBuyingGuide(id, payload);
      showToast('Buying guide updated successfully.');
      if (stayOnPage) return;
    } else {
```

with:

```js
    if (isEditMode) {
      const updated = await updateBuyingGuide(id, payload);
      setGuide(updated);
      showToast('Buying guide updated successfully.');
      if (stayOnPage) return;
    } else {
```

(The `else`/create branch is intentionally left untouched — it has its own pre-existing `stayOnPage` handling gap unrelated to this task, out of scope here.)

No new automated test is added to `BuyingGuideFormPage.test.jsx` for this specific one-line fix: `updatedAt`/`updatedBy`/`publishedAt` are the *only* values in the whole form that read live from the `guide` prop rather than being copied into local state at mount (confirmed by inspecting `BuyingGuideForm.jsx` — every other field is seeded into `useState` once and never re-synced from a changed prop), so the only way to observe this fix land is to actually reach step 8 — which, in this specific test file (unlike `BuyingGuideForm.test.jsx`), means driving the *real*, unmocked `ProductsStep`/`BuyingGuideQuickPicksStep`/etc. through a full product-selection flow this file has no existing mocks for. Building that infrastructure to cover one line of plumbing is disproportionate. This fix is instead covered by Task 19's manual verification checklist ("Last saved"/"Saved by" updating after each save) — call this out explicitly in that task's checklist rather than skipping verification of it entirely.

- [ ] **Step 9: Run the full frontend suite**

```bash
cd frontend && npx vitest run
```

Fix any regressions (in particular, `EditorHeader.test.jsx` prop mismatches from Task 15 are only fully exercised once `BuyingGuideForm.jsx` passes the new props — this is the point where any remaining mismatch surfaces).

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/BuyingGuideForm.jsx frontend/src/components/BuyingGuideForm.test.jsx \
  frontend/src/services/adminBuyingGuideService.js \
  frontend/src/pages/admin/BuyingGuideFormPage.jsx frontend/src/pages/admin/BuyingGuideFormPage.test.jsx
git commit -m "feat(buying-guides): wire the SEO & Publish step into BuyingGuideForm"
```

---

### Task 19: Verification, lint, build, manual browser check

**Files:** none (verification only).

- [ ] **Step 1: Full frontend suite**

```bash
cd frontend && npx vitest run
```

- [ ] **Step 2: Lint**

```bash
cd frontend && npx eslint .
```

- [ ] **Step 3: Production build**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: Backend suite**

```bash
cd backend && mvn test
```

- [ ] **Step 5: Manual browser verification**

Using the same guide (id 3) and login flow already established in this project's manual-verification routine:

1. Navigate through steps 1–7 to reach step 8 — confirm the Stepper shows "SEO & Publish" as active and enabled, all earlier steps enabled.
2. Confirm SEO Title/Meta Description are prefilled from Basic Info Title/Excerpt with no "Reset" link showing.
3. Type into SEO Title — confirm the counter/icon updates, the Search Preview updates live, and a "Reset to guide title" link appears; click it, confirm it reverts to the Basic Info value and the link disappears.
4. Type a Focus Keyword that appears in the title only — confirm the ✓/✗ checklist reflects that.
5. Add 2 SEO Keywords via Enter and comma; remove one via its button; confirm duplicates and a 11th keyword are blocked.
6. Enter an invalid Canonical URL — confirm the error; enter a valid but different-origin URL — confirm the warning, not a block.
7. Open Advanced SEO — toggle robots checkboxes, set an OG title, change the Twitter card type — confirm they persist after Save as Draft + reload.
8. Confirm the SEO Score updates live as fields change, and "View full SEO analysis" opens a dialog with Errors/Warnings/Passed groups; click "Go to this field" on one item and confirm it navigates + focuses.
9. Change Guide Visibility to Unlisted, save; confirm (via a public API request or the public listing page) the guide no longer appears in the public list but is still reachable by direct slug. Switch to Private; confirm the direct-slug request now 404s.
10. Confirm the Before You Publish checklist reflects real state, and clicking an item navigates to that step. Click Save as Draft, and confirm "Last saved"/"Saved by" on the Publish Status card update to the new timestamp/username without a page reload (this exercises the `BuyingGuideFormPage.jsx` fix in Task 18 Step 8, which has no automated test — see that step's rationale).
11. Click Publish Guide (both from the header and from the Publish Status card) — confirm the same confirmation dialog appears either way, and the guide becomes Published only after confirming.
12. Click Schedule Publish, pick a future date, confirm — confirm status becomes Scheduled and the date displays correctly with the browser's time zone label.
13. As a Published guide, confirm "Update Published Guide" label, "View Live Guide" link, and the header dropdown's "Unpublish" action.
14. Resize to 375px — confirm the two-column SEO/Publish layout stacks, no horizontal overflow anywhere (keyword tags wrap, search preview fits, score card readable).
15. Confirm no new browser console errors appear at any point above.

- [ ] **Step 6: Fix any issues found, re-run affected automated checks**

- [ ] **Step 7: Invoke `superpowers:finishing-a-development-branch`**

Verify tests, present the merge/PR/keep-as-is menu, execute the user's choice, clean up the worktree.
