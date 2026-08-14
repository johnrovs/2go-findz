# Admin Dashboard Phase 5: Footer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal `AdminFooter` component to the admin shell, appearing consistently across every admin page.

**Architecture:** A single new, fully static React component (no props, no data fetching) placed in `AdminLayout.jsx` below the routed `<Outlet>` content.

**Tech Stack:** React, Tailwind CSS.

## Global Constraints

- The admin area is hardcoded English, not part of the i18n system — same convention as every other admin component (`DashboardHeader`, `DashboardKpiCard`, `AdminSidebar`, etc.).
- The footer renders across every admin page (via `AdminLayout.jsx`), not just the dashboard.
- No nav links or social icons — those belong to the public site's `PublicFooter`, not this internal admin tool.
- Spec reference: `docs/superpowers/specs/2026-08-13-admin-dashboard-phase5-footer-design.md`.

---

### Task 1: `AdminFooter` component

**Files:**
- Create: `frontend/src/components/AdminFooter.jsx`
- Test: `frontend/src/components/AdminFooter.test.jsx`

**Interfaces:**
- Produces: default-exported `AdminFooter()` — no props, fully static. Consumed by Task 2.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/AdminFooter.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AdminFooter from './AdminFooter.jsx';

describe('AdminFooter', () => {
  it('renders the copyright text with the current year', () => {
    render(<AdminFooter />);
    const year = new Date().getFullYear();
    expect(screen.getByText(`© ${year} 2Go Findz. All rights reserved.`)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `frontend/`): `npm test -- AdminFooter`
Expected: FAIL — `src/components/AdminFooter.jsx` does not exist.

- [ ] **Step 3: Implement**

Create `frontend/src/components/AdminFooter.jsx`:

```jsx
function AdminFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200 px-6 py-4">
      <p className="text-small text-muted">© {year} 2Go Findz. All rights reserved.</p>
    </footer>
  );
}

export default AdminFooter;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- AdminFooter`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/AdminFooter.jsx frontend/src/components/AdminFooter.test.jsx
git commit -m "feat(admin-dashboard): add AdminFooter component"
```

---

### Task 2: Assemble into `AdminLayout`

**Files:**
- Modify: `frontend/src/layouts/AdminLayout.jsx`
- Modify: `frontend/src/layouts/AdminLayout.test.jsx`

**Interfaces:**
- Consumes: `AdminFooter` (Task 1).

- [ ] **Step 1: Update `AdminLayout.jsx`**

Add the import at the top (alongside the existing component imports):

```js
import AdminFooter from '../components/AdminFooter.jsx';
```

Replace the `<main>` block to add `<AdminFooter />` after the `<Outlet>`:

```jsx
        <main className="flex-1 p-6">
          {/* Routed pages that render their own sticky top bar (replacing
              AdminTopbar there, e.g. the Buying Guide editor) read this via
              useOutletContext() to still open the mobile sidebar drawer. */}
          <Outlet context={{ onMenuClick }} />
        </main>
        <AdminFooter />
```

(This moves `<AdminFooter />` outside `<main>` but still inside the same `flex min-w-0 flex-1 flex-col` wrapper div, so it renders as a distinct block below the page content rather than as part of the scrollable main content area — matching how `PublicFooter` sits outside the public site's main content region.)

- [ ] **Step 2: Update `AdminLayout.test.jsx`**

Add one new test case (alongside the existing `it(...)` blocks, before the final closing `});`):

```jsx
  it('renders the AdminFooter copyright text alongside the routed content', () => {
    renderLayout();
    const year = new Date().getFullYear();
    expect(screen.getByText(`© ${year} 2Go Findz. All rights reserved.`)).toBeInTheDocument();
  });
```

- [ ] **Step 3: Run the full frontend suite**

Run: `npm test` (from `frontend/`)
Expected: PASS, 0 failures.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/layouts/AdminLayout.jsx frontend/src/layouts/AdminLayout.test.jsx
git commit -m "feat(admin-dashboard): render AdminFooter on every admin page"
```

---

### Task 3: Full verification and manual check

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
Expected: PASS, 0 failures. (No backend files change in this phase — this run is a regression check.)

- [ ] **Step 5: Manual verification**

Start both servers (or reuse already-running instances), log in as admin, and confirm the footer's copyright text renders at the bottom of the Dashboard, Products, Categories, Buying Guides, Comparisons, and Settings pages — consistent placement, no layout shift or overlap with page content, no console errors.

- [ ] **Step 6: Write the completion note**

Summarize in the final report: what shipped (`AdminFooter` rendering on every admin page), confirmation that System Alerts and real Export Report remain out of scope, test/lint/build results (frontend + backend).

---

## Self-Review Notes

- **Spec coverage:** `AdminFooter` component with exact copy/styling (Task 1), whole-admin-area placement via `AdminLayout` (Task 2), full verification across every admin page (Task 3) — all covered.
- **Placeholder scan:** no TBD/TODO; every step has real, complete code.
- **Type consistency:** `AdminFooter` takes no props in both its Task 1 definition and its Task 2 call site (`<AdminFooter />`); the copyright text string is identical across the component, its own test, and `AdminLayout.test.jsx`'s new assertion.
