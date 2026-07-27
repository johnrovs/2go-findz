import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ProductCard from './ProductCard.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
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

function renderCard(product = baseProduct) {
  return render(
    <CompareProvider>
      <ProductCard product={product} />
    </CompareProvider>
  );
}

describe('ProductCard', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders the product name, category, and the trending badge only', () => {
    renderCard();

    expect(screen.getByText('Wireless Earbuds')).toBeInTheDocument();
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Trending')).toBeInTheDocument();
    expect(screen.queryByText('Best Seller')).not.toBeInTheDocument();
  });

  it('never renders the description, price, or added date', () => {
    renderCard();

    expect(screen.queryByText(baseProduct.description)).not.toBeInTheDocument();
    expect(screen.queryByText('$49.99')).not.toBeInTheDocument();
    expect(screen.queryByText(/added/i)).not.toBeInTheDocument();
  });

  it('renders the "View on Amazon" link with the correct href and rel attributes', () => {
    renderCard();

    const link = screen.getByRole('link', { name: /view on amazon/i });
    expect(link).toHaveAttribute('href', baseProduct.productLink);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'nofollow sponsored noopener noreferrer');
  });

  it('records a click with the stored session id when "View on Amazon" is clicked', async () => {
    sessionStorage.setItem('sessionId', 'test-session-abc');
    vi.spyOn(trackingService, 'recordClick').mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole('link', { name: /view on amazon/i }));

    expect(trackingService.recordClick).toHaveBeenCalledWith(baseProduct.id, 'test-session-abc');
  });

  it('renders a placeholder message when there is no product image', () => {
    renderCard({ ...baseProduct, imageFileName: null });

    expect(screen.getByText('No image available')).toBeInTheDocument();
  });

  it('hides the badges on mobile, showing them from sm: up', () => {
    renderCard();

    expect(screen.getByText('Trending').parentElement).toHaveClass('hidden', 'sm:flex');
  });

  it('always shows the image, category, name, and "View on Amazon" button, regardless of screen size', () => {
    renderCard();

    expect(screen.getByText('Electronics')).not.toHaveClass('hidden');
    expect(screen.getByText('Wireless Earbuds')).not.toHaveClass('hidden');
    expect(screen.getByRole('link', { name: /view on amazon/i })).not.toHaveClass('hidden');
  });

  it('toggles the compare selection when the compare button is clicked', async () => {
    const user = userEvent.setup();
    renderCard();

    const compareButton = screen.getByRole('button', { name: 'Add Wireless Earbuds to Compare' });
    expect(compareButton).toHaveAttribute('aria-pressed', 'false');

    await user.click(compareButton);

    expect(screen.getByRole('button', { name: 'Remove Wireless Earbuds from Compare' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('disables the compare button once 4 other products are already selected', () => {
    localStorage.setItem('compareProductIds', JSON.stringify([10, 20, 30, 40]));
    renderCard();

    expect(screen.getByRole('button', { name: 'Add Wireless Earbuds to Compare' })).toBeDisabled();
  });
});
