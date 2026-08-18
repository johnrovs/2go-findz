import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QuickPickEditorList from './QuickPickEditorList.jsx';

const quickPicks = [
  { product: { id: 1, name: 'Soundcore Liberty 4 NC', productPrice: '69.99', productLink: 'https://amazon.com/dp/a' }, badgeName: 'Best Overall' },
  { product: { id: 2, name: 'TOZO NC9', productPrice: '39.99', productLink: 'https://amazon.com/dp/b' }, badgeName: 'Best Battery Life' },
];

describe('QuickPickEditorList', () => {
  it('shows an empty state with no quick picks', () => {
    render(<QuickPickEditorList quickPicks={[]} fieldErrors={{}} onChange={vi.fn()} />);
    expect(screen.getByText(/no quick picks yet/i)).toBeInTheDocument();
  });

  it('renders one row per quick pick in order', () => {
    render(<QuickPickEditorList quickPicks={quickPicks} fieldErrors={{}} onChange={vi.fn()} />);
    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Soundcore Liberty 4 NC');
    expect(items[1]).toHaveTextContent('TOZO NC9');
  });

  it('reorders with the up/down buttons', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QuickPickEditorList quickPicks={quickPicks} fieldErrors={{}} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Move TOZO NC9 up' }));

    expect(onChange).toHaveBeenCalledWith([quickPicks[1], quickPicks[0]]);
  });

  it('updates a badge name in place without reordering', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QuickPickEditorList quickPicks={quickPicks} fieldErrors={{}} onChange={onChange} />);

    await user.type(screen.getAllByLabelText('Badge Name')[0], '!');

    expect(onChange).toHaveBeenCalledWith([
      { ...quickPicks[0], badgeName: 'Best Overall!' },
      quickPicks[1],
    ]);
  });

  it('removes a quick pick', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<QuickPickEditorList quickPicks={quickPicks} fieldErrors={{}} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Remove TOZO NC9 from Quick Picks' }));

    expect(onChange).toHaveBeenCalledWith([quickPicks[0]]);
  });

  it('passes field errors through to the matching row', () => {
    render(
      <QuickPickEditorList
        quickPicks={quickPicks}
        fieldErrors={{ 2: 'Badge name is required.' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('Badge name is required.')).toBeInTheDocument();
  });
});
