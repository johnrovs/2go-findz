import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TrendingRightNowSection from './TrendingRightNowSection.jsx';

const products = [
  { id: 1, name: 'Featured Trend', imageFileName: null, productLink: 'https://amazon.com/dp/1' },
  { id: 2, name: 'Row One', imageFileName: null, productLink: 'https://amazon.com/dp/2' },
  { id: 3, name: 'Row Two', imageFileName: null, productLink: 'https://amazon.com/dp/3' },
  { id: 4, name: 'Row Three', imageFileName: null, productLink: 'https://amazon.com/dp/4' },
];

describe('TrendingRightNowSection', () => {
  it('renders nothing with no products', () => {
    const { container } = render(<TrendingRightNowSection products={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the first product as the large featured image', () => {
    render(<TrendingRightNowSection products={products} />);
    expect(screen.getByRole('link', { name: 'Featured Trend' })).toBeInTheDocument();
  });

  it('renders up to 3 compact rows for the remaining products', () => {
    render(<TrendingRightNowSection products={products} />);
    expect(screen.getByText('Row One')).toBeInTheDocument();
    expect(screen.getByText('Row Two')).toBeInTheDocument();
    expect(screen.getByText('Row Three')).toBeInTheDocument();
  });
});
