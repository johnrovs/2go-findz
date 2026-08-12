import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ProductsBreadcrumbs from './ProductsBreadcrumbs.jsx';

function renderBreadcrumbs() {
  return render(
    <MemoryRouter>
      <ProductsBreadcrumbs />
    </MemoryRouter>
  );
}

describe('ProductsBreadcrumbs', () => {
  it('links Home to the site root', () => {
    renderBreadcrumbs();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });

  it('marks Products as the current page', () => {
    renderBreadcrumbs();
    expect(screen.getByText('Products', { selector: '[aria-current="page"]' })).toBeInTheDocument();
  });

  it('does not render Products as a link', () => {
    renderBreadcrumbs();
    expect(screen.queryByRole('link', { name: 'Products' })).not.toBeInTheDocument();
  });

  it('renders a custom label when provided, for pages like Trending or Best Sellers', () => {
    render(
      <MemoryRouter>
        <ProductsBreadcrumbs label="Trending" />
      </MemoryRouter>
    );
    expect(screen.getByText('Trending', { selector: '[aria-current="page"]' })).toBeInTheDocument();
    expect(screen.queryByText('Products')).not.toBeInTheDocument();
  });
});
