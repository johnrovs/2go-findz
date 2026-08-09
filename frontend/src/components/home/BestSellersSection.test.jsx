import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BestSellersSection from './BestSellersSection.jsx';

const products = [
  { id: 1, name: 'Row One', imageFileName: null, productLink: 'https://amazon.com/dp/1' },
  { id: 2, name: 'Row Two', imageFileName: null, productLink: 'https://amazon.com/dp/2' },
  { id: 3, name: 'Row Three', imageFileName: null, productLink: 'https://amazon.com/dp/3' },
  { id: 4, name: 'Row Four', imageFileName: null, productLink: 'https://amazon.com/dp/4' },
];

describe('BestSellersSection', () => {
  it('renders nothing with no products', () => {
    const { container } = render(<BestSellersSection products={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders at most 3 compact rows', () => {
    render(<BestSellersSection products={products} />);
    expect(screen.getByText('Row One')).toBeInTheDocument();
    expect(screen.getByText('Row Two')).toBeInTheDocument();
    expect(screen.getByText('Row Three')).toBeInTheDocument();
    expect(screen.queryByText('Row Four')).not.toBeInTheDocument();
  });
});
