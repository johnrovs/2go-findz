import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TopPickSection from './TopPickSection.jsx';

const products = [
  { id: 1, name: 'Soundcore Liberty 4 NC', brand: 'Soundcore', productPrice: '69.99', imageFileName: null, rating: 4.8, reviewCount: 12850, active: true },
];

const topPick = {
  clientId: 'tp-1',
  product: products[0],
  sectionLabel: 'Best Overall',
  whyRecommended: '<p>Great sound.</p>',
  pros: [{ clientId: 'p1', content: 'Great sound' }],
  cons: [{ clientId: 'c1', content: 'Pricey' }],
  bestFor: [{ clientId: 'b1', content: 'Daily commuters' }],
};

describe('TopPickSection', () => {
  it('shows the empty state and an Add button when there is no Top Pick', () => {
    render(<TopPickSection topPick={null} eligibleProducts={products} onSelect={vi.fn()} onRemove={vi.fn()} onFieldChange={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByText('No Top Pick selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Top Pick Product' })).toBeInTheDocument();
  });

  it('shows the product summary and editorial editor when a Top Pick exists', () => {
    render(<TopPickSection topPick={topPick} eligibleProducts={products} onSelect={vi.fn()} onRemove={vi.fn()} onFieldChange={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
    expect(screen.getByLabelText('Recommendation Badge')).toHaveValue('Best Overall');
    expect(screen.getByDisplayValue('Great sound')).toBeInTheDocument();
  });

  it('shows an active-warning when the product is no longer active', () => {
    const inactiveTopPick = { ...topPick, product: { ...products[0], active: false } };
    render(<TopPickSection topPick={inactiveTopPick} eligibleProducts={products} onSelect={vi.fn()} onRemove={vi.fn()} onFieldChange={vi.fn()} fieldErrors={{}} />);
    expect(screen.getByText(/no longer active/i)).toBeInTheDocument();
  });

  it('selecting a product immediately when there is no existing Top Pick calls onSelect without confirming', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<TopPickSection topPick={null} eligibleProducts={products} onSelect={onSelect} onRemove={vi.fn()} onFieldChange={vi.fn()} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: 'Add Top Pick Product' }));
    await user.click(screen.getByRole('button', { name: 'Select' }));

    expect(onSelect).toHaveBeenCalledWith(products[0]);
  });

  it('replacing an existing Top Pick requires confirmation before calling onSelect', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const otherProduct = { id: 2, name: 'TOZO NC9', brand: 'TOZO', productPrice: '39.99', imageFileName: null, rating: 4.2, reviewCount: 500, active: true };
    render(
      <TopPickSection
        topPick={topPick}
        eligibleProducts={[...products, otherProduct]}
        onSelect={onSelect}
        onRemove={vi.fn()}
        onFieldChange={vi.fn()}
        fieldErrors={{}}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Change Product' }));
    // Two eligible products are listed (the current Top Pick's own product plus the
    // candidate), so target the candidate's row specifically rather than an ambiguous
    // singular "Select" query.
    const tozoRow = screen.getByText('TOZO NC9').closest('li');
    await user.click(within(tozoRow).getByRole('button', { name: 'Select' }));
    expect(onSelect).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Replace Product' }));
    expect(onSelect).toHaveBeenCalledWith(otherProduct);
  });

  it('removing the Top Pick requires confirmation before calling onRemove', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    render(<TopPickSection topPick={topPick} eligibleProducts={products} onSelect={vi.fn()} onRemove={onRemove} onFieldChange={vi.fn()} fieldErrors={{}} />);

    await user.click(screen.getByRole('button', { name: 'Remove Product' }));
    expect(onRemove).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onRemove).toHaveBeenCalled();
  });
});
