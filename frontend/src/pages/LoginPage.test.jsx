import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../context/AuthContext.jsx';
import LoginPage from './LoginPage.jsx';
import * as authService from '../services/authService.js';

function renderLoginPage() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin" element={<div>Admin Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('shows validation errors when submitted empty', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Username is required.')).toBeInTheDocument();
    expect(screen.getByText('Password is required.')).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('shows a loading state and redirects to /admin on successful login', async () => {
    vi.spyOn(authService, 'loginRequest').mockResolvedValue({
      token: 'test-token',
      username: 'johnrovs',
      fullName: 'John Rommel Rovero',
      role: 'ADMIN',
    });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Username'), 'johnrovs');
    await user.type(screen.getByLabelText('Password'), 'admin123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('shows a generic error message on invalid credentials', async () => {
    vi.spyOn(authService, 'loginRequest').mockRejectedValue({ message: 'Invalid username or password.' });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText('Username'), 'johnrovs');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid username or password.')).toBeInTheDocument();
  });
});
