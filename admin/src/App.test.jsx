import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App.jsx';

describe('App', () => {
  it('redirects an unauthenticated visitor from the root route to the login page', () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeInTheDocument();
  });

  it('renders the not found page for an unmatched route', () => {
    window.history.pushState({}, '', '/this-route-does-not-exist');
    render(<App />);
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });

  it('renders the login page at /login', () => {
    window.history.pushState({}, '', '/login');
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome back' })).toBeInTheDocument();
  });
});
