import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal.jsx';
import SearchInput from './SearchInput.jsx';
import LoadingSpinner from './LoadingSpinner.jsx';
import EmptyState from './EmptyState.jsx';
import ErrorState from './ErrorState.jsx';
import { searchProducts } from '../services/productService.js';
import { getImageUrl } from '../utils/imageUrl.js';

function SearchModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) return;
    // Resetting the modal's internal state when it closes is the standard
    // cleanup-on-close pattern; it can't cascade since `isOpen` isn't touched here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery('');
    setResults([]);
    setError(null);
  }, [isOpen]);

  useEffect(() => {
    let isCancelled = false;
    const trimmed = query.trim();

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);

    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);
    searchProducts({ search: trimmed, page: 0, size: 5 })
      .then((data) => {
        if (isCancelled) return;
        setResults(data.content);
      })
      .catch((err) => {
        if (isCancelled) return;
        setError(err.message ?? 'Failed to search products.');
      })
      .finally(() => {
        if (isCancelled) return;
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [query]);

  function goToResults(term) {
    onClose();
    navigate(`/?search=${encodeURIComponent(term)}#catalog`);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (query.trim()) {
      goToResults(query.trim());
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Search Products">
      <form onSubmit={handleSubmit}>
        <SearchInput value={query} onChange={setQuery} />
      </form>

      <div className="mt-4">
        {isLoading && <LoadingSpinner label="Searching..." />}
        {!isLoading && error && <ErrorState message={error} />}
        {!isLoading && !error && query.trim() && results.length === 0 && (
          <EmptyState title="No products found" description="Try a different search term." />
        )}
        {!isLoading && !error && results.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {results.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => goToResults(query.trim())}
                  className="flex w-full items-center gap-3 py-3 text-left hover:bg-slate-50"
                >
                  {getImageUrl(product.imageFileName) ? (
                    <img
                      src={getImageUrl(product.imageFileName)}
                      alt={product.name}
                      className="h-12 w-12 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 shrink-0 rounded-md bg-slate-100" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{product.name}</p>
                    <p className="text-sm text-slate-500">${Number(product.productPrice).toFixed(2)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

export default SearchModal;
