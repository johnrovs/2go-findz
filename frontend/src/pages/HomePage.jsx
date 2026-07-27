import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import HeroCarousel from '../components/HeroCarousel.jsx';
import SocialLinks from '../components/SocialLinks.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import CategoryCard from '../components/CategoryCard.jsx';
import ProductFilters from '../components/ProductFilters.jsx';
import SearchInput from '../components/SearchInput.jsx';
import Pagination from '../components/Pagination.jsx';
import Footer from '../components/Footer.jsx';
import { useProductSearch } from '../hooks/useProductSearch.js';
import { getSettings } from '../services/settingsService.js';
import { getCategories } from '../services/categoryService.js';
import { searchProducts } from '../services/productService.js';
import { recordView } from '../services/trackingService.js';
import { getHeroBanners } from '../services/heroBannerService.js';

function useTeaserProducts(params) {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    searchProducts({ ...params, page: 0, size: 8 })
      .then((data) => {
        if (!isCancelled) setProducts(data.content);
      })
      .catch(() => {
        if (!isCancelled) setProducts([]);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });
    return () => {
      isCancelled = true;
    };
    // params is a stable literal passed by the caller at each call site; re-running this
    // effect only on mount is intentional for a homepage teaser section.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { products, isLoading };
}

function HomePage() {
  const location = useLocation();
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [heroBanners, setHeroBanners] = useState([]);
  const productSearch = useProductSearch();
  const featured = useTeaserProducts({ sort: 'createdAt,desc' });
  const trending = useTeaserProducts({ trending: true, sort: 'createdAt,desc' });
  const bestSellers = useTeaserProducts({ bestSeller: true, sort: 'createdAt,desc' });

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
    getHeroBanners()
      .then(setHeroBanners)
      .catch(() => setHeroBanners([]));
  }, []);

  useEffect(() => {
    if (!sessionStorage.getItem('sessionId')) {
      recordView()
        .then(({ sessionId }) => sessionStorage.setItem('sessionId', sessionId))
        .catch(() => {
          // View tracking is best-effort; never block page rendering on it.
        });
    }
  }, []);

  function scrollToCatalog() {
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  }

  useEffect(() => {
    if (location.hash !== '#catalog') return;
    // Re-running the scroll as each async section finishes loading corrects for the
    // layout shift its content causes above the catalog section; a single scroll on
    // mount lands short because the hero banner and teaser grids are still collapsed
    // to their loading-spinner height at that point.
    scrollToCatalog();
  }, [location.hash, heroBanners, featured.isLoading, trending.isLoading, bestSellers.isLoading]);

  function handleCategorySelect(categoryId) {
    productSearch.setCategoryId(String(categoryId));
    scrollToCatalog();
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <HeroCarousel
        banners={heroBanners}
        heroSectionProps={{
          headline: settings?.heroHeadline ?? 'Smart Finds. Better Buys. All in One Place.',
          description:
            settings?.heroDescription ??
            'Discover trending Amazon products, everyday essentials, affordable finds, and must-have items carefully selected to help you shop smarter.',
          onExploreClick: scrollToCatalog,
          onTrendingClick: () => {
            productSearch.setFilter('trending');
            scrollToCatalog();
          },
        }}
      />

      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SocialLinks settings={settings} />
        </div>
      </section>

      {featured.products.length > 0 && (
        <section className="bg-slate-50 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading title="Featured Products" />
            <ProductGrid products={featured.products} isLoading={featured.isLoading} error={null} />
          </div>
        </section>
      )}

      {trending.products.length > 0 && (
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading title="Trending Finds" />
            <ProductGrid products={trending.products} isLoading={trending.isLoading} error={null} />
          </div>
        </section>
      )}

      {bestSellers.products.length > 0 && (
        <section className="bg-slate-50 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading title="Best Sellers" />
            <ProductGrid products={bestSellers.products} isLoading={bestSellers.isLoading} error={null} />
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading title="Shop by Category" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} onClick={handleCategorySelect} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="catalog" className="scroll-mt-20 bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Browse All Products" description="Search, filter, and sort our full catalog." />
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
          <ProductGrid
            products={productSearch.products}
            isLoading={productSearch.isLoading}
            error={productSearch.error}
          />
          <Pagination page={productSearch.page} totalPages={productSearch.totalPages} onPageChange={productSearch.setPage} />
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <SectionHeading title="Why Shop with 2Go Findz" />
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Handpicked Selections</h3>
              <p className="mt-2 text-sm text-slate-600">
                Every product is carefully chosen to save you time and help you shop smarter.
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Always Up to Date</h3>
              <p className="mt-2 text-sm text-slate-600">New trending finds and best sellers are added regularly.</p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Trusted Recommendations</h3>
              <p className="mt-2 text-sm text-slate-600">
                Transparent, honest picks — no gimmicks, just genuinely useful products.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-indigo-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <SectionHeading title="Follow Us for More Finds" description="Join our community for daily deals and new arrivals." />
          <SocialLinks settings={settings} />
        </div>
      </section>

      <Footer settings={settings} />
    </div>
  );
}

export default HomePage;
