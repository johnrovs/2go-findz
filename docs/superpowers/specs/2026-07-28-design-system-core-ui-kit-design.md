# Design System Stage 2: Core UI Kit

## Context

This is Stage 2 of the 6-stage UI/UX redesign of "2Go Findz". Stage 1
(Design Foundations — fonts, color tokens, typography scale, radius/shadow/
layout tokens) is complete and pushed. This stage builds two new reusable
components (`Button`, `Badge`) using the Stage 1 tokens, then applies them —
along with the typography scale and color tokens directly — to the
highest-visibility shared components:

- Navbar
- Footer
- HeroSection
- SectionHeading
- ProductCard (visual restyle only)
- LoadingSpinner, EmptyState, ErrorState
- LoginPage

**Explicitly out of scope:** every other page's buttons and cards (admin
forms, the `/compare` tool, Comparisons and Buying Guides pages/CTAs). Those
migrate to the new Button/Badge components when their own stage (3: Public
Pages, 4: Comparison Tables, 5: Admin Dashboard) does that page's work. This
keeps each stage's diff reviewable and avoids a single stage touching the
entire codebase.

**Two decisions carried over from this session's earlier work, both
non-negotiable for this stage:**

- `ProductCard`'s content stays exactly as already shipped — image, name,
  description, one CTA button. This stage changes its *styling* only
  (radius, shadow, typography classes, swapping the ad-hoc CTA markup for
  `<Button variant="amazon">`). It does not add back category labels,
  badges, star ratings, review counts, price, or pros/cons.
- The "Check Price" button uses the **Amazon-orange** variant, not primary
  blue — it's still functionally an Amazon affiliate link regardless of its
  label, and the spec's orange-reservation rule exists specifically to make
  that highest-intent action stand out.

## 1. Button Component

New file: `frontend/src/components/Button.jsx`.

A single polymorphic component — renders `<a>` when given an `href` prop,
`<button>` otherwise — so one component covers both real actions (form
submits, `onClick` handlers) and link-styled CTAs (external Amazon links
needing `target`/`rel`).

```jsx
function Button({ variant = 'primary', size = 'md', href, className = '', children, ...rest }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-btn text-btn transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

  const variants = {
    primary: 'bg-primary text-white shadow-card hover:bg-primary-hover',
    secondary: 'bg-white text-primary border border-primary hover:bg-primary/5',
    amazon: 'bg-amazon text-[#111827] shadow-card hover:bg-amazon-hover',
  };

  const sizes = {
    md: 'px-[28px] py-4', // 16px 28px per spec
    sm: 'px-4 py-2',
  };

  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}

export default Button;
```

**Interface:**
- `variant`: `'primary' | 'secondary' | 'amazon'`, default `'primary'`.
- `size`: `'md' | 'sm'`, default `'md'`.
- `href`: when present, renders as `<a>`; all other props (`target`, `rel`,
  `onClick`, `type`, `disabled`, `aria-*`, etc.) pass straight through via
  `...rest` either way.
- `className`: merged after the variant/size classes so callers can extend
  (e.g. `w-full` on LoginPage's submit button).

Consumers this stage: HeroSection (primary + secondary), ProductCard
(amazon), ErrorState (secondary, small), LoginPage (primary).

## 2. Badge Component

New file: `frontend/src/components/Badge.jsx`.

```jsx
function Badge({ children }) {
  return (
    <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-small text-white">
      {children}
    </span>
  );
}

export default Badge;
```

Intentionally minimal — no color-variant props. Its only consumer this
stage is the numeric compare-count pill, currently duplicated inline in
both `Navbar.jsx` and `MobileMenu.jsx`. A later stage can add variants if a
real second consumer (e.g. a tier badge) needs them; adding that now would
be speculative.

## 3. Component Restyles

Each restyle is additive/replacement only — no structural or behavioral
changes, no new props on existing components' public interfaces (their
parent-facing props stay the same).

### Navbar (`frontend/src/components/Navbar.jsx`)

- Header: add `shadow-navbar` alongside the existing `sticky top-0 z-30
  border-b border-slate-200 bg-white/90 backdrop-blur print:hidden`.
- Nav links (`navLinkClassName`): replace `text-sm font-medium` with
  `text-nav`; replace active-state `text-indigo-600` with `text-primary`;
  replace inactive `text-slate-700 hover:text-indigo-600` with `text-body
  hover:text-primary`.
- Categories dropdown panel: replace `shadow-lg` with `shadow-dropdown`,
  `rounded-md` with `rounded-card`.
- Compare count: replace the inline `<span className="ml-1.5 ... rounded-full
  bg-indigo-600 ...">{ids.length}</span>` with `<Badge>{ids.length}</Badge>`.

### MobileMenu (`frontend/src/components/MobileMenu.jsx`)

- Same Compare-count replacement: inline span → `<Badge>{compareCount}</Badge>`.
- Nav item text: `text-nav`; active state `bg-indigo-50 text-indigo-600` →
  `bg-primary/5 text-primary`; inactive `text-slate-700` → `text-body`.

### Footer (`frontend/src/components/Footer.jsx`)

- `border-t border-slate-200 bg-slate-50` → `border-t border-border
  bg-surface-secondary`.
