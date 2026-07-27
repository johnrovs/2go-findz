import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { searchProducts } from '../services/adminProductService.js';

function ProductPicker({ selectedProducts, onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
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
    if (selectedProducts.some((selected) => selected.id === product.id)) return;
    onChange([...selectedProducts, product]);
    setQuery('');
  }

  function handleRemove(id) {
    onChange(selectedProducts.filter((product) => product.id !== id));
  }

  function handleMoveUp(index) {
    if (index === 0) return;
    const next = [...selectedProducts];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function handleMoveDown(index) {
    if (index === selectedProducts.length - 1) return;
    const next = [...selectedProducts];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  return (
    <div>
      <label htmlFor="productSearch" className="mb-1 block text-sm font-medium text-slate-700">
        Recommended Products
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

      <ul className="mt-3 space-y-2">
        {selectedProducts.map((product, index) => (
          <li
            key={product.id}
            className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
          >
            <span className="text-sm text-slate-700">{product.name}</span>
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
                disabled={index === selectedProducts.length - 1}
                aria-label={`Move ${product.name} down`}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleRemove(product.id)}
                aria-label={`Remove ${product.name}`}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600"
              >
                <X size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ProductPicker;
