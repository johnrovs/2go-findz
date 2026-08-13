# Admin Dashboard Phase 3: Quick Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a static "Quick Actions" card to the admin dashboard with four shortcuts to the app's real content-creation routes, and place it beside Recent Products in the dashboard's lower grid.

**Architecture:** A single new, fully static React component (no props, no data fetching) rendering four `react-router` `Link`s to existing routes. `DashboardPage.jsx`'s lower grid changes from one column to two.

**Tech Stack:** React, react-router-dom, lucide-react icons, Tailwind CSS (existing `dashboard-*` color tokens from `tailwind.config.js`).

## Global Constraints

- No new backend work — every route and label in `QuickActionsCard` is hardcoded.
- No placeholder gaps for Latest Guides (middle column) or System Alerts (future phase) — the lower grid is exactly two columns until those phases exist.
- "Manage Categories" links to `/admin/categories` (the list page), not a deep-linked "open Add Category modal" — that route doesn't exist and creating one is out of scope.
- Spec reference: `docs/superpowers/specs/2026-08-13-admin-dashboard-phase3-quick-actions-design.md`.

---

### Task 1: `QuickActionsCard` component

**Files:**
- Create: `frontend/src/components/QuickActionsCard.jsx`
- Test: `frontend/src/components/QuickActionsCard.test.jsx`

**Interfaces:**
- Produces: default-exported `QuickActionsCard()` — no props, fully static. Consumed by Task 2.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/QuickActionsCard.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import QuickActionsCard from './QuickActionsCard.jsx';

function renderCard() {
  return render(
    <MemoryRouter>
      <QuickActionsCard />
    </MemoryRouter>
  );
}

