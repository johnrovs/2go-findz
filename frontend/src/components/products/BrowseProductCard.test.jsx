import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import BrowseProductCard from './BrowseProductCard.jsx';
import * as trackingService from '../../services/trackingService.js';

const PRODUCT = {
  id: 42,
  name: 'Wireless Noise Cancelling Headphones',
  categoryName: 'Electronics',
  imageFileName: 'headphones.webp',
  productLink: 'https://www.amazon.com/dp/B000000000?tag=2gofindz-20',
  description: 'A long marketing description that should never render on this card.',
  productPrice: 199.99,
  rating: 4.5,
  reviewCount: 128,
};

describe('BrowseProductCard', () => {
  it('renders the product name and category label', () => {
    render(<BrowseProductCard product={PRODUCT} />);
    expect(screen.getByText('Wireless Noise Cancelling Headphones')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
  });

  it('renders the image with real alt text', () => {
    render(<BrowseProductCard product={PRODUCT} />);
    const image = screen.getByRole('img', { name: 'Wireless Noise Cancelling Headphones' });
    expect(image.getAttribute('src')).toContain('headphones.webp');
  });

  it('renders a fallback when there is no image', () => {
    render(<BrowseProductCard product={{ ...PRODUCT, imageFileName: null }} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('No image available')).toBeInTheDocument();
  });

  it('never renders price, rating, review count, or description', () => {
    render(<BrowseProductCard product={PRODUCT} />);
    expect(screen.queryByText(/199\.99/)).not.toBeInTheDocument();
    expect(screen.queryByText(/4\.5/)).not.toBeInTheDocument();
    expect(screen.queryByText(/128/)).not.toBeInTheDocument();
    expect(screen.queryByText(/long marketing description/)).not.toBeInTheDocument();
  });

  it('renders a "View on Amazon" link using the real productLink with safe rel/target', () => {
    render(<BrowseProductCard product={PRODUCT} />);
    const link = screen.getByRole('link', { name: /View Wireless Noise Cancelling Headphones on Amazon/ });
    expect(link).toHaveAttribute('href', PRODUCT.productLink);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'nofollow sponsored noopener noreferrer');
  });

  it('records a real click via trackingService when the Amazon link is clicked', async () => {
    const user = userEvent.setup();
    vi.spyOn(trackingService, 'recordClick').mockResolvedValue();
    render(<BrowseProductCard product={PRODUCT} />);

    await user.click(screen.getByRole('link', { name: /View .* on Amazon/ }));

    expect(trackingService.recordClick.mock.calls[0][0]).toBe(42);
  });
});
