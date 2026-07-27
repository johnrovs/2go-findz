import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App.jsx';

describe('App', () => {
  it('renders the homepage at the root route', () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByText('2Go Findz')).toBeInTheDocument();
  });

  it('renders the not found page for an unmatched route', () => {
    window.history.pushState({}, '', '/this-route-does-not-exist');
    render(<App />);
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });
});
