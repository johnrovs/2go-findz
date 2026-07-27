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
