import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchProducts } from '../services/adminProductService.js';

const DEFAULT_PAGE_SIZE = 20;

export function useAdminProductSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const search = searchParams.get('search') ?? '';
  const categoryId = searchParams.get('category') ?? '';
  const filter = searchParams.get('filter') ?? 'all';
  const status = searchParams.get('status') ?? 'all';
  const sortKey = searchParams.get('sortKey') ?? 'createdAt';
  const sortDirection = searchParams.get('sortDirection') ?? 'asc';
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('pageSize') ?? DEFAULT_PAGE_SIZE);

  useEffect(() => {
    let isCancelled = false;
    // Resetting loading/error state at the start of each fetch is the standard
    // reset-before-async-work pattern; it can't cascade since neither value
    // is a dependency of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    const params = {
      page: page - 1,
      size: pageSize,
      sort: `${sortKey},${sortDirection}`,
    };
    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;
    if (filter === 'trending') params.trending = true;
    if (filter === 'bestSeller') params.bestSeller = true;
    if (status === 'active') params.active = true;
    if (status === 'inactive') params.active = false;

    searchProducts(params)
      .then((data) => {
        if (isCancelled) return;
        setProducts(data.content);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
      })
      .catch((err) => {
        if (isCancelled) return;
        setError(err.message ?? 'Failed to load products.');
      })
      .finally(() => {
        if (isCancelled) return;
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [search, categoryId, filter, status, sortKey, sortDirection, page, pageSize, refreshIndex]);

  const updateParams = useCallback(
    (updates, { resetPage = true } = {}) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === '' || value === null || value === undefined) {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      });
      if (resetPage) {
        next.delete('page');
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  function handleSortChange(key) {
    if (key === sortKey) {
      updateParams({ sortDirection: sortDirection === 'asc' ? 'desc' : 'asc' }, { resetPage: false });
    } else {
      updateParams({ sortKey: key, sortDirection: 'asc' }, { resetPage: false });
    }
  }

  return {
    products,
    totalPages,
    totalElements,
    isLoading,
    error,
    search,
    categoryId,
    filter,
    status,
    sortKey,
    sortDirection,
    page,
    pageSize,
    setSearch: (value) => updateParams({ search: value }),
    setCategoryId: (value) => updateParams({ category: value }),
    setFilter: (value) => updateParams({ filter: value === 'all' ? '' : value }),
    setStatus: (value) => updateParams({ status: value === 'all' ? '' : value }),
    onSortChange: handleSortChange,
    setPage: (value) => updateParams({ page: value === 1 ? '' : value }, { resetPage: false }),
    setPageSize: (value) => updateParams({ pageSize: value }),
    setSort: (nextSortKey, nextSortDirection) =>
      updateParams({ sortKey: nextSortKey, sortDirection: nextSortDirection }, { resetPage: false }),
    reload: () => setRefreshIndex((n) => n + 1),
  };
}
