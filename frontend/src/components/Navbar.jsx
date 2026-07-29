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

function Navbar() {
  const { ids } = useCompare();
  const [categories, setCategories] = useState([]);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 shadow-navbar backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="2Go Findz home">
            <img src={logo} alt="2Go Findz" className="h-10 w-10" />
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-6 lg:flex">
            <NavLink to="/" end className={navLinkClassName}>
              Home
            </NavLink>
            <NavLink to="/trending" className={navLinkClassName}>
              Trending
            </NavLink>
            <NavLink to="/best-sellers" className={navLinkClassName}>
              Best Sellers
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
            <NavLink to="/comparisons" className={navLinkClassName}>
              Comparisons
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/#catalog"
              aria-label="Browse all products"
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
            >
              <Search size={20} />
            </Link>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open menu"
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        compareCount={ids.length}
      />
    </>
  );
}

export default Navbar;
