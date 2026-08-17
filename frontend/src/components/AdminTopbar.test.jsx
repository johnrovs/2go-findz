import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AdminTopbar from './AdminTopbar.jsx';
import * as useAuthModule from '../hooks/useAuth.js';

function renderTopbar(initialEntry, userOverride) {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    user: userOverride ?? { fullName: 'John Rommel Rovero' },
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

  it('renders nothing on the new buying guide editor page', () => {
    const { container } = renderTopbar('/admin/buying-guides/new');
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing on an existing buying guide editor page', () => {
    const { container } = renderTopbar('/admin/buying-guides/7');
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing on the dashboard page, which has its own header', () => {
    const { container } = renderTopbar('/admin');
    expect(container).toBeEmptyDOMElement();
  });

  it("shows an avatar with the user's initial and a mapped role label", () => {
    renderTopbar('/admin/products', { fullName: 'John Rommel Rovero', role: 'ADMIN' });
    expect(screen.getByText('J')).toBeInTheDocument();
    expect(screen.getByText('John Rommel Rovero')).toBeInTheDocument();
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });

  it('falls back to the raw role value when it has no display mapping', () => {
    renderTopbar('/admin/products', { fullName: 'Jane Doe', role: 'EDITOR' });
    expect(screen.getByText('EDITOR')).toBeInTheDocument();
  });

  it('defaults the role label to Administrator when the user has no role at all', () => {
    renderTopbar('/admin/products', { fullName: 'John Rommel Rovero' });
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });
});
