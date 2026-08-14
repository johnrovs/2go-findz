import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import DashboardPage from './DashboardPage.jsx';
import * as dashboardService from '../../services/dashboardService.js';
import * as useAuthModule from '../../hooks/useAuth.js';

const currentSummary = {
  totalViews: 1204,
  totalClicks: 356,
  estimatedTotalCommission: 128.5,
  totalProducts: 42,
  totalCategories: 6,
  trendingCount: 8,
  bestSellerCount: 5,
  publishedGuideCount: 14,
  draftProductCount: 3,
  draftGuideCount: 1,
  emptyCategoryCount: 2,
};

const previousSummary = {
  ...currentSummary,
  totalViews: 1000,
  totalClicks: 300,
};

const analytics = {
  viewsByDay: [{ date: '2026-07-01', count: 5 }],
  clicksByDay: [{ date: '2026-07-01', count: 2 }],
  mostClickedProducts: [],
  commissionByCategory: [],
  productsAddedByMonth: [],
  topCategories: [
    { categoryId: 1, categoryName: 'Electronics', clickCount: 28540 },
    { categoryId: 2, categoryName: 'Home & Kitchen', clickCount: 22180 },
  ],
  recentProducts: [
    {
      id: 1,
      name: 'Soundcore Liberty 4 NC',
      imageFileName: null,
      categoryName: 'Audio',
      active: true,
      createdAt: '2026-05-25T00:00:00',
      clicks: 342,
    },
  ],
  latestGuides: [
    {
      id: 1,
      title: 'Best Wireless Earbuds Under $100',
      coverImageFilename: null,
      active: true,
      createdAt: '2026-06-01T00:00:00',
      views: 1240,
    },
  ],
};

function renderPage() {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    user: { fullName: 'John Rommel Rovero', role: 'Administrator' },
    logout: vi.fn(),
  });
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <DashboardPage />
    </MemoryRouter>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(dashboardService, 'getSummary')
      .mockResolvedValueOnce(currentSummary)
      .mockResolvedValueOnce(previousSummary);
    vi.spyOn(dashboardService, 'getAnalytics').mockResolvedValue(analytics);
  });

  it('renders exactly five KPI cards with real values, and no Estimated Commissions card', async () => {
    renderPage();
    await screen.findByText('Performance Overview');

    expect(screen.getByText('Total Views').closest('.rounded-card')).toHaveTextContent('1,204');
    expect(screen.getByText('Total Clicks').closest('.rounded-card')).toHaveTextContent('356');
    expect(screen.getByText('Total Products').closest('.rounded-card')).toHaveTextContent('42');
    expect(screen.getByText('Published Guides').closest('.rounded-card')).toHaveTextContent('14');
    expect(screen.getByText('Avg. Click Through Rate').closest('.rounded-card')).toHaveTextContent('29.6%');
    expect(screen.queryByText('Estimated Commission')).not.toBeInTheDocument();
  });

  it('shows a positive change indicator for Total Views computed against the previous period', async () => {
    renderPage();
    await screen.findByText('Performance Overview');

    // (1204 - 1000) / 1000 * 100 = 20.4%
    expect(screen.getByText('Total Views').closest('.rounded-card')).toHaveTextContent('20.4%');
  });

  it('shows no change indicator for the two all-time KPI cards', async () => {
    renderPage();
    await screen.findByText('Performance Overview');

    expect(screen.getByText('Total Products').closest('.rounded-card')).toHaveTextContent('All-time total');
    expect(screen.getByText('Published Guides').closest('.rounded-card')).toHaveTextContent('All-time total');
  });

  it('renders the Performance Overview chart with only Views and Clicks in the legend', async () => {
    renderPage();
    await screen.findByText('Performance Overview');

    const chartCard = screen.getByText('Performance Overview').closest('.rounded-card');
    expect(within(chartCard).getByText('Views')).toBeInTheDocument();
    expect(within(chartCard).getByText('Clicks')).toBeInTheDocument();
    expect(within(chartCard).queryByText('Orders')).not.toBeInTheDocument();
    expect(within(chartCard).queryByText('Commissions')).not.toBeInTheDocument();
  });

  it('does not render the old gauges or extra bar charts', async () => {
    renderPage();
    await screen.findByText('Performance Overview');

    expect(screen.queryByText('Click-Through Rate')).not.toBeInTheDocument();
    expect(screen.queryByText('Trending Share of Catalog')).not.toBeInTheDocument();
    expect(screen.queryByText('Best-Seller Share of Catalog')).not.toBeInTheDocument();
    expect(screen.queryByText('Most-Clicked Products')).not.toBeInTheDocument();
    expect(screen.queryByText('Estimated Commission by Category')).not.toBeInTheDocument();
    expect(screen.queryByText('Products Added by Month')).not.toBeInTheDocument();
  });

  it("shows the personalized greeting using the authenticated admin's name", async () => {
    renderPage();
    await screen.findByText('Performance Overview');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome back, John Rommel Rovero!');
  });

  it('changes the chart bucketing when the granularity dropdown changes', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Performance Overview');

    const dropdown = screen.getByLabelText('Granularity');
    expect(dropdown).toHaveValue('daily');

    await user.selectOptions(dropdown, 'weekly');
    expect(dropdown).toHaveValue('weekly');
  });

  it('shows an error state with retry when loading fails', async () => {
    vi.spyOn(dashboardService, 'getSummary').mockReset();
    dashboardService.getSummary.mockRejectedValueOnce({ message: 'Network error. Please try again.' });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Network error. Please try again.')).toBeInTheDocument();

    dashboardService.getSummary.mockResolvedValueOnce(currentSummary).mockResolvedValueOnce(previousSummary);
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getByText('Performance Overview')).toBeInTheDocument());
  });

  it('renders the Top Categories card with real category data', async () => {
    renderPage();
    await screen.findByText('Performance Overview');

    expect(screen.getByText('Top Categories')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('28,540')).toBeInTheDocument();
  });

  it('renders the Recent Products card with real product data', async () => {
    renderPage();
    await screen.findByText('Performance Overview');

    expect(screen.getByText('Recent Products')).toBeInTheDocument();
    expect(screen.getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
    expect(screen.getByText('342')).toBeInTheDocument();
  });

  it('renders the Quick Actions card with all four shortcuts', async () => {
    renderPage();
    await screen.findByText('Performance Overview');

    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Add Product/ })).toHaveAttribute('href', '/admin/products/new');
    expect(screen.getByRole('link', { name: /Add Buying Guide/ })).toHaveAttribute(
      'href',
      '/admin/buying-guides/new'
    );
    expect(screen.getByRole('link', { name: /Add Comparison/ })).toHaveAttribute(
      'href',
      '/admin/comparisons/new'
    );
    expect(screen.getByRole('link', { name: /Manage Categories/ })).toHaveAttribute('href', '/admin/categories');
  });

  it('renders the Latest Guides card with real guide data', async () => {
    renderPage();
    await screen.findByText('Performance Overview');

    expect(screen.getByText('Latest Guides')).toBeInTheDocument();
    expect(screen.getByText('Best Wireless Earbuds Under $100')).toBeInTheDocument();
    expect(screen.getByText('1,240')).toBeInTheDocument();
  });

  it('renders the System Alerts card with real alert data', async () => {
    renderPage();
    await screen.findByText('Performance Overview');

    expect(screen.getByText('System Alerts')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /3 draft products need review/ })).toHaveAttribute(
      'href',
      '/admin/products'
    );
  });
});
