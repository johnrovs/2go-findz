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
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-navbar md:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <nav aria-label="Breadcrumb" className="text-small text-muted">
          {breadcrumbs.join(' / ')}
        </nav>
      </div>
      <span className="text-small font-medium text-heading">{user?.fullName}</span>
    </header>
  );
}

export default AdminTopbar;
