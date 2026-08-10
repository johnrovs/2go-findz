import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

function HomeSectionCard({
  icon: Icon,
  iconClassName = 'bg-primary/10 text-primary',
  title,
  description,
  viewAllHref,
  viewAllLabel = 'View all',
  children,
}) {
  return (
    <div className="rounded-card border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconClassName}`}>
              <Icon size={20} aria-hidden="true" />
            </span>
          )}
          <div>
            <h2 className="text-section-heading text-heading">{title}</h2>
            {description && <p className="mt-1 text-small text-body">{description}</p>}
          </div>
        </div>
        {viewAllHref && (
          <Link
            to={viewAllHref}
            className="flex items-center gap-1 text-small font-semibold text-primary hover:underline"
          >
            {viewAllLabel}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}

export default HomeSectionCard;
