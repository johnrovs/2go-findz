import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ComparisonSpecificationRow from './ComparisonSpecificationRow.jsx';

const products = [
  { id: 1, name: 'Soundcore Liberty 4 NC' },
  { id: 2, name: 'TOZO NC9 Hybrid Active' },
];

const spec = {
  clientId: 'spec-1',
  specificationName: 'Battery Life',
  values: [
    { productId: 1, value: '50 Hrs' },
    { productId: 2, value: '40 Hrs' },
  ],
};

function renderRow(props = {}) {
  return render(
    <ul>
      <ComparisonSpecificationRow
        spec={spec}
        index={0}
        total={1}
        products={products}
        nameError={null}
        valueErrors={{}}
        onNameChange={vi.fn()}
        onValueChange={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        onRemove={vi.fn()}
        {...props}
      />
    </ul>
  );
}

describe('ComparisonSpecificationRow', () => {
  it('renders the specification name and every product value', () => {
    renderRow();
    expect(screen.getByLabelText('Specification Name')).toHaveValue('Battery Life');
    expect(screen.getByLabelText('Soundcore Liberty 4 NC')).toHaveValue('50 Hrs');
    expect(screen.getByLabelText('TOZO NC9 Hybrid Active')).toHaveValue('40 Hrs');
  });

  it('calls onNameChange when the specification name changes', async () => {
    const onNameChange = vi.fn();
    const user = userEvent.setup();
    renderRow({ onNameChange });

    await user.type(screen.getByLabelText('Specification Name'), '!');

    expect(onNameChange).toHaveBeenCalledWith('spec-1', 'Battery Life!');
  });

  it('calls onValueChange with the spec id, product id, and new value', async () => {
    const onValueChange = vi.fn();
    const user = userEvent.setup();
    renderRow({ onValueChange });

    await user.type(screen.getByLabelText('Soundcore Liberty 4 NC'), '!');

    expect(onValueChange).toHaveBeenCalledWith('spec-1', 1, '50 Hrs!');
  });

  it('shows an inline name error when provided', () => {
    renderRow({ nameError: 'Specification name is required.' });
    expect(screen.getByText('Specification name is required.')).toBeInTheDocument();
  });

  it('shows an inline value error for the affected product only', () => {
    renderRow({ valueErrors: { 1: 'A value is required.' } });
    expect(screen.getByText('A value is required.')).toBeInTheDocument();
  });

  it('disables Move up on the first row and Move down on the last row', () => {
    renderRow({ index: 0, total: 1 });
    expect(screen.getByRole('button', { name: 'Move Battery Life up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Battery Life down' })).toBeDisabled();
  });

  it('calls onRemove with the spec client id', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    renderRow({ onRemove });

    await user.click(screen.getByRole('button', { name: 'Delete Battery Life specification' }));

    expect(onRemove).toHaveBeenCalledWith('spec-1');
  });
});
