import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, Menu, Search } from 'lucide-react';
import logo from '../assets/2gofindz.png';
import MobileMenu from './MobileMenu.jsx';
import Badge from './Badge.jsx';
import { getCategories } from '../services/categoryService.js';
import { useCompare } from '../hooks/useCompare.js';

const navLinkClassName = ({ isActive }) =>
  `text-nav transition ${isActive ? 'text-white' : 'text-white/70 hover:text-white'}`;

function Navbar() {
  const { ids } = useCompare();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
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

  function handleSearchSubmit(event) {
    event.preventDefault();
    const trimmed = searchValue.trim();
    navigate(trimmed ? `/products?search=${encodeURIComponent(trimmed)}` : '/products');
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-navy-950 shadow-navbar print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="2Go Findz home">
            <img src={logo} alt="2Go Findz" className="h-14 w-auto" />
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-6 lg:flex">
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
                className="flex items-center gap-1 text-nav text-white/70 transition hover:text-white"
              >
                Categories
                <ChevronDown size={16} />
              </button>
              {isCategoriesOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-full mt-2 w-56 rounded-card border border-slate-200 bg-white py-2 shadow-dropdown"
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
            <NavLink to="/compare" className={navLinkClassName}>
              Compare
              {ids.length > 0 && <Badge>{ids.length}</Badge>}
            </NavLink>
            <NavLink to="/buying-guides" className={navLinkClassName}>
              Buying Guides
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} role="search" className="relative hidden sm:block">
              <button
                type="submit"
                aria-label="Search"
                className="absolute left-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-white/50 hover:text-white"
              >
                <Search size={16} aria-hidden="true" />
              </button>
              <input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search products..."
                aria-label="Search products"
                className="w-40 rounded-search border border-white/20 bg-white/10 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/50 focus:border-white focus:outline-none focus:ring-2 focus:ring-white lg:w-56"
              />
            </form>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
              className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} compareCount={ids.length} />
    </>
  );
}

export default Navbar;
