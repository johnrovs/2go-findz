# Design System Stage 5: Dashboard Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the admin Dashboard's KPI cards and charts using Recharts, styled with this app's existing design tokens (no new colors), inspired by a reference image but using only this app's real, already-fetched data.

**Architecture:** Three new small presentational components (`ChartTooltip`, `GaugeCard`, `DualAreaChart`) plus retokenizing the two existing chart components (`AnalyticsCard`, `AnalyticsChart`), wired together in `DashboardPage.jsx` with two new pure helper functions (percentage calculation, view/click dataset merge).

**Tech Stack:** React 18, Recharts 3.10 (already installed), Tailwind CSS 3.4 (Stage 1–4 tokens), Vitest + React Testing Library.

## Global Constraints

- No fabricated data — every number displayed must trace to a real field already returned by `getSummary`/`getAnalytics`. No dot-matrix grids, no timeline/pin components.
- No new color tokens — charts use `primary` (`#2563EB`) and `amazon` (`#FF9900`) only.
- **Correction to the design spec:** the spec's KPI section describes replacing 2 count cards with 3 gauge cards while also stating "7 cards, unchanged count" — that's internally inconsistent. The correct result is **8 KPI cards** (5 `AnalyticsCard` + 3 `GaugeCard`): Total Views, Total Clicks, Estimated Commission, Total Products, Total Categories, Click-Through Rate, Trending Share of Catalog, Best-Seller Share of Catalog. This plan implements 8 cards.
- Sidebar/Topbar/DataTable/admin forms are out of scope (Stage 6: Admin Chrome).

---

### Task 1: ChartTooltip component

**Files:**
- Create: `frontend/src/components/ChartTooltip.jsx`
- Test: `frontend/src/components/ChartTooltip.test.jsx`

**Interfaces:**
- Consumes: nothing (leaf component).
- Produces: `ChartTooltip({ active, payload, label })` — a Recharts custom tooltip content renderer. Tasks 4 and 3 use it as `<Tooltip content={<ChartTooltip />} />`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/ChartTooltip.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ChartTooltip from './ChartTooltip.jsx';

