import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RunnerUpEditorCard from './RunnerUpEditorCard.jsx';

const runnerUp = {
  clientId: 'ru-1',
  product: { id: 2, name: 'TOZO NC9 Hybrid Active', brand: 'TOZO', productPrice: '39.99', imageFileName: null, rating: 4.2, reviewCount: 500, active: true },
  sectionLabel: 'Best Budget Alternative',
  whyRecommended: '<p>Great value.</p>',
  pros: [{ clientId: 'p1', content: 'Affordable' }],
  cons: [{ clientId: 'c1', content: 'Fewer features' }],
  bestFor: [{ clientId: 'b1', content: 'Budget shoppers' }],
};

function renderCard(props = {}) {
  return render(
    <ul>
      <RunnerUpEditorCard
        runnerUp={runnerUp}
        index={0}
        total={1}
        onChangeProduct={vi.fn()}
        onRemove={vi.fn()}
        onFieldChange={vi.fn()}
        fieldErrors={{}}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        {...props}
      />
    </ul>
  );
}

describe('RunnerUpEditorCard', () => {
  it('shows the collapsed header summary', () => {
    renderCard();
    expect(screen.getByText('TOZO NC9 Hybrid Active')).toBeInTheDocument();
    expect(screen.getByText('Best Budget Alternative')).toBeInTheDocument();
    expect(screen.queryByLabelText('Why We Recommend It')).not.toBeInTheDocument();
  });

  it('expands to show the editorial editor', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('button', { name: /expand/i }));

    expect(screen.getByLabelText('Recommendation Badge')).toHaveValue('Best Budget Alternative');
    expect(screen.getByDisplayValue('Affordable')).toBeInTheDocument();
  });

  it('disables Move up on the first card and Move down on the last card', () => {
    renderCard({ index: 0, total: 1 });
    expect(screen.getByRole('button', { name: 'Move TOZO NC9 Hybrid Active up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move TOZO NC9 Hybrid Active down' })).toBeDisabled();
  });

  it('calls onRemove after confirming', async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();
    renderCard({ onRemove });

    await user.click(screen.getByRole('button', { name: 'Remove Runner-Up' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(onRemove).toHaveBeenCalledWith('ru-1');
  });

  it('shows an active-warning when the product is no longer active', () => {
    renderCard({ runnerUp: { ...runnerUp, product: { ...runnerUp.product, active: false } } });
    expect(screen.getByText(/no longer active/i)).toBeInTheDocument();
  });
});
