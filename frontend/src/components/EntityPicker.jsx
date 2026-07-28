import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, X } from 'lucide-react';

function EntityPicker({ label, inputId, searchPlaceholder, selectedItems, onChange, search, getItemLabel }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      // Resetting to the empty state when the query clears is the standard
      // reset-on-external-change pattern; it can't cascade since `query` itself isn't touched here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return undefined;
    }

    let isCancelled = false;
    setIsSearching(true);
    search(trimmed)
      .then((items) => {
        if (!isCancelled) setResults(items);
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
    // `search` must be a referentially-stable function provided by the caller (module-level or
    // useCallback-memoized) -- see this component's Interfaces contract in the implementation plan.
  }, [query, search]);

  function handleAdd(item) {
    if (selectedItems.some((selected) => selected.id === item.id)) return;
    onChange([...selectedItems, item]);
    setQuery('');
  }

  function handleRemove(id) {
    onChange(selectedItems.filter((item) => item.id !== id));
  }

  function handleMoveUp(index) {
    if (index === 0) return;
    const next = [...selectedItems];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function handleMoveDown(index) {
    if (index === selectedItems.length - 1) return;
    const next = [...selectedItems];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    onChange(next);
  }

  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={searchPlaceholder}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      {isSearching && <p className="mt-1 text-sm text-slate-400">Searching...</p>}
      {!isSearching && results.length > 0 && (
        <ul className="mt-1 rounded-md border border-slate-200 bg-white shadow-sm">
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleAdd(item)}
                className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {getItemLabel(item)}
              </button>
            </li>
          ))}
        </ul>
      )}

      <ul className="mt-3 space-y-2">
        {selectedItems.map((item, index) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
          >
            <span className="text-sm text-slate-700">{getItemLabel(item)}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleMoveUp(index)}
                disabled={index === 0}
                aria-label={`Move ${getItemLabel(item)} up`}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleMoveDown(index)}
                disabled={index === selectedItems.length - 1}
                aria-label={`Move ${getItemLabel(item)} down`}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowDown size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                aria-label={`Remove ${getItemLabel(item)}`}
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

export default EntityPicker;
