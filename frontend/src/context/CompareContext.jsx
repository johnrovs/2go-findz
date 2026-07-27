import { createContext, useEffect, useState } from 'react';

// eslint-disable-next-line react-refresh/only-export-components -- context and provider are intentionally co-located
export const CompareContext = createContext(null);

const STORAGE_KEY = 'compareProductIds';
const MAX_COMPARE_ITEMS = 4;

function readStoredIds() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export function CompareProvider({ children }) {
  const [ids, setIds] = useState(readStoredIds);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids]);

  function toggle(id) {
    setIds((current) => {
      if (current.includes(id)) {
        return current.filter((existingId) => existingId !== id);
      }
      if (current.length >= MAX_COMPARE_ITEMS) {
        return current;
      }
      return [...current, id];
    });
  }

  function remove(id) {
    setIds((current) => current.filter((existingId) => existingId !== id));
  }

  function clear() {
    setIds([]);
  }

  function isSelected(id) {
    return ids.includes(id);
  }

  const isFull = ids.length >= MAX_COMPARE_ITEMS;

  return (
    <CompareContext.Provider value={{ ids, toggle, remove, clear, isSelected, isFull }}>
      {children}
    </CompareContext.Provider>
  );
}
