import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SelectedProductsPanel from './SelectedProductsPanel.jsx';

const products = [
  { id: 1, name: 'Blender', imageFileName: null },
  { id: 2, name: 'Toaster', imageFileName: null },
  { id: 3, name: 'Kettle', imageFileName: null },
];

describe('SelectedProductsPanel', () => {
  it('shows an empty state with no products selected', () => {
    render(<SelectedProductsPanel selectedProducts={[]} onChange={vi.fn()} />);
    expect(screen.getByText('No products selected yet')).toBeInTheDocument();
  });

  it('renders selected products in order with a live count', () => {
    render(<SelectedProductsPanel selectedProducts={products} onChange={vi.fn()} />);
    expect(screen.getByText('3 products selected')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Selected products' });
    const items = list.querySelectorAll('li');
    expect(items[0]).toHaveTextContent('Blender');
    expect(items[1]).toHaveTextContent('Toaster');
    expect(items[2]).toHaveTextContent('Kettle');
  });

  it('uses singular wording for exactly one selected product', () => {
    render(<SelectedProductsPanel selectedProducts={[products[0]]} onChange={vi.fn()} />);
    expect(screen.getByText('1 product selected')).toBeInTheDocument();
  });

  it('reorders with the up/down buttons and respects boundaries', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SelectedProductsPanel selectedProducts={products} onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'Move Blender up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Kettle down' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Move Toaster up' }));
    expect(onChange).toHaveBeenCalledWith([products[1], products[0], products[2]]);
  });

  it('removes a product immediately with no confirmation', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SelectedProductsPanel selectedProducts={products} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Remove Toaster' }));

    expect(onChange).toHaveBeenCalledWith([products[0], products[2]]);
  });
});
