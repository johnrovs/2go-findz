import { describe, expect, it, vi, beforeEach } from 'vitest';
import api from './api.js';
import { getCategories, createCategory, updateCategory, deleteCategory } from './adminCategoryService.js';

describe('adminCategoryService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getCategories fetches from /admin/categories with sort params and returns the list', async () => {
    const categories = [{ id: 1, productCategoryName: 'Electronics', commissionRate: 4 }];
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, message: 'Categories retrieved.', data: categories },
    });

    const result = await getCategories({ sortBy: 'productCategoryName', direction: 'asc' });

    expect(api.get).toHaveBeenCalledWith('/admin/categories', {
      params: { sortBy: 'productCategoryName', direction: 'asc' },
    });
    expect(result).toEqual(categories);
  });

  it('getCategories works with no arguments', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, message: 'ok', data: [] } });

    await getCategories();

    expect(api.get).toHaveBeenCalledWith('/admin/categories', {
      params: { sortBy: undefined, direction: undefined },
    });
  });

  it('createCategory posts the payload and returns the created category', async () => {
    const created = { id: 2, productCategoryName: 'Home', commissionRate: 6 };
    vi.spyOn(api, 'post').mockResolvedValue({ data: { success: true, message: 'Created.', data: created } });

    const result = await createCategory({ productCategoryName: 'Home', commissionRate: 6 });

    expect(api.post).toHaveBeenCalledWith('/admin/categories', { productCategoryName: 'Home', commissionRate: 6 });
    expect(result).toEqual(created);
  });

  it('updateCategory puts the payload to the category id and returns the updated category', async () => {
    const updated = { id: 2, productCategoryName: 'Home Goods', commissionRate: 5 };
    vi.spyOn(api, 'put').mockResolvedValue({ data: { success: true, message: 'Updated.', data: updated } });

    const result = await updateCategory(2, { productCategoryName: 'Home Goods', commissionRate: 5 });

    expect(api.put).toHaveBeenCalledWith('/admin/categories/2', {
      productCategoryName: 'Home Goods',
      commissionRate: 5,
    });
    expect(result).toEqual(updated);
  });

  it('deleteCategory sends a delete request for the category id', async () => {
    vi.spyOn(api, 'delete').mockResolvedValue({ data: { success: true, message: 'Deleted.', data: null } });

    await deleteCategory(2);

    expect(api.delete).toHaveBeenCalledWith('/admin/categories/2');
  });
});
