import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QuickPickEditorRow from './QuickPickEditorRow.jsx';

const product = {
  id: 1,
  name: 'Soundcore Liberty 4 NC',
  brand: 'Soundcore',
  productPrice: '69.99',
  imageFileName: null,
  productLink: 'https://amazon.com/dp/B012XYZ45?tag=2gofindz-20',
  rating: 4.8,
  reviewCount: 12850,
};

function renderRow(props = {}) {
  return render(
    <QuickPickEditorRow
      quickPick={{ product, badgeName: 'Best Overall' }}
      index={0}
      total={1}
      error={null}
      onBadgeNameChange={vi.fn()}
      onMoveUp={vi.fn()}
      onMoveDown={vi.fn()}
      onRemove={vi.fn()}
      {...props}
    />
  );
}

describe('QuickPickEditorRow', () => {
  it('renders product info and the badge', () => {
    renderRow();
    expect(screen.getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
    expect(screen.getByText('Soundcore')).toBeInTheDocument();
    expect(screen.getByText('$69.99')).toBeInTheDocument();
    expect(screen.getByText('Best Overall')).toBeInTheDocument();
    expect(screen.getByText(/12,850/)).toBeInTheDocument();
  });

  it('calls onBadgeNameChange when the badge name input changes', async () => {
    const onBadgeNameChange = vi.fn();
    const user = userEvent.setup();
    renderRow({ onBadgeNameChange });

    await user.type(screen.getByLabelText('Badge Name'), '!');

    expect(onBadgeNameChange).toHaveBeenCalledWith(1, 'Best Overall!');
  });

  it('shows an inline error when provided', () => {
    renderRow({ error: 'Badge name is required.' });
    expect(screen.getByText('Badge name is required.')).toBeInTheDocument();
  });

  it('disables Move up on the first row and Move down on the last row', () => {
    renderRow({ index: 0, total: 1 });
    expect(screen.getByRole('button', { name: 'Move Soundcore Liberty 4 NC up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Soundcore Liberty 4 NC down' })).toBeDisabled();
  });

  it('renders the Amazon link as an external, safe, read-only link', () => {
    renderRow();
    const link = screen.getByRole('link', { name: /open amazon link/i });
    expect(link).toHaveAttribute('href', 'https://amazon.com/dp/B012XYZ45?tag=2gofindz-20');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'nofollow sponsored noopener noreferrer');
  });

  it('warns when the product link is not a supported Amazon hostname', () => {
    renderRow({
      quickPick: { product: { ...product, productLink: 'https://example.com/dp/x' }, badgeName: 'Best Overall' },
    });
    expect(screen.getByText(/not a recognized amazon link/i)).toBeInTheDocument();
  });

  it('calls onRemove with the product id', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    renderRow({ onRemove });

    await user.click(screen.getByRole('button', { name: 'Remove Soundcore Liberty 4 NC from Quick Picks' }));

    expect(onRemove).toHaveBeenCalledWith(1);
  });
});
