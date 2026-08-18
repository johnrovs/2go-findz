import { describe, expect, it, vi, beforeEach } from 'vitest';
import api from './api.js';
import { getBrands } from './productService.js';

describe('productService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getBrands fetches distinct active brands from /public/products/brands', async () => {
    const brands = ['Sony', 'Bose'];
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, message: 'Brands retrieved.', data: brands },
    });

    const result = await getBrands();

    expect(api.get).toHaveBeenCalledWith('/public/products/brands');
    expect(result).toEqual(brands);
  });
});
