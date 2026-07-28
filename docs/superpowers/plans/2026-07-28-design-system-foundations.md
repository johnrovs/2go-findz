# Design System Stage 1: Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the fonts, colors, typography scale, border radius, shadows, and layout tokens the rest of the 6-stage UI/UX redesign builds on, without changing any component's markup or class list (aside from one intentional global heading-font effect).

**Architecture:** Two self-hosted Google Fonts (Space Grotesk, Inter) imported once in `main.jsx`; Tailwind config extended with named color/radius/shadow/maxWidth tokens; a named typography-scale class set added to `index.css` via `@layer components`; a base-layer rule makes all `h1`–`h6` elements pick up the heading font automatically.

**Tech Stack:** React 18, Vite 5, Tailwind CSS 3.4, `@fontsource/inter`, `@fontsource/space-grotesk`.

## Global Constraints

- No component markup, JSX, or className changes in this stage, except the automatic base-layer heading-font effect (spec section 1).
- Fonts must be self-hosted via `@fontsource` npm packages, not a Google Fonts CDN `<link>` (spec section 1).
- Typography scale must use 160% line-height (`leading-[1.6]`) on every entry (spec section 3).
- Typography scale must be mobile-first responsive — no fixed desktop-only sizes (spec section 3).
- Color, radius, and shadow values must match the spec's hex/px/rgba values exactly (spec sections 2 and 4).
- Container padding and section/card/grid spacing require no config changes — Tailwind's default scale (`px-4 sm:px-6 lg:px-8`, `py-24`, `gap-6`, `gap-8`) already matches the spec; do not add redundant tokens for these (spec section 4).
- No admin-specific work, no animation work, no comparison-table or buying-guide changes — those are later stages (spec "Out of Scope for This Stage").

---

### Task 1: Install and wire up fonts

**Files:**
- Modify: `frontend/package.json` (via `npm install`)
- Modify: `frontend/src/main.jsx`
- Modify: `frontend/tailwind.config.js`
- Modify: `frontend/src/index.css`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: Tailwind `fontFamily.sans` = Inter (site-wide default), `fontFamily.heading` = Space Grotesk (available as `font-heading` utility for later stages); every existing `h1`–`h6` element renders in Space Grotesk automatically via a base-layer rule.

- [ ] **Step 1: Install the font packages**

Run: `cd frontend && npm install @fontsource/inter @fontsource/space-grotesk`

Expected: both packages added to `frontend/package.json` dependencies and `frontend/package-lock.json`.

- [ ] **Step 2: Import the font weights in `main.jsx`**

Add these four lines to `frontend/src/main.jsx`, after the existing `import './index.css';` line:

```js
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/space-grotesk/800.css';
```

The full file should read:

```js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/space-grotesk/800.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 3: Add the font family tokens to `tailwind.config.js`**

`frontend/tailwind.config.js` currently reads:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

Change the `theme.extend` block to:

```js
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
    },
  },
```

- [ ] **Step 4: Add the base-layer heading-font rule to `index.css`**

`frontend/src/index.css` currently reads:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Change it to:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  h1, h2, h3, h4, h5, h6 {
    font-family: theme(fontFamily.heading);
  }
}
```

- [ ] **Step 5: Build and confirm both fonts are wired up**

Run: `npm run build`

Expected: build succeeds with no new errors or warnings beyond the pre-existing chunk-size warning.

Run: `grep -c "Space Grotesk" dist/assets/*.css` and `grep -c "Inter" dist/assets/*.css`

Expected: both commands return a non-zero count, confirming both font-family declarations made it into the compiled CSS.

- [ ] **Step 6: Run the full frontend test suite**

Run: `npm test -- --run`

Expected: same pass count as before this task (no test asserts on font-family; nothing should break).

