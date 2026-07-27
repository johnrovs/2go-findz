# Public Navbar Redesign & Dedicated Catalog Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the logo-only `Navbar` with full public navigation (links, Categories dropdown, mobile drawer, search modal), and add three dedicated catalog routes (`/trending`, `/categories`, `/best-sellers`) that reuse the homepage's existing catalog machinery via a new shared `CatalogPage` component.

**Architecture:** `CatalogPage` extracts the homepage's catalog section (search/filters/grid/pagination, driven by the existing `useProductSearch()`) into a reusable body that seeds its filter/category from props only when the URL doesn't already specify them, then defers entirely to normal URL-param behavior. `TrendingPage`/`BestSellersPage`/`CategoriesPage` (public) are thin wrappers around it. `Navbar` gains a Categories dropdown (real category data), a `MobileMenu` (mirrors `AdminSidebar`'s existing drawer pattern), and a `SearchModal` (built on the existing, now-portal-safe `Modal`).

**Tech Stack:** Same as prior stages — React JS/JSX, Vite, Tailwind, React Router DOM, Framer Motion, Lucide React, Vitest + React Testing Library. No new dependencies, no backend changes.

## Global Constraints

- Full design detail: `docs/superpowers/specs/2026-07-27-public-navbar-routes-design.md`. New scope beyond `docs/PROJECT_SPEC.md`, same as the Hero Banners stage.
- Compare and Buying Guides are **not** added to the navbar or routing in this stage — deferred to their own later stages.
- No product detail page exists — search results and catalog cards continue to link straight to Amazon; the search modal routes back to the catalog (`/?search=...#catalog`), never to a nonexistent detail page.
- `Modal` is already portal-safe (Hero Banners stage fix) — safe to open `SearchModal` from any page.
- Reused as-is, no modifications: `Modal`, `SearchInput`, `ProductFilters`, `ProductGrid`, `Pagination`, `SectionHeading`, `CategoryCard`, `LoadingSpinner`, `EmptyState`, `ErrorState`, `useProductSearch`, `getImageUrl`, `productService.searchProducts`, `categoryService.getCategories`, `settingsService.getSettings`.
- TDD throughout: write the failing test, confirm RED, implement, confirm GREEN, run the full suite, commit — every task except Task 8 (a pure comment addition with no observable behavior change, verified by re-running existing tests rather than a new failing test).
- Accessible by default: visible focus states, `aria-expanded`/`aria-haspopup` on the Categories dropdown trigger, `aria-current` via `NavLink`'s built-in active-link handling, `Escape`-to-close on both the mobile menu and search modal.
- Never commit `.env`.

---

### Task 1: `MobileMenu`

**Files:**
- Create: `frontend/src/components/MobileMenu.jsx`
- Test: `frontend/src/components/MobileMenu.test.jsx`

**Interfaces:**
- Produces: `MobileMenu({ isOpen, onClose, onSearchClick })` (default export). Renders `null` when `isOpen` is falsy. Links: Home (`/`, exact match), Trending (`/trending`), Categories (`/categories`), Best Sellers (`/best-sellers`) — flat, no nested dropdown (unlike the desktop Categories dropdown). Calls `onClose()` when a link is clicked, when the search button is clicked (before `onSearchClick()`), or on `Escape`. Used by `Navbar` (Task 3).

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import MobileMenu from './MobileMenu.jsx';

function renderMenu(props) {
  return render(
    <MemoryRouter>
      <MobileMenu isOpen onClose={vi.fn()} onSearchClick={vi.fn()} {...props} />
    </MemoryRouter>
  );
}

describe('MobileMenu', () => {
  it('renders nothing when closed', () => {
    render(
      <MemoryRouter>
        <MobileMenu isOpen={false} onClose={vi.fn()} onSearchClick={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
  });

  it('renders the nav links and a search button when open', () => {
    renderMenu();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trending' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Categories' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Best Sellers' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('calls onClose when a nav link is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderMenu({ onClose });

    await user.click(screen.getByRole('link', { name: 'Trending' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose and onSearchClick when the search button is clicked', async () => {
    const onClose = vi.fn();
    const onSearchClick = vi.fn();
    const user = userEvent.setup();
    renderMenu({ onClose, onSearchClick });

    await user.click(screen.getByRole('button', { name: /search/i }));

    expect(onClose).toHaveBeenCalled();
    expect(onSearchClick).toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderMenu({ onClose });

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- MobileMenu.test.jsx`
Expected: FAIL — `MobileMenu.jsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/trending', label: 'Trending' },
  { to: '/categories', label: 'Categories' },
  { to: '/best-sellers', label: 'Best Sellers' },
];

function MobileMenu({ isOpen, onClose, onSearchClick }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
          <ul className="flex-1 space-y-1">
            {NAV_ITEMS.map(({ to, label, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center rounded-md px-3 py-2 text-sm font-medium transition ${
                      isActive ? 'bg-indigo-50 text-indigo-600' : 'text-slate-700 hover:bg-slate-100'
                    }`
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSearchClick();
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <Search size={16} />
                Search
              </button>
            </li>
          </ul>
        </nav>
      </motion.div>
    </div>
  );
}

export default MobileMenu;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- MobileMenu.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/MobileMenu.jsx frontend/src/components/MobileMenu.test.jsx
git commit -m "feat: add MobileMenu for public navigation"
```

---

### Task 2: `SearchModal`

**Files:**
- Create: `frontend/src/components/SearchModal.jsx`
- Test: `frontend/src/components/SearchModal.test.jsx`

**Interfaces:**
- Consumes: `Modal` (existing, `{ isOpen, onClose, title, children }`), `SearchInput` (existing, `{ value, onChange }`), `searchProducts` (existing, `productService.js`), `getImageUrl` (existing).
- Produces: `SearchModal({ isOpen, onClose })` (default export). Used by `Navbar` (Task 3).

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import SearchModal from './SearchModal.jsx';
import * as productService from '../services/productService.js';

const product = {
  id: 1,
  name: 'Wireless Earbuds',
  imageFileName: null,
  productPrice: '49.99',
};

function renderModal(props) {
  return render(
    <MemoryRouter>
      <SearchModal isOpen onClose={vi.fn()} {...props} />
    </MemoryRouter>
  );
}

describe('SearchModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows live results as the user types', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [product],
      totalPages: 1,
      totalElements: 1,
    });
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Search products'), 'earbuds');

    expect(await screen.findByText('Wireless Earbuds')).toBeInTheDocument();
    expect(screen.getByText('$49.99')).toBeInTheDocument();
  });

  it('shows a "No products found" empty state when there are no matches', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [],
      totalPages: 0,
      totalElements: 0,
    });
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Search products'), 'zzz');

    expect(await screen.findByText('No products found')).toBeInTheDocument();
  });

  it('shows an error state when the search fails', async () => {
    vi.spyOn(productService, 'searchProducts').mockRejectedValue({
      message: 'Network error. Please try again.',
    });
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Search products'), 'earbuds');

    expect(await screen.findByText('Network error. Please try again.')).toBeInTheDocument();
  });

  it('navigates to the catalog with the search term and closes when a result is clicked', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [product],
      totalPages: 1,
      totalElements: 1,
    });
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/trending']}>
        <Routes>
          <Route path="/trending" element={<SearchModal isOpen onClose={onClose} />} />
          <Route path="/" element={<div>Homepage Catalog</div>} />
        </Routes>
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('Search products'), 'earbuds');
    await screen.findByText('Wireless Earbuds');
    await user.click(screen.getByText('Wireless Earbuds'));

    expect(onClose).toHaveBeenCalled();
    expect(await screen.findByText('Homepage Catalog')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- SearchModal.test.jsx`
Expected: FAIL — `SearchModal.jsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal.jsx';
import SearchInput from './SearchInput.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import EmptyState from './EmptyState.jsx';
import ErrorState from './ErrorState.jsx';
import { searchProducts } from '../services/productService.js';
import { getImageUrl } from '../utils/imageUrl.js';

function SearchModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) return;
    // Resetting the modal's internal state when it closes is the standard
    // cleanup-on-close pattern; it can't cascade since `isOpen` isn't touched here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery('');
    setResults([]);
    setError(null);
  }, [isOpen]);

  useEffect(() => {
    let isCancelled = false;
    const trimmed = query.trim();

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);

    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    searchProducts({ search: trimmed, page: 0, size: 5 })
      .then((data) => {
        if (isCancelled) return;
        setResults(data.content);
      })
      .catch((err) => {
        if (isCancelled) return;
        setError(err.message ?? 'Failed to search products.');
      })
      .finally(() => {
        if (isCancelled) return;
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [query]);

  function goToResults(term) {
    onClose();
    navigate(`/?search=${encodeURIComponent(term)}#catalog`);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (query.trim()) {
      goToResults(query.trim());
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Search Products">
      <form onSubmit={handleSubmit}>
        <SearchInput value={query} onChange={setQuery} />
      </form>

      <div className="mt-4">
        {isLoading && <LoadingSpinner label="Searching..." />}
        {!isLoading && error && <ErrorState message={error} />}
        {!isLoading && !error && query.trim() && results.length === 0 && (
          <EmptyState title="No products found" description="Try a different search term." />
        )}
        {!isLoading && !error && results.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {results.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => goToResults(query.trim())}
                  className="flex w-full items-center gap-3 py-3 text-left hover:bg-slate-50"
                >
                  {getImageUrl(product.imageFileName) ? (
                    <img
                      src={getImageUrl(product.imageFileName)}
                      alt={product.name}
                      className="h-12 w-12 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 shrink-0 rounded-md bg-slate-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{product.name}</p>
                    <p className="text-sm text-slate-500">${Number(product.productPrice).toFixed(2)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

export default SearchModal;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- SearchModal.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/SearchModal.jsx frontend/src/components/SearchModal.test.jsx
git commit -m "feat: add SearchModal with live results"
```

---

### Task 3: `Navbar` rewrite

**Files:**
- Modify: `frontend/src/components/Navbar.jsx` (replace the logo-only body entirely)
- Test: `frontend/src/components/Navbar.test.jsx` (new — no prior test file existed for this component)

**Interfaces:**
- Consumes: `MobileMenu` from Task 1, `SearchModal` from Task 2, `getCategories` (existing, `categoryService.js`).
- Produces: `Navbar()` (default export, no props — unchanged from before). Used by `HomePage` and `CatalogPage` (Task 4).

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Navbar from './Navbar.jsx';
import * as categoryService from '../services/categoryService.js';

function renderNavbar(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Navbar />
    </MemoryRouter>
  );
}

describe('Navbar', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([{ id: 1, productCategoryName: 'Electronics' }]);
  });

  it('renders the main nav links', () => {
    renderNavbar();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trending' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Best Sellers' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Categories' })).toBeInTheDocument();
  });

  it('highlights the active route', () => {
    renderNavbar(['/trending']);
    expect(screen.getByRole('link', { name: 'Trending' })).toHaveClass('text-indigo-600');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveClass('text-indigo-600');
  });

  it('opens the categories dropdown and lists fetched categories', async () => {
    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getByRole('button', { name: 'Categories' }));

    expect(await screen.findByRole('menuitem', { name: 'Electronics' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'All Categories' })).toHaveAttribute('href', '/categories');
    expect(screen.getByRole('menuitem', { name: 'Electronics' })).toHaveAttribute('href', '/categories?category=1');
  });

  it('closes the categories dropdown on outside click', async () => {
    const user = userEvent.setup();
    renderNavbar();
    await user.click(screen.getByRole('button', { name: 'Categories' }));
    await screen.findByRole('menuitem', { name: 'Electronics' });

    await user.click(document.body);

    await waitFor(() => expect(screen.queryByRole('menuitem', { name: 'Electronics' })).not.toBeInTheDocument());
  });

  it('opens the mobile menu when the hamburger button is clicked', async () => {
    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(screen.getAllByRole('link', { name: 'Trending' }).length).toBeGreaterThan(1);
  });

  it('opens the search modal when the search button is clicked', async () => {
    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getByRole('button', { name: 'Open search' }));

    expect(await screen.findByRole('dialog', { name: 'Search Products' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- Navbar.test.jsx`
Expected: FAIL — the current `Navbar` renders only the logo.

- [ ] **Step 3: Write the new `Navbar.jsx`**

```jsx
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ChevronDown, Menu, Search } from 'lucide-react';
import logo from '../assets/2gofindz.png';
import MobileMenu from './MobileMenu.jsx';
import SearchModal from './SearchModal.jsx';
import { getCategories } from '../services/categoryService.js';

const navLinkClassName = ({ isActive }) =>
  `text-sm font-medium transition ${isActive ? 'text-indigo-600' : 'text-slate-700 hover:text-indigo-600'}`;

function Navbar() {
  const [categories, setCategories] = useState([]);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const categoriesRef = useRef(null);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!isCategoriesOpen) return undefined;

    function handleClickOutside(event) {
      if (categoriesRef.current && !categoriesRef.current.contains(event.target)) {
        setIsCategoriesOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsCategoriesOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCategoriesOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="2Go Findz home">
            <img src={logo} alt="2Go Findz" className="h-10 w-10" />
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-6 md:flex">
            <NavLink to="/" end className={navLinkClassName}>
              Home
            </NavLink>
            <NavLink to="/trending" className={navLinkClassName}>
              Trending
            </NavLink>
            <div ref={categoriesRef} className="relative">
              <button
                type="button"
                onClick={() => setIsCategoriesOpen((open) => !open)}
                aria-expanded={isCategoriesOpen}
                aria-haspopup="menu"
                className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-indigo-600"
              >
                Categories
                <ChevronDown size={16} />
              </button>
              {isCategoriesOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-full mt-2 w-56 rounded-md border border-slate-200 bg-white py-2 shadow-lg"
                >
                  <Link
                    to="/categories"
                    role="menuitem"
                    onClick={() => setIsCategoriesOpen(false)}
                    className="block px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
                  >
                    All Categories
                  </Link>
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      to={`/categories?category=${category.id}`}
                      role="menuitem"
                      onClick={() => setIsCategoriesOpen(false)}
                      className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {category.productCategoryName}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <NavLink to="/best-sellers" className={navLinkClassName}>
              Best Sellers
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Open search"
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
            >
              <Search size={20} />
            </button>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onSearchClick={() => setIsSearchOpen(true)}
      />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}

export default Navbar;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- Navbar.test.jsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Navbar.jsx frontend/src/components/Navbar.test.jsx
git commit -m "feat: rewrite Navbar with nav links, Categories dropdown, mobile menu, and search"
```

---

### Task 4: `CatalogPage`

**Files:**
- Create: `frontend/src/components/CatalogPage.jsx`
- Test: `frontend/src/components/CatalogPage.test.jsx`

**Interfaces:**
- Consumes: `Navbar` (Task 3), `Footer`/`SectionHeading`/`SearchInput`/`ProductFilters`/`ProductGrid`/`Pagination` (existing), `useProductSearch` (existing), `getSettings`/`getCategories` (existing).
- Produces: `CatalogPage({ title, description, initialFilter, initialCategoryId, children })` (default export). `children` renders between `Navbar` and the catalog section (used by the public `CategoriesPage` in Task 6 to insert a category-card grid without duplicating `Navbar`). Used by `TrendingPage`/`BestSellersPage` (Task 5) and `CategoriesPage` (Task 6).

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CatalogPage from './CatalogPage.jsx';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';
import * as productService from '../services/productService.js';

const settings = { affiliateDisclosure: 'As an Amazon Associate...' };
const categories = [{ id: 1, productCategoryName: 'Electronics' }];
const product = {
  id: 1,
  name: 'Wireless Earbuds',
  categoryName: 'Electronics',
  imageFileName: null,
  productPrice: '49.99',
  productLink: 'https://amazon.com/dp/example',
  trending: true,
  bestSeller: false,
  active: true,
  createdAt: '2026-07-20T10:00:00',
};

function renderCatalog(props, initialEntries = ['/trending']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CatalogPage title="Trending Finds" {...props} />
    </MemoryRouter>
  );
}

describe('CatalogPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue(settings);
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue(categories);
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [product],
      totalPages: 1,
      totalElements: 1,
    });
  });

  it('renders the title and fetched products', async () => {
    renderCatalog();
    expect(await screen.findByRole('heading', { name: 'Trending Finds' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('Wireless Earbuds').length).toBeGreaterThan(0));
  });

  it('seeds the filter from initialFilter when the URL has no filter param', async () => {
    renderCatalog({ initialFilter: 'trending' });

    await waitFor(() =>
      expect(productService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ trending: true }))
    );
  });

  it('does not override an explicit URL filter with initialFilter', async () => {
    renderCatalog({ initialFilter: 'trending' }, ['/trending?filter=bestSeller']);

    await waitFor(() =>
      expect(productService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ bestSeller: true }))
    );
    const lastCallParams = productService.searchProducts.mock.calls.at(-1)[0];
    expect(lastCallParams.trending).toBeUndefined();
  });

  it('seeds the category from initialCategoryId when the URL has no category param', async () => {
    renderCatalog({ initialCategoryId: 1 });

    await waitFor(() =>
      expect(productService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ categoryId: '1' }))
    );
  });

  it('renders children between the navbar and the catalog section', async () => {
    renderCatalog({ children: <div>Extra Content</div> });
    expect(await screen.findByText('Extra Content')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- CatalogPage.test.jsx`
Expected: FAIL — `CatalogPage.jsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import SectionHeading from './SectionHeading.jsx';
import SearchInput from './SearchInput.jsx';
import ProductFilters from './ProductFilters.jsx';
import ProductGrid from './ProductGrid.jsx';
import Pagination from './Pagination.jsx';
import { useProductSearch } from '../hooks/useProductSearch.js';
import { getSettings } from '../services/settingsService.js';
import { getCategories } from '../services/categoryService.js';

function CatalogPage({ title, description, initialFilter, initialCategoryId, children }) {
  const [searchParams] = useSearchParams();
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const productSearch = useProductSearch();

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (initialFilter && !searchParams.has('filter')) {
      productSearch.setFilter(initialFilter);
    }
    if (initialCategoryId && !searchParams.has('category')) {
      productSearch.setCategoryId(String(initialCategoryId));
    }
    // Seeding from initialFilter/initialCategoryId is intentionally a mount-only concern:
    // once the URL has its own filter/category value (whether from this seed or a later
    // user action), this effect must never overwrite it again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      {children}
      <section className="scroll-mt-20 bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title={title} description={description} />
          <div className="mb-6">
            <SearchInput value={productSearch.search} onChange={productSearch.setSearch} />
          </div>
          <div className="mb-8">
            <ProductFilters
              filter={productSearch.filter}
              onFilterChange={productSearch.setFilter}
              categoryId={productSearch.categoryId}
              categories={categories}
              onCategoryChange={productSearch.setCategoryId}
              sort={productSearch.sort}
              onSortChange={productSearch.setSort}
            />
          </div>
          <ProductGrid products={productSearch.products} isLoading={productSearch.isLoading} error={productSearch.error} />
          <Pagination page={productSearch.page} totalPages={productSearch.totalPages} onPageChange={productSearch.setPage} />
        </div>
      </section>
      <Footer settings={settings} />
    </div>
  );
}

export default CatalogPage;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- CatalogPage.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/CatalogPage.jsx frontend/src/components/CatalogPage.test.jsx
git commit -m "feat: add CatalogPage, extracting the homepage catalog into a reusable page body"
```

---

### Task 5: `TrendingPage` and `BestSellersPage`

**Files:**
- Create: `frontend/src/pages/TrendingPage.jsx`
- Create: `frontend/src/pages/BestSellersPage.jsx`
- Test: `frontend/src/pages/TrendingPage.test.jsx`
- Test: `frontend/src/pages/BestSellersPage.test.jsx`

**Interfaces:**
- Consumes: `CatalogPage` from Task 4, exact props `{ title, description, initialFilter }`.
- Produces: `TrendingPage()` and `BestSellersPage()` (default exports, no props). Used by `App.jsx` routing (Task 7).

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import TrendingPage from './TrendingPage.jsx';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';
import * as productService from '../services/productService.js';

describe('TrendingPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({});
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([]);
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
  });

  it('renders the Trending Finds title and seeds the trending filter', async () => {
    render(
      <MemoryRouter initialEntries={['/trending']}>
        <TrendingPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Trending Finds' })).toBeInTheDocument();
    expect(productService.searchProducts).toHaveBeenCalledWith(expect.objectContaining({ trending: true }));
  });
});
```

```jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BestSellersPage from './BestSellersPage.jsx';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';
import * as productService from '../services/productService.js';

describe('BestSellersPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({});
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([]);
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
  });

  it('renders the Best Sellers title and seeds the bestSeller filter', async () => {
    render(
      <MemoryRouter initialEntries={['/best-sellers']}>
        <BestSellersPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Best Sellers' })).toBeInTheDocument();
    expect(productService.searchProducts).toHaveBeenCalledWith(expect.objectContaining({ bestSeller: true }));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npm test -- TrendingPage.test.jsx BestSellersPage.test.jsx`
Expected: FAIL — neither page component exists yet.

- [ ] **Step 3: Write the implementations**

```jsx
import CatalogPage from '../components/CatalogPage.jsx';

function TrendingPage() {
  return <CatalogPage title="Trending Finds" description="See what's trending right now." initialFilter="trending" />;
}

export default TrendingPage;
```

```jsx
import CatalogPage from '../components/CatalogPage.jsx';

function BestSellersPage() {
  return <CatalogPage title="Best Sellers" description="Our most popular picks." initialFilter="bestSeller" />;
}

export default BestSellersPage;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npm test -- TrendingPage.test.jsx BestSellersPage.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/TrendingPage.jsx frontend/src/pages/TrendingPage.test.jsx frontend/src/pages/BestSellersPage.jsx frontend/src/pages/BestSellersPage.test.jsx
git commit -m "feat: add TrendingPage and BestSellersPage"
```

---

### Task 6: Public `CategoriesPage`

**Files:**
- Create: `frontend/src/pages/CategoriesPage.jsx` (public — distinct from the existing admin `frontend/src/pages/admin/CategoriesPage.jsx`, different directory, no collision)
- Test: `frontend/src/pages/CategoriesPage.test.jsx`

**Interfaces:**
- Consumes: `CatalogPage` from Task 4 (via its `children` prop), `CategoryCard`/`SectionHeading` (existing), `getCategories` (existing).
- Produces: `CategoriesPage()` (default export, no props). Used by `App.jsx` routing (Task 7).

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CategoriesPage from './CategoriesPage.jsx';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';
import * as productService from '../services/productService.js';

const categories = [{ id: 1, productCategoryName: 'Electronics' }];

function renderPage(initialEntries = ['/categories']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CategoriesPage />
    </MemoryRouter>
  );
}

describe('CategoriesPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({});
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue(categories);
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
  });

  it('renders the category card grid and the catalog title', async () => {
    renderPage();

    expect(await screen.findByText('Shop by Category')).toBeInTheDocument();
    expect(screen.getAllByText('Electronics').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Categories' })).toBeInTheDocument();
  });

  it('filters the catalog to the clicked category', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Shop by Category');

    await user.click(screen.getByRole('button', { name: 'Electronics' }));

    await waitFor(() =>
      expect(productService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ categoryId: '1' }))
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npm test -- src/pages/CategoriesPage.test.jsx`
Expected: FAIL — `frontend/src/pages/CategoriesPage.jsx` does not exist yet.

- [ ] **Step 3: Write the implementation**

```jsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CatalogPage from '../components/CatalogPage.jsx';
import CategoryCard from '../components/CategoryCard.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import { getCategories } from '../services/categoryService.js';

function CategoriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  function handleCategorySelect(categoryId) {
    const next = new URLSearchParams(searchParams);
    next.set('category', String(categoryId));
    setSearchParams(next);
  }

  return (
    <CatalogPage title="Categories" description="Browse curated recommendations by category.">
      {categories.length > 0 && (
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading title="Shop by Category" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} onClick={handleCategorySelect} />
              ))}
            </div>
          </div>
        </section>
      )}
    </CatalogPage>
  );
}

