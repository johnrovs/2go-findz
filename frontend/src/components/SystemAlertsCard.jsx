import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';

function AlertRow({ to, children }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 rounded-btn px-2 py-2.5 hover:bg-surface-secondary">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dashboard-orange/10 text-dashboard-orange">
          <AlertTriangle size={14} />
        </span>
        <span className="flex-1 text-small font-medium text-heading">{children}</span>
        <ChevronRight size={16} className="shrink-0 text-muted" />
      </Link>
    </li>
  );
}

function SystemAlertsCard({ draftProductCount, draftGuideCount, emptyCategoryCount }) {
  const hasAlerts = draftProductCount > 0 || draftGuideCount > 0 || emptyCategoryCount > 0;

  const draftProductMessage =
    draftProductCount === 1
      ? `${draftProductCount} draft product needs review`
      : `${draftProductCount} draft products need review`;
  const draftGuideMessage =
    draftGuideCount === 1
      ? `${draftGuideCount} draft buying guide needs review`
      : `${draftGuideCount} draft buying guides need review`;
  const emptyCategoryMessage =
    emptyCategoryCount === 1
      ? `${emptyCategoryCount} category with no active products`
      : `${emptyCategoryCount} categories with no active products`;

  return (
    <div className="flex h-full flex-col rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <h3 className="mb-4 text-card-title text-heading">System Alerts</h3>
      {!hasAlerts ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-success" />
          <p className="text-small font-medium text-heading">All caught up!</p>
        </div>
      ) : (
        <ul className="space-y-1">
          {draftProductCount > 0 && <AlertRow to="/admin/products">{draftProductMessage}</AlertRow>}
          {draftGuideCount > 0 && <AlertRow to="/admin/buying-guides">{draftGuideMessage}</AlertRow>}
          {emptyCategoryCount > 0 && <AlertRow to="/admin/categories">{emptyCategoryMessage}</AlertRow>}
        </ul>
      )}
    </div>
  );
}

export default SystemAlertsCard;
