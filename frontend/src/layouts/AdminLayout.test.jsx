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
    <MemoryRouter initialEntries={['/admin/products']}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/admin/products" element={<div>Products Content</div>} />
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

    await user.click(screen.getByLabelText('Open menu'));

    expect(screen.getAllByText('Products').length).toBeGreaterThanOrEqual(2);
  });
});