describe('QuickActionsCard', () => {
  it('renders the title', () => {
    renderCard();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('renders all four action links with the correct hrefs', () => {
    renderCard();
    expect(screen.getByRole('link', { name: /Add Product/ })).toHaveAttribute('href', '/admin/products/new');
    expect(screen.getByRole('link', { name: /Add Buying Guide/ })).toHaveAttribute(
      'href',
      '/admin/buying-guides/new'
    );
    expect(screen.getByRole('link', { name: /Add Comparison/ })).toHaveAttribute(
      'href',
      '/admin/comparisons/new'
    );
    expect(screen.getByRole('link', { name: /Manage Categories/ })).toHaveAttribute('href', '/admin/categories');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `frontend/`): `npm test -- QuickActionsCard`
Expected: FAIL — `src/components/QuickActionsCard.jsx` does not exist.

- [ ] **Step 3: Implement**

Create `frontend/src/components/QuickActionsCard.jsx`:

```jsx
import { Link } from 'react-router-dom';
import { ChevronRight, FileText, GitCompare, Package, Tag } from 'lucide-react';

const ACTIONS = [
  { label: 'Add Product', to: '/admin/products/new', icon: Package, colorClass: 'bg-dashboard-green/10 text-dashboard-green' },
  {
    label: 'Add Buying Guide',
    to: '/admin/buying-guides/new',
    icon: FileText,
    colorClass: 'bg-dashboard-blue/10 text-dashboard-blue',
  },
  {
    label: 'Add Comparison',
    to: '/admin/comparisons/new',
    icon: GitCompare,
    colorClass: 'bg-dashboard-purple/10 text-dashboard-purple',
  },
  {
    label: 'Manage Categories',
    to: '/admin/categories',
    icon: Tag,
    colorClass: 'bg-dashboard-orange/10 text-dashboard-orange',
  },
];

function QuickActionsCard() {
  return (
    <div className="flex h-full flex-col rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <h3 className="mb-4 text-card-title text-heading">Quick Actions</h3>
      <ul className="space-y-1">
        {ACTIONS.map(({ label, to, icon: Icon, colorClass }) => (
          <li key={to}>
            <Link
              to={to}
              className="flex items-center gap-3 rounded-btn px-2 py-2.5 hover:bg-surface-secondary"
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                <Icon size={14} />
              </span>
              <span className="flex-1 text-small font-medium text-heading">{label}</span>
              <ChevronRight size={16} className="shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default QuickActionsCard;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- QuickActionsCard`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/QuickActionsCard.jsx frontend/src/components/QuickActionsCard.test.jsx
git commit -m "feat(admin-dashboard): add QuickActionsCard component"
```

---

### Task 2: Assemble into `DashboardPage`

**Files:**
- Modify: `frontend/src/pages/admin/DashboardPage.jsx`
- Modify: `frontend/src/pages/admin/DashboardPage.test.jsx`

**Interfaces:**
- Consumes: `QuickActionsCard` (Task 1).

- [ ] **Step 1: Update `DashboardPage.jsx`**

Add the import at the top (alongside the existing component imports):

```js
import QuickActionsCard from '../../components/QuickActionsCard.jsx';
```

Replace the lower grid (currently single-column, just `RecentProductsCard`) with a two-column grid:

```jsx
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(310px,1fr)]">
        <RecentProductsCard products={analytics.recentProducts} />
        <QuickActionsCard />
      </div>
    </div>
  );
}

export default DashboardPage;
```

(This replaces the existing `<div className="mt-4 grid grid-cols-1">...</div>` block — same `RecentProductsCard` call, now alongside `QuickActionsCard` inside the wider grid, with the trailing `</div>` / `);` / `}` / `export default DashboardPage;` unchanged.)

- [ ] **Step 2: Update `DashboardPage.test.jsx`**

Add one new test case (alongside the existing `it(...)` blocks, before the final closing `});`):

```jsx
  it('renders the Quick Actions card with all four shortcuts', async () => {
    renderPage();
    await screen.findByText('Performance Overview');

    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Add Product/ })).toHaveAttribute('href', '/admin/products/new');
    expect(screen.getByRole('link', { name: /Add Buying Guide/ })).toHaveAttribute(
      'href',
      '/admin/buying-guides/new'
    );
    expect(screen.getByRole('link', { name: /Add Comparison/ })).toHaveAttribute(
      'href',
      '/admin/comparisons/new'
    );
    expect(screen.getByRole('link', { name: /Manage Categories/ })).toHaveAttribute('href', '/admin/categories');
  });
```

- [ ] **Step 3: Run the full frontend suite**

Run: `npm test` (from `frontend/`)
Expected: PASS, 0 failures. Fix any assertion mismatch rather than changing behavior.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/DashboardPage.jsx frontend/src/pages/admin/DashboardPage.test.jsx
git commit -m "feat(admin-dashboard): assemble Quick Actions into the dashboard page"
```

---

### Task 3: Full verification and manual screenshot comparison

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

Start both servers (or reuse already-running instances), log in as admin, navigate to `/admin`, and confirm: Recent Products and Quick Actions render side by side with matching heights on desktop; Quick Actions shows all four rows with correct icons/colors/labels; each row navigates to the correct route on click; no console errors.

- [ ] **Step 6: Write the completion note**

Summarize in the final report: what shipped (Quick Actions, static shortcuts to Product/Buying Guide/Comparison creation and Category management), confirmation that Latest Guides/System Alerts/footer/real Export Report remain out of scope for this phase, test/lint/build results (frontend + backend).

---

## Self-Review Notes

- **Spec coverage:** `QuickActionsCard` component with the exact four actions/routes/icons/colors (Task 1), two-column lower-grid layout (Task 2), full verification including manual click-through of all four routes (Task 3) — all covered.
- **Placeholder scan:** no TBD/TODO; every step has real, complete code.
- **Type consistency:** `QuickActionsCard` takes no props in both its Task 1 definition and its Task 2 call site (`<QuickActionsCard />`); the four `{ label, to, icon, colorClass }` entries in `ACTIONS` match the `.map()` destructuring immediately below them.
