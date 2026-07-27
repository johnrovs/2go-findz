# Frontend Admin Stage 4: Dashboard & Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `DashboardPage` placeholder with 7 summary metric cards and 5 analytics charts, filterable by date range (Today/Last 7 Days/Last 30 Days/Current Month/Custom).

**Architecture:** A `useDashboardData()` hook owns the date-filter preset (plain local state, not URL params — this is a landing page, not a bookmarkable list) and fetches `GET /admin/dashboard/summary` + `GET /admin/dashboard/analytics` together via `Promise.all` whenever the computed date range changes. `DashboardPage` renders 7 `AnalyticsCard`s (1:1 with the summary fields) and 5 `AnalyticsChart`s (1:1 with the analytics arrays) driven by that hook. Charts use the new Recharts dependency.

**Tech Stack:** Same as prior stages — React JS/JSX, Vite, Tailwind, Axios, Lucide React, Vitest + React Testing Library, plus **Recharts** (new).

## Global Constraints

- Full design detail: `docs/superpowers/specs/2026-07-27-admin-dashboard-analytics-design.md`. Master spec: `docs/PROJECT_SPEC.md` §"3. Administrator Dashboard" §"Dashboard Analytics".
- Endpoints (both `from`/`to` optional ISO `LocalDate`, `YYYY-MM-DD`): `GET /api/admin/dashboard/summary` → `DashboardSummaryResponse { totalViews, totalClicks, estimatedTotalCommission, totalProducts, totalCategories, trendingCount, bestSellerCount }`; `GET /api/admin/dashboard/analytics` → `DashboardAnalyticsResponse { viewsByDay, clicksByDay, mostClickedProducts, commissionByCategory, productsAddedByMonth }`, where each array element is `{ date, count }` (views/clicks by day), `{ productId, productName, clickCount }` (most-clicked), `{ categoryId, categoryName, estimatedCommission }` (commission by category), or `{ yearMonth, count }` (products by month) — all verified directly from the backend DTOs.
- All backend calls go through the existing shared `api` Axios instance — never direct `axios`/`fetch`. Errors normalize to `{ message }` via the existing `normalizeError` in `api.js`.
- Date-range filter state is plain local component state (`useState`), not `useSearchParams` — deliberate deviation from `CategoriesPage`/`ProductsPage`, since this is a non-bookmarkable overview page.
- Commission is always labeled **"Estimated Commission"** — never "Earnings" or unqualified "Commission" — per the master spec's requirement to never present click-based estimates as confirmed income.
- Recharts is added as a new dependency (`npm install recharts` inside `frontend/`). Its `ResponsiveContainer` needs `ResizeObserver` and real element dimensions, neither of which jsdom provides — both get stubbed in `frontend/src/test/setup.js`, following the existing `IntersectionObserver` stub precedent from the Public Homepage stage.
- Color palette matches prior stages: primary accent `indigo` (`#4f46e5` for chart strokes/fills — Tailwind's `indigo-600` hex — since Recharts needs literal color values, not Tailwind classes, for SVG `stroke`/`fill`), neutrals `slate`.
- TDD throughout: write the failing test, confirm RED, implement, confirm GREEN, run the full suite, commit — every task.
- Never commit `.env`.

---

### Task 1: `dashboardService`

**Files:**
- Create: `frontend/src/services/dashboardService.js`
- Test: `frontend/src/services/dashboardService.test.js`

**Interfaces:**
- Consumes: shared `api` Axios instance.
- Produces: `getSummary({ from, to } = {}): Promise<Summary>`, `getAnalytics({ from, to } = {}): Promise<Analytics>`. Consumed by `useDashboardData` (Task 4).

- [ ] **Step 1: Write the failing tests**

```javascript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import api from './api.js';
import { getSummary, getAnalytics } from './dashboardService.js';

describe('dashboardService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getSummary fetches from /admin/dashboard/summary with the given date range and returns the summary', async () => {
    const summary = { totalViews: 100, totalClicks: 20 };
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, message: 'Dashboard summary retrieved successfully.', data: summary },
    });

    const result = await getSummary({ from: '2026-07-01', to: '2026-07-27' });

    expect(api.get).toHaveBeenCalledWith('/admin/dashboard/summary', {
      params: { from: '2026-07-01', to: '2026-07-27' },
    });
    expect(result).toEqual(summary);
  });

  it('getAnalytics fetches from /admin/dashboard/analytics with the given date range and returns the analytics', async () => {
    const analytics = {
      viewsByDay: [],
      clicksByDay: [],
      mostClickedProducts: [],
      commissionByCategory: [],
      productsAddedByMonth: [],
    };
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, message: 'Dashboard analytics retrieved successfully.', data: analytics },
    });

    const result = await getAnalytics({ from: '2026-07-01', to: '2026-07-27' });

    expect(api.get).toHaveBeenCalledWith('/admin/dashboard/analytics', {
      params: { from: '2026-07-01', to: '2026-07-27' },
    });
    expect(result).toEqual(analytics);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- dashboardService.test.js`
Expected: FAIL — `dashboardService.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

```javascript
import api from './api.js';

export async function getSummary({ from, to } = {}) {
  const response = await api.get('/admin/dashboard/summary', { params: { from, to } });
  return response.data.data;
}

export async function getAnalytics({ from, to } = {}) {
  const response = await api.get('/admin/dashboard/analytics', { params: { from, to } });
  return response.data.data;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- dashboardService.test.js`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/dashboardService.js frontend/src/services/dashboardService.test.js
git commit -m "feat: add dashboardService for summary and analytics data"
```

---

### Task 2: `AnalyticsCard`

**Files:**
- Create: `frontend/src/components/AnalyticsCard.jsx`
- Test: `frontend/src/components/AnalyticsCard.test.jsx`

**Interfaces:**
- Produces: `AnalyticsCard({ label, value, icon })` (default export) — `icon` is an optional Lucide icon component (not an element). Renders with a `className="rounded-xl ..."` outer wrapper (this exact class is relied on for test-scoping in Task 5's `DashboardPage` test, to disambiguate a card's number from numbers rendered elsewhere on the page, e.g. inside charts). Used 7 times by `DashboardPage` (Task 5).

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Eye } from 'lucide-react';
import AnalyticsCard from './AnalyticsCard.jsx';

describe('AnalyticsCard', () => {
  it('renders the label and value', () => {
    render(<AnalyticsCard label="Total Views" value="1,204" />);
    expect(screen.getByText('Total Views')).toBeInTheDocument();
    expect(screen.getByText('1,204')).toBeInTheDocument();
  });

  it('renders an icon when provided', () => {
    render(<AnalyticsCard label="Total Views" value="1,204" icon={Eye} />);
    expect(document.querySelector('svg')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- AnalyticsCard.test.jsx`
Expected: FAIL — `AnalyticsCard.jsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
function AnalyticsCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        {Icon && <Icon className="h-5 w-5 text-indigo-500" />}
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default AnalyticsCard;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- AnalyticsCard.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/AnalyticsCard.jsx frontend/src/components/AnalyticsCard.test.jsx
git commit -m "feat: add AnalyticsCard component"
```

---

### Task 3: `AnalyticsChart` (installs Recharts, adds jsdom chart-measurement stubs)

**Files:**
- Modify: `frontend/package.json` / `frontend/package-lock.json` (via `npm install recharts`)
- Modify: `frontend/src/test/setup.js` (add `ResizeObserver` + element-dimension stubs)
- Create: `frontend/src/components/AnalyticsChart.jsx`
- Test: `frontend/src/components/AnalyticsChart.test.jsx`

**Interfaces:**
- Produces: `AnalyticsChart({ type: 'line' | 'bar', data, xKey, yKey, label, layout })` (default export). `layout="vertical"` only applies to `type="bar"` (horizontal bars). Renders a "No data yet" message when `data` is empty instead of an empty chart. Used 5 times by `DashboardPage` (Task 5).

- [ ] **Step 1: Install Recharts**

Run: `cd frontend && npm install recharts`

- [ ] **Step 2: Add jsdom chart-measurement stubs to `test/setup.js`**

Append to `frontend/src/test/setup.js` (after the existing `IntersectionObserver` stub):

```javascript
// Recharts' ResponsiveContainer measures its container via ResizeObserver and
// getBoundingClientRect before rendering any chart content, and renders nothing if the
// measured size comes back zero. jsdom does not implement ResizeObserver and never
// performs real layout (every element reports a 0x0 rect by default), so both need
// stubbing for any chart to render its children during tests.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub;

Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
  configurable: true,
  value: () => ({
    width: 400,
    height: 240,
    top: 0,
    left: 0,
    bottom: 240,
    right: 400,
    x: 0,
    y: 0,
    toJSON() {},
  }),
});
```

- [ ] **Step 3: Write the failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AnalyticsChart from './AnalyticsChart.jsx';

const lineData = [
  { date: '2026-07-01', count: 5 },
  { date: '2026-07-02', count: 8 },
];

const barData = [
  { categoryName: 'Electronics', estimatedCommission: 40 },
  { categoryName: 'Home Goods', estimatedCommission: 25 },
];

describe('AnalyticsChart', () => {
  it('shows a "No data yet" message when data is empty', () => {
    render(<AnalyticsChart type="line" data={[]} xKey="date" yKey="count" label="Views by Day" />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('renders the chart label', () => {
    render(<AnalyticsChart type="line" data={lineData} xKey="date" yKey="count" label="Views by Day" />);
    expect(screen.getByText('Views by Day')).toBeInTheDocument();
  });

  it('renders a line chart for type="line"', () => {
    const { container } = render(
      <AnalyticsChart type="line" data={lineData} xKey="date" yKey="count" label="Views by Day" />
    );
    expect(container.querySelector('.recharts-line')).toBeInTheDocument();
  });

  it('renders a bar chart for type="bar"', () => {
    const { container } = render(
      <AnalyticsChart
        type="bar"
        data={barData}
        xKey="categoryName"
        yKey="estimatedCommission"
        label="Commission by Category"
      />
    );
    expect(container.querySelector('.recharts-bar')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `cd frontend && npm test -- AnalyticsChart.test.jsx`
Expected: FAIL — `AnalyticsChart.jsx` does not exist yet.

- [ ] **Step 5: Write the implementation**

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

function AnalyticsChart({ type, data, xKey, yKey, label, layout }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-400">
        No data yet
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">{label}</h3>
      <ResponsiveContainer width="100%" height={240}>
        {type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey={yKey} stroke="#4f46e5" strokeWidth={2} dot={false} />
          </LineChart>
        ) : (
          <BarChart data={data} layout={layout === 'vertical' ? 'vertical' : 'horizontal'}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
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
            <Tooltip />
            <Bar dataKey={yKey} fill="#4f46e5" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export default AnalyticsChart;
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd frontend && npm test -- AnalyticsChart.test.jsx`
Expected: PASS (4 tests). If a test still fails because Recharts renders nothing, the `getBoundingClientRect` stub from Step 2 needs the same treatment applied to `offsetWidth`/`offsetHeight` as well — add:
```javascript
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 400 });
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 240 });
```

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/test/setup.js frontend/src/components/AnalyticsChart.jsx frontend/src/components/AnalyticsChart.test.jsx
git commit -m "feat: add AnalyticsChart component backed by Recharts"
```

---

### Task 4: `useDashboardData`

**Files:**
- Create: `frontend/src/hooks/useDashboardData.js`
- Test: `frontend/src/hooks/useDashboardData.test.jsx`

**Interfaces:**
- Consumes: `getSummary`/`getAnalytics` from Task 1.
- Produces: `useDashboardData()` returning `{ summary, analytics, isLoading, error, preset, customFrom, customTo, setPreset, setCustomFrom, setCustomTo, reload }`. `preset` is one of `'today' | 'last7' | 'last30' | 'currentMonth' | 'custom'`, defaulting to `'last30'`. Consumed by `DashboardPage` (Task 5).

- [ ] **Step 1: Write the failing tests**

```jsx
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useDashboardData } from './useDashboardData.js';
import * as dashboardService from '../services/dashboardService.js';

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dashboardService, 'getSummary').mockResolvedValue({ totalViews: 10 });
    vi.spyOn(dashboardService, 'getAnalytics').mockResolvedValue({ viewsByDay: [] });
  });

  it('defaults to the last30 preset and fetches a range ending today', async () => {
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.preset).toBe('last30');
    const [summaryParams] = dashboardService.getSummary.mock.calls[0];
    const today = new Date().toISOString().slice(0, 10);
    expect(summaryParams.to).toBe(today);
  });

  it('the "today" preset sends the same from and to date', async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setPreset('today'));

    await waitFor(() => expect(result.current.preset).toBe('today'));
    const lastCall = dashboardService.getSummary.mock.calls.at(-1)[0];
    expect(lastCall.from).toBe(lastCall.to);
  });

  it('the "custom" preset uses the manually set dates', async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setPreset('custom'));
    act(() => result.current.setCustomFrom('2026-01-01'));
    act(() => result.current.setCustomTo('2026-01-31'));

    await waitFor(() =>
      expect(dashboardService.getSummary).toHaveBeenLastCalledWith({ from: '2026-01-01', to: '2026-01-31' })
    );
  });

  it('reload triggers a re-fetch with the same params', async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.reload());

    await waitFor(() => expect(dashboardService.getSummary).toHaveBeenCalledTimes(2));
  });

  it('exposes an error message when either fetch fails', async () => {
    dashboardService.getAnalytics.mockRejectedValue({ message: 'Network error. Please try again.' });

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Network error. Please try again.');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- useDashboardData.test.jsx`
Expected: FAIL — `useDashboardData.js` does not exist yet.

- [ ] **Step 3: Write the implementation**

```javascript
import { useEffect, useState } from 'react';
import { getSummary, getAnalytics } from '../services/dashboardService.js';

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function computeRange(preset, customFrom, customTo) {
  const today = new Date();
  if (preset === 'custom') {
    return { from: customFrom || undefined, to: customTo || undefined };
  }
  if (preset === 'today') {
    const todayStr = formatDate(today);
    return { from: todayStr, to: todayStr };
  }
  if (preset === 'last7') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: formatDate(from), to: formatDate(today) };
  }
  if (preset === 'last30') {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from: formatDate(from), to: formatDate(today) };
  }
  if (preset === 'currentMonth') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: formatDate(from), to: formatDate(today) };
  }
  return { from: undefined, to: undefined };
}

export function useDashboardData() {
  const [preset, setPreset] = useState('last30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const { from, to } = computeRange(preset, customFrom, customTo);

  useEffect(() => {
    let isCancelled = false;
    // Resetting loading/error state at the start of each fetch is the standard
    // reset-before-async-work pattern; it can't cascade since neither value
    // is a dependency of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    Promise.all([getSummary({ from, to }), getAnalytics({ from, to })])
      .then(([summaryData, analyticsData]) => {
        if (isCancelled) return;
        setSummary(summaryData);
        setAnalytics(analyticsData);
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
  }, [from, to, refreshIndex]);

  return {
    summary,
    analytics,
    isLoading,
    error,
    preset,
    customFrom,
    customTo,
    setPreset,
    setCustomFrom,
    setCustomTo,
    reload: () => setRefreshIndex((n) => n + 1),
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- useDashboardData.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useDashboardData.js frontend/src/hooks/useDashboardData.test.jsx
git commit -m "feat: add useDashboardData hook with date-range presets"
```

---

### Task 5: `DashboardPage` assembly

**Files:**
- Modify: `frontend/src/pages/admin/DashboardPage.jsx` (replace the placeholder body entirely)
- Test: `frontend/src/pages/admin/DashboardPage.test.jsx`

**Interfaces:**
- Consumes: `AnalyticsCard` (Task 2), `AnalyticsChart` (Task 3), `useDashboardData` (Task 4), `FilterDropdown`/`LoadingSpinner`/`ErrorState` (existing).
- Produces: the complete `/admin` route content — terminal for this stage and for the entire Frontend Admin project phase.

**Note:** `App.jsx` already routes `/admin` to `DashboardPage` (unchanged) — this task only replaces the placeholder's internal content.

- [ ] **Step 1: Write the failing test**

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

  it('renders all seven summary cards with the correct values', async () => {
    renderPage();
    await screen.findByText('Website Views by Day');

    expect(screen.getByText('Total Views').closest('.rounded-xl')).toHaveTextContent('1204');
    expect(screen.getByText('Total Clicks').closest('.rounded-xl')).toHaveTextContent('356');
    expect(screen.getByText('Estimated Commission').closest('.rounded-xl')).toHaveTextContent('$128.50');
    expect(screen.getByText('Total Products').closest('.rounded-xl')).toHaveTextContent('42');
    expect(screen.getByText('Total Categories').closest('.rounded-xl')).toHaveTextContent('6');
    expect(screen.getByText('Trending Products').closest('.rounded-xl')).toHaveTextContent('8');
    expect(screen.getByText('Best Sellers').closest('.rounded-xl')).toHaveTextContent('5');
  });

  it('renders all five analytics chart labels', async () => {
    renderPage();

    expect(await screen.findByText('Website Views by Day')).toBeInTheDocument();
    expect(screen.getByText('Product Clicks by Day')).toBeInTheDocument();
    expect(screen.getByText('Most-Clicked Products')).toBeInTheDocument();
    expect(screen.getByText('Estimated Commission by Category')).toBeInTheDocument();
    expect(screen.getByText('Products Added by Month')).toBeInTheDocument();
  });

  it('shows custom date inputs only when the Custom Range preset is selected', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Website Views by Day');

    expect(screen.queryByLabelText('From')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Date Range'), 'custom');

    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
  });

  it('re-fetches with new params when the date filter changes', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Website Views by Day');

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

    expect(await screen.findByText('Website Views by Day')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- DashboardPage.test.jsx`
Expected: FAIL — the current placeholder renders none of this.

- [ ] **Step 3: Write the new `DashboardPage.jsx`**

```jsx
import { Eye, MousePointerClick, DollarSign, Package, Tags, TrendingUp, Award } from 'lucide-react';
import AnalyticsCard from '../../components/AnalyticsCard.jsx';
import AnalyticsChart from '../../components/AnalyticsChart.jsx';
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

function DashboardPage() {
  const dashboard = useDashboardData();

  if (dashboard.isLoading) {
    return <LoadingSpinner label="Loading dashboard..." />;
  }

  if (dashboard.error) {
    return <ErrorState message={dashboard.error} onRetry={dashboard.reload} />;
  }

  const { summary, analytics } = dashboard;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
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
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        <AnalyticsCard label="Trending Products" value={summary.trendingCount} icon={TrendingUp} />
        <AnalyticsCard label="Best Sellers" value={summary.bestSellerCount} icon={Award} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AnalyticsChart type="line" data={analytics.viewsByDay} xKey="date" yKey="count" label="Website Views by Day" />
        <AnalyticsChart type="line" data={analytics.clicksByDay} xKey="date" yKey="count" label="Product Clicks by Day" />
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

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm test -- DashboardPage.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/admin/DashboardPage.jsx frontend/src/pages/admin/DashboardPage.test.jsx
git commit -m "feat: assemble the dashboard page with summary cards and analytics charts"
```

---

### Task 6: Final verification

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything from Tasks 1–5
- Produces: nothing further downstream — this sub-stage's (and the entire Frontend Admin project phase's) final gate.

- [ ] **Step 1: Run the entire test suite**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus all tests from Tasks 1 through 5.

- [ ] **Step 2: Run lint**

Run: `cd frontend && npm run lint`
Expected: clean (0 errors, 0 warnings). `useDashboardData`'s fetch effect already carries the `react-hooks/set-state-in-effect` disable comment established in prior stages. Note from the System Settings stage: only add an `exhaustive-deps` disable comment if lint actually flags one — don't add it preemptively, since an unused directive is itself a lint warning.

- [ ] **Step 3: Run the production build**

Run: `cd frontend && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 4: Manual smoke check (optional, requires the backend running and a real admin login)**

Optional — skip if a live backend isn't available; Steps 1-3 are the mandatory bar. If available: open `/admin`, confirm all 7 cards and 5 charts render with real data (or empty states if the database has no views/clicks yet — note that as non-blocking, not a failure), switching date-range presets updates the data, and Custom Range's date inputs work correctly.

- [ ] **Step 5: Commit (if the smoke check surfaced any fixes)**

If Step 4 found nothing to fix (or was skipped), there is nothing to commit for this task — Task 5's commit is the final commit of this sub-stage. If it did surface a small fix, apply it, re-run Steps 1-3, and commit:
```bash
git add -A
git commit -m "fix: address issue found during Admin Dashboard & Analytics manual smoke check"
```
