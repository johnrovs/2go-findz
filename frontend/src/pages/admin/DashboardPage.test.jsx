import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import DashboardPage from './DashboardPage.jsx';
import * as dashboardService from '../../services/dashboardService.js';

const summary = {
  totalViews: 1204,
  totalClicks: 356,
  estimatedTotalCommission: 128.5,
  totalProducts: 42,
  totalCategories: 6,
  trendingCount: 8,
  bestSellerCount: 5,
};

const analytics = {
  viewsByDay: [{ date: '2026-07-01', count: 5 }],
  clicksByDay: [{ date: '2026-07-01', count: 2 }],
  mostClickedProducts: [{ productId: 1, productName: 'Wireless Earbuds', clickCount: 12 }],
  commissionByCategory: [{ categoryId: 1, categoryName: 'Electronics', estimatedCommission: 40 }],
  productsAddedByMonth: [{ yearMonth: '2026-07', count: 3 }],
};

function renderPage() {
  return render(<DashboardPage />);
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dashboardService, 'getSummary').mockResolvedValue(summary);
    vi.spyOn(dashboardService, 'getAnalytics').mockResolvedValue(analytics);
  });

  it('renders all seven summary cards with the correct values', async () => {
    renderPage();
    await screen.findByText('Website Views by Day');

    expect(screen.getByText('Total Views').closest('.rounded-xl')).toHaveTextContent('1204');
    expect(screen.getByText('Total Clicks').closest('.rounded-xl')).toHaveTextContent('356');
    expect(screen.getByText('Estimated Commission').closest('.rounded-xl')).toHaveTextContent('$128.50');
    expect(screen.getByText('Total Products').closest('.rounded-xl')).toHaveTextContent('42');
    expect(screen.getByText('Total Categories').closest('.rounded-xl')).toHaveTextContent('6');
    expect(screen.getByText('Trending Products').closest('.rounded-xl')).toHaveTextContent('8');
    expect(screen.getByText('Best Sellers').closest('.rounded-xl')).toHaveTextContent('5');
  });

  it('renders all five analytics chart labels', async () => {
    renderPage();

    expect(await screen.findByText('Website Views by Day')).toBeInTheDocument();
    expect(screen.getByText('Product Clicks by Day')).toBeInTheDocument();
    expect(screen.getByText('Most-Clicked Products')).toBeInTheDocument();
    expect(screen.getByText('Estimated Commission by Category')).toBeInTheDocument();
    expect(screen.getByText('Products Added by Month')).toBeInTheDocument();
  });

  it('shows custom date inputs only when the Custom Range preset is selected', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Website Views by Day');

    expect(screen.queryByLabelText('From')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Date Range'), 'custom');

    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
  });

  it('re-fetches with new params when the date filter changes', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Website Views by Day');

    await user.selectOptions(screen.getByLabelText('Date Range'), 'today');

    await waitFor(() => {
      const lastCall = dashboardService.getSummary.mock.calls.at(-1)[0];
      expect(lastCall.from).toBe(lastCall.to);
    });
  });

  it('shows an error state with retry when loading fails', async () => {
    dashboardService.getSummary.mockRejectedValueOnce({ message: 'Network error. Please try again.' });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Network error. Please try again.')).toBeInTheDocument();

    dashboardService.getSummary.mockResolvedValueOnce(summary);
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Website Views by Day')).toBeInTheDocument();
  });
});
