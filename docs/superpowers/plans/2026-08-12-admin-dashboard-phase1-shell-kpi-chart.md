# Admin Dashboard Phase 1: Shell, KPI Row, Performance Overview Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the admin dashboard's sidebar, header, KPI row, and Performance Overview chart to match the reference design, using only real backend data.

**Architecture:** New dashboard-specific Tailwind color tokens; a new `publishedGuideCount` field on the existing summary endpoint (mirroring its established all-time-count pattern); `useDashboardData` refactored from preset-based to an explicit date range plus a computed comparison period (fetched via a second `getSummary` call); five new/modified frontend components (`DashboardKpiCard`, `DashboardLineChart`, `DashboardDateRangePicker`, `DashboardHeader`, redesigned `AdminSidebar`) assembled into a rewritten `DashboardPage`.

**Tech Stack:** React 18, Tailwind CSS, `recharts` (already a dependency), `react-datepicker` (already a dependency), Spring Boot, Spring Data JPA.

## Global Constraints

- Font: Poppins (already loaded site-wide) — the spec's "Inter" mention is a copy-paste artifact; the code snippet and existing codebase both point to Poppins.
- No "Estimated Commissions" KPI card; no "Traffic by Source" card (not part of this phase regardless).
- Performance Overview chart shows only Views and Clicks — no Orders, no Commissions.
- 3rd KPI slot is **Total Products** (not "Total Orders" — this site has no order/purchase tracking).
- Sidebar shows only nav items with a real existing route: **Main** (Dashboard, Products, Categories, Buying Guides, Comparisons) and **Settings** (Settings). No Reviews/Trending/Best Sellers/Deals/Traffic/Clicks/Commissions/Reports/Users/Integrations items.
- The 3 existing `GaugeCard` uses and 3 existing `AnalyticsChart` bar-chart uses are removed from this page (not deleted — `GaugeCard.jsx`/`AnalyticsChart.jsx` themselves are untouched for other consumers).
- Total Products and Published Guides are all-time, non-range-scoped counts (existing "Rule 3/4" backend convention) — they show **no** percentage-change indicator (a same-value comparison would always read 0%, which is misleading), just a neutral "All-time total" caption. Total Views, Total Clicks, and Avg. CTR are range-scoped and get a real ↑/↓ percentage vs. the immediately preceding period of equal length.
- Export Report button is visually present (disabled, "Coming soon") — real export generation is a later phase (no CSV/PDF/XLSX library exists in the backend yet).
- Admin avatar/name/role button is a real accessible trigger (`aria-haspopup`, `aria-expanded`, accessible name) but does not open a functional dropdown menu yet — no menu contents were specified in scope for this phase.
- Top Categories, Recent Products, Latest Guides, Quick Actions, System Alerts, and the footer are out of scope — the page ends after the chart, no placeholder gaps.
- Spec reference: `docs/superpowers/specs/2026-08-12-admin-dashboard-phase1-shell-kpi-chart-design.md`.

---

### Task 1: Dashboard design tokens

**Files:**
- Modify: `frontend/tailwind.config.js`
- Test: `frontend/tailwind.config.test.js`

**Interfaces:**
- Produces: `theme.extend.colors.dashboard` — `{ purple: '#5b2cf2', purpleDark: '#4315d9', purpleLight: '#f0ebff', orange: '#ff6b00', green: '#36ad3d', blue: '#1685ff' }`, consumed by every later frontend task via Tailwind utility classes like `bg-dashboard-purple`, `text-dashboard-green`, etc.

- [ ] **Step 1: Write the failing test**

Add to `frontend/tailwind.config.test.js` (after the existing `navy` test):

```js
it('defines the dashboard accent color group used by the redesigned admin dashboard', () => {
  expect(config.theme.extend.colors.dashboard).toEqual({
    purple: '#5b2cf2',
    purpleDark: '#4315d9',
    purpleLight: '#f0ebff',
    orange: '#ff6b00',
    green: '#36ad3d',
    blue: '#1685ff',
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tailwind.config` (from `frontend/`)
Expected: FAIL — `config.theme.extend.colors.dashboard` is `undefined`.

- [ ] **Step 3: Add the token group**

In `frontend/tailwind.config.js`, inside `theme.extend.colors`, add after `navy`:

```js
        dashboard: {
          purple: '#5b2cf2',
          purpleDark: '#4315d9',
          purpleLight: '#f0ebff',
          orange: '#ff6b00',
          green: '#36ad3d',
          blue: '#1685ff',
        },
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tailwind.config`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/tailwind.config.js frontend/tailwind.config.test.js
git commit -m "feat(admin-dashboard): add dashboard accent color tokens"
```

---

### Task 2: Backend `publishedGuideCount`

**Files:**
- Modify: `backend/src/main/java/com/twogofindz/backend/dto/response/DashboardSummaryResponse.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/repository/BuyingGuideRepository.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/DashboardServiceImpl.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminDashboardControllerTest.java`

**Interfaces:**
- Produces: `DashboardSummaryResponse.publishedGuideCount()` (long) — the new 8th field on the summary response, consumed by the frontend's KPI row (Task 9).
- Produces: `BuyingGuideRepository.countByActiveTrueAndVisibility(Visibility visibility)` (long).

- [ ] **Step 1: Write the failing test**

Add to `AdminDashboardControllerTest.java` (needs `BuyingGuideRequest`, `Visibility`, and `List` imports added alongside the existing ones):

```java
@Test
void summary_publishedGuideCount_countsOnlyActivePublicGuides() throws Exception {
    String token = adminToken();
    Long guideCategoryId = createCategoryId(token, "Published Count Guide Category");

    long before = fetchSummaryData(token, null, null).path("publishedGuideCount").asLong();

    // Active + PUBLIC: counts.
    createBuyingGuideId(token, "Published Count Guide A", guideCategoryId, true, Visibility.PUBLIC);
    // Active + PRIVATE: must not count.
    createBuyingGuideId(token, "Published Count Guide B", guideCategoryId, true, Visibility.PRIVATE);
    // Inactive + PUBLIC: must not count.
    createBuyingGuideId(token, "Published Count Guide C", guideCategoryId, false, Visibility.PUBLIC);

    long after = fetchSummaryData(token, null, null).path("publishedGuideCount").asLong();

    assertEquals(before + 1, after,
            "publishedGuideCount must count only guides that are both active and PUBLIC");
}