- [ ] **Step 7: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/package.json frontend/package-lock.json frontend/src/main.jsx frontend/tailwind.config.js frontend/src/index.css
git commit -m "feat(design-system): add self-hosted Inter and Space Grotesk fonts"
```

---

### Task 2: Add color tokens

**Files:**
- Modify: `frontend/tailwind.config.js`

**Interfaces:**
- Consumes: the `theme.extend` block from Task 1 (adds a sibling `colors` key to the same object — do not remove the `fontFamily` key Task 1 added).
- Produces: Tailwind utility classes `bg-primary`, `bg-primary-hover`, `text-primary`, `bg-amazon`, `bg-amazon-hover`, `bg-surface`, `bg-surface-secondary`, `border-border`, `text-heading`, `text-body`, `text-text-secondary`, `text-muted`, `bg-success`/`text-success`, `bg-warning`/`text-warning`, `bg-danger`/`text-danger`, `bg-info`/`text-info`, `bg-star`/`text-star` (and their `border-*`/etc. variants, since Tailwind generates all utilities for every color token automatically).

- [ ] **Step 1: Add the `colors` key to `theme.extend`**

After Task 1, `frontend/tailwind.config.js`'s `theme.extend` block reads:

```js
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
    },
  },
```

Change it to:

```js
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
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
      },
    },
  },
