import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BrowseProductsPage from './BrowseProductsPage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';
import * as settingsService from '../services/settingsService.js';
import * as categoryService from '../services/categoryService.js';
import * as productService from '../services/productService.js';

const CATEGORIES = [
  { id: 1, productCategoryName: 'Electronics' },
  { id: 2, productCategoryName: 'Home & Kitchen' },
];
const BRANDS = ['Sony', 'Bose'];
const PRODUCTS = [
  {
    id: 1,
    name: 'Wireless Headphones',
    categoryName: 'Electronics',
    imageFileName: null,
    productLink: 'https://amazon.com/1',
  },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/products']}>
      <CompareProvider>
        <BrowseProductsPage />
      </CompareProvider>
    </MemoryRouter>
  );
}

describe('BrowseProductsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(settingsService, 'getSettings').mockResolvedValue({ affiliateDisclosure: 'Disclosure.' });
    vi.spyOn(categoryService, 'getCategories').mockResolvedValue(CATEGORIES);
    vi.spyOn(productService, 'getBrands').mockResolvedValue(BRANDS);
    vi.spyOn(productService, 'searchProducts').mockResolvedValue({
      content: PRODUCTS,
      totalPages: 1,
      totalElements: 1,
    });
  });

  it('renders a single h1, the filter sidebar, and the fetched products', async () => {
    renderPage();

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(await screen.findByText('Wireless Headphones')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Electronics' })).toBeInTheDocument();
  });

  it('shows skeleton loading cards before the results arrive', async () => {
    renderPage();
    expect(screen.getByRole('status', { name: 'Loading products' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('status', { name: 'Loading products' })).not.toBeInTheDocument());
  });

  it('shows the empty state with recovery actions when there are no results', async () => {
    productService.searchProducts.mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
    renderPage();

    expect(await screen.findByText('No products found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Filters' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Return to All Products' })).toBeInTheDocument();
  });

  it('shows an error state with a retry action when the fetch fails', async () => {
    productService.searchProducts.mockRejectedValue({ message: 'Network error. Please try again.' });
    renderPage();

    expect(await screen.findByText('Network error. Please try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('applying a category filter from the sidebar triggers a real, non-fabricated search request', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Wireless Headphones');

    await user.click(screen.getByRole('checkbox', { name: 'Electronics' }));
    await user.click(screen.getByRole('button', { name: 'Apply Filters' }));

    await waitFor(() =>
      expect(productService.searchProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({ categoryIds: '1' })
      )
    );
  });

  it('switching to List view renders BrowseProductList items instead of the grid', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Wireless Headphones');

    await user.click(screen.getByRole('button', { name: 'List view' }));

    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
  });

  it('renders the trust strip below the results', async () => {
    renderPage();
    await screen.findByText('Wireless Headphones');
    expect(screen.getByText('Curated with Care')).toBeInTheDocument();
  });

  it('opens the mobile filter drawer from the toolbar Filter trigger', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Wireless Headphones');

    await user.click(screen.getByRole('button', { name: 'Filter' }));

    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
  });
});
