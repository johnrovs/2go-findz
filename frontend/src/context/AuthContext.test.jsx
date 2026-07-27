import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthProvider } from './AuthContext.jsx';
import { useAuth } from '../hooks/useAuth.js';
import * as authService from '../services/authService.js';

function TestConsumer() {
  const { user, isAuthenticated, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'anonymous'}</span>
      <span data-testid="username">{user?.username ?? ''}</span>
      <button onClick={() => login('johnrovs', 'admin123')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('starts unauthenticated when localStorage is empty', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('auth-status')).toHaveTextContent('anonymous');
  });

  it('hydrates from localStorage on mount when a session exists', () => {
    localStorage.setItem('token', 'existing-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ username: 'johnrovs', fullName: 'John Rommel Rovero', role: 'ADMIN' })
    );

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('username')).toHaveTextContent('johnrovs');
  });

  it('login() persists the session and updates state', async () => {
    vi.spyOn(authService, 'loginRequest').mockResolvedValue({
      token: 'new-token',
      username: 'johnrovs',
      fullName: 'John Rommel Rovero',
      role: 'ADMIN',
    });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await user.click(screen.getByText('Login'));

    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated'));
    expect(localStorage.getItem('token')).toBe('new-token');
  });

  it('logout() clears the session', async () => {
    localStorage.setItem('token', 'existing-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ username: 'johnrovs', fullName: 'John Rommel Rovero', role: 'ADMIN' })
    );
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await user.click(screen.getByText('Logout'));

    expect(screen.getByTestId('auth-status')).toHaveTextContent('anonymous');
    expect(localStorage.getItem('token')).toBeNull();
  });
});
