import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ProductCard from './ProductCard.jsx';
import * as trackingService from '../services/trackingService.js';

const baseProduct = {
  id: 1,
  name: 'Wireless Earbuds',
  description: 'Compact wireless earbuds with noise cancellation.',
  categoryId: 2,
  categoryName: 'Electronics',
  imageFileName: 'img_20260726_120000_001.jpg',
  productPrice: '49.99',
  productLink: 'https://amazon.com/dp/example',
  trending: true,
  bestSeller: false,
  active: true,
  createdAt: '2026-07-20T10:00:00',
  updatedAt: '2026-07-20T10:00:00',
};

describe('ProductCard', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders product details and the trending badge only', () => {
    render(<ProductCard product={baseProduct} />);

    expect(screen.getByText('Wireless Earbuds')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('$49.99')).toBeInTheDocument();
    expect(screen.getByText('Trending')).toBeInTheDocument();
    expect(screen.queryByText('Best Seller')).not.toBeInTheDocument();
  });

  it('renders the "View on Amazon" link with the correct href and rel attributes', () => {
    render(<ProductCard product={baseProduct} />);

    const link = screen.getByRole('link', { name: /view on amazon/i });
    expect(link).toHaveAttribute('href', baseProduct.productLink);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'nofollow sponsored noopener noreferrer');
  });

  it('records a click with the stored session id when "View on Amazon" is clicked', async () => {
    sessionStorage.setItem('sessionId', 'test-session-abc');
    vi.spyOn(trackingService, 'recordClick').mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<ProductCard product={baseProduct} />);

    await user.click(screen.getByRole('link', { name: /view on amazon/i }));

    expect(trackingService.recordClick).toHaveBeenCalledWith(baseProduct.id, 'test-session-abc');
  });

  it('renders a placeholder message when there is no product image', () => {
    render(<ProductCard product={{ ...baseProduct, imageFileName: null }} />);

    expect(screen.getByText('No image available')).toBeInTheDocument();
  });
});
