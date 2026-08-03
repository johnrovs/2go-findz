import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ComparisonSpecificationsEditor from './ComparisonSpecificationsEditor.jsx';

const products = [
  { id: 1, name: 'Soundcore Liberty 4 NC', productPrice: '69.99', rating: 4.8, reviewCount: 12850 },
  { id: 2, name: 'TOZO NC9 Hybrid Active', productPrice: '39.99', rating: null, reviewCount: null },
];

const specs = [
  {
    clientId: 'spec-1',
    specificationName: 'Battery Life',
    values: [
      { productId: 1, value: '50 Hrs' },
      { productId: 2, value: '40 Hrs' },
    ],
  },
];

describe('ComparisonSpecificationsEditor', () => {
  it('shows an empty state when there are no products', () => {
    render(<ComparisonSpecificationsEditor comparisonSpecs={[]} recommendedProducts={[]} fieldErrors={{}} onChange={vi.fn()} />);
    expect(screen.getByText('No products to compare')).toBeInTheDocument();
  });

  it('shows an empty state when there are products but no specs yet', () => {
    render(<ComparisonSpecificationsEditor comparisonSpecs={[]} recommendedProducts={products} fieldErrors={{}} onChange={vi.fn()} />);
    expect(screen.getByText('No specifications yet')).toBeInTheDocument();
  });

  it('renders existing spec rows', () => {
    render(<ComparisonSpecificationsEditor comparisonSpecs={specs} recommendedProducts={products} fieldErrors={{}} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Specification Name')).toHaveValue('Battery Life');
  });

  it('adds a new empty spec row covering every current product when Add Specification is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ComparisonSpecificationsEditor comparisonSpecs={[]} recommendedProducts={products} fieldErrors={{}} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /add specification/i }));

    const next = onChange.mock.calls[0][0];
    expect(next).toHaveLength(1);
    expect(next[0].specificationName).toBe('');
    expect(next[0].values).toEqual([
      { productId: 1, value: '' },
      { productId: 2, value: '' },
    ]);
  });

  it('replaces specs with a default set pre-filled from product data after confirming Reset', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ComparisonSpecificationsEditor comparisonSpecs={specs} recommendedProducts={products} fieldErrors={{}} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /reset to default/i }));
    await user.click(screen.getByRole('button', { name: 'Reset Comparison' }));

    const next = onChange.mock.calls[0][0];
    expect(next.map((spec) => spec.specificationName)).toEqual(['Price', 'Customer Reviews', 'Best For']);
    expect(next[0].values).toEqual([
      { productId: 1, value: '$69.99' },
      { productId: 2, value: '$39.99' },
    ]);
    expect(next[1].values).toEqual([
      { productId: 1, value: '4.8 (12,850)' },
      { productId: 2, value: '' },
    ]);
  });

  it('removes a spec row when Delete is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ComparisonSpecificationsEditor comparisonSpecs={specs} recommendedProducts={products} fieldErrors={{}} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Delete Battery Life specification' }));

    expect(onChange).toHaveBeenCalledWith([]);
  });
});
