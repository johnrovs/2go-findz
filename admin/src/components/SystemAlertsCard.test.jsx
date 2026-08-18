import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SystemAlertsCard from './SystemAlertsCard.jsx';

function renderCard(props) {
  return render(
    <MemoryRouter>
      <SystemAlertsCard draftProductCount={0} draftGuideCount={0} emptyCategoryCount={0} {...props} />
    </MemoryRouter>
  );
}

describe('SystemAlertsCard', () => {
  it('renders the title', () => {
    renderCard();
    expect(screen.getByText('System Alerts')).toBeInTheDocument();
  });

  it('renders a row per non-zero count, correctly pluralized, with the right link', () => {
    renderCard({ draftProductCount: 3, draftGuideCount: 1, emptyCategoryCount: 2 });

    const draftProductsLink = screen.getByRole('link', { name: /3 draft products need review/ });
    expect(draftProductsLink).toHaveAttribute('href', '/products');

    const draftGuideLink = screen.getByRole('link', { name: /1 draft buying guide needs review/ });
    expect(draftGuideLink).toHaveAttribute('href', '/buying-guides');

    const emptyCategoriesLink = screen.getByRole('link', { name: /2 categories with no active products/ });
    expect(emptyCategoriesLink).toHaveAttribute('href', '/categories');
  });

  it('omits rows whose count is zero', () => {
    renderCard({ draftProductCount: 5, draftGuideCount: 0, emptyCategoryCount: 0 });

    expect(screen.getByRole('link', { name: /5 draft products need review/ })).toBeInTheDocument();
    expect(screen.queryByText(/draft buying guide/)).not.toBeInTheDocument();
    expect(screen.queryByText(/no active products/)).not.toBeInTheDocument();
  });

  it('shows "All caught up!" when every count is zero', () => {
    renderCard({ draftProductCount: 0, draftGuideCount: 0, emptyCategoryCount: 0 });
    expect(screen.getByText('All caught up!')).toBeInTheDocument();
  });
});
