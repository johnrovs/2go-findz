import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';

function SearchInput({ value, onChange, placeholder = 'Search products...' }) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleChange(event) {
    const next = event.target.value;
    setLocalValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onChange(next), 300);
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label="Search products"
        className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

export default SearchInput;
