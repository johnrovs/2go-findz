# Frontend Core (Stage 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the `frontend/` React project — Vite/Tailwind scaffolding, a centralized Axios service layer, authentication (context + login page), protected routing, and a fully navigable admin shell — without any backend changes.

**Architecture:** `components/ pages/ layouts/ hooks/ services/ utils/ context/ assets/` (per CLAUDE.md). React Context for auth/toast state, a single Axios instance with request/response interceptors, React Router for all routing including protected `/admin/**` routes. Full rationale in `docs/superpowers/specs/2026-07-26-frontend-core-design.md`.

**Tech Stack:** React (JavaScript/JSX, not TypeScript), Vite, Tailwind CSS, React Router DOM, Axios, Framer Motion, Lucide React, Vitest + React Testing Library, npm.

## Global Constraints

- Plain JavaScript/JSX — no TypeScript, no `.ts`/`.tsx` files.
- Package manager is npm — no yarn/pnpm lockfiles.
- Folder structure fixed per CLAUDE.md: `components/ pages/ layouts/ hooks/ services/ utils/ context/ assets/`.
- JWT stored in `localStorage` under keys `token` and `user` (JSON-stringified) — both keys are always set/cleared together, never independently.
- All backend calls go through the single Axios instance in `services/api.js` — no component ever calls `axios` or `fetch` directly.
- Every form has a loading state, and every error surfaced to the user goes through the normalized `{ message, fieldErrors }` shape — never a raw Axios error object rendered directly.
- `VITE_API_BASE_URL` is the only required env var this stage; `.env.example` documents it, `.env`/`.env.local` are gitignored and never committed.
- Tests are written per-task via TDD (Vitest + React Testing Library), not deferred to a separate testing stage.
- Accessible by default: every form input has an associated `<label>`, every icon-only button has `aria-label`, focus states are never removed (no `outline-none` without a replacement focus ring).
- No breaking changes to any backend contract — this stage only consumes existing, already-shipped backend endpoints (`POST /api/auth/login`).

---

### Task 1: Vite/Tailwind scaffolding + minimal routing shell

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/.env.example`
- Create: `frontend/.gitignore`
- Create: `frontend/src/test/setup.js`
- Create: `frontend/src/main.jsx`
- Create: `frontend/src/index.css`
- Create: `frontend/src/App.jsx`
- Create: `frontend/src/pages/HomePage.jsx`
- Test: `frontend/src/App.test.jsx`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: a working Vite dev server, build, and Vitest runner; `App.jsx` as the single route-tree owner every later task modifies (never replaces).

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "axios": "^1.7.0",
    "framer-motion": "^11.0.0",
    "lucide-react": "^0.400.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "jsdom": "^24.0.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "vite": "^5.3.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`**

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
});
```

- [ ] **Step 3: Create `tailwind.config.js` and `postcss.config.js`**

`tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

`postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 4: Create `index.html`, `.env.example`, `.gitignore`**

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>2Go Findz</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

`.env.example`:
```
VITE_API_BASE_URL=http://localhost:8080/api
```

`.gitignore`:
```
node_modules/
dist/
.env
.env.local
```

- [ ] **Step 5: Create `src/test/setup.js`, `src/index.css`, `src/main.jsx`**

`src/test/setup.js`:
```javascript
import '@testing-library/jest-dom';
```

`src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`src/main.jsx`:
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 6: Create `src/pages/HomePage.jsx` and `src/App.jsx`**

`src/pages/HomePage.jsx`:
```jsx
function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <h1 className="text-3xl font-bold text-slate-900">2Go Findz</h1>
    </main>
  );
}

export default HomePage;
```

`src/App.jsx`:
```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

- [ ] **Step 7: Write the test**

```jsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App.jsx';

