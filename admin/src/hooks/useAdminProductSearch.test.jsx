import { renderHook, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useAdminProductSearch } from './useAdminProductSearch.js';
import * as adminProductService from '../services/adminProductService.js';

function wrapper({ children }) {
  return <MemoryRouter initialEntries={['/products']}>{children}</MemoryRouter>;
}

describe('useAdminProductSearch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches on mount with the default sort and no status filter', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({
      content: [{ id: 1, name: 'Product One' }],
      totalPages: 1,
      totalElements: 1,
    });

    const { result } = renderHook(() => useAdminProductSearch(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(adminProductService.searchProducts).toHaveBeenCalledWith(
      expect.objectContaining({ page: 0, size: 20, sort: 'createdAt,asc' })
    );
    const params = adminProductService.searchProducts.mock.calls[0][0];
    expect(params.active).toBeUndefined();
  });

  it('setStatus("active") sends active=true and setStatus("inactive") sends active=false', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({
      content: [],
      totalPages: 0,
      totalElements: 0,
    });
    const { result } = renderHook(() => useAdminProductSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setStatus('active'));
    await waitFor(() => expect(result.current.status).toBe('active'));
    expect(adminProductService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ active: true }));

    act(() => result.current.setStatus('inactive'));
    await waitFor(() => expect(result.current.status).toBe('inactive'));
    expect(adminProductService.searchProducts).toHaveBeenLastCalledWith(expect.objectContaining({ active: false }));
  });

  it('resets to page 1 when a filter changes', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({
      content: [],
      totalPages: 5,
      totalElements: 50,
    });
    const { result } = renderHook(() => useAdminProductSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setPage(3));
    await waitFor(() => expect(result.current.page).toBe(3));

    act(() => result.current.setFilter('trending'));
    await waitFor(() => expect(result.current.page).toBe(1));
  });

  it('onSortChange toggles direction on the same key and resets to ascending on a new key', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({
      content: [],
      totalPages: 0,
      totalElements: 0,
    });
    const { result } = renderHook(() => useAdminProductSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.onSortChange('name'));
    await waitFor(() => expect(result.current.sortKey).toBe('name'));
    expect(result.current.sortDirection).toBe('asc');

    act(() => result.current.onSortChange('name'));
    await waitFor(() => expect(result.current.sortDirection).toBe('desc'));
  });

  it('reload triggers a re-fetch with the same params', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({
      content: [],
      totalPages: 0,
      totalElements: 0,
    });
    const { result } = renderHook(() => useAdminProductSearch(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.reload());

    await waitFor(() => expect(adminProductService.searchProducts).toHaveBeenCalledTimes(2));
  });

  it('exposes an error message when the fetch fails', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockRejectedValue({
      message: 'Network error. Please try again.',
    });

    const { result } = renderHook(() => useAdminProductSearch(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Network error. Please try again.');
  });
});
