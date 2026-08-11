function SkeletonCard() {
  return (
    <div
      data-testid="product-skeleton-card"
      className="flex animate-pulse flex-col overflow-hidden rounded-card border border-border bg-white"
    >
      <div className="aspect-square bg-slate-100" />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="h-4 w-4/5 rounded bg-slate-100" />
        <div className="h-3 w-2/5 rounded bg-slate-100" />
        <div className="mt-auto h-9 w-full rounded-md bg-slate-100" />
      </div>
    </div>
  );
}

function SkeletonListItem() {
  return (
    <div
      data-testid="product-skeleton-list-item"
      className="flex animate-pulse items-center gap-4 rounded-card border border-border bg-white p-3"
    >
      <div className="h-20 w-20 shrink-0 rounded-md bg-slate-100" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/5 rounded bg-slate-100" />
        <div className="h-3 w-2/5 rounded bg-slate-100" />
      </div>
      <div className="h-9 w-32 shrink-0 rounded-md bg-slate-100" />
    </div>
  );
}

function ProductsSkeletonGrid({ view, count }) {
  const items = Array.from({ length: count }, (_, index) => index);

  return (
    <div role="status" aria-label="Loading products">
      {view === 'list' ? (
        <div className="flex flex-col gap-3">
          {items.map((index) => (
            <SkeletonListItem key={index} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {items.map((index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      )}
    </div>
  );
}

export default ProductsSkeletonGrid;
