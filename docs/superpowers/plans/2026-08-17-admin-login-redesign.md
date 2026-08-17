# Admin Login Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/login` to a split-screen layout (dark branding image left, light login card right) matching a provided reference, without changing the existing username-based auth API, token handling, or protected-route behavior.

**Architecture:** Five new presentational components under `frontend/src/components/admin-login/` (`FormField`, `PasswordField`, `AuthErrorAlert`, `AdminBrandingPanel`, `AdminLoginCard`), composed by a rewritten `LoginPage.jsx` that keeps owning all auth state and logic exactly as it does today. New colors/gradients are literal Tailwind arbitrary values scoped to these five files — nothing in `tailwind.config.js` or the shared `.admin-scope` theme changes.

**Tech Stack:** React, Tailwind CSS (arbitrary values), Framer Motion (already a dependency, `^11.0.0`), lucide-react (already a dependency, `^0.400.0`), Vitest + React Testing Library.

## Global Constraints

- Frontend-only. Do not modify any backend file, migration, or DTO.
- The email-labeled field stays bound to the existing `username` state variable, `id="username"`, and the existing `login(username, password)` call — no `type="email"` and no email-format validation (see the design spec's resolved conflict). Only required-field validation, same as today.
- No Remember Me, Forgot Password, sign-up link, social login, or hard-coded credentials anywhere in the new code.
- The branding image is referenced as `/admin-login-branding.png` from `frontend/public/` (a plain string `src`, not a `src/assets` ES import) — see Task 4's note for why. The user supplies this file separately; its absence must not break `vitest run` or `npm run build`.
- Preserve `ProtectedRoute.jsx` and the redirect-to-originally-requested-page behavior (`location.state?.from?.pathname`) exactly as they exist today.
- Reuse the existing `dashboard-purple` (`#5b2cf2`) Tailwind color token wherever the reference's "Primary purple" is a plain solid fill (it's an exact hex match already registered in `tailwind.config.js`) instead of duplicating it as an arbitrary value.

---

### Task 1: `FormField` component

**Files:**
- Create: `frontend/src/components/admin-login/FormField.jsx`
- Test: `frontend/src/components/admin-login/FormField.test.jsx`

**Interfaces:**
- Consumes: nothing (standalone).
- Produces: `<FormField id label type="text" icon={LucideIcon} trailing={ReactNode} error value onChange autoComplete placeholder />`. `PasswordField` (Task 2) and `AdminLoginCard` (Task 5) both depend on this exact prop list.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/admin-login/FormField.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Mail } from 'lucide-react';
import FormField from './FormField.jsx';

