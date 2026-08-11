import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductsSkeletonGrid from './ProductsSkeletonGrid.jsx';

describe('ProductsSkeletonGrid', () => {
  it('renders count skeleton grid cards with an accessible loading label', () => {
    render(<ProductsSkeletonGrid view="grid" count={6} />);
    expect(screen.getByRole('status', { name: 'Loading products' })).toBeInTheDocument();
    expect(document.querySelectorAll('[data-testid="product-skeleton-card"]')).toHaveLength(6);
  });

  it('renders count skeleton list rows when view is list', () => {
    render(<ProductsSkeletonGrid view="list" count={4} />);
    expect(document.querySelectorAll('[data-testid="product-skeleton-list-item"]')).toHaveLength(4);
  });
});
