# Admin Navy Sidebar & Purple Primary Reskin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the admin section a navy sidebar and purple primary accent (matching upcoming Buying Guide editor mockups) without touching the public storefront's blue branding or any individual admin page's component code.

**Architecture:** Convert the `primary` Tailwind color token from a static hex value to a CSS-variable-with-opacity pattern; define the blue values at `:root` (public default) and override them to purple inside a new `.admin-scope` class applied once on `AdminLayout`'s root element. Every existing `bg-primary`/`text-primary`/etc. usage across the admin section automatically becomes purple via the cascade — no other admin page file needs editing. The sidebar's navy background is a direct, literal color change on `AdminSidebar.jsx` alone (unrelated to the `primary` token, since only the sidebar itself goes dark).

**Tech Stack:** React, Vite, Tailwind CSS — no new dependencies.

Reference: `docs/superpowers/specs/2026-08-01-admin-navy-purple-reskin-design.md` (approved design).

## Global Constraints

- Admin-only scope — the public storefront's `primary` token stays blue `#2563EB`/`#1D4ED8`; only content inside `.admin-scope` sees purple.
- Purple values: `--color-primary-rgb: 124 58 237` (`#7C3AED`, violet-600), `--color-primary-hover-rgb: 109 40 217` (`#6D28D9`, violet-700).
- Sidebar navy: `#0F172A` (slate-900) background, `#1E293B` (slate-800) for hover/active-adjacent states — a literal class change on `AdminSidebar.jsx`, not a CSS variable.
- No sidebar nav restructure — keep the existing 6 flat nav items (Dashboard, Products, Product Categories, Buying Guides, Comparisons, System Settings) exactly as they are; no new routes, no grouped sections, no user-profile footer card.
- No new automated tests — this is a pure color/positioning change. `AdminLayout.test.jsx` (the only existing test touching these files) asserts on behavior and text content, not styling, so it must keep passing unmodified. Verification is running that existing suite plus a manual visual check.
- `src/assets/2gofindz.png` has no alpha channel (opaque white square canvas around a circular badge) — do not treat it as already transparent; clip it with `rounded-full object-cover` rather than editing the image asset.

---

### Task 1: Admin-scoped color tokens, sidebar navy, sticky topbar

**Files:**
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/layouts/AdminLayout.jsx`
- Modify: `frontend/src/components/AdminSidebar.jsx`
- Modify: `frontend/src/components/AdminTopbar.jsx`

**Interfaces:**
- Consumes: nothing new — this task only changes existing files' internals.
- Produces: the `.admin-scope` class and `--color-primary-rgb`/`--color-primary-hover-rgb` CSS variables that any future admin page (including the Stage 2 Buying Guide editor, the next sub-project) can rely on automatically just by rendering inside `AdminLayout` — no further setup needed by later work.

- [ ] **Step 1: Confirm the frontend test baseline is currently green**

Run: `cd frontend && npm test -- --run`
Expected: PASS (all existing tests, including `AdminLayout.test.jsx`) — this establishes the baseline this task must not break.

- [ ] **Step 2: Convert `primary` to the CSS-variable pattern in `tailwind.config.js`**

In `frontend/tailwind.config.js`, change:

```js
        primary: { DEFAULT: '#2563EB', hover: '#1D4ED8' },
```

to:

```js
        primary: {
          DEFAULT: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
          hover: 'rgb(var(--color-primary-hover-rgb) / <alpha-value>)',
        },
```

Every other color entry (`amazon`, `surface`, `border`, `heading`, `body`, `text-secondary`, `muted`, `success`, `warning`, `danger`, `info`, `star`) is unchanged.

- [ ] **Step 3: Define the `:root` default and `.admin-scope` override in `index.css`**

In `frontend/src/index.css`, change:

```css
@layer base {
  h1, h2, h3, h4, h5, h6 {
    font-family: theme(fontFamily.heading);
  }
}
```

to:

```css
@layer base {
  :root {
    --color-primary-rgb: 37 99 235;
    --color-primary-hover-rgb: 29 78 216;
  }

  .admin-scope {
    --color-primary-rgb: 124 58 237;
    --color-primary-hover-rgb: 109 40 217;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: theme(fontFamily.heading);
  }
}
```

- [ ] **Step 4: Apply `.admin-scope` to `AdminLayout.jsx`'s root element**

In `frontend/src/layouts/AdminLayout.jsx`, change:

```jsx
    <div className="flex min-h-screen bg-surface-secondary">
```

to:

```jsx
    <div className="admin-scope flex min-h-screen bg-surface-secondary">
