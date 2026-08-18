import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useDashboardData } from './useDashboardData.js';
import * as dashboardService from '../services/dashboardService.js';

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dashboardService, 'getSummary').mockResolvedValue({ totalViews: 1 });
    vi.spyOn(dashboardService, 'getAnalytics').mockResolvedValue({ viewsByDay: [], clicksByDay: [] });
  });

  it('defaults to a 30-day range ending today', async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const spanDays = Math.round((result.current.endDate - result.current.startDate) / 86400000);
    expect(spanDays).toBe(29);
  });

  it('fetches the current summary, analytics, and a previous-period summary in parallel', async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(dashboardService.getSummary).toHaveBeenCalledTimes(2);
    expect(dashboardService.getAnalytics).toHaveBeenCalledTimes(1);
  });

  it('requests a previous period of equal length immediately before the current range', async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setRange(new Date(2026, 4, 19), new Date(2026, 4, 25));
    });
    await waitFor(() =>
      expect(dashboardService.getSummary).toHaveBeenCalledWith({ from: '2026-05-12', to: '2026-05-18' })
    );
  });

  it('ignores a partial range (start picked, end not yet) and does not refetch', async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const callsBefore = dashboardService.getSummary.mock.calls.length;
    act(() => {
      result.current.setRange(new Date(2026, 4, 19), null);
    });

    expect(dashboardService.getSummary.mock.calls.length).toBe(callsBefore);
  });

  it('formats the comparison label as "vs Mon d – Mon d"', async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setRange(new Date(2026, 4, 19), new Date(2026, 4, 25));
    });
    await waitFor(() => expect(result.current.comparisonLabel).toBe('vs May 12 – May 18'));
  });
});
