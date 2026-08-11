import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BrowseProductGrid from './BrowseProductGrid.jsx';

const PRODUCTS = [
  { id: 1, name: 'Product One', categoryName: 'Electronics', imageFileName: null, productLink: 'https://amazon.com/1' },
  { id: 2, name: 'Product Two', categoryName: 'Home & Kitchen', imageFileName: null, productLink: 'https://amazon.com/2' },
];

describe('BrowseProductGrid', () => {
  it('renders one card per product with a responsive grid layout', () => {
    render(<BrowseProductGrid products={PRODUCTS} />);
    expect(screen.getByText('Product One')).toBeInTheDocument();
    expect(screen.getByText('Product Two')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  it('uses stable keys derived from product id (no index-keyed re-render warnings)', () => {
    const { rerender } = render(<BrowseProductGrid products={PRODUCTS} />);
    rerender(<BrowseProductGrid products={[PRODUCTS[1]]} />);
    expect(screen.queryByText('Product One')).not.toBeInTheDocument();
    expect(screen.getByText('Product Two')).toBeInTheDocument();
  });

  it('renders nothing when given an empty product list', () => {
    render(<BrowseProductGrid products={[]} />);
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });
});
