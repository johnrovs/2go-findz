import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ComparePage from './ComparePage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as productService from '../services/productService.js';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';

const productA = {
  id: 1,
  name: 'Wireless Earbuds',
  description: 'Compact wireless earbuds.',
  categoryName: 'Electronics',
  imageFileName: null,
  productPrice: '49.99',
  productLink: 'https://amazon.com/dp/earbuds',
  trending: true,
  bestSeller: false,
};

const productB = {
  id: 2,
  name: 'Smart Watch',
  description: 'Feature-packed smart watch.',
  categoryName: 'Electronics',
  imageFileName: null,
  productPrice: '99.99',
  productLink: 'https://amazon.com/dp/watch',
  trending: false,
  bestSeller: true,
};

function renderComparePage(initialIds = [1, 2]) {
  if (initialIds.length > 0) {
    localStorage.setItem('compareProductIds', JSON.stringify(initialIds));
  }
  return render(
    <MemoryRouter>
      <CompareProvider>
        <ComparePage />
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('ComparePage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({});
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue([]);
  });

  it('shows an empty state when nothing is selected', async () => {
    renderComparePage([]);

    expect(await screen.findByText('Add at least 2 products to compare')).toBeInTheDocument();
  });

  it('shows an empty state when only 1 product is selected', async () => {
    vi.spyOn(productService, 'compareProducts').mockResolvedValue([productA]);
    renderComparePage([1]);

    expect(await screen.findByText('Add at least 2 products to compare')).toBeInTheDocument();
  });

  it('renders a comparison table with full detail for each selected product', async () => {
    vi.spyOn(productService, 'compareProducts').mockResolvedValue([productA, productB]);
    renderComparePage();

    expect(await screen.findByText('Wireless Earbuds')).toBeInTheDocument();
    expect(screen.getByText('Smart Watch')).toBeInTheDocument();
    expect(screen.getAllByText('Electronics').length).toBeGreaterThan(0);
    expect(screen.getByText('$49.99')).toBeInTheDocument();
    expect(screen.getByText('$99.99')).toBeInTheDocument();
    expect(screen.getByText('Compact wireless earbuds.')).toBeInTheDocument();
    // "Trending" also appears as a Navbar link label, so assert presence via count rather
    // than a single unique match.
    expect(screen.getAllByText('Trending').length).toBeGreaterThan(0);
    expect(screen.getByText('Best Seller')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /view on amazon/i })).toHaveLength(2);
  });

  it('removes a product from the comparison when its remove button is clicked', async () => {
    vi.spyOn(productService, 'compareProducts').mockImplementation((ids) =>
      Promise.resolve([productA, productB].filter((product) => ids.includes(product.id)))
    );
    const user = userEvent.setup();
    renderComparePage();

    await screen.findByText('Wireless Earbuds');
    await user.click(screen.getByRole('button', { name: 'Remove Wireless Earbuds from compare' }));

    await waitFor(() => expect(screen.queryByText('Wireless Earbuds')).not.toBeInTheDocument());
    expect(await screen.findByText('Add at least 2 products to compare')).toBeInTheDocument();
  });

  it('shows an error state when fetching fails', async () => {
    vi.spyOn(productService, 'compareProducts').mockRejectedValue({ message: 'Network error. Please try again.' });
    renderComparePage();

    expect(await screen.findByText('Network error. Please try again.')).toBeInTheDocument();
  });

  it('renders the shared public footer with real company links', async () => {
    renderComparePage();
    expect(await screen.findByRole('link', { name: 'Affiliate Disclosure' })).toHaveAttribute(
      'href',
      '/affiliate-disclosure'
    );
  });
});
