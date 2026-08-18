import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RecommendationProductPicker from './RecommendationProductPicker.jsx';

const products = [
  { id: 1, name: 'Soundcore Liberty 4 NC', brand: 'Soundcore', productPrice: '69.99', imageFileName: null, rating: 4.8, reviewCount: 12850 },
  { id: 2, name: 'TOZO NC9 Hybrid Active', brand: 'TOZO', productPrice: '39.99', imageFileName: null, rating: null, reviewCount: 0 },
];

describe('RecommendationProductPicker', () => {
  it('renders the title and every eligible product', () => {
    render(<RecommendationProductPicker isOpen={true} onClose={vi.fn()} title="Add Top Pick Product" eligibleProducts={products} onSelect={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Add Top Pick Product' })).toBeInTheDocument();
    expect(screen.getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
    expect(screen.getByText('TOZO NC9 Hybrid Active')).toBeInTheDocument();
  });

  it('filters by search', async () => {
    const user = userEvent.setup();
    render(<RecommendationProductPicker isOpen={true} onClose={vi.fn()} title="Add Top Pick Product" eligibleProducts={products} onSelect={vi.fn()} />);

    await user.type(screen.getByLabelText('Search eligible products'), 'tozo');

    expect(screen.queryByText('Soundcore Liberty 4 NC')).not.toBeInTheDocument();
    expect(screen.getByText('TOZO NC9 Hybrid Active')).toBeInTheDocument();
  });

  it('shows an empty state when there are no eligible products', () => {
    render(<RecommendationProductPicker isOpen={true} onClose={vi.fn()} title="Add Top Pick Product" eligibleProducts={[]} onSelect={vi.fn()} />);
    expect(screen.getByText('No eligible products')).toBeInTheDocument();
  });

  it('calls onSelect and onClose when a product is chosen', async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<RecommendationProductPicker isOpen={true} onClose={onClose} title="Add Top Pick Product" eligibleProducts={products} onSelect={onSelect} />);

    await user.click(screen.getAllByRole('button', { name: 'Select' })[0]);

    expect(onSelect).toHaveBeenCalledWith(products[0]);
    expect(onClose).toHaveBeenCalled();
  });
});
