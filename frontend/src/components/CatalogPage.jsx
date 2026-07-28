import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import SectionHeading from './SectionHeading.jsx';
import SearchInput from './SearchInput.jsx';
import ProductFilters from './ProductFilters.jsx';
import ProductGrid from './ProductGrid.jsx';
import Pagination from './Pagination.jsx';
import { useProductSearch } from '../hooks/useProductSearch.js';
import { getSettings } from '../services/settingsService.js';
import { getCategories } from '../services/categoryService.js';

function CatalogPage({ title, description, initialFilter, initialCategoryId, children }) {
  const [searchParams] = useSearchParams();
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const productSearch = useProductSearch();

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (initialFilter && !searchParams.has('filter')) {
      productSearch.setFilter(initialFilter);
    }
    if (initialCategoryId && !searchParams.has('category')) {
      productSearch.setCategoryId(String(initialCategoryId));
    }
    // Seeding from initialFilter/initialCategoryId is intentionally a mount-only concern:
    // once the URL has its own filter/category value (whether from this seed or a later
    // user action), this effect must never overwrite it again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      {children}
      <section className="scroll-mt-20 bg-surface-secondary py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title={title} description={description} />
          <div className="mb-6">
            <SearchInput value={productSearch.search} onChange={productSearch.setSearch} />
          </div>
          <div className="mb-8">
            <ProductFilters
              filter={productSearch.filter}
              onFilterChange={productSearch.setFilter}
              categoryId={productSearch.categoryId}
              categories={categories}
              onCategoryChange={productSearch.setCategoryId}
              sort={productSearch.sort}
              onSortChange={productSearch.setSort}
            />
          </div>
          <ProductGrid products={productSearch.products} isLoading={productSearch.isLoading} error={productSearch.error} />
          <Pagination page={productSearch.page} totalPages={productSearch.totalPages} onPageChange={productSearch.setPage} />
        </div>
      </section>
      <Footer settings={settings} />
    </div>
  );
}

export default CatalogPage;
