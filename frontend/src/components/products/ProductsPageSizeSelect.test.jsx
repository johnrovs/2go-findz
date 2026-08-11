import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ProductsPageSizeSelect from './ProductsPageSizeSelect.jsx';

describe('ProductsPageSizeSelect', () => {
  it('renders the "Show [size] per page" label with 12/24/48 options', () => {
    render(<ProductsPageSizeSelect size={24} onChange={vi.fn()} />);
    const select = screen.getByRole('combobox', { name: 'Products per page' });
    expect(select).toHaveValue('24');
    expect(screen.getByRole('option', { name: '12' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '24' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '48' })).toBeInTheDocument();
  });

  it('calls onChange with the numeric size when a new option is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ProductsPageSizeSelect size={24} onChange={onChange} />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Products per page' }), '48');

    expect(onChange).toHaveBeenCalledWith(48);
  });
});
