import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import HomeCategoryCard from './HomeCategoryCard.jsx';

function renderCard(category) {
  return render(
    <MemoryRouter>
      <HomeCategoryCard category={category} />
    </MemoryRouter>
  );
}

describe('HomeCategoryCard', () => {
  it('renders the category name', () => {
    renderCard({ id: 1, productCategoryName: 'Electronics' });
    expect(screen.getByText('Electronics')).toBeInTheDocument();
  });

  it('links to the categories page filtered by this category id', () => {
    renderCard({ id: 7, productCategoryName: 'Home & Kitchen' });
    expect(screen.getByRole('link', { name: /home & kitchen/i })).toHaveAttribute(
      'href',
      '/categories?category=7'
    );
  });

  it('falls back to a generic icon for an unrecognized category name', () => {
    renderCard({ id: 9, productCategoryName: 'Miscellaneous Widgets' });
    expect(screen.getByText('Miscellaneous Widgets')).toBeInTheDocument();
  });
});
