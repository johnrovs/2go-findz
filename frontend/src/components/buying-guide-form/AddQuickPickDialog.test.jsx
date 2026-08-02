import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AddQuickPickDialog from './AddQuickPickDialog.jsx';

const eligibleProducts = [
  { id: 1, name: 'Soundcore Liberty 4 NC', brand: 'Soundcore', productPrice: '69.99', imageFileName: null, rating: 4.8, reviewCount: 12850 },
  { id: 2, name: 'TOZO NC9', brand: 'TOZO', productPrice: '39.99', imageFileName: null, rating: 4.6, reviewCount: 8430 },
];

describe('AddQuickPickDialog', () => {
  it('does not render when closed', () => {
    render(<AddQuickPickDialog isOpen={false} onClose={vi.fn()} eligibleProducts={eligibleProducts} onAdd={vi.fn()} />);
    expect(screen.queryByText('Add Quick Pick')).not.toBeInTheDocument();
  });

  it('lists eligible products when open', () => {
    render(<AddQuickPickDialog isOpen={true} onClose={vi.fn()} eligibleProducts={eligibleProducts} onAdd={vi.fn()} />);
    expect(screen.getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
    expect(screen.getByText('TOZO NC9')).toBeInTheDocument();
  });

  it('filters the list by search text', async () => {
    const user = userEvent.setup();
    render(<AddQuickPickDialog isOpen={true} onClose={vi.fn()} eligibleProducts={eligibleProducts} onAdd={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/search/i), 'tozo');

    expect(screen.queryByText('Soundcore Liberty 4 NC')).not.toBeInTheDocument();
    expect(screen.getByText('TOZO NC9')).toBeInTheDocument();
  });

  it('calls onAdd with the selected product and closes', async () => {
    const onAdd = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AddQuickPickDialog isOpen={true} onClose={onClose} eligibleProducts={eligibleProducts} onAdd={onAdd} />);

    await user.click(screen.getAllByRole('button', { name: 'Add' })[0]);

    expect(onAdd).toHaveBeenCalledWith(eligibleProducts[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows an empty state when there are no eligible products', () => {
    render(<AddQuickPickDialog isOpen={true} onClose={vi.fn()} eligibleProducts={[]} onAdd={vi.fn()} />);
    expect(screen.getByText(/every product in this guide is already a quick pick/i)).toBeInTheDocument();
  });

  it('has a Cancel action that closes without adding', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AddQuickPickDialog isOpen={true} onClose={onClose} eligibleProducts={eligibleProducts} onAdd={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
  });
});
