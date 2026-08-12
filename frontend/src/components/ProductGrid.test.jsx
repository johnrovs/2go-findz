import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductGrid from './ProductGrid.jsx';

const product = {
  id: 1,
  name: 'Wireless Earbuds',
  description: 'Compact wireless earbuds.',
  categoryId: 2,
  categoryName: 'Electronics',
  imageFileName: null,
  productPrice: '49.99',
  productLink: 'https://amazon.com/dp/example',
  trending: false,
  bestSeller: false,
  active: true,
  createdAt: '2026-07-20T10:00:00',
};

describe('ProductGrid', () => {
  it('shows a loading spinner while loading', () => {
    render(<ProductGrid products={[]} isLoading error={null} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows an error state when there is an error', () => {
    render(<ProductGrid products={[]} isLoading={false} error="Failed to load products." />);
    expect(screen.getByText('Failed to load products.')).toBeInTheDocument();
  });

  it('shows an empty state when there are no products', () => {
    render(<ProductGrid products={[]} isLoading={false} error={null} />);
    expect(screen.getByText('No products found')).toBeInTheDocument();
  });

  it('renders a product card for each product', () => {
    render(<ProductGrid products={[product]} isLoading={false} error={null} />);
    expect(screen.getByText('Wireless Earbuds')).toBeInTheDocument();
  });

  it('uses a 2-column grid on mobile', () => {
    const { container } = render(<ProductGrid products={[product]} isLoading={false} error={null} />);
    expect(container.firstChild).toHaveClass('grid-cols-2');
  });

  it('renders the restyled card: category label and a View on Amazon button, no description or Compare toggle', () => {
    render(<ProductGrid products={[product]} isLoading={false} error={null} />);
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View Wireless Earbuds on Amazon/ })).toBeInTheDocument();
    expect(screen.queryByText(product.description)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Compare/ })).not.toBeInTheDocument();
  });
});
