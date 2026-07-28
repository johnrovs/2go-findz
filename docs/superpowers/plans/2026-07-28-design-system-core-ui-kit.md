# Design System Stage 2: Core UI Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build reusable `Button` and `Badge` components on Stage 1's design tokens, then apply them and the typography/color tokens to the highest-visibility shared components (Navbar, MobileMenu, Footer, HeroSection, SectionHeading, ProductCard, LoadingSpinner, EmptyState, ErrorState, LoginPage), without changing any of their behavior, props, or content.

**Architecture:** Two new leaf components (`Button`, `Badge`) with no dependencies beyond Stage 1's Tailwind tokens; every other task is a styling-only edit to an existing component — same JSX structure, same props, same behavior, only `className` values and (where a native `<button>`/`<a>` becomes a `<Button>`) the underlying element wrapper change.

**Tech Stack:** React 18, Tailwind CSS 3.4 (Stage 1 tokens), Vitest + React Testing Library.

## Global Constraints

- `ProductCard`'s content stays exactly as shipped — image, name, description, one CTA. This stage restyles it; it does not add category labels, badges, star ratings, review counts, price, or pros/cons.
- The "Check Price" button uses the `amazon` Button variant, not `primary`.
- No changes to any page or component outside the list above (admin forms, `/compare`, Comparisons, Buying Guides pages are later stages).
- No new Button variants or Badge color props beyond what's specified — YAGNI.
- Every existing test's behavioral assertions (text content, roles, hrefs, click handlers, a11y attributes) must keep passing unchanged; only class-name assertions tied to colors being replaced may need updating.

---

### Task 1: Button component

**Files:**
- Create: `frontend/src/components/Button.jsx`
- Test: `frontend/src/components/Button.test.jsx`

**Interfaces:**
- Consumes: Stage 1 tokens `rounded-btn`, `text-btn`, `shadow-card`, colors `primary`/`primary-hover`/`amazon`/`amazon-hover`.
- Produces: `Button({ variant = 'primary', size = 'md', href, className = '', children, ...rest })` — renders `<a href={href} {...rest}>` when `href` is provided, otherwise `<button {...rest}>`. Tasks 3–7 import this as `import Button from '../components/Button.jsx'` (or relative path from their own directory) and pass `variant`, optionally `size`, optionally `href`/`target`/`rel`/`onClick`/`type`/`disabled`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/Button.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Button from './Button.jsx';