```

- [ ] **Step 2: Temporary smoke-check that the tokens are usable, then revert it**

Tailwind only emits CSS for utility classes it finds referenced in `content` files, so an unused color token produces no output in a plain build — checking the compiled CSS directly isn't meaningful yet. Confirm the tokens are wired up correctly instead by temporarily adding `className="bg-primary"` to the root `<div>` in `frontend/src/App.jsx`, running `npm run build`, confirming `grep -o "#2563eb" dist/assets/*.css` matches (Tailwind lowercases hex values in output), then reverting the temporary className change (`git checkout frontend/src/App.jsx`) before committing this task.

- [ ] **Step 3: Run the full frontend test suite**

Run: `npm test -- --run`

Expected: same pass count as before this task.

- [ ] **Step 4: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/tailwind.config.js
git commit -m "feat(design-system): add color tokens to Tailwind config"
```

---

### Task 3: Add the typography scale

**Files:**
- Modify: `frontend/src/index.css`

**Interfaces:**
- Consumes: nothing new (pure CSS, independent of Tasks 1–2's Tailwind config additions).
- Produces: nine reusable classes for later stages to apply directly: `.text-hero`, `.text-page-heading`, `.text-section-heading`, `.text-card-title`, `.text-subtitle`, `.text-body`, `.text-small`, `.text-btn`, `.text-nav`. None of these set color or font-family — they compose with the color tokens from Task 2 and the base-layer heading-font rule from Task 1.

- [ ] **Step 1: Add the `@layer components` block to `index.css`**

After Task 1, `frontend/src/index.css` reads:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  h1, h2, h3, h4, h5, h6 {
    font-family: theme(fontFamily.heading);
  }
}
```

Append this block at the end of the file:

```css

@layer components {
  .text-hero {
    @apply text-[36px] font-extrabold leading-[1.6] sm:text-[44px] lg:text-[56px];
  }
  .text-page-heading {
    @apply text-[32px] font-bold leading-[1.6] sm:text-[40px] lg:text-[48px];
  }
  .text-section-heading {
    @apply text-[28px] font-bold leading-[1.6] sm:text-[34px] lg:text-[40px];
  }
  .text-card-title {
    @apply text-[20px] font-bold leading-[1.6] lg:text-[24px];
  }
  .text-subtitle {
    @apply text-[18px] font-medium leading-[1.6] lg:text-[20px];
  }
  .text-body {
    @apply text-[16px] font-normal leading-[1.6] lg:text-[18px];
  }
  .text-small {
    @apply text-[14px] font-normal leading-[1.6] lg:text-[15px];
  }
  .text-btn {
    @apply text-[16px] font-semibold leading-[1.6];
  }
  .text-nav {
    @apply text-[16px] font-medium leading-[1.6];
  }
}
```

- [ ] **Step 2: Build and confirm the classes compiled**

Run: `npm run build`

Expected: build succeeds. `@layer components` classes are always emitted regardless of whether they're referenced elsewhere (unlike Task 2's color utilities), because they're written directly as CSS rules, not generated from the `content` scan.

Run: `grep -c "text-hero" dist/assets/*.css`

Expected: non-zero count.

- [ ] **Step 3: Run the full frontend test suite**

Run: `npm test -- --run`

Expected: same pass count as before this task.

- [ ] **Step 4: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/index.css
git commit -m "feat(design-system): add typography scale utility classes"
```

---

### Task 4: Add radius, shadow, and layout tokens

**Files:**
- Modify: `frontend/tailwind.config.js`

**Interfaces:**
- Consumes: the `theme.extend` block from Tasks 1–2 (adds sibling `borderRadius`, `boxShadow`, and `maxWidth` keys — do not remove `fontFamily` or `colors`).
- Produces: Tailwind utility classes `rounded-btn`, `rounded-card`, `rounded-image`, `rounded-search`, `shadow-card`, `shadow-card-hover`, `shadow-navbar`, `shadow-dropdown`, `max-w-content`, `max-w-reading`.

- [ ] **Step 1: Add `borderRadius`, `boxShadow`, and `maxWidth` to `theme.extend`**

After Task 2, `frontend/tailwind.config.js`'s `theme.extend` block ends with the `colors` key closing (`},`) before the final `},` that closes `extend`. Insert the three new keys as siblings of `colors`, so the full `theme` block reads:

```js
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
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
      },
      borderRadius: {
        btn: '12px',
        card: '18px',
        image: '18px',
        search: '16px',
      },
      boxShadow: {
        card: '0 4px 20px rgba(0,0,0,0.06)',
        'card-hover': '0 10px 30px rgba(0,0,0,0.10)',
        navbar: '0 1px 6px rgba(0,0,0,0.05)',
        dropdown: '0 20px 50px rgba(0,0,0,0.08)',
      },
      maxWidth: {
        content: '1280px',
        reading: '720px',
      },
    },
  },
```

- [ ] **Step 2: Temporary smoke-check that the tokens are usable, then revert it**

Same reasoning as Task 2 Step 3 — these are utility-generating tokens, only emitted when referenced. Temporarily add `className="rounded-card shadow-card max-w-content"` to the root `<div>` in `frontend/src/App.jsx`, run `npm run build`, confirm all three of these succeed:

- `grep -c "border-radius: 18px" dist/assets/*.css` → non-zero
- `grep -c "0 4px 20px rgba(0,0,0,0.06)" dist/assets/*.css` → non-zero
- `grep -c "max-width: 1280px" dist/assets/*.css` → non-zero

Then revert the temporary className change: `git checkout frontend/src/App.jsx`.

- [ ] **Step 3: Run the full frontend test suite**

Run: `npm test -- --run`

Expected: same pass count as before this task.

- [ ] **Step 4: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/tailwind.config.js
git commit -m "feat(design-system): add border radius, shadow, and layout tokens"
```

---

### Task 5: Final verification

**Files:** none (verification only).

**Interfaces:**
- Consumes: everything from Tasks 1–4.
- Produces: nothing for later tasks — this is the stage's closing gate. Stage 2 (Core UI Kit) starts from the tokens this task confirms are working.

- [ ] **Step 1: Run the full frontend test suite**

Run: `cd frontend && npm test -- --run`

Expected: all tests pass, same count as before Stage 1 began.

- [ ] **Step 2: Lint**

Run: `npm run lint`

Expected: no errors or warnings.

- [ ] **Step 3: Production build**

Run: `npm run build`

Expected: succeeds (pre-existing chunk-size warning only, unrelated to this stage).

- [ ] **Step 4: Live smoke check**

Start (or confirm already running) the frontend dev server (`npm run dev`) and backend, then in a browser:

1. Open the homepage. Confirm no visual breakage (some heading reflow from the new font metrics is expected and fine; broken layout, overlapping text, or missing content is not).
2. Open browser devtools, select a heading element (e.g. the hero `<h1>`), and check its computed `font-family` — expect `"Space Grotesk"` first in the stack.
3. Select a body text element (e.g. a paragraph) and check its computed `font-family` — expect `Inter` first in the stack.
4. Open the Network tab, reload, and confirm the Space Grotesk and Inter woff2 files load from the app's own origin (not `fonts.googleapis.com` or `fonts.gstatic.com`) — confirms self-hosting worked.

- [ ] **Step 5: Report results**

If all checks pass, this stage is complete — no further commit needed (Tasks 1–4 already committed their own work). If the smoke check surfaces a real bug, fix it, re-run Steps 1–3, and commit the fix with an appropriate message before considering the stage done.

---

This closes out Stage 1 of the 6-stage UI/UX redesign (Design Foundations). Stage 2 (Core UI Kit) builds the reusable `Button`/`Badge` components and restyles the highest-visibility shared components using the tokens established here.
