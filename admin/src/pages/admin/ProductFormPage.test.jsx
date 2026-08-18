import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ToastProvider } from '../../context/ToastContext.jsx';
import ProductFormPage from './ProductFormPage.jsx';
import * as adminProductService from '../../services/adminProductService.js';
import * as adminCategoryService from '../../services/adminCategoryService.js';

const categories = [{ id: 1, productCategoryName: 'Electronics' }];

function renderPage(initialEntry) {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/products" element={<div>Products List</div>} />
          <Route path="/products/new" element={<ProductFormPage />} />
          <Route path="/products/:id" element={<ProductFormPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>
  );
}

describe('ProductFormPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminCategoryService, 'getCategories').mockResolvedValue(categories);
  });

  it('renders an empty form in create mode', async () => {
    renderPage('/products/new');

    expect(await screen.findByRole('heading', { name: 'Add Product' })).toBeInTheDocument();
    expect(screen.getByLabelText('Product Name')).toHaveValue('');
  });

  it('creates a product and navigates back to the list on success', async () => {
    vi.spyOn(adminProductService, 'createProduct').mockResolvedValue({ id: 9 });
    const user = userEvent.setup();
    renderPage('/products/new');
    await screen.findByRole('heading', { name: 'Add Product' });

    await user.type(screen.getByLabelText('Product Name'), 'Wireless Earbuds');
    await user.selectOptions(screen.getByLabelText('Category'), '1');
    await user.type(screen.getByLabelText('Description'), 'Compact wireless earbuds.');
    await user.type(screen.getByLabelText('Price ($)'), '49.99');
    await user.type(screen.getByLabelText('Amazon Affiliate Link'), 'https://amazon.com/dp/example');
    await user.click(screen.getByRole('button', { name: 'Add Product' }));

    expect(await screen.findByText('Products List')).toBeInTheDocument();
  });

  it('loads and pre-fills the product in edit mode', async () => {
    vi.spyOn(adminProductService, 'getProductById').mockResolvedValue({
      id: 5,
      name: 'Wireless Earbuds',
      description: 'Compact wireless earbuds.',
      categoryId: 1,
      imageFileName: null,
      productPrice: 49.99,
      productLink: 'https://amazon.com/dp/example',
      trending: false,
      bestSeller: false,
      active: true,
    });
    renderPage('/products/5');

    expect(await screen.findByRole('heading', { name: 'Edit Product' })).toBeInTheDocument();
    expect(screen.getByLabelText('Product Name')).toHaveValue('Wireless Earbuds');
  });

  it('shows an error state when loading the product fails in edit mode', async () => {
    vi.spyOn(adminProductService, 'getProductById').mockRejectedValue({
      message: 'Failed to load product.',
    });
    renderPage('/products/5');

    expect(await screen.findByText('Failed to load product.')).toBeInTheDocument();
  });

  it('shows a back-to-products link and subtitle in create mode', async () => {
    renderPage('/products/new');
    await screen.findByRole('heading', { name: 'Add Product' });

    expect(screen.getByRole('button', { name: /back to products/i })).toBeInTheDocument();
    expect(screen.getByText('Create a new product and prepare it for your storefront.')).toBeInTheDocument();
  });

  it('navigates back to the products list when Back to Products is clicked', async () => {
    const user = userEvent.setup();
    renderPage('/products/new');
    await screen.findByRole('heading', { name: 'Add Product' });

    await user.click(screen.getByRole('button', { name: /back to products/i }));

    expect(await screen.findByText('Products List')).toBeInTheDocument();
  });

  it('shows the edit-mode subtitle when editing a product', async () => {
    vi.spyOn(adminProductService, 'getProductById').mockResolvedValue({
      id: 5,
      name: 'Wireless Earbuds',
      description: 'Compact wireless earbuds.',
      categoryId: 1,
      imageFileName: null,
      productPrice: 49.99,
      productLink: 'https://amazon.com/dp/example',
      trending: false,
      bestSeller: false,
      active: true,
    });
    renderPage('/products/5');

    expect(await screen.findByRole('heading', { name: 'Edit Product' })).toBeInTheDocument();
    expect(screen.getByText("Update this product's details and Amazon listing information.")).toBeInTheDocument();
  });
});
