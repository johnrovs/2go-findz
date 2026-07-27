# Frontend Stage 1: Core — Design

**Date:** 2026-07-26
**Scope:** First frontend implementation stage. Vite/React/Tailwind scaffolding, centralized Axios service layer, authentication (context + login page), protected routing, and a fully navigable admin shell with placeholder pages for the sections later stages will fill in.

**Master spec:** `docs/PROJECT_SPEC.md`. **Backend stages this depends on:** `docs/superpowers/plans/2026-07-26-backend-foundation.md` and `docs/superpowers/plans/2026-07-26-backend-analytics-media.md` (both merged to `master`) — this stage consumes `POST /api/auth/login` and relies on the existing CORS config (`app.cors.allowed-origin`, defaulting to `http://localhost:5173`).

## Out of scope for this stage

- The real public homepage (hero, product grid, search/filter/sort) — Frontend Stage 2
- Real admin CRUD screens for products/categories/settings, and dashboard charts — Frontend Stage 3
- Deployment configuration (Netlify) — later stage per the CLAUDE.md workflow

## Tech stack and tooling

- React (plain JavaScript/JSX, not TypeScript — matches the spec's literal "React JS")
- Vite (dev server + build)
- Tailwind CSS
- React Router DOM
- Axios
- Framer Motion (entrance/transition animations, used lightly in this stage — mostly for the sidebar drawer)
- Lucide React (icons)
- Vitest + React Testing Library (tests written per-task via TDD, not deferred to a separate testing stage — same approach used for the backend)
- npm (package manager)

## Folder structure (per CLAUDE.md)

```
frontend/
├── src/
│   ├── components/       (ProtectedRoute, LoadingSpinner, EmptyState, ErrorState, ToastNotification, AdminSidebar, AdminTopbar)
│   ├── pages/             (LoginPage, admin/DashboardPage, admin/ProductsPage, admin/CategoriesPage, admin/SettingsPage, HomePage-placeholder)
│   ├── layouts/           (AdminLayout)
│   ├── hooks/             (useAuth)
│   ├── services/          (api.js — Axios instance + interceptors, authService.js)
│   ├── utils/
│   ├── context/           (AuthContext.jsx, ToastContext.jsx)
│   └── assets/
├── .env.example
└── vite.config.js
```

## Axios service layer

Single Axios instance (`services/api.js`) with `baseURL` from `import.meta.env.VITE_API_BASE_URL`.

- **Request interceptor:** reads the JWT from `localStorage` (if present) and attaches `Authorization: Bearer <token>`.
- **Response interceptor:** on a `401`, clears stored auth state and redirects to `/login` (handles both expired and invalid tokens uniformly — the backend doesn't distinguish these either). On any error, normalizes the backend's `ApiResponse`/`ValidationErrorResponse` shapes into a single consistent error object (`{ message, fieldErrors }`) so components never branch on which envelope shape came back.

## Authentication

- **Token storage:** `localStorage` (survives refresh/restart — chosen over in-memory-only for admin-dashboard usability; standard XSS considerations apply and are mitigated by React's default escaping and avoiding `dangerouslySetInnerHTML` anywhere in this codebase).
- **`AuthContext`** (React Context + `useReducer`): holds `user`, `token`, `isAuthenticated`, exposes `login(username, password)` and `logout()`. Hydrates from `localStorage` on app mount so a refresh doesn't lose the session.
- **`ProtectedRoute`** component: wraps every `/admin/**` route; redirects to `/login` (preserving the attempted destination) when `isAuthenticated` is false.
- **Login page:** username + password fields, `@` show/hide password toggle, client-side required-field validation, loading state during submission, generic "Invalid username or password" message on 401 (never distinguishing "user not found" from "wrong password" — matches the backend's own anti-enumeration behavior), redirects to `/admin` on success.

## Admin shell

- **`AdminLayout`**: composes `AdminSidebar` + `AdminTopbar` + a content outlet (`<Outlet />` from React Router).
- **`AdminSidebar`**: nav links — Dashboard, Products, Product Categories, System Settings, Logout. Collapses into a mobile drawer (Framer Motion slide-in) below the `md` breakpoint, toggled from `AdminTopbar`'s hamburger button.
- **`AdminTopbar`**: breadcrumbs (derived from the current route), admin profile area (full name from `AuthContext`), mobile hamburger toggle.
- **Placeholder pages**: `DashboardPage`, `ProductsPage`, `CategoriesPage`, `SettingsPage` each render a page title and a "Coming soon" placeholder — proving the shell, routing, and protected-route behavior work end-to-end. Frontend Stage 3 replaces these bodies with real functionality; the page components themselves, their routes, and the sidebar links do not change.

## Reusable primitives built in this stage

`ProtectedRoute`, `AdminSidebar`, `AdminTopbar`, `LoadingSpinner`, `EmptyState`, `ErrorState`, `ToastNotification` (a lightweight `ToastContext` + component — not a third-party toast library, matching the spec's explicit reusable-component list).

## Routes

```
/                       Placeholder public homepage (Frontend Stage 2 replaces this)
/login                  Login page
/admin                  Dashboard (protected)
/admin/products         Products placeholder (protected)
/admin/products/new     Add product placeholder (protected)
/admin/products/:id     Edit product placeholder (protected)
/admin/categories       Categories placeholder (protected)
/admin/settings         Settings placeholder (protected)
```

## Environment variables

`frontend/.env.example`:
```
VITE_API_BASE_URL=http://localhost:8080/api
```

No backend changes needed — the backend's `FRONTEND_URL`/CORS config already defaults to Vite's dev port (`http://localhost:5173`).

## Testing

Vitest + React Testing Library, colocated with source (`ComponentName.test.jsx`):
- Login form: renders, required-field validation, loading state during submit, error message on 401, redirect to `/admin` on success (mocking the Axios call).
- `ProtectedRoute`: redirects to `/login` when unauthenticated, renders children when authenticated.
- `AuthContext`: `login()` persists token/user to `localStorage` and updates state; `logout()` clears both; hydration on mount reads existing `localStorage` state correctly.
