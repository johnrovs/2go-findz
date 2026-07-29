# Sidebar Navigation for Mobile & Tablet

## Context

The public site's `Navbar.jsx` shows a horizontal link row (Home,
Trending, Best Sellers, Categories, Compare, Buying Guides,
Comparisons) at `md:` (768px) and up, and a hamburger button that
opens `MobileMenu.jsx` — a left-docked slide-out panel with the same
links in a vertical list — below `md`. Tablet widths (≥768px) already
fall into the horizontal-navbar branch today, which is what a shared
tablet-viewport screenshot showed.

The ask: tablet should get the same slide-out sidebar treatment as
phones, not the horizontal navbar. `MobileMenu.jsx` already **is** a
sidebar (left-docked, dimmed backdrop, vertical `NavLink` list,
Compare badge) — no new component is needed, only widening which
viewports use it.

## Change

Move the cutover point from Tailwind's `md` breakpoint (768px) to
`lg` (1024px), the codebase's existing "true desktop" boundary (used
elsewhere in `Navbar.jsx`'s own responsive padding, `sm:px-6 lg:px-8`):

- **`Navbar.jsx`**: horizontal nav `<nav className="hidden items-center gap-6 md:flex">`
  → `hidden items-center gap-6 lg:flex`. Hamburger button
  `className="... md:hidden"` → `... lg:hidden`.
- **`MobileMenu.jsx`**: wrapper `className="fixed inset-0 z-40 md:hidden"`
  → `fixed inset-0 z-40 lg:hidden`. Both `aria-label="Mobile navigation"`
  occurrences (the dialog wrapper and the inner `<nav>`) reworded to
  `"Site navigation"`, since the panel is no longer phone-only.

Result: below 1024px (phones and tablets) the top bar shows only the
logo, search icon, and hamburger, and tapping the hamburger opens the
existing slide-out sidebar. At 1024px and up, the horizontal link row
renders inline exactly as it does today. No other behavior changes —
same nav items, same active-link styling, same Compare badge count,
same animation.

## Out of Scope

- The search icon next to the hamburger, and its pre-existing overlap
  with `MobileMenu`'s own internal "Search" link — both already exist
  today below 768px and are unrelated to this change.
- Any visual/token change to the panel itself (colors, width,
  spacing, slide animation) — only the breakpoint at which it's used
  changes.
- Renaming `MobileMenu.jsx` — kept as-is to minimize risk; it now
  also serves tablet, but a rename is a separate, non-functional
  refactor not requested here.

## Testing

`Navbar.test.jsx` and `MobileMenu.test.jsx` were checked during
planning: neither asserts on breakpoint classes (`md:`/`lg:`) or
viewport-dependent behavior — jsdom doesn't evaluate CSS media
queries, so both variants always exist in the DOM and are toggled
visually via Tailwind classes. No test changes are needed for the
breakpoint swap itself.