export default CategoriesPage;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npm test -- src/pages/CategoriesPage.test.jsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/CategoriesPage.jsx frontend/src/pages/CategoriesPage.test.jsx
git commit -m "feat: add public CategoriesPage with category-card grid"
```

---

### Task 7: Wire the new routes into `App.jsx`

**Files:**
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `TrendingPage`/`BestSellersPage` (Task 5), public `CategoriesPage` (Task 6).
- Produces: the complete `/trending`, `/categories`, `/best-sellers` routes — terminal for the routing concern of this stage. No dedicated test file; covered by Tasks 5/6's own page tests plus this task's full-suite verification.

**Note:** the existing admin `import CategoriesPage from './pages/admin/CategoriesPage.jsx';` stays untouched — the new public one is imported under an alias to avoid a name collision.

- [ ] **Step 1: Modify `App.jsx`**

Add imports (alongside the existing `HomePage` import):
```javascript
import TrendingPage from './pages/TrendingPage.jsx';
import BestSellersPage from './pages/BestSellersPage.jsx';
import PublicCategoriesPage from './pages/CategoriesPage.jsx';
```

Add routes (alongside the existing `<Route path="/" element={<HomePage />} />`):
```jsx
<Route path="/trending" element={<TrendingPage />} />
<Route path="/categories" element={<PublicCategoriesPage />} />
<Route path="/best-sellers" element={<BestSellersPage />} />
```

The full updated file:

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import TrendingPage from './pages/TrendingPage.jsx';
import BestSellersPage from './pages/BestSellersPage.jsx';
import PublicCategoriesPage from './pages/CategoriesPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import ProductsPage from './pages/admin/ProductsPage.jsx';
import ProductFormPage from './pages/admin/ProductFormPage.jsx';
import CategoriesPage from './pages/admin/CategoriesPage.jsx';
import SettingsPage from './pages/admin/SettingsPage.jsx';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/trending" element={<TrendingPage />} />
              <Route path="/categories" element={<PublicCategoriesPage />} />
              <Route path="/best-sellers" element={<BestSellersPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<DashboardPage />} />
                  <Route path="/admin/products" element={<ProductsPage />} />
                  <Route path="/admin/products/new" element={<ProductFormPage />} />
                  <Route path="/admin/products/:id" element={<ProductFormPage />} />
                  <Route path="/admin/categories" element={<CategoriesPage />} />
                  <Route path="/admin/settings" element={<SettingsPage />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
```

