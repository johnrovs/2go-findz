import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as adminProductService from '../services/adminProductService.js';
import { useProductCatalogSearch } from './useProductCatalogSearch.js';

describe('useProductCatalogSearch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches products on mount with default paging', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({
      content: [{ id: 1, name: 'Blender' }],
      totalPages: 1,
      totalElements: 1,
    });

    const { result } = renderHook(() => useProductCatalogSearch());

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(adminProductService.searchProducts).toHaveBeenCalledWith({ page: 0, size: 20, sort: 'createdAt,asc' });
    expect(result.current.products).toEqual([{ id: 1, name: 'Blender' }]);
    expect(result.current.totalPages).toBe(1);
  });

  it('includes search, categoryId, and brand params only when set, and resets to page 1', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
    const { result } = renderHook(() => useProductCatalogSearch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setPage(3));
    await waitFor(() => expect(result.current.page).toBe(3));

    act(() => result.current.setSearch('lamp'));
    await waitFor(() =>
      expect(adminProductService.searchProducts).toHaveBeenLastCalledWith({
        page: 0,
        size: 20,
        sort: 'createdAt,asc',
        search: 'lamp',
      })
    );
    expect(result.current.page).toBe(1);

    act(() => result.current.setCategoryId('5'));
    await waitFor(() =>
      expect(adminProductService.searchProducts).toHaveBeenLastCalledWith({
        page: 0,
        size: 20,
        sort: 'createdAt,asc',
        search: 'lamp',
        categoryId: '5',
      })
    );

    act(() => result.current.setBrand('Nike'));
    await waitFor(() =>
      expect(adminProductService.searchProducts).toHaveBeenLastCalledWith({
        page: 0,
        size: 20,
        sort: 'createdAt,asc',
        search: 'lamp',
        categoryId: '5',
        brand: 'Nike',
      })
    );
  });

  it('surfaces a fetch error and reload() clears and re-fetches', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockRejectedValueOnce(new Error('Network down'));
    const { result } = renderHook(() => useProductCatalogSearch());
    await waitFor(() => expect(result.current.error).toBe('Network down'));

    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.error).toBe(null));
  });
});
