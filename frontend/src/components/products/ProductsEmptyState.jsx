import EmptyState from '../EmptyState.jsx';

function ProductsEmptyState({ onClearFilters, onReturnToAllProducts }) {
  return (
    <EmptyState
      title="No products found"
      description="We couldn't find any products matching your current filters. Try adjusting or clearing them."
    >
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onClearFilters}
          className="h-9 rounded-md border border-border px-4 text-small font-medium text-body hover:bg-slate-50"
        >
          Clear Filters
        </button>
        <button
          type="button"
          onClick={onReturnToAllProducts}
          className="h-9 rounded-md bg-amazon px-4 text-small font-semibold text-white hover:bg-amazon/90"
        >
          Return to All Products
        </button>
      </div>
    </EmptyState>
  );
}

export default ProductsEmptyState;
