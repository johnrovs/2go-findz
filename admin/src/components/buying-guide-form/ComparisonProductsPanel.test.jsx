import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ComparisonProductsPanel from './ComparisonProductsPanel.jsx';

const products = [
  { id: 1, name: 'Soundcore Liberty 4 NC', imageFileName: null },
  { id: 2, name: 'TOZO NC9 Hybrid Active', imageFileName: null },
];

describe('ComparisonProductsPanel', () => {
  it('shows the product count in the heading and renders every product', () => {
    render(<ComparisonProductsPanel recommendedProducts={products} onManageProducts={vi.fn()} />);
    expect(screen.getByText('Products in This Comparison (2)')).toBeInTheDocument();
    expect(screen.getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
    expect(screen.getByText('TOZO NC9 Hybrid Active')).toBeInTheDocument();
  });

  it('shows an empty state when no products are selected', () => {
    render(<ComparisonProductsPanel recommendedProducts={[]} onManageProducts={vi.fn()} />);
    expect(screen.getByText('No products yet')).toBeInTheDocument();
  });

  it('calls onManageProducts when the manage button is clicked', async () => {
    const onManageProducts = vi.fn();
    const user = userEvent.setup();
    render(<ComparisonProductsPanel recommendedProducts={products} onManageProducts={onManageProducts} />);

    await user.click(screen.getByRole('button', { name: /manage in products step/i }));

    expect(onManageProducts).toHaveBeenCalled();
  });
});
