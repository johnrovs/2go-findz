import { useState } from 'react';
import { Eye, MousePointerClick, Package, FileText, Target } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader.jsx';
import DashboardKpiCard from '../../components/DashboardKpiCard.jsx';
import DashboardLineChart from '../../components/DashboardLineChart.jsx';
import FilterDropdown from '../../components/FilterDropdown.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { useDashboardData } from '../../hooks/useDashboardData.js';

const GRANULARITY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

function safePercentage(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function computeChangePercent(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
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

function weekStartKey(date) {
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay());
  return weekStart.toISOString().slice(0, 10);
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function bucketByGranularity(daily, granularity) {
  if (granularity === 'daily') return daily;

  const buckets = new Map();
  for (const row of daily) {
    const date = new Date(row.date);
    const bucketKey = granularity === 'monthly' ? monthKey(date) : weekStartKey(date);
    const existing = buckets.get(bucketKey) ?? { date: bucketKey, views: 0, clicks: 0 };
    existing.views += row.views;
    existing.clicks += row.clicks;
    buckets.set(bucketKey, existing);
  }
  return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function DashboardPage() {
  const dashboard = useDashboardData();
  const [granularity, setGranularity] = useState('daily');

  if (dashboard.isLoading) {
    return <LoadingSpinner label="Loading dashboard..." />;
  }

  if (dashboard.error) {
    return <ErrorState message={dashboard.error} onRetry={dashboard.reload} />;
  }

  const { summary, previousSummary, analytics, comparisonLabel } = dashboard;
  const dailyViewsAndClicks = mergeViewsAndClicks(analytics.viewsByDay, analytics.clicksByDay);
  const chartData = bucketByGranularity(dailyViewsAndClicks, granularity);

  const ctr = safePercentage(summary.totalClicks, summary.totalViews);
  const previousCtr = previousSummary ? safePercentage(previousSummary.totalClicks, previousSummary.totalViews) : null;

  return (
    <div>
      <DashboardHeader startDate={dashboard.startDate} endDate={dashboard.endDate} onRangeChange={dashboard.setRange} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <DashboardKpiCard
          label="Total Views"
          value={summary.totalViews.toLocaleString('en-US')}
          icon={Eye}
          iconColorClass="bg-dashboard-purple/10 text-dashboard-purple"
          changePercent={computeChangePercent(summary.totalViews, previousSummary?.totalViews)}
          comparisonLabel={comparisonLabel}
        />
        <DashboardKpiCard
          label="Total Clicks"
          value={summary.totalClicks.toLocaleString('en-US')}
          icon={MousePointerClick}
          iconColorClass="bg-dashboard-orange/10 text-dashboard-orange"
          changePercent={computeChangePercent(summary.totalClicks, previousSummary?.totalClicks)}
          comparisonLabel={comparisonLabel}
        />
        <DashboardKpiCard
          label="Total Products"
          value={summary.totalProducts.toLocaleString('en-US')}
          icon={Package}
          iconColorClass="bg-dashboard-green/10 text-dashboard-green"
          changePercent={null}
          comparisonLabel="All-time total"
        />
        <DashboardKpiCard
          label="Published Guides"
          value={summary.publishedGuideCount.toLocaleString('en-US')}
          icon={FileText}
          iconColorClass="bg-dashboard-blue/10 text-dashboard-blue"
          changePercent={null}
          comparisonLabel="All-time total"
        />
        <DashboardKpiCard
          label="Avg. Click Through Rate"
          value={`${ctr}%`}
          icon={Target}
          iconColorClass="bg-dashboard-purple/10 text-dashboard-purple"
          changePercent={computeChangePercent(ctr, previousCtr)}
          comparisonLabel={comparisonLabel}
        />
      </div>

      <DashboardLineChart
        data={chartData}
        xKey="date"
        series={[
          { key: 'views', name: 'Views', color: '#5b2cf2' },
          { key: 'clicks', name: 'Clicks', color: '#ff6b00' },
        ]}
        label="Performance Overview"
        headerAction={
          <FilterDropdown
            label="Granularity"
            hideLabel
            value={granularity}
            options={GRANULARITY_OPTIONS}
            onChange={setGranularity}
          />
        }
      />
    </div>
  );
}

export default DashboardPage;
