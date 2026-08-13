import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import RecentProductsCard from './RecentProductsCard.jsx';

const products = [
  {
    id: 1,
    name: 'Soundcore Liberty 4 NC',
    imageFileName: null,
    categoryName: 'Electronics',
    active: true,
    createdAt: '2026-05-25T00:00:00',
    clicks: 342,
  },
  {
    id: 2,
    name: 'Anker 523 Power Bank',
    imageFileName: null,
    categoryName: 'Electronics',
    active: false,
    createdAt: '2026-05-22T00:00:00',
    clicks: 0,
  },
];

function renderCard(props) {
  return render(
    <MemoryRouter>
      <RecentProductsCard {...props} />
    </MemoryRouter>
  );
}

describe('RecentProductsCard', () => {
  it('renders the title and two "View all products" links (header and bottom button)', () => {
    renderCard({ products });
    expect(screen.getByText('Recent Products')).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: 'View all products' });
    expect(links).toHaveLength(2);
    links.forEach((link) => expect(link).toHaveAttribute('href', '/admin/products'));
  });

  it('renders each product name, category, and clicks', () => {
    renderCard({ products });
    expect(screen.getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
    expect(screen.getByText('342')).toBeInTheDocument();
    expect(screen.getByText('Anker 523 Power Bank')).toBeInTheDocument();
  });

  it('shows Published for active products and Draft for inactive ones', () => {
    renderCard({ products });
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders an accessible actions menu trigger per row', () => {
    renderCard({ products });
    expect(screen.getByRole('button', { name: 'Soundcore Liberty 4 NC actions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anker 523 Power Bank actions' })).toBeInTheDocument();
  });

  it('shows an empty state when there are no products', () => {
    renderCard({ products: [] });
    expect(screen.getByText('No products yet')).toBeInTheDocument();
  });
});