describe('FormField', () => {
  it('links the label to the input and forwards typed input to onChange', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<FormField id="email" label="Email address" icon={Mail} value="" onChange={handleChange} />);

    const input = screen.getByLabelText('Email address');
    await user.type(input, 'a');

    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('shows an error message and marks the input invalid when error is set', () => {
    render(
      <FormField id="email" label="Email address" value="" onChange={() => {}} error="Email address is required." />
    );

    const input = screen.getByLabelText('Email address');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'email-error');
    expect(screen.getByText('Email address is required.')).toBeInTheDocument();
  });

  it('does not mark the input invalid when there is no error', () => {
    render(<FormField id="email" label="Email address" value="" onChange={() => {}} />);

    expect(screen.getByLabelText('Email address')).toHaveAttribute('aria-invalid', 'false');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/admin-login/FormField.test.jsx`
Expected: FAIL — `FormField.jsx` does not exist yet.

- [ ] **Step 3: Implement `FormField.jsx`**

Create `frontend/src/components/admin-login/FormField.jsx`:

```jsx
function FormField({ id, label, type = 'text', icon: Icon, trailing, error, value, onChange, autoComplete, placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-[#0B1629]">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#667085]"
            aria-hidden="true"
          />
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-[52px] w-full rounded-[13px] border border-[#E5EAF2] bg-[#FAFAFC] text-[15px] text-[#0B1629] placeholder:text-[#667085]/70 focus:border-[#5B2CF2] focus:outline-none focus:ring-2 focus:ring-[#5B2CF2]/30 ${
            Icon ? 'pl-11' : 'pl-4'
          } ${trailing ? 'pr-11' : 'pr-4'}`}
        />
        {trailing}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export default FormField;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/admin-login/FormField.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/admin-login/FormField.jsx frontend/src/components/admin-login/FormField.test.jsx
git commit -m "feat(admin-login): add FormField component"
```

---

### Task 2: `PasswordField` component

**Files:**
- Create: `frontend/src/components/admin-login/PasswordField.jsx`
- Test: `frontend/src/components/admin-login/PasswordField.test.jsx`

**Interfaces:**
- Consumes: `FormField` from Task 1 (`id label type icon trailing error value onChange autoComplete`).
- Produces: `<PasswordField id label value onChange error autoComplete />` — no `icon`/`trailing`/`type` props (it supplies those to `FormField` internally). `AdminLoginCard` (Task 5) depends on this exact prop list.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/admin-login/PasswordField.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import PasswordField from './PasswordField.jsx';

describe('PasswordField', () => {
  it('defaults to a masked password input and reveals it on toggle', async () => {
    const user = userEvent.setup();
    render(<PasswordField id="password" label="Password" value="secret" onChange={() => {}} />);

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
  });

  it('shows an error message when error is set', () => {
    render(
      <PasswordField id="password" label="Password" value="" onChange={() => {}} error="Password is required." />
    );

    expect(screen.getByText('Password is required.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/admin-login/PasswordField.test.jsx`
Expected: FAIL — `PasswordField.jsx` does not exist yet.

- [ ] **Step 3: Implement `PasswordField.jsx`**

Create `frontend/src/components/admin-login/PasswordField.jsx`:

```jsx
import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import FormField from './FormField.jsx';

function PasswordField({ id, label, value, onChange, error, autoComplete }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <FormField
      id={id}
      label={label}
      type={showPassword ? 'text' : 'password'}
      icon={Lock}
      value={value}
      onChange={onChange}
      error={error}
      autoComplete={autoComplete}
      trailing={
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#667085] hover:text-dashboard-purple"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      }
    />
  );
}

export default PasswordField;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/admin-login/PasswordField.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/admin-login/PasswordField.jsx frontend/src/components/admin-login/PasswordField.test.jsx
git commit -m "feat(admin-login): add PasswordField component"
```

---

### Task 3: `AuthErrorAlert` component

**Files:**
- Create: `frontend/src/components/admin-login/AuthErrorAlert.jsx`
- Test: `frontend/src/components/admin-login/AuthErrorAlert.test.jsx`

**Interfaces:**
- Consumes: nothing (standalone).
- Produces: `<AuthErrorAlert message={string} />` — renders `null` when `message` is falsy. `AdminLoginCard` (Task 5) depends on this.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/admin-login/AuthErrorAlert.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AuthErrorAlert from './AuthErrorAlert.jsx';

describe('AuthErrorAlert', () => {
  it('renders nothing when there is no message', () => {
    const { container } = render(<AuthErrorAlert message="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the message inside an alert role when set', () => {
    render(<AuthErrorAlert message="Invalid email address or password." />);

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email address or password.');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/admin-login/AuthErrorAlert.test.jsx`
Expected: FAIL — `AuthErrorAlert.jsx` does not exist yet.

- [ ] **Step 3: Implement `AuthErrorAlert.jsx`**

Create `frontend/src/components/admin-login/AuthErrorAlert.jsx`:

```jsx
import { AlertCircle } from 'lucide-react';

function AuthErrorAlert({ message }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="mb-6 flex items-start gap-2 rounded-[13px] border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

export default AuthErrorAlert;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/admin-login/AuthErrorAlert.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/admin-login/AuthErrorAlert.jsx frontend/src/components/admin-login/AuthErrorAlert.test.jsx
git commit -m "feat(admin-login): add AuthErrorAlert component"
```

---

### Task 4: `AdminBrandingPanel` component

**Files:**
- Create: `frontend/src/components/admin-login/AdminBrandingPanel.jsx`
- Test: `frontend/src/components/admin-login/AdminBrandingPanel.test.jsx`

**Interfaces:**
- Consumes: nothing (standalone).
- Produces: `<AdminBrandingPanel />` — no props. `LoginPage.jsx` (Task 6) renders this directly.

**Note on the image path:** the design spec originally called for `import brandingImage from '../../assets/admin-login-branding.png'`. That's wrong for this codebase's situation: a Vite `import` of an asset must resolve to a real file on disk at dev/test/build time, or `vitest run` and `npm run build` fail immediately with a module-resolution error — and the real image file doesn't exist yet (the user is supplying it separately, path and timing unknown). This task instead references the image as a plain string path served from `frontend/public/`, exactly like `ImportProductsModal.jsx` already does for `frontend/public/templates/product-list-template.xlsx`. A `public/` asset is never resolved by Vite's module graph, so a missing file there just 404s the `<img>` at runtime in the browser (matching the design spec's intent — "renders with a broken image until the file exists") without breaking any build or test step. **The user must place the file at `frontend/public/admin-login-branding.png`** (not `src/assets/`) for the image to actually display.

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/admin-login/AdminBrandingPanel.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AdminBrandingPanel from './AdminBrandingPanel.jsx';

describe('AdminBrandingPanel', () => {
  it('renders the branding image with descriptive alt text and the correct src', () => {
    render(<AdminBrandingPanel />);

    const image = screen.getByAltText(/2Go Findz Admin Command Center/);
    expect(image).toHaveAttribute('src', '/admin-login-branding.png');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/components/admin-login/AdminBrandingPanel.test.jsx`
Expected: FAIL — `AdminBrandingPanel.jsx` does not exist yet.

- [ ] **Step 3: Implement `AdminBrandingPanel.jsx`**

Create `frontend/src/components/admin-login/AdminBrandingPanel.jsx`:

```jsx
function AdminBrandingPanel() {
  return (
    <div className="hidden h-full lg:block lg:w-[42%]">
      <img
        src="/admin-login-branding.png"
        alt="2Go Findz Admin Command Center — manage products, buying guides, categories, and performance, all in one place. 248 products, 56 published guides, 6.94% click rate. Secure admin access."
        loading="eager"
        className="h-full w-full object-cover object-center"
      />
    </div>
  );
}

export default AdminBrandingPanel;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/components/admin-login/AdminBrandingPanel.test.jsx`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/admin-login/AdminBrandingPanel.jsx frontend/src/components/admin-login/AdminBrandingPanel.test.jsx
git commit -m "feat(admin-login): add AdminBrandingPanel component"
```

---

### Task 5: `AdminLoginCard` component

**Files:**
- Create: `frontend/src/components/admin-login/AdminLoginCard.jsx`
- Test: `frontend/src/components/admin-login/AdminLoginCard.test.jsx`

**Interfaces:**
- Consumes: `FormField` (Task 1, via `PasswordField`), `PasswordField` (Task 2, exact prop list `id label value onChange error autoComplete`), `AuthErrorAlert` (Task 3, `message` prop).
- Produces: `<AdminLoginCard username onUsernameChange password onPasswordChange usernameError passwordError formError isSubmitting onSubmit />`. `LoginPage.jsx` (Task 6) depends on this exact prop list — `onUsernameChange`/`onPasswordChange` each receive the new string value (not the raw event), `onSubmit` receives the raw form submit event.

**Note on the Sign In button:** it does not reuse the shared `Button.jsx` component. `Button.jsx`'s `primary` variant sets a `hover:bg-amazon-hover` class; if this button used `<Button>` with a custom `style={{ background: gradient }}`, that inline style only wins for the resting state — on hover, `hover:bg-amazon-hover` (a real class, not an inline style) would still apply and override the gradient, since inline styles can't express `:hover`. A plain `<button>` with fully custom classes avoids that landmine entirely.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/admin-login/AdminLoginCard.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AdminLoginCard from './AdminLoginCard.jsx';

function renderCard(overrides = {}) {
  const props = {
    username: '',
    onUsernameChange: vi.fn(),
    password: '',
    onPasswordChange: vi.fn(),
    usernameError: undefined,
    passwordError: undefined,
    formError: '',
    isSubmitting: false,
    onSubmit: vi.fn((event) => event.preventDefault()),
    ...overrides,
  };
  render(<AdminLoginCard {...props} />);
  return props;
}

describe('AdminLoginCard', () => {
  it('renders the heading, both fields, and the Sign In button', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('calls onSubmit when the form is submitted', async () => {
    const user = userEvent.setup();
    const props = renderCard();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows the loading label and disables the button while submitting', () => {
    renderCard({ isSubmitting: true });

    const button = screen.getByRole('button', { name: /signing in/i });
    expect(button).toBeDisabled();
  });

  it('renders field and form errors passed down as props', () => {
    renderCard({ usernameError: 'Email address is required.', formError: 'Invalid email address or password.' });

    expect(screen.getByText('Email address is required.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email address or password.');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/admin-login/AdminLoginCard.test.jsx`
Expected: FAIL — `AdminLoginCard.jsx` does not exist yet.

- [ ] **Step 3: Implement `AdminLoginCard.jsx`**

Create `frontend/src/components/admin-login/AdminLoginCard.jsx`:

```jsx
import { ShieldCheck, Mail, Lock, ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import FormField from './FormField.jsx';
import PasswordField from './PasswordField.jsx';
import AuthErrorAlert from './AuthErrorAlert.jsx';

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function AdminLoginCard({
  username,
  onUsernameChange,
  password,
  onPasswordChange,
  usernameError,
  passwordError,
  formError,
  isSubmitting,
  onSubmit,
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : 'hidden'}
      animate="visible"
      variants={cardVariants}
      className="relative w-full max-w-[520px] overflow-hidden rounded-[22px] border border-[#E5EAF2] bg-white p-11 shadow-[0_20px_60px_rgba(11,22,41,0.12),0_4px_16px_rgba(11,22,41,0.06)] max-sm:p-8"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: 'linear-gradient(90deg, #5b2cf2, #7c3aed, #ff7a00)' }}
      />

      <motion.div variants={itemVariants} className="mb-6 flex justify-center">
        <div
          className="flex h-[72px] w-[72px] items-center justify-center rounded-[20px] shadow-[0_0_30px_rgba(91,44,242,0.35)]"
          style={{ background: 'linear-gradient(135deg, #5b2cf2, #7c3aed)' }}
        >
          <ShieldCheck size={34} className="text-white" aria-hidden="true" />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="mb-8 text-center">
        <h1 className="text-[38px] font-extrabold leading-tight text-[#0B1629]">Welcome back</h1>
        <p className="mt-2 text-[15px] text-[#667085]">Sign in to your 2Go Findz admin account.</p>
      </motion.div>

      <AuthErrorAlert message={formError} />

      <form onSubmit={onSubmit} noValidate>
        <motion.div variants={itemVariants} className="mb-4">
          <FormField
            id="username"
            label="Email address"
            icon={Mail}
            placeholder="admin@2gofindz.com"
            autoComplete="username"
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            error={usernameError}
          />
        </motion.div>

        <motion.div variants={itemVariants} className="mb-6">
          <PasswordField
            id="password"
            label="Password"
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            error={passwordError}
            autoComplete="current-password"
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-[54px] w-full items-center justify-center gap-2 rounded-[13px] text-[16px] font-bold text-white shadow-[0_10px_30px_rgba(91,44,242,0.35)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B2CF2] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
            style={{ background: 'linear-gradient(90deg, #5b2cf2, #6d35f5, #7c3aed)' }}
          >
            {isSubmitting ? (
              <>
                <span
                  aria-hidden="true"
                  className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
                />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={18} aria-hidden="true" />
              </>
            )}
          </button>
        </motion.div>
      </form>

      <div className="mt-8 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#E5EAF2]" />
        <span className="text-xs font-semibold uppercase tracking-wide text-[#667085]">Admin Portal</span>
        <div className="h-px flex-1 bg-[#E5EAF2]" />
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#667085]">
        <Lock size={12} aria-hidden="true" />
        Authorized administrators only.
      </p>
    </motion.div>
  );
}

export default AdminLoginCard;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/admin-login/AdminLoginCard.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/admin-login/AdminLoginCard.jsx frontend/src/components/admin-login/AdminLoginCard.test.jsx
git commit -m "feat(admin-login): add AdminLoginCard component"
```

---

### Task 6: Rewire `LoginPage.jsx` and update its tests

**Files:**
- Modify: `frontend/src/pages/LoginPage.jsx`
- Modify: `frontend/src/pages/LoginPage.test.jsx`

**Interfaces:**
- Consumes: `AdminBrandingPanel` (Task 4, no props), `AdminLoginCard` (Task 5, exact prop list from Task 5), `useAuth()` (existing — `login`, `isAuthenticated`, `isLoading`, all already returned by `AuthContext.jsx` today).
- Produces: the `/login` route element, unchanged route path and unchanged `login(username, password)` call signature — nothing outside this file depends on anything new here.

- [ ] **Step 1: Update `LoginPage.test.jsx` for the new label/copy and the new already-authenticated redirect**

Replace the full contents of `frontend/src/pages/LoginPage.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../context/AuthContext.jsx';
import LoginPage from './LoginPage.jsx';
import * as authService from '../services/authService.js';

function renderLoginPage(initialEntries = ['/login']) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<div>Admin Dashboard</div>} />
          <Route path="/admin/settings" element={<div>Settings Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('shows validation errors when submitted empty', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Email address is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('shows a loading state and redirects to /admin on successful login', async () => {
    vi.spyOn(authService, 'loginRequest').mockResolvedValue({
      token: 'test-token',
      username: 'johnrovs',
      fullName: 'John Rommel Rovero',
      role: 'ADMIN',
    });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email address'), 'johnrovs');
    await user.type(screen.getByLabelText('Password'), 'admin123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('redirects back to the originally requested page after a redirected login', async () => {
    vi.spyOn(authService, 'loginRequest').mockResolvedValue({
      token: 'test-token',
      username: 'johnrovs',
      fullName: 'John Rommel Rovero',
      role: 'ADMIN',
    });
    const user = userEvent.setup();
    renderLoginPage([
      { pathname: '/login', state: { from: { pathname: '/admin/settings' } } },
    ]);

    await user.type(screen.getByLabelText('Email address'), 'johnrovs');
    await user.type(screen.getByLabelText('Password'), 'admin123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Settings Page')).toBeInTheDocument();
  });

  it('shows a generic error message on invalid credentials', async () => {
    vi.spyOn(authService, 'loginRequest').mockRejectedValue({ message: 'Invalid username or password.' });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Email address'), 'johnrovs');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid username or password.')).toBeInTheDocument();
  });

  it('redirects an already-authenticated admin straight to /admin', async () => {
    localStorage.setItem('token', 'existing-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ username: 'johnrovs', fullName: 'John Rommel Rovero', role: 'ADMIN' })
    );

    renderLoginPage();

    expect(await screen.findByText('Admin Dashboard')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/pages/LoginPage.test.jsx`
Expected: FAIL — `LoginPage.jsx` still renders the old "Username" label and has no already-authenticated redirect.

- [ ] **Step 3: Rewrite `LoginPage.jsx`**

Replace the full contents of `frontend/src/pages/LoginPage.jsx`:

```jsx
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import logo from '../assets/2gofindz.png';
import AdminBrandingPanel from '../components/admin-login/AdminBrandingPanel.jsx';
import AdminLoginCard from '../components/admin-login/AdminLoginCard.jsx';

function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname ?? '/admin';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const errors = {};
    if (!username.trim()) errors.username = 'Email address is required.';
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

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/admin" replace />;

  return (
    <main
      className="flex min-h-screen flex-col lg:flex-row"
      style={{
        background: 'radial-gradient(circle at center, rgba(91, 44, 242, 0.08), transparent 45%), #fafafc',
      }}
    >
      <AdminBrandingPanel />

      <div className="relative flex flex-1 flex-col items-center justify-center px-5 py-10 lg:px-10">
        <Link
          to="/"
          className="absolute right-5 top-5 flex items-center gap-1.5 text-sm font-medium text-[#667085] transition-colors hover:text-dashboard-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-purple focus-visible:ring-offset-2 lg:right-10 lg:top-10"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to storefront
        </Link>

        <img src={logo} alt="2Go Findz" className="mb-8 h-10 lg:hidden" />

        <AdminLoginCard
          username={username}
          onUsernameChange={setUsername}
          password={password}
          onPasswordChange={setPassword}
          usernameError={fieldErrors.username}
          passwordError={fieldErrors.password}
          formError={formError}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />

        <p className="mt-8 text-xs text-[#667085]">© 2026 2Go Findz. All rights reserved.</p>
      </div>
    </main>
  );
}

export default LoginPage;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/pages/LoginPage.test.jsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Run the full frontend suite**

Run: `cd frontend && npx vitest run`
Expected: same pass count as the pre-existing baseline, plus every test added across Tasks 1–6 (5 known pre-existing `DashboardHeader.test.jsx` failures are unrelated to this feature and expected to remain).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/LoginPage.jsx frontend/src/pages/LoginPage.test.jsx
git commit -m "feat(admin-login): redesign LoginPage with split-screen branding layout"
```

---

## Definition of Done

- `npx vitest run` (from `frontend/`) passes in full, including every test added in Tasks 1–6.
- `npm run build` (from `frontend/`) succeeds.
- Once the user has placed `frontend/public/admin-login-branding.png`:
  1. Run the frontend dev server, compare `/login` against the reference at 1440px+ width.
  2. Confirm no vertical scroll at 1024px+ with a standard viewport height.
  3. Confirm the branding image fills only the left ~42% and isn't stretched/distorted.
  4. Confirm Remember Me / Forgot Password are absent with no empty gap where they'd have been.
  5. Empty submit shows both field errors; invalid credentials shows the red `AuthErrorAlert`; successful login with `johnrovs`/`admin123` redirects to `/admin`; visiting `/login` while already authenticated redirects immediately; password visibility toggle works and preserves input focus.
  6. Resize through 1024px and 768px breakpoints — confirm branding panel / compact logo swap and no horizontal overflow at any width.
  7. Tab through the entire page (back-link → email → password → toggle → sign in) with keyboard only, confirm visible focus at every stop.
