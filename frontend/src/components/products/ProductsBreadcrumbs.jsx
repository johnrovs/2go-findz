import { Link } from 'react-router-dom';

function ProductsBreadcrumbs() {
  return (
    <nav aria-label="Breadcrumb" className="mt-4 text-small text-muted">
      <ol className="flex items-center gap-1.5">
        <li>
          <Link to="/" className="hover:text-primary">
            Home
          </Link>
        </li>
        <li aria-hidden="true">&gt;</li>
        <li>
          <span aria-current="page" className="text-heading">
            Products
          </span>
        </li>
      </ol>
    </nav>
  );
}

export default ProductsBreadcrumbs;