describe('ChartTooltip', () => {
  it('renders nothing when inactive', () => {
    const { container } = render(<ChartTooltip active={false} payload={[]} label="2026-07-01" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when payload is empty', () => {
    const { container } = render(<ChartTooltip active payload={[]} label="2026-07-01" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the label and each payload entry name/value', () => {
    render(
      <ChartTooltip
        active
        label="2026-07-01"
        payload={[
          { dataKey: 'views', name: 'Views', value: 5, color: '#2563EB' },
          { dataKey: 'clicks', name: 'Clicks', value: 2, color: '#FF9900' },
        ]}
      />
    );
    expect(screen.getByText('2026-07-01')).toBeInTheDocument();
    expect(screen.getByText('Views: 5')).toBeInTheDocument();
    expect(screen.getByText('Clicks: 2')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- --run ChartTooltip`
Expected: FAIL — `Cannot find module './ChartTooltip.jsx'`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/components/ChartTooltip.jsx`:

```jsx
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-card bg-white p-2 text-small shadow-dropdown">
      {label && <p className="mb-1 font-medium text-heading">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export default ChartTooltip;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- --run ChartTooltip`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/components/ChartTooltip.jsx frontend/src/components/ChartTooltip.test.jsx
git commit -m "feat(design-system): add ChartTooltip component for dashboard charts"
```

---

### Task 2: GaugeCard component

**Files:**
- Create: `frontend/src/components/GaugeCard.jsx`
- Test: `frontend/src/components/GaugeCard.test.jsx`

**Interfaces:**
- Consumes: nothing (leaf component, Recharts `RadialBarChart`).
- Produces: `GaugeCard({ label, value })` where `value` is a 0–100 number the caller has already computed and rounded. Task 5 renders three of these in `DashboardPage.jsx`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/GaugeCard.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import GaugeCard from './GaugeCard.jsx';

describe('GaugeCard', () => {
  it('renders the label', () => {
    render(<GaugeCard label="Click-Through Rate" value={30} />);
    expect(screen.getByText('Click-Through Rate')).toBeInTheDocument();
  });

  it('renders the value as a percentage', () => {
    render(<GaugeCard label="Click-Through Rate" value={30} />);
    expect(screen.getByText('30%')).toBeInTheDocument();
  });

  it('renders 0% when given a value of 0', () => {
    render(<GaugeCard label="Best-Seller Share" value={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- --run GaugeCard`
Expected: FAIL — `Cannot find module './GaugeCard.jsx'`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/components/GaugeCard.jsx`:

```jsx
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

function GaugeCard({ label, value }) {
  const data = [{ value, fill: '#2563EB' }];

  return (
    <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <span className="text-small font-medium text-muted">{label}</span>
      <div className="relative mx-auto mt-2 h-24 w-24">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" background={{ fill: '#E5E7EB' }} cornerRadius={999} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center text-card-title text-heading">
          {value}%
        </div>
      </div>
    </div>
  );
}

export default GaugeCard;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- --run GaugeCard`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/components/GaugeCard.jsx frontend/src/components/GaugeCard.test.jsx
git commit -m "feat(design-system): add GaugeCard percentage-gauge component"
```

---

### Task 3: DualAreaChart component

**Files:**
- Create: `frontend/src/components/DualAreaChart.jsx`
- Test: `frontend/src/components/DualAreaChart.test.jsx`

**Interfaces:**
- Consumes: `ChartTooltip` from Task 1.
- Produces: `DualAreaChart({ data, xKey, series, label })` where `series` is `[{ key, name, color }, ...]`. Task 5 renders this in `DashboardPage.jsx` with the merged views/clicks dataset.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/DualAreaChart.test.jsx`:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DualAreaChart from './DualAreaChart.jsx';

const data = [
  { date: '2026-07-01', views: 5, clicks: 2 },
  { date: '2026-07-02', views: 8, clicks: 3 },
];

const series = [
  { key: 'views', name: 'Views', color: '#2563EB' },
  { key: 'clicks', name: 'Clicks', color: '#FF9900' },
];

describe('DualAreaChart', () => {
  it('shows a "No data yet" message when data is empty', () => {
    render(<DualAreaChart data={[]} xKey="date" series={series} label="Views & Clicks by Day" />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('renders the chart label', () => {
    render(<DualAreaChart data={data} xKey="date" series={series} label="Views & Clicks by Day" />);
    expect(screen.getByText('Views & Clicks by Day')).toBeInTheDocument();
  });

  it('renders both series as areas', async () => {
    const { container } = render(
      <DualAreaChart data={data} xKey="date" series={series} label="Views & Clicks by Day" />
    );
    // Recharts' ResponsiveContainer resolves its measured size asynchronously even with a
    // stubbed getBoundingClientRect, and <Area> (unlike <Line>/<Bar>) only paints once that
    // settles -- confirmed by isolated debugging -- so this needs waitFor, not a sync check.
    await waitFor(() => {
      expect(container.querySelectorAll('.recharts-area')).toHaveLength(2);
    });
  });

  it('renders a legend entry for each series name', () => {
    render(<DualAreaChart data={data} xKey="date" series={series} label="Views & Clicks by Day" />);
    expect(screen.getByText('Views')).toBeInTheDocument();
    expect(screen.getByText('Clicks')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- --run DualAreaChart`
Expected: FAIL — `Cannot find module './DualAreaChart.jsx'`.

- [ ] **Step 3: Write the implementation**

**Deviation from the original design, found during implementation:** Recharts' `<Legend>` component never resolves alongside `<Area>` in this project's jsdom test environment — isolated debugging confirmed `<Area>` renders fine with `<CartesianGrid>` and `<Tooltip>` present, but adding `<Legend>` causes it to hang indefinitely (well past a 3-second `waitFor`), regardless of whether there's one or two `<Area>` elements. Rather than accept a fragile, possibly-slow-in-production dependency, this uses a small hand-built legend (colored dot + label, styled with this app's own tokens) instead of Recharts' `<Legend>`. This also gives more direct styling control consistent with the rest of the design system.

Create `frontend/src/components/DualAreaChart.jsx`:

```jsx
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import ChartTooltip from './ChartTooltip.jsx';

function DualAreaChart({ data, xKey, series, label }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-card border border-slate-200 bg-white text-sm text-slate-400">
        No data yet
      </div>
    );
  }

  return (
    <div className="rounded-card border border-slate-200 bg-white p-4 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-small font-semibold text-heading">{label}</h3>
        <div className="flex items-center gap-3">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-small text-body">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<ChartTooltip />} />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.15}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default DualAreaChart;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- --run DualAreaChart`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/components/DualAreaChart.jsx frontend/src/components/DualAreaChart.test.jsx
git commit -m "feat(design-system): add DualAreaChart component for multi-series charts"
```

---

### Task 4: Retokenize AnalyticsCard and AnalyticsChart

**Files:**
- Modify: `frontend/src/components/AnalyticsCard.jsx`
- Modify: `frontend/src/components/AnalyticsChart.jsx`

**Interfaces:**
- Consumes: `ChartTooltip` from Task 1.
- Produces: nothing new — both keep their existing prop APIs unchanged (`AnalyticsCard({ label, value, icon })`, `AnalyticsChart({ type, data, xKey, yKey, label, layout })`).

`AnalyticsCard.test.jsx` and `AnalyticsChart.test.jsx` contain no class-name assertions — confirmed by inspection (both query by text/structure/Recharts internal classes like `.recharts-line`, which this task doesn't touch). No test changes needed for either file.

- [ ] **Step 1: Update `AnalyticsCard.jsx`**

Full file:

```jsx
function AnalyticsCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-small font-medium text-muted">{label}</span>
        {Icon && <Icon className="h-5 w-5 text-primary" />}
      </div>
      <p className="mt-2 text-page-heading text-heading">{value}</p>
    </div>
  );
}

export default AnalyticsCard;
```

- [ ] **Step 2: Run the AnalyticsCard test to verify it still passes**

Run: `npm test -- --run "src/components/AnalyticsCard.test.jsx"`
Expected: PASS, unchanged.

- [ ] **Step 3: Update `AnalyticsChart.jsx`**

Full file:

```jsx
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import ChartTooltip from './ChartTooltip.jsx';

function AnalyticsChart({ type, data, xKey, yKey, label, layout }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-card border border-slate-200 bg-white text-sm text-slate-400">
        No data yet
      </div>
    );
  }

  return (
    <div className="rounded-card border border-slate-200 bg-white p-4 shadow-card">
      <h3 className="mb-4 text-small font-semibold text-heading">{label}</h3>
      <ResponsiveContainer width="100%" height={240}>
        {type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey={yKey} stroke="#2563EB" strokeWidth={2} dot={false} />
          </LineChart>
        ) : (
          <BarChart data={data} layout={layout === 'vertical' ? 'vertical' : 'horizontal'}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            {layout === 'vertical' ? (
              <>
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey={xKey} width={120} tick={{ fontSize: 12 }} />
              </>
            ) : (
              <>
                <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
              </>
            )}
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey={yKey} fill="#2563EB" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default AnalyticsChart;
```

- [ ] **Step 4: Run the AnalyticsChart test to verify it still passes**

Run: `npm test -- --run "src/components/AnalyticsChart.test.jsx"`
Expected: PASS, unchanged (4 tests).

- [ ] **Step 5: Run the full test suite**

Run: `npm test -- --run`
Expected: same pass count as before this task, plus the 10 new tests from Tasks 1–3 (3 + 3 + 4).

- [ ] **Step 6: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/components/AnalyticsCard.jsx frontend/src/components/AnalyticsChart.jsx
git commit -m "feat(design-system): retokenize AnalyticsCard and AnalyticsChart with design tokens"
```

---

### Task 5: Wire the new dashboard into DashboardPage

**Files:**
- Modify: `frontend/src/pages/admin/DashboardPage.jsx`
- Modify: `frontend/src/pages/admin/DashboardPage.test.jsx`

**Interfaces:**
- Consumes: `GaugeCard` from Task 2, `DualAreaChart` from Task 3, `AnalyticsCard`/`AnalyticsChart` from Task 4.
- Produces: nothing new — this is the last wiring task.

The existing `DashboardPage.test.jsx` needs several updates: it currently checks the KPI cards via `.closest('.rounded-xl')` (now `.rounded-card`), asserts on "Trending Products"/"Best Sellers" as plain-value cards (now gauge cards with different labels/values), and asserts on two separate chart headings "Website Views by Day"/"Product Clicks by Day" (now one combined "Views & Clicks by Day" heading) across five different tests that use that heading as a "wait until loaded" anchor.

- [ ] **Step 1: Write the updated failing tests**

In `frontend/src/pages/admin/DashboardPage.test.jsx`, replace the entire file:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import DashboardPage from './DashboardPage.jsx';
import * as dashboardService from '../../services/dashboardService.js';

const summary = {
  totalViews: 1204,
  totalClicks: 356,
  estimatedTotalCommission: 128.5,
  totalProducts: 42,
  totalCategories: 6,
  trendingCount: 8,
  bestSellerCount: 5,
};

const analytics = {
  viewsByDay: [{ date: '2026-07-01', count: 5 }],
  clicksByDay: [{ date: '2026-07-01', count: 2 }],
  mostClickedProducts: [{ productId: 1, productName: 'Wireless Earbuds', clickCount: 12 }],
  commissionByCategory: [{ categoryId: 1, categoryName: 'Electronics', estimatedCommission: 40 }],
  productsAddedByMonth: [{ yearMonth: '2026-07', count: 3 }],
};

function renderPage() {
  return render(<DashboardPage />);
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dashboardService, 'getSummary').mockResolvedValue(summary);
    vi.spyOn(dashboardService, 'getAnalytics').mockResolvedValue(analytics);
  });

  it('renders the five plain-value summary cards with the correct values', async () => {
    renderPage();
    await screen.findByText('Views & Clicks by Day');

    expect(screen.getByText('Total Views').closest('.rounded-card')).toHaveTextContent('1204');
    expect(screen.getByText('Total Clicks').closest('.rounded-card')).toHaveTextContent('356');
    expect(screen.getByText('Estimated Commission').closest('.rounded-card')).toHaveTextContent('$128.50');
    expect(screen.getByText('Total Products').closest('.rounded-card')).toHaveTextContent('42');
    expect(screen.getByText('Total Categories').closest('.rounded-card')).toHaveTextContent('6');
  });

  it('renders the three percentage-gauge cards with correctly computed values', async () => {
    renderPage();
    await screen.findByText('Views & Clicks by Day');

    // 356 / 1204 * 100 = 29.56... -> rounds to 30
    expect(screen.getByText('Click-Through Rate').closest('.rounded-card')).toHaveTextContent('30%');
    // 8 / 42 * 100 = 19.04... -> rounds to 19
    expect(screen.getByText('Trending Share of Catalog').closest('.rounded-card')).toHaveTextContent('19%');
    // 5 / 42 * 100 = 11.90... -> rounds to 12
    expect(screen.getByText('Best-Seller Share of Catalog').closest('.rounded-card')).toHaveTextContent('12%');
  });

  it('renders 0% gauges when the denominator is zero', async () => {
    vi.spyOn(dashboardService, 'getSummary').mockResolvedValue({ ...summary, totalViews: 0, totalProducts: 0 });
    renderPage();
    await screen.findByText('Views & Clicks by Day');

    expect(screen.getByText('Click-Through Rate').closest('.rounded-card')).toHaveTextContent('0%');
    expect(screen.getByText('Trending Share of Catalog').closest('.rounded-card')).toHaveTextContent('0%');
    expect(screen.getByText('Best-Seller Share of Catalog').closest('.rounded-card')).toHaveTextContent('0%');
  });

  it('renders the combined views/clicks chart and the three remaining analytics chart labels', async () => {
    renderPage();

    expect(await screen.findByText('Views & Clicks by Day')).toBeInTheDocument();
    expect(screen.getByText('Most-Clicked Products')).toBeInTheDocument();
    expect(screen.getByText('Estimated Commission by Category')).toBeInTheDocument();
    expect(screen.getByText('Products Added by Month')).toBeInTheDocument();
  });

  it('shows custom date inputs only when the Custom Range preset is selected', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Views & Clicks by Day');

    expect(screen.queryByLabelText('From')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Date Range'), 'custom');

    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
  });

  it('re-fetches with new params when the date filter changes', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Views & Clicks by Day');

    await user.selectOptions(screen.getByLabelText('Date Range'), 'today');

    await waitFor(() => {
      const lastCall = dashboardService.getSummary.mock.calls.at(-1)[0];
      expect(lastCall.from).toBe(lastCall.to);
    });
  });

  it('shows an error state with retry when loading fails', async () => {
    dashboardService.getSummary.mockRejectedValueOnce({ message: 'Network error. Please try again.' });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Network error. Please try again.')).toBeInTheDocument();

    dashboardService.getSummary.mockResolvedValueOnce(summary);
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Views & Clicks by Day')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- --run DashboardPage`
Expected: FAIL — `DashboardPage.jsx` doesn't yet render "Views & Clicks by Day", `GaugeCard` labels, or use `rounded-card`.

- [ ] **Step 3: Update `DashboardPage.jsx`**

Full file:

```jsx
import { Eye, MousePointerClick, DollarSign, Package, Tags } from 'lucide-react';
import AnalyticsCard from '../../components/AnalyticsCard.jsx';
import AnalyticsChart from '../../components/AnalyticsChart.jsx';
import DualAreaChart from '../../components/DualAreaChart.jsx';
import GaugeCard from '../../components/GaugeCard.jsx';
import FilterDropdown from '../../components/FilterDropdown.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { useDashboardData } from '../../hooks/useDashboardData.js';

const PRESET_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'currentMonth', label: 'Current Month' },
  { value: 'custom', label: 'Custom Range' },
];

function formatCurrency(value) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function safePercentage(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
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

function DashboardPage() {
  const dashboard = useDashboardData();

  if (dashboard.isLoading) {
    return <LoadingSpinner label="Loading dashboard..." />;
  }

  if (dashboard.error) {
    return <ErrorState message={dashboard.error} onRetry={dashboard.reload} />;
  }

  const { summary, analytics } = dashboard;
  const viewsAndClicks = mergeViewsAndClicks(analytics.viewsByDay, analytics.clicksByDay);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-page-heading text-heading">Dashboard</h1>
        <div className="flex flex-wrap items-end gap-4">
          <FilterDropdown
            label="Date Range"
            value={dashboard.preset}
            options={PRESET_OPTIONS}
            onChange={dashboard.setPreset}
          />
          {dashboard.preset === 'custom' && (
            <>
              <div>
                <label htmlFor="customFrom" className="mb-1 block text-sm font-medium text-slate-700">
                  From
                </label>
                <input
                  id="customFrom"
                  type="date"
                  value={dashboard.customFrom}
                  onChange={(event) => dashboard.setCustomFrom(event.target.value)}
                  className="rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="customTo" className="mb-1 block text-sm font-medium text-slate-700">
                  To
                </label>
                <input
                  id="customTo"
                  type="date"
                  value={dashboard.customTo}
                  onChange={(event) => dashboard.setCustomTo(event.target.value)}
                  className="rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticsCard label="Total Views" value={summary.totalViews} icon={Eye} />
        <AnalyticsCard label="Total Clicks" value={summary.totalClicks} icon={MousePointerClick} />
        <AnalyticsCard
          label="Estimated Commission"
          value={formatCurrency(summary.estimatedTotalCommission)}
          icon={DollarSign}
        />
        <AnalyticsCard label="Total Products" value={summary.totalProducts} icon={Package} />
        <AnalyticsCard label="Total Categories" value={summary.totalCategories} icon={Tags} />
        <GaugeCard label="Click-Through Rate" value={safePercentage(summary.totalClicks, summary.totalViews)} />
        <GaugeCard
          label="Trending Share of Catalog"
          value={safePercentage(summary.trendingCount, summary.totalProducts)}
        />
        <GaugeCard
          label="Best-Seller Share of Catalog"
          value={safePercentage(summary.bestSellerCount, summary.totalProducts)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DualAreaChart
          data={viewsAndClicks}
          xKey="date"
          series={[
            { key: 'views', name: 'Views', color: '#2563EB' },
            { key: 'clicks', name: 'Clicks', color: '#FF9900' },
          ]}
          label="Views & Clicks by Day"
        />
        <AnalyticsChart
          type="bar"
          layout="vertical"
          data={analytics.mostClickedProducts}
          xKey="productName"
          yKey="clickCount"
          label="Most-Clicked Products"
        />
        <AnalyticsChart
          type="bar"
          data={analytics.commissionByCategory}
          xKey="categoryName"
          yKey="estimatedCommission"
          label="Estimated Commission by Category"
        />
        <AnalyticsChart
          type="bar"
          data={analytics.productsAddedByMonth}
          xKey="yearMonth"
          yKey="count"
          label="Products Added by Month"
        />
      </div>
    </div>
  );
}

export default DashboardPage;
```

Note: `TrendingUp` and `Award` icons are no longer imported since the Trending Products/Best Sellers plain-value cards are gone, replaced by `GaugeCard`s (which don't take an icon prop).

- [ ] **Step 4: Run the DashboardPage test to verify it passes**

Run: `npm test -- --run DashboardPage`
Expected: PASS, all 7 tests.

- [ ] **Step 5: Run the full test suite**

Run: `npm test -- --run`
Expected: same pass count as after Task 4, with the net test-count change from this task's rewrite (6 tests → 7 tests in `DashboardPage.test.jsx`, +1).

- [ ] **Step 6: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/pages/admin/DashboardPage.jsx frontend/src/pages/admin/DashboardPage.test.jsx
git commit -m "feat(design-system): wire GaugeCard and DualAreaChart into DashboardPage"
```

---

### Task 6: Final verification

**Files:** none (verification only).

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: nothing for later tasks — this is the stage's closing gate. Stage 6 (Admin Chrome) starts from here.

- [ ] **Step 1: Run the full frontend test suite**

Run: `cd frontend && npm test -- --run`
Expected: all tests pass.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors or warnings.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: succeeds (pre-existing chunk-size warning only).

- [ ] **Step 4: Live smoke check**

Log in as admin, restart the frontend dev server if it was already running, navigate to `/admin`, and confirm:

1. The KPI grid shows 8 cards: 5 plain-value cards and 3 circular percentage gauges (blue ring, percentage centered).
2. The gauge percentages look plausible given the real seeded data (compare against the raw counts shown elsewhere, e.g. Trending Share should roughly match trending-product-count ÷ total-product-count).
3. The "Views & Clicks by Day" chart renders as one card with two overlapping colored areas (blue for Views, orange for Clicks) and a legend.
4. Hovering over any chart shows the new rounded tooltip instead of Recharts' default unstyled box.
5. The three remaining bar charts (Most-Clicked Products, Estimated Commission by Category, Products Added by Month) render in blue with rounded corners.
6. The date-range filter (including the custom From/To date inputs) still works and re-fetches data.

- [ ] **Step 5: Report results**

If all checks pass, this stage is complete — no further commit needed (Tasks 1–5 already committed their own work). If the smoke check surfaces a real bug, fix it, re-run Steps 1–3, and commit the fix with an appropriate message before considering the stage done.

---

This closes out Stage 5 of the redesign (Dashboard Analytics). Stage 6 (Admin Chrome) applies the design system to the Sidebar, Topbar, DataTable, and admin forms — to be brainstormed separately when reached, since it has no visual reference yet.
