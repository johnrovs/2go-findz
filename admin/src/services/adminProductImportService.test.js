import { describe, expect, it, vi, beforeEach } from 'vitest';
import api from './api.js';
import { previewImport, importProducts } from './adminProductImportService.js';

vi.mock('./api.js', () => ({
  default: { post: vi.fn() },
}));

describe('adminProductImportService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('previewImport posts the file as multipart form data to the preview endpoint', async () => {
    const file = new File(['bytes'], 'products.xlsx');
    api.post.mockResolvedValue({ data: { data: { totalRows: 1 } } });

    const result = await previewImport(file);

    expect(api.post).toHaveBeenCalledWith('/admin/products/import/preview', expect.any(FormData));
    const formData = api.post.mock.calls[0][1];
    expect(formData.get('file')).toBe(file);
    expect(result).toEqual({ totalRows: 1 });
  });

  it('importProducts posts the file as multipart form data to the import endpoint', async () => {
    const file = new File(['bytes'], 'products.xlsx');
    api.post.mockResolvedValue({ data: { data: { importedProducts: 1 } } });

    const result = await importProducts(file);

    expect(api.post).toHaveBeenCalledWith('/admin/products/import', expect.any(FormData));
    const formData = api.post.mock.calls[0][1];
    expect(formData.get('file')).toBe(file);
    expect(result).toEqual({ importedProducts: 1 });
  });
});