- Shop name span: `text-slate-900` → `text-heading`.
- Contact email link: `text-indigo-600` → `text-primary`.
- Copyright text: `text-slate-400` → `text-muted`.

### HeroSection (`frontend/src/components/HeroSection.jsx`)

- Section background: `bg-indigo-50` → `bg-surface-secondary`.
- `<h1>`: replace `text-4xl font-extrabold tracking-tight text-slate-900
  sm:text-5xl lg:text-6xl` with `text-hero text-heading`.
- `<p>`: replace `text-base text-slate-600 sm:text-lg` with `text-subtitle
  text-body`.
- CTA buttons: replace both ad-hoc `<button>` elements with
  `<Button variant="primary" onClick={onExploreClick}>Explore Products</Button>`
  and `<Button variant="secondary" onClick={onTrendingClick}>View Trending
  Finds</Button>`.

### SectionHeading (`frontend/src/components/SectionHeading.jsx`)

- `<h2>`: replace `text-2xl font-bold text-slate-900 sm:text-3xl` with
  `text-section-heading text-heading`.
- `<p>`: replace `text-sm text-slate-600` with `text-subtitle text-body`.

### ProductCard (`frontend/src/components/ProductCard.jsx`)

- Card wrapper: replace `rounded-xl ... shadow-sm ... hover:shadow-md` with
  `rounded-card shadow-card hover:shadow-card-hover`.
- Image: add `rounded-image` (image sits inside the card's already-clipped
  `overflow-hidden` container, so this affects the image element itself for
  when it's not full-bleed — verify visually in Task; if the existing
  `overflow-hidden` on the wrapper already clips corners identically, this
  is a no-op safety addition, not a behavior change).
- Name (`<h3>`): `text-base font-semibold text-slate-900` → `text-card-title
  text-heading`.
- Description (`<p>`): `text-sm text-slate-600` → `text-small text-body`
  (keep existing `line-clamp-3`).
- CTA: replace the ad-hoc `<a>` with `<Button variant="amazon" href={product.productLink} target="_blank" rel="nofollow sponsored noopener noreferrer" onClick={handleCheckPrice}>Check Price</Button>`.
- Compare-toggle floating button: unchanged (not a spec'd Button variant —
  it's an icon-only toggle control, distinct from the CTA).

### LoadingSpinner (`frontend/src/components/LoadingSpinner.jsx`)

- Spinner: `border-slate-200 border-t-indigo-600` → `border-border
  border-t-primary`.
- Label: `text-slate-500` → `text-small text-body`.

### EmptyState (`frontend/src/components/EmptyState.jsx`)

- Wrapper: `border-slate-300` → `border-border`.
- Title: `text-slate-700` → `text-card-title text-heading`.
- Description: `text-slate-500` → `text-small text-body`.

### ErrorState (`frontend/src/components/ErrorState.jsx`)

- Wrapper: `bg-red-50` → `bg-danger/10`.
- Message: `text-red-700` → `text-danger`.
- Retry button: replace the ad-hoc `<button>` with `<Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>`.

### LoginPage (`frontend/src/pages/LoginPage.jsx`)

- Form card: `rounded-xl ... shadow-sm` → `rounded-card shadow-card`.
- Page background: `bg-slate-50` → `bg-surface-secondary`.
- Heading: `text-2xl font-bold text-slate-900` → `text-page-heading
  text-heading`.
- Inputs: `rounded-md border-slate-300 focus:border-indigo-500
  focus:ring-indigo-500` → `rounded-btn border-border focus:border-primary
  focus:ring-primary`.
- Field error text: `text-red-600` → `text-danger`.
- Form-level error banner: `bg-red-50 text-red-700` → `bg-danger/10
  text-danger`.
- Submit button: replace the ad-hoc `<button>` with `<Button variant="primary" type="submit" disabled={isSubmitting} className="w-full">
  {isSubmitting ? 'Signing in...' : 'Sign In'}</Button>`.
- Show/hide password toggle: unchanged (icon-only control, not a Button
  variant).

## Testing

Every touched component already has a test file. This stage's tests verify
*behavior*, not visual styling — existing assertions about text content,
roles, hrefs, click handlers, and accessibility attributes must keep
passing unchanged, since no component's props, structure, or behavior
changes. New assertions are added only where the underlying element type
changes (e.g. LoginPage's submit button becomes a `Button`-rendered
`<button type="submit">`, which existing `getByRole('button', {name: ...})`
queries already cover without modification).

`Button.jsx` and `Badge.jsx` get their own new test files:

- `Button.test.jsx`: renders as `<button>` by default; renders as `<a>`
  when given `href`, forwarding `target`/`rel`; applies the correct classes
  per variant; forwards `onClick`/`disabled`/`type`; merges a passed
  `className`.
- `Badge.test.jsx`: renders its children; has the expected pill/color
  classes.

## Out of Scope for This Stage

- No changes to any other page's buttons, cards, or CTAs (admin forms,
  `/compare`, Comparisons, Buying Guides) — later stages.
- No new Button/Badge variants beyond what's listed above.
- No animation changes (Stage 6).
- No `ProductCard` content changes — styling only, per the standing
  decision from earlier this session.
