import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AdminSidebar from './AdminSidebar.jsx';
import * as useAuthModule from '../hooks/useAuth.js';

function renderSidebar(initialEntry = '/admin', logout = vi.fn()) {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({ logout });
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AdminSidebar isOpen={false} onClose={vi.fn()} />
    </MemoryRouter>
  );
}

describe('AdminSidebar', () => {
  it('renders the Main and Settings nav groups with only real existing routes', () => {
    renderSidebar();
    expect(screen.getByText('Main')).toBeInTheDocument();
    expect(screen.getByText('Settings', { selector: 'p' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dashboard/ })).toHaveAttribute('href', '/admin');
    expect(screen.getByRole('link', { name: 'Products' })).toHaveAttribute('href', '/admin/products');
    expect(screen.getByRole('link', { name: 'Categories' })).toHaveAttribute('href', '/admin/categories');
    expect(screen.getByRole('link', { name: 'Buying Guides' })).toHaveAttribute('href', '/admin/buying-guides');
    expect(screen.getByRole('link', { name: 'Comparisons' })).toHaveAttribute('href', '/admin/comparisons');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/admin/settings');
  });

  it('does not render nav items that have no real admin route', () => {
    renderSidebar();
    expect(screen.queryByText('Reviews')).not.toBeInTheDocument();
    expect(screen.queryByText('Trending')).not.toBeInTheDocument();
    expect(screen.queryByText('Best Sellers')).not.toBeInTheDocument();
    expect(screen.queryByText('Traffic')).not.toBeInTheDocument();
    expect(screen.queryByText('Commissions')).not.toBeInTheDocument();
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
    expect(screen.queryByText('Integrations')).not.toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Analytics')).not.toBeInTheDocument();
  });

  it('renders the Quick Tip card with the exact copy', () => {
    renderSidebar();
    expect(screen.getByText('Quick Tip')).toBeInTheDocument();
    expect(
      screen.getByText('Add new products regularly to increase engagement and commissions.')
    ).toBeInTheDocument();
  });

  it('highlights Dashboard as active on the /admin route', () => {
    renderSidebar('/admin');
    expect(screen.getByRole('link', { name: /Dashboard/ })).toHaveClass('from-dashboard-purple');
  });

  it('does not highlight Dashboard as active on a different admin route', () => {
    renderSidebar('/admin/products');
    expect(screen.getByRole('link', { name: /Dashboard/ })).not.toHaveClass('from-dashboard-purple');
    expect(screen.getByRole('link', { name: 'Products' })).toHaveClass('from-dashboard-purple');
  });

  it('calls logout when the Logout button is clicked', async () => {
    const user = userEvent.setup();
    const logout = vi.fn();
    renderSidebar('/admin', logout);

    await user.click(screen.getByRole('button', { name: 'Logout' }));

    expect(logout).toHaveBeenCalled();
  });
});
