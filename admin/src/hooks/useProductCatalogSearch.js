import { useEffect, useState } from 'react';
import { searchProducts } from '../services/adminProductService.js';

const PAGE_SIZE = 20;

export function useProductCatalogSearch() {
  const [search, setSearchValue] = useState('');
  const [categoryId, setCategoryIdValue] = useState('');
  const [brand, setBrandValue] = useState('');
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    const params = { page: page - 1, size: PAGE_SIZE, sort: 'createdAt,asc' };
    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;
    if (brand) params.brand = brand;

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
  }, [search, categoryId, brand, page, refreshIndex]);

  return {
    products,
    totalPages,
    totalElements,
    isLoading,
    error,
    search,
    categoryId,
    brand,
    page,
    setSearch: (value) => {
      setSearchValue(value);
      setPage(1);
    },
    setCategoryId: (value) => {
      setCategoryIdValue(value);
      setPage(1);
    },
    setBrand: (value) => {
      setBrandValue(value);
      setPage(1);
    },
    setPage,
    reload: () => setRefreshIndex((n) => n + 1),
  };
}
