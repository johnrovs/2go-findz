import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { searchProducts } from '../../services/adminProductService.js';

function ProductsTab({ products, onChange, fieldErrors }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return undefined;
    }

    let isCancelled = false;
    setIsSearching(true);
    searchProducts({ search: trimmed, size: 5 })
      .then((data) => {
        if (!isCancelled) setResults(data.content);
      })
      .catch(() => {
        if (!isCancelled) setResults([]);
      })
      .finally(() => {
        if (!isCancelled) setIsSearching(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [query]);

  function handleAdd(product) {
    if (products.some((p) => p.productId === product.id)) return;
    onChange([
      ...products,
      {
        productId: product.id,
        name: product.name,
        badge: '',
        recommendation: '',
        bestFor: '',
        mainStrength: '',
        mainWeakness: '',
        pros: '',
        cons: '',
        editorsScore: '',
      },
    ]);
    setQuery('');
  }

  function handleRemove(productId) {
    onChange(products.filter((p) => p.productId !== productId));
  }

  function handleMoveUp(index) {
    if (index === 0) return;
    const next = [...products];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function handleMoveDown(index) {
    if (index === products.length - 1) return;
    const next = [...products];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  function handleFieldChange(index, field, value) {
    const next = [...products];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  }

  return (
    <div>
      <label htmlFor="productSearch" className="mb-1 block text-sm font-medium text-slate-700">
        Compared Products
      </label>
      <input
        id="productSearch"
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search products to add..."
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {isSearching && <p className="mt-1 text-sm text-slate-400">Searching...</p>}
      {!isSearching && results.length > 0 && (
        <ul className="mt-1 rounded-md border border-slate-200 bg-white shadow-sm">
          {results.map((product) => (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => handleAdd(product)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {product.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {fieldErrors.products && <p className="mt-1 text-sm text-red-600">{fieldErrors.products}</p>}

      <ul className="mt-4 space-y-4">
        {products.map((product, index) => (
          <li key={product.productId} className="rounded-md border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">{product.name}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  aria-label={`Move ${product.name} up`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === products.length - 1}
                  aria-label={`Move ${product.name} down`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(product.productId)}
                  aria-label={`Remove ${product.name}`}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor={`badge-${product.productId}`} className="mb-1 block text-xs font-medium text-slate-700">
                  Badge
                </label>
                <input
                  id={`badge-${product.productId}`}
                  type="text"
                  value={product.badge}
                  onChange={(event) => handleFieldChange(index, 'badge', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor={`editorsScore-${product.productId}`} className="mb-1 block text-xs font-medium text-slate-700">
                  Editor's Score
                </label>
                <input
                  id={`editorsScore-${product.productId}`}
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={product.editorsScore}
                  onChange={(event) => handleFieldChange(index, 'editorsScore', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`recommendation-${product.productId}`} className="mb-1 block text-xs font-medium text-slate-700">
                  Recommendation
                </label>
                <input
                  id={`recommendation-${product.productId}`}
                  type="text"
                  value={product.recommendation}
                  onChange={(event) => handleFieldChange(index, 'recommendation', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor={`bestFor-${product.productId}`} className="mb-1 block text-xs font-medium text-slate-700">
                  Best For
                </label>
                <input
                  id={`bestFor-${product.productId}`}
                  type="text"
                  value={product.bestFor}
                  onChange={(event) => handleFieldChange(index, 'bestFor', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor={`mainStrength-${product.productId}`} className="mb-1 block text-xs font-medium text-slate-700">
                  Main Strength
                </label>
                <input
                  id={`mainStrength-${product.productId}`}
                  type="text"
                  value={product.mainStrength}
                  onChange={(event) => handleFieldChange(index, 'mainStrength', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor={`mainWeakness-${product.productId}`} className="mb-1 block text-xs font-medium text-slate-700">
                  Main Weakness
                </label>
                <input
                  id={`mainWeakness-${product.productId}`}
                  type="text"
                  value={product.mainWeakness}
                  onChange={(event) => handleFieldChange(index, 'mainWeakness', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor={`pros-${product.productId}`} className="mb-1 block text-xs font-medium text-slate-700">
                  Pros
                </label>
                <textarea
                  id={`pros-${product.productId}`}
                  rows={2}
                  value={product.pros}
                  onChange={(event) => handleFieldChange(index, 'pros', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor={`cons-${product.productId}`} className="mb-1 block text-xs font-medium text-slate-700">
                  Cons
                </label>
                <textarea
                  id={`cons-${product.productId}`}
                  rows={2}
                  value={product.cons}
                  onChange={(event) => handleFieldChange(index, 'cons', event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            {fieldErrors[`product-${index}-prosCons`] && (
              <p className="mt-2 text-sm text-red-600">{fieldErrors[`product-${index}-prosCons`]}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ProductsTab;
