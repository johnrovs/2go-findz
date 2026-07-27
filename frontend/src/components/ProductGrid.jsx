import ProductCard from './ProductCard.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import EmptyState from './EmptyState.jsx';
import ErrorState from './ErrorState.jsx';

function ProductGrid({ products, isLoading, error, onRetry }) {
  if (isLoading) {
    return <LoadingSpinner label="Loading products..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (products.length === 0) {
    return <EmptyState title="No products found" description="Try adjusting your search or filters." />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default ProductGrid;
