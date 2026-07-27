import FilterDropdown from './FilterDropdown.jsx';

const QUICK_FILTERS = [
  { value: 'all', label: 'All Products' },
  { value: 'trending', label: 'Trending' },
  { value: 'bestSeller', label: 'Best Sellers' },
];

const SORT_OPTIONS = [
  { value: 'oldest', label: 'Oldest Added' },
  { value: 'newest', label: 'Newest Added' },
  { value: 'priceLowToHigh', label: 'Price: Low to High' },
  { value: 'priceHighToLow', label: 'Price: High to Low' },
  { value: 'nameAZ', label: 'Product Name: A-Z' },
  { value: 'nameZA', label: 'Product Name: Z-A' },
];

function ProductFilters({ filter, onFilterChange, categoryId, categories, onCategoryChange, sort, onSortChange }) {
  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map((category) => ({ value: String(category.id), label: category.productCategoryName })),
  ];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Product filters">
        {QUICK_FILTERS.map((quickFilter) => (
          <button
            key={quickFilter.value}
            type="button"
            onClick={() => onFilterChange(quickFilter.value)}
            aria-pressed={filter === quickFilter.value}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === quickFilter.value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {quickFilter.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4">
        <FilterDropdown label="Category" value={categoryId} options={categoryOptions} onChange={onCategoryChange} />
        <FilterDropdown label="Sort by" value={sort} options={SORT_OPTIONS} onChange={onSortChange} />
      </div>
    </div>
  );
}

export default ProductFilters;
