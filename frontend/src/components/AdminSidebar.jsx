import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Tags, BookOpen, Settings, LogOut, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth.js';
import logo from '../assets/2gofindz.png';

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/products', label: 'Products', icon: Package },
      { to: '/admin/categories', label: 'Categories', icon: Tags },
      { to: '/admin/buying-guides', label: 'Buying Guides', icon: BookOpen },
      // TODO(future development): Comparisons hidden from nav for now; route and page still work.
      // { to: '/admin/comparisons', label: 'Comparisons', icon: GitCompare },
    ],
  },
  {
    label: 'Settings',
    items: [{ to: '/admin/settings', label: 'Settings', icon: Settings }],
  },
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
    <nav aria-label="Main navigation" className="flex h-full flex-col bg-navy-950 px-3 py-6">
      <div className="mb-8 px-3">
        <img src={logo} alt="2Go Findz" className="h-14 w-auto" />
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-white/40">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-purple ${
                        isActive
                          ? 'bg-gradient-to-r from-dashboard-purple to-dashboard-purpleDark text-white shadow-sm'
                          : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <Icon size={18} />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-card bg-dashboard-purpleDark p-4">
        <div className="mb-2 flex items-center gap-2 text-white">
          <Lightbulb size={16} />
          <span className="text-small font-semibold">Quick Tip</span>
        </div>
        <p className="text-[12px] leading-relaxed text-dashboard-purpleLight">
          Add new products regularly to increase engagement and commissions.
        </p>
      </div>

      <button
        onClick={logout}
        className="mt-4 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-dashboard-purple"
      >
        <LogOut size={18} />
        Logout
      </button>
    </nav>
  );

  return (
    <>
      <div className="hidden md:sticky md:top-0 md:block md:h-screen md:w-[240px] md:shrink-0 md:self-start">
        {content}
      </div>

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
