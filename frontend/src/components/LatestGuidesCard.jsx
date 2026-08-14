import { Link } from 'react-router-dom';
import { Eye, Image as ImageIcon } from 'lucide-react';
import EmptyState from './EmptyState.jsx';
import { getImageUrl } from '../utils/imageUrl.js';

function LatestGuidesCard({ guides }) {
  return (
    <div className="flex h-full flex-col rounded-card border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-card-title text-heading">Latest Guides</h3>
        <Link to="/admin/buying-guides" className="text-small font-semibold text-primary hover:underline">
          View all
        </Link>
      </div>
      {guides.length === 0 ? (
        <EmptyState title="No guides yet" description="Add your first buying guide to see it here." />
      ) : (
        <ul className="space-y-3">
          {guides.map((guide) => {
            const url = getImageUrl(guide.coverImageFilename);
            return (
              <li key={guide.id} className="flex items-center gap-3">
                {url ? (
                  <img src={url} alt={guide.title} className="h-10 w-10 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100">
                    <ImageIcon className="h-4 w-4 text-slate-300" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-small font-medium text-heading">{guide.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {guide.active ? (
                      <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                        Published
                      </span>
                    ) : (
                      <span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs font-medium text-muted">
                        Draft
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Eye size={12} />
                      {guide.views.toLocaleString('en-US')}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default LatestGuidesCard;
