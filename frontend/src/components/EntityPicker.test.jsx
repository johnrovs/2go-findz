import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import EntityPicker from './EntityPicker.jsx';

const itemA = { id: 1, name: 'Item A' };
const itemB = { id: 2, name: 'Item B' };

function getLabel(item) {
  return item.name;
}

function renderPicker(props) {
  return render(
    <EntityPicker
      label="Related Items"
      inputId="itemSearch"
      searchPlaceholder="Search items to add..."
      getItemLabel={getLabel}
      {...props}
    />
  );
}

describe('EntityPicker', () => {
  it('searches and adds an item to the selection', async () => {
    const search = vi.fn().mockResolvedValue([itemA]);
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderPicker({ selectedItems: [], onChange, search });

    await user.type(screen.getByLabelText('Related Items'), 'item a');
    await user.click(await screen.findByRole('button', { name: 'Item A' }));

    expect(onChange).toHaveBeenCalledWith([itemA]);
  });

  it('does not add the same item twice', async () => {
    const search = vi.fn().mockResolvedValue([itemA]);
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderPicker({ selectedItems: [itemA], onChange, search });

    await user.type(screen.getByLabelText('Related Items'), 'item a');
    await user.click(await screen.findByRole('button', { name: 'Item A' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes a selected item', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderPicker({ selectedItems: [itemA, itemB], onChange, search: vi.fn() });

    await user.click(screen.getByRole('button', { name: 'Remove Item A' }));

    expect(onChange).toHaveBeenCalledWith([itemB]);
  });

  it('reorders selected items with the move up/down buttons', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderPicker({ selectedItems: [itemA, itemB], onChange, search: vi.fn() });

    await user.click(screen.getByRole('button', { name: 'Move Item B up' }));

    expect(onChange).toHaveBeenCalledWith([itemB, itemA]);
  });

  it('disables move-up for the first item and move-down for the last item', () => {
    renderPicker({ selectedItems: [itemA, itemB], onChange: vi.fn(), search: vi.fn() });

    expect(screen.getByRole('button', { name: 'Move Item A up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Item B down' })).toBeDisabled();
  });
});
