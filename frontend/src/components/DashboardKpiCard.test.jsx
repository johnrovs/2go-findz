import { render, screen } from '@testing-library/react';
import { Eye } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import DashboardKpiCard from './DashboardKpiCard.jsx';

describe('DashboardKpiCard', () => {
  it('renders the label, value, and icon', () => {
    render(
      <DashboardKpiCard
        label="Total Views"
        value="125,680"
        icon={Eye}
        iconColorClass="bg-dashboard-purple/10 text-dashboard-purple"
        changePercent={18.6}
        comparisonLabel="vs May 12 – May 18"
      />
    );
    expect(screen.getByText('Total Views')).toBeInTheDocument();
    expect(screen.getByText('125,680')).toBeInTheDocument();
  });

  it('shows a green up arrow for a positive change, never color alone', () => {
    render(
      <DashboardKpiCard
        label="Total Views"
        value="125,680"
        icon={Eye}
        iconColorClass="bg-dashboard-purple/10 text-dashboard-purple"
        changePercent={18.6}
        comparisonLabel="vs May 12 – May 18"
      />
    );
    const delta = screen.getByText('↑ 18.6%');
    expect(delta).toHaveClass('text-dashboard-green');
    expect(screen.getByText('vs May 12 – May 18')).toBeInTheDocument();
  });

  it('shows a red down arrow for a negative change', () => {
    render(
      <DashboardKpiCard
        label="Total Clicks"
        value="8,742"
        icon={Eye}
        iconColorClass="bg-dashboard-orange/10 text-dashboard-orange"
        changePercent={-4.2}
        comparisonLabel="vs May 12 – May 18"
      />
    );
    const delta = screen.getByText('↓ 4.2%');
    expect(delta).toHaveClass('text-danger');
  });

  it('renders only the comparison label, with no delta row, when changePercent is null', () => {
    render(
      <DashboardKpiCard
        label="Total Products"
        value="42"
        icon={Eye}
        iconColorClass="bg-dashboard-green/10 text-dashboard-green"
        changePercent={null}
        comparisonLabel="All-time total"
      />
    );
    expect(screen.getByText('All-time total')).toBeInTheDocument();
    expect(screen.queryByText(/↑|↓/)).not.toBeInTheDocument();
  });

  it('keeps long labels on a single line so card layouts stay aligned across a KPI row', () => {
    render(
      <DashboardKpiCard
        label="Avg. Click Through Rate"
        value="13%"
        icon={Eye}
        iconColorClass="bg-dashboard-purple/10 text-dashboard-purple"
        changePercent={null}
        comparisonLabel={null}
      />
    );
    const label = screen.getByText('Avg. Click Through Rate');
    expect(label).toHaveClass('truncate');
    expect(label).toHaveAttribute('title', 'Avg. Click Through Rate');
  });
});
