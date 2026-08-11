import { ShoppingBag } from 'lucide-react';

function ProductsPageHeader() {
  return (
    <div className="mt-4 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
      <div>
        <h1 className="text-h2 font-semibold text-heading">Browse All Products</h1>
        <p className="mt-2 max-w-xl text-body text-muted">
          Explore handpicked products from Amazon across all categories.
        </p>
      </div>

      <div className="hidden items-center gap-4 lg:flex" aria-hidden="true">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <ShoppingBag className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
        <div>
          <p className="font-semibold text-heading">Smart shopping starts here.</p>
          <p className="text-small text-muted">Find the right products for your lifestyle.</p>
        </div>
      </div>
    </div>
  );
}

export default ProductsPageHeader;
