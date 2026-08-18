import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DashboardLineChart from './DashboardLineChart.jsx';

const series = [
  { key: 'views', name: 'Views', color: '#5b2cf2' },
  { key: 'clicks', name: 'Clicks', color: '#ff6b00' },
];

describe('DashboardLineChart', () => {
  it('renders the card title and a legend entry for each series', () => {
    render(
      <DashboardLineChart
        data={[{ date: 'May 19', views: 100, clicks: 20 }]}
        xKey="date"
        series={series}
        label="Performance Overview"
      />
    );
    expect(screen.getByText('Performance Overview')).toBeInTheDocument();
    expect(screen.getByText('Views')).toBeInTheDocument();
    expect(screen.getByText('Clicks')).toBeInTheDocument();
  });

  it('does not render an Orders or Commissions legend entry', () => {
    render(
      <DashboardLineChart
        data={[{ date: 'May 19', views: 100, clicks: 20 }]}
        xKey="date"
        series={series}
        label="Performance Overview"
      />
    );
    expect(screen.queryByText('Orders')).not.toBeInTheDocument();
    expect(screen.queryByText('Commissions')).not.toBeInTheDocument();
  });

  it('renders the header action node when provided', () => {
    render(
      <DashboardLineChart
        data={[{ date: 'May 19', views: 100, clicks: 20 }]}
        xKey="date"
        series={series}
        label="Performance Overview"
        headerAction={<button type="button">Daily</button>}
      />
    );
    expect(screen.getByRole('button', { name: 'Daily' })).toBeInTheDocument();
  });

  it('shows an empty state when there is no data', () => {
    render(<DashboardLineChart data={[]} xKey="date" series={series} label="Performance Overview" />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });
});
