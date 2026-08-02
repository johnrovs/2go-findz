import { describe, expect, it, vi, beforeEach } from 'vitest';
import api from './api.js';
import {
  searchProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getDistinctBrands,
} from './adminProductService.js';

describe('adminProductService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('searchProducts fetches from /admin/products with the given params and returns the page data', async () => {
    const page = { content: [{ id: 1, name: 'Wireless Earbuds' }], totalPages: 1, totalElements: 1 };
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, message: 'Products retrieved successfully.', data: page },
    });

    const result = await searchProducts({ page: 0, size: 20, sort: 'createdAt,asc' });

    expect(api.get).toHaveBeenCalledWith('/admin/products', { params: { page: 0, size: 20, sort: 'createdAt,asc' } });
    expect(result).toEqual(page);
  });

  it('getProductById fetches a single product by id', async () => {
    const product = { id: 1, name: 'Wireless Earbuds' };
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, message: 'Product retrieved successfully.', data: product },
    });

    const result = await getProductById(1);

    expect(api.get).toHaveBeenCalledWith('/admin/products/1');
    expect(result).toEqual(product);
  });

  it('createProduct posts the payload and returns the created product', async () => {
    const created = { id: 2, name: 'Desk Lamp' };
    vi.spyOn(api, 'post').mockResolvedValue({
      data: { success: true, message: 'Product created successfully.', data: created },
    });

    const payload = { name: 'Desk Lamp', categoryId: 1 };
    const result = await createProduct(payload);

    expect(api.post).toHaveBeenCalledWith('/admin/products', payload);
    expect(result).toEqual(created);
  });

  it('updateProduct puts the payload to the product id and returns the updated product', async () => {
    const updated = { id: 2, name: 'Desk Lamp Pro' };
    vi.spyOn(api, 'put').mockResolvedValue({
      data: { success: true, message: 'Product updated successfully.', data: updated },
    });

    const payload = { name: 'Desk Lamp Pro', categoryId: 1 };
    const result = await updateProduct(2, payload);

    expect(api.put).toHaveBeenCalledWith('/admin/products/2', payload);
    expect(result).toEqual(updated);
  });

  it('deleteProduct sends a delete request for the product id', async () => {
    vi.spyOn(api, 'delete').mockResolvedValue({
      data: { success: true, message: 'Product deleted successfully.', data: null },
    });

    await deleteProduct(2);

    expect(api.delete).toHaveBeenCalledWith('/admin/products/2');
  });

  it('getDistinctBrands fetches from /admin/products/brands and returns the brand list', async () => {
    const brands = ['Adidas', 'Nike'];
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, message: 'Brands retrieved successfully.', data: brands },
    });

    const result = await getDistinctBrands();

    expect(api.get).toHaveBeenCalledWith('/admin/products/brands');
    expect(result).toEqual(brands);
  });
});
