import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ProductPicker from './ProductPicker.jsx';
import * as adminProductService from '../services/adminProductService.js';

const productA = { id: 1, name: 'Wireless Earbuds' };
const productB = { id: 2, name: 'Smart Watch' };

describe('ProductPicker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('searches and adds a product to the selection', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({ content: [productA] });
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ProductPicker selectedProducts={[]} onChange={onChange} />);

    await user.type(screen.getByLabelText('Recommended Products'), 'earbuds');
    await user.click(await screen.findByRole('button', { name: 'Wireless Earbuds' }));

    expect(onChange).toHaveBeenCalledWith([productA]);
  });

  it('does not add the same product twice', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({ content: [productA] });
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ProductPicker selectedProducts={[productA]} onChange={onChange} />);

    await user.type(screen.getByLabelText('Recommended Products'), 'earbuds');
    await user.click(await screen.findByRole('button', { name: 'Wireless Earbuds' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes a selected product', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ProductPicker selectedProducts={[productA, productB]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Remove Wireless Earbuds' }));

    expect(onChange).toHaveBeenCalledWith([productB]);
  });

  it('reorders selected products with the move up/down buttons', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ProductPicker selectedProducts={[productA, productB]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Move Smart Watch up' }));

    expect(onChange).toHaveBeenCalledWith([productB, productA]);
  });

  it('disables move-up for the first item and move-down for the last item', () => {
    render(<ProductPicker selectedProducts={[productA, productB]} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Move Wireless Earbuds up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Smart Watch down' })).toBeDisabled();
  });
});