describe('App', () => {
  it('renders the homepage at the root route', () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByText('2Go Findz')).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Install dependencies and run the test**

Run: `cd frontend && npm install`
Then: `npm test`
Expected: PASS (1 test)

- [ ] **Step 9: Confirm the dev server and production build both work**

Run: `npm run build`
Expected: `dist/` is produced with no errors.

- [ ] **Step 10: Commit**

```bash
git add frontend/
git commit -m "chore: scaffold frontend with Vite, Tailwind, and Vitest"
```

---

### Task 2: Axios service layer

**Files:**
- Create: `frontend/src/services/api.js`
- Test: `frontend/src/services/api.test.js`

**Interfaces:**
- Consumes: `VITE_API_BASE_URL` env var (Task 1)
- Produces: default-exported `api` Axios instance; named export `normalizeError(error): { message: string, fieldErrors: object|null }` — every later service module imports `api` from this file, never creates its own Axios instance.

- [ ] **Step 1: Write the failing tests**

```javascript
import { describe, expect, it, vi, beforeEach } from 'vitest';
import api, { normalizeError } from './api.js';

describe('normalizeError', () => {
  it('extracts field errors from a validation error response', () => {
    const error = { response: { data: { message: 'Validation failed.', errors: { name: 'Name is required.' } } } };
    expect(normalizeError(error)).toEqual({ message: 'Validation failed.', fieldErrors: { name: 'Name is required.' } });
  });

  it('extracts a plain message when there are no field errors', () => {
    const error = { response: { data: { message: 'Invalid username or password.' } } };
    expect(normalizeError(error)).toEqual({ message: 'Invalid username or password.', fieldErrors: null });
  });

  it('falls back to a generic message when there is no response', () => {
    const error = {};
    expect(normalizeError(error)).toEqual({ message: 'Network error. Please try again.', fieldErrors: null });
  });
});

describe('api request interceptor', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('attaches the Authorization header when a token is stored', async () => {
    localStorage.setItem('token', 'test-token-123');
    let capturedConfig;
    api.defaults.adapter = async (config) => {
      capturedConfig = config;
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };

    await api.get('/some-endpoint');

    expect(capturedConfig.headers.Authorization).toBe('Bearer test-token-123');
  });

  it('does not attach an Authorization header when no token is stored', async () => {
    let capturedConfig;
    api.defaults.adapter = async (config) => {
      capturedConfig = config;
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };

    await api.get('/some-endpoint');

    expect(capturedConfig.headers.Authorization).toBeUndefined();
  });
});

describe('api response interceptor', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('clears stored auth on a 401 response', async () => {
    localStorage.setItem('token', 'stale-token');
    localStorage.setItem('user', JSON.stringify({ username: 'johnrovs' }));
    const assignSpy = vi.spyOn(window.location, 'assign').mockImplementation(() => {});

    api.defaults.adapter = async () => {
      const error = new Error('Unauthorized');
      error.response = { status: 401, data: { message: 'Authentication is required to access this resource.' } };
      throw error;
    };

    await expect(api.get('/admin/products')).rejects.toBeTruthy();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();

    assignSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- api.test.js`
Expected: FAIL — `api.js` doesn't exist yet.

- [ ] **Step 3: Write `api.js`**

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(normalizeError(error));
  }
);

export function normalizeError(error) {
  const data = error.response?.data;
  if (data?.errors) {
    return { message: data.message ?? 'Validation failed.', fieldErrors: data.errors };
  }
  if (data?.message) {
    return { message: data.message, fieldErrors: null };
  }
  return { message: 'Network error. Please try again.', fieldErrors: null };
}

export default api;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npm test -- api.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/api.js frontend/src/services/api.test.js
git commit -m "feat: add centralized Axios service layer with auth and error interceptors"
```

---

### Task 3: AuthContext + useAuth hook

**Files:**
- Create: `frontend/src/services/authService.js`
- Create: `frontend/src/context/AuthContext.jsx`
- Create: `frontend/src/hooks/useAuth.js`
- Test: `frontend/src/context/AuthContext.test.jsx`

**Interfaces:**
- Consumes: `api` (Task 2)
- Produces: `AuthProvider` component; `useAuth(): { user, token, isAuthenticated, isLoading, login(username, password): Promise<void>, logout(): void }` — every later component needing auth state uses this hook, never reads `localStorage` directly.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthProvider } from './AuthContext.jsx';
import { useAuth } from '../hooks/useAuth.js';
import * as authService from '../services/authService.js';

function TestConsumer() {
  const { user, isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'anonymous'}</span>
      <span data-testid="username">{user?.username ?? ''}</span>
      <button onClick={() => login('johnrovs', 'admin123')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('starts unauthenticated when localStorage is empty', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('auth-status')).toHaveTextContent('anonymous');
  });

  it('hydrates from localStorage on mount when a session exists', () => {
    localStorage.setItem('token', 'existing-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ username: 'johnrovs', fullName: 'John Rommel Rovero', role: 'ADMIN' })
    );

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('username')).toHaveTextContent('johnrovs');
  });

  it('login() persists the session and updates state', async () => {
    vi.spyOn(authService, 'loginRequest').mockResolvedValue({
      token: 'new-token',
      username: 'johnrovs',
      fullName: 'John Rommel Rovero',
      role: 'ADMIN',
    });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await user.click(screen.getByText('Login'));

    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated'));
    expect(localStorage.getItem('token')).toBe('new-token');
  });

  it('logout() clears the session', async () => {
    localStorage.setItem('token', 'existing-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ username: 'johnrovs', fullName: 'John Rommel Rovero', role: 'ADMIN' })
    );
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await user.click(screen.getByText('Logout'));

    expect(screen.getByTestId('auth-status')).toHaveTextContent('anonymous');
    expect(localStorage.getItem('token')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- AuthContext.test.jsx`
