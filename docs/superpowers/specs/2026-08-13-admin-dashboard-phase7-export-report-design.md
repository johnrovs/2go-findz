# Admin Dashboard Phase 7: Real Export Report

## Context

Follow-on to Phase 1 through Phase 6 (shell/KPI/chart, Top Categories/Recent Products, Quick Actions, Latest Guides, footer, System Alerts) — all shipped. This is the **last remaining piece** from the original reference decomposition: real Export Report generation. The button already exists in `DashboardHeader.jsx:31-41` but is hardcoded `disabled` with `title="Export Report is coming soon"`.

**Confirmed by reading the code:** no export infrastructure exists anywhere — no CSV/PDF/XLSX library in `backend/pom.xml`, no export-related code in the backend, nothing export-related in `frontend/package.json`. This is genuinely new work.

## Scope

Add a working CSV export of the currently-viewed dashboard data (KPI summary + daily views/clicks) for the selected date range, generated server-side and downloaded via a real backend endpoint.

**Decisions confirmed with the user:**
- **Format:** CSV only — no new heavy dependency (Apache POI for XLSX, iText/OpenPDF for PDF) for this first cut.
- **Generation location:** backend endpoint, not client-side formatting — aligns with the project's "use backend-generated metrics" rule and makes the export authoritative regardless of what the browser currently has cached.
- **Content:** the KPI summary numbers (Total Views, Total Clicks, Total Products, Published Guides, Avg CTR) plus one row per day of views/clicks from the Performance Overview chart's date range — not every card on the dashboard (Top Categories, Recent Products, Latest Guides stay out of scope; they're already viewable/actionable on their own pages).

## Backend

New endpoint on the existing `AdminDashboardController`:

```
GET /api/admin/dashboard/export?from=...&to=...
```

Same `from`/`to` optional `LocalDate` params as `/summary` and `/analytics` (same `@DateTimeFormat(iso = DateTimeFormat.ISO.DATE)` pattern). Reuses `DashboardService.getSummary(from, to)` and `.getAnalytics(from, to)` — no new repository queries, only a new CSV-formatting layer.

**Response:** raw CSV bytes, not wrapped in `ApiResponse` (this is a file download, not a JSON API call):
- `Content-Type: text/csv`
- `Content-Disposition: attachment; filename="dashboard-report_{from}_to_{to}.csv"` (ISO dates, e.g. `dashboard-report_2026-07-15_to_2026-08-13.csv`)

**CSV shape** — two sections separated by a blank line (valid CSV; a spreadsheet app opening it just sees one blank row between the two tables):

```
Metric,Value
Date Range,"Jul 15, 2026 - Aug 13, 2026"
Total Views,77
Total Clicks,10
Total Products,8
Published Guides,2
Avg. Click Through Rate,13%

Date,Views,Clicks
2026-07-26,1,0
2026-07-27,14,3
```

- "Date Range" is formatted `MMM d, yyyy - MMM d, yyyy` (Java `DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.US)`), matching `DashboardDateRangePicker.jsx`'s exact display format (`dateFormat="MMM d, yyyy"`) so the export reads the same as the on-screen picker.
- Avg CTR is computed server-side in the new export code using the same formula the frontend already uses for the KPI card (`round(totalClicks / totalViews * 100, 1 decimal)`) — this duplicates a formula that today only exists in `DashboardPage.jsx`'s `safePercentage()`, but the export runs entirely server-side and can't call frontend code, so a server-side equivalent is unavoidable. Both call sites compute the identical ratio from the identical source numbers, so they can never disagree.
- Values containing commas (only "Date Range" in this shape) are double-quoted per standard CSV convention; the metric/date/count values never contain commas so no other quoting is needed.
- The daily rows come directly from `DashboardAnalyticsResponse.viewsByDay()`/`.clicksByDay()`, merged by date the same way `DashboardPage.jsx`'s `mergeViewsAndClicks()` already does client-side for the chart (any date present in one but not the other gets 0 for the missing series) — but computed server-side for the export, not by calling into frontend code.

## Frontend

`DashboardHeader.jsx`'s Export Report button loses its hardcoded `disabled`/`title`. New `exportDashboardReport(startDate, endDate)` in `frontend/src/services/dashboardService.js`:
- `api.get('/admin/dashboard/export', { params: { from, to }, responseType: 'blob' })`.
- On success: builds an object URL from the blob, creates a temporary `<a>` with `download="dashboard-report_{from}_to_{to}.csv"` (same filename convention as the backend, built client-side from the already-available `startDate`/`endDate` props — no need to parse the `Content-Disposition` response header), clicks it programmatically, then revokes the object URL.
- On failure: `showToast('Failed to export report. Please try again.', 'error')` via the existing `useToast` hook (already used the same way elsewhere in the admin app, e.g. `CategoriesPage.jsx`).

While the request is in flight, the button shows a brief loading state (text changes to "Exporting…", stays disabled) via local component state in `DashboardHeader.jsx` — no new shared loading-state infrastructure needed. No success toast; the browser's own download indicator is the user's confirmation.

## Testing

- Backend: a new test in `AdminDashboardControllerTest.java` (or a new focused test class if the existing file has grown large enough to warrant a split — implementer's call) asserting the export endpoint returns `200`, `Content-Type: text/csv`, the expected `Content-Disposition` filename, and that the CSV body contains the real summary numbers and the expected daily rows for known seeded data.
- Frontend: `dashboardService.test.js` gets a test for `exportDashboardReport` confirming it calls `api.get` with the right URL, params, and `responseType: 'blob'`. `DashboardHeader.test.jsx` gets tests confirming the button is no longer disabled, shows a loading state while the mocked call is in flight, and shows an error toast on a mocked failure.

## Self-Review

- **Placeholder scan:** no TBD/TODO; CSV shape, formatting rules, endpoint contract, and frontend download mechanics are all fully specified.
- **Internal consistency:** the "Avg CTR" duplication between `DashboardPage.jsx`'s existing client-side `safePercentage()` and the new server-side export formula is called out explicitly, with the reason it's unavoidable (export can't call frontend code) — not left as an unexplained inconsistency.
- **Scope check:** one new backend endpoint (reusing existing service methods, no new queries) + one new frontend service function + one button-state change — comparable in size to Phase 2/6, appropriately sized for one implementation plan.
- **Ambiguity check:** the exact CSV column layout, date formatting, filename convention, and quoting rule are all made explicit rather than left to implementer judgment.
