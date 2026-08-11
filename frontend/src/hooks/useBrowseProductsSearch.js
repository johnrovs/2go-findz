import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { searchProducts } from '../services/productService.js';

const SORT_MAP = {
  newest: 'createdAt,desc',
  oldest: 'createdAt,asc',
  nameAZ: 'name,asc',
  nameZA: 'name,desc',
  highestRated: 'rating,desc',
};

const DEFAULT_SORT = 'newest';
const DEFAULT_PAGE_SIZE = 24;
const ALLOWED_PAGE_SIZES = [12, 24, 48];

function parseList(value) {
  return value ? value.split(',').filter(Boolean) : [];
}

function toggleInList(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function useBrowseProductsSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryToken, setRetryToken] = useState(0);

  const search = searchParams.get('search') ?? '';
  const categories = parseList(searchParams.get('category'));
  const brands = parseList(searchParams.get('brand'));
  const sort = searchParams.get('sort') ?? DEFAULT_SORT;
  const view = searchParams.get('view') === 'list' ? 'list' : 'grid';
  const page = Number(searchParams.get('page') ?? '1');
  const requestedSize = Number(searchParams.get('size') ?? String(DEFAULT_PAGE_SIZE));
  const size = ALLOWED_PAGE_SIZES.includes(requestedSize) ? requestedSize : DEFAULT_PAGE_SIZE;

  const categoriesKey = categories.join(',');
  const brandsKey = brands.join(',');

  useEffect(() => {
    let isCancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    const params = {
      page: page - 1,
      size,
      sort: SORT_MAP[sort] ?? SORT_MAP[DEFAULT_SORT],
    };
    if (search) params.search = search;
    if (categoriesKey) params.categoryIds = categoriesKey;
    if (brandsKey) params.brands = brandsKey;

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
    // categoriesKey/brandsKey are the flattened, comparable forms of the categories/brands
    // arrays (which are freshly recreated on every render by parseList) — depending on the
    // arrays directly would refetch on every render even when their contents haven't changed.
  }, [search, categoriesKey, brandsKey, sort, page, size, retryToken]);

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
    categories,
    brands,
    sort,
    view,
    page,
    size,
    setSearch: (value) => updateParams({ search: value }),
    toggleCategory: (categoryId) => updateParams({ category: toggleInList(categories, categoryId).join(',') }),
    toggleBrand: (brand) => updateParams({ brand: toggleInList(brands, brand).join(',') }),
    applyFilters: (nextCategories, nextBrands) =>
      updateParams({ category: nextCategories.join(','), brand: nextBrands.join(',') }),
    setSort: (value) => updateParams({ sort: value === DEFAULT_SORT ? '' : value }),
    setView: (value) => updateParams({ view: value === 'grid' ? '' : value }, { resetPage: false }),
    setPage: (value) => updateParams({ page: value === 1 ? '' : value }, { resetPage: false }),
    setPageSize: (value) =>
      updateParams({ size: ALLOWED_PAGE_SIZES.includes(value) && value !== DEFAULT_PAGE_SIZE ? value : '' }),
    refetch: () => setRetryToken((token) => token + 1),
    clearAll: () => updateParams({ search: '', category: '', brand: '' }),
    resetAll: () => updateParams({ search: '', category: '', brand: '', sort: '', view: '', size: '' }),
  };
}
