import { Link } from 'react-router-dom';

function BuyingGuideBreadcrumbs({ title }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link to="/" className="hover:text-primary">
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link to="/buying-guides" className="hover:text-primary">
            Buying Guides
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li className="min-w-0">
          <span aria-current="page" className="block max-w-[220px] truncate text-body sm:max-w-xs">
            {title}
          </span>
        </li>
      </ol>
    </nav>
  );
}

export default BuyingGuideBreadcrumbs;
