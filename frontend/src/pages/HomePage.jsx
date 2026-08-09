import { useEffect, useState } from 'react';
import { Award, Flame, LayoutGrid, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import PublicFooter from '../components/PublicFooter.jsx';
import HomeHero from '../components/home/HomeHero.jsx';
import SocialMediaStrip from '../components/home/SocialMediaStrip.jsx';
import HomeSectionCard from '../components/home/HomeSectionCard.jsx';
import ProductCarousel from '../components/home/ProductCarousel.jsx';
import TrendingRightNowSection from '../components/home/TrendingRightNowSection.jsx';
import BestSellersSection from '../components/home/BestSellersSection.jsx';
import CategoryGridSection from '../components/home/CategoryGridSection.jsx';
import BrowseProductsBanner from '../components/home/BrowseProductsBanner.jsx';
import { getSettings } from '../services/settingsService.js';
import { getCategories } from '../services/categoryService.js';
import { searchProducts } from '../services/productService.js';
import { recordView } from '../services/trackingService.js';

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
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
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

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main>
        <HomeHero
          headline={settings?.heroHeadline ?? 'Smart Finds. Better Buys. All in One Place.'}
          description={
            settings?.heroDescription ??
            'Discover trending Amazon products, everyday essentials, affordable finds, and must-have items carefully selected to help you shop smarter.'
          }
        />

        <section className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SocialMediaStrip settings={settings} />
          </div>
        </section>

        {featured.products.length > 0 && (
          <section className="bg-surface-secondary py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <HomeSectionCard
                icon={Sparkles}
                title="Featured Products"
                description="Hand-picked finds worth a closer look."
                viewAllHref="/products"
              >
                <ProductCarousel products={featured.products} />
              </HomeSectionCard>
            </div>
          </section>
        )}

        {(trending.products.length > 0 || bestSellers.products.length > 0) && (
          <section className="py-24">
            <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
              {trending.products.length > 0 && (
                <HomeSectionCard
                  icon={Flame}
                  title="Trending Right Now"
                  description="What everyone's buying."
                  viewAllHref="/trending"
                >
                  <TrendingRightNowSection products={trending.products} />
                </HomeSectionCard>
              )}
              {bestSellers.products.length > 0 && (
                <HomeSectionCard
                  icon={Award}
                  title="Best Sellers"
                  description="Our most popular picks."
                  viewAllHref="/best-sellers"
                >
                  <BestSellersSection products={bestSellers.products} />
                </HomeSectionCard>
              )}
            </div>
          </section>
        )}

        {categories.length > 0 && (
          <section className="bg-surface-secondary py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <HomeSectionCard
                icon={LayoutGrid}
                title="Shop by Category"
                description="Browse curated recommendations by category."
                viewAllHref="/categories"
              >
                <CategoryGridSection categories={categories} />
              </HomeSectionCard>
            </div>
          </section>
        )}

        <section className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <BrowseProductsBanner />
          </div>
        </section>
      </main>

      <PublicFooter settings={settings} />
    </div>
  );
}

export default HomePage;