private Long createBuyingGuideId(String token, String title, Long categoryId, boolean active,
                                  com.twogofindz.backend.entity.Visibility visibility) throws Exception {
    com.twogofindz.backend.dto.request.BuyingGuideRequest request =
            new com.twogofindz.backend.dto.request.BuyingGuideRequest(
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

Also add `import java.util.List;` and `import com.twogofindz.backend.entity.Visibility;` to the top of `AdminDashboardControllerTest.java` alongside the existing imports.

- [ ] **Step 2: Run the test to verify it fails**

Run (from `backend/`): `mvn test -Dtest=AdminDashboardControllerTest#summary_publishedGuideCount_countsOnlyActivePublicGuides`
Expected: FAIL — compile error, `publishedGuideCount` is not a field on `DashboardSummaryResponse` yet.

- [ ] **Step 3: Add the repository method**

In `backend/src/main/java/com/twogofindz/backend/repository/BuyingGuideRepository.java`, add the import and method:

```java
import com.twogofindz.backend.entity.Visibility;
```

```java
long countByActiveTrueAndVisibility(Visibility visibility);
```

(Placed alongside the other method declarations in the interface.)

- [ ] **Step 4: Add the field to the response record**

Replace `DashboardSummaryResponse.java` in full:

```java
package com.twogofindz.backend.dto.response;

import java.math.BigDecimal;

public record DashboardSummaryResponse(
        long totalViews,
        long totalClicks,
        BigDecimal estimatedTotalCommission,
        long totalProducts,
        long totalCategories,
        long trendingCount,
        long bestSellerCount,
        long publishedGuideCount
) {
}
```

- [ ] **Step 5: Wire it into the service**

In `DashboardServiceImpl.java`, add the import, constructor dependency, and computation:

```java
import com.twogofindz.backend.entity.Visibility;
import com.twogofindz.backend.repository.BuyingGuideRepository;
```

```java
    private final WebsiteViewRepository websiteViewRepository;
    private final ProductClickRepository productClickRepository;
    private final ProductRepository productRepository;
    private final ProductCategoryRepository productCategoryRepository;
    private final BuyingGuideRepository buyingGuideRepository;

    public DashboardServiceImpl(WebsiteViewRepository websiteViewRepository,
                                 ProductClickRepository productClickRepository,
                                 ProductRepository productRepository,
                                 ProductCategoryRepository productCategoryRepository,
                                 BuyingGuideRepository buyingGuideRepository) {
        this.websiteViewRepository = websiteViewRepository;
        this.productClickRepository = productClickRepository;
        this.productRepository = productRepository;
        this.productCategoryRepository = productCategoryRepository;
        this.buyingGuideRepository = buyingGuideRepository;
    }
```

```java
        // Rule 5: trending/best-seller reflect current storefront state (active products only), never filtered by the range.
        long trendingCount = productRepository.countByActiveTrueAndTrendingTrue();
        long bestSellerCount = productRepository.countByActiveTrueAndBestSellerTrue();

        // Same all-time, non-range-filtered convention as totalProducts/totalCategories (Rule 3/4).
        long publishedGuideCount = buyingGuideRepository.countByActiveTrueAndVisibility(Visibility.PUBLIC);

        return new DashboardSummaryResponse(
                totalViews, totalClicks, estimatedTotalCommission,
                totalProducts, totalCategories, trendingCount, bestSellerCount, publishedGuideCount);
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `mvn test -Dtest=AdminDashboardControllerTest`
Expected: PASS (all tests in the file, including the new one and the existing ones that construct `DashboardSummaryResponse` indirectly through the service).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/dto/response/DashboardSummaryResponse.java backend/src/main/java/com/twogofindz/backend/repository/BuyingGuideRepository.java backend/src/main/java/com/twogofindz/backend/service/impl/DashboardServiceImpl.java backend/src/test/java/com/twogofindz/backend/controller/admin/AdminDashboardControllerTest.java
git commit -m "feat(admin-dashboard): add publishedGuideCount to the dashboard summary endpoint"
```

---

### Task 3: `DashboardKpiCard` component

**Files:**
- Create: `frontend/src/components/DashboardKpiCard.jsx`
- Test: `frontend/src/components/DashboardKpiCard.test.jsx`

**Interfaces:**
- Produces: default-exported `DashboardKpiCard({ label, value, icon, iconColorClass, changePercent, comparisonLabel })` — `icon` is a lucide-react component, `iconColorClass` a Tailwind class string for the icon's circular container, `changePercent` a number or `null`/`undefined` (renders no delta row when absent), `comparisonLabel` a string shown below the delta (or alone, when there's no delta). Consumed by Task 9.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/DashboardKpiCard.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { Eye } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import DashboardKpiCard from './DashboardKpiCard.jsx';

describe('DashboardKpiCard', () => {
  it('renders the label, value, and icon', () => {
    render(
      <DashboardKpiCard
        label="Total Views"
        value="125,680"
        icon={Eye}
        iconColorClass="bg-dashboard-purple/10 text-dashboard-purple"
        changePercent={18.6}
        comparisonLabel="vs May 12 – May 18"
      />
    );
    expect(screen.getByText('Total Views')).toBeInTheDocument();
    expect(screen.getByText('125,680')).toBeInTheDocument();
  });

  it('shows a green up arrow for a positive change, never color alone', () => {
    render(
      <DashboardKpiCard
        label="Total Views"
        value="125,680"
        icon={Eye}
        iconColorClass="bg-dashboard-purple/10 text-dashboard-purple"
        changePercent={18.6}
        comparisonLabel="vs May 12 – May 18"
      />
    );
    const delta = screen.getByText('↑ 18.6%');
    expect(delta).toHaveClass('text-dashboard-green');
    expect(screen.getByText('vs May 12 – May 18')).toBeInTheDocument();
  });

  it('shows a red down arrow for a negative change', () => {
    render(
      <DashboardKpiCard
        label="Total Clicks"
        value="8,742"
        icon={Eye}
        iconColorClass="bg-dashboard-orange/10 text-dashboard-orange"
        changePercent={-4.2}
        comparisonLabel="vs May 12 – May 18"
      />
    );
    const delta = screen.getByText('↓ 4.2%');
    expect(delta).toHaveClass('text-danger');
  });

  it('renders only the comparison label, with no delta row, when changePercent is null', () => {
    render(
      <DashboardKpiCard
        label="Total Products"
        value="42"
        icon={Eye}
        iconColorClass="bg-dashboard-green/10 text-dashboard-green"
        changePercent={null}
        comparisonLabel="All-time total"
      />
    );
    expect(screen.getByText('All-time total')).toBeInTheDocument();
    expect(screen.queryByText(/↑|↓/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- DashboardKpiCard` (from `frontend/`)
Expected: FAIL — `src/components/DashboardKpiCard.jsx` does not exist.

- [ ] **Step 3: Implement**

Create `frontend/src/components/DashboardKpiCard.jsx`:

```jsx
function DashboardKpiCard({ label, value, icon: Icon, iconColorClass, changePercent, comparisonLabel }) {
  const hasChange = changePercent !== null && changePercent !== undefined;
  const isPositive = hasChange && changePercent >= 0;

  return (
    <div className="flex h-full flex-col rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-muted">{label}</span>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconColorClass}`}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-3 text-[24px] font-bold leading-tight text-heading">{value}</p>
      {hasChange && (
        <p className={`mt-3 text-[12px] font-semibold ${isPositive ? 'text-dashboard-green' : 'text-danger'}`}>
          {isPositive ? '↑' : '↓'} {Math.abs(changePercent)}%
        </p>
      )}
      {comparisonLabel && <p className="mt-1 text-[11px] font-normal text-muted">{comparisonLabel}</p>}
    </div>
  );
}

export default DashboardKpiCard;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- DashboardKpiCard`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/DashboardKpiCard.jsx frontend/src/components/DashboardKpiCard.test.jsx
git commit -m "feat(admin-dashboard): add DashboardKpiCard component"
```

---

### Task 4: `DashboardLineChart` component

**Files:**
- Create: `frontend/src/components/DashboardLineChart.jsx`
- Test: `frontend/src/components/DashboardLineChart.test.jsx`

**Interfaces:**
- Consumes: `ChartTooltip` (existing).
- Produces: default-exported `DashboardLineChart({ data, xKey, series, label, headerAction })` — `series: [{key, name, color}]`, first entry gets a subtle area fill beneath its line, all entries get a line with circular point markers. `headerAction` is an optional React node rendered top-right of the card (the granularity dropdown, wired in Task 9). Consumed by Task 9.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/DashboardLineChart.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DashboardLineChart from './DashboardLineChart.jsx';

const series = [
  { key: 'views', name: 'Views', color: '#5b2cf2' },
  { key: 'clicks', name: 'Clicks', color: '#ff6b00' },
];

describe('DashboardLineChart', () => {
  it('renders the card title and a legend entry for each series', () => {
    render(
      <DashboardLineChart
        data={[{ date: 'May 19', views: 100, clicks: 20 }]}
        xKey="date"
        series={series}
        label="Performance Overview"
      />
    );
    expect(screen.getByText('Performance Overview')).toBeInTheDocument();
    expect(screen.getByText('Views')).toBeInTheDocument();
    expect(screen.getByText('Clicks')).toBeInTheDocument();
  });

  it('does not render an Orders or Commissions legend entry', () => {
    render(
      <DashboardLineChart
        data={[{ date: 'May 19', views: 100, clicks: 20 }]}
        xKey="date"
        series={series}
        label="Performance Overview"
      />
    );
    expect(screen.queryByText('Orders')).not.toBeInTheDocument();
    expect(screen.queryByText('Commissions')).not.toBeInTheDocument();
  });

  it('renders the header action node when provided', () => {
    render(
      <DashboardLineChart
        data={[{ date: 'May 19', views: 100, clicks: 20 }]}
        xKey="date"
        series={series}
        label="Performance Overview"
        headerAction={<button type="button">Daily</button>}
      />
    );
    expect(screen.getByRole('button', { name: 'Daily' })).toBeInTheDocument();
  });

  it('shows an empty state when there is no data', () => {
    render(<DashboardLineChart data={[]} xKey="date" series={series} label="Performance Overview" />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- DashboardLineChart`
Expected: FAIL — `src/components/DashboardLineChart.jsx` does not exist.

- [ ] **Step 3: Implement**

Create `frontend/src/components/DashboardLineChart.jsx`:

```jsx
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import ChartTooltip from './ChartTooltip.jsx';

function formatYAxisTick(value) {
  if (value >= 1000) {
    const inThousands = value / 1000;
    return `${Number.isInteger(inThousands) ? inThousands : inThousands.toFixed(1)}K`;
  }
  return value;
}

function DashboardLineChart({ data, xKey, series, label, headerAction }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-card border border-slate-200 bg-white text-sm text-slate-400">
        No data yet
      </div>
    );
  }

  const [primary] = series;

  return (
    <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-card-title text-heading">{label}</h3>
        {headerAction}
      </div>
      <div className="mb-4 flex items-center gap-4">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-small text-body">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9edf3" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: '#526078' }} />
          <YAxis tick={{ fontSize: 12, fill: '#526078' }} tickFormatter={formatYAxisTick} />
          <Tooltip content={<ChartTooltip />} />
          {primary && (
            <Area
              type="monotone"
              dataKey={primary.key}
              name={primary.name}
              stroke="none"
              fill={primary.color}
              fillOpacity={0.12}
              isAnimationActive={false}
              legendType="none"
            />
          )}
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={{ r: 4, fill: s.color, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DashboardLineChart;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- DashboardLineChart`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/DashboardLineChart.jsx frontend/src/components/DashboardLineChart.test.jsx
git commit -m "feat(admin-dashboard): add DashboardLineChart component"
```

---

### Task 5: `DashboardDateRangePicker` component

**Files:**
- Create: `frontend/src/components/DashboardDateRangePicker.jsx`
- Test: `frontend/src/components/DashboardDateRangePicker.test.jsx`

**Interfaces:**
- Produces: default-exported `DashboardDateRangePicker({ id, startDate, endDate, onChange })` — `startDate`/`endDate` are `Date` objects or `null`, `onChange(nextStart, nextEnd)` is called with `Date` objects once both ends of the range are picked. Consumed by Task 7 (`DashboardHeader`).

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/DashboardDateRangePicker.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import DashboardDateRangePicker from './DashboardDateRangePicker.jsx';

describe('DashboardDateRangePicker', () => {
  it('displays the selected range formatted as "Mon d, yyyy - Mon d, yyyy"', () => {
    render(
      <DashboardDateRangePicker
        startDate={new Date(2026, 4, 19)}
        endDate={new Date(2026, 4, 25)}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Date range')).toHaveValue('May 19, 2026 - May 25, 2026');
  });

  it('is empty and still labeled when no range is selected yet', () => {
    render(<DashboardDateRangePicker startDate={null} endDate={null} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Date range')).toHaveValue('');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- DashboardDateRangePicker`
Expected: FAIL — `src/components/DashboardDateRangePicker.jsx` does not exist.

- [ ] **Step 3: Implement**

Create `frontend/src/components/DashboardDateRangePicker.jsx`:

```jsx
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

function DashboardDateRangePicker({ id = 'dashboard-date-range', startDate, endDate, onChange }) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        Date range
      </label>
      <DatePicker
        id={id}
        selectsRange
        startDate={startDate}
        endDate={endDate}
        onChange={([nextStart, nextEnd]) => {
          if (!nextStart || !nextEnd) return;
          onChange(nextStart, nextEnd);
        }}
        dateFormat="MMM d, yyyy"
        className="rounded-btn border border-border px-3 py-2 text-small text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

export default DashboardDateRangePicker;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- DashboardDateRangePicker`
Expected: PASS. If the displayed format string doesn't exactly match `react-datepicker`'s actual output for `selectsRange`, adjust the test assertion to match the library's real rendered value — this is a real library-behavior detail to confirm by running the test, not a placeholder.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/DashboardDateRangePicker.jsx frontend/src/components/DashboardDateRangePicker.test.jsx
git commit -m "feat(admin-dashboard): add DashboardDateRangePicker component"
```

---

### Task 6: `useDashboardData` — range-based refetch with comparison period

**Files:**
- Modify: `frontend/src/hooks/useDashboardData.js`
- Test: `frontend/src/hooks/useDashboardData.test.js`

**Interfaces:**
- Consumes: `getSummary`, `getAnalytics` (existing, `frontend/src/services/dashboardService.js`).
- Produces: `useDashboardData()` returns `{ summary, previousSummary, analytics, isLoading, error, startDate, endDate, comparisonLabel, setRange(nextStart, nextEnd), reload() }`. `previousSummary` and `comparisonLabel` are new; `preset`/`customFrom`/`customTo`/`setPreset`/`setCustomFrom`/`setCustomTo` are removed (no longer needed now that the UI is a real range picker, not presets). Consumed by Task 9.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/hooks/useDashboardData.test.js`:

```js
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useDashboardData } from './useDashboardData.js';
import * as dashboardService from '../services/dashboardService.js';

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dashboardService, 'getSummary').mockResolvedValue({ totalViews: 1 });
    vi.spyOn(dashboardService, 'getAnalytics').mockResolvedValue({ viewsByDay: [], clicksByDay: [] });
  });

  it('defaults to a 30-day range ending today', async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const spanDays = Math.round((result.current.endDate - result.current.startDate) / 86400000);
    expect(spanDays).toBe(29);
  });

  it('fetches the current summary, analytics, and a previous-period summary in parallel', async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(dashboardService.getSummary).toHaveBeenCalledTimes(2);
    expect(dashboardService.getAnalytics).toHaveBeenCalledTimes(1);
  });

  it('requests a previous period of equal length immediately before the current range', async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setRange(new Date(2026, 4, 19), new Date(2026, 4, 25));
    });
    await waitFor(() => expect(dashboardService.getSummary).toHaveBeenCalledWith({ from: '2026-05-12', to: '2026-05-18' }));
  });

  it('ignores a partial range (start picked, end not yet) and does not refetch', async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const callsBefore = dashboardService.getSummary.mock.calls.length;
    act(() => {
      result.current.setRange(new Date(2026, 4, 19), null);
    });

    expect(dashboardService.getSummary.mock.calls.length).toBe(callsBefore);
  });

  it('formats the comparison label as "vs Mon d – Mon d"', async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setRange(new Date(2026, 4, 19), new Date(2026, 4, 25));
    });
    await waitFor(() => expect(result.current.comparisonLabel).toBe('vs May 12 – May 18'));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- useDashboardData`
Expected: FAIL — the current hook has no `startDate`/`endDate`/`setRange`/`comparisonLabel`/`previousSummary`.

- [ ] **Step 3: Implement**

Replace `frontend/src/hooks/useDashboardData.js` in full:

```js
import { useEffect, useMemo, useState } from 'react';
import { getSummary, getAnalytics } from '../services/dashboardService.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatComparisonDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function defaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return date;
}

function computePreviousRange(startDate, endDate) {
  const rangeMs = endDate.getTime() - startDate.getTime();
  const previousEnd = new Date(startDate.getTime() - MS_PER_DAY);
  const previousStart = new Date(previousEnd.getTime() - rangeMs);
  return { previousStart, previousEnd };
}

export function useDashboardData() {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(() => new Date());
  const [summary, setSummary] = useState(null);
  const [previousSummary, setPreviousSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const from = formatDate(startDate);
  const to = formatDate(endDate);
  const { previousStart, previousEnd } = computePreviousRange(startDate, endDate);
  const previousFrom = formatDate(previousStart);
  const previousTo = formatDate(previousEnd);

  const comparisonLabel = useMemo(
    () => `vs ${formatComparisonDate(previousStart)} – ${formatComparisonDate(previousEnd)}`,
    [previousFrom, previousTo]
  );

  useEffect(() => {
    let isCancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    Promise.all([
      getSummary({ from, to }),
      getAnalytics({ from, to }),
      getSummary({ from: previousFrom, to: previousTo }),
    ])
      .then(([summaryData, analyticsData, previousSummaryData]) => {
        if (isCancelled) return;
        setSummary(summaryData);
        setAnalytics(analyticsData);
        setPreviousSummary(previousSummaryData);
      })
      .catch((err) => {
        if (isCancelled) return;
        setError(err.message ?? 'Failed to load dashboard data.');
      })
      .finally(() => {
        if (isCancelled) return;
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [from, to, previousFrom, previousTo, refreshIndex]);

  function setRange(nextStart, nextEnd) {
    if (!nextStart || !nextEnd) return;
    setStartDate(nextStart);
    setEndDate(nextEnd);
  }

  return {
    summary,
    previousSummary,
    analytics,
    isLoading,
    error,
    startDate,
    endDate,
    comparisonLabel,
    setRange,
    reload: () => setRefreshIndex((n) => n + 1),
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- useDashboardData`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useDashboardData.js frontend/src/hooks/useDashboardData.test.js
git commit -m "feat(admin-dashboard): refactor useDashboardData to an explicit range with a comparison period"
```

---

### Task 7: `DashboardHeader` component, and the `AdminTopbar` dashboard-path guard

**Files:**
- Create: `frontend/src/components/DashboardHeader.jsx`
- Create: `frontend/src/components/DashboardHeader.test.jsx`
- Modify: `frontend/src/components/AdminTopbar.jsx`
- Modify: `frontend/src/components/AdminTopbar.test.jsx`

**Interfaces:**
- Consumes: `useAuth()` (existing, returns `{ user: { fullName, role }, logout }`), `DashboardDateRangePicker` (Task 5), `Button` (existing).
- Produces: default-exported `DashboardHeader({ startDate, endDate, onRangeChange })`, rendering exactly one `<h1>`. Consumed by Task 9.

- [ ] **Step 1: Write the failing test for the `AdminTopbar` guard**

Add to `frontend/src/components/AdminTopbar.test.jsx`, after the existing "renders nothing on an existing buying guide editor page" test:

```jsx
it('renders nothing on the dashboard page, which has its own header', () => {
  const { container } = renderTopbar('/admin');
  expect(container).toBeEmptyDOMElement();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- AdminTopbar` (from `frontend/`)
Expected: FAIL — `AdminTopbar` currently renders its breadcrumb bar on `/admin`.

- [ ] **Step 3: Add the guard**

In `frontend/src/components/AdminTopbar.jsx`, modify the early-return check:

```jsx
function AdminTopbar({ onMenuClick }) {
  const { user } = useAuth();
  const location = useLocation();

  if (location.pathname === '/admin' || isBuyingGuideEditorPath(location.pathname)) return null;
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- AdminTopbar`
Expected: PASS (all 5 tests, including the new one).

- [ ] **Step 5: Write the failing tests for `DashboardHeader`**

Create `frontend/src/components/DashboardHeader.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import DashboardHeader from './DashboardHeader.jsx';
import * as useAuthModule from '../hooks/useAuth.js';

function renderHeader(props = {}) {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    user: { fullName: 'John Rommel Rovero', role: 'Administrator' },
    logout: vi.fn(),
  });
  return render(
    <MemoryRouter>
      <DashboardHeader
        startDate={new Date(2026, 4, 19)}
        endDate={new Date(2026, 4, 25)}
        onRangeChange={vi.fn()}
        {...props}
      />
    </MemoryRouter>
  );
}

describe('DashboardHeader', () => {
  it('greets the authenticated administrator by name in the one page h1', () => {
    renderHeader();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome back, John Rommel Rovero! 👋');
  });

  it('shows the supporting text', () => {
    renderHeader();
    expect(screen.getByText("Here's what's happening with 2Go Findz today.")).toBeInTheDocument();
  });

  it('renders the date range picker with the given range', () => {
    renderHeader();
    expect(screen.getByLabelText('Date range')).toHaveValue('May 19, 2026 - May 25, 2026');
  });

  it('renders a disabled Export Report button', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: /Export Report/ })).toBeDisabled();
  });

  it('renders an accessible administrator menu trigger showing name and role', () => {
    renderHeader();
    const trigger = screen.getByRole('button', { name: /John Rommel Rovero.*account menu/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npm test -- DashboardHeader`
Expected: FAIL — `src/components/DashboardHeader.jsx` does not exist.

- [ ] **Step 7: Implement**

Create `frontend/src/components/DashboardHeader.jsx`:

```jsx
import { useOutletContext } from 'react-router-dom';
import { ChevronDown, Download, Menu } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import DashboardDateRangePicker from './DashboardDateRangePicker.jsx';
import Button from './Button.jsx';

function DashboardHeader({ startDate, endDate, onRangeChange }) {
  const { onMenuClick } = useOutletContext() ?? {};
  const { user } = useAuth();
  const fullName = user?.fullName ?? 'Administrator';

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-card-title text-heading">Welcome back, {fullName}! 👋</h1>
          <p className="mt-1 text-small text-muted">Here&apos;s what&apos;s happening with 2Go Findz today.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <DashboardDateRangePicker startDate={startDate} endDate={endDate} onChange={onRangeChange} />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled
          title="Export Report is coming soon"
          className="gap-2"
        >
          <Download size={16} />
          Export Report
        </Button>
        <button
          type="button"
          className="flex items-center gap-2 rounded-btn border border-border px-2 py-1.5 hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-haspopup="menu"
          aria-expanded="false"
          aria-label={`${fullName} account menu`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-dashboard-purpleLight text-small font-semibold text-dashboard-purple">
            {fullName.charAt(0)}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-small font-semibold text-heading">{fullName}</span>
            <span className="block text-[11px] text-muted">{user?.role ?? 'Administrator'}</span>
          </span>
          <ChevronDown size={16} className="text-muted" />
        </button>
      </div>
    </div>
  );
}

export default DashboardHeader;
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test -- DashboardHeader`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/DashboardHeader.jsx frontend/src/components/DashboardHeader.test.jsx frontend/src/components/AdminTopbar.jsx frontend/src/components/AdminTopbar.test.jsx
git commit -m "feat(admin-dashboard): add DashboardHeader and hide the shared AdminTopbar on /admin"
```

---

### Task 8: `AdminSidebar` redesign

**Files:**
- Modify: `frontend/src/components/AdminSidebar.jsx`
- Create: `frontend/src/components/AdminSidebar.test.jsx`

**Interfaces:**
- Consumes: `useAuth()` (existing, for `logout`).
- Produces: same `AdminSidebar({ isOpen, onClose })` props as before — only internal structure/styling changes, so `AdminLayout.jsx` (its only consumer) needs no changes.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/AdminSidebar.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AdminSidebar from './AdminSidebar.jsx';
import * as useAuthModule from '../hooks/useAuth.js';

function renderSidebar(initialEntry = '/admin', logout = vi.fn()) {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({ logout });
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AdminSidebar isOpen={false} onClose={vi.fn()} />
    </MemoryRouter>
  );
}

describe('AdminSidebar', () => {
  it('renders the Main and Settings nav groups with only real existing routes', () => {
    renderSidebar();
    expect(screen.getByText('Main')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dashboard/ })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Products' })).toHaveAttribute('href', '/admin/products');
    expect(screen.getByRole('link', { name: 'Categories' })).toHaveAttribute('href', '/admin/categories');
    expect(screen.getByRole('link', { name: 'Buying Guides' })).toHaveAttribute('href', '/admin/buying-guides');
    expect(screen.getByRole('link', { name: 'Comparisons' })).toHaveAttribute('href', '/admin/comparisons');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/admin/settings');
  });

  it('does not render nav items that have no real admin route', () => {
    renderSidebar();
    expect(screen.queryByText('Reviews')).not.toBeInTheDocument();
    expect(screen.queryByText('Trending')).not.toBeInTheDocument();
    expect(screen.queryByText('Best Sellers')).not.toBeInTheDocument();
    expect(screen.queryByText('Traffic')).not.toBeInTheDocument();
    expect(screen.queryByText('Commissions')).not.toBeInTheDocument();
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
    expect(screen.queryByText('Integrations')).not.toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Analytics')).not.toBeInTheDocument();
  });

  it('renders the Quick Tip card with the exact copy', () => {
    renderSidebar();
    expect(screen.getByText('Quick Tip')).toBeInTheDocument();
    expect(
      screen.getByText('Add new products regularly to increase engagement and commissions.')
    ).toBeInTheDocument();
  });

  it('highlights Dashboard as active on the /admin route', () => {
    renderSidebar('/admin');
    expect(screen.getByRole('link', { name: /Dashboard/ })).toHaveClass('from-dashboard-purple');
  });

  it('does not highlight Dashboard as active on a different admin route', () => {
    renderSidebar('/admin/products');
    expect(screen.getByRole('link', { name: /Dashboard/ })).not.toHaveClass('from-dashboard-purple');
    expect(screen.getByRole('link', { name: 'Products' })).toHaveClass('from-dashboard-purple');
  });

  it('calls logout when the Logout button is clicked', async () => {
    const user = userEvent.setup();
    const logout = vi.fn();
    renderSidebar('/admin', logout);

    await user.click(screen.getByRole('button', { name: 'Logout' }));

    expect(logout).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- AdminSidebar`
Expected: FAIL — current sidebar has no grouping, no Quick Tip card, and different item labels ("Product Categories" instead of "Categories", "System Settings" instead of "Settings").

- [ ] **Step 3: Implement**

Replace `frontend/src/components/AdminSidebar.jsx` in full:

```jsx
import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Tags, BookOpen, GitCompare, Settings, LogOut, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth.js';
import logo from '../assets/2gofindz.png';

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/products', label: 'Products', icon: Package },
      { to: '/admin/categories', label: 'Categories', icon: Tags },
      { to: '/admin/buying-guides', label: 'Buying Guides', icon: BookOpen },
      { to: '/admin/comparisons', label: 'Comparisons', icon: GitCompare },
    ],
  },
  {
    label: 'Settings',
    items: [{ to: '/admin/settings', label: 'Settings', icon: Settings }],
  },
];

function AdminSidebar({ isOpen, onClose }) {
  const { logout } = useAuth();

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const content = (
    <nav aria-label="Main navigation" className="flex h-full flex-col bg-navy-950 px-3 py-6">
      <div className="mb-8 px-3">
        <img src={logo} alt="2Go Findz" className="h-14 w-auto" />
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-white/40">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-purple ${
                        isActive
                          ? 'bg-gradient-to-r from-dashboard-purple to-dashboard-purpleDark text-white shadow-sm'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <Icon size={18} />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-card bg-dashboard-purpleDark p-4">
        <div className="mb-2 flex items-center gap-2 text-white">
          <Lightbulb size={16} />
          <span className="text-small font-semibold">Quick Tip</span>
        </div>
        <p className="text-[12px] leading-relaxed text-dashboard-purpleLight">
          Add new products regularly to increase engagement and commissions.
        </p>
      </div>

      <button
        onClick={logout}
        className="mt-4 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-purple"
      >
        <LogOut size={18} />
        Logout
      </button>
    </nav>
  );

  return (
    <>
      <div className="hidden md:sticky md:top-0 md:block md:h-screen md:w-[240px] md:shrink-0 md:self-start">
        {content}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="absolute inset-y-0 left-0 w-64"
          >
            {content}
          </motion.div>
        </div>
      )}
    </>
  );
}

export default AdminSidebar;
```

`md:w-[240px]` is a starting value (the spec's suggested `190px` is a "suggested structure... adjust after screenshot comparison" starting point, not a hard requirement) — fine-tuned in Task 10's manual verification.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- AdminSidebar`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/AdminSidebar.jsx frontend/src/components/AdminSidebar.test.jsx
git commit -m "feat(admin-dashboard): redesign AdminSidebar with grouped nav and a Quick Tip card"
```

---

### Task 9: Assemble `DashboardPage`

**Files:**
- Modify: `frontend/src/components/FilterDropdown.jsx`
- Modify: `frontend/src/pages/admin/DashboardPage.jsx`
- Modify: `frontend/src/pages/admin/DashboardPage.test.jsx`

**Interfaces:**
- Consumes: `DashboardHeader` (Task 7), `DashboardKpiCard` (Task 3), `DashboardLineChart` (Task 4), `useDashboardData` (Task 6), `FilterDropdown` (existing, extended below).

- [ ] **Step 1: Add an optional `hideLabel` prop to `FilterDropdown`**

Replace `frontend/src/components/FilterDropdown.jsx` in full:

```jsx
function FilterDropdown({ label, value, options, onChange, hideLabel = false }) {
  return (
    <label className="flex flex-col gap-1">
      <span className={`text-small font-medium text-body ${hideLabel ? 'sr-only' : ''}`}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-btn border border-border bg-white px-3 py-2 text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default FilterDropdown;
```

- [ ] **Step 2: Replace `DashboardPage.jsx`**

Replace `frontend/src/pages/admin/DashboardPage.jsx` in full:

```jsx
import { useState } from 'react';
import { Eye, MousePointerClick, Package, FileText, Target } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader.jsx';
import DashboardKpiCard from '../../components/DashboardKpiCard.jsx';
import DashboardLineChart from '../../components/DashboardLineChart.jsx';
import FilterDropdown from '../../components/FilterDropdown.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { useDashboardData } from '../../hooks/useDashboardData.js';

const GRANULARITY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

function safePercentage(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function computeChangePercent(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function mergeViewsAndClicks(viewsByDay, clicksByDay) {
  const byDate = new Map();
  for (const { date, count } of viewsByDay) {
    byDate.set(date, { date, views: count, clicks: 0 });
  }
  for (const { date, count } of clicksByDay) {
    const existing = byDate.get(date);
    if (existing) {
      existing.clicks = count;
    } else {
      byDate.set(date, { date, views: 0, clicks: count });
    }
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function weekStartKey(date) {
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay());
  return weekStart.toISOString().slice(0, 10);
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function bucketByGranularity(daily, granularity) {
  if (granularity === 'daily') return daily;

  const buckets = new Map();
  for (const row of daily) {
    const date = new Date(row.date);
    const bucketKey = granularity === 'monthly' ? monthKey(date) : weekStartKey(date);
    const existing = buckets.get(bucketKey) ?? { date: bucketKey, views: 0, clicks: 0 };
    existing.views += row.views;
    existing.clicks += row.clicks;
    buckets.set(bucketKey, existing);
  }
  return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function DashboardPage() {
  const dashboard = useDashboardData();
  const [granularity, setGranularity] = useState('daily');

  if (dashboard.isLoading) {
    return <LoadingSpinner label="Loading dashboard..." />;
  }

  if (dashboard.error) {
    return <ErrorState message={dashboard.error} onRetry={dashboard.reload} />;
  }

  const { summary, previousSummary, analytics, comparisonLabel } = dashboard;
  const dailyViewsAndClicks = mergeViewsAndClicks(analytics.viewsByDay, analytics.clicksByDay);
  const chartData = bucketByGranularity(dailyViewsAndClicks, granularity);

  const ctr = safePercentage(summary.totalClicks, summary.totalViews);
  const previousCtr = previousSummary ? safePercentage(previousSummary.totalClicks, previousSummary.totalViews) : null;

  return (
    <div>
      <DashboardHeader startDate={dashboard.startDate} endDate={dashboard.endDate} onRangeChange={dashboard.setRange} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <DashboardKpiCard
          label="Total Views"
          value={summary.totalViews.toLocaleString('en-US')}
          icon={Eye}
          iconColorClass="bg-dashboard-purple/10 text-dashboard-purple"
          changePercent={computeChangePercent(summary.totalViews, previousSummary?.totalViews)}
          comparisonLabel={comparisonLabel}
        />
        <DashboardKpiCard
          label="Total Clicks"
          value={summary.totalClicks.toLocaleString('en-US')}
          icon={MousePointerClick}
          iconColorClass="bg-dashboard-orange/10 text-dashboard-orange"
          changePercent={computeChangePercent(summary.totalClicks, previousSummary?.totalClicks)}
          comparisonLabel={comparisonLabel}
        />
        <DashboardKpiCard
          label="Total Products"
          value={summary.totalProducts.toLocaleString('en-US')}
          icon={Package}
          iconColorClass="bg-dashboard-green/10 text-dashboard-green"
          changePercent={null}
          comparisonLabel="All-time total"
        />
        <DashboardKpiCard
          label="Published Guides"
          value={summary.publishedGuideCount.toLocaleString('en-US')}
          icon={FileText}
          iconColorClass="bg-dashboard-blue/10 text-dashboard-blue"
          changePercent={null}
          comparisonLabel="All-time total"
        />
        <DashboardKpiCard
          label="Avg. Click Through Rate"
          value={`${ctr}%`}
          icon={Target}
          iconColorClass="bg-dashboard-purple/10 text-dashboard-purple"
          changePercent={computeChangePercent(ctr, previousCtr)}
          comparisonLabel={comparisonLabel}
        />
      </div>

      <DashboardLineChart
        data={chartData}
        xKey="date"
        series={[
          { key: 'views', name: 'Views', color: '#5b2cf2' },
          { key: 'clicks', name: 'Clicks', color: '#ff6b00' },
        ]}
        label="Performance Overview"
        headerAction={
          <FilterDropdown
            label="Granularity"
            hideLabel
            value={granularity}
            options={GRANULARITY_OPTIONS}
            onChange={setGranularity}
          />
        }
      />
    </div>
  );
}

export default DashboardPage;
```

- [ ] **Step 3: Replace `DashboardPage.test.jsx`**

Replace `frontend/src/pages/admin/DashboardPage.test.jsx` in full:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import DashboardPage from './DashboardPage.jsx';
import * as dashboardService from '../../services/dashboardService.js';
import * as useAuthModule from '../../hooks/useAuth.js';

const currentSummary = {
  totalViews: 1204,
  totalClicks: 356,
  estimatedTotalCommission: 128.5,
  totalProducts: 42,
  totalCategories: 6,
  trendingCount: 8,
  bestSellerCount: 5,
  publishedGuideCount: 14,
};

const previousSummary = {
  ...currentSummary,
  totalViews: 1000,
  totalClicks: 300,
};

const analytics = {
  viewsByDay: [{ date: '2026-07-01', count: 5 }],
  clicksByDay: [{ date: '2026-07-01', count: 2 }],
  mostClickedProducts: [],
  commissionByCategory: [],
  productsAddedByMonth: [],
};

function renderPage() {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    user: { fullName: 'John Rommel Rovero', role: 'Administrator' },
    logout: vi.fn(),
  });
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <DashboardPage />
    </MemoryRouter>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dashboardService, 'getSummary')
      .mockResolvedValueOnce(currentSummary)
      .mockResolvedValueOnce(previousSummary);
    vi.spyOn(dashboardService, 'getAnalytics').mockResolvedValue(analytics);
  });

  it('renders exactly five KPI cards with real values, and no Estimated Commissions card', async () => {
    renderPage();
    await screen.findByText('Performance Overview');

    expect(screen.getByText('Total Views').closest('.rounded-card')).toHaveTextContent('1,204');
    expect(screen.getByText('Total Clicks').closest('.rounded-card')).toHaveTextContent('356');
    expect(screen.getByText('Total Products').closest('.rounded-card')).toHaveTextContent('42');
    expect(screen.getByText('Published Guides').closest('.rounded-card')).toHaveTextContent('14');
    expect(screen.getByText('Avg. Click Through Rate').closest('.rounded-card')).toHaveTextContent('29.6%');
    expect(screen.queryByText('Estimated Commission')).not.toBeInTheDocument();
  });

  it('shows a positive change indicator for Total Views computed against the previous period', async () => {
    renderPage();
    await screen.findByText('Performance Overview');

    // (1204 - 1000) / 1000 * 100 = 20.4%
    expect(screen.getByText('Total Views').closest('.rounded-card')).toHaveTextContent('20.4%');
  });

  it('shows no change indicator for the two all-time KPI cards', async () => {
    renderPage();
    await screen.findByText('Performance Overview');

    expect(screen.getByText('Total Products').closest('.rounded-card')).toHaveTextContent('All-time total');
    expect(screen.getByText('Published Guides').closest('.rounded-card')).toHaveTextContent('All-time total');
  });

  it('renders the Performance Overview chart with only Views and Clicks in the legend', async () => {
    renderPage();
    await screen.findByText('Performance Overview');

    expect(screen.getByText('Views')).toBeInTheDocument();
    expect(screen.getByText('Clicks')).toBeInTheDocument();
    expect(screen.queryByText('Orders')).not.toBeInTheDocument();
    expect(screen.queryByText('Commissions')).not.toBeInTheDocument();
  });

  it('does not render the old gauges or extra bar charts', async () => {
    renderPage();
    await screen.findByText('Performance Overview');

    expect(screen.queryByText('Click-Through Rate')).not.toBeInTheDocument();
    expect(screen.queryByText('Trending Share of Catalog')).not.toBeInTheDocument();
    expect(screen.queryByText('Best-Seller Share of Catalog')).not.toBeInTheDocument();
    expect(screen.queryByText('Most-Clicked Products')).not.toBeInTheDocument();
    expect(screen.queryByText('Estimated Commission by Category')).not.toBeInTheDocument();
    expect(screen.queryByText('Products Added by Month')).not.toBeInTheDocument();
  });

  it("shows the personalized greeting using the authenticated admin's name", async () => {
    renderPage();
    await screen.findByText('Performance Overview');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome back, John Rommel Rovero!');
  });

  it('changes the chart bucketing when the granularity dropdown changes', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Performance Overview');

    const dropdown = screen.getByLabelText('Granularity');
    expect(dropdown).toHaveValue('daily');

    await user.selectOptions(dropdown, 'weekly');
    expect(dropdown).toHaveValue('weekly');
  });

  it('shows an error state with retry when loading fails', async () => {
    vi.spyOn(dashboardService, 'getSummary').mockReset();
    dashboardService.getSummary.mockRejectedValueOnce({ message: 'Network error. Please try again.' });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Network error. Please try again.')).toBeInTheDocument();

    dashboardService.getSummary.mockResolvedValueOnce(currentSummary).mockResolvedValueOnce(previousSummary);
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getByText('Performance Overview')).toBeInTheDocument());
  });
});
```

- [ ] **Step 4: Run the full frontend suite**

Run: `npm test` (from `frontend/`)
Expected: PASS, 0 failures. Fix any assertion that doesn't match the real rendered output (e.g. exact number formatting) rather than changing the underlying behavior.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/FilterDropdown.jsx frontend/src/pages/admin/DashboardPage.jsx frontend/src/pages/admin/DashboardPage.test.jsx
git commit -m "feat(admin-dashboard): assemble the redesigned dashboard page"
```

---

### Task 10: Full verification and manual screenshot comparison

**Files:** none (verification only).

- [ ] **Step 1: Run the full frontend suite**

Run: `npm test` (from `frontend/`)
Expected: PASS, 0 failures.

- [ ] **Step 2: Run frontend lint**

Run: `npm run lint`
Expected: 0 errors. Fix anything newly introduced (pre-existing warnings in untouched files are fine).

- [ ] **Step 3: Run the frontend production build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Run the backend test suite**

Run (from `backend/`): `mvn test`
Expected: PASS, 0 failures (including the full `AdminDashboardControllerTest` and `AdminBuyingGuideControllerTest` files, not just the new test).

- [ ] **Step 5: Run the backend build**

Run: `mvn -q -DskipTests package`
Expected: succeeds.

- [ ] **Step 6: Manual verification — start both servers and log in as an admin**

Start the backend and frontend dev servers (or reuse already-running instances), navigate to `/admin`, and confirm: the page loads with real data (no console errors), the sidebar shows exactly Main (5 items) + Settings (1 item) + Quick Tip card, the header shows a real greeting with the logged-in admin's name, exactly 5 KPI cards render in one row on desktop, the Performance Overview chart renders with a Views (purple, shaded) and Clicks (orange) line only, and the granularity dropdown re-buckets the chart when changed.

- [ ] **Step 7: Screenshot comparison against the reference**

Screenshot the dashboard at the same viewport size as the reference image, and compare side-by-side per the spec's own requirement. Adjust `AdminSidebar`'s `md:w-[240px]`, `DashboardHeader`'s spacing, `DashboardKpiCard`'s padding/typography sizes, and `DashboardLineChart`'s height/line-thickness/grid-opacity as needed to visually match — scoped only to the sections built in this phase (sidebar, header, KPI row, chart). Do not attempt to match the reference's Top Categories/Recent Products/Latest Guides/Quick Actions/System Alerts/footer — those are later phases.

- [ ] **Step 8: Verify the exclusions explicitly**

Confirm in the running app: no "Estimated Commissions" card exists anywhere, no "Traffic by Source" card exists anywhere, the chart legend shows only Views and Clicks (no Orders, no Commissions), and no empty gap is left where the old gauges/extra bar charts used to render.

- [ ] **Step 9: Verify keyboard navigation and no horizontal overflow**

Tab through the sidebar nav, the date-range picker, the Export Report button (confirm it's reachable but disabled), and the admin menu trigger — confirm visible focus rings throughout. Resize the browser to confirm no page-level horizontal scrollbar appears at common widths.

- [ ] **Step 10: Write the completion report**

Summarize in the final report to the user: files created/modified, components reused vs. new, confirmation that Estimated Commissions/Traffic-by-Source/Orders-series/Commissions-series are absent, the KPI cards implemented (with the Total-Orders→Total-Products substitution explained), Performance Overview behavior, the reduced sidebar nav (only real routes) and why, Export Report's disabled state and why, test/lint/build results (frontend + backend), and — per the user's own instruction — do not claim visual completion without having done the screenshot comparison in Step 7. Explicitly note that Top Categories, Recent Products, Latest Guides, Quick Actions, System Alerts, footer, and real Export Report generation are follow-on phases, not part of this delivery.

---

## Self-Review Notes

- **Spec coverage:** design tokens (Task 1), publishedGuideCount backend addition (Task 2), KPI card component + all 5 cards with the Total-Orders→Total-Products substitution and the all-time-metric no-delta rule (Tasks 3, 9), Performance Overview chart with Views+Clicks only, shaded Views area, circular markers, legend, granularity dropdown, empty state (Tasks 4, 9), date-range picker wired to real queries (Tasks 5, 6), header greeting/date-range/disabled-Export/avatar (Task 7), sidebar grouping/tokens/Quick Tip/only-real-routes (Task 8), assembly + removal of old gauges/charts (Task 9), full verification including the explicit exclusion checklist and screenshot comparison (Task 10) — all covered. Out-of-scope items (Top Categories, Recent Products, Latest Guides, Quick Actions, System Alerts, footer, real Export Report) are explicitly named as deferred at multiple points so they aren't mistaken for gaps.
- **Placeholder scan:** no TBD/TODO; every step has real code. The one acknowledged uncertainty (Task 5's exact `react-datepicker` range-display format string) is flagged as "confirm by running the test," which is real engineering practice, not a placeholder.
- **Type consistency:** `useDashboardData()`'s returned shape (`summary, previousSummary, analytics, isLoading, error, startDate, endDate, comparisonLabel, setRange, reload`) is used identically in Task 9's `DashboardPage.jsx`. `DashboardKpiCard`'s prop names (`label, value, icon, iconColorClass, changePercent, comparisonLabel`) match between Task 3's implementation and Task 9's five call sites. `DashboardDateRangePicker`'s `onChange(nextStart, nextEnd)` signature matches how `DashboardHeader` (Task 7) passes `dashboard.setRange` through as `onRangeChange`. `DashboardSummaryResponse.publishedGuideCount()` (Task 2) matches the frontend's `summary.publishedGuideCount` usage (Task 9) — JSON serialization of a Java record field name to a matching camelCase JSON key is Jackson's default behavior, consistent with every other field on this same response already working this way today.
