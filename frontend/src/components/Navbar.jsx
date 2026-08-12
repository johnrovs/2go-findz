import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Menu, Search } from 'lucide-react';
import logo from '../assets/2gofindz.png';
import MobileMenu from './MobileMenu.jsx';
import LanguageSelector from './LanguageSelector.jsx';
import { getCategories } from '../services/categoryService.js';
// Compare nav entry point is hidden pending a future redesign — see the commented
// NavLink below. The Compare feature itself (useCompare/CompareContext/ComparePage)
// is untouched, just unreachable from navigation for now.

const navLinkClassName = ({ isActive }) =>
  `text-nav transition ${isActive ? 'text-white' : 'text-white/70 hover:text-white'}`;

function Navbar() {
  const { t } = useTranslation('common');
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
          <Link to="/" aria-label={t('nav.homeLogoAriaLabel')}>
            <img src={logo} alt="2Go Findz" className="h-14 w-auto" />
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-6 lg:flex">
            <NavLink to="/" end className={navLinkClassName}>
              {t('nav.home')}
            </NavLink>
            <NavLink to="/trending" className={navLinkClassName}>
              {t('nav.trending')}
            </NavLink>
            <div ref={categoriesRef} className="relative">
              <button
                type="button"
                onClick={() => setIsCategoriesOpen((open) => !open)}
                aria-expanded={isCategoriesOpen}
                aria-haspopup="menu"
                className="flex items-center gap-1 text-nav text-white/70 transition hover:text-white"
              >
                {t('nav.categories')}
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
                    {t('nav.allCategories')}
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
            {/* Compare — hidden for now pending a future redesign. Re-enable by restoring
                this NavLink, the `const { ids } = useCompare();` line above, the Badge
                import, and the compareCount prop on <MobileMenu> below. */}
            <NavLink to="/buying-guides" className={navLinkClassName}>
              {t('nav.buyingGuides')}
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} role="search" className="relative hidden sm:block">
              <button
                type="submit"
                aria-label={t('nav.searchButtonAriaLabel')}
                className="absolute left-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-white/50 hover:text-white"
              >
                <Search size={16} aria-hidden="true" />
              </button>
              <input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder={t('nav.searchPlaceholder')}
                aria-label={t('nav.searchInputAriaLabel')}
                className="w-40 rounded-search border border-white/20 bg-white/10 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/50 focus:border-white focus:outline-none focus:ring-2 focus:ring-white lg:w-56"
              />
            </form>
            <LanguageSelector />
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label={t('nav.openMenuAriaLabel')}
              className="rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </>
  );
}

export default Navbar;
