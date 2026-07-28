# Design System Foundations — Stage 1 of the UI/UX Redesign

## Context

This is Stage 1 of a 6-stage redesign of "2Go Findz" into a premium, editorial
shopping experience (Apple/Wirecutter-inspired), driven by a design spec the
user provided. The full redesign is too large for one implementation pass, so
it's split into stages, each with its own design → plan → build cycle:

1. **Design Foundations** (this doc) — fonts + Tailwind design tokens only.
2. Core UI Kit — `Button`/`Badge` components, restyle Navbar, Footer,
   `ProductCard`, `HeroSection`, `SectionHeading`, loading/empty/error
   states, Login page.
3. Public Pages — Homepage, Trending/Best Sellers/Categories, Comparisons
   list, Buying Guides typography.
4. Comparison Tables — `/compare` tool and the Comparisons detail page table.
5. Admin Dashboard — Sidebar, Topbar, DataTable, admin forms, dashboard
   analytics.
6. Micro-interactions & Accessibility Pass.

Two scope decisions were made before this doc, both driven by direct user
answers earlier in this session:

- **Product cards stay content-simplified.** The original spec's product-card
  section (badges, star rating, review count, price, pros/cons, Compare +
  Quick View + View on Amazon) conflicts with an explicit, already-shipped
  decision to strip `ProductCard` down to image, name, description, and a
  single "Check Price" button. Later stages restyle that simplified card with
  the new tokens — they do not add the removed fields back.
- **Star ratings and bookmarking are dropped entirely**, not just deferred to
  a later stage. No rating/review or bookmark data exists anywhere in the
  app, and backend changes are out of scope for this redesign, so these two
  spec items aren't buildable as real features here.

## Goal

Establish the fonts, colors, typography scale, border radius, shadows, and
layout tokens the rest of the redesign builds on. This stage changes no
component's markup or class list except for a single global font-family
default — it is pure design vocabulary, low-risk, and independently
verifiable before any visual component work begins.

## 1. Fonts

Add two font packages as npm dependencies (self-hosted, not Google's CDN — no
external runtime request, no font-swap flash, works offline):

- `@fontsource/space-grotesk` — weights 700, 800 (heading font)
- `@fontsource/inter` — weights 400, 500, 600 (body font)

Import both once in `frontend/src/main.jsx`:

```js
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/space-grotesk/800.css';
```

In `tailwind.config.js`, set the site-wide default sans font to Inter and add
a heading font token:

```js
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  heading: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
},
```

In `index.css`, add a base-layer rule so every existing heading element picks
up Space Grotesk immediately, without touching any component:

```css
@layer base {
  h1, h2, h3, h4, h5, h6 {
    font-family: theme(fontFamily.heading);
  }
}
```

This is the one visible change in this stage: all body text becomes Inter and
all heading elements become Space Grotesk, site-wide, immediately.

## 2. Colors

Add to `tailwind.config.js` `theme.extend.colors`:

```js
colors: {
  primary: { DEFAULT: '#2563EB', hover: '#1D4ED8' },
  amazon: { DEFAULT: '#FF9900', hover: '#E68A00' },
  surface: { DEFAULT: '#FFFFFF', secondary: '#F8FAFC' },
  border: '#E5E7EB',
  heading: '#111827',
  body: '#4B5563',
  'text-secondary': '#6B7280',
  muted: '#9CA3AF',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#0EA5E9',
  star: '#FACC15',
}
```

Additive only — existing `slate-*`/`indigo-*` utility classes throughout the
codebase are untouched and keep rendering exactly as they do today until a
later stage migrates a given component to the new tokens. `star` has no
consumer yet (no rating feature) but costs nothing to define.

## 3. Typography Scale

Defined as named component classes in `index.css` via `@layer components`, so
later stages apply the whole scale with a single className. Each entry is
mobile-first responsive and uses the spec's 160% line-height:

```css
@layer components {
  .text-hero            { @apply text-[36px] font-extrabold leading-[1.6] sm:text-[44px] lg:text-[56px]; }
  .text-page-heading    { @apply text-[32px] font-bold leading-[1.6] sm:text-[40px] lg:text-[48px]; }
  .text-section-heading { @apply text-[28px] font-bold leading-[1.6] sm:text-[34px] lg:text-[40px]; }
  .text-card-title      { @apply text-[20px] font-bold leading-[1.6] lg:text-[24px]; }
  .text-subtitle        { @apply text-[18px] font-medium leading-[1.6] lg:text-[20px]; }
  .text-body             { @apply text-[16px] font-normal leading-[1.6] lg:text-[18px]; }
  .text-small            { @apply text-[14px] font-normal leading-[1.6] lg:text-[15px]; }
  .text-btn               { @apply text-[16px] font-semibold leading-[1.6]; }
  .text-nav               { @apply text-[16px] font-medium leading-[1.6]; }
}
```

These classes carry size, weight, and line-height only — not font family or
color — so they compose cleanly with the base-layer heading-font rule from
Section 1 and the color tokens from Section 2.

## 4. Radius, Shadows & Layout

```js
// tailwind.config.js theme.extend
borderRadius: { btn: '12px', card: '18px', image: '18px', search: '16px' },
boxShadow: {
  card: '0 4px 20px rgba(0,0,0,0.06)',
  'card-hover': '0 10px 30px rgba(0,0,0,0.10)',
  navbar: '0 1px 6px rgba(0,0,0,0.05)',
  dropdown: '0 20px 50px rgba(0,0,0,0.08)',
},
maxWidth: { content: '1280px', reading: '720px' },
```

Badges use Tailwind's existing `rounded-full` (already 9999px) — no new
token needed.

Container padding (16/24/32px) and the spec's vertical rhythm (96px section
spacing, 24px card gap, 32px grid gap) require **no config changes** — they
already map exactly onto Tailwind's default scale (`px-4 sm:px-6 lg:px-8`,
`py-24`, `gap-6`, `gap-8`), which the codebase already uses consistently
throughout. This stage documents these as the conventions later stages must
apply; it does not touch any page's markup.

## Testing / Verification

This stage has no new component logic to unit test. Verification is:

1. Full frontend suite (`npm test -- --run`) still passes unchanged — no
   existing test asserts on font-family, so none should break.
2. Lint and production build both stay clean.
3. Live smoke check: confirm the two font files actually load (Network tab
   or computed-style check), confirm a heading element's computed
   `font-family` is Space Grotesk and a body element's is Inter, and
   visually confirm no layout breakage from the font-family swap (Space
   Grotesk and Inter have different metrics than the previous default sans
   stack, so headings may reflow slightly — expected and acceptable at this
   stage).

## Out of Scope for This Stage

- No component markup or className changes (other than the automatic
  heading-font base-layer effect).
- No admin-specific work yet (tokens apply globally via Tailwind, but
  dedicated admin restyling is Stage 5).
- No animation work (Stage 6).
- No comparison-table or buying-guide structural changes (Stages 3–4).
