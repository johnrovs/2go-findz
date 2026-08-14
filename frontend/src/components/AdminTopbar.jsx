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

const ROLE_LABELS = {
  ADMIN: 'Administrator',
};

function buildBreadcrumbs(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  return segments.map((segment) => BREADCRUMB_LABELS[segment] ?? segment);
}

// The Buying Guide editor (new or existing) has its own EditorHeader with an
// equivalent back link, title, and mobile menu button, replacing this bar
// entirely there -- the list page at /admin/buying-guides itself is unaffected.
function isBuyingGuideEditorPath(pathname) {
  return /^\/admin\/buying-guides\/(new|\d+)$/.test(pathname);
}

function AdminTopbar({ onMenuClick }) {
  const { user } = useAuth();
  const location = useLocation();

  if (location.pathname === '/admin' || isBuyingGuideEditorPath(location.pathname)) return null;

  const breadcrumbs = buildBreadcrumbs(location.pathname);
  const fullName = user?.fullName ?? 'Administrator';
  const roleLabel = user?.role ? ROLE_LABELS[user.role] ?? user.role : 'Administrator';

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
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-dashboard-purpleLight text-small font-semibold text-dashboard-purple">
          {fullName.charAt(0)}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-small font-semibold text-heading">{fullName}</span>
          <span className="block text-xs text-muted">{roleLabel}</span>
        </span>
      </div>
    </header>
  );
}

export default AdminTopbar;
