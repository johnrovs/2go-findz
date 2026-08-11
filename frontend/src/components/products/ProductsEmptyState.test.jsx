import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ProductsEmptyState from './ProductsEmptyState.jsx';

describe('ProductsEmptyState', () => {
  it('renders a no-results message', () => {
    render(<ProductsEmptyState onClearFilters={vi.fn()} onReturnToAllProducts={vi.fn()} />);
    expect(screen.getByText('No products found')).toBeInTheDocument();
  });

  it('calls onClearFilters when Clear Filters is clicked', async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();
    render(<ProductsEmptyState onClearFilters={onClearFilters} onReturnToAllProducts={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Clear Filters' }));

    expect(onClearFilters).toHaveBeenCalled();
  });

  it('calls onReturnToAllProducts when Return to All Products is clicked', async () => {
    const user = userEvent.setup();
    const onReturnToAllProducts = vi.fn();
    render(<ProductsEmptyState onClearFilters={vi.fn()} onReturnToAllProducts={onReturnToAllProducts} />);

    await user.click(screen.getByRole('button', { name: 'Return to All Products' }));

    expect(onReturnToAllProducts).toHaveBeenCalled();
  });
});