Expected: FAIL — `AuthContext.jsx`, `useAuth.js`, `authService.js` don't exist yet.

- [ ] **Step 3: Write `authService.js`**

```javascript
import api from './api.js';

export async function loginRequest(username, password) {
  const response = await api.post('/auth/login', { username, password });
  return response.data.data;
}
```

- [ ] **Step 4: Write `AuthContext.jsx`**

```jsx
import { createContext, useEffect, useReducer } from 'react';
import { loginRequest } from '../services/authService.js';

export const AuthContext = createContext(null);

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.payload, isLoading: false };
    case 'LOGIN':
      return { ...state, user: action.payload.user, token: action.payload.token, isAuthenticated: true };
    case 'LOGOUT':
      return { ...state, user: null, token: null, isAuthenticated: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      dispatch({ type: 'HYDRATE', payload: { token, user: JSON.parse(storedUser), isAuthenticated: true } });
    } else {
      dispatch({ type: 'HYDRATE', payload: {} });
    }
  }, []);

  async function login(username, password) {
    const data = await loginRequest(username, password);
    const user = { username: data.username, fullName: data.fullName, role: data.role };
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(user));
    dispatch({ type: 'LOGIN', payload: { user, token: data.token } });
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
  }

  return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>;
}
```

- [ ] **Step 5: Write `useAuth.js`**

```javascript
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd frontend && npm test -- AuthContext.test.jsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/services/authService.js frontend/src/context/AuthContext.jsx \
        frontend/src/hooks/useAuth.js frontend/src/context/AuthContext.test.jsx
git commit -m "feat: add AuthContext with localStorage-persisted session"
```

---

### Task 4: Login page

**Files:**
- Create: `frontend/src/pages/LoginPage.jsx`
- Modify: `frontend/src/App.jsx` (wrap with `AuthProvider`, add `/login` route)
- Test: `frontend/src/pages/LoginPage.test.jsx`

**Interfaces:**
- Consumes: `useAuth()` (Task 3)
- Produces: `/login` route rendering `LoginPage` — Task 5 relies on this route existing as the redirect target for unauthenticated `/admin/**` access.

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../context/AuthContext.jsx';
import LoginPage from './LoginPage.jsx';
import * as authService from '../services/authService.js';

