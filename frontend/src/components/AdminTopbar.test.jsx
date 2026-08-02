import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AdminTopbar from './AdminTopbar.jsx';
import * as useAuthModule from '../hooks/useAuth.js';

function renderTopbar(initialEntry) {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    user: { fullName: 'John Rommel Rovero' },
    logout: vi.fn(),
  });
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AdminTopbar onMenuClick={vi.fn()} />
    </MemoryRouter>
  );
}

describe('AdminTopbar', () => {
  it('shows the breadcrumb on ordinary admin pages', () => {
    renderTopbar('/admin/products');
    expect(screen.getByLabelText('Breadcrumb')).toHaveTextContent('Dashboard / Products');
  });

  it('shows the breadcrumb on the Buying Guides list page', () => {
    renderTopbar('/admin/buying-guides');
    expect(screen.getByLabelText('Breadcrumb')).toHaveTextContent('Dashboard / buying-guides');
  });

  it('hides the breadcrumb on the new buying guide editor page', () => {
    renderTopbar('/admin/buying-guides/new');
    expect(screen.queryByLabelText('Breadcrumb')).not.toBeInTheDocument();
  });

  it('hides the breadcrumb on an existing buying guide editor page', () => {
    renderTopbar('/admin/buying-guides/7');
    expect(screen.queryByLabelText('Breadcrumb')).not.toBeInTheDocument();
  });
});