- [ ] **Step 2: Run the full suite to confirm no regressions**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus all tests from Tasks 1 through 6.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: wire /trending, /categories, /best-sellers routes into App.jsx"
```

---

### Task 8: Newsletter placeholder comment in `Footer`

**Files:**
- Modify: `frontend/src/components/Footer.jsx`

**Interfaces:**
- Produces: no new observable behavior — a comment-only addition. `Footer`'s existing props/rendering are otherwise unchanged.

**Note:** this task has no RED step — a comment produces no observable DOM difference, so there's nothing a failing test could assert. Verification is re-running the existing `Footer.test.jsx` to confirm zero regression.

- [ ] **Step 1: Modify `Footer.jsx`**

Add the commented-out block (with the exact marker text the source doc requires) just before the copyright line:

```jsx
import SocialLinks from './SocialLinks.jsx';
import AffiliateDisclosure from './AffiliateDisclosure.jsx';

function Footer({ settings }) {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 text-center sm:px-6 lg:px-8">
        <span className="text-lg font-bold text-slate-900">2Go Findz</span>
        <SocialLinks settings={settings} />
        <AffiliateDisclosure text={settings?.affiliateDisclosure} />
        {settings?.contactEmail && (
          <a href={`mailto:${settings.contactEmail}`} className="text-sm text-indigo-600 hover:underline">
            {settings.contactEmail}
          </a>
        )}
        {/* TODO: Enable newsletter functionality in a future deployment. */}
        {/* <NewsletterSignup /> */}
        <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} 2Go Findz. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default Footer;
