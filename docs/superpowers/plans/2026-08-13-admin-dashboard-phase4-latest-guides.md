# Admin Dashboard Phase 4: Latest Guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track buying-guide views in the database, surface the 5 most-recently-created guides with range-scoped view counts on the admin dashboard's analytics endpoint, and add a `LatestGuidesCard` filling the middle column of the dashboard's lower grid.

**Architecture:** A new `BuyingGuideView` entity/table/tracking endpoint mirrors the existing `ProductClick` pattern exactly (entity → migration → controller endpoint → service → repository). The dashboard aggregation mirrors Phase 2's `recentProducts` block exactly (top-5-by-createdAt entities, batched range-scoped count query, defaulted to 0). The frontend card mirrors `TopCategoriesCard`'s narrow-list style.

**Tech Stack:** Spring Boot, Spring Data JPA, Flyway, React, react-router-dom, lucide-react, Tailwind CSS.

## Global Constraints

- `views` is the count of `BuyingGuideView` rows within the selected date range for the 5 most-recently-created guides — not an all-time total, and it never affects which 5 guides appear (mirrors Recent Products' `clicks` field exactly).
- Guides appear in `latestGuides` regardless of `active` status — same "5 most recent, any status" rule as Recent Products.
- Status badge wording is "Published"/"Draft" — this is buying guides' own real existing convention (already used verbatim in `frontend/src/pages/admin/BuyingGuidesPage.jsx`), not a scoped substitution.
- Every backend view-tracking file (entity, migration, controller endpoint, service, repository method) mirrors its `ProductClick` equivalent structurally — same field names, same annotations, same query shape.
- Spec reference: `docs/superpowers/specs/2026-08-13-admin-dashboard-phase4-latest-guides-design.md`.

---

### Task 1: Backend — `BuyingGuideView` tracking (entity, migration, endpoint)

**Files:**
- Create: `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideView.java`
- Create: `backend/src/main/resources/db/migration/V22__create_buying_guide_views_table.sql`
- Create: `backend/src/main/java/com/twogofindz/backend/dto/request/GuideViewRequest.java`
- Create: `backend/src/main/java/com/twogofindz/backend/repository/BuyingGuideViewRepository.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/GuideViewTrackingService.java`
- Create: `backend/src/main/java/com/twogofindz/backend/service/impl/GuideViewTrackingServiceImpl.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideController.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java`

**Interfaces:**
- Produces: `POST /api/public/buying-guides/{id}/view` — records one `BuyingGuideView` row. Consumed by Task 3 (frontend) and by Task 2's test setup (to generate view data for the analytics endpoint).

- [ ] **Step 1: Write the failing test**

Add to `PublicBuyingGuideControllerTest.java` (check its existing imports for `adminToken`/category-creation helpers inherited from `AbstractIntegrationTest` — reuse them, don't redefine):

```java
@Test
void recordView_incrementsGuideViewCount() throws Exception {
    String token = adminToken();
    Long categoryId = createCategoryId(token, "Guide View Category");
    Long guideId = createBuyingGuideId(token, "Guide View Test Guide", categoryId, true, Visibility.PUBLIC);

    mockMvc.perform(post("/api/public/buying-guides/{id}/view", guideId))
            .andExpect(status().isOk());
    mockMvc.perform(post("/api/public/buying-guides/{id}/view", guideId))
            .andExpect(status().isOk());

    var result = mockMvc.perform(get("/api/admin/dashboard/analytics")
                    .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();

    JsonNode latestGuides = objectMapper.readTree(result.getResponse().getContentAsString())
            .path("data").path("latestGuides");

    boolean found = false;
    for (int i = 0; i < latestGuides.size(); i++) {
        JsonNode row = latestGuides.get(i);
        if (row.path("id").asLong() == guideId) {
            found = true;
            assertEquals(2, row.path("views").asLong());
        }
    }
    assertTrue(found, "the guide should appear in latestGuides with its recorded view count");
}
```

If `PublicBuyingGuideControllerTest.java` does not already have a `createBuyingGuideId` helper (it may only exist in `AdminDashboardControllerTest.java`), add this private helper to `PublicBuyingGuideControllerTest.java`, copied verbatim from `AdminDashboardControllerTest.java`:

```java
private Long createBuyingGuideId(String token, String title, Long categoryId, boolean active,
                                  Visibility visibility) throws Exception {
    BuyingGuideRequest request = new BuyingGuideRequest(
            title, "", "Excerpt for " + title, "Introduction", null,
            categoryId, null, null, active, null, List.of(),
            List.of(), List.of(), List.of(), List.of(), List.of(), null, List.of(), null,
            visibility, true, true, null, null, null, "summary_large_image");

    var result = mockMvc.perform(post("/api/admin/buying-guides")
                    .header("Authorization", "Bearer " + token)
                    .contentType(APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
            .andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString())
            .path("data").path("id").asLong();
}
```

Add any missing imports (`com.twogofindz.backend.dto.request.BuyingGuideRequest`, `com.twogofindz.backend.entity.Visibility`, `java.util.List`, static `get`/`post`/`status`, `assertEquals`/`assertTrue`) — check the file's existing imports first and only add what's missing.

- [ ] **Step 2: Run the test to verify it fails**

Run (from `backend/`): `mvn test -Dtest=PublicBuyingGuideControllerTest#recordView_incrementsGuideViewCount`
Expected: FAIL — compile error (`/api/public/buying-guides/{id}/view` doesn't exist yet; `latestGuides` isn't a field on the analytics response yet).

- [ ] **Step 3: Create the entity**

Create `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideView.java`:

```java
package com.twogofindz.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
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

import java.time.LocalDateTime;

@Entity
@Table(name = "buying_guide_views")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuyingGuideView {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "buying_guide_id", nullable = false)
    private BuyingGuide buyingGuide;

    @Column(name = "anonymous_session_id", length = 64)
    private String anonymousSessionId;

    @Column(name = "viewed_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime viewedAt;
}
```

- [ ] **Step 4: Create the migration**

Create `backend/src/main/resources/db/migration/V22__create_buying_guide_views_table.sql`:

```sql
CREATE TABLE buying_guide_views (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    buying_guide_id BIGINT NOT NULL,
    anonymous_session_id VARCHAR(64) NULL,
    viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_buying_guide_views_guide FOREIGN KEY (buying_guide_id)
        REFERENCES buying_guides (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_buying_guide_views_guide ON buying_guide_views (buying_guide_id);
CREATE INDEX idx_buying_guide_views_viewed_at ON buying_guide_views (viewed_at);
```

- [ ] **Step 5: Create the request DTO**

Create `backend/src/main/java/com/twogofindz/backend/dto/request/GuideViewRequest.java`:

```java
package com.twogofindz.backend.dto.request;

public record GuideViewRequest(String sessionId) {
}
```

- [ ] **Step 6: Create the repository**

Create `backend/src/main/java/com/twogofindz/backend/repository/BuyingGuideViewRepository.java`:

```java
package com.twogofindz.backend.repository;

import com.twogofindz.backend.entity.BuyingGuideView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface BuyingGuideViewRepository extends JpaRepository<BuyingGuideView, Long> {

    /**
     * View counts for a specific, small set of guide ids (the dashboard's 5 latest guides),
     * grouped in one query rather than one query per guide — avoids N+1. Guides with zero views
     * in range are simply absent from the result; the caller defaults them to 0. Mirrors
     * ProductClickRepository.countClicksByProductIdsBetween exactly.
     */
    @Query("""
            select bgv.buyingGuide.id as guideId, count(bgv) as viewCount
            from BuyingGuideView bgv
            where bgv.buyingGuide.id in :guideIds and bgv.viewedAt between :from and :to
            group by bgv.buyingGuide.id
            """)
    List<GuideIdViewCountProjection> countViewsByGuideIdsBetween(@Param("guideIds") List<Long> guideIds,
                                                                   @Param("from") LocalDateTime from,
                                                                   @Param("to") LocalDateTime to);

    interface GuideIdViewCountProjection {
        Long getGuideId();

        Long getViewCount();
    }
}
```

- [ ] **Step 7: Create the tracking service interface and implementation**

Create `backend/src/main/java/com/twogofindz/backend/service/GuideViewTrackingService.java`:

```java
package com.twogofindz.backend.service;

import com.twogofindz.backend.dto.request.GuideViewRequest;

public interface GuideViewTrackingService {
    void recordView(Long guideId, GuideViewRequest request);
}
```

Create `backend/src/main/java/com/twogofindz/backend/service/impl/GuideViewTrackingServiceImpl.java`:

```java
package com.twogofindz.backend.service.impl;

import com.twogofindz.backend.dto.request.GuideViewRequest;
import com.twogofindz.backend.entity.BuyingGuide;
import com.twogofindz.backend.entity.BuyingGuideView;
import com.twogofindz.backend.exception.ResourceNotFoundException;
import com.twogofindz.backend.repository.BuyingGuideRepository;
import com.twogofindz.backend.repository.BuyingGuideViewRepository;
import com.twogofindz.backend.service.GuideViewTrackingService;
import org.springframework.stereotype.Service;

@Service
public class GuideViewTrackingServiceImpl implements GuideViewTrackingService {

    private final BuyingGuideViewRepository buyingGuideViewRepository;
    private final BuyingGuideRepository buyingGuideRepository;

    public GuideViewTrackingServiceImpl(BuyingGuideViewRepository buyingGuideViewRepository,
                                         BuyingGuideRepository buyingGuideRepository) {
        this.buyingGuideViewRepository = buyingGuideViewRepository;
        this.buyingGuideRepository = buyingGuideRepository;
    }

    @Override
    public void recordView(Long guideId, GuideViewRequest request) {
        BuyingGuide guide = buyingGuideRepository.findById(guideId)
                .orElseThrow(() -> new ResourceNotFoundException("Buying guide not found with id: " + guideId));

        BuyingGuideView view = BuyingGuideView.builder()
                .buyingGuide(guide)
                .anonymousSessionId(request == null ? null : request.sessionId())
                .build();
        buyingGuideViewRepository.save(view);
    }
}
```

- [ ] **Step 8: Add the endpoint**

In `PublicBuyingGuideController.java`, add the `GuideViewTrackingService` dependency and the endpoint:

```java
import com.twogofindz.backend.dto.request.GuideViewRequest;
import com.twogofindz.backend.service.GuideViewTrackingService;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
```

```java
    private final GuideViewTrackingService guideViewTrackingService;

    public PublicBuyingGuideController(BuyingGuideService buyingGuideService,
                                        GuideViewTrackingService guideViewTrackingService) {
        this.buyingGuideService = buyingGuideService;
        this.guideViewTrackingService = guideViewTrackingService;
    }
```

```java
    @PostMapping("/{id}/view")
    public ApiResponse<Void> recordView(
            @PathVariable Long id,
            @RequestBody(required = false) GuideViewRequest request) {
        guideViewTrackingService.recordView(id, request);
        return ApiResponse.success("View recorded.");
    }
```

(This will not fully compile/pass yet — `latestGuides` doesn't exist on the analytics response until Task 2. That's expected; proceed to Task 2 before running the full test.)

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideView.java backend/src/main/resources/db/migration/V22__create_buying_guide_views_table.sql backend/src/main/java/com/twogofindz/backend/dto/request/GuideViewRequest.java backend/src/main/java/com/twogofindz/backend/repository/BuyingGuideViewRepository.java backend/src/main/java/com/twogofindz/backend/service/GuideViewTrackingService.java backend/src/main/java/com/twogofindz/backend/service/impl/GuideViewTrackingServiceImpl.java backend/src/main/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideController.java backend/src/test/java/com/twogofindz/backend/controller/publicapi/PublicBuyingGuideControllerTest.java
git commit -m "feat(buying-guides): add view tracking (entity, migration, endpoint)"
```

---

### Task 2: Backend — `latestGuides` on the analytics endpoint

**Files:**
- Create: `backend/src/main/java/com/twogofindz/backend/dto/response/LatestGuideResponse.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/response/DashboardAnalyticsResponse.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/repository/BuyingGuideRepository.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/DashboardServiceImpl.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminDashboardControllerTest.java`

**Interfaces:**
- Consumes: `BuyingGuideViewRepository.countViewsByGuideIdsBetween` (Task 1).
- Produces: `DashboardAnalyticsResponse.latestGuides()` → `List<LatestGuideResponse(id, title, coverImageFilename, active, createdAt, views)>`, the 5 most-recently-created guides (any `active` value), `views` scoped to the requested date range. Consumed by Task 3 (frontend) and Task 1's test (already written).

- [ ] **Step 1: Write the failing test**

Add to `AdminDashboardControllerTest.java`, inserted before the existing `private Long createBuyingGuideId(...)` helper:

```java
@Test
void analytics_latestGuides_returnsFiveMostRecent_regardlessOfActiveFlag_withRangeScopedViews() throws Exception {
    String token = adminToken();
    Long categoryId = createCategoryId(token, "Latest Guides Category");

    Long draftGuideId = createBuyingGuideId(token, "Latest Guides Draft Guide", categoryId, false, Visibility.PUBLIC);
    mockMvc.perform(post("/api/public/buying-guides/{id}/view", draftGuideId));
    mockMvc.perform(post("/api/public/buying-guides/{id}/view", draftGuideId));
    mockMvc.perform(post("/api/public/buying-guides/{id}/view", draftGuideId));

    var result = mockMvc.perform(get("/api/admin/dashboard/analytics")
                    .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andReturn();

    JsonNode latestGuides = objectMapper.readTree(result.getResponse().getContentAsString())
            .path("data").path("latestGuides");

    boolean found = false;
    for (int i = 0; i < latestGuides.size(); i++) {
        JsonNode row = latestGuides.get(i);
        if (row.path("id").asLong() == draftGuideId) {
            found = true;
            assertEquals(false, row.path("active").asBoolean());
            assertEquals(3, row.path("views").asLong());
        }
    }
    assertTrue(found, "a draft guide must still appear in latestGuides if it's among the 5 most recently created");
    assertTrue(latestGuides.size() <= 5, "latestGuides must never return more than 5 rows");
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `mvn test -Dtest=AdminDashboardControllerTest#analytics_latestGuides_returnsFiveMostRecent_regardlessOfActiveFlag_withRangeScopedViews`
Expected: FAIL — compile error, `latestGuides` isn't a field on `DashboardAnalyticsResponse` yet.

- [ ] **Step 3: Create the response DTO**

Create `backend/src/main/java/com/twogofindz/backend/dto/response/LatestGuideResponse.java`:

```java
package com.twogofindz.backend.dto.response;

import java.time.LocalDateTime;

public record LatestGuideResponse(
        Long id,
        String title,
        String coverImageFilename,
        boolean active,
        LocalDateTime createdAt,
        long views
) {
}
```

- [ ] **Step 4: Add the field to `DashboardAnalyticsResponse`**

Replace `DashboardAnalyticsResponse.java` in full:

```java
package com.twogofindz.backend.dto.response;

import java.util.List;

public record DashboardAnalyticsResponse(
        List<DailyCountResponse> viewsByDay,
        List<DailyCountResponse> clicksByDay,
        List<ProductClickCountResponse> mostClickedProducts,
        List<CategoryCommissionResponse> commissionByCategory,
        List<MonthlyCountResponse> productsAddedByMonth,
        List<CategoryClickCountResponse> topCategories,
        List<RecentProductResponse> recentProducts,
        List<LatestGuideResponse> latestGuides
) {
}
```

- [ ] **Step 5: Add the repository query**

In `BuyingGuideRepository.java`, add one derived-query method (alongside the existing ones):

```java
List<BuyingGuide> findTop5ByOrderByCreatedAtDesc();
```

- [ ] **Step 6: Wire into `DashboardServiceImpl`**

Add imports:

```java
import com.twogofindz.backend.dto.response.LatestGuideResponse;
import com.twogofindz.backend.entity.BuyingGuide;
import com.twogofindz.backend.repository.BuyingGuideViewRepository;
```

Add the new repository as a constructor dependency:

```java
private final BuyingGuideViewRepository buyingGuideViewRepository;

public DashboardServiceImpl(WebsiteViewRepository websiteViewRepository,
                             ProductClickRepository productClickRepository,
                             ProductRepository productRepository,
                             ProductCategoryRepository productCategoryRepository,
                             BuyingGuideRepository buyingGuideRepository,
                             BuyingGuideViewRepository buyingGuideViewRepository) {
    this.websiteViewRepository = websiteViewRepository;
    this.productClickRepository = productClickRepository;
    this.productRepository = productRepository;
    this.productCategoryRepository = productCategoryRepository;
    this.buyingGuideRepository = buyingGuideRepository;
    this.buyingGuideViewRepository = buyingGuideViewRepository;
}
```

At the end of `getAnalytics()`, before the `return`, add a block that mirrors the `recentProducts` block exactly:

```java
List<BuyingGuide> latestGuideEntities = buyingGuideRepository.findTop5ByOrderByCreatedAtDesc();
List<Long> latestGuideIds = latestGuideEntities.stream().map(BuyingGuide::getId).toList();
Map<Long, Long> viewsByGuideId = latestGuideIds.isEmpty()
        ? Map.of()
        : buyingGuideViewRepository.countViewsByGuideIdsBetween(latestGuideIds, start, end).stream()
                .collect(Collectors.toMap(
                        BuyingGuideViewRepository.GuideIdViewCountProjection::getGuideId,
                        BuyingGuideViewRepository.GuideIdViewCountProjection::getViewCount));
List<LatestGuideResponse> latestGuides = latestGuideEntities.stream()
        .map(g -> new LatestGuideResponse(
                g.getId(), g.getTitle(), g.getCoverImageFilename(),
                g.getActive(), g.getCreatedAt(), viewsByGuideId.getOrDefault(g.getId(), 0L)))
        .toList();
```

Update the `return` statement:

```java
return new DashboardAnalyticsResponse(
        viewsByDay, clicksByDay, mostClickedProducts, commissionByCategory, productsAddedByMonth,
        topCategories, recentProducts, latestGuides);
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `mvn test -Dtest=AdminDashboardControllerTest`
Expected: PASS (all tests in the file, including the new one and every existing test that constructs/consumes `DashboardAnalyticsResponse`).

Run: `mvn test -Dtest=PublicBuyingGuideControllerTest`
Expected: PASS (including Task 1's `recordView_incrementsGuideViewCount`, which depends on `latestGuides` existing).

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/dto/response/LatestGuideResponse.java backend/src/main/java/com/twogofindz/backend/dto/response/DashboardAnalyticsResponse.java backend/src/main/java/com/twogofindz/backend/repository/BuyingGuideRepository.java backend/src/main/java/com/twogofindz/backend/service/impl/DashboardServiceImpl.java backend/src/test/java/com/twogofindz/backend/controller/admin/AdminDashboardControllerTest.java
git commit -m "feat(admin-dashboard): add latestGuides to the analytics endpoint"
```

---

### Task 3: Frontend — real guide-view tracking call

**Files:**
- Modify: `frontend/src/services/trackingService.js`
- Modify: `frontend/src/services/trackingService.test.js`
- Modify: `frontend/src/pages/PublishedBuyingGuidePage.jsx`
- Modify: `frontend/src/pages/PublishedBuyingGuidePage.test.jsx`

**Interfaces:**
- Consumes: `POST /api/public/buying-guides/{id}/view` (Task 1).
- Produces: `recordGuideView(guideId, sessionId)` — exported from `trackingService.js`, mirrors `recordClick`'s signature and behavior exactly.

- [ ] **Step 1: Write the failing tests**

Add to `trackingService.test.js` (alongside the existing `recordClick` tests, before the final closing `});`):

```jsx
  it('recordGuideView posts to the guide view endpoint with the session id', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true, message: 'View recorded.', data: null } });

    await recordGuideView(7, 'abc-123');

    expect(api.post).toHaveBeenCalledWith('/public/buying-guides/7/view', { sessionId: 'abc-123' });
  });

  it('recordGuideView omits the body when there is no session id', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true, message: 'View recorded.', data: null } });

    await recordGuideView(7, null);

    expect(api.post).toHaveBeenCalledWith('/public/buying-guides/7/view', undefined);
  });
```

Update the file's import line to include `recordGuideView`:

```js
import { recordView, recordClick, recordGuideView } from './trackingService.js';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `frontend/`): `npm test -- trackingService`
Expected: FAIL — `recordGuideView` is not exported yet.

- [ ] **Step 3: Implement**

In `trackingService.js`, add:

```js
export async function recordGuideView(guideId, sessionId) {
  await api.post(`/public/buying-guides/${guideId}/view`, sessionId ? { sessionId } : undefined);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- trackingService`
Expected: PASS

- [ ] **Step 5: Wire the real call into `PublishedBuyingGuidePage.jsx`**

Add the import:

```js
import { recordGuideView } from '../services/trackingService.js';
```

Replace the existing view-tracking effect:

```jsx
  useEffect(() => {
    if (!guide || hasTrackedView.current) return;
    hasTrackedView.current = true;
    trackEvent('guide_view', { guideId: guide.id });
  }, [guide]);
```

with:

```jsx
  useEffect(() => {
    if (!guide || hasTrackedView.current) return;
    hasTrackedView.current = true;
    trackEvent('guide_view', { guideId: guide.id });
    const sessionId = sessionStorage.getItem('sessionId');
    recordGuideView(guide.id, sessionId).catch(() => {
      // View tracking is best-effort; never block rendering on a tracking failure.
    });
  }, [guide]);
```

- [ ] **Step 6: Update `PublishedBuyingGuidePage.test.jsx` so the new real network call doesn't run unmocked**

Add the import (alongside the existing `buyingGuideService`/`settingsService` spy imports):

```js
import * as trackingService from '../services/trackingService.js';
```

Find the file's `beforeEach` block (where `buyingGuideService`/`settingsService` are mocked) and add:

```js
vi.spyOn(trackingService, 'recordGuideView').mockResolvedValue();
```

- [ ] **Step 7: Run the full frontend suite**

Run: `npm test` (from `frontend/`)
Expected: PASS, 0 failures.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/services/trackingService.js frontend/src/services/trackingService.test.js frontend/src/pages/PublishedBuyingGuidePage.jsx frontend/src/pages/PublishedBuyingGuidePage.test.jsx
git commit -m "feat(buying-guides): record real guide views from the published guide page"
```

---

### Task 4: `LatestGuidesCard` component

**Files:**
- Create: `frontend/src/components/LatestGuidesCard.jsx`
- Test: `frontend/src/components/LatestGuidesCard.test.jsx`

**Interfaces:**
- Consumes: `EmptyState`, `getImageUrl` (existing).
- Produces: default-exported `LatestGuidesCard({ guides })` — `guides: [{id, title, coverImageFilename, active, createdAt, views}]`. Consumed by Task 5.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/LatestGuidesCard.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import LatestGuidesCard from './LatestGuidesCard.jsx';

const guides = [
  {
    id: 1,
    title: 'Best Wireless Earbuds Under $100',
    coverImageFilename: null,
    active: true,
    createdAt: '2026-06-01T00:00:00',
    views: 1240,
  },
  {
    id: 2,
    title: 'Ultimate Kitchen Gadget Guide',
    coverImageFilename: null,
    active: false,
    createdAt: '2026-05-20T00:00:00',
    views: 0,
  },
];

function renderCard(props) {
  return render(
    <MemoryRouter>
      <LatestGuidesCard {...props} />
    </MemoryRouter>
  );
}

describe('LatestGuidesCard', () => {
  it('renders the title and a View all link to /admin/buying-guides', () => {
    renderCard({ guides });
    expect(screen.getByText('Latest Guides')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/admin/buying-guides');
  });

  it('renders each guide title, views, and status badge', () => {
    renderCard({ guides });
    expect(screen.getByText('Best Wireless Earbuds Under $100')).toBeInTheDocument();
    expect(screen.getByText('1,240')).toBeInTheDocument();
    expect(screen.getByText('Ultimate Kitchen Gadget Guide')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('shows an empty state when there are no guides', () => {
    renderCard({ guides: [] });
    expect(screen.getByText('No guides yet')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- LatestGuidesCard`
Expected: FAIL — `src/components/LatestGuidesCard.jsx` does not exist.

- [ ] **Step 3: Implement**

Create `frontend/src/components/LatestGuidesCard.jsx`:

```jsx
import { Link } from 'react-router-dom';
import { Eye, Image as ImageIcon } from 'lucide-react';
import EmptyState from './EmptyState.jsx';
import { getImageUrl } from '../utils/imageUrl.js';

function LatestGuidesCard({ guides }) {
  return (
    <div className="flex h-full flex-col rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-card-title text-heading">Latest Guides</h3>
        <Link to="/admin/buying-guides" className="text-small font-semibold text-primary hover:underline">
          View all
        </Link>
      </div>
      {guides.length === 0 ? (
        <EmptyState title="No guides yet" description="Add your first buying guide to see it here." />
      ) : (
        <ul className="space-y-3">
          {guides.map((guide) => {
            const url = getImageUrl(guide.coverImageFilename);
            return (
              <li key={guide.id} className="flex items-center gap-3">
                {url ? (
                  <img src={url} alt={guide.title} className="h-10 w-10 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100">
                    <ImageIcon className="h-4 w-4 text-slate-300" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-small font-medium text-heading">{guide.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {guide.active ? (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                        Published
                      </span>
                    ) : (
                      <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-medium text-muted">
                        Draft
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Eye size={12} />
                      {guide.views.toLocaleString('en-US')}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default LatestGuidesCard;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- LatestGuidesCard`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/LatestGuidesCard.jsx frontend/src/components/LatestGuidesCard.test.jsx
git commit -m "feat(admin-dashboard): add LatestGuidesCard component"
```

---

### Task 5: Assemble into `DashboardPage`

**Files:**
- Modify: `frontend/src/pages/admin/DashboardPage.jsx`
- Modify: `frontend/src/pages/admin/DashboardPage.test.jsx`

**Interfaces:**
- Consumes: `LatestGuidesCard` (Task 4), `analytics.latestGuides` (Task 2).

- [ ] **Step 1: Update `DashboardPage.jsx`**

Add the import (alongside the existing component imports):

```js
import LatestGuidesCard from '../../components/LatestGuidesCard.jsx';
```

Replace the lower grid (currently two columns: Recent Products, Quick Actions) with three columns:

```jsx
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)_minmax(280px,1fr)]">
        <RecentProductsCard products={analytics.recentProducts} />
        <LatestGuidesCard guides={analytics.latestGuides} />
        <QuickActionsCard />
      </div>
```

- [ ] **Step 2: Update `DashboardPage.test.jsx`**

Add a `latestGuides` field to the existing `analytics` fixture object:

```js
  latestGuides: [
    {
      id: 1,
      title: 'Best Wireless Earbuds Under $100',
      coverImageFilename: null,
      active: true,
      createdAt: '2026-06-01T00:00:00',
      views: 1240,
    },
  ],
```

Add one new test case (alongside the existing `it(...)` blocks, before the final closing `});`):

```jsx
  it('renders the Latest Guides card with real guide data', async () => {
    renderPage();
    await screen.findByText('Performance Overview');

    expect(screen.getByText('Latest Guides')).toBeInTheDocument();
    expect(screen.getByText('Best Wireless Earbuds Under $100')).toBeInTheDocument();
    expect(screen.getByText('1,240')).toBeInTheDocument();
  });
```

- [ ] **Step 3: Run the full frontend suite**

Run: `npm test` (from `frontend/`)
Expected: PASS, 0 failures. Fix any assertion mismatch rather than changing behavior (watch for text collisions the way Phase 2 hit with "Electronics"/"Clicks" — scope queries with `within(...)` if a label like "Published"/"Draft" or a title collides across cards).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/DashboardPage.jsx frontend/src/pages/admin/DashboardPage.test.jsx
git commit -m "feat(admin-dashboard): assemble Latest Guides into the dashboard page"
```

---

### Task 6: Full verification and manual screenshot comparison

**Files:** none (verification only).

- [ ] **Step 1: Run the full frontend suite**

Run: `npm test` (from `frontend/`)
Expected: PASS, 0 failures.

- [ ] **Step 2: Run frontend lint**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Run the frontend production build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Run the full backend test suite**

Run (from `backend/`): `mvn test`
Expected: PASS, 0 failures.

- [ ] **Step 5: Run the backend build**

Run: `mvn -q -DskipTests package`
Expected: succeeds.

- [ ] **Step 6: Manual verification**

Start both servers (or reuse already-running instances). First, as a site visitor, open a published buying guide's detail page and confirm no console errors (the new `recordGuideView` call should succeed silently). Then log in as admin, navigate to `/admin`, and confirm: Recent Products, Latest Guides, and Quick Actions render in a three-column row with matching heights on desktop; Latest Guides shows real guide titles/thumbnails/Published-or-Draft badges/view counts (including the view you just recorded by visiting the guide page); Latest Guides' data changes when the date-range picker changes; no console errors anywhere.

- [ ] **Step 7: Write the completion note**

Summarize in the final report: what shipped (real buying-guide view tracking end-to-end, Latest Guides card wired to range-scoped view counts), confirmation that System Alerts/footer/real Export Report remain out of scope, test/lint/build results (frontend + backend).

---

## Self-Review Notes

- **Spec coverage:** Part 1 (view tracking: entity, migration, endpoint, frontend wiring) — Tasks 1 and 3. Part 2 (dashboard aggregation) — Task 2. Part 3 (`LatestGuidesCard` + three-column layout) — Tasks 4 and 5. Full verification including the real end-to-end view-tracking check — Task 6. All spec sections covered.
- **Placeholder scan:** no TBD/TODO; every step has real, complete code.
- **Type consistency:** `LatestGuideResponse(id, title, coverImageFilename, active, createdAt, views)` field names are used identically between its Task 2 definition, the Task 2 service-layer construction (`g.getId()`, `g.getTitle()`, `g.getCoverImageFilename()`, `g.getActive()`, `g.getCreatedAt()`), and Task 4's frontend destructuring (`guide.id`, `guide.title`, `guide.coverImageFilename`, `guide.active`, `guide.views`). `recordGuideView(guideId, sessionId)`'s signature matches between its Task 3 definition and its call site in `PublishedBuyingGuidePage.jsx`. `GuideViewRequest(sessionId)` matches between Task 1's DTO and Task 1's controller/service usage.
