# Admin Dashboard Phase 7: Export Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Export Report button from a disabled placeholder into a working CSV download of the KPI summary and daily views/clicks for the selected date range, generated server-side.

**Architecture:** A new backend endpoint reuses the existing `DashboardService.getSummary()`/`.getAnalytics()` methods (no new queries) and formats their output as CSV bytes. The frontend calls it with `responseType: 'blob'` and triggers a real browser download via a temporary anchor element.

**Tech Stack:** Spring Boot (`ResponseEntity<byte[]>`, no new dependency), React, axios (`responseType: 'blob'`).

## Global Constraints

- CSV only — no new library dependency (Apache POI/iText/OpenPDF explicitly out of scope for this phase).
- The export is generated entirely server-side; the frontend only triggers the download, it never formats or recomputes report data.
- CSV shape is two sections separated by a blank line: a `Metric,Value` summary block, then a `Date,Views,Clicks` daily table.
- "Date Range" value is formatted `MMM d, yyyy` (Java `DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US)`), matching `DashboardDateRangePicker.jsx`'s `dateFormat="MMM d, yyyy"` exactly.
- Filename convention: `dashboard-report_{from}_to_{to}.csv` using ISO date strings (or `all-time` if a bound is omitted).
- Spec reference: `docs/superpowers/specs/2026-08-13-admin-dashboard-phase7-export-report-design.md`.

---

### Task 1: Backend — `GET /api/admin/dashboard/export`

**Files:**
- Modify: `backend/src/main/java/com/twogofindz/backend/service/DashboardService.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/service/impl/DashboardServiceImpl.java`
- Modify: `backend/src/main/java/com/twogofindz/backend/controller/admin/AdminDashboardController.java`
- Test: `backend/src/test/java/com/twogofindz/backend/controller/admin/AdminDashboardControllerTest.java`

**Interfaces:**
- Produces: `GET /api/admin/dashboard/export?from=...&to=...` — `200 OK`, `Content-Type: text/csv`, `Content-Disposition: attachment; filename="dashboard-report_{from}_to_{to}.csv"`, raw CSV bytes as body. Consumed by Task 2 (frontend).
- Produces: `DashboardService.exportSummaryCsv(LocalDate from, LocalDate to)` → `byte[]` (UTF-8 CSV bytes).

- [ ] **Step 1: Write the failing tests**

Add to `AdminDashboardControllerTest.java`, inserted before the existing `private Long createBuyingGuideId(...)` helper:

```java
@Test
void export_returnsCsvWithRealSummaryAndDailyData() throws Exception {
    String token = adminToken();
    Long categoryId = createCategoryId(token, "Export Test Category");
    Long productId = createProductId(token, "Export Test Product", categoryId, new BigDecimal("10.00"), false, false, true);
    mockMvc.perform(post("/api/public/products/{id}/click", productId));

    var result = mockMvc.perform(get("/api/admin/dashboard/export")
                    .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk())
            .andExpect(content().contentType("text/csv"))
            .andReturn();

    String contentDisposition = result.getResponse().getHeader("Content-Disposition");
    assertTrue(contentDisposition != null && contentDisposition.startsWith("attachment; filename=\"dashboard-report_"),
            "Content-Disposition must attach a dashboard-report CSV file");

    String csv = result.getResponse().getContentAsString();
    assertTrue(csv.contains("Metric,Value"), "CSV must include the summary header row");
    assertTrue(csv.contains("Date,Views,Clicks"), "CSV must include the daily-data header row");
    assertTrue(csv.contains("Total Products,"), "CSV must include a Total Products row");
}

@Test
void export_includesRequestedDateRangeInFilename() throws Exception {
    String token = adminToken();

    mockMvc.perform(get("/api/admin/dashboard/export")
                    .header("Authorization", "Bearer " + token)
                    .param("from", "2026-07-01")
                    .param("to", "2026-07-31"))
            .andExpect(status().isOk())
            .andExpect(header().string("Content-Disposition",
                    "attachment; filename=\"dashboard-report_2026-07-01_to_2026-07-31.csv\""));
}
```

