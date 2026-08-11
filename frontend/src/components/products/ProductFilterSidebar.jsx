import { useState } from 'react';
import { Search } from 'lucide-react';
import FilterAccordion from './FilterAccordion.jsx';

function matchesQuery(label, query) {
  return label.toLowerCase().includes(query.trim().toLowerCase());
}

function ProductFilterSidebar({
  categories,
  brands,
  selectedCategories,
  selectedBrands,
  onApply,
  onClear,
  isApplying = false,
  optionsError = null,
}) {
  const appliedKey = `${selectedCategories.join(',')}|${selectedBrands.join(',')}`;
  const [lastAppliedKey, setLastAppliedKey] = useState(appliedKey);
  const [pendingCategories, setPendingCategories] = useState(selectedCategories);
  const [pendingBrands, setPendingBrands] = useState(selectedBrands);
  const [query, setQuery] = useState('');

  if (appliedKey !== lastAppliedKey) {
    setLastAppliedKey(appliedKey);
    setPendingCategories(selectedCategories);
    setPendingBrands(selectedBrands);
  }

  function toggle(list, setList, value) {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  function handleClear() {
    setPendingCategories([]);
    setPendingBrands([]);
    onClear();
  }

  const visibleCategories = categories.filter((category) => matchesQuery(category.productCategoryName, query));
  const visibleBrands = brands.filter((brand) => matchesQuery(brand, query));

  return (
    <aside className="w-full shrink-0 rounded-card border border-border bg-white p-5 lg:w-[230px]">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-heading">Filters</h2>
        <button type="button" onClick={handleClear} className="text-small font-medium text-primary hover:underline">
          Clear all
        </button>
      </div>

      <label htmlFor="product-filter-search" className="sr-only">
        Search filters
      </label>
      <div className="relative mt-4">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          id="product-filter-search"
          type="search"
          role="searchbox"
          aria-label="Search filters"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search filters"
          className="w-full rounded-md border border-border py-2 pl-9 pr-3 text-sm text-body focus:border-primary focus:outline-none"
        />
      </div>

      {optionsError && (
        <p className="mt-4 text-small text-red-600" role="alert">
          {optionsError}
        </p>
      )}

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-sm font-semibold text-heading">Category</p>
        <ul className="mt-3 space-y-2">
          {visibleCategories.map((category) => {
            const value = String(category.id);
            return (
              <li key={value}>
                <label className="flex items-center gap-2 text-sm text-body">
                  <input
                    type="checkbox"
                    checked={pendingCategories.includes(value)}
                    onChange={() => toggle(pendingCategories, setPendingCategories, value)}
                  />
                  {category.productCategoryName}
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      <FilterAccordion title="Brand">
        <ul className="space-y-2">
          {visibleBrands.map((brand) => (
            <li key={brand}>
              <label className="flex items-center gap-2 text-sm text-body">
                <input
                  type="checkbox"
                  checked={pendingBrands.includes(brand)}
                  onChange={() => toggle(pendingBrands, setPendingBrands, brand)}
                />
                {brand}
              </label>
            </li>
          ))}
        </ul>
      </FilterAccordion>

      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          disabled={isApplying}
          onClick={() => onApply(pendingCategories, pendingBrands)}
          className="h-10 w-full rounded-md bg-amazon text-sm font-semibold text-white transition hover:bg-amazon/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isApplying ? 'Applying…' : 'Apply Filters'}
        </button>
        <button
          type="button"
          onClick={() => {
            setPendingCategories([]);
            setPendingBrands([]);
            onClear();
          }}
          className="h-9 w-full rounded-md border border-border text-sm font-medium text-body transition hover:bg-slate-50"
        >
          Reset Filters
        </button>
      </div>
    </aside>
  );
}

export default ProductFilterSidebar;
