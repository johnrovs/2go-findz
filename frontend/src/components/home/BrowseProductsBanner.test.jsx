import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import BrowseProductsBanner from './BrowseProductsBanner.jsx';

describe('BrowseProductsBanner', () => {
  it('links its button to /products', () => {
    render(
      <MemoryRouter>
        <BrowseProductsBanner />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Browse All Products' })).toHaveAttribute('href', '/products');
  });

  it('renders the promotional heading', () => {
    render(
      <MemoryRouter>
        <BrowseProductsBanner />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Browse All Products' })).toBeInTheDocument();
  });

  it('does not render the decorative corner images', () => {
    const { container } = render(
      <MemoryRouter>
        <BrowseProductsBanner />
      </MemoryRouter>
    );
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });
});
