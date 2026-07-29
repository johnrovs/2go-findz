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
});
