import { useEffect, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import SearchInput from '../SearchInput.jsx';
import FilterDropdown from '../FilterDropdown.jsx';
import Pagination from '../Pagination.jsx';
import LoadingSpinner from '../LoadingSpinner.jsx';
import EmptyState from '../EmptyState.jsx';
import ErrorState from '../ErrorState.jsx';
import Button from '../Button.jsx';
import { getDistinctBrands } from '../../services/adminProductService.js';
import { useProductCatalogSearch } from '../../hooks/useProductCatalogSearch.js';
import { getImageUrl } from '../../utils/imageUrl.js';

function ProductCatalogPanel({ selectedProducts, onAdd, categories }) {
  const catalog = useProductCatalogSearch();
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    getDistinctBrands()
      .then(setBrands)
      .catch(() => setBrands([]));
  }, []);

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories.map((category) => ({ value: String(category.id), label: category.productCategoryName })),
  ];
  const brandOptions = [{ value: '', label: 'All Brands' }, ...brands.map((brand) => ({ value: brand, label: brand }))];
  const selectedIds = new Set(selectedProducts.map((product) => product.id));

  return (
    <div>
      <h3 className="mb-3 text-small font-medium text-body">Product Catalog</h3>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="min-w-[200px] flex-1">
          <SearchInput value={catalog.search} onChange={catalog.setSearch} />
        </div>
        <FilterDropdown label="Category" value={catalog.categoryId} options={categoryOptions} onChange={catalog.setCategoryId} />
        <FilterDropdown label="Brand" value={catalog.brand} options={brandOptions} onChange={catalog.setBrand} />
      </div>

      {catalog.isLoading ? (
        <LoadingSpinner label="Loading products..." />
      ) : catalog.error ? (
        <ErrorState message={catalog.error} onRetry={catalog.reload} />
      ) : catalog.products.length === 0 ? (
        <EmptyState title="No products found" description="Try adjusting your search or filters." />
      ) : (
        <ul className="space-y-2">
          {catalog.products.map((product) => {
            const isSelected = selectedIds.has(product.id);
            const imageUrl = getImageUrl(product.imageFileName);
            return (
              <li key={product.id} className="flex items-center justify-between gap-3 rounded-btn border border-border p-3">
                <div className="flex min-w-0 items-center gap-3">
                  {imageUrl ? (
                    <img src={imageUrl} alt={product.name} className="h-12 w-12 shrink-0 rounded-md object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100">
                      <ImageIcon className="h-5 w-5 text-slate-300" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-body">{product.name}</p>
                    <p className="truncate text-xs text-muted">
                      {product.brand || '—'} · ${Number(product.productPrice).toFixed(2)}
                    </p>
                  </div>
                </div>
                <Button type="button" variant="secondary" size="sm" disabled={isSelected} onClick={() => onAdd(product)}>
                  {isSelected ? 'Added' : 'Add'}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination page={catalog.page} totalPages={catalog.totalPages} onPageChange={catalog.setPage} />
    </div>
  );
}

export default ProductCatalogPanel;
