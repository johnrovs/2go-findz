import { Tag } from 'lucide-react';
import { Link } from 'react-router-dom';
import EmptyState from './EmptyState.jsx';

function TopCategoriesCard({ categories }) {
  const maxClicks = categories.length > 0 ? Math.max(...categories.map((c) => c.clickCount)) : 0;

  return (
    <div className="flex h-full flex-col rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-card-title text-heading">Top Categories</h3>
        <Link to="/admin/categories" className="text-small font-semibold text-primary hover:underline">
          View all
        </Link>
      </div>
      {categories.length === 0 ? (
        <EmptyState title="No category activity" description="No category activity in this range." />
      ) : (
        <ul className="space-y-4">
          {categories.map((category) => (
            <li key={category.categoryId} className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dashboard-purple/10 text-dashboard-purple">
                <Tag size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-small font-medium text-heading">{category.categoryName}</span>
                  <span className="shrink-0 text-small font-semibold text-heading">
                    {category.clickCount.toLocaleString('en-US')}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-dashboard-purpleLight">
                  <div
                    className="h-full rounded-full bg-dashboard-purple"
                    style={{ width: `${maxClicks > 0 ? (category.clickCount / maxClicks) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TopCategoriesCard;
