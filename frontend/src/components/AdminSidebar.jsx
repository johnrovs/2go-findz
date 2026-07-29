import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Tags, BookOpen, GitCompare, Settings, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth.js';
import logo from '../assets/2gofindz.png';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Product Categories', icon: Tags },
  { to: '/admin/buying-guides', label: 'Buying Guides', icon: BookOpen },
  { to: '/admin/comparisons', label: 'Comparisons', icon: GitCompare },
  { to: '/admin/settings', label: 'System Settings', icon: Settings },
];

function AdminSidebar({ isOpen, onClose }) {
  const { logout } = useAuth();

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

  const content = (
    <nav aria-label="Main navigation" className="flex h-full flex-col border-r border-slate-200 bg-white px-3 py-6">
      <div className="mb-8 px-3">
        <img src={logo} alt="2Go Findz" className="h-10 w-10" />
      </div>
      <ul className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-primary/10 text-primary' : 'text-body hover:bg-slate-100'
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
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-body hover:bg-slate-100"
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
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
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
