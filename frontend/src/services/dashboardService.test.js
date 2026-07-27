import { describe, expect, it, vi, beforeEach } from 'vitest';
import api from './api.js';
import { getSummary, getAnalytics } from './dashboardService.js';

describe('dashboardService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getSummary fetches from /admin/dashboard/summary with the given date range and returns the summary', async () => {
    const summary = { totalViews: 100, totalClicks: 20 };
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, message: 'Dashboard summary retrieved successfully.', data: summary },
    });

    const result = await getSummary({ from: '2026-07-01', to: '2026-07-27' });

    expect(api.get).toHaveBeenCalledWith('/admin/dashboard/summary', {
      params: { from: '2026-07-01', to: '2026-07-27' },
    });
    expect(result).toEqual(summary);
  });

  it('getAnalytics fetches from /admin/dashboard/analytics with the given date range and returns the analytics', async () => {
    const analytics = {
      viewsByDay: [],
      clicksByDay: [],
      mostClickedProducts: [],
      commissionByCategory: [],
      productsAddedByMonth: [],
    };
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, message: 'Dashboard analytics retrieved successfully.', data: analytics },
    });

    const result = await getAnalytics({ from: '2026-07-01', to: '2026-07-27' });

    expect(api.get).toHaveBeenCalledWith('/admin/dashboard/analytics', {
      params: { from: '2026-07-01', to: '2026-07-27' },
    });
    expect(result).toEqual(analytics);
  });
});
