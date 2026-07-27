import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useDashboardData } from './useDashboardData.js';
import * as dashboardService from '../services/dashboardService.js';

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dashboardService, 'getSummary').mockResolvedValue({ totalViews: 10 });
    vi.spyOn(dashboardService, 'getAnalytics').mockResolvedValue({ viewsByDay: [] });
  });

  it('defaults to the last30 preset and fetches a range ending today', async () => {
    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.preset).toBe('last30');
    const [summaryParams] = dashboardService.getSummary.mock.calls[0];
    const today = new Date().toISOString().slice(0, 10);
    expect(summaryParams.to).toBe(today);
  });

  it('the "today" preset sends the same from and to date', async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setPreset('today'));

    await waitFor(() => expect(result.current.preset).toBe('today'));
    const lastCall = dashboardService.getSummary.mock.calls.at(-1)[0];
    expect(lastCall.from).toBe(lastCall.to);
  });

  it('the "custom" preset uses the manually set dates', async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.setPreset('custom'));
    act(() => result.current.setCustomFrom('2026-01-01'));
    act(() => result.current.setCustomTo('2026-01-31'));

    await waitFor(() =>
      expect(dashboardService.getSummary).toHaveBeenLastCalledWith({ from: '2026-01-01', to: '2026-01-31' })
    );
  });

  it('reload triggers a re-fetch with the same params', async () => {
    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.reload());

    await waitFor(() => expect(dashboardService.getSummary).toHaveBeenCalledTimes(2));
  });

  it('exposes an error message when either fetch fails', async () => {
    dashboardService.getAnalytics.mockRejectedValue({ message: 'Network error. Please try again.' });

    const { result } = renderHook(() => useDashboardData());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe('Network error. Please try again.');
  });
});
