# Admin Dashboard Phase 4: Latest Guides

## Context

Follow-on to Phase 1 (shell/KPI/chart), Phase 2 (Top Categories, Recent Products), and Phase 3 (Quick Actions) — all shipped. Those specs deferred Latest Guides and System Alerts, split by risk. This spec covers **Latest Guides only** — the piece that needs real new backend work (System Alerts remains deferred: this app tracks no inventory or orders, so what counts as an "alert" isn't yet defined).

**Root cause confirmed by reading the code:** `BuyingGuide.java` has no view-count field or tracking table. The only guide-view signal in the frontend, `trackEvent('guide_view', { guideId })` in `PublishedBuyingGuidePage.jsx`, resolves to `useAnalytics.js`'s `trackEvent()` — which is a `console.info` stub reserved for a future GA4/GTM integration, not a real backend call. Guide views are not tracked anywhere in the database today.

## Scope

1. Track buying-guide views in the database, mirroring the existing `ProductClick` pattern.
2. Surface the 5 most-recently-created guides (any status) with their range-scoped view counts on the admin dashboard's analytics endpoint.
3. Add a `LatestGuidesCard` to the dashboard, filling the middle column of the lower grid (between Recent Products and Quick Actions).

**Out of scope:** System Alerts, the footer, real Export Report generation — separate future phases.

## Part 1: View tracking

**New entity** `backend/src/main/java/com/twogofindz/backend/entity/BuyingGuideView.java`, structurally identical to `ProductClick.java`:
- `id` (identity PK)
- `buyingGuide` (`@ManyToOne`, lazy, not-null, FK to `buying_guides`)
- `anonymousSessionId` (nullable, length 64)
- `viewedAt` (DB-generated timestamp, not insertable/updatable from Java — same `@Column(insertable = false, updatable = false)` pattern as `ProductClick.clickedAt`)

**New migration** `backend/src/main/resources/db/migration/V22__create_buying_guide_views_table.sql`, structurally identical to `V6__create_product_clicks_table.sql`:

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

**New endpoint** `POST /api/public/buying-guides/{id}/view` on `PublicBuyingGuideController`, mirroring `PublicProductController`'s `POST /api/public/products/{id}/click` exactly (same request/response shape, same service-layer recording pattern).

**Frontend wiring:** `frontend/src/services/trackingService.js` gets a new `recordGuideView(guideId, sessionId)`, calling `api.post(\`/public/buying-guides/${guideId}/view\`, ...)`, mirroring `recordClick`. In `PublishedBuyingGuidePage.jsx`, the existing view-tracking effect (guarded by `hasTrackedView.current`, currently only calling `trackEvent('guide_view', { guideId: guide.id })`) also calls `recordGuideView(guide.id)` — same effect, same one-time guard, both calls fire together. The `trackEvent` stub call is untouched (it stays for whenever GA4/GTM is wired in later).

## Part 2: Dashboard aggregation

**`BuyingGuideRepository`**: add `findTop5ByOrderByCreatedAtDesc()` — identical in shape to `ProductRepository`'s method of the same name, same "any status, ordered by creation time" semantics as Recent Products (a guide's `views` count for the *selected* date range doesn't affect which 5 guides appear — only `createdAt` does).

**New `BuyingGuideViewRepository`**, mirroring `ProductClickRepository`: a `countViewsByGuideIdsBetween(List<Long> guideIds, LocalDateTime from, LocalDateTime to)` `@Query`, grouped by `buying_guide_id`, returning a `GuideIdViewCountProjection { getGuideId(); getViewCount(); }` — identical shape to `ProductIdClickCountProjection`. Guides with zero views in range are simply absent from the result; the caller defaults them to 0, same as `recentProducts`.

**New DTO** `LatestGuideResponse(Long id, String title, String coverImageFilename, boolean active, LocalDateTime createdAt, long views)`.

**`DashboardServiceImpl.getAnalytics()`**: after computing `recentProducts`, add an identically-shaped block — fetch the top-5 guide entities, batch-count their views in range, map to `LatestGuideResponse`. Add `List<LatestGuideResponse> latestGuides` as a new field on `DashboardAnalyticsResponse`, appended after `recentProducts`.

## Part 3: Frontend `LatestGuidesCard`

New `frontend/src/components/LatestGuidesCard.jsx`, no props beyond `guides` (array of `LatestGuideResponse`-shaped objects). Visually mirrors `TopCategoriesCard`'s narrow-list style (not `RecentProductsCard`'s full `DataTable` — this card lives in the middle, narrower column):

- Card shell: same `rounded-card border border-slate-200 bg-white p-5 shadow-card` as every other dashboard card.
- Header: "Latest Guides" title + "View all" link to `/admin/buying-guides`.
- Body: a vertical list, one row per guide — a small thumbnail (`getImageUrl(guide.coverImageFilename)`, falling back to a placeholder icon exactly like `RecentProductsCard`'s product-image fallback), the guide title (truncated), a Published/Draft badge (`guide.active` — this is the buying guides' own real existing wording, already used verbatim in `BuyingGuidesPage.jsx`, not a scoped substitution like Recent Products' Active/Inactive→Published/Draft), and a views count with a small `Eye` icon.
- Empty state: `EmptyState` with `title="No guides yet"` `description="Add your first buying guide to see it here."`, matching `RecentProductsCard`'s empty-state copy pattern.

**Layout:** `DashboardPage.jsx`'s lower grid grows from two columns to three:

```jsx
<div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)_minmax(280px,1fr)]">
  <RecentProductsCard products={analytics.recentProducts} />
  <LatestGuidesCard guides={analytics.latestGuides} />
  <QuickActionsCard />
</div>
```

## Testing

- Backend: `AdminDashboardControllerTest` gets two new tests mirroring the existing `analytics_recentProducts_*` test — one confirming `latestGuides` returns up to 5 guides regardless of `active` status with range-scoped `views`, one confirming a `POST /api/public/buying-guides/{id}/view` call increments the count picked up by the analytics endpoint (mirroring the existing product-click test pattern).
- Frontend: `LatestGuidesCard.test.jsx` (title, View-all link, guide rows, Published/Draft badges, views, empty state — mirrors `RecentProductsCard.test.jsx`'s test shape). `DashboardPage.test.jsx` gets one new test asserting the card renders with real guide data. `trackingService.test.js` (if one exists) or a new test file covers `recordGuideView`.

## Self-Review

- **Placeholder scan:** no TBD/TODO; every file, method signature, and migration is fully specified.
- **Internal consistency:** the "5 most recent by createdAt, any status, range-scoped count defaulting to 0" rule is stated once and applied identically to both the backend query design and the `LatestGuidesCard` empty-state/badge behavior — no contradiction with Recent Products' established pattern.
- **Scope check:** two backend concerns (new tracking table + new aggregation) plus one frontend card — appropriately sized for one implementation plan, comparable in size to Phase 1's backend work.
- **Ambiguity check:** "views" is explicitly defined as the count of `BuyingGuideView` rows within the selected date range for the 5 most-recently-created guides — not an all-time total, not affecting which guides appear (mirrors Recent Products' `clicks` field exactly).