function renderLoginPage() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<div>Admin Dashboard</div>} />
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

    expect(await screen.findByText('Username is required.')).toBeInTheDocument();
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

    await user.type(screen.getByLabelText('Username'), 'johnrovs');
    await user.type(screen.getByLabelText('Password'), 'admin123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('shows a generic error message on invalid credentials', async () => {
    vi.spyOn(authService, 'loginRequest').mockRejectedValue({ message: 'Invalid username or password.' });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Username'), 'johnrovs');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid username or password.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- LoginPage.test.jsx`
Expected: FAIL — `LoginPage.jsx` doesn't exist yet.

- [ ] **Step 3: Write `LoginPage.jsx`**

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
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
      navigate('/admin', { replace: true });
    } catch (error) {
      setFormError(error.message ?? 'Invalid username or password.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Admin Login</h1>

        {formError && (
          <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
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
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-invalid={Boolean(fieldErrors.username)}
            aria-describedby={fieldErrors.username ? 'username-error' : undefined}
          />
          {fieldErrors.username && (
            <p id="username-error" className="mt-1 text-sm text-red-600">
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
              className="w-full rounded-md border border-slate-300 px-3 py-2 pr-10 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            <p id="password-error" className="mt-1 text-sm text-red-600">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </main>
  );
}

export default LoginPage;
```

- [ ] **Step 4: Modify `App.jsx`**

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npm test -- LoginPage.test.jsx`
Expected: PASS

- [ ] **Step 6: Run the full suite to confirm no regressions**

Run: `cd frontend && npm test`
Expected: PASS (all tests from Tasks 1-4)

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/LoginPage.jsx frontend/src/pages/LoginPage.test.jsx frontend/src/App.jsx
git commit -m "feat: add login page with validation, loading, and error states"
```

---

### Task 5: ProtectedRoute + AdminLayout skeleton + protected route tree

**Files:**
- Create: `frontend/src/components/ProtectedRoute.jsx`
- Create: `frontend/src/layouts/AdminLayout.jsx`
- Create: `frontend/src/pages/admin/DashboardPage.jsx`
- Create: `frontend/src/pages/admin/ProductsPage.jsx`
- Create: `frontend/src/pages/admin/CategoriesPage.jsx`
- Create: `frontend/src/pages/admin/SettingsPage.jsx`
- Modify: `frontend/src/App.jsx` (add protected `/admin/**` routes)
- Test: `frontend/src/components/ProtectedRoute.test.jsx`

**Interfaces:**
- Consumes: `useAuth()` (Task 3)
- Produces: `ProtectedRoute` (a layout route using React Router's `<Outlet />` pattern); `AdminLayout` (minimal — Task 6 replaces its body, not its export). Task 6 modifies `AdminLayout.jsx` to add the sidebar/topbar; it does not change how `App.jsx` uses it.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ProtectedRoute from './ProtectedRoute.jsx';
import * as useAuthModule from '../hooks/useAuth.js';

function renderWithAuth(authValue) {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue(authValue);
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<div>Admin Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login when not authenticated', () => {
    renderWithAuth({ isAuthenticated: false, isLoading: false });
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders the protected content when authenticated', () => {
    renderWithAuth({ isAuthenticated: true, isLoading: false });
    expect(screen.getByText('Admin Page')).toBeInTheDocument();
  });

  it('renders nothing while the auth state is still loading', () => {
    renderWithAuth({ isAuthenticated: false, isLoading: true });
    expect(screen.queryByText('Admin Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- ProtectedRoute.test.jsx`
Expected: FAIL — `ProtectedRoute.jsx` doesn't exist yet.

- [ ] **Step 3: Write `ProtectedRoute.jsx`**

```jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
```

- [ ] **Step 4: Write the minimal `AdminLayout.jsx`**

```jsx
import { Outlet } from 'react-router-dom';

function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
```

- [ ] **Step 5: Write the four placeholder admin pages**

`src/pages/admin/DashboardPage.jsx`:
```jsx
function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-slate-500">Coming soon.</p>
    </div>
  );
}

export default DashboardPage;
```

`src/pages/admin/ProductsPage.jsx`:
```jsx
function ProductsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Products</h1>
      <p className="mt-2 text-slate-500">Coming soon.</p>
    </div>
  );
}

export default ProductsPage;
```

`src/pages/admin/CategoriesPage.jsx`:
```jsx
function CategoriesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Product Categories</h1>
      <p className="mt-2 text-slate-500">Coming soon.</p>
    </div>
  );
}

export default CategoriesPage;
```

`src/pages/admin/SettingsPage.jsx`:
```jsx
function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
      <p className="mt-2 text-slate-500">Coming soon.</p>
    </div>
  );
}

export default SettingsPage;
```

- [ ] **Step 6: Modify `App.jsx`**

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import ProductsPage from './pages/admin/ProductsPage.jsx';
import CategoriesPage from './pages/admin/CategoriesPage.jsx';
import SettingsPage from './pages/admin/SettingsPage.jsx';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<DashboardPage />} />
              <Route path="/admin/products" element={<ProductsPage />} />
              <Route path="/admin/products/new" element={<ProductsPage />} />
              <Route path="/admin/products/:id" element={<ProductsPage />} />
              <Route path="/admin/categories" element={<CategoriesPage />} />
              <Route path="/admin/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd frontend && npm test -- ProtectedRoute.test.jsx`
Expected: PASS

- [ ] **Step 8: Run the full suite to confirm no regressions**

Run: `cd frontend && npm test`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/ProtectedRoute.jsx frontend/src/components/ProtectedRoute.test.jsx \
        frontend/src/layouts/AdminLayout.jsx frontend/src/pages/admin frontend/src/App.jsx
git commit -m "feat: add protected admin route tree with placeholder pages"
```

---

### Task 6: AdminSidebar + AdminTopbar + mobile drawer

**Files:**
- Create: `frontend/src/components/AdminSidebar.jsx`
- Create: `frontend/src/components/AdminTopbar.jsx`
- Modify: `frontend/src/layouts/AdminLayout.jsx` (compose sidebar + topbar, manage mobile drawer open/close state)
- Test: `frontend/src/layouts/AdminLayout.test.jsx`

**Interfaces:**
- Consumes: `useAuth()` (Task 3), `ProtectedRoute`/route tree (Task 5)
- Produces: a fully composed `AdminLayout` — Task 7 doesn't touch this file.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AdminLayout from './AdminLayout.jsx';
import * as useAuthModule from '../hooks/useAuth.js';

function renderLayout() {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    user: { fullName: 'John Rommel Rovero' },
    logout: vi.fn(),
  });
  return render(
    <MemoryRouter initialEntries={['/admin/products']}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/admin/products" element={<div>Products Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('AdminLayout', () => {
  it('renders the sidebar nav links, topbar profile name, and routed content', () => {
    renderLayout();
    expect(screen.getByText('Products Content')).toBeInTheDocument();
    expect(screen.getByText('John Rommel Rovero')).toBeInTheDocument();
    expect(screen.getAllByText('Products').length).toBeGreaterThan(0);
  });

  it('opens the mobile sidebar drawer when the menu button is clicked', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByLabelText('Open menu'));

    expect(screen.getAllByText('Products').length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- AdminLayout.test.jsx`
Expected: FAIL — `AdminSidebar.jsx`/`AdminTopbar.jsx` don't exist yet, and `AdminLayout` doesn't render a profile name or menu button.

- [ ] **Step 3: Write `AdminSidebar.jsx`**

```jsx
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Tags, Settings, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth.js';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Product Categories', icon: Tags },
  { to: '/admin/settings', label: 'System Settings', icon: Settings },
];

function AdminSidebar({ isOpen, onClose }) {
  const { logout } = useAuth();

  const content = (
    <nav className="flex h-full flex-col bg-slate-900 px-3 py-6 text-slate-200">
      <span className="mb-8 px-3 text-lg font-bold text-white">2Go Findz</span>
      <ul className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
      <button
        onClick={logout}
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
      >
        <LogOut size={18} />
        Logout
      </button>
    </nav>
  );

  return (
    <>
      <div className="hidden md:block md:w-64 md:shrink-0">{content}</div>

      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.2 }}
            className="absolute inset-y-0 left-0 w-64"
          >
            {content}
          </motion.div>
        </div>
      )}
    </>
  );
}

export default AdminSidebar;
```

- [ ] **Step 4: Write `AdminTopbar.jsx`**

```jsx
import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

const BREADCRUMB_LABELS = {
  admin: 'Dashboard',
  products: 'Products',
  categories: 'Product Categories',
  settings: 'System Settings',
  new: 'New',
};

function buildBreadcrumbs(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  return segments.map((segment) => BREADCRUMB_LABELS[segment] ?? segment);
}

function AdminTopbar({ onMenuClick }) {
  const { user } = useAuth();
  const location = useLocation();
  const breadcrumbs = buildBreadcrumbs(location.pathname);

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
          {breadcrumbs.join(' / ')}
        </nav>
      </div>
      <span className="text-sm font-medium text-slate-700">{user?.fullName}</span>
    </header>
  );
}

export default AdminTopbar;
```

- [ ] **Step 5: Modify `AdminLayout.jsx`**

```jsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar.jsx';
import AdminTopbar from '../components/AdminTopbar.jsx';

function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex flex-1 flex-col">
        <AdminTopbar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd frontend && npm test -- AdminLayout.test.jsx`
Expected: PASS

- [ ] **Step 7: Run the full suite to confirm no regressions**

Run: `cd frontend && npm test`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/AdminSidebar.jsx frontend/src/components/AdminTopbar.jsx \
        frontend/src/layouts/AdminLayout.jsx frontend/src/layouts/AdminLayout.test.jsx
git commit -m "feat: add admin sidebar, topbar, and mobile drawer"
```

---

### Task 7: Reusable primitives (LoadingSpinner, EmptyState, ErrorState, ToastNotification) + final verification

**Files:**
- Create: `frontend/src/components/LoadingSpinner.jsx`
- Create: `frontend/src/components/EmptyState.jsx`
- Create: `frontend/src/components/ErrorState.jsx`
- Create: `frontend/src/components/ToastNotification.jsx`
- Create: `frontend/src/context/ToastContext.jsx`
- Create: `frontend/src/hooks/useToast.js`
- Modify: `frontend/src/App.jsx` (wrap the tree with `ToastProvider`)
- Test: `frontend/src/context/ToastContext.test.jsx`

**Interfaces:**
- Consumes: nothing new
- Produces: `useToast(): { showToast(message, type) }` — Frontend Stage 3's product/category/settings forms will call this after successful saves/deletes. `LoadingSpinner`, `EmptyState`, `ErrorState` are plain presentational components any later page can import directly.

- [ ] **Step 1: Write the failing test**

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from './ToastContext.jsx';
import { useToast } from '../hooks/useToast.js';

function TestTrigger() {
  const { showToast } = useToast();
  return <button onClick={() => showToast('Product saved successfully.', 'success')}>Trigger</button>;
}

describe('ToastContext', () => {
  it('shows a toast when showToast is called and it can be dismissed', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestTrigger />
      </ToastProvider>
    );

    await user.click(screen.getByText('Trigger'));
    expect(await screen.findByText('Product saved successfully.')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Dismiss notification'));
    await waitFor(() => expect(screen.queryByText('Product saved successfully.')).not.toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- ToastContext.test.jsx`
Expected: FAIL — none of the classes below exist yet.

- [ ] **Step 3: Write `LoadingSpinner.jsx`, `EmptyState.jsx`, `ErrorState.jsx`**

`src/components/LoadingSpinner.jsx`:
```jsx
function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
      <span className="text-sm text-slate-500">{label}</span>
    </div>
  );
}

export default LoadingSpinner;
```

`src/components/EmptyState.jsx`:
```jsx
function EmptyState({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-16 text-center">
      <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
      {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
    </div>
  );
}

export default EmptyState;
```

`src/components/ErrorState.jsx`:
```jsx
function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-lg bg-red-50 py-12 text-center">
      <p className="text-sm font-medium text-red-700">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export default ErrorState;
```

- [ ] **Step 4: Write `ToastNotification.jsx`**

```jsx
import { CheckCircle, XCircle, X } from 'lucide-react';

const STYLES = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  error: 'bg-red-50 text-red-800 border-red-200',
};

function ToastNotification({ message, type = 'success', onDismiss }) {
  const Icon = type === 'error' ? XCircle : CheckCircle;
  return (
    <div role="status" className={`flex items-center gap-2 rounded-lg border px-4 py-3 shadow-sm ${STYLES[type]}`}>
      <Icon size={18} />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onDismiss} aria-label="Dismiss notification" className="ml-2 opacity-60 hover:opacity-100">
        <X size={16} />
      </button>
    </div>
  );
}

export default ToastNotification;
```

- [ ] **Step 5: Write `ToastContext.jsx` and `useToast.js`**

`src/context/ToastContext.jsx`:
```jsx
import { createContext, useCallback, useState } from 'react';
import ToastNotification from '../components/ToastNotification.jsx';

export const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = nextId++;
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastNotification key={toast.id} {...toast} onDismiss={() => dismissToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
```

`src/hooks/useToast.js`:
```javascript
import { useContext } from 'react';
import { ToastContext } from '../context/ToastContext.jsx';

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
```

- [ ] **Step 6: Modify `App.jsx`**

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import ProductsPage from './pages/admin/ProductsPage.jsx';
import CategoriesPage from './pages/admin/CategoriesPage.jsx';
import SettingsPage from './pages/admin/SettingsPage.jsx';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<DashboardPage />} />
                <Route path="/admin/products" element={<ProductsPage />} />
                <Route path="/admin/products/new" element={<ProductsPage />} />
                <Route path="/admin/products/:id" element={<ProductsPage />} />
                <Route path="/admin/categories" element={<CategoriesPage />} />
                <Route path="/admin/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd frontend && npm test -- ToastContext.test.jsx`
Expected: PASS

- [ ] **Step 8: Run the full suite and production build**

Run: `cd frontend && npm test`
Expected: PASS — every test from Tasks 1 through 7.

Run: `npm run build`
Expected: production build succeeds with no errors.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/LoadingSpinner.jsx frontend/src/components/EmptyState.jsx \
        frontend/src/components/ErrorState.jsx frontend/src/components/ToastNotification.jsx \
        frontend/src/context/ToastContext.jsx frontend/src/context/ToastContext.test.jsx \
        frontend/src/hooks/useToast.js frontend/src/App.jsx
git commit -m "feat: add reusable loading/empty/error states and toast notifications"
```
