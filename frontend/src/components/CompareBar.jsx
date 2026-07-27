import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trash2, X } from 'lucide-react';
import { useCompare } from '../hooks/useCompare.js';
import { compareProducts } from '../services/productService.js';
import { getImageUrl } from '../utils/imageUrl.js';

function CompareBar() {
  const location = useLocation();
  const { ids, remove, clear } = useCompare();
  const [products, setProducts] = useState([]);
  // Compare is a public shopping feature; it has no place on the admin login screen or
  // anywhere inside the admin console.
  const isPublicRoute = !location.pathname.startsWith('/admin') && location.pathname !== '/login';

  useEffect(() => {
    if (ids.length === 0 || !isPublicRoute) {
      // Clearing thumbnails when the list empties out (or the bar is hidden on a
      // non-public route) is the standard reset-on-external-change pattern; it can't
      // cascade since neither `ids` nor `isPublicRoute` is touched here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProducts([]);
      return undefined;
    }

    let isCancelled = false;
    compareProducts(ids)
      .then((data) => {
        if (!isCancelled) setProducts(data);
      })
      .catch(() => {
        if (!isCancelled) setProducts([]);
      });

    return () => {
      isCancelled = true;
    };
  }, [ids, isPublicRoute]);

  if (ids.length === 0 || !isPublicRoute) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white shadow-lg">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {products.map((product) => (
            <div key={product.id} className="relative">
              <img
                src={getImageUrl(product.imageFileName)}
                alt={product.name}
                className="h-12 w-12 rounded-md object-cover"
              />
              <button
                type="button"
                onClick={() => remove(product.id)}
                aria-label={`Remove ${product.name} from compare`}
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={clear}
          aria-label="Clear compare list"
          className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
        >
          <Trash2 size={16} />
          Clear
        </button>
        <Link
          to="/compare"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          Compare ({ids.length})
        </Link>
      </div>
    </div>
  );
}

export default CompareBar;
