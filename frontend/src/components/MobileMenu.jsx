import { useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import Badge from './Badge.jsx';

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/trending', label: 'Trending' },
  { to: '/best-sellers', label: 'Best Sellers' },
  { to: '/categories', label: 'Categories' },
  { to: '/compare', label: 'Compare' },
  { to: '/buying-guides', label: 'Buying Guides' },
  { to: '/comparisons', label: 'Comparisons' },
];

function MobileMenu({ isOpen, onClose, compareCount = 0 }) {
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
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Site navigation">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        transition={{ type: 'tween', duration: 0.2 }}
        className="absolute inset-y-0 left-0 w-64 bg-white"
      >
        <nav aria-label="Site navigation" className="flex h-full flex-col px-3 py-6">
          <ul className="flex-1 space-y-1">
            {NAV_ITEMS.map(({ to, label, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center rounded-md px-3 py-2 text-nav transition ${
                      isActive ? 'bg-primary/5 text-primary' : 'text-body hover:bg-slate-100'
                    }`
                  }
                >
                  {label}
                  {to === '/compare' && compareCount > 0 && <Badge>{compareCount}</Badge>}
                </NavLink>
              </li>
            ))}
            <li>
              <Link
                to="/#catalog"
                onClick={onClose}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <Search size={16} />
                Search
              </Link>
            </li>
          </ul>
        </nav>
      </motion.div>
    </div>
  );
}

export default MobileMenu;
