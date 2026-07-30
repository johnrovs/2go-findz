import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ToastProvider } from '../../context/ToastContext.jsx';
import ProductsPage from './ProductsPage.jsx';
import * as adminProductService from '../../services/adminProductService.js';
import * as adminCategoryService from '../../services/adminCategoryService.js';

const products = [
  {
    id: 1,
    name: 'Wireless Earbuds',
    categoryName: 'Electronics',
    imageFileName: null,
    productPrice: 49.99,
    trending: true,
    bestSeller: false,
    active: true,
    createdAt: '2026-01-10T10:00:00',
  },
  {
    id: 2,
    name: 'Desk Lamp',
    categoryName: 'Home Goods',
    imageFileName: null,
    productPrice: 29.99,
    trending: false,
    bestSeller: true,
    active: false,
    createdAt: '2026-02-15T10:00:00',
  },
];

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/admin/products']}>
        <ProductsPage />
      </MemoryRouter>
    </ToastProvider>
  );
}

describe('ProductsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminCategoryService, 'getCategories').mockResolvedValue([
      { id: 1, productCategoryName: 'Electronics' },
    ]);
    vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({
      content: products,
      totalPages: 1,
      totalElements: 2,
    });
  });

  it('renders the fetched products with their badges', async () => {
    renderPage();

    expect(await screen.findByText('Wireless Earbuds')).toBeInTheDocument();
    expect(screen.getAllByText('Trending').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Best Seller').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inactive').length).toBeGreaterThan(0);
    expect(screen.getByText('$49.99')).toBeInTheDocument();
  });

  it('links "Add Product" to the new-product route', async () => {
    renderPage();
    await screen.findByText('Wireless Earbuds');

    expect(screen.getByRole('link', { name: 'Add Product' })).toHaveAttribute('href', '/admin/products/new');
  });

  it("links a row's edit action to its product route", async () => {
    renderPage();
    await screen.findByText('Wireless Earbuds');

    expect(screen.getByRole('link', { name: 'Edit Wireless Earbuds' })).toHaveAttribute(
      'href',
      '/admin/products/1'
    );
  });

  it('deactivates a product after confirmation and shows a success toast', async () => {
    vi.spyOn(adminProductService, 'deleteProduct').mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Wireless Earbuds');

    await user.click(screen.getByRole('button', { name: 'Delete Wireless Earbuds' }));
    expect(
      await screen.findByText(
        'This will deactivate "Wireless Earbuds" and remove it from the public catalog. You can reactivate it later from Edit.'
      )
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => expect(adminProductService.deleteProduct).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Product deactivated successfully.')).toBeInTheDocument();
  });

  it('filters by search term', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Wireless Earbuds');

    await user.type(screen.getByLabelText('Search products'), 'lamp');

    await waitFor(() =>
      expect(adminProductService.searchProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'lamp' })
      )
    );
  });

  it('shows an empty state when there are no products', async () => {
    adminProductService.searchProducts.mockResolvedValue({ content: [], totalPages: 0, totalElements: 0 });
    renderPage();

    expect(await screen.findByText('No products found')).toBeInTheDocument();
  });

  it('shows an error state with retry when the fetch fails', async () => {
    adminProductService.searchProducts.mockRejectedValueOnce({ message: 'Network error. Please try again.' });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Network error. Please try again.')).toBeInTheDocument();

    adminProductService.searchProducts.mockResolvedValueOnce({ content: products, totalPages: 1, totalElements: 2 });
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Wireless Earbuds')).toBeInTheDocument();
  });

  it('renders brand and a scheduled badge when applicable', async () => {
    adminProductService.searchProducts.mockResolvedValue({
      content: [
        {
          id: 3,
          name: 'Standing Desk',
          categoryName: 'Home Office',
          brand: 'ErgoPro',
          imageFileName: null,
          productPrice: 199.99,
          trending: false,
          bestSeller: false,
          active: false,
          scheduledPublishAt: '2026-09-01T09:00:00',
          createdAt: '2026-03-01T10:00:00',
        },
      ],
      totalPages: 1,
      totalElements: 1,
    });
    renderPage();

    expect(await screen.findByText('ErgoPro')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });
});
