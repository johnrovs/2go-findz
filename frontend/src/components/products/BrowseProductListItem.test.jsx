import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BrowseProductListItem from './BrowseProductListItem.jsx';

const PRODUCT = {
  id: 7,
  name: 'Portable Blender',
  categoryName: 'Home & Kitchen',
  description: 'Crushes ice in seconds, USB-C rechargeable.',
  imageFileName: null,
  productLink: 'https://www.amazon.com/dp/B111111111',
};

describe('BrowseProductListItem', () => {
  it('renders name, category, and the short description when available', () => {
    render(<BrowseProductListItem product={PRODUCT} />);
    expect(screen.getByText('Portable Blender')).toBeInTheDocument();
    expect(screen.getByText('Home & Kitchen')).toBeInTheDocument();
    expect(screen.getByText('Crushes ice in seconds, USB-C rechargeable.')).toBeInTheDocument();
  });

  it('omits the description block when the product has none', () => {
    render(<BrowseProductListItem product={{ ...PRODUCT, description: null }} />);
    expect(screen.queryByText('Crushes ice in seconds, USB-C rechargeable.')).not.toBeInTheDocument();
  });

  it('renders a View on Amazon link with the real productLink', () => {
    render(<BrowseProductListItem product={PRODUCT} />);
    const link = screen.getByRole('link', { name: /View Portable Blender on Amazon/ });
    expect(link).toHaveAttribute('href', PRODUCT.productLink);
    expect(link).toHaveAttribute('rel', 'nofollow sponsored noopener noreferrer');
  });

  it('never renders price or rating', () => {
    render(<BrowseProductListItem product={{ ...PRODUCT, productPrice: 49.99, rating: 4.8 }} />);
    expect(screen.queryByText(/49\.99/)).not.toBeInTheDocument();
    expect(screen.queryByText(/4\.8/)).not.toBeInTheDocument();
  });
});
