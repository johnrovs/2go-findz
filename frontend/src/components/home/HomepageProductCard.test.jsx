import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import HomepageProductCard from './HomepageProductCard.jsx';
import * as trackingService from '../../services/trackingService.js';

const product = {
  id: 1,
  name: 'Wireless Earbuds',
  imageFileName: 'img_example.jpg',
  productLink: 'https://amazon.com/dp/example',
};

describe('HomepageProductCard', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders only the product image and name — no description, price, or button', () => {
    render(<HomepageProductCard product={product} />);
    expect(screen.getByText('Wireless Earbuds')).toBeInTheDocument();
    expect(screen.queryByText(/check price/i)).not.toBeInTheDocument();
  });

  it('links the whole card to the real Amazon product link with safe rel attributes', () => {
    render(<HomepageProductCard product={product} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', product.productLink);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'nofollow sponsored noopener noreferrer');
  });

  it('records a click with the stored session id when clicked', async () => {
    sessionStorage.setItem('sessionId', 'test-session-abc');
    vi.spyOn(trackingService, 'recordClick').mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<HomepageProductCard product={product} />);

    await user.click(screen.getByRole('link'));

    expect(trackingService.recordClick).toHaveBeenCalledWith(product.id, 'test-session-abc');
  });

  it('renders a placeholder message when there is no product image', () => {
    render(<HomepageProductCard product={{ ...product, imageFileName: null }} />);
    expect(screen.getByText('No image available')).toBeInTheDocument();
  });

  it('renders a borderless card with a left-aligned caption', () => {
    render(<HomepageProductCard product={product} />);
    const link = screen.getByRole('link');
    expect(link).not.toHaveClass('border', 'shadow-card');
    expect(screen.getByText(product.name)).toHaveClass('text-left');
  });

  it('renders the caption at medium weight, not semibold, so Poppins reads less heavy', () => {
    render(<HomepageProductCard product={product} />);
    const caption = screen.getByText(product.name);
    expect(caption).toHaveClass('font-medium');
    expect(caption).not.toHaveClass('font-semibold');
  });

  it('does not clip the caption text with a rounded overflow-hidden corner on the outer link', () => {
    render(<HomepageProductCard product={product} />);
    const link = screen.getByRole('link');
    expect(link).not.toHaveClass('overflow-hidden', 'rounded-card');
  });
});
