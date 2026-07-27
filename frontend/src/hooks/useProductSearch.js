import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchProducts } from '../services/productService.js';

const SORT_MAP = {
  oldest: 'createdAt,asc',
  newest: 'createdAt,desc',
  priceLowToHigh: 'productPrice,asc',
  priceHighToLow: 'productPrice,desc',
  nameAZ: 'name,asc',
  nameZA: 'name,desc',
};

const PAGE_SIZE = 12;

export function useProductSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const search = searchParams.get('search') ?? '';
  const categoryId = searchParams.get('category') ?? '';
  const filter = searchParams.get('filter') ?? 'all';
  const sort = searchParams.get('sort') ?? 'oldest';
  const page = Number(searchParams.get('page') ?? '1');

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    const params = {
      page: page - 1,
      size: PAGE_SIZE,
      sort: SORT_MAP[sort] ?? SORT_MAP.oldest,
    };
    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;
    if (filter === 'trending') params.trending = true;
    if (filter === 'bestSeller') params.bestSeller = true;

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
  }, [search, categoryId, filter, sort, page]);

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

  return {
    products,
    totalPages,
    totalElements,
    isLoading,
    error,
    search,
    categoryId,
    filter,
    sort,
    page,
    setSearch: (value) => updateParams({ search: value }),
    setCategoryId: (value) => updateParams({ category: value }),
    setFilter: (value) => updateParams({ filter: value === 'all' ? '' : value }),
    setSort: (value) => updateParams({ sort: value === 'oldest' ? '' : value }),
    setPage: (value) => updateParams({ page: value === 1 ? '' : value }, { resetPage: false }),
  };
}
