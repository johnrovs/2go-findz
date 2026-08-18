import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import DashboardDateRangePicker from './DashboardDateRangePicker.jsx';

describe('DashboardDateRangePicker', () => {
  it('displays the selected range formatted as "Mon d, yyyy - Mon d, yyyy"', () => {
    render(
      <DashboardDateRangePicker
        startDate={new Date(2026, 4, 19)}
        endDate={new Date(2026, 4, 25)}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Date range')).toHaveValue('May 19, 2026 - May 25, 2026');
  });

  it('is empty and still labeled when no range is selected yet', () => {
    render(<DashboardDateRangePicker startDate={null} endDate={null} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Date range')).toHaveValue('');
  });
});
