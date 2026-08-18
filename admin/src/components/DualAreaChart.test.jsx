import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DualAreaChart from './DualAreaChart.jsx';

const data = [
  { date: '2026-07-01', views: 5, clicks: 2 },
  { date: '2026-07-02', views: 8, clicks: 3 },
];

const series = [
  { key: 'views', name: 'Views', color: '#2563EB' },
  { key: 'clicks', name: 'Clicks', color: '#FF9900' },
];

describe('DualAreaChart', () => {
  it('shows a "No data yet" message when data is empty', () => {
    render(<DualAreaChart data={[]} xKey="date" series={series} label="Views & Clicks by Day" />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('renders the chart label', () => {
    render(<DualAreaChart data={data} xKey="date" series={series} label="Views & Clicks by Day" />);
    expect(screen.getByText('Views & Clicks by Day')).toBeInTheDocument();
  });

  it('renders both series as areas', async () => {
    const { container } = render(
      <DualAreaChart data={data} xKey="date" series={series} label="Views & Clicks by Day" />
    );
    // Recharts' ResponsiveContainer resolves its measured size asynchronously even in a
    // stubbed-getBoundingClientRect test environment, and <Area> (unlike <Line>/<Bar>) only
    // paints once that settles -- so this assertion needs waitFor, not a synchronous check.
    await waitFor(() => {
      expect(container.querySelectorAll('.recharts-area')).toHaveLength(2);
    });
  });

  it('renders a legend entry for each series name', () => {
    render(<DualAreaChart data={data} xKey="date" series={series} label="Views & Clicks by Day" />);
    expect(screen.getByText('Views')).toBeInTheDocument();
    expect(screen.getByText('Clicks')).toBeInTheDocument();
  });
});