```

- [ ] **Step 5: Verify the public storefront still renders blue and the color variables compile**

Run: `cd frontend && npm run build`
Expected: BUILD SUCCESS — confirms the Tailwind config change and new CSS are syntactically valid and produce a working production bundle before moving on to the component-level changes.

- [ ] **Step 6: Recolor `AdminSidebar.jsx` for the navy background**

In `frontend/src/components/AdminSidebar.jsx`, change the root `<nav>`'s className from:

```jsx
    <nav aria-label="Main navigation" className="flex h-full flex-col border-r border-slate-200 bg-white px-3 py-6">
```

to:

```jsx
    <nav aria-label="Main navigation" className="flex h-full flex-col bg-[#0F172A] px-3 py-6">
```

(The `border-r border-slate-200` is dropped — against a light `bg-surface-secondary` main area, the navy-vs-light color contrast itself is the visual boundary; a light gray border on a dark surface would look like a stray line, not a clean edge.)

- [ ] **Step 7: Clip the logo to a circle**

In the same file, change:

```jsx
        <img src={logo} alt="2Go Findz" className="h-10 w-10" />
```

to:

```jsx
        <img src={logo} alt="2Go Findz" className="h-10 w-10 rounded-full object-cover" />
```

- [ ] **Step 8: Recolor nav item text/hover states for the dark sidebar**

In the same file, change the `NavLink` className function from:

```jsx
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-primary/10 text-primary' : 'text-body hover:bg-slate-100'
                }`
              }
```

to:

```jsx
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-gradient-to-r from-primary to-indigo-500 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-[#1E293B]'
                }`
              }
```

- [ ] **Step 9: Recolor the logout button to match**

In the same file, change:

```jsx
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-body hover:bg-slate-100"
```

to:

```jsx
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-[#1E293B]"
```

- [ ] **Step 10: Make `AdminTopbar.jsx` sticky**

In `frontend/src/components/AdminTopbar.jsx`, change:

```jsx
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-navbar md:px-6">
```

to:

```jsx
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-navbar md:px-6">
```

(`z-30` keeps the topbar above ordinary scrolled content but below the mobile sidebar drawer overlay, which is `z-40` in `AdminSidebar.jsx` — the existing drawer-over-topbar stacking order is preserved.)

- [ ] **Step 11: Run the existing test suite to confirm nothing broke**

Run: `cd frontend && npm test -- --run`
Expected: PASS — `AdminLayout.test.jsx` asserts on nav text, drawer open/close, and profile name, none of which this task changed; it should pass unmodified.

- [ ] **Step 12: Manual visual verification**

Using the `run` skill (or `npm run dev` directly) with the backend also running, navigate to `/admin` and confirm:
- Sidebar renders with a navy (`#0F172A`) background, logo shows as a clean circle (no white square around it)
- The active nav item (whichever page you're on) shows a purple-to-indigo gradient pill with white text; inactive items show light gray text that's clearly readable against navy
- Hovering an inactive nav item shows a subtle lighter-navy (`#1E293B`) highlight
- Scrolling a long admin page (e.g. `/admin/products` with enough rows, or any form page) keeps the topbar pinned at the top
- Opening the mobile sidebar drawer (narrow viewport) still works and shows the same navy styling
- Navigate to the public storefront (`/`) and confirm buttons/links are still the original blue, not purple

If anything looks wrong, fix it before finishing this task — this is the final check.

- [ ] **Step 13: Commit**

```bash
git add frontend/tailwind.config.js \
        frontend/src/index.css \
        frontend/src/layouts/AdminLayout.jsx \
        frontend/src/components/AdminSidebar.jsx \
        frontend/src/components/AdminTopbar.jsx
git commit -m "feat(admin): reskin sidebar navy and primary accent purple, admin-scoped"
```

---

## Plan Self-Review

**Spec coverage:** every section of `docs/superpowers/specs/2026-08-01-admin-navy-purple-reskin-design.md` maps to a step — the CSS-variable architecture (Steps 2–4), color values (Steps 2–3, 6, 8–9), sidebar changes (Steps 6–9), logo clipping (Step 7), sticky topbar (Step 10), and the "out of scope" list (no nav restructure, no public-site changes, no new tests) is respected throughout rather than just noted.

**Placeholder scan:** no TBD/TODO; every step has exact before/after code or an exact command.

**Type consistency:** `--color-primary-rgb`/`--color-primary-hover-rgb` variable names match exactly between `tailwind.config.js` (Step 2) and `index.css` (Step 3) — a mismatch here would silently fall back to transparent/black rather than erroring, so this was checked carefully. `.admin-scope` is applied in exactly one place (Step 4) and referenced by nothing else, matching the spec's single-application design.

**Known deferred follow-up:** the Buying Guide multi-step editor (Stage 2, the next sub-project) is what actually exercises this reskin — nothing in that page exists yet, so there's no way to visually verify the *editor's own* purple stepper/buttons until that page is built. Step 12's visual check is scoped to what exists today (sidebar, topbar, existing admin pages, public storefront).