```

- [ ] **Step 2: Run the existing Footer tests to confirm no regression**

Run: `cd frontend && npm test -- Footer.test.jsx`
Expected: PASS (3 tests, unchanged)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Footer.jsx
git commit -m "docs: add commented-out newsletter placeholder to Footer per source doc"
```

---

### Task 9: Final verification

**Files:** none (verification only)

**Interfaces:**
- Consumes: everything from Tasks 1–8
- Produces: nothing further downstream — this stage's final gate.

- [ ] **Step 1: Run the entire frontend test suite**

Run: `cd frontend && npm test`
Expected: PASS — every prior test plus all tests from Tasks 1 through 8.

- [ ] **Step 2: Run lint**

Run: `cd frontend && npm run lint`
Expected: clean (0 errors, 0 warnings). `SearchModal`'s and `CatalogPage`'s effects already carry the established `react-hooks/set-state-in-effect`/`exhaustive-deps` disable comments from prior-stage precedent — if lint flags something unanticipated, apply the same pattern with a one-line justification, and per the System Settings stage's lesson, don't add a disable preemptively where lint doesn't actually flag one.

- [ ] **Step 3: Run the production build**

Run: `cd frontend && npm run build`
Expected: succeeds with no errors.

- [ ] **Step 4: Manual smoke check (optional, requires the backend running)**

Optional — skip if a live backend isn't available; Steps 1-3 are the mandatory bar. If available: confirm the navbar renders on `/`, `/trending`, `/categories`, `/best-sellers` with correct active-link highlighting; the Categories dropdown lists real categories and each links correctly; the mobile hamburger menu opens/closes at a narrow viewport; the search modal shows live results and clicking one lands back on the homepage catalog with the term applied; `/trending` and `/best-sellers` land pre-filtered but remain fully adjustable; `/categories` shows the category grid and filters correctly when a card is clicked.

- [ ] **Step 5: Commit (if the smoke check surfaced any fixes)**

If Step 4 found nothing to fix (or was skipped), there is nothing to commit for this task — Task 8's commit is the final commit of this stage. If it did surface a small fix, apply it, re-run Steps 1-3, and commit:
```bash
git add -A
git commit -m "fix: address issue found during Public Navbar Redesign manual smoke check"
```
