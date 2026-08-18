import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import AdminLayout from './AdminLayout.jsx';
import * as useAuthModule from '../hooks/useAuth.js';

function renderLayout() {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
    user: { fullName: 'John Rommel Rovero' },
    logout: vi.fn(),
  });
  return render(
    <MemoryRouter initialEntries={['/products']}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/products" element={<div>Products Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('AdminLayout', () => {
  it('renders the sidebar nav links, topbar profile name, and routed content', () => {
    renderLayout();
    expect(screen.getByText('Products Content')).toBeInTheDocument();
    expect(screen.getByText('John Rommel Rovero')).toBeInTheDocument();
    expect(screen.getAllByText('Products').length).toBeGreaterThan(0);
  });

  it('opens the mobile sidebar drawer when the menu button is clicked', async () => {
    const user = userEvent.setup();
    renderLayout();

    // Before opening: only the always-mounted desktop nav renders "Products".
    expect(screen.getAllByText('Products').length).toBe(1);

    await user.click(screen.getByLabelText('Open menu'));

    // After opening: desktop nav + the mobile drawer's nav both render "Products".
    expect(screen.getAllByText('Products').length).toBe(2);
  });

  it('closes the mobile drawer when a nav link inside it is clicked', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByLabelText('Open menu'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // The second "Products" link is the one rendered inside the open mobile drawer.
    const drawerProductsLink = screen.getAllByText('Products')[1];
    await user.click(drawerProductsLink);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getAllByText('Products').length).toBe(1);
  });

  it('closes the mobile drawer when Escape is pressed', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByLabelText('Open menu'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the AdminFooter copyright text alongside the routed content', () => {
    renderLayout();
    const year = new Date().getFullYear();
    expect(screen.getByText(`© ${year} 2Go Findz. All rights reserved.`)).toBeInTheDocument();
  });
});
