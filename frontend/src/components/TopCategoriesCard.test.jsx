import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import TopCategoriesCard from './TopCategoriesCard.jsx';

const categories = [
  { categoryId: 1, categoryName: 'Electronics', clickCount: 28540 },
  { categoryId: 2, categoryName: 'Home & Kitchen', clickCount: 22180 },
];

function renderCard(props) {
  return render(
    <MemoryRouter>
      <TopCategoriesCard {...props} />
    </MemoryRouter>
  );
}

describe('TopCategoriesCard', () => {
  it('renders the title and a View all link to /admin/categories', () => {
    renderCard({ categories });
    expect(screen.getByText('Top Categories')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/admin/categories');
  });

  it('renders each category name and click count with thousands separators', () => {
    renderCard({ categories });
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('28,540')).toBeInTheDocument();
    expect(screen.getByText('Home & Kitchen')).toBeInTheDocument();
    expect(screen.getByText('22,180')).toBeInTheDocument();
  });

  it("scales the top row's progress bar to 100% width", () => {
    const { container } = renderCard({ categories });
    const bars = container.querySelectorAll('.bg-dashboard-purple.rounded-full');
    expect(bars[0]).toHaveStyle({ width: '100%' });
  });

  it('shows an empty state when no category has any clicks', () => {
    renderCard({ categories: [] });
    expect(screen.getByText('No category activity in this range.')).toBeInTheDocument();
  });
});
