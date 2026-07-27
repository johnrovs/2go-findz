import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ProtectedRoute from './ProtectedRoute.jsx';
import * as useAuthModule from '../hooks/useAuth.js';

function renderWithAuth(authValue) {
  vi.spyOn(useAuthModule, 'useAuth').mockReturnValue(authValue);
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<div>Admin Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login when not authenticated', () => {
    renderWithAuth({ isAuthenticated: false, isLoading: false });
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders the protected content when authenticated', () => {
    renderWithAuth({ isAuthenticated: true, isLoading: false });
    expect(screen.getByText('Admin Page')).toBeInTheDocument();
  });

  it('renders nothing while the auth state is still loading', () => {
    renderWithAuth({ isAuthenticated: false, isLoading: true });
    expect(screen.queryByText('Admin Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
