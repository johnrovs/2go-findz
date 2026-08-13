import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ChartTooltip from './ChartTooltip.jsx';

describe('ChartTooltip', () => {
  it('renders nothing when inactive', () => {
    const { container } = render(<ChartTooltip active={false} payload={[]} label="2026-07-01" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when payload is empty', () => {
    const { container } = render(<ChartTooltip active payload={[]} label="2026-07-01" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the label and each payload entry name/value', () => {
    render(
      <ChartTooltip
        active
        label="2026-07-01"
        payload={[
          { dataKey: 'views', name: 'Views', value: 5, color: '#2563EB' },
          { dataKey: 'clicks', name: 'Clicks', value: 2, color: '#FF9900' },
        ]}
      />
    );
    expect(screen.getByText('2026-07-01')).toBeInTheDocument();
    expect(screen.getByText('Views: 5')).toBeInTheDocument();
    expect(screen.getByText('Clicks: 2')).toBeInTheDocument();
  });

  it('shows each dataKey only once, even when the chart contributes duplicate payload entries for it', () => {
    // A chart combining an invisible Area (shaded fill) and a Line for the same
    // series — e.g. DashboardLineChart's "Views" — makes recharts include both
    // in the tooltip payload, sharing the same dataKey/name. Without dedup, the
    // same series would render twice.
    render(
      <ChartTooltip
        active
        label="2026-07-01"
        payload={[
          { dataKey: 'views', name: 'Views', value: 5, color: '#5b2cf2' },
          { dataKey: 'views', name: 'Views', value: 5, color: '#5b2cf2' },
          { dataKey: 'clicks', name: 'Clicks', value: 2, color: '#ff6b00' },
        ]}
      />
    );
    expect(screen.getAllByText('Views: 5')).toHaveLength(1);
    expect(screen.getByText('Clicks: 2')).toBeInTheDocument();
  });
});
