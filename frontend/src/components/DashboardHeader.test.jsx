import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../context/ToastContext.jsx';
import DashboardHeader from './DashboardHeader.jsx';
import * as useAuthModule from '../hooks/useAuth.js';
import * as dashboardService from '../services/dashboardService.js';

function renderHeader(props = {}) {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    user: { fullName: 'John Rommel Rovero', role: 'Administrator' },
    logout: vi.fn(),
  });
  return render(
    <MemoryRouter>
      <ToastProvider>
        <DashboardHeader
          startDate={new Date(2026, 4, 19)}
          endDate={new Date(2026, 4, 25)}
          onRangeChange={vi.fn()}
          {...props}
        />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('DashboardHeader', () => {
  it('greets the authenticated administrator by name in the one page h1', () => {
    renderHeader();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome back, John Rommel Rovero! 👋');
  });

  it('shows the supporting text', () => {
    renderHeader();
    expect(screen.getByText("Here's what's happening with 2Go Findz today.")).toBeInTheDocument();
  });

  it('renders the date range picker with the given range', () => {
    renderHeader();
    expect(screen.getByLabelText('Date range')).toHaveValue('May 19, 2026 - May 25, 2026');
  });

  it('renders an enabled Export Report button', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: /Export Report/ })).not.toBeDisabled();
  });

  it('exports the report for the given date range when clicked', async () => {
    const user = userEvent.setup();
    const blob = new Blob(['Metric,Value'], { type: 'text/csv' });
    vi.spyOn(dashboardService, 'exportDashboardReport').mockResolvedValue(blob);
    // jsdom doesn't implement URL.createObjectURL/revokeObjectURL at all, so the property
    // doesn't exist for vi.spyOn to wrap — assign mock functions directly instead.
    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    URL.revokeObjectURL = vi.fn();

    renderHeader();
    await user.click(screen.getByRole('button', { name: /Export Report/ }));

    await waitFor(() =>
      expect(dashboardService.exportDashboardReport).toHaveBeenCalledWith({ from: '2026-05-19', to: '2026-05-25' })
    );
  });

  it('shows an error toast when the export fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(dashboardService, 'exportDashboardReport').mockRejectedValue(new Error('Network error.'));

    renderHeader();
    await user.click(screen.getByRole('button', { name: /Export Report/ }));

    expect(await screen.findByText('Failed to export report. Please try again.')).toBeInTheDocument();
  });

  it('renders an accessible administrator menu trigger showing name and role', () => {
    renderHeader();
    const trigger = screen.getByRole('button', { name: /John Rommel Rovero.*account menu/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });
});
