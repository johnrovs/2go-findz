import { Eye, MousePointerClick, DollarSign, Package, Tags, TrendingUp, Award } from 'lucide-react';
import AnalyticsCard from '../../components/AnalyticsCard.jsx';
import AnalyticsChart from '../../components/AnalyticsChart.jsx';
import FilterDropdown from '../../components/FilterDropdown.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { useDashboardData } from '../../hooks/useDashboardData.js';

const PRESET_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'currentMonth', label: 'Current Month' },
  { value: 'custom', label: 'Custom Range' },
];

function formatCurrency(value) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function DashboardPage() {
  const dashboard = useDashboardData();

  if (dashboard.isLoading) {
    return <LoadingSpinner label="Loading dashboard..." />;
  }

  if (dashboard.error) {
    return <ErrorState message={dashboard.error} onRetry={dashboard.reload} />;
  }

  const { summary, analytics } = dashboard;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <div className="flex flex-wrap items-end gap-4">
          <FilterDropdown
            label="Date Range"
            value={dashboard.preset}
            options={PRESET_OPTIONS}
            onChange={dashboard.setPreset}
          />
          {dashboard.preset === 'custom' && (
            <>
              <div>
                <label htmlFor="customFrom" className="mb-1 block text-sm font-medium text-slate-700">
                  From
                </label>
                <input
                  id="customFrom"
                  type="date"
                  value={dashboard.customFrom}
                  onChange={(event) => dashboard.setCustomFrom(event.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="customTo" className="mb-1 block text-sm font-medium text-slate-700">
                  To
                </label>
                <input
                  id="customTo"
                  type="date"
                  value={dashboard.customTo}
                  onChange={(event) => dashboard.setCustomTo(event.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticsCard label="Total Views" value={summary.totalViews} icon={Eye} />
        <AnalyticsCard label="Total Clicks" value={summary.totalClicks} icon={MousePointerClick} />
        <AnalyticsCard
          label="Estimated Commission"
          value={formatCurrency(summary.estimatedTotalCommission)}
          icon={DollarSign}
        />
        <AnalyticsCard label="Total Products" value={summary.totalProducts} icon={Package} />
        <AnalyticsCard label="Total Categories" value={summary.totalCategories} icon={Tags} />
        <AnalyticsCard label="Trending Products" value={summary.trendingCount} icon={TrendingUp} />
        <AnalyticsCard label="Best Sellers" value={summary.bestSellerCount} icon={Award} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AnalyticsChart type="line" data={analytics.viewsByDay} xKey="date" yKey="count" label="Website Views by Day" />
        <AnalyticsChart type="line" data={analytics.clicksByDay} xKey="date" yKey="count" label="Product Clicks by Day" />
        <AnalyticsChart
          type="bar"
          layout="vertical"
          data={analytics.mostClickedProducts}
          xKey="productName"
          yKey="clickCount"
          label="Most-Clicked Products"
        />
        <AnalyticsChart
          type="bar"
          data={analytics.commissionByCategory}
          xKey="categoryName"
          yKey="estimatedCommission"
          label="Estimated Commission by Category"
        />
        <AnalyticsChart
          type="bar"
          data={analytics.productsAddedByMonth}
          xKey="yearMonth"
          yKey="count"
          label="Products Added by Month"
        />
      </div>
    </div>
  );
}

export default DashboardPage;
