# Admin Navy Sidebar & Purple Primary Reskin

## Context

Reference mockups for the upcoming Buying Guide multi-step admin editor (Stage 2)
show a dark navy sidebar and purple primary accent, distinct from this app's
current admin look (white sidebar, blue `#2563EB` primary — the same token the
public storefront uses). Building the new editor page directly against
mismatched branding would mean either fighting the existing tokens page-by-page
or reskinning later and re-touching that page anyway.

This is the second of three sequenced sub-projects for the Buying Guide editor
work (backend TOC model, done → **this: admin design-system reskin** → Buying
Guide multi-step editor page, next). It exists purely so the editor page can be
built once, against final branding.

**Explicitly scoped to admin only.** The public storefront keeps its current
blue `primary` token untouched — confirmed with the user, since `primary` is
shared app-wide today and a global swap would silently change every public
page's buttons/links/accents, which nothing asked for.

**Explicitly excludes a sidebar nav restructure.** The reference mockups show
a much larger nav (grouped sections, items for pages — Reviews, Traffic,
Clicks, Commissions, Reports, Users, Integrations — that don't exist in this
app yet, plus a user-profile footer card). Confirmed with the user: this pass
only recolors the existing 6-item flat nav (Dashboard, Products, Product
Categories, Buying Guides, Comparisons, System Settings). No new routes, no
placeholder pages, no footer card.

## Architecture: CSS-variable scoping, not a parallel token

**The constraint driving this:** dozens of existing admin components already
use `bg-primary`/`text-primary`/`border-primary`/`ring-primary` classes
(buttons, focus rings, badges, the stepper pattern `ComparisonForm.jsx` will
reuse for the new editor). Adding a *second*, differently-named color token
(e.g. `adminPrimary`) would require manually sweeping and renaming classes
across every admin file that touches `primary` today — large, and each missed
spot is a silent visual bug.

**The fix:** convert `primary` in `tailwind.config.js` from a static hex
value to Tailwind's CSS-variable-with-opacity pattern, define the blue values
as the global `:root` default (so the public site is unaffected), and add one
new `.admin-scope` class — applied once, on `AdminLayout`'s root element —
that overrides those same variables to purple. Every existing `bg-primary`
usage anywhere under that root automatically becomes purple; nothing else
changes. This is the standard CSS-variable theming pattern for Tailwind and
needs zero changes to any admin page beyond the layout shell itself.

The sidebar's navy background is unrelated to `primary` (the topbar and main
content area stay light — only the sidebar itself goes dark, per every
reference screenshot), so that's a direct, literal background-color change
on `AdminSidebar.jsx` alone — no variable scoping needed for it.

## Color Values

Proposed (confirmed with the user — not pixel-sampled from the reference
image, chosen as representative modern-admin-dashboard values):

| Token | Current (public, unchanged) | Admin override |
|---|---|---|
| `--color-primary-rgb` | `37 99 235` (`#2563EB`) | `124 58 237` (`#7C3AED`, violet-600) |
| `--color-primary-hover-rgb` | `29 78 216` (`#1D4ED8`) | `109 40 217` (`#6D28D9`, violet-700) |

Sidebar navy (new, admin-only, not a variable): `#0F172A` (slate-900)
background, `#1E293B` (slate-800) for hover/rest-item backgrounds.

## `tailwind.config.js` changes

```js
// before
primary: { DEFAULT: '#2563EB', hover: '#1D4ED8' },

// after
primary: {
  DEFAULT: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
  hover: 'rgb(var(--color-primary-hover-rgb) / <alpha-value>)',
},
```

Every other color entry (`amazon`, `surface`, `border`, `heading`, `body`,
`text-secondary`, `muted`, `success`, `warning`, `danger`, `info`, `star`)
is untouched — only `primary` moves to the variable pattern, since it's the
only one that needs a different value in a different scope.

## `index.css` changes

Add to the existing `@layer base` block (alongside the current heading-font
rule):

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

Any admin component using an opacity modifier (e.g. the current active-nav
`bg-primary/10`) keeps working unchanged — Tailwind's `<alpha-value>`
placeholder is exactly the mechanism that makes CSS-variable colors and
opacity modifiers compose correctly.

## `AdminLayout.jsx` change

One class added to the existing root `<div>`:

```jsx
// before
<div className="flex min-h-screen bg-surface-secondary">

// after
<div className="admin-scope flex min-h-screen bg-surface-secondary">
```

This single line is what scopes every purple override to the entire admin
section — no other page or component needs touching for the color cascade
to take effect.

## `AdminSidebar.jsx` changes

- Root `<nav>`: `bg-white border-r border-slate-200` → `bg-[#0F172A]` (no
  right border needed against a dark surface next to a light main area —
  the color contrast itself is the boundary).
- Inactive nav item text: `text-body` (dark gray, illegible on navy) →
  `text-slate-300`; hover state `hover:bg-slate-100` (light) →
  `hover:bg-[#1E293B]` (slate-800, one step lighter than the sidebar itself).
- Active nav item: currently `bg-primary/10 text-primary` (a light tint,
  designed for a white background). On navy this needs a solid, high-contrast
  treatment. Matching the reference's pill highlight and the original ask
  for a "purple gradient": `bg-gradient-to-r from-primary to-indigo-500
  text-white shadow-sm`. Because `primary` now resolves to violet-600 inside
  `.admin-scope`, this gradient automatically tracks the admin palette rather
  than hardcoding a second color pair.
- Logout button text/hover: same `text-slate-300` / `hover:bg-[#1E293B]`
  treatment as inactive nav items, for consistency.
- Logo: `src/assets/2gofindz.png` is a circular badge on an **opaque white
  square canvas** (verified — the PNG has no alpha channel), not a
  transparent mark. Placed as-is on navy, the square's white corners would
  show as an ugly box around the circle. The circular badge already nearly
  fills the square frame edge-to-edge, so clipping the rendered `<img>` to a
  circle crops away that margin without any image-editing work: add
  `rounded-full object-cover` to the existing `<img>` classes (currently
  just `h-10 w-10`). No new asset needed.

## `AdminTopbar.jsx` change

Add sticky positioning, confirmed in scope by the user (currently the topbar
scrolls away with page content on long forms — every reference mockup shows
it pinned):

```jsx
// before
<header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-navbar md:px-6">

// after
<header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-navbar md:px-6">
```

`z-30` keeps it above ordinary page content but below the mobile sidebar
drawer overlay (`z-40` in `AdminSidebar.jsx`), so the existing drawer-over-
topbar stacking order is preserved.

## Explicitly Out of Scope

- Public storefront colors (homepage, product cards, category pages, etc.) —
  untouched, still blue `#2563EB`
- Sidebar nav restructure — grouped sections, new nav items for
  Reviews/Traffic/Clicks/Commissions/Reports/Users/Integrations, user-profile
  footer card — none of those pages exist yet; adding links now would 404
- Any individual admin page's own component logic — every existing admin
  page's buttons/badges/focus-rings pick up purple automatically via the
  CSS-variable cascade; no page-level file needs editing
- The Buying Guide multi-step editor itself (Stage 2, next sub-project) —
  this reskin only prepares the shell it will render inside

## Testing

`AdminLayout.test.jsx` (the only existing test touching these three files)
asserts on nav link text, drawer open/close behavior, and the profile name —
no styling/class assertions — so it's expected to keep passing unmodified.
No new automated tests are warranted for a pure color/positioning change;
verification is a manual visual check (navigate `/admin/*`, confirm sidebar
is navy with a purple-gradient active item, confirm topbar stays visible
while scrolling a long page, confirm the public storefront is still blue).
