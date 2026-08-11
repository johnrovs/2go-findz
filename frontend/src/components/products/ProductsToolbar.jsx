import { Grid3x3, List, SlidersHorizontal } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest Arrivals' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'nameAZ', label: 'Name A-Z' },
  { value: 'nameZA', label: 'Name Z-A' },
  { value: 'highestRated', label: 'Highest Rated' },
];

function ProductsToolbar({
  page,
  size,
  totalElements,
  sort,
  view,
  activeFilterCount,
  onSortChange,
  onViewChange,
  onOpenMobileFilters,
}) {
  const start = totalElements === 0 ? 0 : (page - 1) * size + 1;
  const end = Math.min(page * size, totalElements);
  const rangeText =
    totalElements === 0 ? 'Showing 0 of 0 products' : `Showing ${start}–${end} of ${totalElements} products`;

  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-small text-muted">{rangeText}</p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileFilters}
          aria-label={activeFilterCount > 0 ? `Filter, ${activeFilterCount} active` : 'Filter'}
          className="relative flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-small font-medium text-body lg:hidden"
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filter
          {activeFilterCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amazon px-1 text-[10px] font-semibold text-white"
            >
              {activeFilterCount}
            </span>
          )}
        </button>

        <label htmlFor="products-sort" className="sr-only">
          Sort by
        </label>
        <select
          id="products-sort"
          aria-label="Sort by"
          value={sort}
          onChange={(event) => onSortChange(event.target.value)}
          className="rounded-md border border-border px-3 py-1.5 text-small text-body focus:border-primary focus:outline-none"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 rounded-md border border-border p-1">
          <button
            type="button"
            aria-pressed={view === 'grid'}
            aria-label="Grid view"
            onClick={() => onViewChange('grid')}
            className={`flex h-7 w-7 items-center justify-center rounded ${
              view === 'grid' ? 'border border-purple-500 bg-purple-50 text-purple-600' : 'text-muted'
            }`}
          >
            <Grid3x3 size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-pressed={view === 'list'}
            aria-label="List view"
            onClick={() => onViewChange('list')}
            className={`flex h-7 w-7 items-center justify-center rounded ${
              view === 'list' ? 'border border-navy-950 bg-white text-navy-950' : 'text-muted'
            }`}
          >
            <List size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProductsToolbar;
