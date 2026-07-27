import { renderHook, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useProductSearch } from './useProductSearch.js';
import * as productService from '../services/productService.js';

function wrapper({ children }) {
  return <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>;
}

describe('useProductSearch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches products on mount with the default (oldest-first) sort and no filters', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [{ id: 1, name: 'Product One' }],
      totalPages: 1,
      totalElements: 1,
    });

    const { result } = renderHook(() => useProductSearch(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(productService.searchProducts).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, size: 12, sort: 'createdAt,asc' })
    );
    expect(result.current.products).toEqual([{ id: 1, name: 'Product One' }]);
    expect(result.current.totalPages).toBe(1);
  });

  it('setSearch updates the search param and refetches, resetting to page 1', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [],
      totalPages: 0,
      totalElements: 0,
    });

    const { result } = renderHook(() => useProductSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setSearch('earbuds');
    });

    await waitFor(() => expect(result.current.search).toBe('earbuds'));
    expect(productService.searchProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'earbuds', page: 0 })
    );
  });

  it('setFilter("trending") sends trending=true and setFilter("all") clears it', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [],
      totalPages: 0,
      totalElements: 0,
    });

    const { result } = renderHook(() => useProductSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setFilter('trending');
    });
    await waitFor(() => expect(result.current.filter).toBe('trending'));
    expect(productService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ trending: true }));

    act(() => {
      result.current.setFilter('all');
    });
    await waitFor(() => expect(result.current.filter).toBe('all'));
    const lastCallParams = productService.searchProducts.mock.calls.at(-1)[0];
    expect(lastCallParams.trending).toBeUndefined();
    expect(lastCallParams.bestSeller).toBeUndefined();
  });

  it('setSort maps friendly sort values to the backend sort syntax', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [],
      totalPages: 0,
      totalElements: 0,
    });

    const { result } = renderHook(() => useProductSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setSort('priceLowToHigh');
    });

    await waitFor(() => expect(result.current.sort).toBe('priceLowToHigh'));
    expect(productService.searchProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: 'productPrice,asc' })
    );
  });

  it('setPage sends the zero-indexed page to the backend', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [],
      totalPages: 5,
      totalElements: 50,
    });

    const { result } = renderHook(() => useProductSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setPage(3);
    });

    await waitFor(() => expect(result.current.page).toBe(3));
    expect(productService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  });

  it('exposes an error message when the fetch fails', async () => {
    vi.spyOn(productService, 'searchProducts').mockRejectedValue({ message: 'Network error. Please try again.' });

    const { result } = renderHook(() => useProductSearch(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Network error. Please try again.');
  });
});
