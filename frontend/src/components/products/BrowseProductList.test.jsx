import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BrowseProductList from './BrowseProductList.jsx';

const PRODUCTS = [
  { id: 1, name: 'Product One', categoryName: 'Electronics', imageFileName: null, productLink: 'https://amazon.com/1' },
  { id: 2, name: 'Product Two', categoryName: 'Home & Kitchen', imageFileName: null, productLink: 'https://amazon.com/2' },
];

describe('BrowseProductList', () => {
  it('renders the same products, in the same order, as list items', () => {
    render(<BrowseProductList products={PRODUCTS} />);
    const names = screen.getAllByRole('article').map((article) => article.textContent);
    expect(names[0]).toContain('Product One');
    expect(names[1]).toContain('Product Two');
  });

  it('renders nothing when given an empty product list', () => {
    render(<BrowseProductList products={[]} />);
    expect(screen.queryAllByRole('article')).toHaveLength(0);
  });
});
