import { Eye, MousePointerClick, DollarSign, Package, Tags } from 'lucide-react';
import AnalyticsCard from '../../components/AnalyticsCard.jsx';
import AnalyticsChart from '../../components/AnalyticsChart.jsx';
import DualAreaChart from '../../components/DualAreaChart.jsx';
import GaugeCard from '../../components/GaugeCard.jsx';
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

function safePercentage(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

function mergeViewsAndClicks(viewsByDay, clicksByDay) {
  const byDate = new Map();
  for (const { date, count } of viewsByDay) {
    byDate.set(date, { date, views: count, clicks: 0 });
  }
  for (const { date, count } of clicksByDay) {
    const existing = byDate.get(date);
    if (existing) {
      existing.clicks = count;
    } else {
      byDate.set(date, { date, views: 0, clicks: count });
    }
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
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
  const viewsAndClicks = mergeViewsAndClicks(analytics.viewsByDay, analytics.clicksByDay);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-page-heading text-heading">Dashboard</h1>
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
                  className="rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
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
                  className="rounded-btn border border-border px-3 py-2 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
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
        <GaugeCard label="Click-Through Rate" value={safePercentage(summary.totalClicks, summary.totalViews)} />
        <GaugeCard
          label="Trending Share of Catalog"
          value={safePercentage(summary.trendingCount, summary.totalProducts)}
        />
        <GaugeCard
          label="Best-Seller Share of Catalog"
          value={safePercentage(summary.bestSellerCount, summary.totalProducts)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DualAreaChart
          data={viewsAndClicks}
          xKey="date"
          series={[
            { key: 'views', name: 'Views', color: '#2563EB' },
            { key: 'clicks', name: 'Clicks', color: '#FF9900' },
          ]}
          label="Views & Clicks by Day"
        />
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
