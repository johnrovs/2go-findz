# Sidebar Navigation for Mobile & Tablet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Widen the existing slide-out mobile menu (`MobileMenu.jsx`) to also serve tablet widths, so only true desktop screens (≥1024px) show the horizontal top navbar.

**Architecture:** Pure breakpoint change — move the Tailwind cutover from `md` (768px) to `lg` (1024px) in the two places that decide which nav pattern renders. No new components, no visual/token changes to either existing pattern.

**Tech Stack:** React, Tailwind CSS, Vitest, React Testing Library.

## Global Constraints

- The horizontal navbar (`Navbar.jsx`'s inline `<nav>`) renders only at `lg:` (1024px) and up.
- The hamburger button and the `MobileMenu` slide-out panel it opens render below `lg:` (1024px) — i.e. on both phones and tablets.
- No change to nav items, active-link styling, the Compare badge, animation, or any other visual token in either component.
- No change to existing test assertions — `Navbar.test.jsx` and `MobileMenu.test.jsx` don't assert on breakpoint classes or viewport-dependent behavior (verified during planning).

---

### Task 1: Move the mobile/desktop nav cutover from `md` to `lg`

**Files:**
- Modify: `frontend/src/components/Navbar.jsx`
- Modify: `frontend/src/components/MobileMenu.jsx`

**Interfaces:** none — this is a self-contained, one-task change with no dependents.

No test changes — verified during planning that neither test file asserts on `md:`/`lg:` classes.

- [ ] **Step 1: Widen the horizontal nav's breakpoint in `Navbar.jsx`**

Change:

```jsx
          <nav aria-label="Main navigation" className="hidden items-center gap-6 md:flex">
```

to:

```jsx
          <nav aria-label="Main navigation" className="hidden items-center gap-6 lg:flex">
```

- [ ] **Step 2: Widen the hamburger button's breakpoint in `Navbar.jsx`**

Change:

```jsx
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            >
              <Menu size={20} />
            </button>
```

to:

```jsx
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={20} />
            </button>
```

- [ ] **Step 3: Widen the slide-out panel's breakpoint and reword its aria-labels in `MobileMenu.jsx`**

Change:

```jsx
  return (
    <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Mobile navigation">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        transition={{ type: 'tween', duration: 0.2 }}
        className="absolute inset-y-0 left-0 w-64 bg-white"
      >
        <nav aria-label="Mobile navigation" className="flex h-full flex-col px-3 py-6">
```

to:

```jsx
  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Site navigation">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        transition={{ type: 'tween', duration: 0.2 }}
        className="absolute inset-y-0 left-0 w-64 bg-white"
      >
        <nav aria-label="Site navigation" className="flex h-full flex-col px-3 py-6">
```

- [ ] **Step 4: Run the Navbar and MobileMenu tests**

Run: `npm test -- --run Navbar MobileMenu` (from `frontend/`)
Expected: PASS, all tests in both `Navbar.test.jsx` and `MobileMenu.test.jsx` (the `aria-label` rewording in Step 3 doesn't break anything since neither test file queries by that label's old text — verified during planning; if a test does fail on the label text, update the assertion to `'Site navigation'` to match).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Navbar.jsx frontend/src/components/MobileMenu.jsx
git commit -m "feat(nav): extend slide-out sidebar menu to cover tablet widths"
```

---

### Task 2: Full-suite verification and visual check

**Files:** none (verification only)

**Interfaces:** none — this task consumes the finished output of Task 1.

- [ ] **Step 1: Run the full test suite**

Run: `npm test -- --run` (from `frontend/`)
Expected: PASS, 314/314 (same count as before this change — no tests added or removed). If a single unrelated failure appears in the ComparisonDetailPage/CompareBar area, this is a known test-order-dependent flake seen in prior work on this project (not caused by this change) — re-run the suite once and confirm it passes clean before proceeding.

- [ ] **Step 2: Visual check with chrome-devtools MCP at three widths**

With the frontend dev server running (`npm run dev` from `frontend/`, if not already up), use the chrome-devtools MCP tools to:
- Resize the page to a phone width (e.g. 390×844) and navigate to `/`. Confirm only the logo, search icon, and hamburger show in the top bar; click the hamburger and confirm the slide-out sidebar opens with all nav links.
- Resize to a tablet width (e.g. 820×1180, matching the original screenshot's proportions) and reload. Confirm the top bar still shows only the logo/search/hamburger (not the horizontal link row), and that the hamburger still opens the same slide-out sidebar.
- Resize to a desktop width (e.g. 1440×900) and reload. Confirm the full horizontal nav link row renders inline in the top bar, and that the hamburger button is not present.

If anything looks visually wrong at any of the three widths, fix it before finishing.

- [ ] **Step 3: No commit needed**

This task is verification-only; nothing to commit unless Step 2 uncovers a fix, in which case commit that fix with an appropriate message before finishing.
