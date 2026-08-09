import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Button from '../components/Button.jsx';
import PublicFooter from '../components/PublicFooter.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { useCompare } from '../hooks/useCompare.js';
import { compareProducts } from '../services/productService.js';
import { getSettings } from '../services/settingsService.js';
import { getImageUrl } from '../utils/imageUrl.js';

function ComparePage() {
  const { ids, remove } = useCompare();
  const [settings, setSettings] = useState(null);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    if (ids.length === 0) {
      // Resetting to the empty state when the list empties out is the standard
      // reset-on-external-change pattern; it can't cascade since `ids` itself isn't touched here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProducts([]);
      setIsLoading(false);
      return undefined;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    compareProducts(ids)
      .then((data) => {
        if (isCancelled) return;
        setProducts(data);
      })
      .catch((err) => {
        if (isCancelled) return;
        setError(err.message ?? 'Failed to load products to compare.');
      })
      .finally(() => {
        if (isCancelled) return;
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [ids]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="Compare Products" description="See your selected products side by side." />

          {isLoading && <LoadingSpinner label="Loading products to compare..." />}
          {!isLoading && error && <ErrorState message={error} />}
          {!isLoading && !error && products.length < 2 && (
            <div className="text-center">
              <EmptyState
                title="Add at least 2 products to compare"
                description="Use the compare icon on any product card to add it here."
              />
              <Link to="/#catalog" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
                Browse products
              </Link>
            </div>
          )}
          {!isLoading && !error && products.length >= 2 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] table-fixed border-collapse text-left">
                <thead className="sticky top-16 z-10 bg-white">
                  <tr>
                    <th scope="col" className="w-32 p-3 text-sm font-medium text-slate-500"></th>
                    {products.map((product) => (
                      <th key={product.id} scope="col" className="p-3 align-top">
                        <button
                          type="button"
                          onClick={() => remove(product.id)}
                          aria-label={`Remove ${product.name} from compare`}
                          className="mb-2 ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
                        >
                          <X size={14} />
                        </button>
                        <img
                          src={getImageUrl(product.imageFileName)}
                          alt={product.name}
                          className="aspect-square w-full rounded-lg object-cover"
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="odd:bg-white even:bg-surface-secondary hover:bg-primary/5">
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                      Name
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3 text-sm font-semibold text-slate-900">
                        {product.name}
                      </td>
                    ))}
                  </tr>
                  <tr className="odd:bg-white even:bg-surface-secondary hover:bg-primary/5">
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                      Category
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3 text-sm text-slate-700">
                        {product.categoryName}
                      </td>
                    ))}
                  </tr>
                  <tr className="odd:bg-white even:bg-surface-secondary hover:bg-primary/5">
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                      Price
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3 text-sm font-semibold text-slate-900">
                        ${Number(product.productPrice).toFixed(2)}
                      </td>
                    ))}
                  </tr>
                  <tr className="odd:bg-white even:bg-surface-secondary hover:bg-primary/5">
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                      Badges
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3 text-sm text-slate-700">
                        <div className="flex flex-wrap gap-1.5">
                          {product.trending && (
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                              Trending
                            </span>
                          )}
                          {product.bestSeller && (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                              Best Seller
                            </span>
                          )}
                          {!product.trending && !product.bestSeller && <span className="text-slate-400">—</span>}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr className="odd:bg-white even:bg-surface-secondary hover:bg-primary/5">
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                      Description
                    </th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3 text-sm text-slate-600">
                        {product.description}
                      </td>
                    ))}
                  </tr>
                  <tr className="odd:bg-white even:bg-surface-secondary hover:bg-primary/5">
                    <th scope="row" className="p-3 text-sm font-medium text-slate-500"></th>
                    {products.map((product) => (
                      <td key={product.id} className="p-3">
                        <Button
                          variant="amazon"
                          href={product.productLink}
                          target="_blank"
                          rel="nofollow sponsored noopener noreferrer"
                        >
                          View on Amazon
                        </Button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      <PublicFooter settings={settings} />
    </div>
  );
}

export default ComparePage;
