import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ProductCatalogPanel from './ProductCatalogPanel.jsx';
import * as adminProductService from '../../services/adminProductService.js';

const categories = [{ id: 1, productCategoryName: 'Electronics' }];

function mockSearch(products) {
  vi.spyOn(adminProductService, 'searchProducts').mockResolvedValue({
    content: products,
    totalPages: 1,
    totalElements: products.length,
  });
}

describe('ProductCatalogPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminProductService, 'getDistinctBrands').mockResolvedValue(['Nike', 'Adidas']);
  });

  it('renders fetched products with an Add button', async () => {
    mockSearch([{ id: 1, name: 'Blender', brand: 'Nike', productPrice: '49.99', imageFileName: null }]);
    render(<ProductCatalogPanel selectedProducts={[]} onAdd={vi.fn()} categories={categories} />);

    expect(await screen.findByText('Blender')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();
  });

  it('disables and relabels Add for a product that is already selected', async () => {
    mockSearch([{ id: 1, name: 'Blender', brand: 'Nike', productPrice: '49.99', imageFileName: null }]);
    render(<ProductCatalogPanel selectedProducts={[{ id: 1, name: 'Blender' }]} onAdd={vi.fn()} categories={categories} />);

    expect(await screen.findByRole('button', { name: 'Added' })).toBeDisabled();
  });

  it('calls onAdd with the clicked product', async () => {
    mockSearch([{ id: 1, name: 'Blender', brand: 'Nike', productPrice: '49.99', imageFileName: null }]);
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<ProductCatalogPanel selectedProducts={[]} onAdd={onAdd} categories={categories} />);

    await user.click(await screen.findByRole('button', { name: 'Add' }));

    expect(onAdd).toHaveBeenCalledWith({ id: 1, name: 'Blender', brand: 'Nike', productPrice: '49.99', imageFileName: null });
  });

  it('shows an empty state when the search returns no results', async () => {
    mockSearch([]);
    render(<ProductCatalogPanel selectedProducts={[]} onAdd={vi.fn()} categories={categories} />);

    expect(await screen.findByText('No products found')).toBeInTheDocument();
  });

  it('shows an error state with retry on fetch failure', async () => {
    vi.spyOn(adminProductService, 'searchProducts').mockRejectedValue(new Error('Network down'));
    render(<ProductCatalogPanel selectedProducts={[]} onAdd={vi.fn()} categories={categories} />);

    expect(await screen.findByText('Network down')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('populates the Brand filter from getDistinctBrands', async () => {
    mockSearch([]);
    render(<ProductCatalogPanel selectedProducts={[]} onAdd={vi.fn()} categories={categories} />);

    await waitFor(() => expect(adminProductService.getDistinctBrands).toHaveBeenCalled());
    expect(await screen.findByRole('option', { name: 'Nike' })).toBeInTheDocument();
  });
});
