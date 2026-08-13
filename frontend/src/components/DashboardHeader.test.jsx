import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import DashboardHeader from './DashboardHeader.jsx';
import * as useAuthModule from '../hooks/useAuth.js';

function renderHeader(props = {}) {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    user: { fullName: 'John Rommel Rovero', role: 'Administrator' },
    logout: vi.fn(),
  });
  return render(
    <MemoryRouter>
      <DashboardHeader
        startDate={new Date(2026, 4, 19)}
        endDate={new Date(2026, 4, 25)}
        onRangeChange={vi.fn()}
        {...props}
      />
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

  it('renders a disabled Export Report button', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: /Export Report/ })).toBeDisabled();
  });

  it('renders an accessible administrator menu trigger showing name and role', () => {
    renderHeader();
    const trigger = screen.getByRole('button', { name: /John Rommel Rovero.*account menu/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });
});
