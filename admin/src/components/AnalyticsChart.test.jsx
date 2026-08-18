import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AnalyticsChart from './AnalyticsChart.jsx';

const lineData = [
  { date: '2026-07-01', count: 5 },
  { date: '2026-07-02', count: 8 },
];

const barData = [
  { categoryName: 'Electronics', estimatedCommission: 40 },
  { categoryName: 'Home Goods', estimatedCommission: 25 },
];

describe('AnalyticsChart', () => {
  it('shows a "No data yet" message when data is empty', () => {
    render(<AnalyticsChart type="line" data={[]} xKey="date" yKey="count" label="Views by Day" />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
  });

  it('renders the chart label', () => {
    render(<AnalyticsChart type="line" data={lineData} xKey="date" yKey="count" label="Views by Day" />);
    expect(screen.getByText('Views by Day')).toBeInTheDocument();
  });

  it('renders a line chart for type="line"', () => {
    const { container } = render(
      <AnalyticsChart type="line" data={lineData} xKey="date" yKey="count" label="Views by Day" />
    );
    expect(container.querySelector('.recharts-line')).toBeInTheDocument();
  });

  it('renders a bar chart for type="bar"', () => {
    const { container } = render(
      <AnalyticsChart
        type="bar"
        data={barData}
        xKey="categoryName"
        yKey="estimatedCommission"
        label="Commission by Category"
      />
    );
    expect(container.querySelector('.recharts-bar')).toBeInTheDocument();
  });
});
