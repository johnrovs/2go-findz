import { renderHook, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useBrowseProductsSearch } from './useBrowseProductsSearch.js';
import * as productService from '../services/productService.js';

function wrapper({ children }) {
  return <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>;
}

describe('useBrowseProductsSearch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches products on mount with newest-first sort, grid view, and a 24-item page size by default', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: [{ id: 1, name: 'Product One' }],
      totalPages: 1,
      totalElements: 1,
    });

    const { result } = renderHook(() => useBrowseProductsSearch(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(productService.searchProducts).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, size: 24, sort: 'createdAt,desc' })
    );
    expect(result.current.products).toEqual([{ id: 1, name: 'Product One' }]);
    expect(result.current.view).toBe('grid');
    expect(result.current.categories).toEqual([]);
    expect(result.current.brands).toEqual([]);
  });

  it('setSearch updates the search param, refetches, and resets to page 1', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
    const { result } = renderHook(() => useBrowseProductsSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setSearch('earbuds'));

    await waitFor(() => expect(result.current.search).toBe('earbuds'));
    expect(productService.searchProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'earbuds', page: 0 })
    );
  });

  it('toggleCategory adds and removes category ids, sending categoryIds as a comma-joined param', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
    const { result } = renderHook(() => useBrowseProductsSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.toggleCategory('1'));
    await waitFor(() => expect(result.current.categories).toEqual(['1']));

    act(() => result.current.toggleCategory('2'));
    await waitFor(() => expect(result.current.categories).toEqual(['1', '2']));
    expect(productService.searchProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({ categoryIds: '1,2' })
    );

    act(() => result.current.toggleCategory('1'));
    await waitFor(() => expect(result.current.categories).toEqual(['2']));
  });

  it('toggleBrand adds and removes brands, sending brands as a comma-joined param', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
    const { result } = renderHook(() => useBrowseProductsSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.toggleBrand('Sony'));
    await waitFor(() => expect(result.current.brands).toEqual(['Sony']));
    expect(productService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ brands: 'Sony' }));
  });

  it('applyFilters sets categories and brands together in a single update and resets to page 1', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
    const { result } = renderHook(() => useBrowseProductsSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.applyFilters(['1', '2'], ['Sony', 'Bose']));

    await waitFor(() => expect(result.current.categories).toEqual(['1', '2']));
    expect(result.current.brands).toEqual(['Sony', 'Bose']);
    expect(productService.searchProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({ categoryIds: '1,2', brands: 'Sony,Bose', page: 0 })
    );
  });

  it('setSort maps friendly sort values to the backend sort syntax and resets to page 1', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
    const { result } = renderHook(() => useBrowseProductsSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setSort('nameAZ'));

    await waitFor(() => expect(result.current.sort).toBe('nameAZ'));
    expect(productService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'name,asc' }));
  });

  it('setPage sends the zero-indexed page to the backend without resetting other filters', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 5, totalElements: 100 });
    const { result } = renderHook(() => useBrowseProductsSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setPage(3));

    await waitFor(() => expect(result.current.page).toBe(3));
    expect(productService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  });

  it('setPageSize updates size, resets to page 1, and rejects unsupported sizes', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
    const { result } = renderHook(() => useBrowseProductsSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setPageSize(48));
    await waitFor(() => expect(result.current.size).toBe(48));
    expect(productService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ size: 48, page: 0 }));

    act(() => result.current.setPageSize(999));
    await waitFor(() => expect(result.current.size).toBe(24));
  });

  it('setView toggles between grid and list without refetching (pure UI state)', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
    const { result } = renderHook(() => useBrowseProductsSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const callCountBefore = productService.searchProducts.mock.calls.length;
    act(() => result.current.setView('list'));
    await waitFor(() => expect(result.current.view).toBe('list'));
    expect(productService.searchProducts.mock.calls.length).toBe(callCountBefore);
  });

  it('clearAll resets search, categories, and brands but preserves sort', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
    const { result } = renderHook(() => useBrowseProductsSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setSearch('earbuds');
      result.current.toggleCategory('1');
      result.current.toggleBrand('Sony');
      result.current.setSort('nameAZ');
    });
    await waitFor(() => expect(result.current.sort).toBe('nameAZ'));

    act(() => result.current.clearAll());

    await waitFor(() => expect(result.current.search).toBe(''));
    expect(result.current.categories).toEqual([]);
    expect(result.current.brands).toEqual([]);
    expect(result.current.sort).toBe('nameAZ');
  });

  it('resetAll clears every filter including sort', async () => {
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
    const { result } = renderHook(() => useBrowseProductsSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setSearch('earbuds');
      result.current.setSort('nameAZ');
    });
    await waitFor(() => expect(result.current.sort).toBe('nameAZ'));

    act(() => result.current.resetAll());

    await waitFor(() => expect(result.current.sort).toBe('newest'));
    expect(result.current.search).toBe('');
  });

  it('exposes an error message when the fetch fails', async () => {
    vi.spyOn(productService, 'searchProducts').mockRejectedValue({ message: 'Network error. Please try again.' });

    const { result } = renderHook(() => useBrowseProductsSearch(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Network error. Please try again.');
  });
});