Add these imports to `AdminDashboardControllerTest.java` (check existing imports first and only add what's missing):

```java
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `backend/`): `mvn test -Dtest=AdminDashboardControllerTest#export_returnsCsvWithRealSummaryAndDailyData+export_includesRequestedDateRangeInFilename`
Expected: FAIL — `404 Not Found`, the endpoint doesn't exist yet.

- [ ] **Step 3: Add `exportSummaryCsv` to the service interface**

In `DashboardService.java`, add:

```java
byte[] exportSummaryCsv(LocalDate from, LocalDate to);
```

- [ ] **Step 4: Implement `exportSummaryCsv` in `DashboardServiceImpl`**

Add imports:

```java
import com.twogofindz.backend.dto.response.DailyCountResponse;

import java.nio.charset.StandardCharsets;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
```

(`java.util.Map` is likely already imported for the existing `recentProducts`/`latestGuides` blocks — check before adding a duplicate.)

Add the method (anywhere after `getAnalytics()`, before the private helper methods at the bottom):

```java
@Override
@Transactional(readOnly = true)
public byte[] exportSummaryCsv(LocalDate from, LocalDate to) {
    DashboardSummaryResponse summary = getSummary(from, to);
    DashboardAnalyticsResponse analytics = getAnalytics(from, to);

    DateTimeFormatter dateLabelFormatter = DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US);
    String fromLabel = from != null ? from.format(dateLabelFormatter) : "All time";
    String toLabel = to != null ? to.format(dateLabelFormatter) : "All time";

    double ctr = summary.totalViews() == 0 ? 0
            : Math.round((double) summary.totalClicks() / summary.totalViews() * 1000) / 10.0;
    String ctrLabel = ctr == Math.floor(ctr) ? String.format("%d%%", (long) ctr) : String.format("%.1f%%", ctr);

    StringBuilder csv = new StringBuilder();
    csv.append("Metric,Value\n");
    csv.append("Date Range,\"").append(fromLabel).append(" - ").append(toLabel).append("\"\n");
    csv.append("Total Views,").append(summary.totalViews()).append('\n');
    csv.append("Total Clicks,").append(summary.totalClicks()).append('\n');
    csv.append("Total Products,").append(summary.totalProducts()).append('\n');
    csv.append("Published Guides,").append(summary.publishedGuideCount()).append('\n');
    csv.append("Avg. Click Through Rate,").append(ctrLabel).append('\n');
    csv.append('\n');
    csv.append("Date,Views,Clicks\n");

    Map<LocalDate, Long> viewsByDate = analytics.viewsByDay().stream()
            .collect(Collectors.toMap(DailyCountResponse::date, DailyCountResponse::count));
    Map<LocalDate, Long> clicksByDate = analytics.clicksByDay().stream()
            .collect(Collectors.toMap(DailyCountResponse::date, DailyCountResponse::count));
    Set<LocalDate> allDates = new TreeSet<>();
    allDates.addAll(viewsByDate.keySet());
    allDates.addAll(clicksByDate.keySet());
    for (LocalDate date : allDates) {
        csv.append(date).append(',')
                .append(viewsByDate.getOrDefault(date, 0L)).append(',')
                .append(clicksByDate.getOrDefault(date, 0L)).append('\n');
    }

    return csv.toString().getBytes(StandardCharsets.UTF_8);
}
```

(`Collectors` is already imported in this file for the existing `recentProducts`/`latestGuides` blocks.)

- [ ] **Step 5: Add the controller endpoint**

In `AdminDashboardController.java`, add imports:

```java
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
```

Add the endpoint (after the existing `analytics` method):

```java
@GetMapping("/export")
public ResponseEntity<byte[]> export(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
    byte[] csv = dashboardService.exportSummaryCsv(from, to);
    String fromLabel = from != null ? from.toString() : "all-time";
    String toLabel = to != null ? to.toString() : "all-time";
    String filename = "dashboard-report_" + fromLabel + "_to_" + toLabel + ".csv";

    return ResponseEntity.ok()
            .contentType(MediaType.valueOf("text/csv"))
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .body(csv);
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `mvn test -Dtest=AdminDashboardControllerTest`
Expected: PASS (all tests in the file, including the two new ones).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/twogofindz/backend/service/DashboardService.java backend/src/main/java/com/twogofindz/backend/service/impl/DashboardServiceImpl.java backend/src/main/java/com/twogofindz/backend/controller/admin/AdminDashboardController.java backend/src/test/java/com/twogofindz/backend/controller/admin/AdminDashboardControllerTest.java
git commit -m "feat(admin-dashboard): add CSV export endpoint for the dashboard report"
```

---

### Task 2: Frontend — `exportDashboardReport` service function

**Files:**
- Modify: `frontend/src/services/dashboardService.js`
- Modify: `frontend/src/services/dashboardService.test.js`

**Interfaces:**
- Produces: `exportDashboardReport({ from, to })` → `Promise<Blob>` (the raw CSV blob; the caller is responsible for triggering the download). Consumed by Task 3.

- [ ] **Step 1: Write the failing test**

Add to `dashboardService.test.js` (alongside the existing tests, before the final closing `});`):

```jsx
import { exportDashboardReport } from './dashboardService.js';
```

(Update the existing import line to include it: `import { getSummary, getAnalytics, exportDashboardReport } from './dashboardService.js';`)

```jsx
  it('exportDashboardReport fetches the CSV blob from /admin/dashboard/export with the given date range', async () => {
    const blob = new Blob(['Metric,Value'], { type: 'text/csv' });
    vi.spyOn(api, 'get').mockResolvedValue({ data: blob });

    const result = await exportDashboardReport({ from: '2026-07-01', to: '2026-07-27' });

    expect(api.get).toHaveBeenCalledWith('/admin/dashboard/export', {
      params: { from: '2026-07-01', to: '2026-07-27' },
      responseType: 'blob',
    });
    expect(result).toBe(blob);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `frontend/`): `npm test -- dashboardService`
Expected: FAIL — `exportDashboardReport` is not exported yet.

- [ ] **Step 3: Implement**

In `dashboardService.js`, add:

```js
export async function exportDashboardReport({ from, to } = {}) {
  const response = await api.get('/admin/dashboard/export', {
    params: { from, to },
    responseType: 'blob',
  });
  return response.data;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- dashboardService`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/dashboardService.js frontend/src/services/dashboardService.test.js
git commit -m "feat(admin-dashboard): add exportDashboardReport to dashboardService"
```

---

### Task 3: Frontend — wire the Export Report button

**Files:**
- Modify: `frontend/src/components/DashboardHeader.jsx`
- Modify: `frontend/src/components/DashboardHeader.test.jsx`
- Modify: `frontend/src/pages/admin/DashboardPage.test.jsx`

**Interfaces:**
- Consumes: `exportDashboardReport` (Task 2), `useToast` (existing, `frontend/src/hooks/useToast.js`).

- [ ] **Step 1: Update the failing test**

`DashboardHeader.test.jsx` currently has a test `renders a disabled Export Report button` that will now be false — replace it and add new tests. Replace the whole file:

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../context/ToastContext.jsx';
import DashboardHeader from './DashboardHeader.jsx';
import * as useAuthModule from '../hooks/useAuth.js';
import * as dashboardService from '../services/dashboardService.js';

function renderHeader(props = {}) {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    user: { fullName: 'John Rommel Rovero', role: 'Administrator' },
    logout: vi.fn(),
  });
  return render(
    <MemoryRouter>
      <ToastProvider>
        <DashboardHeader
          startDate={new Date(2026, 4, 19)}
          endDate={new Date(2026, 4, 25)}
          onRangeChange={vi.fn()}
          {...props}
        />
      </ToastProvider>
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

  it('renders an enabled Export Report button', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: /Export Report/ })).not.toBeDisabled();
  });

  it('exports the report for the given date range when clicked', async () => {
    const user = userEvent.setup();
    const blob = new Blob(['Metric,Value'], { type: 'text/csv' });
    vi.spyOn(dashboardService, 'exportDashboardReport').mockResolvedValue(blob);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    renderHeader();
    await user.click(screen.getByRole('button', { name: /Export Report/ }));

    await waitFor(() =>
      expect(dashboardService.exportDashboardReport).toHaveBeenCalledWith({ from: '2026-05-19', to: '2026-05-25' })
    );
  });

  it('shows an error toast when the export fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(dashboardService, 'exportDashboardReport').mockRejectedValue(new Error('Network error.'));

    renderHeader();
    await user.click(screen.getByRole('button', { name: /Export Report/ }));

    expect(await screen.findByText('Failed to export report. Please try again.')).toBeInTheDocument();
  });

  it('renders an accessible administrator menu trigger showing name and role', () => {
    renderHeader();
    const trigger = screen.getByRole('button', { name: /John Rommel Rovero.*account menu/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- DashboardHeader`
Expected: FAIL — the button is still hardcoded `disabled`, and `exportDashboardReport` isn't called from the component yet.

- [ ] **Step 3: Implement**

Replace `DashboardHeader.jsx` in full:

```jsx
import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ChevronDown, Download, Menu } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useToast } from '../hooks/useToast.js';
import { exportDashboardReport } from '../services/dashboardService.js';
import DashboardDateRangePicker from './DashboardDateRangePicker.jsx';
import Button from './Button.jsx';

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function DashboardHeader({ startDate, endDate, onRangeChange }) {
  const { onMenuClick } = useOutletContext() ?? {};
  const { user } = useAuth();
  const { showToast } = useToast();
  const fullName = user?.fullName ?? 'Administrator';
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    const from = formatDate(startDate);
    const to = formatDate(endDate);
    setIsExporting(true);
    try {
      const blob = await exportDashboardReport({ from, to });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dashboard-report_${from}_to_${to}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('Failed to export report. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  }

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
        <Button type="button" variant="secondary" size="sm" disabled={isExporting} onClick={handleExport} className="gap-2">
          <Download size={16} />
          {isExporting ? 'Exporting…' : 'Export Report'}
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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- DashboardHeader`
Expected: PASS

- [ ] **Step 5: Fix `DashboardPage.test.jsx` — it renders `DashboardHeader`, which now calls `useToast()`**

`DashboardHeader` now calls `useToast()` unconditionally, and `useToast()` throws if there's no `ToastProvider` ancestor. `DashboardPage.test.jsx`'s `renderPage()` helper does not currently wrap in one (confirmed by reading the file — it wraps only in `MemoryRouter`), so every test in that file will now fail. Fix it:

Add the import (alongside the existing ones):

```js
import { ToastProvider } from '../../context/ToastContext.jsx';
```

Update `renderPage()`:

```jsx
function renderPage() {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    user: { fullName: 'John Rommel Rovero', role: 'Administrator' },
    logout: vi.fn(),
  });
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <ToastProvider>
        <DashboardPage />
      </ToastProvider>
    </MemoryRouter>
  );
}
```

- [ ] **Step 6: Run the full frontend suite**

Run: `npm test` (from `frontend/`)
Expected: PASS, 0 failures.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/DashboardHeader.jsx frontend/src/components/DashboardHeader.test.jsx frontend/src/pages/admin/DashboardPage.test.jsx
git commit -m "feat(admin-dashboard): wire the Export Report button to the real CSV export"
```

---

### Task 4: Full verification and manual check

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

Start both servers (or reuse already-running instances), log in as admin, navigate to `/admin`, click Export Report, and confirm: the button briefly shows "Exporting…" then a real `dashboard-report_....csv` file downloads; opening it shows the two-section CSV shape (KPI summary rows, blank line, daily Date/Views/Clicks table) with numbers matching what's on screen; the Date Range row matches the on-screen date-range picker's format; changing the date range and exporting again produces a file with a different filename and different numbers; no console errors. Also verify the error path by temporarily stopping the backend (or using dev tools to block the request) and confirming the error toast appears.

- [ ] **Step 7: Write the completion note**

Summarize in the final report: what shipped (real CSV export of the KPI summary + daily views/clicks, generated server-side, downloaded via the previously-disabled Export Report button), confirmation this was the last remaining piece from the original admin dashboard reference decomposition, test/lint/build results (frontend + backend).

---

## Self-Review Notes

- **Spec coverage:** backend CSV generation reusing existing service methods with no new queries (Task 1), frontend service function (Task 2), button wiring with loading/error states (Task 3), full verification including the real download + error-path check (Task 4) — all covered.
- **Placeholder scan:** no TBD/TODO; every step has real, complete code.
- **Type consistency:** `exportDashboardReport({ from, to })` signature matches identically between its Task 2 definition, its Task 2 test, and its Task 3 call site in `DashboardHeader.jsx` (`exportDashboardReport({ from, to })`). `DashboardService.exportSummaryCsv(LocalDate from, LocalDate to)` matches between the Task 1 interface and its `DashboardServiceImpl` implementation and its `AdminDashboardController` call site.
