import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BuyingGuideQuickPicksStep from './BuyingGuideQuickPicksStep.jsx';

const productA = { id: 1, name: 'Soundcore Liberty 4 NC', brand: 'Soundcore', productPrice: '69.99', productLink: 'https://amazon.com/dp/a' };
const productB = { id: 2, name: 'TOZO NC9', brand: 'TOZO', productPrice: '39.99', productLink: 'https://amazon.com/dp/b' };

describe('BuyingGuideQuickPicksStep', () => {
  it('renders the heading and supporting text', () => {
    render(
      <BuyingGuideQuickPicksStep quickRecommendations={[]} onChange={vi.fn()} recommendedProducts={[productA]} fieldErrors={{}} />
    );
    expect(screen.getByRole('heading', { name: 'Quick Picks' })).toBeInTheDocument();
    expect(screen.getByText(/help readers compare the best options/i)).toBeInTheDocument();
  });

  it('toggles the How it works panel', async () => {
    const user = userEvent.setup();
    render(
      <BuyingGuideQuickPicksStep quickRecommendations={[]} onChange={vi.fn()} recommendedProducts={[productA]} fieldErrors={{}} />
    );

    expect(screen.queryByText(/every quick pick must use a product/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'How it works' }));
    expect(screen.getByText(/every quick pick must use a product/i)).toBeInTheDocument();
  });

  it('opens the Add Quick Pick dialog and adds a product to the list', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <BuyingGuideQuickPicksStep quickRecommendations={[]} onChange={onChange} recommendedProducts={[productA]} fieldErrors={{}} />
    );

    await user.click(screen.getByRole('button', { name: 'Add Quick Pick' }));
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(onChange).toHaveBeenCalledWith([{ product: productA, badgeName: '' }]);
  });

  it('excludes already-added products from eligible products', async () => {
    const user = userEvent.setup();
    render(
      <BuyingGuideQuickPicksStep
        quickRecommendations={[{ product: productA, badgeName: 'Best Overall' }]}
        onChange={vi.fn()}
        recommendedProducts={[productA, productB]}
        fieldErrors={{}}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Add Quick Pick' }));

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.queryByText('Soundcore Liberty 4 NC')).not.toBeInTheDocument();
    expect(dialog.getByText('TOZO NC9')).toBeInTheDocument();
  });

  it('disables Add Quick Pick at the 5-item maximum', () => {
    const fiveQuickPicks = Array.from({ length: 5 }, (_, i) => ({
      product: { id: i + 1, name: `Product ${i + 1}`, productPrice: '9.99', productLink: 'https://amazon.com/dp/x' },
      badgeName: `Badge ${i + 1}`,
    }));
    render(
      <BuyingGuideQuickPicksStep
        quickRecommendations={fiveQuickPicks}
        onChange={vi.fn()}
        recommendedProducts={fiveQuickPicks.map((qp) => qp.product)}
        fieldErrors={{}}
      />
    );

    expect(screen.getByRole('button', { name: 'Add Quick Pick' })).toBeDisabled();
    expect(screen.getByText(/maximum of 5 quick picks/i)).toBeInTheDocument();
  });

  it('renders the tip notice', () => {
    render(
      <BuyingGuideQuickPicksStep quickRecommendations={[]} onChange={vi.fn()} recommendedProducts={[productA]} fieldErrors={{}} />
    );
    expect(screen.getByText(/drag and drop to reorder your quick picks/i)).toBeInTheDocument();
  });
});
