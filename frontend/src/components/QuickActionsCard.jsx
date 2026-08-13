import { Link } from 'react-router-dom';
import { ChevronRight, FileText, GitCompare, Package, Tag } from 'lucide-react';

const ACTIONS = [
  { label: 'Add Product', to: '/admin/products/new', icon: Package, colorClass: 'bg-dashboard-green/10 text-dashboard-green' },
  {
    label: 'Add Buying Guide',
    to: '/admin/buying-guides/new',
    icon: FileText,
    colorClass: 'bg-dashboard-blue/10 text-dashboard-blue',
  },
  {
    label: 'Add Comparison',
    to: '/admin/comparisons/new',
    icon: GitCompare,
    colorClass: 'bg-dashboard-purple/10 text-dashboard-purple',
  },
  {
    label: 'Manage Categories',
    to: '/admin/categories',
    icon: Tag,
    colorClass: 'bg-dashboard-orange/10 text-dashboard-orange',
  },
];

function QuickActionsCard() {
  return (
    <div className="flex h-full flex-col rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <h3 className="mb-4 text-card-title text-heading">Quick Actions</h3>
      <ul className="space-y-1">
        {ACTIONS.map(({ label, to, icon: Icon, colorClass }) => (
          <li key={to}>
            <Link
              to={to}
              className="flex items-center gap-3 rounded-btn px-2 py-2.5 hover:bg-surface-secondary"
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                <Icon size={14} />
              </span>
              <span className="flex-1 text-small font-medium text-heading">{label}</span>
              <ChevronRight size={16} className="shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default QuickActionsCard;