describe('Button', () => {
  it('renders a native button by default', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('renders an anchor when given an href, forwarding target and rel', () => {
    render(
      <Button href="https://example.com" target="_blank" rel="noopener noreferrer">
        Go
      </Button>
    );
    const link = screen.getByRole('link', { name: 'Go' });
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('applies primary variant classes by default', () => {
    render(<Button>Primary</Button>);
    expect(screen.getByRole('button', { name: 'Primary' })).toHaveClass('bg-primary', 'text-white');
  });

  it('applies secondary variant classes', () => {
    render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button', { name: 'Secondary' })).toHaveClass('bg-white', 'text-primary', 'border-primary');
  });

  it('applies amazon variant classes', () => {
    render(<Button variant="amazon">Amazon</Button>);
    expect(screen.getByRole('button', { name: 'Amazon' })).toHaveClass('bg-amazon');
  });

  it('forwards onClick and disabled to a native button', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} disabled>
        Disabled
      </Button>
    );
    const button = screen.getByRole('button', { name: 'Disabled' });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('forwards type to a native button', () => {
    render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('type', 'submit');
  });

  it('merges a passed className with the variant/size classes', () => {
    render(<Button className="w-full">Full width</Button>);
    expect(screen.getByRole('button', { name: 'Full width' })).toHaveClass('w-full', 'bg-primary');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- --run Button`
Expected: FAIL — `Cannot find module './Button.jsx'` (file doesn't exist yet).

- [ ] **Step 3: Write the implementation**

Create `frontend/src/components/Button.jsx`:

```jsx
const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-btn text-btn transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

const VARIANT_CLASSES = {
  primary: 'bg-primary text-white shadow-card hover:bg-primary-hover',
  secondary: 'bg-white text-primary border border-primary hover:bg-primary/5',
  amazon: 'bg-amazon text-[#111827] shadow-card hover:bg-amazon-hover',
};

const SIZE_CLASSES = {
  md: 'px-[28px] py-4',
  sm: 'px-4 py-2',
};

function Button({ variant = 'primary', size = 'md', href, className = '', children, ...rest }) {
  const classes = `${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`;

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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --run Button`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/components/Button.jsx frontend/src/components/Button.test.jsx
git commit -m "feat(design-system): add reusable Button component"
```

---

### Task 2: Badge component

**Files:**
- Create: `frontend/src/components/Badge.jsx`
- Test: `frontend/src/components/Badge.test.jsx`

**Interfaces:**
- Consumes: Stage 1 tokens `text-small`, color `primary`.
- Produces: `Badge({ children })` — renders a `<span>` pill. Task 3 imports this in `Navbar.jsx` and `MobileMenu.jsx` as `import Badge from './Badge.jsx'`.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/Badge.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Badge from './Badge.jsx';

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>3</Badge>);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('applies pill and primary-color classes', () => {
    render(<Badge>3</Badge>);
    expect(screen.getByText('3')).toHaveClass('rounded-full', 'bg-primary', 'text-white');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run Badge`
Expected: FAIL — `Cannot find module './Badge.jsx'`.

- [ ] **Step 3: Write the implementation**

Create `frontend/src/components/Badge.jsx`:

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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run Badge`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/components/Badge.jsx frontend/src/components/Badge.test.jsx
git commit -m "feat(design-system): add reusable Badge component"
```

---

### Task 3: Restyle Navbar and MobileMenu

**Files:**
- Modify: `frontend/src/components/Navbar.jsx`
- Modify: `frontend/src/components/Navbar.test.jsx`
- Modify: `frontend/src/components/MobileMenu.jsx`

**Interfaces:**
- Consumes: `Badge` from Task 2.
- Produces: nothing new — this task's changes aren't consumed by later tasks.

- [ ] **Step 1: Update the failing Navbar test assertions**

`frontend/src/components/Navbar.test.jsx` currently has (around line 35–39):

```jsx
  it('highlights the active route', () => {
    renderNavbar(['/trending']);
    expect(screen.getByRole('link', { name: 'Trending' })).toHaveClass('text-indigo-600');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveClass('text-indigo-600');
  });
```

Change it to:

```jsx
  it('highlights the active route', () => {
    renderNavbar(['/trending']);
    expect(screen.getByRole('link', { name: 'Trending' })).toHaveClass('text-primary');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveClass('text-primary');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- --run Navbar`
Expected: FAIL — `Trending` link doesn't have class `text-primary` yet.

- [ ] **Step 3: Update `Navbar.jsx`**

Add the import and update `navLinkClassName` (top of file):

```jsx
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ChevronDown, Menu, Search } from 'lucide-react';
import logo from '../assets/2gofindz.png';
import MobileMenu from './MobileMenu.jsx';
import Badge from './Badge.jsx';
import { getCategories } from '../services/categoryService.js';
import { useCompare } from '../hooks/useCompare.js';

const navLinkClassName = ({ isActive }) =>
  `text-nav transition ${isActive ? 'text-primary' : 'text-body hover:text-primary'}`;
```

Update the header's shadow (currently `className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur print:hidden"`):

```jsx
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 shadow-navbar backdrop-blur print:hidden">
```

Update the Categories dropdown panel (currently `className="absolute left-0 top-full mt-2 w-56 rounded-md border border-slate-200 bg-white py-2 shadow-lg"`):

```jsx
                  className="absolute left-0 top-full mt-2 w-56 rounded-card border border-slate-200 bg-white py-2 shadow-dropdown"
```

Replace the inline Compare-count span:

```jsx
            <NavLink to="/compare" className={navLinkClassName}>
              Compare
              {ids.length > 0 && <Badge>{ids.length}</Badge>}
            </NavLink>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- --run Navbar`
Expected: PASS, all Navbar tests (including the updated one and the pre-existing "shows the compare count badge" tests, which query by role/text and are unaffected by the markup swap since `Badge` renders the same digit as text).

- [ ] **Step 5: Update `MobileMenu.jsx`**

Add the import:

```jsx
import { useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import Badge from './Badge.jsx';
```

Update the nav item className function:

```jsx
                  className={({ isActive }) =>
                    `flex items-center rounded-md px-3 py-2 text-nav transition ${
                      isActive ? 'bg-primary/5 text-primary' : 'text-body hover:bg-slate-100'
                    }`
                  }
```

Replace the inline Compare-count span:

```jsx
                  {label}
                  {to === '/compare' && compareCount > 0 && <Badge>{compareCount}</Badge>}
```

- [ ] **Step 6: Run the full test suite**

Run: `npm test -- --run`
Expected: same pass count as before this task plus the net change from Step 1's assertion update (no new or removed tests, one assertion's expected value changed).

- [ ] **Step 7: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/components/Navbar.jsx frontend/src/components/Navbar.test.jsx frontend/src/components/MobileMenu.jsx
git commit -m "feat(design-system): restyle Navbar and MobileMenu with design tokens"
```

---

### Task 4: Restyle Footer, HeroSection, and SectionHeading

**Files:**
- Modify: `frontend/src/components/Footer.jsx`
- Modify: `frontend/src/components/HeroSection.jsx`
- Modify: `frontend/src/components/SectionHeading.jsx`

**Interfaces:**
- Consumes: `Button` from Task 1 (in `HeroSection.jsx` only).
- Produces: nothing new.

Footer and SectionHeading have no test files with class assertions (confirmed: `Footer.test.jsx` and `SectionHeading.test.jsx` only check text content/rendering, not classes), so no test changes are needed for those two. `HeroSection.test.jsx` queries by `getByRole('heading', ...)`, `getByText(...)`, and `getByRole('button', { name: /explore products/i })` / `getByRole('button', { name: /view trending finds/i })` — all of which still resolve correctly once the CTAs become `<Button>` (which renders a real `<button>` when no `href` is given), so no test changes are needed there either.

- [ ] **Step 1: Update `Footer.jsx`**

Full file:

```jsx
import SocialLinks from './SocialLinks.jsx';
import AffiliateDisclosure from './AffiliateDisclosure.jsx';

function Footer({ settings }) {
  return (
    <footer className="border-t border-border bg-surface-secondary py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 text-center sm:px-6 lg:px-8">
        <span className="text-lg font-bold text-heading">2Go Findz</span>
        <SocialLinks settings={settings} />
        <AffiliateDisclosure text={settings?.affiliateDisclosure} />
        {settings?.contactEmail && (
          <a href={`mailto:${settings.contactEmail}`} className="text-sm text-primary hover:underline">
            {settings.contactEmail}
          </a>
        )}
        {/* TODO: Enable newsletter functionality in a future deployment. */}
        {/* <NewsletterSignup /> */}
        <p className="text-xs text-muted">&copy; {new Date().getFullYear()} 2Go Findz. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
```

- [ ] **Step 2: Run the Footer test to verify it still passes**

Run: `npm test -- --run Footer`
Expected: PASS, unchanged.

- [ ] **Step 3: Update `HeroSection.jsx`**

Full file:

```jsx
import { motion } from 'framer-motion';
import Button from './Button.jsx';

function HeroSection({ headline, description, onExploreClick, onTrendingClick }) {
  return (
    <section className="bg-surface-secondary py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-hero text-heading"
        >
          {headline}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mx-auto mt-6 max-w-2xl text-subtitle text-body"
        >
          {description}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <Button variant="primary" onClick={onExploreClick}>
            Explore Products
          </Button>
          <Button variant="secondary" onClick={onTrendingClick}>
            View Trending Finds
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

export default HeroSection;
```

- [ ] **Step 4: Run the HeroSection test to verify it still passes**

Run: `npm test -- --run HeroSection`
Expected: PASS, unchanged (both tests query by role/text, not class).

- [ ] **Step 5: Update `SectionHeading.jsx`**

Full file:

```jsx
import { motion } from 'framer-motion';

function SectionHeading({ title, description }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.3 }}
      className="mb-8 text-center"
    >
      <h2 className="text-section-heading text-heading">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-2xl text-subtitle text-body">{description}</p>}
    </motion.div>
  );
}

export default SectionHeading;
```

- [ ] **Step 6: Run the SectionHeading test to verify it still passes**

Run: `npm test -- --run SectionHeading`
Expected: PASS, unchanged.

- [ ] **Step 7: Run the full test suite**

Run: `npm test -- --run`
Expected: same pass count as after Task 3 (no tests added, removed, or changed in this task).

- [ ] **Step 8: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/components/Footer.jsx frontend/src/components/HeroSection.jsx frontend/src/components/SectionHeading.jsx
git commit -m "feat(design-system): restyle Footer, HeroSection, and SectionHeading with design tokens"
```

---

### Task 5: Restyle ProductCard

**Files:**
- Modify: `frontend/src/components/ProductCard.jsx`
- Modify: `frontend/src/components/ProductCard.test.jsx`

**Interfaces:**
- Consumes: `Button` from Task 1.
- Produces: nothing new.

`ProductCard.test.jsx` queries the CTA by `getByRole('link', { name: 'Check Price' })` (it's rendered with an `href`, so `Button` renders an `<a>`, preserving the `link` role) — this and the href/target/rel/onClick assertions all keep passing unchanged. No test file changes are needed for the CTA itself. The only test-relevant markup change is additive (`rounded-image` on the `<img>`), which no existing test asserts against.

- [ ] **Step 1: Update `ProductCard.jsx`**

Full file:

```jsx
import { motion } from 'framer-motion';
import { Check, GitCompare } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl.js';
import { recordClick } from '../services/trackingService.js';
import { useCompare } from '../hooks/useCompare.js';
import Button from './Button.jsx';

function ProductCard({ product }) {
  const imageUrl = getImageUrl(product.imageFileName);
  const { isSelected, isFull, toggle } = useCompare();
  const selected = isSelected(product.id);

  function handleCheckPrice() {
    const sessionId = sessionStorage.getItem('sessionId');
    recordClick(product.id, sessionId).catch(() => {
      // Click tracking is best-effort; never block the link's native navigation on a tracking failure.
    });
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.3 }}
      className="group flex flex-col overflow-hidden rounded-card border border-slate-200 bg-white shadow-card transition-shadow duration-200 hover:shadow-card-hover"
    >
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full rounded-image object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
            No image available
          </div>
        )}
        <button
          type="button"
          onClick={() => toggle(product.id)}
          disabled={!selected && isFull}
          aria-pressed={selected}
          aria-label={selected ? `Remove ${product.name} from Compare` : `Add ${product.name} to Compare`}
          title={!selected && isFull ? 'Compare is full — remove an item to add another' : undefined}
          className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
            selected ? 'bg-primary text-white' : 'bg-white/90 text-slate-600 hover:bg-white'
          }`}
        >
          {selected ? <Check size={16} /> : <GitCompare size={16} />}
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center gap-2 p-4 text-center">
        <h3 className="text-card-title text-heading">{product.name}</h3>
        <p className="line-clamp-3 text-small text-body">{product.description}</p>
        <Button
          variant="amazon"
          href={product.productLink}
          onClick={handleCheckPrice}
          target="_blank"
          rel="nofollow sponsored noopener noreferrer"
          className="mt-auto"
        >
          Check Price
        </Button>
      </div>
    </motion.article>
  );
}

export default ProductCard;
```

Note: the compare-toggle button's selected-state color changed from `bg-indigo-600` to `bg-primary` — this is a one-line token-alignment fix within scope (same visual color, now token-based) and no test asserts on that specific class string, so it needs no test update.

- [ ] **Step 2: Run the ProductCard test to verify it still passes**

Run: `npm test -- --run ProductCard`
Expected: PASS, all 7 tests unchanged (queries are role/text/attribute based, not class based, except the existing `items-center`/`text-center` check on the text wrapper div, which this task doesn't touch).

- [ ] **Step 3: Run the full test suite**

Run: `npm test -- --run`
Expected: same pass count as after Task 4.

- [ ] **Step 4: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/components/ProductCard.jsx
git commit -m "feat(design-system): restyle ProductCard with design tokens and Button"
```

---

### Task 6: Restyle LoadingSpinner, EmptyState, and ErrorState

**Files:**
- Modify: `frontend/src/components/LoadingSpinner.jsx`
- Modify: `frontend/src/components/EmptyState.jsx`
- Modify: `frontend/src/components/ErrorState.jsx`

**Interfaces:**
- Consumes: `Button` from Task 1 (in `ErrorState.jsx` only).
- Produces: nothing new.

None of these three components have dedicated test files (confirmed: no `LoadingSpinner.test.jsx`, `EmptyState.test.jsx`, or `ErrorState.test.jsx` exist in the codebase) — they're exercised indirectly through the pages that render them during loading/empty/error states. Those page-level tests query by `role="status"`, `role="alert"`, text content, and `getByRole('button', { name: 'Try again' })` — all preserved by this task's changes, so no page test files need updates.

- [ ] **Step 1: Update `LoadingSpinner.jsx`**

Full file:

```jsx
function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      <span className="text-small text-body">{label}</span>
    </div>
  );
}

export default LoadingSpinner;
```

- [ ] **Step 2: Update `EmptyState.jsx`**

Full file:

```jsx
function EmptyState({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-16 text-center">
      <h3 className="text-card-title text-heading">{title}</h3>
      {description && <p className="max-w-sm text-small text-body">{description}</p>}
    </div>
  );
}

export default EmptyState;
```

- [ ] **Step 3: Update `ErrorState.jsx`**

Full file:

```jsx
import Button from './Button.jsx';

function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-lg bg-danger/10 py-12 text-center">
      <p className="text-small font-medium text-danger">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
```

- [ ] **Step 4: Run the full test suite**

Run: `npm test -- --run`
Expected: same pass count as after Task 5 — every page test that exercises loading/empty/error states (e.g. `HomePage.test.jsx`, `CatalogPage.test.jsx`) queries by role/text, which these changes preserve.

- [ ] **Step 5: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/components/LoadingSpinner.jsx frontend/src/components/EmptyState.jsx frontend/src/components/ErrorState.jsx
git commit -m "feat(design-system): restyle LoadingSpinner, EmptyState, and ErrorState with design tokens"
```

---

### Task 7: Restyle LoginPage

**Files:**
- Modify: `frontend/src/pages/LoginPage.jsx`

**Interfaces:**
- Consumes: `Button` from Task 1.
- Produces: nothing new — this is the last restyle task.

`LoginPage.test.jsx` queries exclusively by role and accessible name (`getByRole('button', { name: /sign in/i })`, etc.) — all preserved once the submit button becomes a `Button`-rendered `<button type="submit">`. No test file changes needed.

- [ ] **Step 1: Update `LoginPage.jsx`**

Full file:

```jsx
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import Button from '../components/Button.jsx';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname ?? '/admin';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const errors = {};
    if (!username.trim()) errors.username = 'Username is required.';
    if (!password) errors.password = 'Password is required.';
    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await login(username, password);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setFormError(error.message ?? 'Invalid username or password.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-secondary px-4">
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-sm rounded-card bg-white p-8 shadow-card">
        <h1 className="mb-6 text-page-heading text-heading">Admin Login</h1>

        {formError && (
          <p role="alert" className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {formError}
          </p>
        )}

        <div className="mb-4">
          <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
            aria-invalid={Boolean(fieldErrors.username)}
            aria-describedby={fieldErrors.username ? 'username-error' : undefined}
          />
          {fieldErrors.username && (
            <p id="username-error" className="mt-1 text-sm text-danger">
              {fieldErrors.username}
            </p>
          )}
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-btn border border-border px-3 py-2 pr-10 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {fieldErrors.password && (
            <p id="password-error" className="mt-1 text-sm text-danger">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
    </main>
  );
}

export default LoginPage;
```

- [ ] **Step 2: Run the LoginPage test to verify it still passes**

Run: `npm test -- --run LoginPage`
Expected: PASS, all tests unchanged.

- [ ] **Step 3: Run the full test suite**

Run: `npm test -- --run`
Expected: same pass count as after Task 6.

- [ ] **Step 4: Commit**

```bash
cd /Users/johnrovero/Documents/2go-findz
git add frontend/src/pages/LoginPage.jsx
git commit -m "feat(design-system): restyle LoginPage with design tokens and Button"
```

---

### Task 8: Final verification

**Files:** none (verification only).

**Interfaces:**
- Consumes: everything from Tasks 1–7.
- Produces: nothing for later tasks — this is the stage's closing gate. Stage 3 (Public Pages) starts from the components this task confirms are working.

- [ ] **Step 1: Run the full frontend test suite**

Run: `cd frontend && npm test -- --run`
Expected: all tests pass.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors or warnings.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: succeeds (pre-existing chunk-size warning only).

- [ ] **Step 4: Live smoke check**

Restart the frontend dev server if it was already running before this stage's changes (Vite HMR can miss Tailwind config/token changes on a long-running server — this stage doesn't touch `tailwind.config.js`, but restart anyway to rule out stale state), then in a browser:

1. Homepage: confirm the hero's two buttons render (primary blue "Explore Products", secondary outlined "View Trending Finds"), Navbar looks correct (active link color, dropdown shadow), Footer looks correct.
2. Add a product to Compare from a product card; confirm the Navbar and mobile-menu Compare badge shows the count as a blue pill.
3. A product card: confirm the "Check Price" button is amazon-orange, image/card corners are rounded, hover raises the shadow.
4. Trigger an error state somewhere practical (e.g. temporarily block network, or navigate to a page with a known error path if one exists) to confirm ErrorState's "Try again" button renders as the new secondary-style Button; or accept a code-level confirmation if no easy live trigger exists — read the component to confirm the render path.
5. Log in at `/login`: confirm the card, heading, inputs, and submit button all reflect the new tokens.

- [ ] **Step 5: Report results**

If all checks pass, this stage is complete — no further commit needed (Tasks 1–7 already committed their own work). If the smoke check surfaces a real bug, fix it, re-run Steps 1–3, and commit the fix with an appropriate message before considering the stage done.

---

This closes out Stage 2 of the 6-stage UI/UX redesign (Core UI Kit). Stage 3 (Public Pages) applies the same tokens — plus these new Button/Badge components — to Homepage section rhythm, Trending/Best Sellers/Categories, the Comparisons list page, and Buying Guides typography.
