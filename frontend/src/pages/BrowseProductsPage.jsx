import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import PublicFooter from '../components/PublicFooter.jsx';
import ErrorState from '../components/ErrorState.jsx';
import Pagination from '../components/Pagination.jsx';
import ProductsBreadcrumbs from '../components/products/ProductsBreadcrumbs.jsx';
import ProductsPageHeader from '../components/products/ProductsPageHeader.jsx';
import ProductFilterSidebar from '../components/products/ProductFilterSidebar.jsx';
import MobileFilterDrawer from '../components/products/MobileFilterDrawer.jsx';
import ProductsToolbar from '../components/products/ProductsToolbar.jsx';
import ProductsPageSizeSelect from '../components/products/ProductsPageSizeSelect.jsx';
import ProductsTrustStrip from '../components/products/ProductsTrustStrip.jsx';
import ProductsSkeletonGrid from '../components/products/ProductsSkeletonGrid.jsx';
import ProductsEmptyState from '../components/products/ProductsEmptyState.jsx';
import BrowseProductGrid from '../components/products/BrowseProductGrid.jsx';
import BrowseProductList from '../components/products/BrowseProductList.jsx';
import { useBrowseProductsSearch } from '../hooks/useBrowseProductsSearch.js';
import { getSettings } from '../services/settingsService.js';
import { getCategories } from '../services/categoryService.js';
import { getBrands } from '../services/productService.js';

function BrowseProductsPage({ title, description, breadcrumbLabel, trending, bestSeller }) {
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [optionsError, setOptionsError] = useState(null);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const resultsHeadingRef = useRef(null);
  const search = useBrowseProductsSearch({ trending, bestSeller });

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    Promise.all([getCategories(), getBrands()])
      .then(([categoriesData, brandsData]) => {
        setCategories(categoriesData);
        setBrands(brandsData);
      })
      .catch(() => setOptionsError('Failed to load filters.'));
  }, []);

  const activeFilterCount = search.categories.length + search.brands.length;

  function handleApply(nextCategories, nextBrands) {
    search.applyFilters(nextCategories, nextBrands);
  }

  function handleClear() {
    search.clearAll();
  }

  function handleReturnToAllProducts() {
    search.resetAll();
  }

  function handlePageChange(nextPage) {
    search.setPage(nextPage);
    resultsHeadingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    resultsHeadingRef.current?.focus();
  }

  const sidebarProps = {
    categories,
    brands,
    selectedCategories: search.categories,
    selectedBrands: search.brands,
    isApplying: search.isLoading,
    optionsError,
  };

  return (
    <div className="min-h-screen bg-surface-secondary">
      <a
        href="#browse-results"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-heading focus:shadow-card"
      >
        Skip to results
      </a>
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ProductsBreadcrumbs label={breadcrumbLabel} />
        <ProductsPageHeader title={title} description={description} />

        <div className="mt-8 flex flex-col gap-6 pb-16 lg:flex-row lg:items-start">
          <div className="hidden shrink-0 lg:block">
            <ProductFilterSidebar {...sidebarProps} onApply={handleApply} onClear={handleClear} />
          </div>

          <div className="min-w-0 flex-1">
            <h2
              id="browse-results"
              ref={resultsHeadingRef}
              tabIndex={-1}
              className="sr-only"
              aria-live="polite"
            >
              {search.isLoading
                ? 'Loading products'
                : `Showing ${search.totalElements} product${search.totalElements === 1 ? '' : 's'}`}
            </h2>

            <ProductsToolbar
              page={search.page}
              size={search.size}
              totalElements={search.totalElements}
              sort={search.sort}
              view={search.view}
              activeFilterCount={activeFilterCount}
              onSortChange={search.setSort}
              onViewChange={search.setView}
              onOpenMobileFilters={() => setIsMobileFiltersOpen(true)}
            />

            <div className="mt-6">
              {search.isLoading ? (
                <ProductsSkeletonGrid view={search.view} count={Math.min(search.size, 12)} />
              ) : search.error ? (
                <ErrorState message={search.error} onRetry={search.refetch} />
              ) : search.products.length === 0 ? (
                <ProductsEmptyState onClearFilters={handleClear} onReturnToAllProducts={handleReturnToAllProducts} />
              ) : search.view === 'list' ? (
                <BrowseProductList products={search.products} />
              ) : (
                <BrowseProductGrid products={search.products} />
              )}
            </div>

            {!search.isLoading && !search.error && search.products.length > 0 && (
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                <ProductsPageSizeSelect size={search.size} onChange={search.setPageSize} />
                <Pagination
                  page={search.page}
                  totalPages={search.totalPages}
                  onPageChange={handlePageChange}
                  activeClassName="bg-purple-600 text-white"
                />
              </div>
            )}
          </div>
        </div>

        <ProductsTrustStrip />
      </div>

      <MobileFilterDrawer
        isOpen={isMobileFiltersOpen}
        onClose={() => setIsMobileFiltersOpen(false)}
        {...sidebarProps}
        onApply={(nextCategories, nextBrands) => {
          handleApply(nextCategories, nextBrands);
          setIsMobileFiltersOpen(false);
        }}
        onClear={() => {
          handleClear();
          setIsMobileFiltersOpen(false);
        }}
      />

      <PublicFooter settings={settings} />
    </div>
  );
}

export default BrowseProductsPage;
